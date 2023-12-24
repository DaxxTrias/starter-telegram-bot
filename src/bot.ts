// SPDX-License-Identifier: MIT
// This file is part of <telegram-webhook>, which is licensed under the MIT License.
// See LICENSE file in the project root for full license text.
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
const aboutUrlKeyboard = new InlineKeyboard().url("DaxxTrias' github", "hhttps://github.com/DaxxTrias/telegram-webhook");

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
    console.log("Sending data to the webhook...\nPayload: ", data);
    const response = await axios.post(webhookUrl, data, { headers: headers });
    console.log("Data sent to webhook successfully.\nResponse:", response.data);

    // Parse JSON response and extract required fields
    const jsonResponse = typeof response.data === 'string' ? JSON.parse(response.data) : response.data;
    const { type, side, price, amount } = jsonResponse;

    // Extract ordStatus from the nested info object
    const ordStatus = jsonResponse.info?.ordStatus;
    const symbol = jsonResponse.info?.symbol;

    // Format the output
    const formattedResponse = `Symbol: ${symbol}\nType: ${type}  Side: ${side}\nPrice: ${price}  Amount: ${amount}\nOrder Status: ${ordStatus}`;

    // Send the formatted response to the user
    await notifyUser(chatId, formattedResponse);
  } catch (error) {
    // Handle errors using the helper function
    const errorMessage = processErrorResponse(error, chatId);
    await notifyUser(chatId, errorMessage);

    console.error('An error occurred while sending data to the webhook:\n', error);
    logErrorToFile(`An error occurred while sending data to the webhook:\n${error}`);
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

// Error Handling Helper Function
function processErrorResponse(error: any, chatId: number): string {
  if (axios.isAxiosError(error) && error.response) {
    let userMessage = `Response Code: ${error.response.status}\n`;
    userMessage += `Response Status: ${error.response.statusText}\n`;

    // Check if the response data is a string and parse it as JSON
    const errorData = typeof error.response.data === 'string' ? JSON.parse(error.response.data) : error.response.data;

    // Extract 'message' and 'command' from errorData if available
    if (errorData.command) userMessage += `Command: ${errorData.command}\n`;
    if (errorData.message) userMessage += `Message: ${errorData.message}\n`;

    return "The server understood and responded with:\n" + userMessage;
  } else {
    // Generic error message for non-Axios errors
    return "An unexpected error occurred while sending webhook data.";
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