import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as ecr from 'aws-cdk-lib/aws-ecr';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import * as ssm from 'aws-cdk-lib/aws-ssm';
import { Construct } from 'constructs';

export class AsyncWorkerConstruct extends Construct {
  constructor(
    scope: Construct,
    id: string,
    props: {
      projectName: string;
      vpc: ec2.IVpc;
      ssm: {
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
    }
  ) {
    super(scope, id);

    const ecrRepository = new ecr.Repository(this, 'EcrRepository', {
      repositoryName: props.projectName,
      removalPolicy: cdk.RemovalPolicy.DESTROY, // 注意!
      emptyOnDelete: true, // 注意
      autoDeleteImages: true, // 注意
    });

    const queue = new sqs.Queue(this, 'Queue', {
      queueName: props.projectName,
      visibilityTimeout: cdk.Duration.minutes(20),
      encryption: sqs.QueueEncryption.SQS_MANAGED,
    });

    const cluster = new ecs.Cluster(this, 'Cluster', {
      clusterName: props.projectName,
      vpc: props.vpc,
    });

    const taskRole = new iam.Role(this, 'TaskRole', {
      roleName: `${props.projectName}-task`,
      assumedBy: new iam.ServicePrincipal('ecs-tasks.amazonaws.com'),
    });

    queue.grantConsumeMessages(taskRole);

    taskRole.addToPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ['ecs:UpdateTaskProtection'],
        resources: ['*'],
      })
    );

    const executionRole = new iam.Role(this, 'ExecutionRole', {
      roleName: `${props.projectName}-exec`,
      assumedBy: new iam.ServicePrincipal('ecs-tasks.amazonaws.com'),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName(
          'service-role/AmazonECSTaskExecutionRolePolicy'
        ),
      ],
    });

    const logGroup = new logs.LogGroup(this, 'TaskLogGroup', {
      logGroupName: `/ecs/${props.projectName}`,
      retention: logs.RetentionDays.THREE_MONTHS,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    const ecsSecurityGroup = new ec2.SecurityGroup(this, 'EcsSecurityGroup', {
      vpc: props.vpc,
      description: 'Security group for worker ECS tasks',
      allowAllOutbound: true,
    });

    new ssm.StringParameter(this, 'EcrRepositoryUriParam', {
      parameterName: props.ssm.ecrRepositoryUri,
      stringValue: ecrRepository.repositoryUri,
    });
    new ssm.StringParameter(this, 'QueueUrlParam', {
      parameterName: props.ssm.queueUrl,
      stringValue: queue.queueUrl,
    });
    new ssm.StringParameter(this, 'QueueArnParam', {
      parameterName: props.ssm.queueArn,
      stringValue: queue.queueArn,
    });
    new ssm.StringParameter(this, 'ClusterNameParam', {
      parameterName: props.ssm.clusterName,
      stringValue: cluster.clusterName,
    });
    new ssm.StringParameter(this, 'TaskRoleParam', {
      parameterName: props.ssm.taskRole,
      stringValue: taskRole.roleArn,
    });
    new ssm.StringParameter(this, 'TaskExecRoleParam', {
      parameterName: props.ssm.taskExecRole,
      stringValue: executionRole.roleArn,
    });
    new ssm.StringParameter(this, 'LogGroupNameParam', {
      parameterName: props.ssm.logGroupName,
      stringValue: logGroup.logGroupName,
    });
    new ssm.StringParameter(this, 'SecurityGroupParam', {
      parameterName: props.ssm.sgId,
      stringValue: ecsSecurityGroup.securityGroupId,
    });
    new ssm.StringParameter(this, 'ServiceNameParam', {
      parameterName: props.ssm.serviceName,
      stringValue: props.projectName,
    });
  }
}
