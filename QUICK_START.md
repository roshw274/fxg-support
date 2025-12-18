# ⚡ Quick Start Guide - Transcript System

## 30 Second Setup

### 1. Update `.env`
```env
WEBSITE_URL=http://localhost:3000
MONGODB_URI=your_mongodb_connection_string
```

### 2. Run Bot
```bash
npm start
```

### 3. Test
```
In Discord: /close reason:Test
Bot response: "View Transcript: http://localhost:3000/transcript/..."
Click link → See Discord-perfect transcript
```

---

## Commands

### Generate Transcript
```discord
/transcript
```
Creates shareable transcript link for current ticket

### Close Ticket (with Transcript)
```discord
/close reason:Resolved - User issue fixed
```
Closes ticket, generates transcript, awards staff points

### Close Button
- Click "Close Ticket" button in channel
- Submit reason in modal
- Automatic transcript generation

---

## URLs

### View Transcript
```
http://localhost:3000/transcript/{transcriptId}
```
Beautiful Discord-styled viewer

### Browse Archives
```
http://localhost:3000/
```
Search and browse all transcripts

### Download as Text
```
http://localhost:3000/transcript/{transcriptId}/text
```
Export as plain text file

### Raw JSON
```
http://localhost:3000/api/transcript/{transcriptId}
```
For external integrations

---

## Features

✅ **Exact Discord Styling**
- Dark theme matching Discord's colors
- Perfect message layout with grouping
- Smooth animations and hover effects

✅ **Rich Content**
- Embeds with all Discord types
- Images/videos inline
- File downloads
- Emoji reactions

✅ **Search & Browse**
- Full-text search
- Pagination
- View counts
- Metadata display

✅ **User Features**
- Optional password protection
- Download transcripts
- Mobile responsive
- Fast loading

---

## File Changes

**Updated:**
- `commands/transcript.js` → Database storage
- `commands/close.js` → Database storage
- `events/interactionCreate/closebutton.js` → Database storage
- `keep_alive.js` → Express routes + EJS templates
- `package.json` → New dependencies

**Created:**
- `schema/transcriptSchema.js` → MongoDB schema
- `views/transcript.ejs` → Discord-styled viewer
- `views/home.ejs` → Search interface
- `views/error.ejs` → Error pages
- `views/password.ejs` → Auth
- `public/css/style.css` → Complete styling

---

## Environment Variables

```env
# Required
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/db
WEBSITE_URL=http://localhost:3000

# Optional
PORT=3000
```

---

## Database

**Schema:** Transcript with UUID, messages, metadata  
**Indexes:** Recommended for search performance  
**Size:** ~1KB per message + embed/attachment data  

---

## Styling

**Colors:**
- Primary: `#5865f2` (Discord blue)
- Dark: `#313338`, `#2c2f33` (Discord dark)
- Text: `#dbdee1` (Light gray)
- Muted: `#72767d` (Gray)

**Customize:** Edit `/public/css/style.css` `:root` variables

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| No transcript | Check MongoDB connection |
| Page doesn't load | Ensure Express running (`npm start`) |
| Styling broken | Clear cache (Ctrl+Shift+Del) |
| Messages missing | Verify bot permissions |

---

## Next Steps

1. ✅ Install dependencies (`npm install`)
2. ✅ Configure `.env`
3. ✅ Start bot (`npm start`)
4. ✅ Close a test ticket
5. ✅ View transcript from shared link
6. ✅ Customize colors if desired
7. ✅ Deploy to production

---

## Support

Check [IMPLEMENTATION_COMPLETE.md](IMPLEMENTATION_COMPLETE.md) for full details.

---

**You're all set! The system is production-ready.**
