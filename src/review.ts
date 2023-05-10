import * as dotenv from 'dotenv';
import {type ChatCompletionRequestMessage, Configuration, OpenAIApi} from 'openai';

dotenv.config();

const MAX_CONTENT_SIZE = 11_538;
const TEMPERATURE = process.env['TEMPERATURE'] ? parseFloat(process.env['TEMPERATURE']) : 0.7;
const MODEL = process.env['MODEL'] || 'MODEL=gpt-3.5-turbo';

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
    'You are a programming code change reviewer of the open source code. Provide feedback on the code changes given. Do not introduce yourselves.',
};

function createReviewTaskMessage(title: string): ChatCompletionRequestMessage {
  const content = `The change has the following title: ${title}.

  Your task is:
  - Review code, give feedback
  - Find, prioritize bugs
  - Ensure commit message alignment
  - Follow best practices, guidelines:
  - Readability, maintainability, docs
  - No scope creep
  - Consistent naming, style
  - Modular organization
  - Review performance, optimization:
  - Spot bottlenecks
  - Propose improvements
  - Examine test coverage:
  - Verify unit tests
  - Identify edge cases
  - Assess integration needs
  - Assess reusability:
  - Leverage existing resources
  - Spot reusable components
  - Confirm compatibility, security
  - Clarify commit messages
  - List negative feedback only

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
    'All code changes have been provided. Please provide me with your code review based on all the changes, context & title provided. Make it succinct and to the point using less than 3000 characters. Use bullet points to summarize your review.';
  return {
    role: 'user',
    content,
  };
}

const summarySystemMessage: ChatCompletionRequestMessage = {
  role: 'system',
  content:
    'You are a programming code change reviewer of the open source code. Combine reviews provided by other reviewers. Do not introduce yourselves. Do not introduce any intro statements or conclusions. Do not loose information from the reviews. Make it as the bullet points.',
};

function createSummaryTask(reviewChunk: string): ChatCompletionRequestMessage {
  const content = `
  Reviews:

  -----
  ${reviewChunk.slice(0, MAX_CONTENT_SIZE)}
  -----

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
    reviewSystemMessage,
    createReviewTaskMessage(gitDetails.title),
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
  if (!reviews) {
    console.error('No reviews were generated.');
    throw new Error('No reviews were generated.');
  }

  const summaryTask = createSummaryTask(reviews.join('---\n'));
  return await completionRequest([summarySystemMessage, summaryTask], verbose);
}
