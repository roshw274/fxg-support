const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const channelData = require("../schema/ticketDetail");

module.exports = {
  data: {
    name: "feedback",
    description: "Send a feedback request with star rating",
  },
  run: async ({ interaction, client }) => {
    const channel = interaction.channel;
    const guild = interaction.guild;

    // Check if this is a DM channel
    if (channel.type === 1) { // DM channel
      return interaction.reply({
        content: "❌ This command cannot be used in DMs. Please use this command in a ticket channel where you received support, or wait for the automatic feedback request when your ticket is closed.",
        ephemeral: true
      });
    }

    // Get ticket information
    const ticketEntry = await channelData.findOne({ channelId: channel.id });
    if (!ticketEntry) {
      return interaction.reply({
        content: "❌ This command can only be used in ticket channels. Please use this command in a ticket channel where you received support.",
        ephemeral: true
      });
    }

    // Get all staff members who handled the ticket
    let staffMentions = [];
    const allStaffIds = new Set();
    
    // Add claimer if exists
    if (ticketEntry.claimer) {
      allStaffIds.add(ticketEntry.claimer);
    }
    
    // Add all staff members from the staffMembers array
    if (ticketEntry.staffMembers && ticketEntry.staffMembers.length > 0) {
      ticketEntry.staffMembers.forEach(staffId => allStaffIds.add(staffId));
    }
    
    // Convert to mentions
    allStaffIds.forEach(staffId => {
      staffMentions.push(`<@${staffId}>`);
    });
    
    // Create staff mention string
    const staffMentionString = staffMentions.length > 0 
      ? staffMentions.join(' and ') 
      : 'the staff member';

    // Create clean feedback embed
    const feedbackEmbed = new EmbedBuilder()
      .setTitle("Rate Your Support Experience")
      .setDescription(
        `Thank you for contacting support!\n\n` +
        `Please rate the help you received in ticket **${channel.name}**.`
      )
      .setColor(0x5865f2);

    // Create star rating buttons
    const row = new ActionRowBuilder()
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
      await interaction.reply({
        embeds: [feedbackEmbed],
        components: [row],
        ephemeral: false
      });
    } catch (error) {
      console.error("Error sending feedback embed:", error);
      await interaction.reply({
        content: "❌ Failed to send feedback request.",
        ephemeral: true
      });
    }
  },
};
