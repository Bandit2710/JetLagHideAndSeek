import { useEffect, useState } from "react";
import { useStore } from "@nanostores/react";
import {
	currentSessionId,
	currentUserRole,
	gamePhase,
	phaseStartedAt,
	sessionSettings,
} from "@/lib/multiplayer-context";
import { startHidingPhase, startSeekingPhase } from "@/lib/multiplayer-api";
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

	const hidingDurationMs = (settings?.hidingDurationMinutes ?? 30) * 60 * 1000;

\t// Show only during waiting and hiding phases
\tif (phase !== "waiting" && phase !== "hiding") return null;

	useEffect(() => {
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
			if (rem <= 0 && role === "hider") {
				startSeekingPhase(sessionId ?? "").catch(console.error);
			}
		}, 100);

		return () => clearInterval(interval);
	}, [started, hidingDurationMs, role, sessionId]);

	const formatTime = (ms: number) => {
		const totalSeconds = Math.floor(ms / 1000);
		const minutes = Math.floor(totalSeconds / 60);
		const seconds = totalSeconds % 60;
		return `${minutes}:${seconds.toString().padStart(2, "0")}`;
	};

	const handleStartHiding = async () => {
		if (!sessionId) return;
		setLoading(true);
		try {
			await startHidingPhase(sessionId);
		} catch (error) {
			console.error("Failed to start hiding:", error);
		} finally {
			setLoading(false);
		}
	};

	// Show start button before hiding has started
	if (!started) {
		if (role !== "hider") {
			return (
				<div className="fixed bottom-8 right-8 z-40">
					<div className="rounded-lg border-2 border-border bg-card p-4 shadow-lg">
						<p className="text-sm text-muted-foreground text-center">
							Waiting for hider to start...
						</p>
					</div>
				</div>
			);
		}

		return (
			<div className="fixed bottom-8 right-8 z-40">
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
				</div>
			</div>
		);
	}

	// Show countdown during hiding
	const isExpiring = remaining !== null && remaining < 60000; // Less than 1 minute
	const isFinished = remaining === 0;
	const progress = remaining !== null ? ((hidingDurationMs - remaining) / hidingDurationMs) * 100 : 0;

	return (
		<div className="fixed bottom-8 right-8 z-40">
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
						<p className="text-xs text-muted-foreground text-center">
							{isFinished
								? "Move to the seeking phase"
								: "Hiders can start moving. Seekers will be released when time runs out."}
						</p>
					)}
				</div>
			</div>
		</div>
	);
}
