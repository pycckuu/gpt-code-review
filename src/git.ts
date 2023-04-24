import {execSync} from 'child_process';

function executeGitCommand(command: string): string {
  try {
    return execSync(command).toString();
  } catch (error: any) {
    throw new Error(`Error executing git command: ${command}\n${error.message}`);
  }
}

// Get git commit title
function getTitle(commitHash: string): string | Error {
  return executeGitCommand(`git show --pretty=format:"%s" -s ${commitHash}`);
}

// Get git commit description
function getDescription(commitHash: string): string | Error {
  return executeGitCommand(`git show -s --format=%b ${commitHash}`);
}

// Get diff of the commit
function getDiff(commitHash: string): string | Error {
  return executeGitCommand(`git diff ${commitHash}^ ${commitHash}`);
}

function changedFiles(commitHash: string): string[] | Error {
  const output = executeGitCommand(`git diff --name-only ${commitHash}^ ${commitHash}`);
  return output.split('\n').filter(filename => filename.trim() !== '');
}

export type GitDetails = {
  title: string;
  description: string;
  changedFiles: string[];
  diff: string;
};

export function getGitDetails(commitHash: string): GitDetails | Error {
  try {
    const title = getTitle(commitHash);
    const description = getDescription(commitHash);
    const files = changedFiles(commitHash);
    const diff = getDiff(commitHash);

    return {
      title: title as string,
      description: description as string,
      changedFiles: files as string[],
      diff: diff as string,
    };
  } catch (error) {
    return error as Error;
  }
}
