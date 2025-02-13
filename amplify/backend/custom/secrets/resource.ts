import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';

export class SecretsStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    new secretsmanager.Secret(this, 'LLMAPIKey', {
      secretName: 'llm-api-key',
      description: 'The API key for the Large Language Model',
    });
  }
}
