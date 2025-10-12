import { AsyncLocalStorage } from 'node:async_hooks';
import pino from 'pino';

const asyncLocalStorage = new AsyncLocalStorage<pino.Logger>();

let baseLogger: pino.Logger;

/**
 * 現在のコンテキストのロガーを取得
 * AsyncLocalStorageにロガーがない場合はbaseLoggerを返す
 */
export function logger(): pino.Logger {
  return asyncLocalStorage.getStore() || baseLogger;
}

/**
 * taskArnを含むbaseLoggerを作成
 */
export function createBaseLogger(taskArn: string): pino.Logger {
  baseLogger = pino({
    level: process.env.LOG_LEVEL || 'info',
    base: {
      taskArn,
    },
    serializers: {
      error: pino.stdSerializers.err,
    },
  });

  return baseLogger;
}

/**
 * loopIdを含むchild loggerでスコープを実行
 */
export async function runWithLoopLogger<T>(
  loopId: string,
  fn: () => Promise<T>
): Promise<T> {
  const loopLogger = baseLogger.child({ loopId });
  return asyncLocalStorage.run(loopLogger, fn);
}
