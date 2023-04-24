import {changedFiles, getDescription, getDiff, getTitle} from './git';
import {ReviewTask, job} from './review';

// read args from the command line
const args = process.argv.slice(2);
const commitHash = args[0];

if (!commitHash) {
  throw new Error('Commit hash is required');
}

// get task title and the body of the description from git commit
const title = getTitle(commitHash);
const description = getDescription(commitHash);
const files = changedFiles(commitHash);
const diff = getDiff(commitHash);

const reviewTask: ReviewTask = {
  title,
  description,
  changedFiles: files,
  diff,
};

// run the review job
job(reviewTask)
  .then((review: string | undefined) => {
    if (!review) {
      throw new Error('Review task failed');
    }
    console.log('Review task completed!');
    console.log(review);
  })
  .catch(err => console.error(err));
