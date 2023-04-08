import { Artifact, Pipeline } from "aws-cdk-lib/aws-codepipeline";
import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { CloudFormationCreateUpdateStackAction, CodeBuildAction, GitHubSourceAction } from "aws-cdk-lib/aws-codepipeline-actions";
import { BuildSpec, LinuxBuildImage, PipelineProject } from "aws-cdk-lib/aws-codebuild";
import { QuestionIngestionStack } from "./question_ingestion-stack";
export class PipelineStack extends cdk.Stack {
    private readonly pipeline: Pipeline;
    private readonly cdkSourceOutput: Artifact;
    private readonly serviceSourceOutput: Artifact;
    private readonly pipelinebBuildOutput: Artifact;
    private readonly serviceBuildOutput: Artifact;

    constructor(scope: Construct, id: string, props?: cdk.StackProps) {
        super(scope, id, props);

        this.pipeline = new Pipeline(this, "Pipeline", {
            pipelineName: "Pipeline",
            crossAccountKeys: false,
            restartExecutionOnUpdate: true,
        });

        this.cdkSourceOutput = new Artifact("SourceOutput");
        this.serviceSourceOutput = new Artifact("ServiceSourceOutput");

        this.pipeline.addStage({
            stageName: "Source",
            actions: [
                new GitHubSourceAction({
                    owner: "Zanele-M",
                    repo: "QuestionIngestion",
                    branch: "main",
                    actionName: "Pipeline-Source",
                    oauthToken: cdk.SecretValue.secretsManager("github-hook"),
                    output: this.cdkSourceOutput,
                }),
                //add another github source action for the cdk code
                new GitHubSourceAction({
                    owner: "Zanele-M",
                    repo: "QuestionIngestionService",
                    branch: "main",
                    oauthToken: cdk.SecretValue.secretsManager("github-hook"),
                    actionName: "ServiceApplication-Source",
                    output: this.serviceSourceOutput,
                }),
            ],
        });

        this.pipelinebBuildOutput = new Artifact("BuildOutput");
        this.serviceBuildOutput = new Artifact("ServiceBuildOutput");

        //add a build stage
        this.pipeline.addStage({
            stageName: "Build",
            actions: [
                new CodeBuildAction({
                    actionName: "Pipeline_Build",
                    project: new PipelineProject(this, "Build", {
                        buildSpec: BuildSpec.fromSourceFilename("build-specs/cdk-build-spec.yml"),
                        environment: {
                            buildImage: LinuxBuildImage.STANDARD_5_0,
                        },
                    }),
                    input: this.cdkSourceOutput,
                    outputs: [this.pipelinebBuildOutput],
                }),
                //add another build action for the cdk service code
                new CodeBuildAction({
                    actionName: "ApplicationServer_Build",
                    project: new PipelineProject(this, "ServerBuildProject", {
                        buildSpec: BuildSpec.fromSourceFilename("build-specs/cdk-build-spec.yml"),
                        environment: {
                            buildImage: LinuxBuildImage.STANDARD_5_0,
                        },
                    }),
                    input: this.serviceSourceOutput,
                    outputs: [this.serviceBuildOutput],
                }),
            ],
        });

        //add an update stage for the pipeline to be self mutational
        this.pipeline.addStage({
            stageName: "Pipeline_Update",
            actions: [
                new CloudFormationCreateUpdateStackAction({
                    actionName: "Update",
                    templatePath: this.pipelinebBuildOutput.atPath("PipelineStack.template.json"),
                    stackName: "PipelineStack",
                    adminPermissions: true,
                    extraInputs: [this.cdkSourceOutput],
                }),
            ],
        });
    }

    //add a method named addServiceStage to the pipeline stack
    public addServiceStage(serviceStack: QuestionIngestionStack, stageName: string) {
        this.pipeline.addStage({
            stageName: stageName,
            actions: [
                new CloudFormationCreateUpdateStackAction({
                    actionName: "Service_Update",
                    templatePath: this.serviceBuildOutput.atPath(`${serviceStack.stackName}.template.json`),
                    stackName: serviceStack.stackName,
                    adminPermissions: true,
                    parameterOverrides: {
                        ...serviceStack.serviceCode.assign(
                            this.serviceBuildOutput.s3Location
                          ),                    
                        },
                    extraInputs: [this.serviceBuildOutput],
                }),
            ],
        });
    }
}   
