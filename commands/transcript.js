const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  AttachmentBuilder,
  ChannelType,
  EmbedBuilder,
} = require("discord.js");
const { v4: uuidv4 } = require("uuid");
require("dotenv").config();
const ticketSetup = require("../schema/ticketSchema");
const channelData = require("../schema/ticketDetail");
const Transcript = require("../schema/transcriptSchema");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("transcript")
    .setDescription("Generate and save the ticket transcript.")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),

  run: async ({ interaction }) => {
    const member = await interaction.guild.members.fetch(interaction.user.id);

    await interaction.deferReply({ flags: 1 << 6 });

    const channel = interaction.channel;
    const channelId = channel.id;
    const channelEntry = await channelData.findOne({ channelId });

    // ✅ Check if it's a ticket channel
    if (!channelEntry) {
      return interaction.editReply({
        content: "❌ This is not a valid ticket channel.",
        flags: 1 << 6,
      });
    }
    const guildId = interaction.guild.id;
    const entry = await ticketSetup.findOne({ guildId });
    const staffRoleId = entry.staffRole;
    // ✅ Role check (staff role ID)
    if (!member.roles.cache.has(staffRoleId)) {
      return interaction.editReply({
        content: "❌ You don't have permission to use this command.",
        flags: 1 << 6,
      });
    }

    try {
      const messages = await fetchMessages(channel);

      if (!messages.length) {
        return interaction.editReply({
          content: "❌ No messages found in this channel.",
          flags: 1 << 6,
        });
      }

      // ✅ Process messages for database storage
      const processedMessages = messages.map((m) => ({
        id: m.id,
        authorId: m.author.id,
        author: m.author.username,
        authorTag: m.author.discriminator,
        authorAvatar: m.author.displayAvatarURL({ size: 256 }),
        isBot: m.author.bot,
        timestamp: m.createdAt,
        content: m.content,
        embeds: m.embeds.map((e) => e.toJSON()),
        attachments: m.attachments.map((a) => ({
          id: a.id,
          filename: a.name,
          size: a.size,
          url: a.url,
          contentType: a.contentType,
          width: a.width,
          height: a.height,
        })),
        reactions: m.reactions.cache.map((r) => ({
          emoji: r.emoji.toString(),
          count: r.count,
          users: r.users.cache.map((u) => u.username),
        })),
        edited: m.editedTimestamp !== null,
        editedTimestamp: m.editedTimestamp,
      }));

      // ✅ Get ticket opener
      const ticketOpener = await interaction.guild.members.fetch(
        channelEntry.userId
      );

      // ✅ Get claimed staff member
      let claimedByMember = null;
      if (channelEntry.claimedBy) {
        try {
          claimedByMember = await interaction.guild.members.fetch(
            channelEntry.claimedBy
          );
        } catch (e) {
          console.log("Failed to fetch claimed member");
        }
      }

      // ✅ Get all staff involved
      const staffIds = new Set();
      if (channelEntry.claimedBy) staffIds.add(channelEntry.claimedBy);
      if (channelEntry.staff) {
        channelEntry.staff.forEach((id) => staffIds.add(id));
      }

      const staffMembers = [];
      for (const staffId of staffIds) {
        try {
          const staffMember = await interaction.guild.members.fetch(staffId);
          staffMembers.push({
            id: staffMember.id,
            username: staffMember.user.username,
            tag: staffMember.user.tag,
            avatar: staffMember.user.displayAvatarURL({ size: 256 }),
          });
        } catch (e) {
          console.log("Failed to fetch staff member:", staffId);
        }
      }

      // ✅ Create transcript document
      const transcriptId = uuidv4();
      const transcript = new Transcript({
        transcriptId,
        ticketChannelId: channel.id,
        ticketChannelName: channel.name,
        categoryId: channel.parentId,
        categoryName: channel.parent ? channel.parent.name : null,
        ticketOpener: {
          id: ticketOpener.id,
          username: ticketOpener.user.username,
          tag: ticketOpener.user.tag,
          avatar: ticketOpener.user.displayAvatarURL({ size: 256 }),
        },
        claimedBy: claimedByMember
          ? {
              id: claimedByMember.id,
              username: claimedByMember.user.username,
              tag: claimedByMember.user.tag,
              avatar: claimedByMember.user.displayAvatarURL({ size: 256 }),
            }
          : null,
        staff: staffMembers,
        messages: processedMessages,
        status: "open",
      });

      await transcript.save();

      // ✅ Generate shareable link
      const baseUrl = process.env.WEBSITE_URL || "http://localhost:3000";
      const transcriptUrl = `${baseUrl}/transcript/${transcriptId}`;
      const apiUrl = `${baseUrl}/api/transcript/${transcriptId}`;

      // ✅ Create embed with transcript info
      const embed = new EmbedBuilder()
        .setColor(0x5865f2)
        .setTitle("📑 Transcript Generated")
        .setDescription(`Transcript for **${channel.name}** has been generated.`)
        .addFields(
          { name: "Messages", value: `${processedMessages.length}`, inline: true },
          { name: "Generated by", value: `<@${interaction.user.id}>`, inline: true },
          {
            name: "View Transcript",
            value: `[Open in Browser](${transcriptUrl})`,
            inline: false,
          },
          {
            name: "API Endpoint",
            value: `[JSON Data](${apiUrl})`,
            inline: false,
          }
        )
        .setTimestamp();

      // ✅ Reply in the current channel
      await interaction.editReply({
        embeds: [embed],
        flags: 1 << 6,
      });

      // ✅ Optionally send to staff logs channel
      const logsChannelId = entry.transcriptChannelId;
      let logsChannel;

      try {
        logsChannel = await interaction.guild.channels.fetch(logsChannelId);
      } catch (fetchErr) {
        console.error("Failed to fetch logs channel:", fetchErr);
      }

      if (logsChannel && logsChannel.type === ChannelType.GuildText) {
        const logEmbed = new EmbedBuilder()
          .setColor(0x5865f2)
          .setTitle("📑 Transcript Generated")
          .setDescription(
            `A transcript for **${channel.name}** was generated.`
          )
          .addFields(
            { name: "Generated by", value: `<@${interaction.user.id}>`, inline: true },
            { name: "Messages", value: `${processedMessages.length}`, inline: true },
            {
              name: "View Transcript",
              value: `[Open in Browser](${transcriptUrl})`,
              inline: false,
            }
          )
          .setTimestamp();

        await logsChannel.send({
          embeds: [logEmbed],
        });
      }
    } catch (error) {
      console.error("Transcript Error:", error);
      await interaction.editReply({
        content: "❌ An error occurred while generating the transcript.",
        flags: 1 << 6,
      });
    }
  },
};

async function fetchMessages(channel) {
  let messages = [];
  let lastId;

  while (true) {
    const options = { limit: 100 };
    if (lastId) options.before = lastId;

    const fetched = await channel.messages.fetch(options);

    if (fetched.size === 0) break;

    messages.push(...fetched.map((msg) => msg));
    lastId = fetched.last().id;
  }

  return messages;
}
