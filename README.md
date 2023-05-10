# GPT Code Review

This code provides functionality to review code changes, leveraging the OpenAI
GPT language model to generate feedback on the provided code changes.

1. executes Git commands to fetch the commit title, description,
diff, and changed files for a given commit hash.

2. creates ChatCompletionRequestMessage objects for the OpenAI API to help
instruct the AI model and provide the necessary context for code review.

3. calls the OpenAI API to generate code review feedback, and returns the
AI-generated feedback.

The overall purpose of the code is to leverage the OpenAI GPT language model to
generate feedback on the code changes. This feedback includes identifying
potential bugs, missed best practices, security recommendations, and ensuring
the code changes align with the provided commit messages.

## Usage
### In the repository

1. Install the package

```bash
yarn add gpt-code-review
```

1. Add in .env variables in the root of the repository with the following
contents:

```bash
OPENAI_API_KEY=<your-openai-api-key>
GPT_CODE_REVIEW_MODEL=gpt-3.5-turbo
GPT_CODE_REVIEW_TEMPERATURE=0.7
```

1. Tun review for the most recent commit
```bash
gpt-code-review $(git rev-parse HEAD)
```

1.

2. Run the package

```bash
npx gpt-code-review
```




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