import { ECSClient, UpdateTaskProtectionCommand } from '@aws-sdk/client-ecs';

export const ecsClient = new ECSClient({});

export class TaskProtectionError extends Error {
  constructor(
    message: string,
    public readonly reason?: string
  ) {
    super(message);
    this.name = 'TaskProtectionError';
  }
}

interface TaskMetadata {
  TaskARN: string;
}

export const fetchTaskMetadata = async (): Promise<TaskMetadata> => {
  const metadataUri = process.env.ECS_CONTAINER_METADATA_URI_V4;

  const response = await fetch(`${metadataUri}/task`);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  return await response.json();
};

export const protectTask = async (
  cluster: string,
  taskArn: string,
  enabled: boolean,
  expiresInMinutes?: number
): Promise<void> => {
  const result = await ecsClient.send(
    new UpdateTaskProtectionCommand({
      cluster,
      tasks: [taskArn],
      protectionEnabled: enabled,
      ...(enabled && expiresInMinutes && { expiresInMinutes }),
    })
  );

  if (result.failures && result.failures.length > 0) {
    const failure = result.failures[0];
    throw new TaskProtectionError(
      `Task protection failed: ${failure.reason}`,
      failure.reason
    );
  }
};
