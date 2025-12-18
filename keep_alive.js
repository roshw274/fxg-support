const express = require('express');
const path = require('path');
const moment = require('moment');
const Transcript = require('./schema/transcriptSchema');

const app = express();

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Helper function to create a message processor for a specific transcript
const createMessageProcessor = (transcript) => {
  return (content) => {
    if (!content) return '';
    
    // Replace user mentions with usernames
    content = content.replace(/<@!?(\d+)>/g, (match, userId) => {
      const user = transcript.messages.find(m => m.authorId === userId);
      if (user) {
        return `<span class="mention">@${user.author}</span>`;
      }
      return '@unknown-user';
    });

    // Replace role mentions
    content = content.replace(/<@&(\d+)>/g, '@role');

    // Replace channel mentions
    content = content.replace(/<#(\d+)>/g, '#channel');

    // HTML escape
    content = content
      .replace(/&(?!#?\w+;)/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    return content;
  };
};

// Middleware to format dates and add helpers
app.locals.moment = moment;
app.locals.formatDate = (date) => {
  return moment(date).format('MMMM Do YYYY, h:mm:ss A');
};

// Home page with transcript search
app.get('/', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const pageSize = 10;
    const search = req.query.search || '';

    let query = { isPublic: true };
    if (search) {
      query.$or = [
        { 'ticketChannelName': { $regex: search, $options: 'i' } },
        { 'ticketOpener.username': { $regex: search, $options: 'i' } },
        { 'claimedBy.username': { $regex: search, $options: 'i' } },
      ];
    }

    const totalCount = await Transcript.countDocuments(query);
    const transcripts = await Transcript.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * pageSize)
      .limit(pageSize);

    const totalPages = Math.ceil(totalCount / pageSize);

    res.render('home', {
      transcripts,
      currentPage: page,
      totalPages,
      search,
      totalCount,
    });
  } catch (error) {
    console.error('Error fetching transcripts:', error);
    res.status(500).render('error', { message: 'Failed to load transcripts' });
  }
});

// View specific transcript
app.get('/transcript/:id', async (req, res) => {
  try {
    const transcript = await Transcript.findOne({ transcriptId: req.params.id });

    if (!transcript) {
      return res.status(404).render('error', { message: 'Transcript not found' });
    }

    if (!transcript.isPublic) {
      const password = req.query.password || req.body.password;
      if (transcript.password && password !== transcript.password) {
        return res.status(401).render('password', { transcriptId: req.params.id });
      }
    }

    // Increment view count
    await Transcript.updateOne({ transcriptId: req.params.id }, { $inc: { viewCount: 1 } });

    res.render('transcript-admin', { 
      transcript,
      processMessageContent: createMessageProcessor(transcript)
    });
  } catch (error) {
    console.error('Error fetching transcript:', error);
    res.status(500).render('error', { message: 'Failed to load transcript' });
  }
});

// API endpoint for raw transcript data
app.get('/api/transcript/:id', async (req, res) => {
  try {
    const transcript = await Transcript.findOne({ transcriptId: req.params.id });

    if (!transcript) {
      return res.status(404).json({ error: 'Transcript not found' });
    }

    if (!transcript.isPublic) {
      const password = req.query.password || req.body.password;
      if (transcript.password && password !== transcript.password) {
        return res.status(401).json({ error: 'Authentication required' });
      }
    }

    // Increment view count
    await Transcript.updateOne({ transcriptId: req.params.id }, { $inc: { viewCount: 1 } });

    res.json(transcript);
  } catch (error) {
    console.error('Error fetching transcript:', error);
    res.status(500).json({ error: 'Failed to load transcript' });
  }
});

// Serve transcript as text
app.get('/transcript/:id/text', async (req, res) => {
  try {
    const transcript = await Transcript.findOne({ transcriptId: req.params.id });

    if (!transcript) {
      return res.status(404).send('Transcript not found');
    }

    if (!transcript.isPublic) {
      const password = req.query.password || req.body.password;
      if (transcript.password && password !== transcript.password) {
        return res.status(401).send('Authentication required');
      }
    }

    // Generate plain text version
    let text = `Ticket Transcript: ${transcript.ticketChannelName}\n`;
    text += `Category: ${transcript.categoryName || 'N/A'}\n`;
    text += `Opened by: ${transcript.ticketOpener.tag}\n`;
    if (transcript.claimedBy) {
      text += `Claimed by: ${transcript.claimedBy.tag}\n`;
    }
    text += `Status: ${transcript.status}\n`;
    if (transcript.closedAt) {
      text += `Closed: ${moment(transcript.closedAt).format('YYYY-MM-DD HH:mm:ss')}\n`;
    }
    text += `Created: ${moment(transcript.createdAt).format('YYYY-MM-DD HH:mm:ss')}\n`;
    text += `Messages: ${transcript.messages.length}\n`;
    text += '='.repeat(80) + '\n\n';

    for (const msg of transcript.messages) {
      text += `[${moment(msg.timestamp).format('YYYY-MM-DD HH:mm:ss')}] ${msg.author}#${msg.authorTag}: ${msg.content}\n`;
      if (msg.attachments.length > 0) {
        text += `  Attachments: ${msg.attachments.map(a => a.filename).join(', ')}\n`;
      }
    }

    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="transcript-${transcript.transcriptId}.txt"`);
    res.send(text);
  } catch (error) {
    console.error('Error generating text transcript:', error);
    res.status(500).send('Failed to generate transcript');
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Keep-alive server running on port ${PORT}`);
}); 