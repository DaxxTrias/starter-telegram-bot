require('dotenv').config();
import { Bot, InlineKeyboard, webhookCallback } from "grammy";
import express, { Request, Response } from "express";
import axios from 'axios';
import fs from 'fs';
import path from 'path';

// File System Utility Functions
const logsDirectory = path.join(__dirname, '..', 'logs');
const errorLogPath = path.join(logsDirectory, 'errors.txt');
ensureDirectoryExists(logsDirectory);
ensureFileExists(errorLogPath);

function ensureDirectoryExists(dirPath: string) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

function ensureFileExists(filePath: string) {
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, '');
  }
}

// Logging Function
function logErrorToFile(error: string) {
  const timestamp = new Date().toISOString();
  const logMessage = `${timestamp} - ${error}\n`;
  try {
    fs.appendFileSync(errorLogPath, logMessage);
  } catch (fileError) {
    console.error('Failed to log error to file:', fileError);
  }
}

// Environment Validation
validateEnvironmentVariable('TELEGRAM_TOKEN');
validateEnvironmentVariable('WEBHOOK_URL');

function validateEnvironmentVariable(name: string) {
  if (!process.env[name]) {
    const message = `Environment variable ${name} is missing from the '.env' file.`;
    logErrorToFile(message);
    console.warn(message);
    process.exit(1);
  }
}

// Bot Setup
const bot = new Bot(process.env.TELEGRAM_TOKEN as string);
const PORT = process.env.PORT || 3005;
const app = express();
const webhookUrl = process.env.WEBHOOK_URL || "http://localhost:3005/webhook";
const introductionMessage = "Hello! I'm a Telegram bot to help facilitate utilizing Webhooks.";
const aboutUrlKeyboard = new InlineKeyboard().url("Website URL", "https://www.google.com/");

// Exception Handlers
process.on('uncaughtException', handleError);
process.on('unhandledRejection', handleError);

function handleError(error: Error | null, promise?: Promise<any>) {
  const errorMessage = error ? error.toString() : 'Unhandled promise rejection';
  logErrorToFile(errorMessage);
  console.error(errorMessage, promise);
  process.exit(1);
}

// Bot Command Handlers
bot.command('start', ctx => ctx.reply(introductionMessage, {reply_markup: aboutUrlKeyboard, parse_mode: 'HTML'}));
bot.command('webhook', async ctx => {
  const chatId = ctx.chat.id; // Get the chat ID of the user
  const data = ctx.match; // Get the data supplied to the command)

  // now call the sendDataToWebhook function with the chatId and data
  await sendDataToWebhook(data, chatId);
});

// Webhook Routing Function
app.post(`/webhook`, async (req: Request, res: Response) => {
  console.log(`webhook triggered: `, req.body);
  res.status(200).send(`data recvd`);
});

// Webhook Send Function
async function sendDataToWebhook(data: string, chatId: number) {
  try {
    const headers = {
      'Content-Type': 'text/plain',
      // mimicing postman user-agent to avoid 403 error from cloudfront
      'User-Agent': 'PostmanRuntime/7.36.0'
    };

    // Log the payload before sending
    console.log("Sending the following data to the webhook:");
    console.log("Payload:", data);

    const response = await axios.post(webhookUrl, data, { headers: headers });
    console.log("Data sent to webhook successfully. Response:", response.data);

    // Send the JSON response to the user
    await notifyUser(chatId, response.data);
  } catch (error) {
    if (axios.isAxiosError(error)) {
      // Check for a 422 status code and send a tailored message
      if (error.response && error.response.status === 422) {
        await notifyUser(chatId, "The server understood the request but was unable to process the command due to syntax errors or invalid data." +
        "\nError code 422");
      } else {
        // Handle other errors
        await notifyUser(chatId, `An error occurred while sending data to the webhook.`);
      }
      console.error('An error occurred while sending data to the webhook:', error);
      logErrorToFile(`An error occurred while sending data to the webhook: ${error}`);
    } else {
      // Non-Axios error
      console.error(error);
      logErrorToFile(`An unexpected error occured while sending webhook data: ${error}`);
      await notifyUser(chatId, "An unexpected error occurred while sending webhook data.");
    }
  }
}

// Wrapper function to send messages to the user
async function notifyUser(chatId: number, message: any) {
  try {
    // Check if the message is an object and format as JSON string
    const formattedMessage = typeof message === 'object' ? 
      `\`\`\`json\n${JSON.stringify(message, null, 2)}\n\`\`\`` : 
      `\`${message}\``;

    await bot.api.sendMessage(chatId, formattedMessage, { parse_mode: 'MarkdownV2' });
  } catch (error) {
    console.error(`Failed to send message to user: ${error}`);
    logErrorToFile(`Failed to send message to user: ${error}`);
  }
}

// Bot Server Start Logic
startBotServer();

function startBotServer() {
  if (process.env.NODE_ENV === 'production') {
    app.use(express.json());
    app.use(webhookCallback(bot, 'express'));
    app.listen(PORT, () => console.log(`Bot listening on port ${PORT}`));
  }
  bot.start();
}