import React, { useEffect, useRef, useState } from "react";
import { useStore } from "@nanostores/react";
import { authUser, currentSessionId, currentUserRole, sessionQuestions, sessionSettings } from "@/lib/multiplayer-context";
import {
	useRealtimePlayers,
	useRealtimeQuestions,
	useRealtimeTimers,
} from "@/hooks/use-multiplayer";
import { SessionManager } from "@/components/SessionManager";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { addQuestion, updatePlayerLocation, updateQuestionAnswer } from "@/lib/multiplayer-api";
import { supabase } from "@/lib/supabase";
import { questions as mapQuestions } from "@/lib/context";
import { computeQuestionAnswer } from "@/lib/question-answerer";

const getQuestionLocation = (question: any) => {
	if (question?.data?.lat !== undefined && question?.data?.lng !== undefined) {
		return { latitude: question.data.lat, longitude: question.data.lng };
	}

	if (question?.id === "thermometer") {
		return {
			latitude: question?.data?.latA ?? 0,
			longitude: question?.data?.lngA ?? 0,
		};
	}

	return { latitude: 0, longitude: 0 };
};

const toMultiplayerType = (question: any) => {
	if (question?.id === "matching") {
		return question?.data?.type === "zone" || question?.data?.type === "custom-zone"
			? "matching-zone"
			: "matching-nearest";
	}

	if (question?.id === "measuring") {
		return "measuring-distance";
	}

	return question?.id ?? "radius";
};

export function MultiplayerWrapper({ children }: { children: React.ReactNode }) {
	const user = useStore(authUser);
	const sessionId = useStore(currentSessionId);
	const role = useStore(currentUserRole);
	const syncedQuestions = useStore(sessionQuestions);
	const localQuestions = useStore(mapQuestions);
	const [showSessionManager, setShowSessionManager] = useState(false);
	const [currentLocation, setCurrentLocation] = useState<
		{ latitude: number; longitude: number } | undefined
	>();
	const [playerId, setPlayerId] = useState<string | null>(null);
	const submittedQuestionKeysRef = useRef<Set<string>>(new Set());
	const autoAnsweringQuestionIdsRef = useRef<Set<string>>(new Set());

	// Subscribe to realtime updates when in a session
	useRealtimePlayers();
	useRealtimeQuestions();
	useRealtimeTimers();

	// Get player ID from current session
	useEffect(() => {
		if (!sessionId || !user) {
			setPlayerId(null);
			sessionSettings.set(null);
			return;
		}

		// Fetch the player ID for current user in this session
		supabase
			.from("players")
			.select("id, sessions(settings)")
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
					sessionSettings.set(null);
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
				updatePlayerLocation(playerId, latitude, longitude);
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
				updatePlayerLocation(playerId, latitude, longitude);
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
	}, [sessionId, playerId]);

	// Show session manager if user is logged in but no session selected
	useEffect(() => {
		if (user && !sessionId) {
			setShowSessionManager(true);
		}
	}, [user, sessionId]);

	useEffect(() => {
		submittedQuestionKeysRef.current.clear();
	}, [sessionId]);

	// Keep map boundary calculations in sync by applying shared question payloads.
	useEffect(() => {
		if (!sessionId) return;

		const sharedPayloads = syncedQuestions
			.filter((q: any) => q.question_data)
			.map((q: any) => q.question_data);

		if (sharedPayloads.length === 0) return;

		mapQuestions.set(sharedPayloads as any);
	}, [sessionId, syncedQuestions]);

	// Allow seekers to ask via original UI (sidebar/right-click) by syncing local questions to multiplayer.
	useEffect(() => {
		if (!sessionId || !user || role !== "seeker") return;

		const remoteKeys = new Set(
			syncedQuestions
				.map((q: any) => q?.question_data?.key)
				.filter((key: any) => key !== undefined && key !== null)
		);

		for (const question of localQuestions as any[]) {
			const localKey = question?.key;
			if (localKey === undefined || localKey === null) continue;
			if (remoteKeys.has(localKey)) continue;

			const submitKey = `${sessionId}:${localKey}`;
			if (submittedQuestionKeysRef.current.has(submitKey)) continue;
			submittedQuestionKeysRef.current.add(submitKey);

			const location = getQuestionLocation(question);
			const questionType = toMultiplayerType(question);
			const label = `${question.id} question`;

			addQuestion(
				sessionId,
				user.id,
				questionType,
				label,
				location,
				"Waiting for answer...",
				question
			).catch((error) => {
				console.error("Failed to sync local question:", error);
				submittedQuestionKeysRef.current.delete(submitKey);
			});
		}
	}, [sessionId, user, role, localQuestions, syncedQuestions]);

	// Auto-answer unanswered questions in the background when this client is the hider.
	useEffect(() => {
		if (!sessionId || role !== "hider" || !currentLocation) return;

		const unansweredQuestions = (syncedQuestions as any[]).filter(
			(q) => q?.answer === "Waiting for answer..."
		);

		for (const question of unansweredQuestions) {
			const questionId = question?.id;
			if (!questionId) continue;
			if (autoAnsweringQuestionIdsRef.current.has(questionId)) continue;

			autoAnsweringQuestionIdsRef.current.add(questionId);

			computeQuestionAnswer(question, currentLocation)
				.then((answer) => updateQuestionAnswer(questionId, answer))
				.catch((error) => {
					console.error("Failed to auto-answer question:", error);
				})
				.finally(() => {
					autoAnsweringQuestionIdsRef.current.delete(questionId);
				});
		}
	}, [sessionId, role, syncedQuestions, currentLocation]);

	return (
		<ErrorBoundary>
			{children}

			{/* Multiplayer UI overlays */}
			{sessionId && (
				<ErrorBoundary>
					{/* Panels removed: use left QuestionSidebar for gameplay controls */}
				</ErrorBoundary>
			)}

			{/* Session Manager Modal */}
			<SessionManager open={showSessionManager} onClose={() => setShowSessionManager(false)} />
		</ErrorBoundary>
	);
}
