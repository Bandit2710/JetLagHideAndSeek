import React, { useState, useEffect } from "react";
import { useAtom } from "nanostores/react";
import { sessionTimers, currentSessionId } from "@/lib/multiplayer-context";
import { useRealtimeTimers } from "@/hooks/use-multiplayer";
import { updateTimer, deleteTimer, createTimer } from "@/lib/multiplayer-api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ChevronDown, ChevronUp, Plus, Trash2, Pause, Play } from "lucide-react";
import type { TimerData } from "@/lib/multiplayer-context";

export function TimerPanel() {
	const [timers] = useAtom(sessionTimers);
	const [sessionId] = useAtom(currentSessionId);
	const [collapsed, setCollapsed] = useState(false);
	const [showAddTimer, setShowAddTimer] = useState(false);
	const [newTimerTitle, setNewTimerTitle] = useState("");
	const [newTimerMinutes, setNewTimerMinutes] = useState(5);

	useRealtimeTimers();

	// Update timer display every 100ms when active
	const [, forceUpdate] = useState({});
	useEffect(() => {
		const interval = setInterval(() => {
			forceUpdate({});
		}, 100);

		return () => clearInterval(interval);
	}, []);

	const handleAddTimer = async () => {
		if (!sessionId || !newTimerTitle.trim()) return;

		const durationMs = newTimerMinutes * 60 * 1000;
		try {
			await createTimer(sessionId, newTimerTitle, durationMs);
			setNewTimerTitle("");
			setNewTimerMinutes(5);
			setShowAddTimer(false);
		} catch (error) {
			console.error("Failed to create timer:", error);
		}
	};

	const handleToggleTimer = async (timer: TimerData) => {
		try {
			await updateTimer(timer.id, !timer.is_active);
		} catch (error) {
			console.error("Failed to toggle timer:", error);
		}
	};

	const handleDeleteTimer = async (timerId: string) => {
		try {
			await deleteTimer(timerId);
		} catch (error) {
			console.error("Failed to delete timer:", error);
		}
	};

	const getTimeRemaining = (timer: TimerData) => {
		const elapsed = Date.now() - new Date(timer.started_at).getTime();
		const remaining = Math.max(0, timer.duration_ms - elapsed);
		const minutes = Math.floor(remaining / 60000);
		const seconds = Math.floor((remaining % 60000) / 1000);
		return `${minutes}:${seconds.toString().padStart(2, "0")}`;
	};

	return (
		<div className="fixed top-2 right-2 z-[1030] rounded-lg border border-border bg-card shadow-lg">
			{/* Header */}
			<div
				className="flex items-center justify-between gap-2 px-3 py-2 cursor-pointer hover:bg-accent"
				onClick={() => setCollapsed(!collapsed)}
			>
				<h3 className="font-semibold text-sm">Timers</h3>
				{collapsed ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
			</div>

			{/* Content */}
				<div className="border-t border-border p-3 space-y-2 max-w-xs">
					{timers.length === 0 ? (
						<p className="text-xs text-muted-foreground">No timers yet</p>
					) : (
						timers.map((timer: TimerData) => (
							<div
								key={timer.id}
								className="flex items-center justify-between gap-2 p-2 rounded border border-border bg-muted/50"
							>
								<div className="flex-1">
									<p className="text-xs font-medium">{timer.title}</p>
									<p
										className={`text-lg font-mono font-bold ${
											timer.is_active ? "text-foreground" : "text-muted-foreground"
										}`}
									>
										{getTimeRemaining(timer)}
									</p>
								</div>
								<div className="flex gap-1">
									<button
										onClick={() => handleToggleTimer(timer)}
										className="p-1 hover:bg-accent rounded"
										title={timer.is_active ? "Pause" : "Resume"}
									>
										{timer.is_active ? (
											<Pause size={14} />
										) : (
											<Play size={14} />
										)}
									</button>
									<button
										onClick={() => handleDeleteTimer(timer.id)}
										className="p-1 hover:bg-destructive/10 text-destructive rounded"
										title="Delete timer"
									>
										<Trash2 size={14} />
									</button>
								</div>
							</div>
						))
					)}

					{/* Add timer form */}
					{showAddTimer && (
						<div className="space-y-2 p-2 rounded border border-border bg-muted/50">
							<Input
								placeholder="Timer name (e.g., Passenger Princess)"
								value={newTimerTitle}
								onChange={(e) => setNewTimerTitle(e.target.value)}
								className="h-8 text-xs"
								onKeyPress={(e) => {
									if (e.key === "Enter") {
										handleAddTimer();
									}
								}}
							/>
							<div className="flex gap-2">
								<Input
									type="number"
									min="1"
									max="120"
									value={newTimerMinutes}
									onChange={(e) => setNewTimerMinutes(Math.max(1, parseInt(e.target.value) || 1))}
									className="h-8 text-xs flex-1"
									placeholder="Minutes"
								/>
								<Button
									size="sm"
									onClick={handleAddTimer}
									disabled={!newTimerTitle.trim()}
									className="text-xs"
								>
									Add
								</Button>
							</div>
						</div>
					)}

					{/* Add timer button */}
					{!showAddTimer && (
						<Button
							size="sm"
							variant="outline"
							onClick={() => setShowAddTimer(true)}
							className="w-full h-8 text-xs"
						>
							<Plus size={14} /> Add Timer
						</Button>
					)}
				</div>
			)}
		</div>
	);
}
