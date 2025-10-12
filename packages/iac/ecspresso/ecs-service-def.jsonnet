local ssmParams = import 'ssm-params.jsonnet';

{
  availabilityZoneRebalancing: 'DISABLED',
  deploymentConfiguration: {
    alarms: {
      enable: false,
      rollback: false,
      alarmNames: [],
    },
    bakeTimeInMinutes: 0,
    deploymentCircuitBreaker: {
      enable: true,
      rollback: true,
    },
    maximumPercent: 200,
    minimumHealthyPercent: 0,
    strategy: 'ROLLING',
  },
  deploymentController: {
    type: 'ECS',
  },
  // AutoScaleが最大3のため、maximumPercentとの乗算で6個まで起動
  // https://docs.aws.amazon.com/ja_jp/AmazonECS/latest/developerguide/task-scale-in-protection.html
  desiredCount: 3,
  enableECSManagedTags: false,
  enableExecuteCommand: true,
  launchType: 'FARGATE',
  networkConfiguration: {
    awsvpcConfiguration: {
      assignPublicIp: 'ENABLED',
      securityGroups: [
        ssmParams.ssm.worker.sgId,
      ],
      subnets: [
        ssmParams.ssm.vpc.publicSubnetId1,
        ssmParams.ssm.vpc.publicSubnetId2,
      ],
    },
  },
  platformFamily: 'Linux',
  platformVersion: 'LATEST',
  propagateTags: 'NONE',
  schedulingStrategy: 'REPLICA',
}
