import { UpdateTaskProtectionCommand } from '@aws-sdk/client-ecs';
import {
  DeleteMessageCommand,
  ReceiveMessageCommand,
} from '@aws-sdk/client-sqs';
import { mockClient } from 'aws-sdk-client-mock';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ecsClient } from './clients/ecsClient';
import { sqsClient } from './clients/sqsClient';
import { createBaseLogger } from './worker/logger';

const sqsMock = mockClient(sqsClient);
const ecsMock = mockClient(ecsClient);

describe('SQS Polling Worker', () => {
  const mockTaskArn = 'arn:aws:ecs:us-east-1:123456789012:task/test-task';
  const queueUrl =
    'https://sqs.us-east-1.amazonaws.com/123456789012/test-queue';
  const cluster = 'test-cluster';

  beforeEach(() => {
    vi.clearAllMocks();
    sqsMock.reset();
    ecsMock.reset();

    // ECSメタデータ取得のmock
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ TaskARN: mockTaskArn }),
    });

    // スリープ時間を0にして高速化
    process.env.PROCESSING_SLEEP_DURATION_MS = '0';
  });

  describe('正常な場合', () => {
    beforeEach(() => {
      createBaseLogger(mockTaskArn);
    });

    it('1ループ目でメッセージを処理し、2ループ目のタスク保護失敗でループが終了する', async () => {
      // GIVEN
      process.env.SQS_QUEUE_URL = queueUrl;
      process.env.ECS_CLUSTER = cluster;

      const testMessage = {
        body: 'test message body',
      };

      ecsMock
        .on(UpdateTaskProtectionCommand)
        .resolvesOnce({}) // 1ループ目保護成功
        .resolvesOnce({}) // 1ループ目解除成功
        .resolvesOnce({ failures: [{ reason: 'DEPLOYMENT_BLOCKED' }] }); // 2ループ目タスク保護失敗

      sqsMock.on(ReceiveMessageCommand).resolvesOnce({
        Messages: [
          {
            Body: JSON.stringify(testMessage),
            ReceiptHandle: 'test-receipt-handle-1',
          },
        ],
      });
      sqsMock.on(DeleteMessageCommand).resolves({});

      // WHEN
      const { main } = await import('./index.ts');
      await main();

      // THEN
      const sqsReceiveCalls = sqsMock.commandCalls(ReceiveMessageCommand);
      expect(sqsReceiveCalls.length).toBe(1);
      expect(sqsReceiveCalls.map((call) => call.args[0].input)).toEqual([
        {
          QueueUrl: queueUrl,
          MaxNumberOfMessages: 1,
          WaitTimeSeconds: 20,
          VisibilityTimeout: 1200,
        },
      ]);

      const sqsDeleteCalls = sqsMock.commandCalls(DeleteMessageCommand);
      expect(sqsDeleteCalls.length).toBe(1);
      expect(sqsDeleteCalls.map((call) => call.args[0].input)).toEqual([
        {
          QueueUrl: queueUrl,
          ReceiptHandle: 'test-receipt-handle-1',
        },
      ]);

      const ecsCalls = ecsMock.commandCalls(UpdateTaskProtectionCommand);
      expect(ecsCalls.length).toBe(3);
      expect(ecsCalls.map((call) => call.args[0].input)).toEqual([
        {
          cluster,
          tasks: [mockTaskArn],
          protectionEnabled: true,
          expiresInMinutes: 60,
        }, // 1ループ目: タスク保護
        {
          cluster,
          tasks: [mockTaskArn],
          protectionEnabled: false,
        }, // 1ループ目: タスク解除
        {
          cluster,
          tasks: [mockTaskArn],
          protectionEnabled: true,
          expiresInMinutes: 60,
        }, // 2ループ目: タスク保護失敗(DEPLOYMENT_BLOCKED)
      ]);
    });
  });

  describe('エラーが発生した場合', () => {
    beforeEach(() => {
      vi.spyOn(process, 'exit').mockImplementation(() => {
        throw new Error('process.exit called');
      });
    });

    it('メッセージ受信時にエラーが発生した場合、タスク保護を解除してexit 1を呼ぶ', async () => {
      // GIVEN
      process.env.SQS_QUEUE_URL = queueUrl;
      process.env.ECS_CLUSTER = cluster;

      const testError = new Error('Unexpected error');
      ecsMock.on(UpdateTaskProtectionCommand).resolves({});
      sqsMock.on(ReceiveMessageCommand).rejects(testError);

      // WHEN & THEN
      const { main } = await import('./index.ts');
      await expect(main()).rejects.toThrow('process.exit called');

      expect(process.exit).toHaveBeenCalledWith(1);

      const sqsReceiveCalls = sqsMock.commandCalls(ReceiveMessageCommand);
      expect(sqsReceiveCalls.length).toBe(1);
      expect(sqsReceiveCalls.map((call) => call.args[0].input)).toEqual([
        {
          QueueUrl: queueUrl,
          MaxNumberOfMessages: 1,
          WaitTimeSeconds: 20,
          VisibilityTimeout: 1200,
        },
      ]);

      const sqsDeleteCalls = sqsMock.commandCalls(DeleteMessageCommand);
      expect(sqsDeleteCalls.length).toBe(0); // メッセージ取得失敗のため削除対象のメッセージがない

      const ecsCalls = ecsMock.commandCalls(UpdateTaskProtectionCommand);
      expect(ecsCalls.length).toBe(2);
      expect(ecsCalls.map((call) => call.args[0].input)).toEqual([
        {
          cluster,
          tasks: [mockTaskArn],
          protectionEnabled: true,
          expiresInMinutes: 60,
        }, // タスク保護
        {
          cluster,
          tasks: [mockTaskArn],
          protectionEnabled: false,
        }, // タスク解除
      ]);
    });
  });
});
