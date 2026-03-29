import React, { useEffect, useState } from "react";
import { useStore } from "@nanostores/react";
import {
	currentUserRole,
	sessionQuestions,
	sessionTimers,
	currentSessionId,
	authUser,
	sessionSettings,
	type QuestionData,
} from "@/lib/multiplayer-context";
import { useRealtimeQuestions } from "@/hooks/use-multiplayer";
import { addQuestion, createQuestionTimer, createTimer } from "@/lib/multiplayer-api";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ChevronDown, Send, PanelBottomOpen } from "lucide-react";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { TimerDisplay } from "@/components/TimerDisplay";

export interface QuestionPanelProps {
	currentLocation?: { latitude: number; longitude: number };
}

const QUESTION_TYPE_LABELS: Record<string, string> = {
	radius: "Radius",
	thermometer: "Thermometer",
	tentacles: "Tentacles",
	matching: "Matching",
	measuring: "Measuring",
	"street-trace": "Street Trace",
};

export function QuestionPanel({ currentLocation }: QuestionPanelProps) {
	const questions = useStore(sessionQuestions);
	const timers = useStore(sessionTimers);
	const sessionId = useStore(currentSessionId);
	const user = useStore(authUser);
	const role = useStore(currentUserRole);
	const settings = useStore(sessionSettings);
	const enabledTypes = settings?.enabledQuestionTypes;
	const allTypes = ["radius", "thermometer", "tentacles", "matching", "measuring", "street-trace"];
	const showAllEnabled = !enabledTypes || enabledTypes.length === 0 || enabledTypes.length === allTypes.length;

	const [collapsed, setCollapsed] = useState(false);
	const [showNewQuestion, setShowNewQuestion] = useState(false);
	const [selectedQuestion, setSelectedQuestion] = useState<string | null>(null);
	const [pendingQuestion, setPendingQuestion] = useState<{
		type: string;
		text: string;
		latitude: number;
		longitude: number;
	} | null>(null);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [nowMs, setNowMs] = useState(Date.now());
	useRealtimeQuestions();

	useEffect(() => {
		const interval = setInterval(() => setNowMs(Date.now()), 1000);
		return () => clearInterval(interval);
	}, []);

	const getFallbackDuration = (questionType: string) => {
		if (questionType === "street-trace") return 10 * 60 * 1000;
		return 5 * 60 * 1000;
	};

	const handleAskQuestion = async (
		questionType: string,
		questionText: string,
		overrideLocation?: { latitude: number; longitude: number }
	) => {
		if (!sessionId || !user) return;

		const activeLocation = overrideLocation ?? currentLocation;
		if (!activeLocation) return;

		const payloadByType: Record<string, any> = {
			radius: {
				id: "radius",
				key: Math.random(),
				data: { lat: activeLocation.latitude, lng: activeLocation.longitude },
			},
			thermometer: {
				id: "thermometer",
				key: Math.random(),
				data: {
					latA: activeLocation.latitude,
					lngA: activeLocation.longitude,
					latB: activeLocation.latitude + 0.05,
					lngB: activeLocation.longitude + 0.05,
				},
			},
			tentacles: {
				id: "tentacles",
				key: Math.random(),
				data: { lat: activeLocation.latitude, lng: activeLocation.longitude },
			},
			"matching-zone": {
				id: "matching",
				key: Math.random(),
				data: { lat: activeLocation.latitude, lng: activeLocation.longitude, type: "zone" },
			},
			"matching-nearest": {
				id: "matching",
				key: Math.random(),
				data: { lat: activeLocation.latitude, lng: activeLocation.longitude, type: "same-nearest-mcdonalds" },
			},
			"measuring-distance": {
				id: "measuring",
				key: Math.random(),
				data: { lat: activeLocation.latitude, lng: activeLocation.longitude, type: "coastline" },
			},
			"street-trace": {
				id: "street-trace",
				key: Math.random(),
				data: { lat: activeLocation.latitude, lng: activeLocation.longitude },
			},
		};

		const payload = payloadByType[questionType];

		try {
			setIsSubmitting(true);
			const createdQuestion = await addQuestion(
				sessionId,
				user.id,
				questionType,
				questionText,
				activeLocation,
				"Waiting for answer...",
				payload
			);

			// Extract timer type (handle matching and measuring variants)
			let timerType = questionType;
			if (questionType.startsWith("matching-")) {
				timerType = "matching";
			} else if (questionType.startsWith("measuring-")) {
				timerType = "measuring";
			}

			// Create question timer; if schema migration is missing, fallback to generic timer so timing still works.
			if (createdQuestion?.id) {
				try {
					await createQuestionTimer(sessionId, createdQuestion.id, timerType);
				} catch {
					const fallbackDuration = timerType === "street-trace" ? 10 * 60 * 1000 : 5 * 60 * 1000;
					await createTimer(sessionId, `${questionText} (Fallback Timer)`, fallbackDuration);
				}
			}

			setShowNewQuestion(false);
			setPendingQuestion(null);
		} catch (error) {
			console.error("Failed to ask question:", error);
		} finally {
			setIsSubmitting(false);
		}
	};

	const questionTypes = [
		{ type: "radius", text: "Radius" },
		{ type: "thermometer", text: "Thermometer" },
		{ type: "tentacles", text: "Tentacles" },
		{ type: "matching-zone", text: "Matching (Zone)" },
		{ type: "matching-nearest", text: "Matching (Nearest)" },
		{ type: "measuring-distance", text: "Measuring" },
		{ type: "street-trace", text: "Street Trace" },
	].filter((q) => {
		const enabled = settings?.enabledQuestionTypes;
		if (!enabled || enabled.length === 0) return true;
		if (q.type.startsWith("matching")) return enabled.includes("matching");
		if (q.type.startsWith("measuring")) return enabled.includes("measuring");
		return enabled.includes(q.type);
	});

	if (role === "hider") {
		return null;
	}

	return (
		<>
		<Drawer open={!collapsed} onOpenChange={(open) => setCollapsed(!open)}>
			<DrawerContent className="fixed bottom-0 left-0 right-0 max-h-[80vh] rounded-t-lg z-[1140]">
				<DrawerHeader className="cursor-pointer" onClick={() => setCollapsed(!collapsed)}>
					<DrawerTitle className="flex items-center justify-between">
						<span>Questions ({questions.length})</span>
						<ChevronDown
							size={20}
							className={`transition-transform ${collapsed ? "rotate-180" : ""}`}
						/>
					</DrawerTitle>
				</DrawerHeader>

				{!collapsed && (
					<div className="overflow-y-auto p-4 space-y-3 max-h-[calc(80vh-60px)]">
						<div className="p-3 rounded-lg border border-border bg-muted/50">
							<p className="text-xs font-medium mb-2">Round Settings</p>
							{showAllEnabled ? (
								<p className="text-sm text-muted-foreground">All question types enabled</p>
							) : (
								<div className="flex flex-wrap gap-1">
									{enabledTypes?.map((type) => (
										<span key={type} className="text-xs px-2 py-1 rounded-full bg-primary/10 text-primary">
											{QUESTION_TYPE_LABELS[type] ?? type}
										</span>
									))}
								</div>
							)}
						</div>

						{/* Ask new question button */}
						<Button
							onClick={() => setShowNewQuestion(true)}
							className="w-full"
							disabled={!currentLocation}
						>
							<Send size={16} /> Ask Question
						</Button>

						{/* Question list */}
						{questions.length === 0 ? (
							<p className="text-sm text-muted-foreground text-center py-8">No questions yet</p>
						) : (
							<div className="space-y-2">
								{questions.map((question: QuestionData) => (
									<button
										key={question.id}
										onClick={() =>
											setSelectedQuestion(
												selectedQuestion === question.id ? null : question.id
											)
										}
										className="w-full text-left p-3 rounded-lg border border-border hover:bg-accent transition-colors"
									>
										<p className="text-sm font-medium">{question.question_text}</p>
										<p className="text-xs text-muted-foreground mt-1">
											{new Date(question.created_at).toLocaleTimeString()}
										</p>
										{selectedQuestion === question.id && (
											<div className="mt-2 p-2 rounded bg-muted text-sm">
												<p className="font-semibold">Answer:</p>
												<p>{question.answer}</p>
												<div className="mt-2">
													{timers.some((t: any) => t.question_id === question.id) ? (
														<TimerDisplay questionId={question.id} />
													) : question.answer === "Waiting for answer..." ? (
														<div className="p-2 border rounded-md text-center">
															<p className="text-xs text-muted-foreground">Timer</p>
															<p className="font-mono font-bold">
																{(() => {
																	const started = new Date(question.created_at).getTime();
																	const duration = getFallbackDuration(question.question_type);
																	const remaining = Math.max(0, duration - (nowMs - started));
																	const minutes = Math.floor(remaining / 60000);
																	const seconds = Math.floor((remaining % 60000) / 1000);
																	return `${minutes}:${seconds.toString().padStart(2, "0")}`;
																})()}
															</p>
														</div>
													) : null}
												</div>
											</div>
										)}
									</button>
								))}
							</div>
						)}
					</div>
				)}

				{/* Ask question dialog */}
				<Dialog open={showNewQuestion} onOpenChange={setShowNewQuestion}>
					<DialogContent className="sm:max-w-[425px]">
						<DialogHeader>
							<DialogTitle>Ask a Question</DialogTitle>
						</DialogHeader>

						<div className="space-y-3">
							<p className="text-sm text-muted-foreground">
								Choose a question to ask at your current location:
							</p>

							{questionTypes.map((q) => (
								<Button
									key={q.type}
									variant="outline"
									className="w-full justify-start h-auto py-2"
									onClick={() => {
										if (!currentLocation) return;
										setPendingQuestion({
											type: q.type,
											text: q.text,
											latitude: currentLocation.latitude,
											longitude: currentLocation.longitude,
										});
										setShowNewQuestion(false);
									}}
								>
									Add {q.text}
								</Button>
							))}

							<p className="text-xs text-muted-foreground text-center">
								Question will be automatically answered based on the hider's location.
							</p>
						</div>
					</DialogContent>
				</Dialog>
			</DrawerContent>
		</Drawer>
		{/* Draft and confirmation dialog for pending question */}
		<Dialog open={pendingQuestion !== null} onOpenChange={(open) => !open && setPendingQuestion(null)}>
			<DialogContent className="sm:max-w-[425px]">
				<DialogHeader>
					<DialogTitle>Draft Question</DialogTitle>
				</DialogHeader>

				{pendingQuestion && (
					<div className="space-y-4">
						<div className="space-y-2">
							<p className="text-sm text-muted-foreground">Question Title:</p>
							<Input
								value={pendingQuestion.text}
								onChange={(e) =>
									setPendingQuestion((prev) =>
										prev ? { ...prev, text: e.target.value } : prev
									)
								}
								placeholder="Question title"
							/>
						</div>

						<div className="grid grid-cols-2 gap-2">
							<div>
								<p className="text-sm text-muted-foreground mb-1">Latitude</p>
								<Input
									type="number"
									step="0.0001"
									value={pendingQuestion.latitude}
									onChange={(e) =>
										setPendingQuestion((prev) =>
											prev
												? { ...prev, latitude: Number(e.target.value) }
												: prev
										)
									}
								/>
							</div>
							<div>
								<p className="text-sm text-muted-foreground mb-1">Longitude</p>
								<Input
									type="number"
									step="0.0001"
									value={pendingQuestion.longitude}
									onChange={(e) =>
										setPendingQuestion((prev) =>
											prev
												? { ...prev, longitude: Number(e.target.value) }
												: prev
										)
									}
								/>
							</div>
						</div>

						<p className="text-xs text-muted-foreground">
							Draft is local until you press Send Question.
						</p>
					</div>
				)}

				<DialogFooter>
					<Button
						variant="outline"
						onClick={() => setPendingQuestion(null)}
						disabled={isSubmitting}
					>
						Cancel
					</Button>
					<Button
						onClick={() => {
							if (pendingQuestion) {
								handleAskQuestion(pendingQuestion.type, pendingQuestion.text, {
									latitude: pendingQuestion.latitude,
									longitude: pendingQuestion.longitude,
								});
							}
						}}
						disabled={isSubmitting || !pendingQuestion?.text?.trim()}
					>
						{isSubmitting ? "Sending..." : "Send Question"}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
		{collapsed && (
			<Button
				className="fixed bottom-4 left-4 z-[1140] shadow-lg"
				onClick={() => setCollapsed(false)}
			>
				<PanelBottomOpen size={16} /> Show Seeker Panel
			</Button>
		)}
		</>
	);
}
