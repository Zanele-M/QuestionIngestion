import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { Code, Runtime, Function, CfnParametersCode } from 'aws-cdk-lib/aws-lambda';
import { ExamDataExtractorConstruct } from './constructs/exam_data_extractor_construct';

export class QuestionIngestionStack extends cdk.Stack {
  public readonly serviceCode: CfnParametersCode;
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    this.serviceCode = Code.fromCfnParameters();

    //add the construct from exam_data_extractor_construct.ts
   const examDataExtractorConstruct = new ExamDataExtractorConstruct(this, 'ExamDataExtractorConstruct', {
      serviceCode: this.serviceCode,
    });




}
}
