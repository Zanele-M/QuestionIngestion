import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as path from 'path';
import { Construct } from 'constructs';

interface ExamDataExtractorConstructProps {
  serviceCode: lambda.Code;
}


export class ExamDataExtractorConstruct extends Construct {
  constructor(scope: Construct, id: string, props: ExamDataExtractorConstructProps) {
    super(scope, id);

    // Create an S3 bucket
    const bucket = new s3.Bucket(this, 'ExamsBucket', {
      versioned: false,
    });

    // Create the Lambda function
    const lambdaFunction = new lambda.Function(this, 'ExtractExamLambda', {
      runtime: lambda.Runtime.JAVA_11,      
      code: props.serviceCode,
      handler: 'com.example.ExamsExtractor::handleRequest',
      memorySize: 1024,
      timeout: cdk.Duration.seconds(15),
      architecture: lambda.Architecture.ARM_64,
      functionName: 'ExtractExamLambda',
    });

    // Grant the Lambda function necessary permissions
    lambdaFunction.addToRolePolicy(new iam.PolicyStatement({
      actions: [
        'textract:AnalyzeDocument',
      ],
      resources: ['*'],
    }));

    bucket.grantRead(lambdaFunction);
  }
}