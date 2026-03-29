
# 🚀 QUICK REFERENCE - GET STARTED IN 7 MINUTES

## Phase 1: Supabase Setup (5 min)

### A. Create Project
1. Go to https://supabase.com → Sign up
2. Click "New Project" 
3. Name: `jet-lag-multiplayer`
4. Set password, pick region, choose "Free" tier
5. **Wait ~2 minutes** for it to be ready

### B. Enable Anonymous Auth
1. Click "Auth" → "Providers"
2. Find "Anonymous" and toggle **ON**
3. Done!

### C. Create Database
1. Click "SQL Editor" → "New Query"
2. Copy entire `supabase-migrations.sql` from project root
3. Paste into editor
4. Click **"Run"**
5. Done!

### D. Get Your Keys
1. Click "Settings" → "API"
2. Copy:
   - `Project URL` 
   - `anon public key`
3. Save them

---

## Phase 2: App Setup (2 min)

### A. Create .env.local
Create file `.env.local` in project root:
```env
PUBLIC_SUPABASE_URL=https://your-url.supabase.co
PUBLIC_SUPABASE_ANON_KEY=your-key-here
```

### B. Install & Run
```bash
pnpm install
pnpm dev
```
Then open http://localhost:3000

---

## Phase 3: Play!

### Hider
1. Click "Create Game" → Share the code
2. Allow location
3. Answer questions in bottom drawer

### Seeker
1. Click "Join Game" → Enter code + name
2. Allow location  
3. Click "Ask Question" → Get instant answer
4. Use map to narrow down location

### Both
- Add timers (top-right) for curses
- See other players' locations
- Chat via timer titles if needed

---

## 🐛 If Something Breaks

| Problem | Fix |
|---------|-----|
| "Missing Supabase..." | Check `.env.local` exists with correct values |
| "Session not found" | Verify code (6 chars), restart server |
| "No GPS" | Check browser location permission |
| "Updates not syncing" | Refresh page, check internet |

---

## 📚 Full Documentation

- **COMPLETE_GUIDE.md** - Full setup with troubleshooting
- **MULTIPLAYER_IMPLEMENTATION.md** - Architecture & how it works
- **MULTIPLAYER_SETUP.md** - Detailed Supabase guide
- **QUICKSTART.md** - 5-minute quick start

---

## 💡 Features

✅ Real-time multiplayer  
✅ Auto-answer questions  
✅ Synced timers  
✅ Location tracking (private hider location)  
✅ No accounts needed  
✅ Free to run  
✅ Mobile friendly  

---

## 🔗 Important Files

- `.env.local` - Your Supabase credentials
- `supabase-migrations.sql` - Database schema
- `src/components/SessionManager.tsx` - Create/join UI
- `src/components/HiderPanel.tsx` - Hider dashboard
- `src/components/TimerPanel.tsx` - Timer system
- `src/components/QuestionInterface.tsx` - Seeker questions

---

## ⏱️ Checklist

- [ ] Supabase project created
- [ ] Anonymous auth enabled
- [ ] Database schema applied
- [ ] Invite code appears
- [ ] API keys copied
- [ ] `.env.local` created
- [ ] `pnpm install` done
- [ ] `pnpm dev` running
- [ ] App loads at localhost:3000
- [ ] Can create game (shows code)
- [ ] Can join game (with code)
- [ ] Location tracking works
- [ ] Questions sync in real-time

---

**Ready? Start with Supabase Setup Phase 1! ➡️**
