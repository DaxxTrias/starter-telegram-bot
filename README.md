# Telegram Bot, built on [Cyclic](https://www.cyclic.sh/) 🤖

Transformed & remade from [starter-telegram-bot](https://github.com/cyclic-software/starter-telegram-bot)

## How to run it locally?

### Prerequisites

- Node.
- Yarn.
- [Telegram Client](https://desktop.telegram.org/).

### Local installation

1. Clone the repository to your machine: `git clone https://github.com/DaxxTrias/telegram-webhook && cd telegram-webhook`
2. Grab your bot's API token by messaging [\@BotFather](https://telegram.me/BotFather). (see above)
3. Create the file `.env` and add the following line:

```bash
TELEGRAM_TOKEN=... # YOUR TELEGRAM API TOKEN
```

4. Download dependencies: `yarn`
5. Start your bot: `yarn dev`

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
