const {
  ButtonBuilder,
  ButtonStyle,
  ActionRowBuilder,
  ModalBuilder,
  EmbedBuilder,
  TextInputBuilder,
  TextInputStyle,
  PermissionsBitField,
  ChannelType,
} = require("discord.js");
require("dotenv").config();
const ticketSetup = require("../../schema/ticketSchema");
const channelData = require("../../schema/ticketDetail");
const EMOJI = require("../../emoji");

module.exports = async (interaction) => {
  try {
    // SELECT MENU INTERACTION
    if (
      interaction.isStringSelectMenu() &&
      interaction.customId === "ticket_select_menu"
    ) {
      const selected = interaction.values[0];

      if (selected === "role_claim") {
        const modal = new ModalBuilder()
          .setCustomId("role_claim_modal")
          .setTitle("Role Claim Ticket");

        const ign = new TextInputBuilder()
          .setCustomId("ign")
          .setLabel("What's your in-game name?")
          .setStyle(TextInputStyle.Short)
          .setRequired(true);

        const firstActionRow = new ActionRowBuilder().addComponents(ign);

        modal.addComponents(firstActionRow);

        await interaction.showModal(modal);
        return;
      }
    }

    // BUTTON INTERACTION
    if (
      interaction.isButton() &&
      interaction.customId === "role_claim_button"
    ) {
      const modal = new ModalBuilder()
        .setCustomId("role_claim_modal")
        .setTitle("Role Claim Ticket");

      const ign = new TextInputBuilder()
        .setCustomId("ign")
        .setLabel("What's your in-game name?")
        .setStyle(TextInputStyle.Short)
        .setRequired(true);

      const firstActionRow = new ActionRowBuilder().addComponents(ign);

      modal.addComponents(firstActionRow);

      await interaction.showModal(modal);
      return;
    }

    // MODAL SUBMIT INTERACTION
    if (
      interaction.isModalSubmit() &&
      interaction.customId === "role_claim_modal"
    ) {
      await interaction.deferReply({ flags: 1 << 6 }); // Prevent interaction timeout

      const guildId = interaction.guild.id;
      const entry = await ticketSetup.findOne({ guildId });

      if (!entry) {
        return interaction.editReply({
          content: "❌ Ticket setup not found. Please contact an administrator.",
        });
      }

      const staffRoleId = entry.staffRole;

      const ign = interaction.fields.getTextInputValue("ign");

      const roleClaimDetails = new EmbedBuilder()
        .setTitle(`${EMOJI.crown} Role Claim`)
        .setDescription("Response Provided By Ticket Opener")
        .setColor(0x5865f2)
        .addFields(
          { name: "Your IGN (In Game Name):", value: ign, inline: false }
        );

      try {
        const sanitizedUsername = interaction.user.username
          .replace(/[^a-zA-Z0-9]/g, "")
          .toLowerCase();

        const channel = await interaction.guild.channels.create({
          name: `roleclaim-${sanitizedUsername}`,
          type: ChannelType.GuildText,
          permissionOverwrites: [
            {
              id: interaction.guild.id,
              deny: [PermissionsBitField.Flags.ViewChannel],
            },
            {
              id: interaction.user.id,
              allow: [
                PermissionsBitField.Flags.ViewChannel,
                PermissionsBitField.Flags.SendMessages,
                PermissionsBitField.Flags.ReadMessageHistory,
              ],
            },
            {
              id: staffRoleId,
              allow: [
                PermissionsBitField.Flags.ViewChannel,
                PermissionsBitField.Flags.SendMessages,
                PermissionsBitField.Flags.ReadMessageHistory,
              ],
            },
          ],
        });

        const close = new ButtonBuilder()
          .setCustomId("close_button")
          .setLabel("Close")
          .setStyle(ButtonStyle.Danger);
        const claim = new ButtonBuilder()
          .setCustomId("claim_button")
          .setLabel("Claim")
          .setStyle(ButtonStyle.Primary);
        const ccButton = new ActionRowBuilder().addComponents(close, claim);

        await channel.setParent(entry.roleClaimC, {
          lockPermissions: false,
        });

        const newChannelData = new channelData({
          channelId: channel.id,
          userId: interaction.user.id,
        });
        await newChannelData.save();

        await channel.send({
          content: `Dear <@${interaction.user.id}> please be patient, the <@&${staffRoleId}> will arrive here shortly.`,
        });

        await channel.send({
          embeds: [roleClaimDetails],
          components: [ccButton],
        });

        await interaction.editReply({
          content: `✅ Your role claim ticket has been created: ${channel}`,
        });
      } catch (error) {
        console.error("Error creating role claim ticket:", error);
        await interaction.editReply({
          content: "❌ Failed to create ticket. Please try again or contact an administrator.",
        });
      }
    }
  } catch (error) {
    console.error("Error in role claim handler:", error);
    try {
      if (interaction.deferred || interaction.replied) {
        await interaction.editReply({
          content: "❌ An error occurred while processing your request.",
        });
      } else {
        await interaction.reply({
          content: "❌ An error occurred while processing your request.",
          flags: 1 << 6,
        });
      }
    } catch (replyError) {
      console.error("Error sending error reply:", replyError);
    }
  }
};
