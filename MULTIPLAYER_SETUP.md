# Supabase Configuration

To use multiplayer features, you need to set up a Supabase project.

## Setup Steps

1. **Create a Supabase Account**
   - Go to https://supabase.com
   - Sign up for a free account

2. **Create a New Project**
   - Click "New Project"
   - Choose a name (e.g., "jet-lag-multiplayer")
   - Create a password for the database
   - Select a region closest to you
   - Click "Create new project" and wait for it to be ready

3. **Get Your API Keys**
   - In your project, go to "Settings" → "API"
   - Copy your `Project URL` and `anon key`
   - These are your `PUBLIC_SUPABASE_URL` and `PUBLIC_SUPABASE_ANON_KEY`

4. **Set Up Database Schema**
   - In your Supabase project, go to "SQL Editor"
   - Click "New Query"
   - Paste the contents of `supabase-migrations.sql` from the root directory
   - Click "Run" to create all tables and policies

5. **Enable Authentication (Optional but Recommended)**
   - Go to "Auth" → "Providers"
   - Enable at least one provider (Google, GitHub, etc.)
   - Or use email/password authentication

6. **Add Environment Variables**
   - Create a `.env.local` file in the project root:
     ```
     PUBLIC_SUPABASE_URL=your_project_url
     PUBLIC_SUPABASE_ANON_KEY=your_anon_key
     ```

7. **Install Dependencies**
   ```bash
   pnpm install
   ```

8. **Start the Development Server**
   ```bash
   pnpm dev
   ```

## Features

### Multiplayer Session Management
- **Create Game**: Hider creates a session and gets an invite code
- **Join Game**: Seekers join using the invite code
- **Real-time Sync**: All players see updates instantly using Supabase Realtime

### Question System
- **Seekers ask questions** at their current location
- **Auto-answer**: Questions are answered based on hider's location
- **Question History**: All questions and answers are tracked

### Timer System
- **Synced Timers**: All players see the same countdown
- **Multiple Timers**: Support for different curses (e.g., "Passenger Princess" - 60 min)
- **Pause/Resume**: Control timer state from any player
- **Collapsible UI**: Timers panel can be collapsed to save screen space

### Security
- Row-Level Security (RLS) policies ensure:
  - Players can only see their own sessions
  - Seekers cannot see hider's actual location
  - Questions and answers are session-scoped

## Architecture

```
Frontend (React/Astro)
    ↓
Supabase Client (Real-time)
    ↓
Supabase Database (PostgreSQL)
    ↓
Realtime Subscriptions (WebSocket)
```

### Data Flow

1. **Session Creation**: Hider creates → generates invite code
2. **Joining**: Seekers join → added to players table
3. **Question Flow**:
   - Seeker clicks "Ask Question" at their location
   - Question stored in questions table
   - Hider device receives realtime update
   - Hider's location used to compute answer
   - Answer updated in questions table
   - Seeker sees answer update in realtime
4. **Timer Flow**:
   - Any player can create a timer
   - Timer stored with start time and duration
   - All players subscribe to timer updates
   - Client-side countdown shown to all players

## Troubleshooting

### "Missing Supabase environment variables"
- Make sure `.env.local` file exists with correct keys
- Restart the dev server after adding env variables

### "Session not found"
- Double-check the invite code (should be 6 characters)
- Make sure the session hasn't ended

### Real-time updates not showing
- Check browser console for errors
- Verify that Realtime is enabled in Supabase (it should be by default)
- Check network tab to see WebSocket connections

### CORS Errors
- Make sure your Supabase URL is correct
- Verify the anon key has public read/write permissions

## Security Notes

- The hider's location is **never** sent to the database
- Only the hider's device knows the true location
- Seekers only see question locations and answers
- All database access goes through RLS policies
- Never commit `.env.local` to version control

## Future Enhancements

- [ ] Authentication (sign up/login)
- [ ] User accounts and statistics
- [ ] Replay/history viewing
- [ ] Custom question templates
- [ ] Integration with actual Jet Lag games/episodes
- [ ] Leaderboards
