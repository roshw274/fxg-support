const {
  EmbedBuilder,
  ChannelType,
  SlashCommandBuilder,
  ButtonBuilder,
  ButtonStyle,
  ActionRowBuilder,
} = require("discord.js");

const { v4: uuidv4 } = require("uuid");
const channelData = require("../schema/ticketDetail");
const ticketSetup = require("../schema/ticketSchema");
const staffPoints = require("../schema/staffPoints");
const Transcript = require("../schema/transcriptSchema");

require("dotenv").config();

module.exports = {
  data: new SlashCommandBuilder()
    .setName("close")
    .setDescription("Close the current ticket")
    .addStringOption((option) =>
      option.setName("reason").setDescription("Reason for closing the ticket")
    ),

  run: async ({ interaction }) => {
    const channel = interaction.channel;
    const guild = interaction.guild;

    console.log(
      `[DEBUG] Close command triggered by ${interaction.user.tag} in ${channel.name}`
    );

    try {
      // Fast reply so it doesn't get stuck
      await interaction.reply({
        content: "🔄 Closing ticket... Generating transcript.",
        flags: 1 << 6,
      });

      // Step 1: Fetch Ticket DB Data
      const channelEntry = await channelData.findOne({ channelId: channel.id });
      if (!channelEntry) {
        console.log(`[DEBUG] No ticket found for this channel.`);
        return interaction.editReply({
          content: "❌ This isn't a valid ticket channel.",
        });
      }

      const ticketConfig = await ticketSetup.findOne({ guildId: guild.id });
      if (!ticketConfig) {
        console.log(`[DEBUG] Ticket system not set up for guild.`);
        return interaction.editReply({
          content: "❌ Ticket system isn't properly set up.",
        });
      }

      const reason =
        interaction.options.getString("reason") || "No reason provided";
      const staffRoleId = ticketConfig.staffRole;

      // Step 2: Permission Check
      const member = await guild.members.fetch(interaction.user.id);
      if (!member.roles.cache.has(staffRoleId)) {
        console.log(`[DEBUG] User lacks permission.`);
        return interaction.editReply({
          content: "❌ You don't have permission to close tickets.",
        });
      }

      // Step 3: Fetch Messages
      const messages = await fetchMessages(channel);
      console.log(`[DEBUG] Messages fetched: ${messages.length}`);

      if (!messages.length) {
        return interaction.editReply({
          content: "❌ No messages found in this ticket.",
        });
      }

      // Step 4: Process messages for database storage
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

      // Get ticket opener
      const ticketOpener = await guild.members.fetch(channelEntry.userId);

      // Get claimed staff member
      let claimedByMember = null;
      if (channelEntry.claimer) {
        try {
          claimedByMember = await guild.members.fetch(channelEntry.claimer);
        } catch (e) {
          console.log("Failed to fetch claimed member");
        }
      }

      // Get all staff involved
      const staffIds = new Set();
      if (channelEntry.claimer) staffIds.add(channelEntry.claimer);
      if (channelEntry.staff) {
        channelEntry.staff.forEach((id) => staffIds.add(id));
      }

      const staffMembers = [];
      for (const staffId of staffIds) {
        try {
          const staffMember = await guild.members.fetch(staffId);
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

      // Create transcript document
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
        status: "closed",
        closedAt: new Date(),
        closeReason: reason,
      });

      await transcript.save();
      console.log(`[DEBUG] Transcript saved: ${transcriptId}`);

      // Generate shareable link
      const baseUrl = process.env.WEBSITE_URL || "http://localhost:3000";
      const transcriptUrl = `${baseUrl}/transcript/${transcriptId}`;

      // Step 5: Send Closing Message in Ticket Channel
      await channel.send(
        `🔒 This ticket has been closed by <@${interaction.user.id}>. Deleting channel...`
      );

      // Step 5.5: Send feedback request to ticket opener via DM
      const openerId = channelEntry.userId;
      const opener = await guild.members.fetch(openerId).catch(() => null);
      
      if (opener && opener.user) {
        // Get only the staff member who claimed the ticket
        const staffMentionString = channelEntry.claimer 
          ? `<@${channelEntry.claimer}>` 
          : 'the staff member';

        const feedbackEmbed = new EmbedBuilder()
          .setTitle("Rate Your Support Experience")
          .setDescription(
            `Thank you for contacting support!\n\n` +
            `Your ticket **${channel.name}** has been closed.\n\n` +
            `Please rate the help you received from ${staffMentionString}.`
          )
          .setColor(0x5865f2);

        const feedbackRow = new ActionRowBuilder()
          .addComponents(
            new ButtonBuilder()
              .setCustomId("feedback_1")
              .setLabel("1")
              .setEmoji("⭐")
              .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
              .setCustomId("feedback_2")
              .setLabel("2")
              .setEmoji("⭐")
              .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
              .setCustomId("feedback_3")
              .setLabel("3")
              .setEmoji("⭐")
              .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
              .setCustomId("feedback_4")
              .setLabel("4")
              .setEmoji("⭐")
              .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
              .setCustomId("feedback_5")
              .setLabel("5")
              .setEmoji("⭐")
              .setStyle(ButtonStyle.Secondary)
          );

        try {
          await opener.user.send({
            embeds: [feedbackEmbed],
            components: [feedbackRow]
          });
          console.log(`[DEBUG] Feedback request sent to ticket opener: ${opener.user.tag}`);
        } catch (error) {
          console.log(`❌ Could not send feedback request to user ${openerId}:`, error.message);
        }
      }

      // Step 6: Send Embed + Transcript Link in Logs Channel
      const logsChannel = await guild.channels
        .fetch(ticketConfig.transcriptChannelId)
        .catch(() => null);

      if (logsChannel && logsChannel.type === ChannelType.GuildText) {
        const closeEmbed = new EmbedBuilder()
          .setTitle("🎫 Ticket Closed")
          .setColor(0x5865f2)
          .addFields(
            { name: "Ticket", value: `${channel.name}`, inline: true },
            { name: "Category", value: `${channel.parent?.name || "Unknown"}`, inline: true },
            { name: "Closed By", value: `${interaction.user.username}`, inline: true },
            { name: "Reason", value: `${reason}`, inline: false },
            { name: "Messages", value: `${processedMessages.length}`, inline: true },
            {
              name: "View Transcript",
              value: `[Open in Browser](${transcriptUrl})`,
              inline: false,
            }
          )
          .setTimestamp();

        await logsChannel.send({
          embeds: [closeEmbed],
        });

        // Send transcript link to opener
        if (opener && opener.user) {
          const dmEmbed = new EmbedBuilder()
            .setTitle("🎫 Your Ticket Has Been Closed")
            .setColor(0x5865f2)
            .setDescription(`Your ticket **${channel.name}** has been closed.`)
            .addFields(
              { name: "Close Reason:", value: reason },
              {
                name: "View Transcript",
                value: `[Open in Browser](${transcriptUrl})`,
              }
            )
            .setTimestamp();

          await opener.user
            .send({
              embeds: [dmEmbed],
            })
            .catch(() => {
              console.log(`❌ Could not send close notification to user ${openerId}`);
            });
        }

        console.log(`[DEBUG] Embed and transcript link sent to logs channel.`);
      }

      // Step 7: Award Staff Points (Optional)
      const claimerId = channelEntry.claimer;
      if (claimerId) {
        let staff = await staffPoints.findOne({ staffId: claimerId });
        if (!staff) {
          staff = new staffPoints({ staffId: claimerId, points: 1 });
        } else {
          staff.points += 1;
        }
        await staff.save();
        console.log(`[DEBUG] Staff points updated for ${claimerId}.`);
      }

      // Step 8: Delete Ticket Entry
      await channelData.deleteOne({ channelId: channel.id });
      console.log(`[DEBUG] Channel entry deleted from DB.`);

      // Step 9: Delete Channel
      await channel.delete();
      console.log(`[DEBUG] Channel deleted.`);

      // Acknowledge the command
      await interaction.editReply({
        content: `✅ Ticket closed successfully! [View Transcript](${transcriptUrl})`,
      });
    } catch (err) {
      console.error(`[ERROR] Something went wrong:`, err);
      await interaction.editReply({
        content: "❌ Something went wrong while closing the ticket.",
      });
    }
  },
};

async function fetchMessages(channel) {
  let messages = [];
  let lastId = null;

  console.log(`[DEBUG] Fetching messages from ${channel.name}`);

  while (true) {
    const fetched = await channel.messages
      .fetch({ limit: 100, before: lastId })
      .catch((err) => {
        console.error(`[ERROR] Message fetch error:`, err);
        return new Map();
      });

    if (!fetched.size) break;

    messages.push(...fetched.values());
    lastId = fetched.last().id;

    if (messages.length >= 1000) {
      console.log(`[DEBUG] Fetch capped at 1000 messages.`);
      break;
    }
  }

  console.log(`[DEBUG] Done fetching messages.`);
  return messages;
}
