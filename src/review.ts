import * as dotenv from 'dotenv';
import {type ChatCompletionRequestMessage, Configuration, OpenAIApi} from 'openai';

dotenv.config();

const MAX_CONTENT_SIZE = 11_538;

export type GitDetails = {
  title: string;
  description: string;
  changedFiles: string[];
  diff: string;
};

if (!process.env['OPENAI_API_KEY']) {
  console.error('OPENAI_API_KEY is not set');
  process.exit(1);
}

const configuration = new Configuration({
  apiKey: process.env['OPENAI_API_KEY'],
});

const openai = new OpenAIApi(configuration);

const systemMessage: ChatCompletionRequestMessage = {
  role: 'system',
  content:
    'You are a programming code change reviewer of the open source code. Provide feedback on the code changes given. Do not introduce yourselves.',
};

function createTaskMessage(title: string): ChatCompletionRequestMessage {
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
    'All code changes have been provided. Please provide me with your code review based on all the changes, context & title provided. Make it succinct and to the point using less than 3000 characters.';
  return {
    role: 'user',
    content,
  };
}

export function logContext(gitDetails: GitDetails) {
  console.info(systemMessage.content);
  console.info(createTaskMessage(gitDetails.title));
  console.info(createDescriptionMessage(gitDetails.description).content);
  console.info(createDiffMessage(gitDetails.diff).content);
}

export async function job(gitDetails: GitDetails, verbose = false): Promise<string | undefined> {
  if (verbose) logContext(gitDetails);

  try {
    const messages = [
      systemMessage,
      createTaskMessage(gitDetails.title),
      createDescriptionMessage(gitDetails.description),
      // The token limit for gpt-35-turbo is 4096 tokens, whereas the token
      // limits for gpt-4 and gpt-4-32k are 8192 and 32768 respectively. These
      // limits include the token count from both the message array sent and the
      // model response. The number of tokens in the messages array combined
      // with the value of the max_tokens parameter must stay under these limits
      // or you'll receive an error.
      // TODO: combine into several requests if diff is too big
      ...splitDiff(gitDetails.diff).slice(0, 1),
      commandToExecuteTheTask(),
    ];

    if (verbose) console.info('Messages:', messages);
    if (verbose) console.info('Sending request to OpenAI API...');

    const completion = await openai.createChatCompletion({
      model: 'gpt-3.5-turbo',
      messages,
      temperature: 0.7,
    });

    if (verbose) console.info('completion:', completion);
    return completion.data.choices[0]?.message?.content;
  } catch (error) {
    console.error('Error while calling OpenAI API:', error);
    return undefined;
  }
}
