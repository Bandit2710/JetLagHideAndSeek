import { atom, computed } from "nanostores";
import type { Session, User } from "@supabase/supabase-js";

export const authUser = atom<User | null>(null);
export const authSession = atom<Session | null>(null);

export const currentSessionId = atom<string | null>(null);
export const currentUserRole = atom<"hider" | "seeker" | null>(null);
export const sessionStatus = atom<"waiting" | "active" | "ended">("waiting");
export const sessionSettings = atom<{ enabledQuestionTypes?: string[]; hidingDurationMinutes?: number } | null>(null);
export const gamePhase = atom<"waiting" | "hiding" | "seeking" | "ended">("waiting");
export const phaseStartedAt = atom<string | null>(null);

// Player data
export interface PlayerData {
	id: string;
	user_id?: string;
	username: string;
	role: "hider" | "seeker";
	current_location?: { latitude: number; longitude: number };
	created_at: string;
}

export const sessionPlayers = atom<PlayerData[]>([]);
export const hiderLocation = atom<{
	latitude: number;
	longitude: number;
} | null>(null);

// Questions
export interface QuestionData {
	id: string;
	question_type: string;
	question_text: string;
	location: { latitude: number; longitude: number };
	question_data?: any;
	answer: string;
	created_at: string;
}

export const sessionQuestions = atom<QuestionData[]>([]);

// Timers
export interface TimerData {
	id: string;
	question_id?: string;
	title: string;
	duration_ms: number;
	started_at: string;
	is_active: boolean;
}

export const sessionTimers = atom<TimerData[]>([]);

// Derived stores
export const isHider = computed(currentUserRole, (role) => role === "hider");
export const isSeeker = computed(currentUserRole, (role) => role === "seeker");

export const otherPlayers = computed(
	[sessionPlayers, authUser],
	(players: PlayerData[], user: User | null) => {
		return players.filter((p: PlayerData) => p.id !== user?.id);
	}
);

export const gameActive = computed(
	sessionStatus,
	(status) => status === "active"
);
