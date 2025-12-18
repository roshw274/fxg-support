# 📋 Ticket Transcript System

A complete web-based transcript viewer system for Discord ticket channels, built with Discord.js, Express.js, and MongoDB.

## Features

✅ **Persistent Storage** — All transcripts saved in MongoDB  
✅ **Web Interface** — Beautiful Discord-like HTML rendering  
✅ **Shareable Links** — Unique UUID-based URLs for each transcript  
✅ **Rich Message Support** — Embeds, attachments, reactions, user avatars, and role colors  
✅ **Search & Archive** — Browse and search all archived transcripts  
✅ **API Endpoints** — JSON API for external integrations  
✅ **Download Support** — Export transcripts as plain text files  
✅ **Responsive Design** — Works on desktop and mobile devices  

## System Architecture

### 1️⃣ **Backend - Discord Bot (Discord.js)**

The Discord bot generates transcripts when:
- `/transcript` command is executed (slash command)
- Ticket is closed via button (Modal submission)
- Ticket is closed via `/close` command

**Data Processing:**
- Fetches all messages from the channel (batches of 100)
- Extracts: user info, content, embeds, attachments, reactions, timestamps
- Generates UUID as unique transcript ID
- Stores entire dataset in MongoDB

**MongoDB Document Structure:**
```javascript
{
  transcriptId: "uuid",           // Unique identifier
  ticketChannelId: "...",         // Discord channel ID
  ticketChannelName: "#ticket-123", // Channel name
  categoryId: "...",              // Parent category ID
  categoryName: "Support",        // Category name
  ticketOpener: {...},            // User who opened ticket
  claimedBy: {...},               // Staff who claimed ticket
  staff: [...],                   // All staff involved
  messages: [                      // All messages
    {
      id: "...",
      author: "username",
      authorAvatar: "url",
      content: "...",
      embeds: [...],
      attachments: [...],
      reactions: [...]
    }
  ],
  status: "closed",
  closedAt: Date,
  closeReason: "string",
  createdAt: Date,
  viewCount: 0,
  isPublic: true
}
```

### 2️⃣ **Server - Express Routes (Express.js)**

**Endpoints:**
- `GET /` — Home page with search & archive
- `GET /transcript/:id` — View formatted transcript
- `GET /api/transcript/:id` — Raw JSON data
- `GET /transcript/:id/text` — Download as plain text

**Features:**
- Full-text search by channel name, username, staff member
- Pagination (10 transcripts per page)
- View counter (increments on each view)
- Optional password protection
- Moment.js for timestamp formatting

### 3️⃣ **Frontend - EJS Templates**

**Templates:**
- `home.ejs` — Transcript listing with search
- `transcript.ejs` — Full transcript viewer
- `error.ejs` — Error pages
- `password.ejs` — Password-protected access

**Styling:**
- Discord-like dark theme
- Responsive grid layout
- Message bubbles with user avatars
- Embed and attachment rendering
- Reaction display with emoji and counts
- Mobile-optimized CSS

## Installation

### 1. Install Dependencies

```bash
npm install
```

### 2. Add Environment Variables

Update your `.env` file with:

```env
# Discord Bot
TOKEN=your_discord_bot_token
GUILD_ID=your_guild_id

# MongoDB
MONGODB_URI=mongodb+srv://user:password@cluster.mongodb.net/database

# Website
WEBSITE_URL=http://localhost:3000
PORT=3000
```

### 3. Start the Bot & Server

```bash
npm start
```

The bot will connect to Discord, and the web server will start on `http://localhost:3000`.

## Usage

### Generating Transcripts

#### Method 1: Slash Command
```
/transcript
```
- Generates transcript for the current ticket
- Fetches up to 1000 messages
- Returns shareable link

#### Method 2: Close Button
- Click "Close Ticket" button in ticket channel
- Submit close reason in modal
- Transcript generated automatically

#### Method 3: Slash Command
```
/close [reason]
```
- Closes ticket and generates transcript
- Awards staff points
- Sends feedback request to ticket opener

### Viewing Transcripts

**In Discord:**
- Get shareable link from the bot's response embed
- Example: `http://localhost:3000/transcript/abc-def-123`

**In Browser:**
- Visit the transcript URL
- See full conversation with all formatting preserved
- Click "Download Text" to export as `.txt` file

**Search & Browse:**
- Visit home page: `http://localhost:3000`
- Search by channel name, username, or staff member
- Browse paginated results with metadata
- Click any transcript to view details

## Data Flow

```
Discord Ticket Closed
         ↓
    /transcript or /close or Close Button
         ↓
  Fetch all messages from Discord API
         ↓
Process messages (embeds, attachments, reactions)
         ↓
Store in MongoDB with UUID
         ↓
Return shareable URL: example.com/transcript/{UUID}
         ↓
User clicks link
         ↓
Express server loads from MongoDB
         ↓
EJS template renders HTML
         ↓
Browser displays Discord-styled transcript
```

## API Reference

### Get Transcript (JSON)

```
GET /api/transcript/{transcriptId}
```

**Response:**
```json
{
  "transcriptId": "uuid",
  "ticketChannelName": "#ticket-123",
  "messages": [
    {
      "author": "username",
      "content": "Hello",
      "timestamp": "2025-12-18T...",
      "embeds": [...],
      "attachments": [...]
    }
  ],
  "status": "closed",
  "closedAt": "2025-12-18T..."
}
```

### Search Transcripts

```
GET /?search=username&page=1
```

**Query Parameters:**
- `search` — Search term (channel name, username, staff)
- `page` — Page number (default: 1)

## Configuration

### In Discord Bot (`ticketSchema`)

```javascript
{
  transcriptChannelId: "...",  // Where transcript logs are sent
  staffRole: "...",           // Role required to generate transcripts
  // ... other ticket config
}
```

### In Environment (`.env`)

```env
WEBSITE_URL=https://your-domain.com  # Domain for shareable links
PORT=3000                             # Express server port
MONGODB_URI=...                       # MongoDB connection string
```

## Features in Detail

### Rich Message Rendering

- **User Avatars** — Cached Discord avatars
- **Bot Badges** — Shows "BOT" label for bot users
- **Role Colors** — Displays member role color if available
- **Embeds** — Full embed rendering with colors, fields, images
- **Attachments** — Images/videos embedded, files as download links
- **Reactions** — Emoji reactions with counts and hover tooltips
- **Edited Messages** — Shows "(edited)" label with edit timestamp

### Search Capabilities

Full-text search across:
- Channel names (e.g., "ticket-123")
- Opener usernames
- Claimed staff username
- Matching returns filtered results with pagination

### View Analytics

- **View Counter** — Increments each time transcript is viewed
- **Creation Date** — When ticket was opened
- **Close Date** — When ticket was closed
- **Duration** — Time from opening to closing
- **Metadata** — Category, opener, claimer, all staff involved

### Security

- **UUID-based URLs** — Transcripts cannot be guessed by ID
- **Optional Passwords** — Support for password-protected transcripts
- **Public/Private** — Can mark transcripts as private
- **Access Logs** — View count tracks popularity

## Troubleshooting

### Transcript Not Generating
- Ensure MongoDB is connected and running
- Check bot has permission to fetch channel messages
- Verify `uuid` and `ejs` packages are installed

### Web Page Not Showing
- Ensure Express server is running (`npm start`)
- Check `WEBSITE_URL` in `.env` matches your domain
- Verify MongoDB has saved the transcript document

### Missing Embeds/Attachments
- Ensure messages are fetched completely (may take time for large channels)
- Discord API may throttle requests for very large channels
- Check for permission issues with attachment URLs

## Customization

### Change Colors
Edit `/public/css/style.css`:
```css
:root {
  --primary-color: #5865f2;
  --background-color: #36393f;
  /* ... more colors ... */
}
```

### Modify Message Rendering
Edit `/views/transcript.ejs` to customize how messages display

### Add Password Protection
Set password when creating transcript:
```javascript
transcript.password = "secretpassword";
await transcript.save();
```

## Database Indexes

For optimal performance, create these indexes in MongoDB:

```javascript
db.transcripts.createIndex({ "transcriptId": 1 }, { unique: true })
db.transcripts.createIndex({ "ticketChannelName": 1 })
db.transcripts.createIndex({ "ticketOpener.username": 1 })
db.transcripts.createIndex({ "createdAt": 1 })
```

## Performance Notes

- **Message Fetching** — Can take time for channels with 1000+ messages
- **Database** — Stores full message data; use TTL index for auto-deletion
- **Rendering** — Large transcripts (500+ messages) may take seconds to render

## Future Enhancements

- [ ] Full-text search with Elasticsearch
- [ ] Transcript comparison/diff tool
- [ ] Export to PDF format
- [ ] Custom branding/theming
- [ ] Message filtering and analytics
- [ ] Webhook integration for external systems
- [ ] Rate limiting and access control
- [ ] Automatic cleanup after 30 days (TTL)

## Support

For issues or questions:
1. Check Discord channel permissions
2. Verify MongoDB connection
3. Review console logs for errors
4. Check `.env` configuration

---

**Created with ❤️ for Discord Support Teams**
