import { useEffect, useRef, useState } from "react";
import { useStore } from "@nanostores/react";
import {
	currentSessionId,
	currentUserRole,
	gamePhase,
	phaseStartedAt,
	sessionSettings,
} from "@/lib/multiplayer-context";
import { endGame, startHidingPhase, startSeekingPhase } from "@/lib/multiplayer-api";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function HidingTimer() {
	const role = useStore(currentUserRole);
	const sessionId = useStore(currentSessionId);
	const phase = useStore(gamePhase);
	const started = useStore(phaseStartedAt);
	const settings = useStore(sessionSettings);
	const [remaining, setRemaining] = useState<number | null>(null);
	const [loading, setLoading] = useState(false);
	const [ending, setEnding] = useState(false);
	const autoTransitionedRef = useRef(false);

	const hidingDurationMs = (settings?.hidingDurationMinutes ?? 30) * 60 * 1000;

	// Show only during waiting and hiding phases
	if (phase !== "waiting" && phase !== "hiding") return null;

	useEffect(() => {
		if (phase !== "hiding") {
			setRemaining(null);
			autoTransitionedRef.current = false;
			return;
		}

		const interval = setInterval(() => {
			if (!started) {
				setRemaining(null);
				return;
			}

			const startTime = new Date(started).getTime();
			const now = new Date().getTime();
			const elapsed = now - startTime;
			const rem = Math.max(0, hidingDurationMs - elapsed);

			setRemaining(rem);

			// Auto-transition to seeking when hiding time expires
			if (rem <= 0 && !autoTransitionedRef.current) {
				autoTransitionedRef.current = true;
				gamePhase.set("seeking");
				phaseStartedAt.set(new Date().toISOString());

				if (role === "hider") {
					startSeekingPhase(sessionId ?? "").catch(console.error);
				}
			}
		}, 100);

		return () => clearInterval(interval);
	}, [phase, started, hidingDurationMs, role, sessionId]);

	const formatTime = (ms: number) => {
		const totalSeconds = Math.floor(ms / 1000);
		const minutes = Math.floor(totalSeconds / 60);
		const seconds = totalSeconds % 60;
		return `${minutes}:${seconds.toString().padStart(2, "0")}`;
	};

	const handleStartHiding = async () => {
		if (!sessionId) return;
		setLoading(true);
		const now = new Date().toISOString();
		gamePhase.set("hiding");
		phaseStartedAt.set(now);
		try {
			await startHidingPhase(sessionId);
		} catch (error) {
			gamePhase.set("waiting");
			phaseStartedAt.set(null);
			console.error("Failed to start hiding:", error);
		} finally {
			setLoading(false);
		}
	};

	const handleEndGame = async () => {
		if (!sessionId) return;
		setEnding(true);
		try {
			await endGame(sessionId);
		} catch (error) {
			console.error("Failed to end game:", error);
		} finally {
			setEnding(false);
		}
	};

	// Show start button before hiding has started
	if (!started) {
		if (role !== "hider") {
			return (
				<div className="fixed top-4 left-1/2 -translate-x-1/2 z-[1150]">
					<div className="rounded-lg border-2 border-border bg-card p-4 shadow-lg">
						<p className="text-sm text-muted-foreground text-center">
							Waiting for hider to start...
						</p>
					</div>
				</div>
			);
		}

		return (
			<div className="fixed top-4 left-1/2 -translate-x-1/2 z-[1150]">
				<div className="rounded-lg border-2 border-border bg-card p-4 shadow-lg">
					<Button
						onClick={handleStartHiding}
						disabled={loading}
						size="lg"
						className="w-full"
					>
						{loading ? "Starting..." : "🏃 Start Hiding"}
					</Button>
					<p className="text-xs text-muted-foreground text-center mt-2">
						Seekers will be released in {settings?.hidingDurationMinutes ?? 30} minutes
					</p>
					<Button
						variant="outline"
						onClick={handleEndGame}
						disabled={ending || loading}
						className="w-full mt-2"
					>
						{ending ? "Ending..." : "End Game"}
					</Button>
				</div>
			</div>
		);
	}

	// Show countdown during hiding
	const isExpiring = remaining !== null && remaining < 60000; // Less than 1 minute
	const isFinished = remaining === 0;
	const progress = remaining !== null ? ((hidingDurationMs - remaining) / hidingDurationMs) * 100 : 0;

	return (
		<div className="fixed top-4 left-1/2 -translate-x-1/2 z-[1150]">
			<div
				className={cn(
					"rounded-lg border-2 p-4 shadow-lg min-w-[200px]",
					isFinished && "bg-destructive/20 border-destructive",
					isExpiring && !isFinished && "bg-yellow-500/20 border-yellow-500",
					!isExpiring && !isFinished && "border-primary bg-card"
				)}
			>
				<div className="flex flex-col gap-2">
					<p className="text-xs text-muted-foreground text-center font-medium">
						{isFinished ? "Time's up! Seekers are released!" : "Hiding Time"}
					</p>
					<div className="text-center">
						<p
							className={cn(
								"text-3xl font-mono font-bold",
								isFinished && "text-destructive",
								isExpiring && !isFinished && "text-yellow-600"
							)}
						>
							{remaining !== null ? formatTime(remaining) : "--:--"}
						</p>
					</div>
					<div className="w-full h-2 bg-muted rounded-full overflow-hidden">
						<div
							className={cn(
								"h-full transition-all duration-100",
								isFinished && "bg-destructive",
								isExpiring && !isFinished && "bg-yellow-500",
								!isExpiring && !isFinished && "bg-primary"
							)}
							style={{ width: `${Math.min(100, progress)}%` }}
						/>
					</div>
					{role === "hider" && (
						<>
							<p className="text-xs text-muted-foreground text-center">
								{isFinished
									? "Move to the seeking phase"
									: "Hiders can start moving. Seekers will be released when time runs out."}
							</p>
							<Button
								variant="outline"
								onClick={handleEndGame}
								disabled={ending}
								className="w-full"
							>
								{ending ? "Ending..." : "End Game"}
							</Button>
						</>
					)}
				</div>
			</div>
		</div>
	);
}
