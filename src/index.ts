import {getGitDetails} from './git';
import {job} from './review';

// Read args from the command line
const args = process.argv.slice(2);
const commitHash = args[0];

if (!commitHash) {
  throw new Error('Commit hash is required');
}

// Get task title and the body of the description from git commit
const gitDetails = getGitDetails(commitHash);
if (gitDetails instanceof Error) {
  throw gitDetails;
}

// Run the review job
job(gitDetails)
  .then((review: string | undefined) => {
    if (!review) {
      console.log('Review task failed!');
      throw new Error('Review task failed');
    }

    console.log('Review task completed!');
    console.log(review);
  })
  .catch(err => {
    console.error(err);
  });
