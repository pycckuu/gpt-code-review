# GPT Code Review

`gpt-code-review` is a package that helps you review code changes by leveraging
the OpenAI GPT language model. It generates feedback on code changes, including
potential bug identification, best practices, security recommendations, and
ensuring the code changes align with the provided commit messages.

## Features

- Fetches commit title, description, diff, and changed files for a given commit
  hash using Git commands.
- Constructs `ChatCompletionRequestMessage` objects for the OpenAI API,
  providing the necessary context for code review.
- Calls the OpenAI API to generate code review feedback and returns the
  AI-generated feedback.

## Usage

### In the repository

1. Install the package:

```bash
yarn add gpt-code-review
```

2. Create an `.env` file in the root of the repository with the following
   contents:

```bash
OPENAI_API_KEY=<your-openai-api-key>
GPT_CODE_REVIEW_MODEL=gpt-3.5-turbo
GPT_CODE_REVIEW_TEMPERATURE=0.3
```

3. Run the review for the most recent commit:

```bash
yarn gpt-code-review $(git rev-parse HEAD)
```

### Standalone script to run from the command line

```bash
npx gpt-code-review <commit-hash>
```

Replace `<commit-hash>` with the commit hash you want to review.

## MIT License

Copyright (c) 2023 Igor Markelov

Permission is hereby granted, free of charge, to any person obtaining a copy of
this software and associated documentation files (the "Software"), to deal in
the Software without restriction, including without limitation the rights to
use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of
the Software, and to permit persons to whom the Software is furnished to do so,
subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS
FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR
COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER
IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN
CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.