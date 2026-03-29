import { useEffect } from "react";
import { useStore } from "@nanostores/react";
import { supabase } from "@/lib/supabase";
import {
	sessionPlayers,
	sessionQuestions,
	sessionTimers,
	hiderLocation,
	currentSessionId,
	sessionStatus,
} from "@/lib/multiplayer-context";
import type { PlayerData, QuestionData, TimerData } from "@/lib/multiplayer-context";

/**
 * Subscribe to real-time player updates in a session
 */
export function useRealtimePlayers() {
	const sessionId = useStore(currentSessionId);

	useEffect(() => {
		if (!sessionId) return;

		const loadPlayers = async () => {
			const { data } = await supabase
				.from("players")
				.select("*")
				.eq("session_id", sessionId);

			if (data) {
				sessionPlayers.set(data as PlayerData[]);
			}
		};

		loadPlayers();

		const channel = supabase
			.channel(`session:${sessionId}:players`)
			.on(
				"postgres_changes",
				{
					event: "*",
					schema: "public",
					table: "players",
					filter: `session_id=eq.${sessionId}`,
				},
				async (payload: any) => {
					// Fetch updated player list
					const { data } = await supabase
						.from("players")
						.select("*")
						.eq("session_id", sessionId);

					if (data) {
						sessionPlayers.set(data as PlayerData[]);
					}

					// If hider's location changed, update hider location
					if (payload.eventType === "UPDATE") {
						const player = payload.new as any;
						if (player.role === "hider" && player.current_location) {
							// Note: seekers won't see this, hider tracking separate
						}
					}
				}
			)
			.subscribe();

		return () => {
			channel.unsubscribe();
		};
	}, [sessionId]);
}

/**
 * Subscribe to real-time question updates in a session
 */
export function useRealtimeQuestions() {
	const sessionId = useStore(currentSessionId);

	useEffect(() => {
		if (!sessionId) return;

		const loadQuestions = async () => {
			const { data } = await supabase
				.from("questions")
				.select("*")
				.eq("session_id", sessionId)
				.order("created_at", { ascending: false });

			if (data) {
				sessionQuestions.set(data as QuestionData[]);
			}
		};

		loadQuestions();

		const channel = supabase
			.channel(`session:${sessionId}:questions`)
			.on(
				"postgres_changes",
				{
					event: "*",
					schema: "public",
					table: "questions",
					filter: `session_id=eq.${sessionId}`,
				},
				async (payload: any) => {
					const { data } = await supabase
						.from("questions")
						.select("*")
						.eq("session_id", sessionId)
						.order("created_at", { ascending: false });

					if (data) {
						sessionQuestions.set(data as QuestionData[]);
					}
				}
			)
			.subscribe();

		return () => {
			channel.unsubscribe();
		};
	}, [sessionId]);
}

/**
 * Subscribe to real-time timer updates in a session
 */
export function useRealtimeTimers() {
	const sessionId = useStore(currentSessionId);

	useEffect(() => {
		if (!sessionId) return;

		const loadTimers = async () => {
			const { data } = await supabase
				.from("timers")
				.select("*")
				.eq("session_id", sessionId)
				.order("started_at", { ascending: true });

			if (data) {
				sessionTimers.set(data as TimerData[]);
			}
		};

		loadTimers();

		const channel = supabase
			.channel(`session:${sessionId}:timers`)
			.on(
				"postgres_changes",
				{
					event: "*",
					schema: "public",
					table: "timers",
					filter: `session_id=eq.${sessionId}`,
				},
				async (payload: any) => {
					const { data } = await supabase
						.from("timers")
						.select("*")
						.eq("session_id", sessionId)
						.order("started_at", { ascending: true });

					if (data) {
						sessionTimers.set(data as TimerData[]);
					}
				}
			)
			.subscribe();

		return () => {
			channel.unsubscribe();
		};
	}, [sessionId]);
}

/**
 * Subscribe to hider's location (only hider sees this)
 */
export function useHiderLocation() {
	const sessionId = useStore(currentSessionId);

	useEffect(() => {
		if (!sessionId) return;

		const channel = supabase
			.channel(`session:${sessionId}:hider-location`)
			.on(
				"postgres_changes",
				{
					event: "UPDATE",
					schema: "public",
					table: "players",
					filter: `session_id=eq.${sessionId}`,
				},
				(payload: any) => {
					const player = payload.new as any;
					if (player.role === "hider" && player.current_location) {
						hiderLocation.set(player.current_location);
					}
				}
			)
			.subscribe();

		return () => {
			channel.unsubscribe();
		};
	}, [sessionId]);
}
