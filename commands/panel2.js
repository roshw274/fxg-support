const ticketSetup = require("../schema/ticketSchema");
const {
  SlashCommandBuilder,
  EmbedBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  ActionRowBuilder,
} = require("discord.js");
const EMOJI = require("../emoji");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("panel2")
    .setDescription("Form's A Ticket Panel In Current Channel."),

  run: async ({ interaction }) => {
    try {
      const guildId = interaction.guild.id;
      const entry = await ticketSetup.findOne({ guildId });

      if (!entry) {
        return interaction.reply({
          content: "❌ Ticket setup not found. Please run `/ticketsetup id` first to configure the bot.",
          flags: 1 << 6,
        });
      }

      let highStaffRoleId = entry.highStaffRole;
      const member = await interaction.guild.members.fetch(interaction.user.id);

      if (interaction.isChatInputCommand()) {
        if (
          interaction.commandName === "panel2" &&
          member.roles.cache.has(highStaffRoleId)
        ) {
          await interaction.reply({
            content: "⏳ Loading Panel...",
            flags: 1 << 6,
          });

          const panelEmbed = new EmbedBuilder()
            .setTitle(`${EMOJI.pin} Ticket Options`)
            .setDescription("Options For Opening Ticket")
            .addFields(
              {
                name: `${EMOJI.pin} Choose Ticket Type:`,
                value: "Choose Ticket Type As Per Your Requirements",
              },
              {
                name: "\u200B",
                value: "\u200B",
              },
              {
                name: `1. ${EMOJI.party_popper} Giveaway Claim:`,
                value: "Select This If You Want To Claim A Giveaway You Won in FxG",
              },
              {
                name: `2. ${EMOJI.timeout} Punishment Appeal:`,
                value: "Select This If You Want To Appeal For A Punishment You Got In FxG",
              },
              {
                name: `3. ${EMOJI.loading} Other:`,
                value: "Select This If You Want To Open Ticket For Other Issues.",
              },
              {
                name: `4. ${EMOJI.crown} Role Claim:`,
                value: "Select This If You Want To Claim A Role In FxG.",
              }
            )
            .setThumbnail(
              "https://cdn.discordapp.com/icons/1246452712653062175/a_31b8d1bbd6633b72eff08a3a35f3bb0b.gif"
            )
            .setColor(0x000000)
            .setFooter({ text: "FxG Ticket System", iconURL: "https://cdn.discordapp.com/emojis/1385107904813858947.png" });

          const ticketSelectMenu = new StringSelectMenuBuilder()
            .setCustomId("ticket_select_menu")
            .setPlaceholder("Select Ticket Type")
            .addOptions(
              new StringSelectMenuOptionBuilder()
                .setLabel("Giveaway Claim")
                .setDescription("Select this if you won a giveaway in FxG.")
                .setValue("giveaway_claim"),
              new StringSelectMenuOptionBuilder()
                .setLabel("Punishment Appeal")
                .setDescription("Select this if you want to appeal a punishment.")
                .setValue("punish_appeal"),
              new StringSelectMenuOptionBuilder()
                .setLabel("Other")
                .setDescription("Select this if your issue is not listed above.")
                .setValue("other_ticket"),
              new StringSelectMenuOptionBuilder()
                .setLabel("Role Claim")
                .setDescription("Select this if you want to claim a role in FxG.")
                .setValue("role_claim")
            );

          const row = new ActionRowBuilder().addComponents(ticketSelectMenu);

          await interaction.channel.send({
            embeds: [panelEmbed],
            components: [row],
          });
        } else {
          return interaction.reply({
            content: "❌ You don't have permission to use this command. You need the High Staff role.",
            flags: 1 << 6,
          });
        }
      }
    } catch (error) {
      console.error("Error in panel2 command:", error);
      return interaction.reply({
        content: "❌ An error occurred while creating the panel.",
        flags: 1 << 6,
      });
    }
  },
};
