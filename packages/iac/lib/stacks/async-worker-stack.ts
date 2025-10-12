import * as cdk from 'aws-cdk-lib';
import type { Construct } from 'constructs';
import { getConfig } from '../config';
import { AsyncWorkerConstruct } from '../constructs/async-worker-construct';
import { VpcConstruct } from '../constructs/vpc-construct';

export class AsyncWorkerStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const config = getConfig();

    const vpcConstruct = new VpcConstruct(this, 'Vpc', {
      projectName: config.projectName,
      ssm: config.ssm.vpc,
    });

    new AsyncWorkerConstruct(this, 'AsyncWorker', {
      projectName: config.projectName,
      vpc: vpcConstruct.vpc,
      ssm: config.ssm.worker,
    });
  }
}
