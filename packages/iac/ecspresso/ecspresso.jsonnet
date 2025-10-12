local ssmParams = import 'ssm-params.jsonnet';

{
  region: 'ap-northeast-1',
  cluster: 'sqs-ecs-worker',
  service: ssmParams.serviceName,
  service_definition: 'ecs-service-def.jsonnet',
  task_definition: 'ecs-task-def.jsonnet',
  timeout: '10m0s',
}
