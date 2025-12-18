const {
  EmbedBuilder,
  ActionRowBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  AttachmentBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require("discord.js");
const { v4: uuidv4 } = require("uuid");
const ticketSetup = require("../../schema/ticketSchema");
const channelData = require("../../schema/ticketDetail");
const staffPoints = require("../../schema/staffPoints");
const Transcript = require("../../schema/transcriptSchema");

module.exports = async (interaction, client) => {
  try {
    // BUTTON INTERACTION HANDLER
    if (interaction.isButton() && interaction.customId === "close_button") {
      // Build modal FIRST before any async operations
      const modal = new ModalBuilder()
        .setCustomId("close_ticket_modal")
        .setTitle("Close Ticket");

      const reasonInput = new TextInputBuilder()
        .setCustomId("close_reason")
        .setLabel("Reason for closing the ticket")
        .setStyle(TextInputStyle.Paragraph)
        .setRequired(true);

      const actionRow = new ActionRowBuilder().addComponents(reasonInput);
      modal.addComponents(actionRow);

      // Show modal immediately - we'll do validation in the modal submit handler
      try {
        await interaction.showModal(modal);
      } catch (error) {
        console.error("Error showing modal:", error);
        // If modal fails, try to send an ephemeral message instead
        if (!interaction.replied && !interaction.deferred) {
          try {
            await interaction.reply({
              content: "❌ This interaction has expired. Please try clicking the close button again.",
              flags: 1 << 6
            });
          } catch (replyError) {
            console.error("Could not send error message:", replyError);
          }
        }
      }
      return; // Important: return here to prevent further processing
    }

    // MODAL SUBMIT HANDLER
    if (
      interaction.isModalSubmit() &&
      interaction.customId === "close_ticket_modal"
    ) {
      // Defer immediately to prevent timeout
      try {
        await interaction.deferReply({ flags: 1 << 6 });
      } catch (error) {
        console.error("Error deferring modal submit:", error);
        return;
      }

      const channel = interaction.channel;
      const guild = interaction.guild;
      const guildId = guild.id;

      const entry = await ticketSetup.findOne({ guildId });
      const channelEntry = await channelData.findOne({ channelId: channel.id });
      
      if (!entry || !channelEntry) {
        return interaction.editReply({
          content: "This is not a valid ticket channel.",
        });
      }

      const staffPLogChannel = entry.pointsLog;
      const channelPLog = guild.channels.cache.get(staffPLogChannel);
      const staffRoleId = entry.staffRole;
      
      console.log(`[DEBUG BUTTON] Points log channel ID from DB: ${staffPLogChannel}`);
      
      // Check permissions
      if (!interaction.member.roles.cache.has(staffRoleId)) {
        return interaction.editReply({
          content: "❌ You do not have permission to close tickets.",
        });
      }

      const reason = interaction.fields.getTextInputValue("close_reason");

      // Send initial message about transcript generation
      await interaction.editReply({
        content: "📄 Transcript is generating...",
      });

      try {
        // Fetch all messages from the channel
        const allMessages = await fetchAllMessages(channel);

        // Process messages for database storage
        const processedMessages = allMessages.map((m) => ({
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
        if (channelEntry.claimedBy) {
          try {
            claimedByMember = await guild.members.fetch(channelEntry.claimedBy);
          } catch (e) {
            console.log("Failed to fetch claimed member");
          }
        }

        // Get all staff involved
        const staffIds = new Set();
        if (channelEntry.claimedBy) staffIds.add(channelEntry.claimedBy);
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

        // Generate shareable link
        const baseUrl = process.env.WEBSITE_URL || "http://localhost:3000";
        const transcriptUrl = `${baseUrl}/transcript/${transcriptId}`;

        // Send transcript to log channel
        const logChannelId = entry.transcriptChannelId;
        const logsChannel = client.channels.cache.get(logChannelId);

        if (logsChannel) {
          const closeEmbed = new EmbedBuilder()
            .setTitle("🎫 Ticket Closed")
            .setColor(0x9b7dfb)
            .addFields(
              { name: "Ticket Name:", value: channel.name, inline: true },
              { name: "Ticket Type:", value: channel.parent?.name || "Unknown", inline: true },
              { name: "Ticket Closer:", value: interaction.user.username, inline: true },
              { name: "Closing Reason:", value: reason, inline: false },
              { name: "Messages:", value: `${processedMessages.length}`, inline: true },
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
        }

        // Send transcript to opener via DM
        const openerId = channelEntry.userId;
        const opener = await guild.members.fetch(openerId).catch(() => null);
        if (opener && opener.user) {
          const dmEmbed = new EmbedBuilder()
            .setTitle("🎫 Your Ticket Has Been Closed")
            .setColor(0x9b7dfb)
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
      } catch (transcriptError) {
        console.error("Error generating transcript:", transcriptError);
        await interaction.followUp({
          content: "⚠️ Transcript generation failed, but ticket is being closed.",
          flags: 1 << 6,
        });
      }

      // Send feedback request to ticket opener via DM
      const openerId = channelEntry.userId;
      const opener = await guild.members.fetch(openerId).catch(() => null);
      
      if (opener && opener.user) {
        // Get all staff members who handled the ticket
        let staffMentions = [];
        const allStaffIds = new Set();
        
        // Add claimer if exists
        if (channelEntry.claimer) {
          allStaffIds.add(channelEntry.claimer);
        }
        
        // Add all staff members from the staffMembers array
        if (channelEntry.staffMembers && channelEntry.staffMembers.length > 0) {
          channelEntry.staffMembers.forEach(staffId => allStaffIds.add(staffId));
        }
        
        // Convert to mentions
        allStaffIds.forEach(staffId => {
          staffMentions.push(`<@${staffId}>`);
        });
        
        // Create staff mention string
        const staffMentionString = staffMentions.length > 0 
          ? staffMentions.join(' and ') 
          : 'the staff member';

        const feedbackEmbed = new EmbedBuilder()
          .setTitle("⭐ How do you rate our help?")
          .setDescription(
            `Dear <@${openerId}>,\n\n` +
            `recently you were contacting Staff by creating a ticket with ID **${channel.name}** on **${guild.name}**.\n\n` +
            `How would you rate the help of ${staffMentionString}?\n\n` +
            `You have **24 hours** to give a review.\n\n` +
            `Thank you for contacting us!`
          )
          .setColor(0x2c2f33)
          .setThumbnail("https://cdn.discordapp.com/attachments/1234567890123456789/1234567890123456789/feedback_avatar.png")
          .setFooter({ text: "Your feedback helps us improve our service!" })
          .setTimestamp();

        const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
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
      // Staff Points Logic
      const staffId = channelEntry.claimer;

      if (staffId) {
        let staff = await staffPoints.findOne({ staffId });

        if (!staff) {
          staff = new staffPoints({
            staffId,
            points: 1,
          });
        } else {
          staff.points += 1;
        }

        await staff.save();

        const staffPEmbed = new EmbedBuilder()
          .setDescription(`<@${staffId}> - +1`)
          .setColor("Random");

        if (channelPLog) {
          console.log(`[DEBUG BUTTON] Sending points log to channel: ${channelPLog.name} (${channelPLog.id})`);
          await channelPLog.send({ embeds: [staffPEmbed] }).then(() => {
            console.log(`✅ Points log sent successfully for staff ${staffId}`);
          }).catch((error) => {
            console.error("❌ Failed to send to points log:", error);
          });
        } else if (staffPLogChannel) {
          console.log("❌ Staff points log channel not found. Channel ID:", staffPLogChannel);
        } else {
          console.log("⚠️ No points log channel configured in database");
        }
      }

      // Delete channel entry before deleting the channel
      await channelEntry.deleteOne();

      // Finally, delete the ticket channel
      await channel.delete(
        `Ticket closed by ${interaction.user.tag} | Reason: ${reason}`
      );
    }
  } catch (error) {
    console.error("❗ Error in ticket close flow:", error);

    if (interaction.replied || interaction.deferred) {
      interaction.followUp({
        content: "❌ Something went wrong while closing the ticket.",
        flags: 1 << 6,
      });
    } else {
      interaction.reply({
        content: "❌ Something went wrong while closing the ticket.",
        flags: 1 << 6,
      });
    }
  }
};

async function fetchAllMessages(channel) {
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

  return messages.reverse(); // Return in chronological order
}
