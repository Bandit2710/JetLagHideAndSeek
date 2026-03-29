import { useEffect, useState } from "react";
import { useStore } from "@nanostores/react";
import {
	currentSessionId,
	currentUserRole,
	gamePhase,
	phaseStartedAt,
} from "@/lib/multiplayer-context";
import { endGame } from "@/lib/multiplayer-api";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function SeekingTimer() {
	const role = useStore(currentUserRole);
	const sessionId = useStore(currentSessionId);
	const phase = useStore(gamePhase);
	const started = useStore(phaseStartedAt);
	const [elapsed, setElapsed] = useState<number | null>(null);
	const [loading, setLoading] = useState(false);

	// Show seeking timer only during seeking phase
	if (phase !== "seeking") return null;

	useEffect(() => {
		const interval = setInterval(() => {
			if (!started) {
				setElapsed(null);
				return;
			}

			const startTime = new Date(started).getTime();
			const now = new Date().getTime();
			const e = now - startTime;
			setElapsed(e);
		}, 100);

		return () => clearInterval(interval);
	}, [started]);

	const formatTime = (ms: number) => {
		const totalSeconds = Math.floor(ms / 1000);
		const minutes = Math.floor(totalSeconds / 60);
		const seconds = totalSeconds % 60;
		return `${minutes}:${seconds.toString().padStart(2, "0")}`;
	};

	const handleFoundButton = async () => {
		if (!sessionId) return;
		setLoading(true);
		try {
			await endGame(sessionId);
		} catch (error) {
			console.error("Failed to end game:", error);
		} finally {
			setLoading(false);
		}
	};

	return (
		<div className="fixed top-4 left-1/2 -translate-x-1/2 z-[1150]">
			<div className="rounded-lg border-2 border-primary bg-card p-4 min-w-[260px] shadow-lg">
				<div className="flex flex-col gap-3">
					<p className="text-xs text-muted-foreground text-center font-semibold uppercase">
						⏱️ Time Elapsed
					</p>

					<div className="text-center">
						<p className="text-4xl font-mono font-bold text-primary">
							{elapsed !== null ? formatTime(elapsed) : "0:00"}
						</p>
					</div>

					{role === "hider" && (
						<>
							<p className="text-xs text-muted-foreground text-center">
								Seekers are chasing! Click below when you've been found.
							</p>
							<Button
								onClick={handleFoundButton}
								disabled={loading}
								size="lg"
								className="w-full bg-destructive hover:bg-destructive/90 text-white font-semibold"
							>
								{loading ? "Recording..." : "✋ You Found Me!"}
							</Button>
						</>
					)}

					{role === "seeker" && (
						<p className="text-xs text-muted-foreground text-center">
							Chase the hider! This timer shows how long you've been seeking.
						</p>
					)}
				</div>
			</div>
		</div>
	);
}
