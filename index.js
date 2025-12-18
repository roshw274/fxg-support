require("./keep_alive");
require("dotenv/config");
const { Client, GatewayIntentBits, ActivityType } = require("discord.js");
const { CommandHandler } = require("djs-commander");
const path = require("path");
const mongoose = require("mongoose");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent, // Remember to enable in Dev Portal!
    GatewayIntentBits.GuildMembers,   // Add this if you need member data
  ],
});

// MongoDB Connection
async function connectToDatabase() {
  try {
    const mongodb = "mongodb+srv://darkwall0901:ElFCweblWtnT9IHS@fakepxielgiveawayscarry.eih2e6y.mongodb.net/?retryWrites=true&w=majority&appName=FakepxielGiveawaysCarry";

    if (!mongodb) {
      console.error("❌ MongoDB URI is missing!");
      process.exit(1);
    }

    await mongoose.connect(mongodb);
    console.log("✅ Connected to MongoDB successfully!");
  } catch (error) {
    console.error("❌ Failed to connect to MongoDB:", error);
    process.exit(1);
  }
}


// Initialize djs-commander for command + event handling
new CommandHandler({
  client,
  commandsPath: path.join(__dirname, "commands"),
  eventsPath: path.join(__dirname, "events"), // Optional if you have events
});

// ================================  No Staff Ping LOGIC ==========================================
// client.on("messageCreate", async (message) => {
//   if (message.author.bot) return;

//   const staffRoleId = '1295341291994873886';
//   if (message.mentions.roles.has(staffRoleId)) {
//     if (!message.member.roles.cache.has(staffRoleId)) {
//       try {
//         await message.delete();

//         await message.author.send({
//           content: `You are not allowed to ping the staff role in **${message.guild.name}**.`,
//         });
//       } catch (err) {
//         console.error('Failed to delete message or send DM:', err);
//       }
//     }
//   }
// });

client.on("ready", () => {
  console.log("✅ Bot Online Successfully!");

  client.user.setActivity({
    name: " Made by darkwall solely for FxG",
    type: ActivityType.Watching,
  });
});

// Error handling for the bot
client.on("error", (error) => {
  console.error("❌ Discord client error:", error);
});

process.on("unhandledRejection", (error) => {
  console.error("❌ Unhandled promise rejection:", error);
});

// Initialize bot
async function startBot() {
  try {
    await connectToDatabase();

    // Use token from environment variables
    const TOKEN = process.env.DISCORD_TOKEN;
    if (!TOKEN) {
      console.error("❌ DISCORD_TOKEN not found in .env file!");
      process.exit(1);
    }

    await client.login(TOKEN);
  } catch (error) {
    console.error("❌ Failed to start bot:", error);
    process.exit(1);
  }
}

startBot();
