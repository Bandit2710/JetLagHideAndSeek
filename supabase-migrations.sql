-- Create sessions table
CREATE TABLE IF NOT EXISTS public.sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  status TEXT DEFAULT 'waiting' NOT NULL CHECK (status IN ('waiting', 'active', 'ended')),
  hider_id UUID,
  settings JSONB,
  invite_code TEXT UNIQUE NOT NULL,
  FOREIGN KEY (hider_id) REFERENCES auth.users(id) ON DELETE SET NULL
);

ALTER TABLE public.sessions ADD COLUMN IF NOT EXISTS settings JSONB;

-- Create players table
CREATE TABLE IF NOT EXISTS public.players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('hider', 'seeker')),
  current_location JSONB,
  username TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  UNIQUE(session_id, user_id)
);

-- Create questions table
CREATE TABLE IF NOT EXISTS public.questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  seeker_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  question_type TEXT NOT NULL,
  question_text TEXT NOT NULL,
  location JSONB NOT NULL,
  question_data JSONB,
  answer TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

ALTER TABLE public.questions ADD COLUMN IF NOT EXISTS question_data JSONB;

-- Create timers table
CREATE TABLE IF NOT EXISTS public.timers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  duration_ms INTEGER NOT NULL,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  is_active BOOLEAN DEFAULT true NOT NULL
);

-- Enable RLS (Row Level Security)
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.players ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.timers ENABLE ROW LEVEL SECURITY;

-- Helper to check whether the current user is a member of a session.
-- SECURITY DEFINER avoids recursive RLS checks on public.players.
CREATE OR REPLACE FUNCTION public.is_session_member(target_session_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.players p
    WHERE p.session_id = target_session_id
      AND p.user_id = auth.uid()
  );
$$;

REVOKE ALL ON FUNCTION public.is_session_member(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_session_member(UUID) TO authenticated;

-- RLS Policies for sessions
DROP POLICY IF EXISTS "Users can view sessions they're part of" ON public.sessions;
DROP POLICY IF EXISTS "Users can create sessions" ON public.sessions;
DROP POLICY IF EXISTS "Hider can update their session" ON public.sessions;

CREATE POLICY "Users can view sessions they're part of" ON public.sessions FOR SELECT
  USING (
    hider_id = auth.uid()
    OR public.is_session_member(id)
    OR auth.role() = 'authenticated'
  );

CREATE POLICY "Users can create sessions" ON public.sessions FOR INSERT
  WITH CHECK (
    hider_id = auth.uid()
  );

CREATE POLICY "Hider can update their session" ON public.sessions FOR UPDATE
  USING (hider_id = auth.uid());

-- RLS Policies for players
DROP POLICY IF EXISTS "Users can view players in their sessions" ON public.players;
DROP POLICY IF EXISTS "Users can insert themselves as a player" ON public.players;
DROP POLICY IF EXISTS "Users can update their own player data" ON public.players;

CREATE POLICY "Users can view players in their sessions" ON public.players FOR SELECT
  USING (public.is_session_member(session_id));

CREATE POLICY "Users can insert themselves as a player" ON public.players FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own player data" ON public.players FOR UPDATE
  USING (user_id = auth.uid());

-- RLS Policies for questions
DROP POLICY IF EXISTS "Users can view questions in their sessions" ON public.questions;
DROP POLICY IF EXISTS "Seekers can create questions" ON public.questions;

CREATE POLICY "Users can view questions in their sessions" ON public.questions FOR SELECT
  USING (public.is_session_member(session_id));

CREATE POLICY "Seekers can create questions" ON public.questions FOR INSERT
  WITH CHECK (
    seeker_id = auth.uid() 
    AND public.is_session_member(session_id)
  );

-- RLS Policies for timers
DROP POLICY IF EXISTS "Users can view timers in their sessions" ON public.timers;
DROP POLICY IF EXISTS "Anyone in session can create/update timers" ON public.timers;
DROP POLICY IF EXISTS "Anyone in session can update timers" ON public.timers;

CREATE POLICY "Users can view timers in their sessions" ON public.timers FOR SELECT
  USING (public.is_session_member(session_id));

CREATE POLICY "Anyone in session can create/update timers" ON public.timers FOR INSERT
  WITH CHECK (
    public.is_session_member(session_id)
  );

CREATE POLICY "Anyone in session can update timers" ON public.timers FOR UPDATE
  USING (public.is_session_member(session_id));

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_players_session ON public.players(session_id);
CREATE INDEX IF NOT EXISTS idx_players_user ON public.players(user_id);
CREATE INDEX IF NOT EXISTS idx_questions_session ON public.questions(session_id);
CREATE INDEX IF NOT EXISTS idx_questions_created ON public.questions(created_at);
CREATE INDEX IF NOT EXISTS idx_timers_session ON public.timers(session_id);
