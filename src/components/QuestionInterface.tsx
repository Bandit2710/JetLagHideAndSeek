import React, { useState } from "react";
import { useAtom } from "nanostores/react";
import {
	sessionQuestions,
	currentSessionId,
	authUser,
	isSeeker,
	type QuestionData,
} from "@/lib/multiplayer-context";
import { useRealtimeQuestions } from "@/hooks/use-multiplayer";
import { addQuestion } from "@/lib/multiplayer-api";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ChevronDown, ChevronUp, Send } from "lucide-react";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";

export interface QuestionPanelProps {
	currentLocation?: { latitude: number; longitude: number };
}

export function QuestionPanel({ currentLocation }: QuestionPanelProps) {
	const [questions] = useAtom(sessionQuestions);
	const [sessionId] = useAtom(currentSessionId);
	const [user] = useAtom(authUser);
	const [seeker] = useAtom(isSeeker);

	const [collapsed, setCollapsed] = useState(false);
	const [showNewQuestion, setShowNewQuestion] = useState(false);
	const [selectedQuestion, setSelectedQuestion] = useState<string | null>(null);

	useRealtimeQuestions();

	const selectedQuestionData = questions.find((q: QuestionData) => q.id === selectedQuestion);

	const handleAskQuestion = async (questionType: string, questionText: string) => {
		if (!sessionId || !user || !currentLocation) return;

		try {
			await addQuestion(
				sessionId,
				user.id,
				questionType,
				questionText,
				currentLocation,
				"Waiting for answer..." // Will be updated by hider
			);

			setShowNewQuestion(false);
		} catch (error) {
			console.error("Failed to ask question:", error);
		}
	};

	const presetQuestions = [
		{ type: "radius", text: "Is the hider within 10km?" },
		{ type: "matching-nearest", text: "Is closest to same POI?" },
		{ type: "matching-zone", text: "Same prefecture?" },
		{ type: "measuring-distance", text: "Distance to coast?" },
	];

	if (!seeker) {
		return null;
	}

	return (
		<Drawer open={!collapsed} onOpenChange={(open) => setCollapsed(!open)}>
			<DrawerContent className="fixed bottom-0 left-0 right-0 max-h-[80vh] rounded-t-lg">
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

							{presetQuestions.map((q) => (
								<Button
									key={q.type}
									variant="outline"
									className="w-full justify-start h-auto py-2"
									onClick={() => {
										handleAskQuestion(q.type, q.text);
									}}
								>
									{q.text}
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
	);
}
