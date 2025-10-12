import * as cdk from 'aws-cdk-lib';
import * as applicationautoscaling from 'aws-cdk-lib/aws-applicationautoscaling';
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import * as ssm from 'aws-cdk-lib/aws-ssm';
import type { Construct } from 'constructs';
import { getConfig } from '../config';

export class WorkerAutoScalingStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const config = getConfig();

    const clusterName = ssm.StringParameter.valueForStringParameter(
      this,
      config.ssm.worker.clusterName
    );
    const queueUrl = ssm.StringParameter.valueForStringParameter(
      this,
      config.ssm.worker.queueUrl
    );
    const queueArn = ssm.StringParameter.valueForStringParameter(
      this,
      config.ssm.worker.queueArn
    );
    const serviceName = ssm.StringParameter.valueForStringParameter(
      this,
      config.ssm.worker.serviceName
    );

    const queue = sqs.Queue.fromQueueAttributes(this, 'Queue', {
      queueUrl,
      queueArn,
    });

    const scalableTarget = new applicationautoscaling.ScalableTarget(
      this,
      'WorkerScalableTarget',
      {
        serviceNamespace: applicationautoscaling.ServiceNamespace.ECS,
        resourceId: `service/${clusterName}/${serviceName}`,
        scalableDimension: 'ecs:service:DesiredCount',
        minCapacity: 0,
        maxCapacity: 3,
      }
    );

    const scalingPolicy = new applicationautoscaling.CfnScalingPolicy(
      this,
      'ScalingPolicy',
      {
        policyName: `${clusterName}-${serviceName}-scaling-policy`,
        policyType: 'StepScaling',
        scalingTargetId: scalableTarget.scalableTargetId,
        stepScalingPolicyConfiguration: {
          adjustmentType: 'ExactCapacity',
          stepAdjustments: [
            // メッセージが0のときタスク0
            {
              metricIntervalLowerBound: 0,
              metricIntervalUpperBound: 1,
              scalingAdjustment: 0,
            },
            // メッセージが1以上5未満のときタスク1
            {
              metricIntervalLowerBound: 1,
              metricIntervalUpperBound: 5,
              scalingAdjustment: 1,
            },
            // メッセージが5以上のときタスク3
            {
              metricIntervalLowerBound: 5,
              scalingAdjustment: 3,
            },
          ],
          metricAggregationType: 'Average',
        },
      }
    );

    new cloudwatch.CfnAlarm(this, 'ScalingAlarm', {
      alarmName: `${clusterName}-${serviceName}-scaling-alarm`,
      comparisonOperator: 'GreaterThanOrEqualToThreshold',
      evaluationPeriods: 1,
      metricName: 'ApproximateNumberOfMessagesVisible',
      namespace: 'AWS/SQS',
      period: 60,
      statistic: 'Average',
      threshold: 0,
      dimensions: [
        {
          name: 'QueueName',
          value: queue.queueName,
        },
      ],
      alarmActions: [scalingPolicy.ref],
      treatMissingData: 'notBreaching',
    });
  }
}
