import React, { useEffect, useMemo, useState } from "react";
import { useStore } from "@nanostores/react";
import { authUser, currentSessionId, currentUserRole, sessionSettings } from "@/lib/multiplayer-context";
import { baseTileLayer, followMe, hiderMode, linkHiderToGPS, mapGeoLocation } from "@/lib/context";
import { createSessionWithSettings, getOrCreatePlayer, getSessionByInviteCode } from "@/lib/multiplayer-api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Check, Copy, Link as LinkIcon, Share2 } from "lucide-react";

export interface SessionManagerProps {
	open: boolean;
	onClose?: () => void;
}

const JOIN_QUERY_PARAM = "join";

export function SessionManager({ open, onClose }: SessionManagerProps) {
	const user = useStore(authUser);

	const [tab, setTab] = useState<"create" | "join">("create");
	const [inviteCode, setInviteCode] = useState("");
	const [username, setUsername] = useState("");
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState("");
	const [createdCode, setCreatedCode] = useState<string | null>(null);
	const [copied, setCopied] = useState(false);
	const [linkCopied, setLinkCopied] = useState(false);

	const joinLink = useMemo(() => {
		if (!createdCode || typeof window === "undefined") return "";
		const url = new URL(window.location.href);
		url.searchParams.set(JOIN_QUERY_PARAM, createdCode);
		return url.toString();
	}, [createdCode]);

	useEffect(() => {
		if (!open || createdCode || typeof window === "undefined") return;

		const url = new URL(window.location.href);
		const codeFromUrl = url.searchParams.get(JOIN_QUERY_PARAM);
		if (!codeFromUrl) return;

		setTab("join");
		setInviteCode(codeFromUrl.toUpperCase());
	}, [open, createdCode]);

	if (!user) {
		return null;
	}

	const handleCreateSession = async () => {
		setLoading(true);
		setError("");
		const selectedTileLayer = baseTileLayer.get();

		try {
			const { sessionId, inviteCode } = await createSessionWithSettings(user.id);
			currentSessionId.set(sessionId);
			currentUserRole.set("hider");
			sessionSettings.set(null);

			const fallback = mapGeoLocation.get().geometry.coordinates;
			hiderMode.set({ latitude: fallback[1], longitude: fallback[0] });
			followMe.set(false);
			linkHiderToGPS.set(true);
			baseTileLayer.set(selectedTileLayer);

			setCreatedCode(inviteCode);
		} catch (err) {
			setError(err instanceof Error ? err.message : "Failed to create session");
		} finally {
			setLoading(false);
		}
	};

	const handleJoinSession = async () => {
		if (!username.trim()) {
			setError("Please enter a username");
			return;
		}

		setLoading(true);
		setError("");
		const selectedTileLayer = baseTileLayer.get();

		try {
			const session = await getSessionByInviteCode(inviteCode.toUpperCase());
			await getOrCreatePlayer(session.id, user.id, username);

			currentSessionId.set(session.id);
			currentUserRole.set("seeker");
			sessionSettings.set(null);
			followMe.set(true);
			linkHiderToGPS.set(false);
			hiderMode.set(false);
			baseTileLayer.set(selectedTileLayer);

			if (typeof window !== "undefined") {
				const url = new URL(window.location.href);
				url.searchParams.delete(JOIN_QUERY_PARAM);
				window.history.replaceState({}, "", url.toString());
			}

			onClose?.();
		} catch (err) {
			setError(err instanceof Error ? err.message : "Failed to join session");
		} finally {
			setLoading(false);
		}
	};

	const handleCopyCode = () => {
		if (!createdCode) return;
		navigator.clipboard.writeText(createdCode);
		setCopied(true);
		setTimeout(() => setCopied(false), 2000);
	};

	const handleCopyJoinLink = () => {
		if (!joinLink) return;
		navigator.clipboard.writeText(joinLink);
		setLinkCopied(true);
		setTimeout(() => setLinkCopied(false), 2000);
	};

	const handleShareJoinLink = async () => {
		if (!joinLink || typeof navigator === "undefined" || !("share" in navigator)) {
			handleCopyJoinLink();
			return;
		}

		try {
			await navigator.share({
				title: "Join my Jet Lag Hide & Seek game",
				text: `Use code ${createdCode} to join my game.`,
				url: joinLink,
			});
		} catch {
			// Ignore canceled share dialog.
		}
	};

	if (createdCode) {
		return (
			<Dialog open={open} onOpenChange={onClose}>
				<DialogContent className="sm:max-w-[425px]">
					<DialogHeader>
						<DialogTitle>Game Created! 🎮</DialogTitle>
					</DialogHeader>

					<div className="space-y-4">
						<p className="text-sm text-muted-foreground">
							Share this code or link with seekers so they can join your game.
						</p>

						<div className="p-4 rounded-lg bg-primary/10 border-2 border-primary">
							<p className="text-xs text-muted-foreground mb-2">Invite Code</p>
							<div className="flex items-center gap-2">
								<p className="text-4xl font-mono font-bold tracking-widest flex-1">
									{createdCode}
								</p>
								<Button size="sm" variant="outline" onClick={handleCopyCode} className="shrink-0">
									{copied ? <Check size={16} /> : <Copy size={16} />}
								</Button>
							</div>
						</div>

						<div className="space-y-2">
							<p className="text-xs text-muted-foreground">Shareable Join Link</p>
							<div className="flex items-center gap-2">
								<div className="text-xs bg-muted rounded px-2 py-2 flex-1 break-all">
									{joinLink}
								</div>
								<Button size="sm" variant="outline" onClick={handleCopyJoinLink}>
									{linkCopied ? <Check size={16} /> : <LinkIcon size={16} />}
								</Button>
								<Button size="sm" variant="outline" onClick={handleShareJoinLink}>
									<Share2 size={16} />
								</Button>
							</div>
						</div>

						<div className="space-y-2 text-sm">
							<p className="font-semibold">Tell seekers to:</p>
							<ol className="list-decimal list-inside space-y-1 text-muted-foreground">
								<li>Open the shared join link</li>
								<li>Enter their name</li>
								<li>Join the session</li>
							</ol>
						</div>

						<div className="space-y-2">
							<Button onClick={() => onClose?.()} className="w-full">
								Got it! Let&apos;s Play
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

					{tab === "create" && (
						<div className="space-y-4">
							<p className="text-sm text-muted-foreground">
								Create a new game session as the hider, then share the invite code or generated link.
							</p>

							<Button onClick={handleCreateSession} disabled={loading} className="w-full">
								{loading ? "Creating..." : "Create Game"}
							</Button>
						</div>
					)}

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

					{error && (
						<div className="rounded-md bg-red-50 dark:bg-red-950 p-3 text-sm text-red-700 dark:text-red-300">
							{error}
						</div>
					)}
				</div>
			</DialogContent>
		</Dialog>
	);
}
