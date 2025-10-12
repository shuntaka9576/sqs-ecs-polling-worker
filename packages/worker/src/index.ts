import { randomUUID } from 'node:crypto';
import { fetchTaskMetadata } from './clients/ecsClient';
import { createBaseLogger, logger, runWithLoopLogger } from './worker/logger';
import { processSingleMessage } from './worker/processor';

const SQS_QUEUE_URL = process.env.SQS_QUEUE_URL;
const ECS_CLUSTER = process.env.ECS_CLUSTER;

let SHOULD_CONTINUE_POLLING = true;

export const main = async () => {
  try {
    if (SQS_QUEUE_URL == null || ECS_CLUSTER == null) {
      throw new Error(
        'Missing required environment variables: SQS_QUEUE_URL and ECS_CLUSTER must be defined'
      );
    }

    const { TaskARN: ecsTaskArn } = await fetchTaskMetadata();

    createBaseLogger(ecsTaskArn);

    logger().info('Starting SQS polling worker');

    while (SHOULD_CONTINUE_POLLING) {
      const loopId = randomUUID();

      const shouldContinue = await runWithLoopLogger(loopId, async () => {
        const result = await processSingleMessage(
          ECS_CLUSTER,
          ecsTaskArn,
          SQS_QUEUE_URL
        );

        return result;
      });

      if (!shouldContinue) {
        break;
      }
    }

    logger().info('Polling stopped, worker shutting down');
  } catch (error) {
    logger().error(
      { error, errorStack: error instanceof Error ? error.stack : undefined },
      'Fatal error in main loop'
    );

    process.exit(1);
  }
};

process.on('SIGTERM', () => {
  logger().info('SIGTERM received, initiating graceful shutdown');

  SHOULD_CONTINUE_POLLING = false;
});

if (!process.env.VITEST) {
  await main();
}
