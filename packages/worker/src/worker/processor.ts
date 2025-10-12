import {
  DeleteMessageCommand,
  type Message,
  ReceiveMessageCommand,
} from '@aws-sdk/client-sqs';
import { protectTask, TaskProtectionError } from '../clients/ecsClient';
import { sqsClient } from '../clients/sqsClient';
import { logger } from './logger';

const SQS_MAX_NUMBER_OF_MESSAGES = Number.parseInt(
  process.env.SQS_MAX_NUMBER_OF_MESSAGES ?? '1',
  10
);
const SQS_LONG_POLLING_WAIT_SECONDS = 20;
const SQS_VISIBILITY_TIMEOUT_SECONDS = 60 * 20;
const ECS_TASK_PROTECTION_EXPIRES_MINUTES = 60;
const PROCESSING_SLEEP_DURATION_MS = Number.parseInt(
  process.env.PROCESSING_SLEEP_DURATION_MS ?? '5000',
  10
);

export const processSingleMessage = async (
  cluster: string,
  taskArn: string,
  queueUrl: string
): Promise<boolean> => {
  let message: { body: string; receiptHandle: string } | null = null;

  try {
    await protectTask(
      cluster,
      taskArn,
      true,
      ECS_TASK_PROTECTION_EXPIRES_MINUTES
    );

    const { Messages: messages } = await sqsClient.send(
      new ReceiveMessageCommand({
        QueueUrl: queueUrl,
        MaxNumberOfMessages: SQS_MAX_NUMBER_OF_MESSAGES,
        WaitTimeSeconds: SQS_LONG_POLLING_WAIT_SECONDS,
        VisibilityTimeout: SQS_VISIBILITY_TIMEOUT_SECONDS,
      })
    );

    message = extractMessage(messages);

    if (message == null) {
      await cleanupMessageAndUnprotectTask(cluster, taskArn, message, queueUrl);

      return true;
    }

    await processMessage(message.body);

    await cleanupMessageAndUnprotectTask(cluster, taskArn, message, queueUrl);

    return true;
  } catch (error) {
    if (error instanceof TaskProtectionError) {
      logger().info(
        { reason: error.reason },
        'Task protection failed, exiting gracefully'
      );

      return false;
    }

    await cleanupMessageAndUnprotectTask(cluster, taskArn, message, queueUrl);

    logger().error(
      {
        error,
        errorStack: error instanceof Error ? error.stack : undefined,
      },
      'Error occurred during message processing'
    );

    throw error;
  }
};

const extractMessage = (
  messages: Message[] | undefined
): { body: string; receiptHandle: string } | null => {
  if (!messages || messages.length !== 1) {
    return null;
  }

  const msg = messages[0];
  if (!msg.Body || !msg.ReceiptHandle) {
    return null;
  }

  return {
    body: msg.Body,
    receiptHandle: msg.ReceiptHandle,
  };
};

const processMessage = async (messageBody: string): Promise<void> => {
  try {
    logger().info({ messageBody }, 'Message received');

    // 処理をシミュレート（スリープのみ）
    await new Promise((resolve) =>
      setTimeout(resolve, PROCESSING_SLEEP_DURATION_MS)
    );

    logger().info('Message processing completed');
  } catch (error) {
    logger().error(
      {
        error,
        errorStack: error instanceof Error ? error.stack : undefined,
      },
      'Error occurred during processMessage'
    );
    throw error;
  }
};

const cleanupMessageAndUnprotectTask = async (
  cluster: string,
  taskArn: string,
  message: { receiptHandle: string } | null,
  queueUrl: string
): Promise<void> => {
  if (message != null) {
    await sqsClient.send(
      new DeleteMessageCommand({
        QueueUrl: queueUrl,
        ReceiptHandle: message.receiptHandle,
      })
    );
    logger().info('Message deleted from queue');
  }

  await protectTask(cluster, taskArn, false);
};
