#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { getConfig } from '../lib/config';
import { AsyncWorkerStack } from '../lib/stacks/async-worker-stack';
import { WorkerAutoScalingStack } from '../lib/stacks/worker-autoscaling-stack';

const app = new cdk.App();
const config = getConfig();

new AsyncWorkerStack(app, `${config.projectName}-stack`);
new WorkerAutoScalingStack(app, `${config.projectName}-autoscaling-stack`);
