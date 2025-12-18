const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const feedbackSchema = require("../schema/feedbackSchema");
const ticketSetup = require("../schema/ticketSchema");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("feedbackstats")
    .setDescription("View feedback statistics for staff members")
    .addUserOption(option =>
      option.setName("staff")
        .setDescription("Staff member to view feedback for (optional)")
        .setRequired(false)
    ),

  run: async ({ interaction }) => {
    try {
      const guild = interaction.guild;
      const guildId = guild.id;
      const targetStaff = interaction.options.getUser("staff");

      // Check if ticket system is set up
      const entry = await ticketSetup.findOne({ guildId });
      if (!entry) {
        return interaction.reply({
          content: "❌ Ticket system not found. Please run `/ticketsetup` first to configure the bot.",
          ephemeral: true,
        });
      }

      // Check permissions
      const member = await guild.members.fetch(interaction.user.id);
      const staffRoleId = entry.staffRole;
      const highStaffRoleId = entry.highStaffRole;

      if (!member.roles.cache.has(staffRoleId) && !member.roles.cache.has(highStaffRoleId)) {
        return interaction.reply({
          content: "❌ You don't have permission to view feedback statistics. You need the Staff or High Staff role.",
          ephemeral: true,
        });
      }

      let query = { guildId };
      if (targetStaff) {
        query.staffId = targetStaff.id;
      }

      // Get all feedback for the guild (or specific staff member)
      const allFeedback = await feedbackSchema.find(query);
      
      if (allFeedback.length === 0) {
        const noFeedbackEmbed = new EmbedBuilder()
          .setTitle("📊 Feedback Statistics")
          .setDescription(targetStaff ? `No feedback found for ${targetStaff.tag}` : "No feedback found for this server.")
          .setColor(0x5865f2)
          .setFooter({ text: "FxG Feedback System" });

        return interaction.reply({
          embeds: [noFeedbackEmbed],
          ephemeral: true,
        });
      }

      // Calculate statistics
      const totalFeedback = allFeedback.length;
      const averageRating = (allFeedback.reduce((sum, feedback) => sum + feedback.rating, 0) / totalFeedback).toFixed(2);
      
      // Count ratings
      const ratingCounts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
      allFeedback.forEach(feedback => {
        ratingCounts[feedback.rating]++;
      });

      // Get recent feedback (last 10)
      const recentFeedback = allFeedback
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .slice(0, 10);

      // Create statistics embed
      const statsEmbed = new EmbedBuilder()
        .setTitle("Feedback Statistics")
        .setDescription(targetStaff ? `Statistics for ${targetStaff.tag}` : "Overall server statistics")
        .setColor(0x5865f2)
        .addFields(
          { name: "Total Feedback", value: `${totalFeedback}`, inline: true },
          { name: "Average Rating", value: `${averageRating}/5`, inline: true },
          { name: "\u200B", value: "\u200B", inline: true },
          { name: "Rating Distribution", value: 
            `⭐ (1): ${ratingCounts[1]}\n` +
            `⭐⭐ (2): ${ratingCounts[2]}\n` +
            `⭐⭐⭐ (3): ${ratingCounts[3]}\n` +
            `⭐⭐⭐⭐ (4): ${ratingCounts[4]}\n` +
            `⭐⭐⭐⭐⭐ (5): ${ratingCounts[5]}`, 
            inline: false
          }
        );

      // Add recent feedback if there are any
      if (recentFeedback.length > 0) {
        const recentFeedbackText = recentFeedback.map((feedback, index) => {
          const ratingStars = "⭐".repeat(feedback.rating);
          const feedbackPreview = feedback.feedback.length > 50 
            ? feedback.feedback.substring(0, 50) + "..." 
            : feedback.feedback;
          const userInfo = feedback.userTag || `User ID: ${feedback.userId}`;
          const date = new Date(feedback.createdAt).toLocaleDateString();
          return `**${index + 1}.** ${ratingStars} - **By:** ${userInfo} (${date})\n${feedbackPreview}`;
        }).join("\n\n");

        statsEmbed.addFields({
          name: "Recent Feedback",
          value: recentFeedbackText.length > 1000 
            ? recentFeedbackText.substring(0, 1000) + "..." 
            : recentFeedbackText,
          inline: false
        });
      }

      await interaction.reply({
        embeds: [statsEmbed],
        ephemeral: true,
      });

    } catch (error) {
      console.error("Error in feedbackstats command:", error);
      
      if (interaction.deferred || interaction.replied) {
        try {
          await interaction.editReply({
            content: "❌ An error occurred while fetching feedback statistics.",
          });
        } catch (editError) {
          console.error("Failed to edit reply:", editError);
        }
      } else {
        try {
          await interaction.reply({
            content: "❌ An error occurred while fetching feedback statistics.",
            ephemeral: true,
          });
        } catch (replyError) {
          console.error("Failed to send error reply:", replyError);
        }
      }
    }
  },
};
