import React, { useMemo, useState } from "react";
import { useStore } from "@nanostores/react";
import { Button } from "@/components/ui/button";
import {
	currentSessionId,
	currentUserRole,
	sessionPlayers,
	sessionSettings,
} from "@/lib/multiplayer-context";
import { Settings2 } from "lucide-react";

const QUESTION_TYPE_LABELS: Record<string, string> = {
	radius: "Radius",
	thermometer: "Thermometer",
	tentacles: "Tentacles",
	matching: "Matching",
	measuring: "Measuring",
	"street-trace": "Street Trace",
};

export function MultiplayerOptionsTab() {
	const sessionId = useStore(currentSessionId);
	const role = useStore(currentUserRole);
	const players = useStore(sessionPlayers);
	const settings = useStore(sessionSettings);
	const [open, setOpen] = useState(false);

	if (!sessionId) {
		return null;
	}

	const enabledTypes = settings?.enabledQuestionTypes;
	const enabledLabels = useMemo(() => {
		if (!enabledTypes || enabledTypes.length === 0) {
			return ["All question types"];
		}

		return enabledTypes.map((type) => QUESTION_TYPE_LABELS[type] ?? type);
	}, [enabledTypes]);

	return (
		<div className="fixed right-4 bottom-4 z-[1200]">
			{open && (
				<div className="mb-2 w-72 rounded-lg border border-border bg-card p-3 shadow-lg space-y-3">
					<div>
						<p className="text-xs text-muted-foreground">Role</p>
						<p className="text-sm font-medium capitalize">{role ?? "unknown"}</p>
					</div>
					<div>
						<p className="text-xs text-muted-foreground">Players</p>
						<p className="text-sm font-medium">{players.length}</p>
					</div>
					<div>
						<p className="text-xs text-muted-foreground mb-1">Round Settings</p>
						<div className="flex flex-wrap gap-1">
							{enabledLabels.map((label) => (
								<span
									key={label}
									className="text-xs px-2 py-1 rounded-full bg-primary/10 text-primary"
								>
									{label}
								</span>
							))}
						</div>
					</div>
					<p className="text-xs text-muted-foreground">
						Multiplayer sync shares map boundary changes from questions. Panning is not synced.
					</p>
				</div>
			)}
			<Button onClick={() => setOpen((v) => !v)}>
				<Settings2 size={16} /> Multiplayer
			</Button>
		</div>
	);
}
