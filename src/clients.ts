import { ECSClient } from "@aws-sdk/client-ecs";
import { SQSClient } from "@aws-sdk/client-sqs";
import dotenv from "dotenv";
dotenv.config({
  path: "./.env",
});

export const sqsClient = new SQSClient({
  region: process.env.REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_KEY_ID!,
  },
});

export const ecsClient = new ECSClient({
  region: process.env.REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_KEY_ID!,
  },
});
