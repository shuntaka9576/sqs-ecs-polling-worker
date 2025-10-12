export interface AppParameter {
  projectName: string;
  ssm: {
    vpc: {
      publicSubnetId1: string;
      publicSubnetId2: string;
    };
    worker: {
      taskRole: string;
      taskExecRole: string;
      clusterName: string;
      sgId: string;
      logGroupName: string;
      queueUrl: string;
      queueArn: string;
      ecrRepositoryUri: string;
      serviceName: string;
    };
  };
}

const commonParameters = {
  projectName: 'sqs-ecs-worker',
};

export const getConfig = (): AppParameter => {
  const projectName = commonParameters.projectName;

  return {
    ...commonParameters,
    ssm: {
      vpc: {
        publicSubnetId1: `/${projectName}/vpc/public-subnet-id-1`,
        publicSubnetId2: `/${projectName}/vpc/public-subnet-id-2`,
      },
      worker: {
        taskRole: `/${projectName}/worker/task-role`,
        taskExecRole: `/${projectName}/worker/task-exec-role`,
        clusterName: `/${projectName}/worker/cluster-name`,
        sgId: `/${projectName}/worker/sg-id`,
        logGroupName: `/${projectName}/worker/log-group-name`,
        queueUrl: `/${projectName}/worker/queue-url`,
        queueArn: `/${projectName}/worker/queue-arn`,
        ecrRepositoryUri: `/${projectName}/worker/ecr-repository-uri`,
        serviceName: `/${projectName}/worker/service-name`,
      },
    },
  };
};
