const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const ticketSetup = require("../schema/ticketSchema");
const channelData = require("../schema/ticketDetail");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("tickets")
    .setDescription("Shows all open tickets with their categories and handlers"),

  run: async ({ interaction }) => {
    try {
      const guild = interaction.guild;
      const guildId = guild.id;

      // Check if ticket system is set up
      const entry = await ticketSetup.findOne({ guildId });
      if (!entry) {
        return interaction.reply({
          content: "❌ Ticket system not found. Please run `/ticketsetup` first to configure the bot.",
          flags: 1 << 6,
        });
      }

      // Check permissions
      const member = await guild.members.fetch(interaction.user.id);
      const staffRoleId = entry.staffRole;
      const highStaffRoleId = entry.highStaffRole;

      if (!member.roles.cache.has(staffRoleId) && !member.roles.cache.has(highStaffRoleId)) {
        return interaction.reply({
          content: "❌ You don't have permission to view tickets. You need the Staff or High Staff role.",
          flags: 1 << 6,
        });
      }

      // Fetch all open tickets
      const openTickets = await channelData.find({});
      
      // Clean up invalid tickets (deleted channels)
      const validTickets = [];
      const invalidTicketIds = [];
      
      for (const ticket of openTickets) {
        try {
          const channel = await guild.channels.fetch(ticket.channelId).catch(() => null);
          if (channel) {
            validTickets.push(ticket);
          } else {
            invalidTicketIds.push(ticket._id);
          }
        } catch (error) {
          console.error(`Error checking ticket ${ticket.channelId}:`, error);
          invalidTicketIds.push(ticket._id);
        }
      }
      
      // Remove invalid tickets from database
      if (invalidTicketIds.length > 0) {
        await channelData.deleteMany({ _id: { $in: invalidTicketIds } });
        console.log(`Cleaned up ${invalidTicketIds.length} invalid ticket entries`);
      }
      
      if (validTickets.length === 0) {
        const noTicketsEmbed = new EmbedBuilder()
          .setTitle("Open Tickets")
          .setDescription("No open tickets found.")
          .setColor(0x4ffb3c)
          .setFooter({ text: "FxG Ticket System" });

        return interaction.reply({
          embeds: [noTicketsEmbed],
          flags: 1 << 6,
        });
      }

      // Create embed for tickets
      const ticketsEmbed = new EmbedBuilder()
        .setTitle("Open Tickets")
        .setDescription(`${validTickets.length} open ticket(s)`)
        .setColor(0x4ffb3c)
        .setFooter({ text: "FxG Ticket System" })
        .setTimestamp();

      // Process each valid ticket
      for (const ticket of validTickets) {
        try {
          const channel = await guild.channels.fetch(ticket.channelId).catch(() => null);
          if (!channel) {
            // Channel was deleted, skip this ticket
            continue;
          }

          // Determine category based on parent channel
          let category = "Unknown";
          if (channel.parentId === entry.giveawayClaimC) {
            category = "Giveaway Claim";
          } else if (channel.parentId === entry.punishmentAppealC) {
            category = "Punishment Appeal";
          } else if (channel.parentId === entry.otherC) {
            category = "Other";
          } else if (channel.parentId === entry.roleClaimC) {
            category = "Role Claim";
          }

          // Get handler information
          let handlerInfo = "Unclaimed";
          if (ticket.claimer) {
            try {
              const handler = await guild.members.fetch(ticket.claimer);
              handlerInfo = `${handler.user.username}`;
            } catch (error) {
              handlerInfo = "Unknown Staff";
            }
          }

          // Get ticket opener information
          let openerInfo = "Unknown";
          if (ticket.userId) {
            try {
              const opener = await guild.members.fetch(ticket.userId);
              openerInfo = opener.user.username;
            } catch (error) {
              openerInfo = "Unknown User";
            }
          }

          // Add field for this ticket
          ticketsEmbed.addFields({
            name: `${channel.name}`,
            value: `Category: ${category}\nOpened by: ${openerInfo}\nHandled by: ${handlerInfo}`,
            inline: true
          });

        } catch (error) {
          console.error(`Error processing ticket ${ticket.channelId}:`, error);
          // Skip tickets with errors instead of adding error fields
          continue;
        }
      }

      // Check if we have any valid tickets to display
      if (ticketsEmbed.data.fields && ticketsEmbed.data.fields.length === 0) {
        const noValidTicketsEmbed = new EmbedBuilder()
          .setTitle("Open Tickets")
          .setDescription("No valid open tickets found (all tickets may have been deleted).")
          .setColor(0x4ffb3c)
          .setFooter({ text: "FxG Ticket System" });

        return interaction.reply({ embeds: [noValidTicketsEmbed], flags: 1 << 6 });
      }

      // Split into multiple embeds if too many tickets (Discord limit is 25 fields)
      if (ticketsEmbed.data.fields && ticketsEmbed.data.fields.length > 25) {
        const chunks = [];
        for (let i = 0; i < ticketsEmbed.data.fields.length; i += 25) {
          chunks.push(ticketsEmbed.data.fields.slice(i, i + 25));
        }

        for (let i = 0; i < chunks.length; i++) {
          const chunkEmbed = new EmbedBuilder()
            .setTitle(`Open Tickets (Page ${i + 1}/${chunks.length})`)
            .setDescription(`${ticketsEmbed.data.fields.length} open ticket(s)`)
            .setColor(0x4ffb3c)
            .setFooter({ text: "FxG Ticket System" })
            .setTimestamp()
            .addFields(chunks[i]);

          if (i === 0) {
            await interaction.reply({ embeds: [chunkEmbed], flags: 1 << 6 });
          } else {
            await interaction.followUp({ embeds: [chunkEmbed], flags: 1 << 6 });
          }
        }
      } else {
        await interaction.reply({ embeds: [ticketsEmbed], flags: 1 << 6 });
      }

    } catch (error) {
      console.error("Error in tickets command:", error);
      
      // Check if interaction is still valid
      if (interaction.deferred || interaction.replied) {
        try {
          await interaction.editReply({
            content: "❌ An error occurred while fetching tickets.",
          });
        } catch (editError) {
          console.error("Failed to edit reply:", editError);
        }
      } else {
        try {
          await interaction.reply({
            content: "❌ An error occurred while fetching tickets.",
            flags: 1 << 6,
          });
        } catch (replyError) {
          console.error("Failed to send error reply:", replyError);
        }
      }
    }
  },
};

