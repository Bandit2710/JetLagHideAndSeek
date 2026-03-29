import React, { useEffect, useState } from "react";
import { useAtom } from "nanostores/react";
import { authUser, currentSessionId } from "@/lib/multiplayer-context";
import {
	useRealtimePlayers,
	useRealtimeQuestions,
	useRealtimeTimers,
} from "@/hooks/use-multiplayer";
import { SessionManager } from "@/components/SessionManager";
import { TimerPanel } from "@/components/TimerPanel";
import { QuestionPanel } from "@/components/QuestionInterface";
import { HiderPanel } from "@/components/HiderPanel";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { updatePlayerLocation } from "@/lib/multiplayer-api";
import { supabase } from "@/lib/supabase";

export function MultiplayerWrapper({ children }: { children: React.ReactNode }) {
	const [user] = useAtom(authUser);
	const [sessionId] = useAtom(currentSessionId);
	const [showSessionManager, setShowSessionManager] = useState(false);
	const [currentLocation, setCurrentLocation] = useState<
		{ latitude: number; longitude: number } | undefined
	>();
	const [playerId, setPlayerId] = useState<string | null>(null);

	// Subscribe to realtime updates when in a session
	useRealtimePlayers();
	useRealtimeQuestions();
	useRealtimeTimers();

	// Get player ID from current session
	useEffect(() => {
		if (!sessionId || !user) {
			setPlayerId(null);
			return;
		}

		// Fetch the player ID for current user in this session
		supabase
			.from("players")
			.select("id")
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

	return (
		<ErrorBoundary>
			{children}

			{/* Multiplayer UI overlays */}
			{sessionId && (
				<ErrorBoundary>
					<TimerPanel />
					<HiderPanel currentLocation={currentLocation} />
					<QuestionPanel currentLocation={currentLocation} />
				</ErrorBoundary>
			)}

			{/* Session Manager Modal */}
			<SessionManager open={showSessionManager} onClose={() => setShowSessionManager(false)} />
		</ErrorBoundary>
	);
}
