import { Telegraf } from "telegraf";
import process from "node:process";

const botToken = process.env.TELEGRAM_BOT_TOKEN;
const appUrl = process.env.APP_URL;

if (!botToken) {
  throw new Error("TELEGRAM_BOT_TOKEN is required");
}

if (!appUrl) {
  throw new Error("APP_URL is required");
}

const bot = new Telegraf(botToken);

bot.start((ctx) =>
  ctx.reply(
    "🚀 Welcome to Dynamic Capital!\n\nConnect your wallet & subscribe in the Mini App:",
    {
      reply_markup: {
        inline_keyboard: [[{ text: "Open Mini App 🌐", url: appUrl }]],
      },
    },
  )
);

bot.command(
  "news",
  (ctx) => ctx.reply("🛠 Dev Update: auto-invest + burn live."),
);

bot.launch().then(() => {
  console.log("Dynamic Capital bot launched");
});

process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));
