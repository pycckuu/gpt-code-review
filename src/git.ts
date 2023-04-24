import {execSync} from 'child_process';

// get git commit body
export function getTitle(commitHash: string): string {
  return execSync(`git show --pretty=format:"%s" -s ${commitHash}`).toString();
}

// get git commit body
export function getDescription(commitHash: string): string {
  return execSync(`git show -s --format=%b ${commitHash}`).toString();
}

// get diff of the commit
export function getDiff(commitHash: string): string {
  return execSync(`git diff ${commitHash}^ ${commitHash}`).toString();
}

export function changedFiles(commitHash: string): string[] {
  return execSync(`git diff --name-only ${commitHash}^ ${commitHash}`).toString().split('\n');
}
