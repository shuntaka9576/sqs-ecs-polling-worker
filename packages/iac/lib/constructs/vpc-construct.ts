import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as ssm from 'aws-cdk-lib/aws-ssm';
import { Construct } from 'constructs';

export class VpcConstruct extends Construct {
  public readonly vpc: ec2.IVpc;

  constructor(
    scope: Construct,
    id: string,
    props: {
      projectName: string;
      ssm: {
        publicSubnetId1: string;
        publicSubnetId2: string;
      };
    }
  ) {
    super(scope, id);

    this.vpc = new ec2.Vpc(this, 'Vpc', {
      maxAzs: 2,
      natGateways: 0,
      subnetConfiguration: [
        {
          cidrMask: 24,
          name: 'Public',
          subnetType: ec2.SubnetType.PUBLIC,
        },
      ],
    });

    const publicSubnets = this.vpc.publicSubnets;

    new ssm.StringParameter(this, 'VpcPublicSubnetId1Param', {
      parameterName: props.ssm.publicSubnetId1,
      stringValue: publicSubnets[0].subnetId,
    });
    new ssm.StringParameter(this, 'VpcPublicSubnetId2Param', {
      parameterName: props.ssm.publicSubnetId2,
      stringValue: publicSubnets[1].subnetId,
    });
  }
}
