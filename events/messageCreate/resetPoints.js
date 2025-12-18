const { EmbedType, PermissionsBitField, EmbedBuilder } = require("discord.js");

const ticketSetup = require("../../schema/ticketSchema");
const staffPoints = require("../../schema/staffPoints");

module.exports = async (message) => {
  const guild = message.guild;
  const guildId = message.guild.id;
  const member = message.member;
  const prefix = "^";
  const command = "resetpoints";
  if (!message.content.toLowerCase().startsWith(`${prefix}${command}`)) return;
  const entry = await ticketSetup.findOne({ guildId });
  if (!entry) return;
  const highStaffRoleId = entry.highStaffRole;
  if (!member.roles.cache.has(highStaffRoleId)) {
    return message.reply("❌ You don't have access to this command.");
  }

  // If the message doesn't start with your command, exit

  // Split the message content into an array
  const args = message.content.trim().split(/ +/);

  // The first argument will be "^points", we shift it away
  args.shift();

  // Now args[0] should be the user mention or ID
  const userMention = args[0];

  // If they didn't provide a user, return
  if (!userMention) {
    return message.reply("Please mention a user or provide their ID!");
  }

  // Remove mention characters if necessary, or try fetching the member by ID
  const staffId = userMention.replace(/[<@!>]/g, "");
  const staff = await staffPoints.findOne({ staffId });
  if (!staff) {
    return message.reply("❌No Staff Found");
  }
  try {
    staff.points = 0;
    await staff.save();
  } catch (error) {
    console.log(error);
    return message.reply("An Error Occurred While Reseting Points!!");
  }
  const staffPEmbed = new EmbedBuilder()
    .setTitle(`Points Of Staff:`)
    .setDescription(`Current Points Of <@${staffId}>`) // ✅ Mention works here!
    .addFields({
      name: "Points:",
      value: `${staff.points}`, // ✅ Make sure it's a string!
    })
    .setColor("Random");

  // Now you have the member object!
  console.log(
    "Points Of:",
    staffId,
    "\n Reseted By:",
    message.author.username,
    "\n In Guild",
    guild.name
  );
  await message.channel.send({
    embeds: [staffPEmbed],
  });

  // Send to points log channel
  const staffPLogChannel = entry.pointsLog;
  const channelPLog = message.guild.channels.cache.get(staffPLogChannel);
  if (channelPLog) {
    const logEmbed = new EmbedBuilder()
      .setDescription(`<@${staffId}> - Reset to 0`)
      .setColor("Random");
    channelPLog.send({ embeds: [logEmbed] }).catch((error) => {
      console.error("Failed to send to points log:", error);
      message.channel.send("⚠️ Points updated but failed to log to points channel.").catch(() => {});
    });
  } else if (staffPLogChannel) {
    message.channel.send("⚠️ Points log channel not found. Please check configuration.").catch(() => {});
  }
};
