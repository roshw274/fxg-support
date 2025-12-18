const { EmbedBuilder, AttachmentBuilder } = require("discord.js");
const ticketSetup = require("../../schema/ticketSchema");
const staffPoints = require("../../schema/staffPoints");

module.exports = async (message) => {
  const guild = message.guild;
  const guildId = message.guild.id;
  const member = message.member;
  const prefix = "^";
  const command = "points";
  
  if (!message.content.toLowerCase().startsWith(`${prefix}${command}`)) return;
  
  const entry = await ticketSetup.findOne({ guildId });
  if (!entry) return;
  
  const staffRoleId = entry.staffRole;
  if (!member.roles.cache.has(staffRoleId)) {
    return message.reply("❌ You don't have access to this command.");
  }

  // Parse arguments
  const args = message.content.trim().split(/ +/);
  args.shift(); // Remove command

  const userMention = args[0];
  if (!userMention) {
    return message.reply("Please mention a user or provide their ID!");
  }

  // Extract user ID
  const staffId = userMention.replace(/[<@!>]/g, "");
  
  // Fetch staff data
  const staff = await staffPoints.findOne({ staffId });
  if (!staff) {
    return message.reply("❌ No staff member found with that ID.");
  }

  // Fetch all staff to calculate ranking
  const allStaff = await staffPoints.find({}).sort({ points: -1 }).lean();
  const rank = allStaff.findIndex(s => s.staffId === staffId) + 1;
  const totalStaff = allStaff.length;
  
  // Calculate percentile
  const percentile = totalStaff > 1 ? Math.round(((totalStaff - rank) / (totalStaff - 1)) * 100) : 100;
  
  // Get top 5 for comparison
  const top5 = allStaff.slice(0, 5);
  const maxPoints = top5[0]?.points || staff.points || 1;
  
  // Create progress bar
  const barLength = 20;
  const filledBars = Math.round((staff.points / Math.max(maxPoints, 1)) * barLength);
  const emptyBars = barLength - filledBars;
  const progressBar = '█'.repeat(filledBars) + '░'.repeat(emptyBars);

  // Generate chart URL using QuickChart API
  let chartUrl = '';
  try {
    const chartData = {
      type: 'bar',
      data: {
        labels: top5.map((s, i) => {
          const isCurrentUser = s.staffId === staffId;
          return isCurrentUser ? `You #${i + 1}` : `#${i + 1}`;
        }),
        datasets: [{
          label: 'Points',
          data: top5.map(s => s.points),
          backgroundColor: top5.map(s => 
            s.staffId === staffId ? 'rgba(88, 101, 242, 0.8)' : 'rgba(153, 170, 181, 0.6)'
          ),
          borderColor: top5.map(s => 
            s.staffId === staffId ? 'rgba(88, 101, 242, 1)' : 'rgba(153, 170, 181, 1)'
          ),
          borderWidth: 2
        }]
      },
      options: {
        plugins: {
          legend: { display: false },
          title: {
            display: true,
            text: 'Top 5 Staff',
            font: { size: 16, weight: 'bold' },
            color: '#ffffff'
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: { color: '#ffffff', font: { size: 12 } },
            grid: { color: 'rgba(255, 255, 255, 0.1)' }
          },
          x: {
            ticks: { color: '#ffffff', font: { size: 11 } },
            grid: { display: false }
          }
        }
      }
    };

    const chartConfig = encodeURIComponent(JSON.stringify(chartData));
    chartUrl = `https://quickchart.io/chart?c=${chartConfig}&backgroundColor=rgba(47,49,54,1)&width=600&height=400`;
    
    // Validate URL length
    if (chartUrl.length > 2000) {
      console.warn('[CHART] URL too long, chart disabled');
      chartUrl = '';
    }
  } catch (error) {
    console.error('[CHART ERROR]', error);
    chartUrl = '';
  }

  // Create embed
  const staffPEmbed = new EmbedBuilder()
    .setTitle('📊 Staff Points Overview')
    .setDescription(`**Staff Member:** <@${staffId}>`)
    .addFields(
      { 
        name: '🏆 Total Points', 
        value: `\`\`\`${staff.points.toLocaleString()}\`\`\``, 
        inline: true 
      },
      { 
        name: '📈 Rank', 
        value: `\`\`\`#${rank} / ${totalStaff}\`\`\``, 
        inline: true 
      },
      { 
        name: '📊 Percentile', 
        value: `\`\`\`Top ${100 - percentile}%\`\`\``, 
        inline: true 
      },
      {
        name: 'Progress',
        value: `\`${progressBar}\` ${staff.points}/${maxPoints}`,
        inline: false
      }
    )
    .setColor(0x5865F2);

  // Only add image if chart was generated successfully
  if (chartUrl) {
    staffPEmbed.setImage(chartUrl);
  }
  
  staffPEmbed.setTimestamp();

  // Add footer safely
  try {
    staffPEmbed.setFooter({ 
      text: `Requested by ${message.author.username}`, 
      iconURL: message.author.displayAvatarURL() 
    });
  } catch (error) {
    console.error('[FOOTER ERROR]', error);
  }

  // Log for debugging
  console.log(
    `[POINTS CHECK] Staff: ${staffId} | Points: ${staff.points} | Rank: ${rank}/${totalStaff} | Checked by: ${message.author.username}`
  );

  try {
    await message.channel.send({
      embeds: [staffPEmbed],
    });
  } catch (error) {
    console.error('[EMBED SEND ERROR]', error);
    await message.reply('❌ Failed to display points. The embed may be too large or malformed.').catch(() => {});
  }
};
