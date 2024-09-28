const {
  S3Client,
  GetObjectCommand,
  PutObjectCommand,
} = require("@aws-sdk/client-s3");
const fsPromise = require("node:fs/promises");
const fs = require("node:fs");
const path = require("node:path");
const ffmpegPath = require("@ffmpeg-installer/ffmpeg").path;
const ffmpeg = require("fluent-ffmpeg");
ffmpeg.setFfmpegPath(ffmpegPath);

const RESOLUTIONS = [
  { name: "360p", width: 640, height: 360 },
  { name: "480p", width: 854, height: 480 },
  { name: "720p", width: 1280, height: 720 },
];

const SESConfig = {
  region: "ap-southeast-2",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_KEY_ID,
  },
};
const s3Client = new S3Client(SESConfig);

const BUCKET_NAME = process.env.BUCKET_NAME; //"temp-video-upload.aditya";
const VIDEO_KEY = process.env.VIDEO_KEY; //"videos/parallax.mp4";

async function main() {
  console.log("Starting video processing");

  // Download the original video
  const command = new GetObjectCommand({
    Bucket: BUCKET_NAME,
    Key: VIDEO_KEY,
  });

  const fileName = VIDEO_KEY.split("/")[1].split(".")[0];

  const res = await s3Client.send(command);
  console.log("Downloading video");

  const localVideoPath = `${fileName}.mp4`;
  await fsPromise.writeFile(localVideoPath, res.Body);
  const fullVideoPath = path.resolve(localVideoPath);

  console.log(`Downloaded video to ${fullVideoPath}`);

  // Start the video processing
  const promises = RESOLUTIONS.map((resolution) => {
    const output = `${fileName}${resolution.name}${Date.now()}.mp4`;

    return new Promise((resolve) => {
      console.log(`Processing video to ${resolution.name}`);

      ffmpeg(fullVideoPath)
        .output(output)
        .withVideoCodec("libx264")
        .withAudioCodec("aac")
        .withSize(`${resolution.width}x${resolution.height}`)
        .on("end", async () => {
          console.log(`Uploaded ${output}`);

          const command = new PutObjectCommand({
            Bucket: "final-video-adii",
            Key: output,
            Body: fs.createReadStream(path.resolve(output)),
          });
          await s3Client.send(command);
          console.log("uploading video");

          resolve();
        })
        .format("mp4")
        .run();
    });
  });

  await Promise.all(promises);
}

main();
