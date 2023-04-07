import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { Code, Runtime, Function } from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';

export class QuestionIngestionStack extends cdk.Stack {
  public readonly serviceCode: Code;
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const serviceCode = Code.fromCfnParameters();

    //add a aws lambda resource for, runtime should be node 14.x, handler should be index.handler
    const lambda = new Function(this, "ServiceLambda", {
        runtime: Runtime.NODEJS_14_X,
        handler: "src/lambda.handler",
        code: serviceCode,
        functionName: "QuestionIngestion",
    });

//add a api gateway resource for the lambda function
const api = new apigateway.LambdaRestApi(this, "ServiceApi", {
    handler: lambda,
    proxy: false,
    restApiName: "QuestionIngestion",
});

//add a resource for the api gateway
const questions = api.root.addResource("questions");

//add a method for the api gateway
questions.addMethod("GET", new apigateway.LambdaIntegration(lambda));

//add a method for the api gateway
questions.addMethod("POST", new apigateway.LambdaIntegration(lambda));



  }
}
