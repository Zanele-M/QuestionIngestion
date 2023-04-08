import { Artifact, Pipeline } from "aws-cdk-lib/aws-codepipeline";
import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { CloudFormationCreateUpdateStackAction, CodeBuildAction, GitHubSourceAction } from "aws-cdk-lib/aws-codepipeline-actions";
import { BuildSpec, LinuxBuildImage, PipelineProject } from "aws-cdk-lib/aws-codebuild";
import { QuestionIngestionStack } from "./question_ingestion-stack";
export class PipelineStack extends cdk.Stack {
    private readonly pipeline: Pipeline;
    private readonly cdkBuildOutput: Artifact;
    private readonly serviceBuildOutput: Artifact;

    constructor(scope: Construct, id: string, props?: cdk.StackProps) {
        super(scope, id, props);

        this.pipeline = new Pipeline(this, "Pipeline", {
            pipelineName: "Pipeline",
            crossAccountKeys: false,
            restartExecutionOnUpdate: true,
        });

        const cdkSourceOutput = new Artifact("SourceOutput");
        const serviceSourceOutput = new Artifact("ServiceSourceOutput");

        this.pipeline.addStage({
            stageName: "Source",
            actions: [
                new GitHubSourceAction({
                    owner: "Zanele-M",
                    repo: "QuestionIngestion",
                    branch: "main",
                    actionName: "Infrasctruture",
                    oauthToken: cdk.SecretValue.secretsManager("github-hook"),
                    output: cdkSourceOutput,
                }),
                //add another github source action for the cdk code
                new GitHubSourceAction({
                    owner: "Zanele-M",
                    repo: "QuestionIngestionService",
                    branch: "main",
                    oauthToken: cdk.SecretValue.secretsManager("github-hook"),
                    actionName: "QuestionIngestionService",
                    output: serviceSourceOutput,
                }),
            ],
        });

        this.cdkBuildOutput = new Artifact("BuildOutput");
        this.serviceBuildOutput = new Artifact("ServiceBuildOutput");

        //add a build stage
        this.pipeline.addStage({
            stageName: "Build",
            actions: [
                new CodeBuildAction({
                    actionName: "Infrastructure",
                    project: new PipelineProject(this, "CDKBuild", {
                        buildSpec: BuildSpec.fromSourceFilename("build-specs/cdk-build-spec.yml"),
                        environment: {
                            buildImage: LinuxBuildImage.STANDARD_5_0,
                        },
                    }),
                    input: cdkSourceOutput,
                    outputs: [this.cdkBuildOutput],
                }),
                //add another build action for the service code
                // new CodeBuildAction({
                //     actionName: "QuestionIngestionService",
                //     project: new PipelineProject(this, "QuestionIngestionServiceBuild", {
                //         buildSpec: BuildSpec.fromSourceFilename("build-specs/service-build-spec.yml"),
                //         environment: {
                //             buildImage: LinuxBuildImage.STANDARD_5_0,
                //         },
                //     }),
                //     input: serviceSourceOutput,
                //     outputs: [this.serviceBuildOutput],
                // }),
            ],
        });

        //add an update stage for the pipeline to be self mutational
        this.pipeline.addStage({
            stageName: "Pipeline_Update",
            actions: [
                new CloudFormationCreateUpdateStackAction({
                    actionName: "Update",
                    templatePath: this.cdkBuildOutput.atPath("PipelineStack.template.json"),
                    stackName: "PipelineStack",
                    adminPermissions: true,
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
                    templatePath: this.cdkBuildOutput.atPath(`${serviceStack.stackName}.template.json`),
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
