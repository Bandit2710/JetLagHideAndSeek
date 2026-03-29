import { useEffect, useState } from "react";
import { useStore } from "@nanostores/react";
import { sessionTimers, sessionQuestions } from "@/lib/multiplayer-context";
import { cn } from "@/lib/utils";

export const TimerDisplay = ({ questionId }: { questionId?: string }) => {
	const timers = useStore(sessionTimers);
	const questions = useStore(sessionQuestions);
	const [displayedTimers, setDisplayedTimers] = useState<any[]>([]);
	const [elapsed, setElapsed] = useState<Record<string, number>>({});
	const [pausedTimers, setPausedTimers] = useState<Set<string>>(new Set());

	// Filter timers: if questionId provided, show only that timer; otherwise show all active/paused
	useEffect(() => {
		let filtered = timers;
		if (questionId) {
			filtered = timers.filter((t) => t.question_id === questionId);
		}
		setDisplayedTimers(filtered);
	}, [timers, questionId]);

	// Check if questions are still waiting for answers - if timer has expired without answer, mark as paused
	useEffect(() => {
		const newPausedTimers = new Set<string>();
		
		displayedTimers.forEach((timer) => {
			if (!timer.question_id || timer.is_active === false) return;
			
			const question = questions.find((q: any) => q.id === timer.question_id);
			if (!question) return;
			
			// If answer is still "Waiting for answer..." and we've passed the timer duration, mark as paused
			if (question.answer === "Waiting for answer...") {
				const started = new Date(timer.started_at).getTime();
				const now = new Date().getTime();
				const elapsed = now - started;
				
				if (elapsed > timer.duration_ms) {
					newPausedTimers.add(timer.id);
				}
			}
		});
		
		setPausedTimers(newPausedTimers);
	}, [displayedTimers, questions, elapsed]);

	// Update elapsed time for each timer
	useEffect(() => {
		const interval = setInterval(() => {
			const now = new Date().getTime();
			const newElapsed: Record<string, number> = {};

			displayedTimers.forEach((timer) => {
				const started = new Date(timer.started_at).getTime();
				const e = now - started;
				const remaining = Math.max(0, timer.duration_ms - e);
				newElapsed[timer.id] = remaining;
			});

			setElapsed(newElapsed);
		}, 100);

		return () => clearInterval(interval);
	}, [displayedTimers]);

	if (displayedTimers.length === 0) return null;

	const formatTime = (ms: number) => {
		const totalSeconds = Math.floor(ms / 1000);
		const minutes = Math.floor(totalSeconds / 60);
		const seconds = totalSeconds % 60;
		return `${minutes}:${seconds.toString().padStart(2, "0")}`;
	};

	return (
		<div className="flex flex-col gap-2">
			{displayedTimers.map((timer) => {
				const remaining = elapsed[timer.id] ?? timer.duration_ms;
				const isWarning = remaining < 60000; // Less than 1 minute
				const isExpired = remaining <= 0;
				const isPaused = pausedTimers.has(timer.id);
				const progress = ((timer.duration_ms - remaining) / timer.duration_ms) * 100;

				return (
					<div
						key={timer.id}
						className={cn(
							"p-4 border rounded-md",
							isPaused && "bg-orange-500/20 border-orange-500",
							isExpired && !isPaused && "bg-destructive/20 border-destructive",
							isWarning && !isExpired && !isPaused && "bg-yellow-500/20 border-yellow-500",
							!isWarning && !isExpired && !isPaused && "border-border"
						)}
					>
						<div className="flex justify-between items-center mb-2">
							<span className="font-semibold text-sm">{timer.title}</span>
							<span
								className={cn(
									"text-lg font-mono font-bold",
									isPaused && "text-orange-600",
									isExpired && !isPaused && "text-destructive",
									isWarning && !isExpired && !isPaused && "text-yellow-600",
								)}
							>
								{isPaused ? "⏸️ PAUSED" : formatTime(Math.max(0, remaining))}
							</span>
						</div>
						<div className="w-full h-2 bg-muted rounded-full overflow-hidden">
							<div
								className={cn(
									"h-full transition-all duration-100",
									isPaused && "bg-orange-500",
									isExpired && !isPaused && "bg-destructive",
									isWarning && !isExpired && !isPaused && "bg-yellow-500",
									!isWarning && !isExpired && !isPaused && "bg-primary",
								)}
								style={{ width: `${Math.min(100, progress)}%` }}
							/>
						</div>
						{isPaused && (
							<p className="text-xs text-orange-600 mt-2 text-center">
								Question not answered in time. Seekers can continue moving.
							</p>
						)}
					</div>
				);
			})}
		</div>
	);
};
