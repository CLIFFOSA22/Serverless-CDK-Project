
// import * as sqs from 'aws-cdk-lib/aws-sqs';

import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import { Role, ServicePrincipal, PolicyStatement, ManagedPolicy } from 'aws-cdk-lib/aws-iam';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as lambdaNodejs from 'aws-cdk-lib/aws-lambda-nodejs';
import * as path from 'path';

export class ServerlessCdkProjectStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

// API Gateway
const api = new apigateway.RestApi(this, 'items-api');

const items = api.root.addResource('items');

const item = items.addResource('{id}');
 
//  DynamoDB

const table = new dynamodb.TableV2(this, 'Table', {
  tableName: 'StudentItems',

  partitionKey: {
    name: 'id',
    type: dynamodb.AttributeType.STRING,
  },

  billing: dynamodb.Billing.onDemand(),

  removalPolicy: cdk.RemovalPolicy.DESTROY,
});

// Define a role and add permissions to it. This will automatically create and attach an IAM policy to the role:

 const role = new Role(this, 'IAM-role-lambda', {
  assumedBy: new ServicePrincipal('lambda.amazonaws.com'),

// IAM execution role for lambda

  managedPolicies: [
    ManagedPolicy.fromAwsManagedPolicyName(
      'service-role/AWSLambdaBasicExecutionRole'
    ),],
  
    });

// IAM  permission for DynamoDB
role.addToPolicy(new PolicyStatement({
  resources: [table.tableArn],
  actions: [
    'dynamodb:PutItem',
    'dynamodb:GetItem',
    'dynamodb:UpdateItem',
    'dynamodb:DeleteItem', 
    'dynamodb:Scan',

   ],

}));

const itemsLambda = new lambdaNodejs.NodejsFunction(this, 'ItemsLambda', {
  runtime: lambda.Runtime.NODEJS_20_X,

  architecture: lambda.Architecture.X86_64,

  memorySize: 256,

  timeout: cdk.Duration.seconds(10),

  entry: path.join(__dirname, '../lambda/items.ts'),

  handler: 'handler',

  role: role,

  environment: {
    TABLE_NAME: table.tableName,
  },
});

// For API Gateway To Connect/Intergrate With Lambda

const integration = new apigateway.LambdaIntegration(itemsLambda);

// /items
items.addMethod('GET', integration);
items.addMethod('POST', integration);

// /items/{id}
item.addMethod('GET', integration);
item.addMethod('PUT', integration);
item.addMethod('DELETE', integration);


  }
}
