const { EmbedType, PermissionsBitField, EmbedBuilder } = require("discord.js");

const ticketSetup = require("../../schema/ticketSchema");
const staffPoints = require("../../schema/staffPoints");

module.exports = async (message) => {
  const guild = message.guild;
  const guildId = message.guild.id;
  const member = message.member;
  const prefix = "^";
  const command = "setpointslog";
  if (!message.content.toLowerCase().startsWith(`${prefix}${command}`)) return;
  const entry = await ticketSetup.findOne({ guildId });
  if (!entry) return;
  const highStaffId = entry.highStaffRole;
  if (!member.roles.cache.has(highStaffId)) {
    return message.reply("❌ You don't have access to this command.");
  }
  // Set the points log channel to the hardcoded channel ID
  const logChannelId = "1426846833270984724";
  
  entry.pointsLog = logChannelId;
  await entry.save();
  
  message.reply(`Points log channel set to <#${logChannelId}> ✅`);
};
