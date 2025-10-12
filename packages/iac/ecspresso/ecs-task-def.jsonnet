local imageTag = import 'image-tag.jsonnet';
local ssmParams = import 'ssm-params.jsonnet';

{
  containerDefinitions: [
    {
      cpu: 0,
      stopTimeout: 30,
      dockerLabels: {},
      environment: [
        {
          name: 'SQS_QUEUE_URL',
          value: ssmParams.ssm.worker.queueUrl,
        },
        {
          name: 'ECS_CLUSTER',
          value: ssmParams.ssm.worker.clusterName,
        },
        {
          name: 'SQS_MAX_NUMBER_OF_MESSAGES',
          value: '1',
        },
        {
          name: 'PROCESSING_SLEEP_DURATION_MS',
          value: std.toString(10 * 60 * 1000),  // 10分
        },
      ],
      essential: true,
      image: ssmParams.ssm.worker.ecrRepositoryUri + ':' + imageTag.tag,
      logConfiguration: {
        logDriver: 'awslogs',
        options: {
          'awslogs-group': ssmParams.ssm.worker.logGroupName,
          'awslogs-region': 'ap-northeast-1',
          'awslogs-stream-prefix': ssmParams.serviceName,
        },
      },
      name: 'worker',
      readonlyRootFilesystem: false,
    },
  ],
  cpu: '1024',
  executionRoleArn: ssmParams.ssm.worker.taskExecRole,
  family: 'sqs-ecs-worker',
  ipcMode: '',
  memory: '2048',
  networkMode: 'awsvpc',
  pidMode: '',
  requiresCompatibilities: [
    'FARGATE',
  ],
  runtimePlatform: {
    cpuArchitecture: 'ARM64',
    operatingSystemFamily: 'LINUX',
  },
  taskRoleArn: ssmParams.ssm.worker.taskRole,
  volumes: [],
}
