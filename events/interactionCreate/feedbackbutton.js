const { EmbedBuilder, ChannelType, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = require("discord.js");
const channelData = require("../../schema/ticketDetail");

module.exports = async (interaction, client) => {
  try {
    // Handle feedback button interactions
    if (interaction.isButton() && interaction.customId.startsWith("feedback_")) {
      try {
        const rating = parseInt(interaction.customId.split("_")[1]);
        
        // Validate rating
        if (isNaN(rating) || rating < 1 || rating > 5) {
          console.error(`Invalid rating value: ${rating}`);
          return interaction.reply({
            content: "❌ Invalid rating value. Please try again.",
            flags: 1 << 6
          }).catch(err => console.error("Error sending invalid rating message:", err));
        }

        const user = interaction.user;
        const channel = interaction.channel;
        const guild = interaction.guild;
        
        // Validate user and channel exist
        if (!user || !channel) {
          console.error("User or channel not found in feedback button interaction");
          return interaction.reply({
            content: "❌ Unable to process feedback. Please try again.",
            flags: 1 << 6
          }).catch(err => console.error("Error sending validation message:", err));
        }

        // Check if this is a DM channel - if so, we need to find the ticket by user ID
        let ticketEntry;
        try {
          if (channel.type === 1) { // DM channel
            ticketEntry = await channelData.findOne({ userId: user.id });
            if (!ticketEntry) {
              return interaction.reply({
                content: "❌ No recent ticket found for feedback. Please contact support if you believe this is an error.",
                flags: 1 << 6
              }).catch(err => console.error("Error sending no ticket message:", err));
            }
          } else {
            // Regular channel - find by channel ID
            ticketEntry = await channelData.findOne({ channelId: channel.id });
            if (!ticketEntry) {
              return interaction.reply({
                content: "❌ This feedback can only be used in ticket channels. Please use this in a ticket channel where you received support.",
                flags: 1 << 6
              }).catch(err => console.error("Error sending invalid channel message:", err));
            }
          }
        } catch (dbError) {
          console.error("Database error while fetching ticket entry:", dbError);
          return interaction.reply({
            content: "❌ Database error. Please try again later.",
            flags: 1 << 6
          }).catch(err => console.error("Error sending database error message:", err));
        }

        // Rating descriptions
        const ratingDescriptions = {
          1: "Poor",
          2: "Fair", 
          3: "Good",
          4: "Very Good",
          5: "Excellent"
        };

        // Create modal for detailed feedback
        const modal = new ModalBuilder()
          .setCustomId(`feedback_modal_${rating}`)
          .setTitle(`Rate Your Experience - ${ratingDescriptions[rating]}`);

        // Add text input for detailed feedback
        const feedbackInput = new TextInputBuilder()
          .setCustomId("feedback_text")
          .setLabel("Detailed feedback about your experience")
          .setStyle(TextInputStyle.Paragraph)
          .setPlaceholder("Tell us about your experience with the staff member. What went well? What could be improved?")
          .setRequired(true)
          .setMaxLength(1000);

        const feedbackRow = new ActionRowBuilder().addComponents(feedbackInput);
        modal.addComponents(feedbackRow);

        // Show the modal
        try {
          await interaction.showModal(modal);
        } catch (modalError) {
          console.error("Error showing feedback modal:", modalError);
          if (!interaction.replied && !interaction.deferred) {
            await interaction.reply({
              content: "❌ Unable to show feedback form. The interaction may have expired. Please try clicking the button again.",
              flags: 1 << 6
            }).catch(err => console.error("Error sending modal error message:", err));
          }
        }
      } catch (buttonError) {
        console.error("Error in feedback button handler:", buttonError);
        if (!interaction.replied && !interaction.deferred) {
          await interaction.reply({
            content: "❌ An error occurred while processing your feedback request.",
            flags: 1 << 6
          }).catch(err => console.error("Error sending button error message:", err));
        }
      }
      return;
    }

    // Handle modal submission
    if (interaction.isModalSubmit() && interaction.customId.startsWith("feedback_modal_")) {
      try {
        const rating = parseInt(interaction.customId.split("_")[2]);
        
        // Validate rating
        if (isNaN(rating) || rating < 1 || rating > 5) {
          console.error(`Invalid rating value in modal: ${rating}`);
          return interaction.reply({
            content: "❌ Invalid rating value. Please try again.",
            flags: 1 << 6
          }).catch(err => console.error("Error sending invalid rating message:", err));
        }

        let feedbackText;
        try {
          feedbackText = interaction.fields.getTextInputValue("feedback_text");
          if (!feedbackText || feedbackText.trim().length === 0) {
            return interaction.reply({
              content: "❌ Feedback text cannot be empty.",
              flags: 1 << 6
            }).catch(err => console.error("Error sending empty feedback message:", err));
          }
        } catch (fieldError) {
          console.error("Error getting feedback text from modal:", fieldError);
          return interaction.reply({
            content: "❌ Unable to read feedback text. Please try again.",
            flags: 1 << 6
          }).catch(err => console.error("Error sending field error message:", err));
        }

        const user = interaction.user;
        const channel = interaction.channel;
        const guild = interaction.guild;

        // Validate channel exists
        if (!channel) {
          console.error("Channel not found in modal submission");
          return interaction.reply({
            content: "❌ Unable to process feedback. Channel not found.",
            flags: 1 << 6
          }).catch(err => console.error("Error sending channel error message:", err));
        }

        // Check if this is a DM channel - if so, we need to find the ticket by user ID
        let ticketEntry;
        try {
          if (channel.type === 1) { // DM channel
            ticketEntry = await channelData.findOne({ userId: user.id });
            if (!ticketEntry) {
              return interaction.reply({
                content: "❌ No recent ticket found for feedback. Please contact support if you believe this is an error.",
                flags: 1 << 6
              }).catch(err => console.error("Error sending no ticket message:", err));
            }
          } else {
            // Regular channel - find by channel ID
            ticketEntry = await channelData.findOne({ channelId: channel.id });
            if (!ticketEntry) {
              return interaction.reply({
                content: "❌ This feedback can only be used in ticket channels. Please use this in a ticket channel where you received support.",
                flags: 1 << 6
              }).catch(err => console.error("Error sending invalid channel message:", err));
            }
          }
        } catch (dbError) {
          console.error("Database error while fetching ticket entry in modal:", dbError);
          return interaction.reply({
            content: "❌ Database error. Please try again later.",
            flags: 1 << 6
          }).catch(err => console.error("Error sending database error message:", err));
        }

      // Rating descriptions
      const ratingDescriptions = {
        1: "Poor",
        2: "Fair", 
        3: "Good",
        4: "Very Good",
        5: "Excellent"
      };

      // Get only the staff member who claimed the ticket
      const allStaffIds = new Set();
      
      // Only add claimer if exists (ignore staffMembers array)
      if (ticketEntry.claimer) {
        allStaffIds.add(ticketEntry.claimer);
      }
      
      // Convert to array for storage
      const staffIdsArray = Array.from(allStaffIds);
      const primaryStaffId = staffIdsArray[0] || "Unknown";

      // Store feedback in database
      const feedbackSchema = require("../../schema/feedbackSchema");
      const feedback = new feedbackSchema({
        ticketId: channel.id,
        userId: user.id,
        userTag: user.tag,
        staffId: primaryStaffId, // Primary staff member (claimer)
        allStaffIds: staffIdsArray, // All staff members who helped
        rating: rating,
        feedback: feedbackText,
        guildId: guild ? guild.id : "1415746279757058268",
        channelName: ticketEntry.channelName || channel.name || "ticket",
      });

      try {
        await feedback.save();
        console.log(`Feedback saved for user ${user.tag} with rating ${rating}`);
      } catch (error) {
        console.error("Error saving feedback to database:", error);
      }

      // Create clean feedback submission embed
      const feedbackSubmissionEmbed = new EmbedBuilder()
        .setTitle("Feedback Submitted")
        .setDescription(`Thank you for your feedback! Your rating has been recorded.`)
        .addFields(
          { name: "Rating", value: `${"⭐".repeat(rating)} ${ratingDescriptions[rating]}`, inline: true },
          { name: "Ticket", value: `\`${channel.name || "ticket"}\``, inline: true }
        )
        .setColor(0x5865f2);

      // Acknowledge the feedback
      try {
        await interaction.reply({
          embeds: [feedbackSubmissionEmbed],
          flags: 1 << 6 // Ephemeral flag
        });
      } catch (replyError) {
        console.error("Error replying to feedback submission:", replyError);
        // If reply fails, the user won't get confirmation but feedback will still be logged
        // Continue processing to log the feedback
      }

      // Send feedback to the specified feedback channel
      const feedbackChannelId = "1426540370422141068";
      let feedbackChannel;
      
      try {
        if (guild) {
          feedbackChannel = await guild.channels.fetch(feedbackChannelId);
        } else {
          // If in DM, try to fetch from the default guild
          const defaultGuild = interaction.client.guilds.cache.get("1415746279757058268");
          if (defaultGuild) {
            feedbackChannel = await defaultGuild.channels.fetch(feedbackChannelId);
          }
        }
        
        if (!feedbackChannel) {
          console.error("Feedback channel not found or not accessible");
          return;
        }
      } catch (error) {
        console.error("Error fetching feedback channel:", error);
        return;
      }

      // Get all staff member info and primary staff avatar
      let staffInfo = null;
      let staffAvatar = null;
      const targetGuild = guild || interaction.client.guilds.cache.get("1415746279757058268");
      
      if (staffIdsArray.length > 0 && targetGuild) {
        try {
          const staffMembers = [];
          for (const staffId of staffIdsArray) {
            try {
              const staffMember = await targetGuild.members.fetch(staffId);
              staffMembers.push(staffMember.user.tag);
              // Get avatar of the first staff member (claimer)
              if (!staffAvatar) {
                staffAvatar = staffMember.user.displayAvatarURL();
              }
            } catch (error) {
              // Skip unknown staff members
              continue;
            }
          }
          if (staffMembers.length > 0) {
            staffInfo = staffMembers.join(', ');
          }
        } catch (error) {
          staffInfo = null;
        }
      }

      // Get ticket info
      const ticketName = ticketEntry.channelName || channel.name;
      const ticketId = ticketEntry.ticketId || ticketEntry.channelId;

      // Create clean and professional feedback log embed
      try {
        const feedbackLogEmbed = new EmbedBuilder()
          .setTitle("Ticket Feedback")
          .setColor(0x5865f2);
        
        // Set staff avatar as thumbnail if available
        try {
          if (staffAvatar) {
            feedbackLogEmbed.setThumbnail(staffAvatar);
          }
        } catch (avatarError) {
          console.error("Error setting thumbnail:", avatarError);
        }

        // Add rating field
        try {
          feedbackLogEmbed.addFields({ 
            name: "Rating", 
            value: `${"⭐".repeat(rating)} ${ratingDescriptions[rating]} (${rating}/5)`, 
            inline: true 
          });
        } catch (ratingFieldError) {
          console.error("Error adding rating field:", ratingFieldError);
        }

        // Add user field (person who submitted feedback)
        try {
          feedbackLogEmbed.addFields({ 
            name: "User", 
            value: `${user.tag || "Unknown"} (\`${user.id}\`)`, 
            inline: true 
          });
        } catch (userFieldError) {
          console.error("Error adding user field:", userFieldError);
        }

        // Add ticket field
        if (ticketName && ticketName !== "Unknown Ticket") {
          try {
            feedbackLogEmbed.addFields({ 
              name: "Ticket", 
              value: `\`${ticketName}\``, 
              inline: true 
            });
          } catch (ticketFieldError) {
            console.error("Error adding ticket field:", ticketFieldError);
          }
        }

        // Add staff field only if ticket was claimed
        if (ticketEntry.claimer && targetGuild) {
          try {
            const staffMember = await targetGuild.members.fetch(ticketEntry.claimer);
            feedbackLogEmbed.addFields({ 
              name: "Staff Member", 
              value: `${staffMember.user.tag} (\`${ticketEntry.claimer}\`)`, 
              inline: false 
            });
          } catch (staffFieldError) {
            console.error("Error adding staff field:", staffFieldError);
            // Don't show staff field if we can't fetch the member
          }
        }

        // Add feedback text
        try {
          feedbackLogEmbed.addFields({ 
            name: "Feedback", 
            value: feedbackText.length > 1000 ? feedbackText.substring(0, 1000) + "..." : feedbackText, 
            inline: false 
          });
        } catch (feedbackFieldError) {
          console.error("Error adding feedback field:", feedbackFieldError);
        }

        // Send feedback to feedback channel
        try {
          await feedbackChannel.send({ embeds: [feedbackLogEmbed] });
          console.log(`Detailed feedback logged for user ${user.tag} with rating ${rating}`);
        } catch (error) {
          console.error("Error sending feedback to feedback channel:", error);
        }
      } catch (embedError) {
        console.error("Error creating feedback log embed:", embedError);
      }

      // Disable the feedback buttons to prevent multiple submissions
      try {
        if (interaction.message && interaction.message.components && interaction.message.components.length > 0) {
          const disabledRow = interaction.message.components[0].toJSON();
          disabledRow.components.forEach(button => {
            button.disabled = true;
          });

          await interaction.message.edit({
            components: [disabledRow]
          });
        }
      } catch (error) {
        console.error("Error disabling feedback buttons:", error);
      }
      } catch (modalSubmitError) {
        console.error("Error in modal submit handler:", modalSubmitError);
        if (!interaction.replied && !interaction.deferred) {
          await interaction.reply({
            content: "❌ An error occurred while submitting your feedback. Please try again.",
            flags: 1 << 6
          }).catch(err => console.error("Error sending modal submit error message:", err));
        } else {
          await interaction.followUp({
            content: "❌ An error occurred while submitting your feedback.",
            flags: 1 << 6
          }).catch(err => console.error("Error sending modal submit error followup:", err));
        }
      }
      return;
    }
  } catch (error) {
    console.error("Error in feedback button handler:", error);
    
    try {
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp({
          content: "❌ Something went wrong while processing your feedback.",
          flags: 1 << 6
        }).catch(err => console.error("Error sending error followup:", err));
      } else {
        await interaction.reply({
          content: "❌ Something went wrong while processing your feedback.",
          flags: 1 << 6
        }).catch(err => console.error("Error sending error reply:", err));
      }
    } catch (finalError) {
      console.error("Fatal error in feedback handler:", finalError);
    }
  }
};
