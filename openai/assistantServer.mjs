import cors from "cors";
import express from "express";
import bodyParser from "body-parser";
import OpenAI, { toFile } from "openai";
import dotenv from "dotenv";
import { validateMessageRequest } from "./validation.mjs";

dotenv.config();

const OPENAPI_ORG_ID = process.env.OPENAPI_ORG_ID;
const OPENAPI_KEY = process.env.OPENAPI_KEY;
const OPENAPI_PROJECT = process.env.OPENAPI_PROJECT;
const RESUME_ASSISTANT_ID = process.env.RESUME_ASSISTANT_ID;
const PORT = process.env.BOT_PORT;

const openai = new OpenAI({
  organization: OPENAPI_ORG_ID,
  project: OPENAPI_PROJECT,
  apiKey: process.env.OPENAPI_KEY,
});

const assistant = express();

assistant.use(cors());
assistant.use(express.json());
assistant.use(bodyParser.urlencoded({ extended: true }));

// health check
assistant.get("/", async (req, res) => {
  res.json({ assistant: "ok" });
});

assistant.post("/message", validateMessageRequest, async (req, res) => {
  const { message } = req.body;

  const stream = await openai.beta.threads.createAndRun({
    assistant_id: RESUME_ASSISTANT_ID,
    thread: {
      messages: [
        {
          role: "user",
          content: message,
        },
      ],
    },
    stream: true,
  });
  let collect = [];
  for await (const event of stream) {
    const line =
      event.data?.delta?.content?.map(({ type, text }) => {
        return type === "text" ? text.value : "";
      }) || [];
    collect = [...collect, ...line.flatMap((token) => token)];
  }
  res.json({ reply: collect.join("") });
});

assistant.listen(PORT, () => {
  console.log("resume bot is listening on " + PORT);
});
