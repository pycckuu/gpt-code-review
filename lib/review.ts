import * as dotenv from 'dotenv';
import {type ChatCompletionRequestMessage, Configuration, OpenAIApi} from 'openai';

dotenv.config();

const MAX_CONTENT_SIZE = 11_538;
const TEMPERATURE = process.env['GPT_CODE_REVIEW_TEMPERATURE']
  ? parseFloat(process.env['GPT_CODE_REVIEW_TEMPERATURE'])
  : 0.0;
const MODEL = process.env['GPT_CODE_REVIEW_MODEL'] || 'gpt-4';

if (!process.env['OPENAI_API_KEY']) {
  console.error('OPENAI_API_KEY is not set');
  process.exit(1);
}

export type GitDetails = {
  title: string;
  description: string;
  changedFiles: string[];
  diff: string;
};

const configuration = new Configuration({
  apiKey: process.env['OPENAI_API_KEY'],
});

const openai = new OpenAIApi(configuration);

const reviewSystemMessage: ChatCompletionRequestMessage = {
  role: 'system',
  content:
    'You are a programming code change reviewer of the open source code. Provide feedback on the code changes given. Do not introduce yourselves. Focus only on top-10 (not more) negative parts and on what needs to be changed or improved and how.',
};

function createReviewTaskMessage(title: string): ChatCompletionRequestMessage {
  const content = `The change has the following title: ${title}.

  Your task is:
  - Review code changes and provide feedback:
  - Check for bugs and highlight them.
  - Verify alignment with commit messages.
  - Sort issues from major to minor.
  - Ensure adherence to best practices and project guidelines:
  - Code readability, maintainability, and documentation.
  - Consistent naming conventions and coding style.
  - Modular and organized functions and classes.
  - Analyze performance and optimization:
  - Identify potential performance bottlenecks.
  - Suggest optimizations or efficient algorithms.
  - Assess test coverage and quality:
  - Confirm appropriate unit tests are added or updated.
  - Check for untested edge cases.
  - Determine if integration tests are needed.
  - Evaluate code reusability:
  - Encourage use of existing libraries, frameworks, or code snippets.
  - Identify opportunities for reusable components or patterns.
  - Confirm cross-browser and cross-platform compatibility:
  - Provide security recommendations, if applicable.
  - Check the commit message for clear descriptions of changes.
  - Provide feedback as the numbered list.
  - focus only on negative parts.

  Do not provide feedback yet. I will follow-up with a description of the change in a new message.
  `;

  return {
    role: 'user',
    content,
  };
}

function createDescriptionMessage(desc: string): ChatCompletionRequestMessage {
  const content = `A description was given to help you assist in understand why these changes were made:
-----
${desc.slice(0, MAX_CONTENT_SIZE)}
-----
Do not provide feedback yet. I will follow-up with a diff of the change in a new message.
`;
  return {
    role: 'user',
    content,
  };
}

// create function that split changes into the chunks of 11,538 characters
// to avoid OpenAI API limit of 11,538 characters per request
function splitDiff(diff: string): ChatCompletionRequestMessage[] {
  const chunkSize = MAX_CONTENT_SIZE;
  const chunks = [];
  for (let i = 0; i < diff.length; i += chunkSize) {
    chunks.push(diff.slice(i, i + chunkSize));
  }
  return chunks.map(createDiffMessage);
}

function createDiffMessage(diff: string): ChatCompletionRequestMessage {
  const content = `
-----
${diff.slice(0, MAX_CONTENT_SIZE)}
-----

Do not provide feedback yet. I will follow-up additional diff in a new message.
`;
  return {
    role: 'user',
    content,
  };
}

function commandToExecuteTheTask(): ChatCompletionRequestMessage {
  const content =
    'All code changes have been provided. Please provide me with your code review based on all the changes, context & title provided. Make it succinct and to the point using less than 3000 characters. Report only top-10 (up-to) most severe issues as the sorted numbered list (from most to less severe). Add severity level in [] in front of each (low|med|high).';
  return {
    role: 'user',
    content,
  };
}

const summarySystemMessage: ChatCompletionRequestMessage = {
  role: 'system',
  content:
    'You are a programming code change reviewer of the open source code. Combine reviews provided by other reviewers. Do not introduce yourselves. Do not introduce any intro statements or conclusions. Do not loose information from the reviews. Do not mention any reviewers and pretend that you are the only reviewer.',
};

function createSummaryTask(reviewChunk: string): ChatCompletionRequestMessage {
  const content = `
  Reviews:

  -----
  ${reviewChunk.slice(0, MAX_CONTENT_SIZE)}
  -----

  Combine reviews. Do not introduce yourselves. Do not introduce any intro statements or conclusions. Do not loose information from the original reviews. Report only top-10 (up-to) most severe issues as the sorted numbered list (from most to less severe).
  `;

  return {
    role: 'user',
    content,
  };
}

export function logContext(gitDetails: GitDetails) {
  console.info(reviewSystemMessage.content);
  console.info(createReviewTaskMessage(gitDetails.title));
  console.info(createDescriptionMessage(gitDetails.description).content);
  console.info(createDiffMessage(gitDetails.diff).content);
}

async function completionRequest(
  messages: ChatCompletionRequestMessage[],
  verbose: boolean,
): Promise<string | undefined> {
  try {
    if (verbose) console.info('Sending request to OpenAI API...');

    const completion = await openai.createChatCompletion({
      model: MODEL,
      messages,
      temperature: TEMPERATURE,
    });

    return completion.data.choices[0]?.message?.content;
  } catch (error) {
    console.error('Error while calling OpenAI API:', error);
    return undefined;
  }
}

async function requestReviews(gitDetails: GitDetails, verbose: boolean): Promise<string[] | undefined> {
  if (verbose) logContext(gitDetails);

  const diffs = splitDiff(gitDetails.diff);
  const baseMessage = [
    createReviewTaskMessage(gitDetails.title),
    reviewSystemMessage,
    createDescriptionMessage(gitDetails.description),
  ];

  const messages: ChatCompletionRequestMessage[][] = [];
  for (const d of diffs) {
    messages.push([...baseMessage, d, commandToExecuteTheTask()]);
  }

  const reviews: string[] = [];
  for await (const m of messages) {
    const reviewChunk = await completionRequest(m, verbose);
    if (reviewChunk) {
      reviews.push(reviewChunk);
    }
  }
  if (reviews.length === 0) {
    console.error('No reviews were generated.');
    return undefined;
  }

  if (verbose) console.info('reviews:', reviews.join('\n'));
  return reviews;
}

export async function job(gitDetails: GitDetails, verbose = false): Promise<string | undefined> {
  // The token limit for gpt-35-turbo is 4096 tokens, whereas the token
  // limits for gpt-4 and gpt-4-32k are 8192 and 32768 respectively. These
  // limits include the token count from both the message array sent and the
  // model response. The number of tokens in the messages array combined
  // with the value of the max_tokens parameter must stay under these limits
  // or you'll receive an error. Therefore, we need to split the diff into
  // a separet review requests and then combine them into a single review.
  const reviews = await requestReviews(gitDetails, verbose);
  if (!reviews || reviews.length === 0) {
    console.error('No reviews were generated.');
    throw new Error('No reviews were generated.');
  }

  if (reviews.length === 1) {
    return reviews[0];
  }

  const summaryTask = createSummaryTask(reviews.join('---\n'));
  return await completionRequest([summarySystemMessage, summaryTask], verbose);
}
