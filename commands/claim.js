const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");
const ticketSetup = require("../schema/ticketSchema");
const channelData = require("../schema/ticketDetail");
const { claimedChannels } = require("../claimedChannels");
const { emitKeypressEvents } = require("node:readline");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("claim")
    .setDescription("Claim the ticket you are in."),

  run: async ({ interaction }) => {
    try {
      // Validate guild exists
      if (!interaction.guild) {
        return interaction.reply({
          content: "❌ This command can only be used in a server.",
          flags: 1 << 6,
        });
      }

      const channel = interaction.channel;
      const channelId = channel.id;
      const channelEntry = await channelData.findOne({ channelId });

      if (!channelEntry) {
        return interaction.reply({
          content: "❌ This is not a valid ticket channel.",
          flags: 1 << 6,
        });
      }

      let openerId = channelEntry.userId;
      let opener;

      try {
        opener = await interaction.guild.members.fetch(openerId);
      } catch (error) {
        console.error("❌ Unable to fetch the user:", error);
        await interaction.reply({
          content:
            "❌ Failed to find the ticket opener. Please contact Bot DEV.",
          flags: 1 << 6,
        });
        return;
      }

      const member = await interaction.guild.members.fetch(interaction.user.id);
      const guildId = interaction.guild.id;
      const entry = await ticketSetup.findOne({ guildId });
      
      if (!entry) {
        return interaction.reply({
          content: "❌ Ticket system not configured. Please contact an administrator.",
          flags: 1 << 6,
        });
      }
      
      const staffRoleId = entry.staffRole;

      if (
        interaction.commandName === "claim" &&
        member.roles.cache.has(staffRoleId)
      ) {
        if (channelEntry.claimer) {
          await interaction.reply({
            content: "This Ticket Has Already been Claimed!",
            flags: 1 << 6,
          });
          return;
        }

        if (claimedChannels.has(channel.id)) {
          await interaction.reply({
            content: "‼ This channel is already claimed by a staff member.",
            flags: 1 << 6,
          });
          return;
        }

        let claimer = interaction.user.id;
        try {
          if (interaction.channel.parentId === entry.punishmentAppealC) {
            await channel.permissionOverwrites.set([
              {
                id: interaction.guild.roles.everyone,
                deny: [PermissionFlagsBits.ViewChannel],
              },
              {
                id: opener.id,
                allow: [
                  PermissionFlagsBits.ViewChannel,
                  PermissionFlagsBits.SendMessages,
                  PermissionFlagsBits.ReadMessageHistory,
                ],
              },
              {
                id: interaction.user.id,
                allow: [
                  PermissionFlagsBits.ViewChannel,
                  PermissionFlagsBits.SendMessages,
                  PermissionFlagsBits.ReadMessageHistory,
                ],
              },
            ]);
          } else {
            await channel.permissionOverwrites.set([
              {
                id: interaction.guild.roles.everyone,
                deny: [PermissionFlagsBits.ViewChannel],
              },
              {
                id: opener.id,
                allow: [
                  PermissionFlagsBits.ViewChannel,
                  PermissionFlagsBits.SendMessages,
                  PermissionFlagsBits.ReadMessageHistory,
                ],
              },
              {
                id: entry.staffRole,
                allow: [
                  PermissionFlagsBits.ViewChannel,
                  PermissionFlagsBits.ReadMessageHistory,
                ],
                deny: [
                  PermissionFlagsBits.SendMessages,
                ]
              },
              {
                id: interaction.user.id,
                allow: [
                  PermissionFlagsBits.ViewChannel,
                  PermissionFlagsBits.SendMessages,
                  PermissionFlagsBits.ReadMessageHistory,
                ],
              },
            ]);
          }

          channelEntry.claimer = claimer;
          
          // Add claimer to staff members list
          if (!channelEntry.staffMembers) {
            channelEntry.staffMembers = [];
          }
          if (!channelEntry.staffMembers.includes(claimer)) {
            channelEntry.staffMembers.push(claimer);
          }
          
          await channelEntry.save();
          claimedChannels.add(channel.id);

          await interaction.reply({
            content: `✅ You Have successfully claimed this ticket!`,
            flags: 1 << 6,
          });

          await channel.send({
            content: `🎟️ <@${interaction.user.id}> has claimed this ticket! They will assist you ahead.`,
          });
        } catch (error) {
          console.error("❌ Permission overwrite failed:", error);
          
          // Check if we already replied
          if (interaction.replied || interaction.deferred) {
            return interaction.editReply({
              content: "❌ Failed to claim the ticket. Please contact Bot DEV.",
            });
          } else {
            return interaction.reply({
              content: "❌ Failed to claim the ticket. Please contact Bot DEV.",
              flags: 1 << 6,
            });
          }
        }
      } else {
        return interaction.reply({
          content: "❌ You don't have permission to claim tickets.",
          flags: 1 << 6,
        });
      }
    } catch (error) {
      console.error("❌ Unexpected error in claim command:", error);
      
      // Better error handling for reply/editReply
      try {
        if (interaction.replied || interaction.deferred) {
          await interaction.editReply({
            content: "❌ An unexpected error occurred. Please contact Bot DEV.",
          });
        } else {
          await interaction.reply({
            content: "❌ An unexpected error occurred. Please contact Bot DEV.",
            flags: 1 << 6,
          });
        }
      } catch (replyError) {
        console.error("❌ Failed to send error message:", replyError);
      }
    }
  },
};
