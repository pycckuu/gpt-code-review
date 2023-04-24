import * as dotenv from 'dotenv';
import {ChatCompletionRequestMessage, Configuration, OpenAIApi} from 'openai';

dotenv.config();

export type ReviewTask = {
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

const system: ChatCompletionRequestMessage = {
  role: 'system',
  content: `You are a programming code change reviewer, provide feedback on the code changes given. Do not introduce yourselves.

  Your task is:
  - Review the code changes and provide feedback.
  - If there are any bugs, highlight them.
  - Provide details on missed use of best-practices.
  - Does the code do what it says in the commit messages?
  - Do not highlight minor issues and nitpicks.
  - Use bullet points if you have multiple comments.
  - Provide security recommendations if there are any.
  - check the commit message if the description of the changes: what, why, how

  Do not provide feedback yet. I will follow-up with a description of the change in a new message.
  `,
};

function task(title: string): ChatCompletionRequestMessage {
  const content = `The change has the following title: ${title}.

  Your task is:
  - Review the code changes and provide feedback.
  - If there are any bugs, highlight them.
  - Provide details on missed use of best-practices.
  - Does the code do what it says in the commit messages?
  - Do not highlight minor issues and nitpicks.
  - Use bullet points if you have multiple comments.
  - Provide security recommendations if there are any.
  - do not write what is good; write what is bad and why
  - write in a very succinct manner (shorter than 3000 characters)

  Do not provide feedback yet. I will follow-up with a description of the change in a new message.
  `;

  return {
    role: 'user',
    content,
  };
}

function description(desc: string): ChatCompletionRequestMessage {
  const content = `A description was given to help you assist in understand why these changes were made:
-----
${desc.slice(0, 11_538)}
-----
Do not provide feedback yet. I will follow-up with a diff of the change in a new message.
`;
  return {
    role: 'user',
    content,
  };
}

// TODO: wrapping of the diffs and descriptions into several messages
function fileChanges(diff: string): ChatCompletionRequestMessage {
  const content = `The following diff was provided:
-----
${diff.slice(0, 11_538)}
-----

All code changes have been provided. Please provide me with your code review based on all the changes, context & title provided
`;
  return {
    role: 'user',
    content,
  };
}

export function logContext(reviewTask: ReviewTask) {
  console.log(system.content);
  console.log(task(reviewTask.title));
  console.log(description(reviewTask.description).content);
  console.log(fileChanges(reviewTask.diff).content);
}

export async function job(reviewTask: ReviewTask): Promise<string | undefined> {
  logContext(reviewTask);
  const completion = await openai.createChatCompletion({
    model: 'gpt-3.5-turbo',
    messages: [system, task(reviewTask.title), description(reviewTask.description), fileChanges(reviewTask.diff)],
    temperature: 0.7,
  });
  return completion.data.choices[0]?.message?.content;
}
