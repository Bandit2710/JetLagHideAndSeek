import React, { useState, useEffect } from "react";
import { useStore } from "@nanostores/react";
import {
	sessionQuestions,
	currentSessionId,
	authUser,
	isHider,
	sessionPlayers,
} from "@/lib/multiplayer-context";
import { useRealtimeQuestions, useRealtimePlayers } from "@/hooks/use-multiplayer";
import { computeQuestionAnswer } from "@/lib/question-answerer";
import { updateQuestionAnswer } from "@/lib/multiplayer-api";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { ChevronDown, ChevronUp, MapPin, Users, AlertCircle } from "lucide-react";
import type { QuestionData, PlayerData } from "@/lib/multiplayer-context";

export interface HiderPanelProps {
	currentLocation?: { latitude: number; longitude: number };
}

export function HiderPanel({ currentLocation }: HiderPanelProps) {
	const questions = useStore(sessionQuestions);
	const players = useStore(sessionPlayers);
	const sessionId = useStore(currentSessionId);
	const hider = useStore(isHider);

	const [collapsed, setCollapsed] = useState(false);
	const [showLocationModal, setShowLocationModal] = useState(false);
	const [showPlayersModal, setShowPlayersModal] = useState(false);
	const [answeringQuestion, setAnsweringQuestion] = useState<string | null>(null);
	const [answerText, setAnswerText] = useState("");
	const [processing, setProcessing] = useState<Set<string>>(new Set());

	useRealtimeQuestions();
	useRealtimePlayers();

	if (!hider) {
		return null;
	}

	const unansweredQuestions = questions.filter((q: QuestionData) => q.answer === "Waiting for answer...");
	const seekers = players.filter((p: PlayerData) => p.role === "seeker");

	const handleAutoAnswer = async (question: QuestionData) => {
		if (!sessionId || !currentLocation || processing.has(question.id)) return;

		setProcessing((prev) => new Set([...prev, question.id]));

		try {
			const answer = await computeQuestionAnswer(question, currentLocation);

			await updateQuestionAnswer(question.id, answer);
		} catch (error) {
			console.error("Failed to answer question:", error);
		} finally {
			setProcessing((prev) => {
				const next = new Set(prev);
				next.delete(question.id);
				return next;
			});
		}
	};

	const handleManualAnswer = async (question: QuestionData) => {
		if (!sessionId || !answerText.trim()) return;

		try {
			await updateQuestionAnswer(question.id, answerText.trim());
			setAnsweringQuestion(null);
			setAnswerText("");
		} catch (error) {
			console.error("Failed to submit answer:", error);
		}
	};

	return (
		<Drawer open={!collapsed} onOpenChange={(open) => setCollapsed(!open)}>
			<DrawerContent className="fixed bottom-0 left-0 right-0 max-h-[80vh] rounded-t-lg">
				<DrawerHeader
					className="cursor-pointer hover:bg-accent"
					onClick={() => setCollapsed(!collapsed)}
				>
					<DrawerTitle className="flex items-center justify-between">
						<span>Hider Dashboard</span>
						<ChevronDown
							size={20}
							className={`transition-transform ${collapsed ? "rotate-180" : ""}`}
						/>
					</DrawerTitle>
				</DrawerHeader>

				{!collapsed && (
					<div className="overflow-y-auto p-4 space-y-4 max-h-[calc(80vh-60px)]">
						{/* Location Display */}
						{currentLocation && (
							<div className="p-3 rounded-lg border border-border bg-muted/50">
								<button
									onClick={() => setShowLocationModal(true)}
									className="w-full flex items-center justify-between hover:bg-accent rounded p-2 transition-colors"
								>
									<div className="flex items-center gap-2">
										<MapPin size={16} className="text-blue-500" />
										<div className="text-left">
											<p className="text-xs font-medium">Your Location</p>
											<p className="text-sm font-mono">
												{currentLocation.latitude.toFixed(4)}, {currentLocation.longitude.toFixed(4)}
											</p>
										</div>
									</div>
									<span className="text-xs text-muted-foreground">Tap to view</span>
								</button>
							</div>
						)}

						{/* Player List */}
						<div className="p-3 rounded-lg border border-border bg-muted/50">
							<button
								onClick={() => setShowPlayersModal(true)}
								className="w-full flex items-center justify-between hover:bg-accent rounded p-2 transition-colors"
							>
								<div className="flex items-center gap-2">
									<Users size={16} />
									<div className="text-left">
										<p className="text-xs font-medium">Players in Session</p>
										<p className="text-sm">
											{seekers.length} seeker{seekers.length !== 1 ? "s" : ""} + you
										</p>
									</div>
								</div>
								<span className="text-xs bg-primary text-primary-foreground rounded-full px-2 py-1">
									{seekers.length + 1}
								</span>
							</button>
						</div>

						{/* Unanswered Questions */}
						{unansweredQuestions.length > 0 && (
							<div className="p-3 rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950">
								<div className="flex items-center gap-2 mb-3">
									<AlertCircle size={16} className="text-amber-600" />
									<p className="text-sm font-semibold text-amber-800 dark:text-amber-200">
										{unansweredQuestions.length} Question{unansweredQuestions.length !== 1 ? "s" : ""} Waiting
									</p>
								</div>

								<div className="space-y-2">
									{unansweredQuestions.map((question: QuestionData) => (
										<div
											key={question.id}
											className="p-2 rounded bg-white dark:bg-slate-900 border border-amber-200 dark:border-amber-900"
										>
											<p className="text-sm font-medium mb-2">{question.question_text}</p>
											<div className="flex gap-2">
												<Button
													size="sm"
													onClick={() => handleAutoAnswer(question)}
													disabled={processing.has(question.id)}
													className="flex-1 text-xs"
												>
													{processing.has(question.id) ? "Answering..." : "Auto Answer"}
												</Button>
												<Button
													size="sm"
													variant="outline"
													onClick={() => {
														setAnsweringQuestion(question.id);
														setAnswerText("");
													}}
													className="flex-1 text-xs"
												>
													Manual
												</Button>
											</div>
										</div>
									))}
								</div>
							</div>
						)}

						{/* Answered Questions */}
						{questions.length > 0 && unansweredQuestions.length < questions.length && (
							<div className="space-y-2">
								<p className="text-xs font-semibold text-muted-foreground px-2">Answered Questions</p>
								{questions
									.filter((q: QuestionData) => q.answer !== "Waiting for answer...")
									.slice(-5)
									.map((question: QuestionData) => (
										<div key={question.id} className="p-2 rounded border border-border bg-muted/30">
											<p className="text-xs font-medium">{question.question_text}</p>
											<p className="text-sm font-semibold mt-1 text-green-600 dark:text-green-400">
												✓ {question.answer}
											</p>
										</div>
									))}
							</div>
						)}

						{questions.length === 0 && (
							<p className="text-sm text-muted-foreground text-center py-8">
								Waiting for seekers to ask questions...
							</p>
						)}
					</div>
				)}
			</DrawerContent>

			{/* Location Modal */}
			<Dialog open={showLocationModal} onOpenChange={setShowLocationModal}>
				<DialogContent className="sm:max-w-[300px]">
					<DialogHeader>
						<DialogTitle>Your Location (Hider Only)</DialogTitle>
					</DialogHeader>
					{currentLocation && (
						<div className="space-y-3">
							<div className="p-3 rounded-lg bg-muted space-y-2">
								<p className="text-xs text-muted-foreground">Latitude</p>
								<p className="text-sm font-mono font-semibold">{currentLocation.latitude}</p>
							</div>
							<div className="p-3 rounded-lg bg-muted space-y-2">
								<p className="text-xs text-muted-foreground">Longitude</p>
								<p className="text-sm font-mono font-semibold">{currentLocation.longitude}</p>
							</div>
							<Button
								onClick={() => {
									navigator.clipboard.writeText(
										`${currentLocation.latitude},${currentLocation.longitude}`
									);
									alert("Copied to clipboard!");
								}}
								variant="outline"
								className="w-full"
							>
								Copy Coordinates
							</Button>
							<p className="text-xs text-muted-foreground">
								This location is ONLY visible on your device. Seekers cannot see it.
							</p>
						</div>
					)}
				</DialogContent>
			</Dialog>

			{/* Players Modal */}
			<Dialog open={showPlayersModal} onOpenChange={setShowPlayersModal}>
				<DialogContent className="sm:max-w-[350px]">
					<DialogHeader>
						<DialogTitle>Players in Session ({players.length})</DialogTitle>
					</DialogHeader>
					<div className="space-y-2">
						{players.map((player: PlayerData) => (
							<div
								key={player.id}
								className="p-3 rounded-lg border border-border bg-muted/50 flex items-center justify-between"
							>
								<div>
									<p className="font-medium text-sm">{player.username}</p>
									<p className="text-xs text-muted-foreground capitalize">{player.role}</p>
								</div>
								<div className="text-right">
									{player.current_location && (
										<p className="text-xs text-muted-foreground">
											📍 {player.current_location.latitude.toFixed(3)}, {player.current_location.longitude.toFixed(3)}
										</p>
									)}
									<p className={`text-xs font-semibold ${player.current_location ? "text-green-600" : "text-red-600"}`}>
										{player.current_location ? "Active" : "No GPS"}
									</p>
								</div>
							</div>
						))}
					</div>
				</DialogContent>
			</Dialog>

			{/* Manual Answer Dialog */}
			<Dialog open={answeringQuestion !== null} onOpenChange={(open) => !open && setAnsweringQuestion(null)}>
				<DialogContent className="sm:max-w-[350px]">
					<DialogHeader>
						<DialogTitle>Manual Answer</DialogTitle>
					</DialogHeader>
					<div className="space-y-4">
						<div>
							{answeringQuestion && (
								<p className="text-sm font-medium">
									{questions.find((q: QuestionData) => q.id === answeringQuestion)?.question_text}
								</p>
							)}
						</div>
						<div>
							<label className="text-sm font-medium">Your Answer</label>
							<input
								type="text"
								value={answerText}
								onChange={(e) => setAnswerText(e.target.value)}
								placeholder="e.g., YES, NO, 5 km, John Street"
								className="w-full mt-2 px-3 py-2 rounded-md border border-input bg-background"
								onKeyPress={(e) => {
									if (e.key === "Enter") {
										const question = questions.find((q: QuestionData) => q.id === answeringQuestion);
										if (question) {
											handleManualAnswer(question);
										}
									}
								}}
							/>
						</div>
						<Button
							onClick={() => {
								const question = questions.find((q: QuestionData) => q.id === answeringQuestion);
								if (question) {
									handleManualAnswer(question);
								}
							}}
							disabled={!answerText.trim()}
							className="w-full"
						>
							Submit Answer
						</Button>
					</div>
				</DialogContent>
			</Dialog>
		</Drawer>
	);
}
