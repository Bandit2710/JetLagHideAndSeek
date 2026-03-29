import React, { useState } from "react";
import { useStore } from "@nanostores/react";
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
import { ChevronDown, Send, PanelBottomOpen } from "lucide-react";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";

export interface QuestionPanelProps {
	currentLocation?: { latitude: number; longitude: number };
}

export function QuestionPanel({ currentLocation }: QuestionPanelProps) {
	const questions = useStore(sessionQuestions);
	const sessionId = useStore(currentSessionId);
	const user = useStore(authUser);
	const seeker = useStore(isSeeker);

	const [collapsed, setCollapsed] = useState(false);
	const [showNewQuestion, setShowNewQuestion] = useState(false);
	const [selectedQuestion, setSelectedQuestion] = useState<string | null>(null);

	useRealtimeQuestions();

	const handleAskQuestion = async (questionType: string, questionText: string) => {
		if (!sessionId || !user || !currentLocation) return;

		const payloadByType: Record<string, any> = {
			radius: {
				id: "radius",
				key: Math.random(),
				data: { lat: currentLocation.latitude, lng: currentLocation.longitude },
			},
			thermometer: {
				id: "thermometer",
				key: Math.random(),
				data: {
					latA: currentLocation.latitude,
					lngA: currentLocation.longitude,
					latB: currentLocation.latitude + 0.05,
					lngB: currentLocation.longitude + 0.05,
				},
			},
			tentacles: {
				id: "tentacles",
				key: Math.random(),
				data: { lat: currentLocation.latitude, lng: currentLocation.longitude },
			},
			"matching-zone": {
				id: "matching",
				key: Math.random(),
				data: { lat: currentLocation.latitude, lng: currentLocation.longitude, type: "zone" },
			},
			"matching-nearest": {
				id: "matching",
				key: Math.random(),
				data: { lat: currentLocation.latitude, lng: currentLocation.longitude, type: "same-nearest-mcdonalds" },
			},
			"measuring-distance": {
				id: "measuring",
				key: Math.random(),
				data: { lat: currentLocation.latitude, lng: currentLocation.longitude, type: "coastline" },
			},
			"street-trace": {
				id: "street-trace",
				key: Math.random(),
				data: { lat: currentLocation.latitude, lng: currentLocation.longitude },
			},
		};

		const payload = payloadByType[questionType];

		try {
			await addQuestion(
				sessionId,
				user.id,
				questionType,
				questionText,
				currentLocation,
				"Waiting for answer...",
				payload
			);

			setShowNewQuestion(false);
		} catch (error) {
			console.error("Failed to ask question:", error);
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
	];

	if (!seeker) {
		return null;
	}

	return (
		<>
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

							{questionTypes.map((q) => (
								<Button
									key={q.type}
									variant="outline"
									className="w-full justify-start h-auto py-2"
									onClick={() => {
										handleAskQuestion(q.type, q.text);
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

		{collapsed && (
			<Button
				className="fixed bottom-4 left-4 z-[1100] shadow-lg"
				onClick={() => setCollapsed(false)}
			>
				<PanelBottomOpen size={16} /> Show Seeker Panel
			</Button>
		)}
		</>
	);
}
