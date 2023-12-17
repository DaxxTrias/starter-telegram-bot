import { Bot, InlineKeyboard, webhookCallback } from "grammy";
import { chunk } from "lodash";
import express, { Request, Response } from "express";
import { applyTextEffect, Variant } from "./textEffects";
import axios from 'axios';
import type { Variant as TextEffectVariant } from "./textEffects";

// Constants and Type Definitions
const bot = new Bot(process.env.TELEGRAM_TOKEN || "");
const app = express();
const PORT = process.env.PORT || 3005;
const allEffects: { code: TextEffectVariant; label: string }[] = [
  { code: 'w', label: 'Monospace' }, { code: 'b', label: 'Bold' },
  { code: 'i', label: 'Italic' }, { code: 'd', label: 'Doublestruck' },
  { code: 'o', label: 'Circled' }, { code: 'q', label: 'Squared' }
];
const webhookUrl = 'http://localhost:3005/webhook';
const introductionMessage = `Hello! I'm a Telegram bot.;`;
const aboutUrlKeyboard = new InlineKeyboard().url("Website URL", "https://www.google.com/");

// Helper Functions
const effectCallbackCodeAccessor = (effectCode: TextEffectVariant) => `effect-${effectCode}`;
const findEffectByLabel = (label: string) => allEffects.find((effect) => effect.label.toLowerCase() === label.toLowerCase())?.code;
const createInlineKeyboard = (effectCodes: string[]) => {
  const keyboard = new InlineKeyboard();
  chunk(effectCodes.map(code => allEffects.find(effect => effect.code === code)), 3)
  .forEach(chunk => chunk.forEach(effect => effect && keyboard.text(effect.label, effectCallbackCodeAccessor(effect.code)).row()));
return keyboard;
};
const textEffectResponse = (original: string, modified?: string) => `Original: ${original}${modified ? `\nModified: ${modified}` : ''}`;

// Exception Handlers
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception: ', error);
  // good spot to perform cleanup of operations / handles
  // maybe restart automatically?
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  // todo: more extensive logging here
});

// Bot Command Handlers
bot.command('yo', (ctx) => ctx.reply(`Yo ${ctx.from?.username}`));
bot.command('effect', ctx => ctx.reply(textEffectResponse(ctx.match), { reply_markup: createInlineKeyboard(allEffects.map(e => e.code)) }));
bot.command('start', ctx => ctx.reply(introductionMessage, {reply_markup: aboutUrlKeyboard, parse_mode: 'HTML'}));
bot.command('webhook', ctx => sendDataToWebhook(ctx.match));

// Inline Query Handler
bot.inlineQuery(/effect (monospace|bold|italic) (.*)/, async (ctx) => {
  if (!Array.isArray(ctx.match)) {
    console.error('ctx.match is not an array');
    return;
  }

  const [_, label, originalText] = ctx.match;

  const effectCode = findEffectByLabel(label);
  if (!effectCode) {
    console.error('effect code not found for: ', label);
    return;
  }
  
  const modifiedText = applyTextEffect(originalText, findEffectByLabel(label) as Variant);

  await ctx.answerInlineQuery([
    {
      type: 'article',
      id: 'text-effect',
      title: 'Text Effects',
      input_message_content: {
        message_text: textEffectResponse(originalText, modifiedText),
        parse_mode: 'HTML'
      },
      reply_markup: aboutUrlKeyboard,
      url: 'http://t.me/',
      description: 'Create stylish Unicode text, all within Telegram.'
    }
  ], { cache_time: 30 * 24 * 3600 });
});

// Parse the text effect response
const parseTextEffectResponse = (response: string): { originalText: string, modifiedText?: string } => {
  const originalTextMatch = response.match(/Original: (.*)/);
  const modifiedTextWatch = response.match(/Modified: (.*)/);

  return {
    originalText: originalTextMatch ? originalTextMatch[1] : '',
    modifiedText: modifiedTextWatch ? modifiedTextWatch[1] : undefined
  };
};

// callback handler
allEffects.forEach(effect => bot.callbackQuery(effectCallbackCodeAccessor(effect.code), async ctx => {
  // keyboard.text(effect.label, `callback_data:${effect.code}`).row();
  const { originalText } = parseTextEffectResponse(ctx.msg?.text || '');
  const modifiedText = applyTextEffect(originalText, effect.code);
  await ctx.editMessageText(textEffectResponse(originalText, modifiedText), 
  { reply_markup: createInlineKeyboard(allEffects.map(e => e.code).filter(code => code !== effect.code)) });
}));

// Webhook Route
app.post(`/webhook`, async (req: Request, res: Response) => {
  console.log(`webhook triggered: `, req.body);
  res.status(200).send(`data recvd`);
});

// Bot Server Start Logic
if (process.env.NODE_ENV === 'production') {
  app.use(express.json());
  app.use(webhookCallback(bot, 'express'));
  app.listen(PORT, () => console.log(`Bot listening on port ${PORT}`));
} else {
  bot.start();
}

// Webhook Send Functions
async function sendDataToWebhook(data: string) {
  try {
    await axios.post(webhookUrl, { data }, { headers: {  'Content-Type': 'application/json' }});
    console.log('data sent to webhook');
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error(error.response?.data);
    if (error.response) {
      console.error(`status:`, error.response.status);
      console.error(`data:`, error.response.data);
      console.error(`headers:`, error.response.headers);
    } else if (error.request) {
      console.error(`no response received:`, error.request);
    } else {
      console.error(`error setting up request:`, error.message);
    }
  } else {
    console.error('Error occured: ', error);
  }
  }
}