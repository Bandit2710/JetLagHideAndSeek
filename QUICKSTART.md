# 🎮 Jet Lag Hide & Seek - Multiplayer Quick Start

## 5-Minute Setup

### Step 1: Create Supabase Project
1. Go to https://supabase.com and sign up (free)
2. Create a new project
3. Go to **Settings → API**
4. Copy `Project URL` and `anon public key`

### Step 2: Set Up Database
1. In Supabase, go to **SQL Editor**
2. Click **New Query**
3. Copy contents of `supabase-migrations.sql`
4. Paste and click **Run**

### Step 3: Configure App
1. Create `.env.local` in project root:
```
PUBLIC_SUPABASE_URL=<your Project URL>
PUBLIC_SUPABASE_ANON_KEY=<your anon key>
```

### Step 4: Install & Run
```bash
pnpm install
pnpm dev
```

### Step 5: Start Playing!

**On one device (Hider)**:
- Click "Create Game"
- Share the 6-character invite code

**On another device/tab (Seekers)**:
- Click "Join Game"  
- Enter invite code + your name
- Click "Join"

Done! Start asking questions.

## How It Works

### Hiders
- Your location is tracked locally (never shown to seekers)
- Allow browser location permission
- Move around, seekers ask questions
- Questions auto-answered based on your location

### Seekers
- Enter your name and hider's invite code
- Click "Ask Question" to place one at your location
- Get instant answer based on hider's location
- Can add timers for curses (top-right corner)

### Timers
- Click "Add Timer" (top-right)
- Enter name ("Curse of X", "Run Time", etc.)
- Enter duration (minutes)
- Synced across all players
- Use Pause/Play buttons or delete

## Features

✅ Real-time multiplayer (synced across all players)  
✅ Location-based questions (auto-answered)  
✅ Synced timers for curses  
✅ Simple invite system (no accounts needed)  
✅ Mobile-friendly  
✅ Private location data (hider's location never exposed)  

## Troubleshooting

### "Missing environment variables"
→ Check `.env.local` file exists and has correct values  
→ Restart dev server after creating file

### "Session not found"  
→ Verify invite code (6 characters, uppercase)  
→ Make sure hider created session first

### Location not showing
→ Allow browser location permission  
→ Check Firefox/Safari console for errors

### Changes not syncing
→ Check internet connection  
→ Refresh browser  
→ Restart dev server

## File Structure

New multiplayer files:
```
src/
├── components/
│   ├── SessionManager.tsx (create/join UI)
│   ├── TimerPanel.tsx (synced timers)
│   ├── QuestionInterface.tsx (ask questions)
│   ├── AuthProvider.tsx
│   └── MultiplayerWrapper.tsx
├── hooks/
│   ├── use-multiplayer.ts (realtime subs)
│   └── use-anonymous-auth.ts
└── lib/
    ├── supabase.ts (client)
    ├── multiplayer-context.ts (state)
    └── multiplayer-api.ts (functions)
```

## Next Steps

- Read `MULTIPLAYER_IMPLEMENTATION.md` for deep dive
- Read `MULTIPLAYER_SETUP.md` for troubleshooting
- Try it out with a friend!

## Testing Checklist

- [ ] Supabase project created
- [ ] Database schema applied  
- [ ] .env.local configured
- [ ] `pnpm install` completed
- [ ] `pnpm dev` running
- [ ] Hider can create game
- [ ] Seeker can join with code
- [  Location tracking working (check browser prompt)
- [ ] Questions appear in real-time
- [ ] Timers sync across devices

## Support

Check browser console (F12) for errors. Most issues are:
1. Missing/wrong env variables → check .env.local
2. Supabase project not ready → wait, refresh
3. Location permission denied → check browser settings
4. Realtime not syncing → refresh page

---

**Ready to go? Start with `pnpm dev` and create a game!** 🚀
