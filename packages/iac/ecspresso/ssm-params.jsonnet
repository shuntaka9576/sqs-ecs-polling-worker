local projectName = 'sqs-ecs-worker';

{
  serviceName: 'sqs-ecs-worker',

  ssm: {
    vpc: {
      publicSubnetId1: '{{ ssm `/' + projectName + '/vpc/public-subnet-id-1` }}',
      publicSubnetId2: '{{ ssm `/' + projectName + '/vpc/public-subnet-id-2` }}',
    },
    worker: {
      taskRole: '{{ ssm `/' + projectName + '/worker/task-role` }}',
      taskExecRole: '{{ ssm `/' + projectName + '/worker/task-exec-role` }}',
      sgId: '{{ ssm `/' + projectName + '/worker/sg-id` }}',
      logGroupName: '{{ ssm `/' + projectName + '/worker/log-group-name` }}',
      queueUrl: '{{ ssm `/' + projectName + '/worker/queue-url` }}',
      queueArn: '{{ ssm `/' + projectName + '/worker/queue-arn` }}',
      clusterName: '{{ ssm `/' + projectName + '/worker/cluster-name` }}',
      ecrRepositoryUri: '{{ ssm `/' + projectName + '/worker/ecr-repository-uri` }}',
    },
  },
}
