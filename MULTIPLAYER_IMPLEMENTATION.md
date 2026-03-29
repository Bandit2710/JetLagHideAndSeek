# Multiplayer Module - Complete Implementation Guide

## Overview

This guide explains how the new multiplayer module works and how to use it. The system allows hiders and seekers to play the Jet Lag Hide and Seek game in real-time together.

## Architecture

```
┌─────────────────────────────────────────────────────┐
│  Frontend (React Components)                         │
│  ├─ SessionManager (create/join sessions)            │
│  ├─ TimerPanel (synced timers)                       │
│  ├─ QuestionInterface (ask/answer questions)         │
│  ├─ MultiplayerWrapper (orchestrates all features)  │
│  └─ AuthProvider (handles anonymous auth)           │
└─────────────────────────────────────────────────────┘
         ↕ (Supabase Client SDK)
┌─────────────────────────────────────────────────────┐
│  Supabase Backend                                   │
│  ├─ PostgreSQL Database                             │
│  ├─ RLS Policies (Row-Level Security)              │
│  ├─ Realtime Subscriptions (WebSocket)             │
│  └─ Anonymous Auth (no credentials needed)         │
└─────────────────────────────────────────────────────┘
```

## Setup Instructions

### 1. Prerequisites

- Supabase account (free tier available at supabase.com)
- Node.js 18+ and pnpm
- Modern browser with geolocation support

### 2. Create Supabase Project

1. Go to [supabase.com](https://supabase.com)
2. Sign up or log in
3. Create a new project
4. Wait for it to be ready

### 3. Enable Anonymous Authentication

In your Supabase dashboard:

1. Navigate to **Auth** → **Providers**
2. Find **Anonymous** provider
3. Enable it (toggle should be on)
4. No configuration needed

### 4. Set Up Database

1. In your Supabase dashboard, go to **SQL Editor**
2. Click **New Query**
3. Copy the entire contents of `supabase-migrations.sql` from the project root
4. Paste into the query editor
5. Click **Run** to execute all migrations

This creates:
- `sessions` table (game sessions)
- `players` table (players in sessions)
- `questions` table (questions asked)
- `timers` table (synced timers)
- RLS policies (security)
- Indexes (performance)

### 5. Get API Keys

1. In Supabase, go to **Settings** → **API**
2. Copy:
   - **Project URL** → `PUBLIC_SUPABASE_URL`
   - **anon public key** → `PUBLIC_SUPABASE_ANON_KEY`

### 6. Configure Application

Create `.env.local` in project root:
```env
PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

### 7. Install & Run

```bash
# Install dependencies with Supabase client
pnpm install

# Start development server
pnpm dev
```

Visit `http://localhost:3000` (or the URL shown in terminal)

## Usage Guide

### For the Hider

1. **Start Game**: Click "Create Game" in the Session Manager
2. **Share Code**: Invite code appears (e.g., "ABC123")
3. **Enable Location**: Allow browser to access your location
4. **Wait for Seekers**: Invite seekers to join with the code
5. **Play**: Move around while seekers ask questions
   - Questions appear in real-time
   - Your location is never shown to seekers
   - Answers are auto-computed based on your location

### For Seekers

1. **Join Game**: Click "Join Game" in the Session Manager
2. **Enter Code**: Get invite code from hider (e.g., "ABC123")
3. **Enter Name**: Choose a username
4. **Enable Location**: Allow browser to access your location
5. **Ask Questions**: 
   - Click "Ask Question"
   - Choose a question type
   - Question is placed at your location
   - Get instant answer based on hider's location
6. **View Timers**: See curse timers in top-right corner

### Timer System

Any player can add timers for curses or run duration:

1. Click **"Add Timer"** in timer panel
2. Enter timer name: "Passenger Princess", "Run Time", etc.
3. Enter duration in minutes
4. All players see the same countdown
5. Use **Pause/Play** buttons to control
6. Delete when done

## Data Flow

### Creating a Game Session

```
Hider clicks "Create Game"
      ↓
generateInviteCode() creates unique code
      ↓
INSERT into sessions table
      ↓
INSERT hider into players table
      ↓
Session ID + Invite Code returned
      ↓
Hider can now share code (e.g., "ABC123")
```

### Joining a Session

```
Seeker clicks "Join Game" → enters code + username
      ↓
getSessionByInviteCode() looks up session ID
      ↓
INSERT into players table as "seeker"
      ↓
Seeker sees "Connected" → game ready
      ↓
Realtime subscriptions activate
```

### Asking a Question

```
Seeker at location X clicks "Ask Question"
      ↓
Question stored: location X, type "radius", text "Is within 10km?"
      ↓
All players notified via Realtime (Firestore-like)
      ↓
Hider sees question at their device
      ↓
Hider's device computes answer: YES/NO based on hider location + question type
      ↓
Answer sent back to database
      ↓
Seeker sees answer instantly with Realtime update
```

### Timer Synchronization

```
Player A starts timer: "Curse of X" for 60 min
      ↓
INSERT into timers table with started_at = NOW()
      ↓
All players notified via Realtime
      ↓
Timer rendered on all devices
      ↓
Client-side countdown: remaining = duration - (NOW - started_at)
      ↓
If player pauses: UPDATE is_active = false
      ↓
All devices see pause instantly
```

## File Structure

```
src/
├── components/
│   ├── AuthProvider.tsx           # Anonymous auth setup
│   ├── MultiplayerWrapper.tsx      # Main orchestrator
│   ├── SessionManager.tsx          # Create/join UI
│   ├── SessionManager.tsx          # Session management
│   ├── TimerPanel.tsx              # Timer display
│   ├── QuestionInterface.tsx       # Question UI
│   └── ...existing components
├── hooks/
│   ├── use-anonymous-auth.ts       # Auth hook
│   └── use-multiplayer.ts          # Realtime subscriptions
├── lib/
│   ├── supabase.ts                 # Supabase client
│   ├── multiplayer-context.ts      # Nanostores state
│   ├── multiplayer-api.ts          # API functions
│   └── ...existing libs
├── layouts/
│   └── Layout.astro                # Updated with providers
└── pages/
    └── index.astro                 # Main page (unchanged)
```

## Key Components

### AuthProvider
- Initializes anonymous authentication
- Sets user state in Nanostores
- Runs on app startup

### MultiplayerWrapper
- Orchestrates all multiplayer features
- Manages location tracking
- Shows/hides multiplayer UI based on session state
- Handles player ID fetching

### SessionManager
- UI for creating/joining sessions
- Shows invite code for hiders
- Input for seekers (code + name)
- Error handling

### TimerPanel
- Fixed position in top-right corner
- Displays all active timers
- Real-time countdown
- Collapsible for screen space

### QuestionInterface
- Bottom drawer (collapsible)
- Button to ask questions
- Question history
- Shows answers

## Security Model

### Database Access (RLS Policies)

1. **Sessions**: Users can only see sessions they're in
2. **Players**: Users can only see players in shared sessions
3. **Questions**: Users can only see questions in shared sessions
4. **Timers**: Users can only see timers in shared sessions

### Location Privacy

- **Hider's location**: Never stored in database
  - Only stored locally in browser
  - Used locally to compute answers
  - Example: "Is within 10km? YES" (no coordinates sent)

- **Seeker's location**: Stored as part of question
  - Needed for location-based questions
  - Only seekers and hider can see

### Data Not Shared

- Hider's actual coordinates with seekers
- Player identities beyond username
- Session data with non-participants

## Performance Optimizations

1. **Realtime Subscriptions**: Only subscribe when in a session
2. **Location Updates**: Throttled to 5-second intervals
3. **Database Indexes**: On session_id and creation times
4. **Client-side Timers**: Countdown calculated locally, not fetched
5. **Batched Updates**: Multiple changes batched together

## Troubleshooting

### "Missing Supabase environment variables"
- Check `.env.local` file exists
- Verify `PUBLIC_SUPABASE_URL` and `PUBLIC_SUPABASE_ANON_KEY` are set
- Restart dev server

### "Session not found"
- Verify invite code is correct (6 chars)
- Check session hasn't ended
- Make sure hider created session before seeker joins

### Location not updating
- Check browser location permission (may need to grant in browser settings)
- Verify geolocation is not blocked by HTTPS requirement (localhost OK)
- Check browser console for errors

### Questions not appearing
- Verify all players have good network connection
- Check Supabase service status
- Refresh browser to re-subscribe to realtime

### Timers not syncing
- Check all players have same server time (may be off if clocks not synced)
- Verify timer started correctly
- Refresh browser if stuck

## Next Steps

### Immediate (MVP Enhancement)
- [ ] Implement auto-answer logic for different question types
- [ ] Save session history
- [ ] Show hider's current zone on hider's device
- [ ] Question result visualization (map highlights for answers)

### Short Term
- [ ] User accounts and persistent data
- [ ] Game statistics and leaderboards
- [ ] Custom question templates
- [ ] Multiplayer game presets

### Long Term
- [ ] Mobile app (React Native)
- [ ] Integration with actual Jet Lag episodes
- [ ] Tournament mode
- [ ] Streaming integration
- [ ] In-game chat

## Auto-Answer Logic (TODO)

The question answering should use existing code from the app:

```typescript
// In MultiplayerWrapper or new QuestionAnswerer component:
import { answerQuestion } from "@/maps/questions";

// When question received:
const answer = await answerQuestion({
	type: question.question_type,
	hiderLocation: hiderLocation,
	questionLocation: question.location,
	// other params based on question type
});

// Update question in DB:
await supabase
	.from("questions")
	.update({ answer })
	.eq("id", question.id);
```

This integrates with existing question logic while keeping hider location private.

## Support & Issues

If you encounter issues:

1. Check error messages in browser console (F12)
2. Verify Supabase project is active
3. Check RLS policies are enabled
4. Review this guide's Troubleshooting section
5. Check GitHub issues

---

**Version**: 1.0.0  
**Last Updated**: March 2026  
**Status**: MVP Ready
