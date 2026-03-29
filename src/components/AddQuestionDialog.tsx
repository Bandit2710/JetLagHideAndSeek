import { useStore } from "@nanostores/react";
import * as turf from "@turf/turf";
import React from "react";
import { toast } from "react-toastify";

import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { SidebarMenuButton } from "@/components/ui/sidebar-l";
import { addQuestion, isLoading, leafletMapContext } from "@/lib/context";
import { sessionSettings } from "@/lib/multiplayer-context";

export const AddQuestionDialog = ({
    children,
}: {
    children: React.ReactNode;
}) => {
    const $isLoading = useStore(isLoading);
    const $sessionSettings = useStore(sessionSettings);
    const [open, setOpen] = React.useState(false);

    const isEnabled = (id: string) => {
        const enabled = $sessionSettings?.enabledQuestionTypes;
        if (!enabled || enabled.length === 0) return true;
        return enabled.includes(id);
    };

    const runAddRadius = () => {
        const map = leafletMapContext.get();
        if (!map) return false;
        const center = map.getCenter();
        addQuestion({
            id: "radius",
            data: { lat: center.lat, lng: center.lng },
        });
        return true;
    };

    const runAddThermometer = () => {
        const map = leafletMapContext.get();
        if (!map) return false;
        const center = map.getCenter();
        const destination = turf.destination([center.lng, center.lat], 5, 90, {
            units: "miles",
        });

        addQuestion({
            id: "thermometer",
            data: {
                latA: center.lat,
                lngB: center.lng,
                latB: destination.geometry.coordinates[1],
                lngA: destination.geometry.coordinates[0],
            },
        });

        return true;
    };

    const runAddTentacles = () => {
        const map = leafletMapContext.get();
        if (!map) return false;
        const center = map.getCenter();
        addQuestion({
            id: "tentacles",
            data: { lat: center.lat, lng: center.lng },
        });
        return true;
    };

    const runAddMatching = () => {
        const map = leafletMapContext.get();
        if (!map) return false;
        const center = map.getCenter();
        addQuestion({
            id: "matching",
            data: { lat: center.lat, lng: center.lng },
        });
        return true;
    };

    const runAddMeasuring = () => {
        const map = leafletMapContext.get();
        if (!map) return false;
        const center = map.getCenter();
        addQuestion({
            id: "measuring",
            data: { lat: center.lat, lng: center.lng },
        });
        return true;
    };

    const runAddStreetTrace = () => {
        const map = leafletMapContext.get();
        if (!map) return false;
        const center = map.getCenter();
        addQuestion({
            id: "street-trace",
            data: { lat: center.lat, lng: center.lng },
        });
        return true;
    };


    const runPasteQuestion = async () => {
        if (!navigator || !navigator.clipboard) {
            toast.error("Clipboard API not supported in your browser");
            return false;
        }

        try {
            await toast.promise(
                navigator.clipboard.readText().then((text) => {
                    const parsed = JSON.parse(text);
                    const question =
                        parsed &&
                        typeof parsed === "object" &&
                        !Array.isArray(parsed)
                            ? { ...parsed, key: Math.random() }
                            : parsed;

                    return addQuestion(question);
                }),
                {
                    pending: "Reading from clipboard",
                    success: "Question added from clipboard!",
                    error: "No valid question found in clipboard",
                },
                { autoClose: 1000 },
            );

            return true;
        } catch {
            return false;
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>{children}</DialogTrigger>
            <DialogContent className="max-h-[80vh] overflow-y-auto">
                <DialogTitle>Add Question</DialogTitle>
                <DialogDescription>
                    Select which question type you would like to add.
                </DialogDescription>

                <div className="mt-4 space-y-4">
                    {/* Standard Questions Section */}
                    <div>
                        <h3 className="font-semibold mb-2 text-sm text-foreground/70">Standard Questions</h3>
                        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                            <SidebarMenuButton
                                onClick={() => {
                                    if (runAddRadius()) setOpen(false);
                                }}
                                disabled={$isLoading || !isEnabled("radius")}
                            >
                                Add Radius
                            </SidebarMenuButton>
                            <SidebarMenuButton
                                onClick={() => {
                                    if (runAddThermometer()) setOpen(false);
                                }}
                                disabled={$isLoading || !isEnabled("thermometer")}
                            >
                                Add Thermometer
                            </SidebarMenuButton>
                            <SidebarMenuButton
                                onClick={() => {
                                    if (runAddTentacles()) setOpen(false);
                                }}
                                disabled={$isLoading || !isEnabled("tentacles")}
                            >
                                Add Tentacles
                            </SidebarMenuButton>
                            <SidebarMenuButton
                                onClick={() => {
                                    if (runAddMatching()) setOpen(false);
                                }}
                                disabled={$isLoading || !isEnabled("matching")}
                            >
                                Add Matching
                            </SidebarMenuButton>
                            <SidebarMenuButton
                                onClick={() => {
                                    if (runAddMeasuring()) setOpen(false);
                                }}
                                disabled={$isLoading || !isEnabled("measuring")}
                            >
                                Add Measuring
                            </SidebarMenuButton>
                        </div>
                    </div>

                    {/* Photo Questions Section */}
                    <div>
                        <h3 className="font-semibold mb-2 text-sm text-foreground/70">Photo Questions</h3>
                        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                            <SidebarMenuButton
                                onClick={() => {
                                    if (runAddStreetTrace()) setOpen(false);
                                }}
                                disabled={$isLoading || !isEnabled("street-trace")}
                                className="sm:col-span-2"
                            >
                                Add Street Trace
                            </SidebarMenuButton>
                        </div>
                    </div>

                    {/* Other Actions */}
                    <div className="border-t pt-2">
                        <SidebarMenuButton
                            onClick={async () => {
                                const ok = await runPasteQuestion();
                                if (ok) setOpen(false);
                            }}
                            disabled={$isLoading}
                        >
                            Paste Question
                        </SidebarMenuButton>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
};
