import {
  DeleteMessageCommand,
  ReceiveMessageCommand,
} from "@aws-sdk/client-sqs";
import type { S3Event } from "aws-lambda";
import { RunTaskCommand } from "@aws-sdk/client-ecs";
import { sqsClient, ecsClient } from "./clients";
import dotenv from "dotenv";
dotenv.config({
  path: "./.env",
});

async function main() {
  const receiveSqsMessagecommand = new ReceiveMessageCommand({
    QueueUrl: process.env.SQS_QUEUE_URL,
    MaxNumberOfMessages: 1,
    WaitTimeSeconds: 20,
  });

  while (true) {
    const { Messages } = await sqsClient.send(receiveSqsMessagecommand);
    if (!Messages) {
      console.log("No messages in the queue");
      continue;
    }

    try {
      for (const message of Messages) {
        const { Body, MessageId } = message;
        console.log(`MessageId: ${MessageId}`);

        if (!Body) {
          console.log("No Body in the message");
          continue;
        }

        // Validate the message
        const event = JSON.parse(Body) as S3Event;
        if ("Service" in event && "Event" in event) {
          if (event.Event === "s3:TestEvent") {
            await sqsClient.send(
              new DeleteMessageCommand({
                QueueUrl: process.env.SQS_QUEUE_URL,
                ReceiptHandle: message.ReceiptHandle,
              })
            );
            continue;
          }
        }

        // Spin up a docker container
        for (const record of event.Records) {
          const { s3 } = record;
          const {
            bucket,
            object: { key },
          } = s3;

          // Spin up a docker container

          const runEcsTaskCommand = new RunTaskCommand({
            taskDefinition:
              "arn:aws:ecs:ap-southeast-2:597088022507:task-definition/video_transcoder:4",
            cluster:
              "arn:aws:ecs:ap-southeast-2:597088022507:cluster/dev_cluster",
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
                      value: bucket.name,
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

          await ecsClient.send(runEcsTaskCommand);

          // Delete the message from the queue
          await sqsClient.send(
            new DeleteMessageCommand({
              QueueUrl: process.env.SQS_QUEUE_URL,
              ReceiptHandle: message.ReceiptHandle,
            })
          );
        }
      }
    } catch (error) {
      console.error(error);
    }
  }
}

main();
