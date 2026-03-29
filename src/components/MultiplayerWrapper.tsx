import React, { useEffect, useRef, useState } from "react";
import { useStore } from "@nanostores/react";
import { authUser, currentSessionId, currentUserRole, sessionQuestions, sessionSettings, gamePhase, phaseStartedAt } from "@/lib/multiplayer-context";
import {
	useRealtimePlayers,
	useRealtimeQuestions,
	useRealtimeTimers,
	useRealtimeGamePhase,
} from "@/hooks/use-multiplayer";
import { SessionManager } from "@/components/SessionManager";
import { TimerPanel } from "@/components/TimerPanel";
import { HidingTimer } from "@/components/HidingTimer";
import { SeekingTimer } from "@/components/SeekingTimer";
import { QuestionPanel } from "@/components/QuestionInterface";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { updatePlayerLocation, updateQuestionAnswer } from "@/lib/multiplayer-api";
import { supabase } from "@/lib/supabase";
import { hiderMode, questions as mapQuestions } from "@/lib/context";
import { computeQuestionAnswer } from "@/lib/question-answerer";

export function MultiplayerWrapper({ children }: { children: React.ReactNode }) {
	const user = useStore(authUser);
	const sessionId = useStore(currentSessionId);
	const role = useStore(currentUserRole);
	const syncedQuestions = useStore(sessionQuestions);
	const settings = useStore(sessionSettings);
	const [showSessionManager, setShowSessionManager] = useState(false);
	const [currentLocation, setCurrentLocation] = useState<
		{ latitude: number; longitude: number } | undefined
	>();
	const [playerId, setPlayerId] = useState<string | null>(null);
	const answeringQuestionIdsRef = useRef<Set<string>>(new Set());

	// Subscribe to realtime updates when in a session
	useRealtimePlayers();
	useRealtimeQuestions();
	useRealtimeTimers();
	useRealtimeGamePhase();

	// Get player ID from current session
	useEffect(() => {
		if (!sessionId || !user) {
			setPlayerId(null);
			sessionSettings.set(null);
			gamePhase.set("waiting");
			phaseStartedAt.set(null);
			return;
		}

		// Fetch the player ID for current user in this session
		supabase
			.from("players")
			.select("id, role, sessions(settings, game_phase, phase_started_at)")
			.eq("session_id", sessionId)
			.eq("user_id", user.id)
			.single()
			.then(({ data, error }: any) => {
				if (error) {
					console.error("Failed to fetch player ID:", error);
					return;
				}
				if (data) {
					setPlayerId(data.id);
					currentUserRole.set(data.role ?? null);
					sessionSettings.set(data?.sessions?.settings ?? null);
					gamePhase.set(data?.sessions?.game_phase ?? "waiting");
					phaseStartedAt.set(data?.sessions?.phase_started_at ?? null);
				}
			});
	}, [sessionId, user]);

	// Track user's location when in a session
	useEffect(() => {
		if (!sessionId || !playerId) return;

		// Request permission to access location
		if (!("geolocation" in navigator)) {
			console.warn("Geolocation not available");
			return;
		}

		// Get initial location
		navigator.geolocation.getCurrentPosition(
			(position) => {
				const { latitude, longitude } = position.coords;
				setCurrentLocation({ latitude, longitude });
				if (role !== "hider") {
					updatePlayerLocation(playerId, latitude, longitude);
				}
			},
			(error) => {
				console.error("Location error:", error);
			}
		);

		// Watch location continuously
		const watchId = navigator.geolocation.watchPosition(
			(position) => {
				const { latitude, longitude } = position.coords;
				setCurrentLocation({ latitude, longitude });
				if (role !== "hider") {
					updatePlayerLocation(playerId, latitude, longitude);
				}
			},
			(error) => {
				console.error("Location watch error:", error);
			},
			{
				enableHighAccuracy: true,
				timeout: 10000,
				maximumAge: 5000,
			}
		);

		return () => {
			navigator.geolocation.clearWatch(watchId);
		};
	}, [sessionId, playerId, role]);

	// Show session manager if user is logged in but no session selected
	useEffect(() => {
		if (user && !sessionId) {
			setShowSessionManager(true);
		}
	}, [user, sessionId]);

	// Never expose local hider marker state for seekers in multiplayer.
	useEffect(() => {
		if (sessionId && role === "seeker") {
			hiderMode.set(false);
		}
	}, [sessionId, role]);

	// Keep map boundary calculations in sync by applying shared question payloads.
	useEffect(() => {
		if (!sessionId) return;

		const sharedPayloads = syncedQuestions
			.filter((q: any) => q.question_data)
			.map((q: any) => q.question_data);

		if (sharedPayloads.length === 0) return;

		mapQuestions.set(sharedPayloads as any);
	}, [sessionId, syncedQuestions]);

	// Keep hider auto-answer behavior even without the old hider dashboard UI.
	useEffect(() => {
		if (!sessionId || role !== "hider" || !currentLocation) return;

		const unanswered = syncedQuestions.filter(
			(q: any) => q.answer === "Waiting for answer..."
		);

		for (const question of unanswered) {
			if (answeringQuestionIdsRef.current.has(question.id)) continue;
			answeringQuestionIdsRef.current.add(question.id);

			computeQuestionAnswer(question, currentLocation)
				.then((answer) => updateQuestionAnswer(question.id, answer))
				.catch((error) => {
					console.error("Failed to auto-answer question:", error);
				})
				.finally(() => {
					answeringQuestionIdsRef.current.delete(question.id);
				});
		}
	}, [sessionId, role, currentLocation, syncedQuestions]);

	return (
		<ErrorBoundary>
			{children}

			{/* Multiplayer UI overlays */}
			{sessionId && (
				<ErrorBoundary>
					<HidingTimer />
					<SeekingTimer />
					<QuestionPanel currentLocation={currentLocation} />
					<TimerPanel />
				</ErrorBoundary>
			)}

			{/* Session Manager Modal */}
			<SessionManager open={showSessionManager} onClose={() => setShowSessionManager(false)} />
		</ErrorBoundary>
	);
}
