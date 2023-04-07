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
  
      const cdkSourceOutput = new Artifact("SourceOutput");
      const serviceSourceOutput = new Artifact("ServiceSourceOutput");

      pipeline.addStage({
        stageName: "Source",
        actions: [
          new GitHubSourceAction({
            owner: "Zanele-M",
            repo: "QuestionIngestion",
            branch: "main",
            actionName: "Pipeline-Source",
            oauthToken: cdk.SecretValue.secretsManager("github-hook"),
            output: cdkSourceOutput,
          }),
          //add another github source action for the cdk code
            new GitHubSourceAction({
                owner: "Zanele-M",
                repo: "QuestionIngestionService",
                branch: "main",
                oauthToken: cdk.SecretValue.secretsManager("github-hook"),
                actionName: "CDK-Source",
                output: serviceSourceOutput,
       }),
     ],
      });

      // create new artificat called buildOutput
const buildOutput = new Artifact("BuildOutput");
const serverBuildOutput = new Artifact("ServerBuildOutput");

//add a build stage
pipeline.addStage({
    stageName: "Build",
    actions: [
        new CodeBuildAction({
            actionName: "Build",
            project: new PipelineProject(this, "Build", {
                buildSpec: BuildSpec.fromSourceFilename("build-specs/cdk-build-spec.yml"),
                environment: {
                    buildImage: LinuxBuildImage.STANDARD_5_0,
                },
            }),
            input: cdkSourceOutput,
            outputs: [buildOutput],
        }),
        //add another build action for the cdk service code
        new CodeBuildAction({   
            actionName: "ServerBuild",
            project: new PipelineProject(this, "ServerBuildProject", {
                buildSpec: BuildSpec.fromSourceFilename("build-specs/server-build-spec.yml"),
                environment: {
                    buildImage: LinuxBuildImage.STANDARD_5_0,
                },
            }),
            input: serviceSourceOutput,
            outputs: [serverBuildOutput],
        }),
    ],
});

//add an update stage for the pipeline to be self mutational
pipeline.addStage({ 
    stageName: "Pipeline_Update",
    actions: [
        new CloudFormationCreateUpdateStackAction({
            actionName: "Update",
            templatePath: buildOutput.atPath("PipelineStack.template.json"),
            stackName: "PipelineStack",
            adminPermissions: true,
            extraInputs: [cdkSourceOutput],
        }),
    ],
});

    }
  }