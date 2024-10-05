import type { S3Event } from "aws-lambda";
import { sqsClient, ecsClient } from "./clients.js";
import {
  deleteSqsMessageCommand,
  receiveSqsMessagecommand,
  runEcsTaskCommand,
} from "./command.js";
import { log } from "console";

async function main() {
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
              deleteSqsMessageCommand(message.ReceiptHandle)
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

          const ecsResponse = await ecsClient.send(
            runEcsTaskCommand(key, bucket.name)
          );

          if (!ecsResponse.tasks) {
            console.log("No tasks found");
            continue;
          }

          // Delete the message from the queue
          await sqsClient.send(deleteSqsMessageCommand(message.ReceiptHandle));
        }
      }
    } catch (error) {
      console.error(error);
    }
  }
}

main();
