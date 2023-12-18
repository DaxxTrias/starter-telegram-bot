# Telegram Bot, built on [Cyclic](https://www.cyclic.sh/) 🤖

Transformed & remade from [starter-telegram-bot](https://github.com/cyclic-software/starter-telegram-bot)

## How to run it locally?

### Prerequisites

- Node.
- Yarn.
- [Telegram Client](https://desktop.telegram.org/).

### Get your bot token

- Grab your Telegram bot's API token by sending a message to [\@BotFather](https://telegram.me/BotFather).

<p align="center">
    <img src="./assets/creating-telegram-bot-api-token.gif" alt="Send /newbot to @BotFather to create a new bot and get its API token." />
</p>

### Local installation

- Clone the repository to your machine from command prompt or terminal: `git clone https://github.com/DaxxTrias/telegram-webhook && cd telegram-webhook`
- Take your key from messaging [\@BotFather](https://telegram.me/BotFather). (see above)
- Rename the file `.env.sample` to `.env` and edit the lines inside to suit your needs:

```bash
TELEGRAM_TOKEN=... # YOUR TELEGRAM API TOKEN
```

- Download dependencies: `yarn`
- Start your bot: `yarn dev`

## Usage Examples

### Being greeted by the bot

<p align="center">
    <img src="assets/bot-greeting.gif" alt="Bot responding to the yo command with "yo eludadev"" />
</p>

### Applying text effects

<p align="center">
    <img src="assets/bot-text-effects.gif" alt="Bot applying various text effects such as monospace and italic to the text "Hello World"" />
</p>

### Invoking the bot in other chats

> **Note**
> This feature is also known as [Inline Queries](https://core.telegram.org/api/bots/inline).

<p align="center">
<img src="assets/bot-inline-queries.gif" alt="Bot applying the monospace text effect to the text "Hello" in another chat" />
</p>
