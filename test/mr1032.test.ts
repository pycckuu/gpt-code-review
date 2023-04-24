import {job} from '../src/review';

import {mr1032} from './data/examples';

// increase jest timeout to 60 seconds
jest.setTimeout(60 * 1000);

describe('mr1032', () => {
  it('should return a review task', async () => {
    const reviewTask = await mr1032();
    const completion = await job(reviewTask);
    expect(completion).toBeDefined();
  });
});
