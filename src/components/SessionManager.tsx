import React, { useState } from "react";
import { useAtom } from "nanostores/react";
import { authUser, currentSessionId, currentUserRole } from "@/lib/multiplayer-context";
import {
	createSession,
	joinSession,
	getSessionByInviteCode,
	getOrCreatePlayer,
} from "@/lib/multiplayer-api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Copy, Check } from "lucide-react";

export interface SessionManagerProps {
	open: boolean;
	onClose?: () => void;
}

export function SessionManager({ open, onClose }: SessionManagerProps) {
	const [user] = useAtom(authUser);
	const [, setSessionId] = useAtom(currentSessionId);
	const [, setRole] = useAtom(currentUserRole);

	const [tab, setTab] = useState<"create" | "join">("create");
	const [inviteCode, setInviteCode] = useState("");
	const [username, setUsername] = useState("");
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState("");
	const [createdCode, setCreatedCode] = useState<string | null>(null);
	const [copied, setCopied] = useState(false);

	if (!user) {
		return null;
	}

	const handleCreateSession = async () => {
		if (!user) return;
		setLoading(true);
		setError("");

		try {
			const { sessionId, inviteCode } = await createSession(user.id);
			setSessionId(sessionId);
			setRole("hider");
			setCreatedCode(inviteCode);
			// Don't close immediately - let them copy the code first
		} catch (err) {
			setError(err instanceof Error ? err.message : "Failed to create session");
		} finally {
			setLoading(false);
		}
	};

	const handleJoinSession = async () => {
		if (!user || !username.trim()) {
			setError("Please enter a username");
			return;
		}

		setLoading(true);
		setError("");

		try {
			// Find session by invite code
			const session = await getSessionByInviteCode(inviteCode.toUpperCase());
			// Get or create player in session
			await getOrCreatePlayer(session.id, user.id, username);
			setSessionId(session.id);
			setRole("seeker");
			onClose?.();
		} catch (err) {
			setError(err instanceof Error ? err.message : "Failed to join session");
		} finally {
			setLoading(false);
		}
	};

	const handleCopyCode = () => {
		if (createdCode) {
			navigator.clipboard.writeText(createdCode);
			setCopied(true);
			setTimeout(() => setCopied(false), 2000);
		}
	};

	// If session was created, show the code sharing screen
	if (createdCode) {
		return (
			<Dialog open={open} onOpenChange={onClose}>
				<DialogContent className="sm:max-w-[425px]">
					<DialogHeader>
						<DialogTitle>Game Created! 🎮</DialogTitle>
					</DialogHeader>

					<div className="space-y-4">
						<p className="text-sm text-muted-foreground">
							Share this code with seekers so they can join your game.
						</p>

						{/* Invite Code Display */}
						<div className="p-4 rounded-lg bg-primary/10 border-2 border-primary">
							<p className="text-xs text-muted-foreground mb-2">Invite Code</p>
							<div className="flex items-center gap-2">
								<p className="text-4xl font-mono font-bold tracking-widest flex-1">
									{createdCode}
								</p>
								<Button
									size="sm"
									variant="outline"
									onClick={handleCopyCode}
									className="shrink-0"
								>
									{copied ? <Check size={16} /> : <Copy size={16} />}
								</Button>
							</div>
						</div>

						{/* Instructions */}
						<div className="space-y-2 text-sm">
							<p className="font-semibold">Tell seekers to:</p>
							<ol className="list-decimal list-inside space-y-1 text-muted-foreground">
								<li>Open this app</li>
								<li>Click "Join Game"</li>
								<li>Enter the code: <code className="bg-muted px-1 rounded">{createdCode}</code></li>
							</ol>
						</div>

						{/* Action Buttons */}
						<div className="space-y-2">
							<Button onClick={() => onClose?.()} className="w-full">
								Got it! Let's Play
							</Button>
							<Button
								variant="outline"
								onClick={() => {
									setCreatedCode(null);
									setTab("create");
								}}
								className="w-full"
							>
								Create Another Session
							</Button>
						</div>

						<p className="text-xs text-muted-foreground text-center">
							Your location will be tracked automatically. It will never be shared with seekers.
						</p>
					</div>
				</DialogContent>
			</Dialog>
		);
	}

	return (
		<Dialog open={open} onOpenChange={onClose}>
			<DialogContent className="sm:max-w-[425px]">
				<DialogHeader>
					<DialogTitle>Multiplayer Session</DialogTitle>
				</DialogHeader>

				<div className="space-y-4">
					{/* Tab selector */}
					<div className="flex gap-2">
						<Button
							variant={tab === "create" ? "default" : "outline"}
							onClick={() => setTab("create")}
							className="flex-1"
						>
							Create Game
						</Button>
						<Button
							variant={tab === "join" ? "default" : "outline"}
							onClick={() => setTab("join")}
							className="flex-1"
						>
							Join Game
						</Button>
					</div>

					{/* Create tab */}
					{tab === "create" && (
						<div className="space-y-4">
							<p className="text-sm text-muted-foreground">
								Create a new game session as the hider. Share the invite code with seekers to
								join your game.
							</p>
							<Button onClick={handleCreateSession} disabled={loading} className="w-full">
								{loading ? "Creating..." : "Create Game"}
							</Button>
						</div>
					)}

					{/* Join tab */}
					{tab === "join" && (
						<div className="space-y-4">
							<div className="space-y-2">
								<label className="text-sm font-medium">Your Name</label>
								<Input
									placeholder="Enter your name"
									value={username}
									onChange={(e) => setUsername(e.target.value)}
									disabled={loading}
								/>
							</div>
							<div className="space-y-2">
								<label className="text-sm font-medium">Invite Code</label>
								<Input
									placeholder="e.g., ABC123"
									value={inviteCode}
									onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
									disabled={loading}
									maxLength={6}
								/>
							</div>
							<Button onClick={handleJoinSession} disabled={loading} className="w-full">
								{loading ? "Joining..." : "Join Game"}
							</Button>
						</div>
					)}

					{/* Error message */}
					{error && (
						<div className="rounded-md bg-red-50 dark:bg-red-950 p-3 text-sm text-red-700 dark:text-red-300">{error}</div>
					)}
				</div>
			</DialogContent>
		</Dialog>
	);
}
