import { Artifact, Pipeline } from "aws-cdk-lib/aws-codepipeline";
import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { GitHubSourceAction } from "aws-cdk-lib/aws-codepipeline-actions";

export class PipelineStack extends cdk.Stack {
    constructor(scope: Construct, id: string, props?: cdk.StackProps) {
      super(scope, id, props);
  
      const pipeline = new Pipeline(this, "Pipeline", {
        pipelineName: "Pipeline",
        crossAccountKeys: false,
      });
  
      const sourceOutput = new Artifact("SourceOutput");
  
      pipeline.addStage({
        stageName: "Source",
        actions: [
          new GitHubSourceAction({
            owner: "Zanele-M",
            repo: "QuestionIngestion",
            branch: "main",
            actionName: "Pipeline Source",
            oauthToken: cdk.SecretValue.secretsManager("github-hook"),
            output: sourceOutput,
          }),
        ],
      });
    }
  }