import { supabase } from "@/lib/supabase";
import type { Tables } from "@supabase/supabase-js";
import type { RealtimeChannel } from "@supabase/supabase-js";

/**
 * Generate a unique invite code for a session
 */
function generateInviteCode(): string {
	return Math.random().toString(36).substring(2, 8).toUpperCase();
}

/**
 * Create a new multiplayer session
 */
export async function createSession(userId: string) {
	const inviteCode = generateInviteCode();

	const { data: session, error } = await supabase
		.from("sessions")
		.insert({
			invite_code: inviteCode,
			hider_id: userId,
		})
		.select("id")
		.single();

	if (error) {
		throw new Error(`Failed to create session: ${error.message}`);
	}

	// Add creator as hider
	await supabase.from("players").insert({
		session_id: session.id,
		user_id: userId,
		username: "You",
		role: "hider",
	});

	return { sessionId: session.id, inviteCode };
}

/**
 * Create a new multiplayer session with optional saved round settings
 */
export async function createSessionWithSettings(
	userId: string,
	settings?: { enabledQuestionTypes?: string[] }
) {
	const inviteCode = generateInviteCode();

	const { data: session, error } = await supabase
		.from("sessions")
		.insert({
			invite_code: inviteCode,
			hider_id: userId,
			settings: settings ?? null,
		})
		.select("id, settings")
		.single();

	if (error) {
		throw new Error(`Failed to create session: ${error.message}`);
	}

	// Add creator as hider
	await supabase.from("players").insert({
		session_id: session.id,
		user_id: userId,
		username: "You",
		role: "hider",
	});

	return { sessionId: session.id, inviteCode };
}

/**
 * Join an existing session
 */
export async function joinSession(
	sessionId: string,
	userId: string,
	username: string,
	role: "hider" | "seeker" = "seeker"
) {
	// Check if session exists
	const { data: session, error: sessionError } = await supabase
		.from("sessions")
		.select("id")
		.eq("id", sessionId)
		.single();

	if (sessionError || !session) {
		throw new Error("Session not found");
	}

	// Add player to session
	const { error } = await supabase.from("players").insert({
		session_id: sessionId,
		user_id: userId,
		username,
		role,
	});

	if (error) {
		if (error.code === "23505") {
			// Unique constraint violation - user already in session
			throw new Error("You are already in this session");
		}
		throw new Error(`Failed to join session: ${error.message}`);
	}

	return sessionId;
}

/**
 * Get sessions by invite code
 */
export async function getSessionByInviteCode(inviteCode: string) {
	const { data, error } = await supabase
		.from("sessions")
		.select("id, status, settings")
		.eq("invite_code", inviteCode)
		.single();

	if (error) {
		if (error.code === "PGRST116") {
			throw new Error("Invalid invite code");
		}
		throw new Error(`Failed to find session: ${error.message}`);
	}

	return data;
}

/**
 * Update player's current location
 */
export async function updatePlayerLocation(
	playerId: string,
	latitude: number,
	longitude: number
) {
	const { error } = await supabase
		.from("players")
		.update({
			current_location: { latitude, longitude },
		})
		.eq("id", playerId);

	if (error) {
		console.error("Failed to update location:", error);
	}
}

/**
 * Get or create a player record for current user in a session
 */
export async function getOrCreatePlayer(
	sessionId: string,
	userId: string,
	username: string
) {
	// Try to get existing player
	const { data: existing } = await supabase
		.from("players")
		.select("*")
		.eq("session_id", sessionId)
		.eq("user_id", userId)
		.single();

	if (existing) {
		return existing;
	}

	// Create new player as seeker
	const { data: newPlayer, error } = await supabase
		.from("players")
		.insert({
			session_id: sessionId,
			user_id: userId,
			username,
			role: "seeker",
		})
		.select()
		.single();

	if (error) {
		throw new Error(`Failed to create player: ${error.message}`);
	}

	return newPlayer;
}

/**
 * Start gameplay session (transition from waiting to active)
 */
export async function startSession(sessionId: string) {
	const { error } = await supabase
		.from("sessions")
		.update({ status: "active" })
		.eq("id", sessionId);

	if (error) {
		throw new Error(`Failed to start session: ${error.message}`);
	}
}

/**
 * End gameplay session
 */
export async function endSession(sessionId: string) {
	const { error } = await supabase
		.from("sessions")
		.update({ status: "ended" })
		.eq("id", sessionId);

	if (error) {
		throw new Error(`Failed to end session: ${error.message}`);
	}
}

/**
 * Add a question to a session
 */
export async function addQuestion(
	sessionId: string,
	seekerId: string,
	questionType: string,
	questionText: string,
	location: { latitude: number; longitude: number },
	answer: string,
	questionData?: any
) {
	const { data, error } = await supabase
		.from("questions")
		.insert({
			session_id: sessionId,
			seeker_id: seekerId,
			question_type: questionType,
			question_text: questionText,
			location,
			question_data: questionData ?? null,
			answer,
		})
		.select()
		.single();

	if (error) {
		throw new Error(`Failed to add question: ${error.message}`);
	}

	return data;
}

/**
 * Create or get a timer in a session
 */
export async function createTimer(
	sessionId: string,
	title: string,
	durationMs: number
) {
	const { data, error } = await supabase
		.from("timers")
		.insert({
			session_id: sessionId,
			title,
			duration_ms: durationMs,
			is_active: true,
		})
		.select()
		.single();

	if (error) {
		throw new Error(`Failed to create timer: ${error.message}`);
	}

	return data;
}

/**
 * Update timer state (pause/resume)
 */
export async function updateTimer(
	timerId: string,
	isActive: boolean,
	durationMs?: number
) {
	const updates: any = { is_active: isActive };
	if (durationMs !== undefined) {
		updates.duration_ms = durationMs;
	}

	const { error } = await supabase
		.from("timers")
		.update(updates)
		.eq("id", timerId);

	if (error) {
		throw new Error(`Failed to update timer: ${error.message}`);
	}
}

/**
 * Delete a timer
 */
export async function deleteTimer(timerId: string) {
	const { error } = await supabase
		.from("timers")
		.delete()
		.eq("id", timerId);

	if (error) {
		throw new Error(`Failed to delete timer: ${error.message}`);
	}
}

/**
 * Update a question's answer
 */
export async function updateQuestionAnswer(questionId: string, answer: string) {
	const { error } = await supabase
		.from("questions")
		.update({ answer })
		.eq("id", questionId);

	if (error) {
		throw new Error(`Failed to update question answer: ${error.message}`);
	}
}

/**
 * Delete a question and any linked question timer rows
 */
export async function deleteQuestion(questionId: string) {
	const { error: timerError } = await supabase
		.from("timers")
		.delete()
		.eq("question_id", questionId);

	if (timerError) {
		console.error("Failed to delete linked timers:", timerError);
	}

	const { error } = await supabase
		.from("questions")
		.delete()
		.eq("id", questionId);

	if (error) {
		throw new Error(`Failed to delete question: ${error.message}`);
	}
}
