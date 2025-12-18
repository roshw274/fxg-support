const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require("discord.js");
const staffPoints = require("../../schema/staffPoints");
const ticketSetup = require("../../schema/ticketSchema");

module.exports = async (message, client) => {
  const prefix = "^";
  if (message.author.bot || !message.content.startsWith(prefix)) return;

  const guildId = message.guild.id;
  const member = message.member;
  const entry = await ticketSetup.findOne({ guildId });
  if (!entry) return;

  const highStaffRoleId = entry.highStaffRole;
  if (!member.roles.cache.has(highStaffRoleId)) return;

  const args = message.content.slice(prefix.length).trim().split(/\s+/);
  const command = args.shift().toLowerCase();

  if (command === "leaderboard" || command === "lb") {
    if (process.env.lb === "false") {
      message.reply("Leaderboard Is Set To `FALSE` In Config"),
        console.log(`${message.author.tag} Used ^lb But its set to FALSE`);
      return;
    }
    try {
      let leaderboard = await staffPoints.find().sort({ points: -1 });
      if (!leaderboard.length) {
        return message.reply("No staff points have been recorded yet.");
      }

      const pageSize = 10;
      let currentPage = 0;
      let totalPages = Math.ceil(leaderboard.length / pageSize);

      const generateEmbed = async (page) => {
        leaderboard = await staffPoints.find().sort({ points: -1 });
        totalPages = Math.ceil(leaderboard.length / pageSize);

        const start = page * pageSize;
        const end = start + pageSize;
        const pageData = leaderboard.slice(start, end);

        // Generate chart for top 10 overall (not just current page)
        const top10 = leaderboard.slice(0, Math.min(10, leaderboard.length));
        let chartUrl = '';
        
        try {
          const chartData = {
            type: 'horizontalBar',
            data: {
              labels: top10.map((s, i) => `#${i + 1}`),
              datasets: [{
                label: 'Points',
                data: top10.map(s => s.points),
                backgroundColor: 'rgba(255, 215, 0, 0.7)',
                borderColor: 'rgba(255, 215, 0, 1)',
                borderWidth: 2
              }]
            },
            options: {
              plugins: {
                legend: { display: false },
                title: {
                  display: true,
                  text: 'Top 10 Staff',
                  font: { size: 18, weight: 'bold' },
                  color: '#FFD700'
                }
              },
              scales: {
                x: {
                  beginAtZero: true,
                  ticks: { color: '#ffffff', font: { size: 12 } },
                  grid: { color: 'rgba(255, 255, 255, 0.1)' }
                },
                y: {
                  ticks: { color: '#ffffff', font: { size: 11 } },
                  grid: { display: false }
                }
              }
            }
          };

          const chartConfig = encodeURIComponent(JSON.stringify(chartData));
          chartUrl = `https://quickchart.io/chart?c=${chartConfig}&backgroundColor=rgba(47,49,54,1)&width=700&height=500`;
          
          if (chartUrl.length > 2000) {
            console.warn('[LEADERBOARD] Chart URL too long');
            chartUrl = '';
          }
        } catch (error) {
          console.error('[LEADERBOARD CHART ERROR]', error);
          chartUrl = '';
        }

        const embed = new EmbedBuilder()
          .setTitle("🏆 Staff Leaderboard 🏆")
          .setColor(0xFFD700)
          .setFooter({
            text: `Page ${page + 1} of ${totalPages} | Total Staff: ${leaderboard.length}`,
            iconURL: client.user.displayAvatarURL(),
          })
          .setTimestamp();

        // Add page data with length limit
        let position = start + 1;
        let description = '';
        const maxDescLength = 4000; // Safe limit under 4096
        
        for (const staff of pageData) {
          const user = await client.users.fetch(staff.staffId).catch(() => null);
          const medal = position === 1 ? '🥇' : position === 2 ? '🥈' : position === 3 ? '🥉' : '🏅';
          const entry = `${medal} **#${position}** - ${user ? `<@${user.id}>` : 'Unknown User'}\n└ Points: \`${staff.points.toLocaleString()}\`\n\n`;
          
          // Check if adding this entry would exceed limit
          if (description.length + entry.length > maxDescLength) {
            description += '...and more';
            break;
          }
          
          description += entry;
          position++;
        }

        embed.setDescription(description || 'No staff found on this page.');
        
        // Only show chart on first page and if generated successfully
        if (page === 0 && chartUrl) {
          embed.setImage(chartUrl);
        }

        return embed;
      };

      const createButtons = (disabled = false) =>
        new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId("prev")
            .setLabel("⬅️ Previous")
            .setStyle(ButtonStyle.Primary)
            .setDisabled(disabled),
          new ButtonBuilder()
            .setCustomId("next")
            .setLabel("Next ➡️")
            .setStyle(ButtonStyle.Primary)
            .setDisabled(disabled)
        );

      const firstEmbed = await generateEmbed(currentPage);
      const row = createButtons(false);

      const leaderboardMessage = await message.channel.send({
        embeds: [firstEmbed],
        components: [row],
      });

      const filter = (interaction) =>
        interaction.user.id === message.author.id;

      const collector = leaderboardMessage.createMessageComponentCollector({
        filter,
        time: 60000,
      });

      collector.on("collect", async (interaction) => {
        try {
          await interaction.deferUpdate(); // ✅ Fix: Acknowledge the interaction

          if (interaction.customId === "prev" && currentPage > 0) {
            currentPage--;
          } else if (
            interaction.customId === "next" &&
            currentPage < totalPages - 1
          ) {
            currentPage++;
          }

          const newEmbed = await generateEmbed(currentPage);
          await leaderboardMessage.edit({
            embeds: [newEmbed],
            components: [createButtons(false)],
          });

        } catch (err) {
          console.error("Error updating leaderboard:", err);
        }
      });

      collector.on("end", async () => {
        const disabledRow = createButtons(true);
        leaderboardMessage.edit({
          components: [disabledRow],
        }).catch(() => { });
      });
    } catch (error) {
      console.error("Error fetching leaderboard:", error);
      message.reply("An error occurred while fetching the leaderboard.");
    }
  }
};
