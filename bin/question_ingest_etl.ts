#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { QuestionIngestEtlStack } from '../lib/question-ingestion-etl-stack';
import { QuestionIngestionPipelineStack } from '../lib/question-ingestion-pipeline-stack;


const app = new cdk.App();
new QuestionIngestEtlStack(app, 'QuestionIngestEtlStack', {});
new QuestionIngestionPipelineStack(app, "PipelineStack", {});