import { RunTaskCommand } from "@aws-sdk/client-ecs";
import {
  DeleteMessageCommand,
  ReceiveMessageCommand,
} from "@aws-sdk/client-sqs";
import dotenv from "dotenv";
dotenv.config({
  path: "./.env",
});

export const receiveSqsMessagecommand = new ReceiveMessageCommand({
  QueueUrl: process.env.SQS_QUEUE_URL,
  MaxNumberOfMessages: 1,
  WaitTimeSeconds: 20,
});

export const runEcsTaskCommand = (key: string, bucketName: string) => {
  return new RunTaskCommand({
    taskDefinition:
      "arn:aws:ecs:ap-southeast-2:597088022507:task-definition/video_transcoder:5",
    cluster: "arn:aws:ecs:ap-southeast-2:597088022507:cluster/dev_cluster",
    launchType: "FARGATE",
    networkConfiguration: {
      awsvpcConfiguration: {
        assignPublicIp: "ENABLED",
        securityGroups: ["sg-0e5045b2155bbf9e3"],
        subnets: [
          "subnet-08133452aa5041d42",
          "subnet-08b6b451d71ce9a63",
          "subnet-04c53887e76ec7c47",
        ],
      },
    },
    overrides: {
      containerOverrides: [
        {
          name: "transcode-video",
          environment: [
            {
              name: "BUCKET_NAME",
              value: bucketName,
            },
            {
              name: "VIDEO_KEY",
              value: key,
            },
            {
              name: "AWS_ACCESS_KEY_ID",
              value: process.env.AWS_ACCESS_KEY_ID,
            },
            {
              name: "AWS_SECRET_KEY_ID",
              value: process.env.AWS_SECRET_KEY_ID,
            },
          ],
        },
      ],
    },
  });
};

export const deleteSqsMessageCommand = (ReceiptHandle: string | undefined) => {
  return new DeleteMessageCommand({
    QueueUrl: process.env.SQS_QUEUE_URL,
    ReceiptHandle,
  });
};
