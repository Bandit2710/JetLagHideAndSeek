# 🎮 Jet Lag Hide & Seek - Complete Setup Guide

## Table of Contents
1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Prerequisites](#prerequisites)
4. [Supabase Setup (5 minutes)](#supabase-setup-5-minutes)
5. [Application Setup (2 minutes)](#application-setup-2-minutes)
6. [How to Play](#how-to-play)
7. [Features](#features)
8. [Troubleshooting](#troubleshooting)
9. [API Reference](#api-reference)

---

## Overview

This is a **real-time multiplayer** version of the Jet Lag Hide & Seek map generator. Players are split into:

- **1 Hider**: Moves around, location tracked privately, answers questions automatically
- **N Seekers**: Ask location-based questions, try to narrow down hider's location using the map
- **Timers**: Synced countdown timers for curses (e.g., "Passenger Princess" curse - 60 minutes)

All data syncs in real-time across all players using WebSocket subscriptions.

### Key Facts
- ✅ No accounts needed (anonymous authentication)
- ✅ Free to run (uses free Supabase tier)
- ✅ Mobile friendly
- ✅ Hider's private location is **never** exposed
- ✅ Works on any modern browser with GPS

---

## Architecture

```
┌─────────────────┐
│  Browser (Hider)│
│  - Tracks location (private)
│  - Auto-answers questions
│  - Shows hider dashboard
└────────┬────────┘
         │ WebSocket (Realtime)
┌────────▼────────────────────────┐
│  Supabase Backend (PostgreSQL)   │
│  ├─ sessions table
│  ├─ players table
│  ├─ questions table
│  └─ timers table
│     (All with RLS policies)
└────────▲────────────────────────┘
         │ WebSocket
┌────────┴────────┐
│ Browsers (Seekers) │
│ - See questions map
│ - Ask questions
│ - See synced timers
└──────────────────┘
```

### Data Flow Example

**Seeker Asks Question:**
```
Seeker clicks "Ask Question" at location [35.6762, 139.6503]
    ↓
Question sent to database with seeker location
    ↓
Hider's device receives via Realtime subscription
    ↓
Hider's device computes answer based on hider location [35.6800, 139.6530]
    ↓
Answer updated in database
    ↓
All seekers receive answer via Realtime
    ↓
Seekers see "YES" or "NO" on their map
```

---

## Prerequisites

### Required
- A Supabase account (free at https://supabase.com)
- Node.js 18+ installed
- `pnpm` package manager (or `npm`)
- Modern browser with GPS support (Chrome, Firefox, Safari)
- Internet connection

### Optional
- Two devices or browser tabs for testing
- Text editor for environment variables

---

## Supabase Setup (5 minutes)

### Step 1: Create Supabase Project

1. Go to **https://supabase.com**
2. Sign up with email or GitHub
3. Click **"New Project"**
4. Fill in:
   - **Name**: `jet-lag-multiplayer` (any name)
   - **Database Password**: Create a strong password (you won't need it)
   - **Region**: Select closest to you (e.g., `us-east-1`, `eu-west-1`)
   - **Pricing Plan**: `Free` (recommended)
5. Click **"Create new project"** and wait ~2 minutes for it to be ready

### Step 2: Enable Anonymous Authentication

1. In your Supabase project, click **"Auth"** in left sidebar
2. Click **"Providers"**
3. Find **"Anonymous"** in the list
4. Click **"Enable"** (toggle to ON)
5. No configuration needed, just save

### Step 3: Get Your API Keys

1. Click **"Settings"** → **"API"** in left sidebar
2. Under **"Project API keys"**, you'll see:
   - **Project URL** (looks like `https://xxxxx.supabase.co`)
   - **anon public key** (long string starting with `eyJ...`)
3. **Copy both** to a text file for next step

### Step 4: Create Database Schema

1. Still in Supabase, click **"SQL Editor"** in left sidebar
2. Click **"New Query"**
3. Copy the entire contents of `supabase-migrations.sql` from your project root
4. Paste it into the SQL editor
5. Click **"Run"** button
6. Wait for it to complete (should show ✓)

**What this does:**
- Creates 4 tables: `sessions`, `players`, `questions`, `timers`
- Sets up Row-Level Security (RLS) policies
- Creates database indexes for performance

---

## Application Setup (2 minutes)

### Step 1: Create .env.local File

In the **project root** (same folder as `package.json`), create a file named `.env.local`:

```env
PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

**Replace with your values from Step 3 above.**

Example:
```env
PUBLIC_SUPABASE_URL=https://abcdefg123456.supabase.co
PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9eyJpc3MiOiJzdXBhYmFzZSJ9...
```

### Step 2: Install Dependencies

In your terminal, run:

```bash
pnpm install
```

This installs all packages including the new `@supabase/supabase-js` library.

### Step 3: Start Development Server

```bash
pnpm dev
```

You should see:
```
  Local:    http://localhost:3000
  Network:  http://192.168.1.x:3000
```

Open http://localhost:3000 in your browser. You should see the map app.

---

## How to Play

### For the Hider

1. **Load the app** and wait for the Session Manager dialog
2. **Click "Create Game"** → You'll see your 6-character invite code
3. **Copy the code** and share it with seekers (email, text, Discord, etc.)
4. **Allow location access** when browser asks
5. **Move around** - your location is tracked continuously
6. **Watch the Hider Dashboard** (bottom drawer):
   - Shows unanswered questions in amber
   - Shows player list and their locations
   - Shows your own coordinates (for reference)
7. **Auto-answer or manually answer** each question:
   - **Auto-Answer**: Computes answer based on your location
   - **Manual**: Type custom answer (e.g., "Street name is Main St")

**Your location is NEVER sent to the database or shown to seekers.** Only your answers are shared.

### For the Seekers

1. **Load the app** and wait for the Session Manager dialog
2. **Click "Join Game"**
3. **Enter:**
   - Your name (e.g., "Alice")
   - Hider's invite code (e.g., "ABC123")
4. **Click "Join"**
5. **Allow location access** when browser asks
6. **Ask questions** (bottom drawer, "Ask Question" button):
   - Each question is placed at your current location
   - Question auto-answered based on hider's location
   - See answer appear instantly
7. **View the map** to narrow down hider's location
8. **Use timers** (top-right):
   - Click "Add Timer"
   - Add timers for curses (e.g., "Passenger Princess" - 60 min)
   - All players see the same countdown

### Shared Features

**Timers Panel** (top-right corner):
- Shows all active timers
- Pause/Resume any timer
- Delete timers when done
- Collapsible to save screen space

**Connection Status**:
- Look for green indicators (connected)
- Red indicators (no connection)
- Refresh page if connection is lost

---

## Features

### Core Multiplayer
- ✅ Session creation with 6-character invite codes
- ✅ Real-time player syncing (join/leave notifications)
- ✅ Automatic location tracking for all players
- ✅ Live question & answer system
- ✅ Synced timers across all devices

### Hider Features
- 📍 Private location tracking (never exposed)
- 🤖 Auto-answer questions based on location
- ✍️ Manual answer override if needed
- 👥 View all other seekers and their locations
- 📊 Dashboard showing all questions and answers
- 🗺️ Your coordinates visible (for reference)

### Seeker Features
- ❓ Ask location-based questions
- 📍 Questions pinned to your location
- ✅ Instant answers synchronized in real-time
- 🗺️ Use map to narrow down hider location
- ⏱️ Create/manage synced timers
- 👥 See other seekers in the session

### Timer System
- Multiple simultaneous timers
- Curse-based timers ("Passenger Princess", "Stranded", etc.)
- Run timers for tracking total game time
- Pause/Resume/Delete controls
- Synced countdown across all devices
- Persists across page refresh

---

## Troubleshooting

### "Missing Supabase environment variables"

**Error Message:**
```
Missing Supabase environment variables. Please set PUBLIC_SUPABASE_URL 
and PUBLIC_SUPABASE_ANON_KEY in your .env file.
```

**Solutions:**
1. Check `.env.local` exists in project root
2. Verify it has both variables:
   ```env
   PUBLIC_SUPABASE_URL=...
   PUBLIC_SUPABASE_ANON_KEY=...
   ```
3. Restart dev server: `pnpm dev`
4. Hard refresh browser: `Ctrl+Shift+R` or `Cmd+Shift+R`

### "Session not found" or "Invalid invite code"

**Solutions:**
1. Verify invite code is correct (6 characters, uppercase)
2. Make sure hider created session first before seeker joins
3. Check session hasn't ended
4. Try creating a new session

### Location not updating

**Error:** "No GPS" shown for a player

**Solutions:**
1. Check browser location permission:
   - Click lock icon in address bar
   - Set Location to "Allow"
   - Refresh page
2. Verify device has GPS or network location enabled
3. Wait 5-10 seconds (location updates every 5 seconds)
4. Check browser console for errors (F12 → Console)

### Real-time updates not working

**Symptoms:** Questions or timers not syncing between devices

**Solutions:**
1. Check internet connection on all devices
2. Verify Supabase project is active (check https://supabase.com)
3. Refresh page to re-subscribe to real-time updates
4. Check browser console for WebSocket errors
5. Try incognito/private browsing mode
6. Restart dev server and browser

### Questions not appearing

**Solutions:**
1. Verify seeker has location permission enabled
2. Check all players connected to same session
3. Look for error messages in browser console (F12)
4. Try asking question again
5. Refresh page

### Error: "Failed to join session"

**Common causes:**
1. Invite code already used by same user (you can't join twice with same account)
   - Solution: Clear browser cookies → reload page → try joining
2. System is out of session capacity
   - Solution: Create new session
3. Database connection issue
   - Solution: Refresh page, check internet connection

### Browser shows "Allow location?" - but I want to hide it

**To disable location tracking:**
1. Open browser settings
2. Find location permissions
3. Set to "Block" for your app
4. Reload page

**Note:** Game still works without location, but questions won't be placed correctly.

---

## API Reference

### Session Management

#### Create Session
```typescript
import { createSession } from "@/lib/multiplayer-api";

const { sessionId, inviteCode } = await createSession(userId);
// inviteCode: "ABC123" (6 characters)
```

#### Join Session
```typescript
import { joinSession } from "@/lib/multiplayer-api";

await joinSession(sessionId, userId, username, "seeker");
```

#### Get Session by Code
```typescript
import { getSessionByInviteCode } from "@/lib/multiplayer-api";

const session = await getSessionByInviteCode("ABC123");
```

### Questions

#### Ask Question
```typescript
import { addQuestion } from "@/lib/multiplayer-api";

await addQuestion(
  sessionId,
  seekerId,
  "radius", // question type
  "Is within 10km?",
  { latitude: 35.6762, longitude: 139.6503 }, // seeker location
  "Waiting for answer..."
);
```

#### Update Answer
```typescript
import { updateQuestionAnswer } from "@/lib/multiplayer-api";

await updateQuestionAnswer(questionId, "YES");
```

### Timers

#### Create Timer
```typescript
import { createTimer } from "@/lib/multiplayer-api";

const timer = await createTimer(
  sessionId,
  "Curse of Passenger Princess",
  60 * 60 * 1000 // 60 minutes in milliseconds
);
```

#### Update Timer
```typescript
import { updateTimer } from "@/lib/multiplayer-api";

await updateTimer(timerId, true); // Resume/activate
await updateTimer(timerId, false); // Pause
```

#### Delete Timer
```typescript
import { deleteTimer } from "@/lib/multiplayer-api";

await deleteTimer(timerId);
```

### Real-time Subscriptions

#### Subscribe to Players
```typescript
import { useRealtimePlayers } from "@/hooks/use-multiplayer";

export function MyComponent() {
  useRealtimePlayers(); // Subscribes and updates automatically
}
```

#### Subscribe to Questions
```typescript
import { useRealtimeQuestions } from "@/hooks/use-multiplayer";

export function MyComponent() {
  useRealtimeQuestions();
}
```

#### Subscribe to Timers
```typescript
import { useRealtimeTimers } from "@/hooks/use-multiplayer";

export function MyComponent() {
  useRealtimeTimers();
}
```

---

## Database Schema

### sessions
```sql
CREATE TABLE sessions (
  id UUID PRIMARY KEY,
  created_at TIMESTAMP,
  status TEXT, -- 'waiting' | 'active' | 'ended'
  hider_id UUID, -- Foreign key to auth.users
  invite_code TEXT UNIQUE -- e.g. "ABC123"
);
```

### players
```sql
CREATE TABLE players (
  id UUID PRIMARY KEY,
  session_id UUID REFERENCES sessions(id),
  user_id UUID REFERENCES auth.users(id),
  role TEXT, -- 'hider' | 'seeker'
  current_location JSONB, -- { latitude, longitude }
  username TEXT,
  created_at TIMESTAMP
);
```

### questions
```sql
CREATE TABLE questions (
  id UUID PRIMARY KEY,
  session_id UUID REFERENCES sessions(id),
  seeker_id UUID REFERENCES auth.users(id),
  question_type TEXT, -- 'radius', 'matching', 'measuring', etc
  question_text TEXT, -- "Is within 10km?"
  location JSONB, -- { latitude, longitude } - seeker location
  answer TEXT, -- "YES", "NO", "5km", etc.
  created_at TIMESTAMP
);
```

### timers
```sql
CREATE TABLE timers (
  id UUID PRIMARY KEY,
  session_id UUID REFERENCES sessions(id),
  title TEXT,
  duration_ms INTEGER,
  started_at TIMESTAMP,
  is_active BOOLEAN
);
```

---

## Advanced Configuration

### Environment Variables

Optional variables you can add to `.env.local`:

```env
# Required
PUBLIC_SUPABASE_URL=...
PUBLIC_SUPABASE_ANON_KEY=...

# Optional - for debugging
PUBLIC_DEBUG_MODE=true
```

### Customization

To modify question types or auto-answer behavior:

1. Edit `/src/lib/question-answerer.ts`
2. Update the `computeQuestionAnswer()` function
3. Add your custom question logic
4. Restart dev server

### Changing Timers

Timer duration is in milliseconds:
- 1 minute = `60 * 1000 = 60000`
- 1 hour = `60 * 60 * 1000 = 3600000`
- 5 hours = `5 * 60 * 60 * 1000 = 18000000`

---

## Limits & Constraints

**Free Supabase Tier:**
- Database: 500MB
- Real-time connections: 10 concurrent
- API Requests: Unlimited
- Realtime messages: Unlimited

**Recommended Usage:**
- Max 10 players per session (due to real-time connection limit)
- Max 50 questions per session
- Sessions auto-expire after 24 hours

---

## Security Notes

### What's Transmitted to Server
- ✅ Seeker locations (needed for questions)
- ✅ Question answers
- ✅ Timer states
- ✅ Player usernames

### What's NOT Transmitted to Server
- ❌ Hider's actual location coordinates
- ❌ Authentication tokens (only anonymous sessions)
- ❌ Question computation data
- ❌ Any private user data

### Row-Level Security (RLS)
- Each user can only see sessions they're part of
- Users can only update their own data
- Seekers cannot query hider's location
- Database enforces all permissions

---

## Performance Tips

### For Better Real-time Sync
1. Use wired internet when possible (WiFi can be slower)
2. Minimize number of browser tabs open
3. Close other apps using network bandwidth
4. Use at least 4G mobile connection (LTE/5G preferred)

### For Longer Sessions
1. Disable location tracking when not needed (browser settings)
2. Close app occasionally to refresh connections
3. Avoid having too many questions (50+ questions may slow down app)

### For Mobile Devices
1. Enable high accuracy location (battery intensive but most accurate)
2. Keep screen on during play (settings)
3. Close browser tabs you don't need
4. Use newer phones (better GPS and battery)

---

## Next Steps

1. **Set up Supabase** (follow steps above)
2. **Configure .env.local**
3. **Run `pnpm install && pnpm dev`**
4. **Test with two browsers/devices**
5. **Invite friends to play!**

---

## Support & Debugging

### Enable Debug Mode
Add to `.env.local`:
```env
PUBLIC_DEBUG_MODE=true
```

### Check Logs
1. Open browser Dev Tools (F12)
2. Go to Console tab
3. Look for any error messages
4. Share errors when asking for help

### Common Error Messages

| Error | Cause | Fix |
|-------|-------|-----|
| "Missing Supabase environment variables" | .env.local not set | Create .env.local with your keys |
| "Invalid invite code" | Wrong code | Check code is 6 chars, uppercase |
| "Session not found" | Session ended or doesn't exist | Create new session |
| "No location" | GPS permission denied | Grant location permission in browser |
| "Real-time not syncing" | WebSocket disconnected | Refresh page |

---

## Architecture Decisions

### Why Supabase?
- Free tier is generous
- PostgreSQL = powerful queries
- Real-time subscriptions built-in
- Row-Level Security for privacy
- Easy to set up (~5 minutes)
- No backend server needed

### Why Not Firebase?
- Harder to hide hider location
- More complex to implement RLS
- Less flexible than SQL

### Why WebSocket Real-time?
- Instant updates (no polling delay)
- Efficient network usage
- Scalable to many players
- Mobile-friendly

### Why Nanostores?
- Lightweight (~1KB)
- No unnecessary re-renders
- Perfect for synced state
- Works with React and Astro

---

## FAQ

**Q: Can I host this myself?**  
A: Not recommended for production (requires backend), but possible. You'd need to deploy the frontend to Vercel/Netlify and have a backend service for auth.

**Q: Is my location tracked by you?**  
A: No. All data stays in your own Supabase project. We have no access.

**Q: Can the hider see seekers' locations?**  
A: Yes, that's intended - they need to know where seekers are asking from.

**Q: Can seekers see hider's location?**  
A: No, never. Only answers to questions are shown.

**Q: How many players can play?**  
A: Up to ~10 on free tier. More if you upgrade Supabase.

**Q: What happens if someone disconnects?**  
A: They remain in the session. They'll reconnect when network returns.

**Q: Can I use this offline?**  
A: No, real-time sync requires internet.

**Q: Can I save game history?**  
A: Not yet, but you can take screenshots. This is a planned feature.

---

## Roadmap

### Short Term (Next Month)
- [ ] Game statistics and scoring
- [ ] Better question auto-answering
- [ ] Game history replay
- [ ] More timer presets

### Medium Term (Next Quarter)
- [ ] User accounts and leaderboards
- [ ] Mobile app (React Native)
- [ ] Custom question templates
- [ ] Chat system

### Long Term
- [ ] Integration with actual Jet Lag episodes
- [ ] Tournament mode
- [ ] Streaming integration
- [ ] AI opponent (single-player)

---

## Contributing

Want to help improve this? Check out the GitHub repo:
**https://github.com/taibeled/JetLagHideAndSeek**

---

**Good luck and have fun playing! 🎮🌍**

Last Updated: March 28, 2026  
Version: 1.0.0
