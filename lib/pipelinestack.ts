import { Artifact, Pipeline } from "aws-cdk-lib/aws-codepipeline";
import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { CloudFormationCreateUpdateStackAction, CodeBuildAction, GitHubSourceAction } from "aws-cdk-lib/aws-codepipeline-actions";
import { BuildSpec, LinuxBuildImage, PipelineProject } from "aws-cdk-lib/aws-codebuild";


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
            actionName: "Pipeline-Source",
            oauthToken: cdk.SecretValue.secretsManager("github-hook"),
            output: sourceOutput,
          }),
        ],
      });

      // create new artificat called buildOutput
const buildOutput = new Artifact("BuildOutput");

//add a build stage
pipeline.addStage({
    stageName: "Build",
    actions: [
        new CodeBuildAction({
            actionName: "Build",
            project: new PipelineProject(this, "Build", {
                buildSpec: BuildSpec.fromSourceFilename("buildspec.yml"),
                environment: {
                    buildImage: LinuxBuildImage.STANDARD_5_0,
                },
            }),
            input: sourceOutput,
            outputs: [buildOutput],
        }),
    ],
});



    }
  }