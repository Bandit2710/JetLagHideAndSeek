import { hiderifyRadius } from "@/maps/questions/radius";
import { hiderifyMeasuring } from "@/maps/questions/measuring";
import { hiderifyMatching } from "@/maps/questions/matching";
import { hiderifyThermometer } from "@/maps/questions/thermometer";
import { hiderifyStreetTrace } from "@/maps/questions/streetTrace";
import { hiderifyTentacles } from "@/maps/questions/tentacles";
import { hiderMode } from "@/lib/context";

/**
 * Computes the answer to a question based on hider location
 * This runs on the hider's device only
 */
export async function computeQuestionAnswer(
	question: any,
	hiderLocation: { latitude: number; longitude: number }
): Promise<string> {
	const questionType = question?.question_type;
	const seekerLat = question?.location?.latitude ?? question?.lat;
	const seekerLng = question?.location?.longitude ?? question?.lng;
	const questionData = question?.data ?? {};

	const previousHiderMode = hiderMode.get();
	hiderMode.set({ latitude: hiderLocation.latitude, longitude: hiderLocation.longitude });

	try {
		switch (questionType) {
			case "radius": {
				// Radius question: "Is hider within X km?"
				// Answer format: "YES" or "NO"
				const result = hiderifyRadius({
					...question,
					...questionData,
					lat: seekerLat,
					lng: seekerLng,
					radius: questionData.radius ?? question?.radius ?? 10,
					unit: questionData.unit ?? question?.unit ?? "kilometers",
					within: questionData.within ?? question?.within ?? true,
				} as any);
				return result?.within ? "YES" : "NO";
			}

			case "matching-zone": {
				// Matching question: Same prefecture/zone
				// Answer format: "YES" or "NO"
				const result = await hiderifyMatching({
					...question,
					...questionData,
					lat: seekerLat,
					lng: seekerLng,
					type: questionData.type ?? question?.type ?? "zone",
					same: questionData.same ?? question?.same ?? true,
					cat: questionData.cat ?? question?.cat ?? { adminLevel: 4 },
				} as any);
				return result?.same ? "YES" : "NO";
			}

			case "matching-nearest": {
				// Matching question: Same nearest location
				// Answer format: "YES" or "NO"
				const result = await hiderifyMatching({
					...question,
					...questionData,
					lat: seekerLat,
					lng: seekerLng,
					type: questionData.type ?? question?.type ?? "same-nearest-mcdonalds",
					same: questionData.same ?? question?.same ?? true,
				} as any);
				return result?.same ? "YES" : "NO";
			}

			case "measuring-distance": {
				// Measuring question: Distance to location
				// Answer format: "X km" or "X miles"
				const result = await hiderifyMeasuring({
					...question,
					...questionData,
					lat: seekerLat,
					lng: seekerLng,
					type: questionData.type ?? question?.type ?? "coastline",
					hiderCloser: questionData.hiderCloser ?? question?.hiderCloser ?? true,
					unit: questionData.unit ?? question?.unit ?? "miles",
				} as any);
				const distance = Number((result as any)?.distance ?? result);
				return `${Number.isFinite(distance) ? distance.toFixed(1) : "0.0"} km`;
			}

			case "thermometer": {
				// Thermometer: Getting closer or farther
				// Answer format: "HOTTER" or "COLDER"
				const result = hiderifyThermometer({
					...question,
					...questionData,
					latA: questionData.latA ?? question?.latA ?? seekerLat,
					lngA: questionData.lngA ?? question?.lngA ?? seekerLng,
					latB: questionData.latB ?? question?.latB ?? seekerLat,
					lngB: questionData.lngB ?? question?.lngB ?? (typeof seekerLng === "number" ? seekerLng + 0.05 : seekerLng),
					warmer: questionData.warmer ?? question?.warmer ?? true,
				} as any);
				return result?.warmer ? "HOTTER" : "COLDER";
			}

			case "street-trace": {
				// Street trace: Which street
				// Answer format: "Street name"
				const result = await hiderifyStreetTrace({
					...question,
					...questionData,
					lat: seekerLat,
					lng: seekerLng,
					trace: questionData.trace ?? question?.trace ?? [],
					source: questionData.source ?? question?.source ?? "question",
				} as any);
				if (Array.isArray(result?.trace) && result.trace.length > 0) {
					return `Trace with ${result.trace.length} points`;
				}
				return "Unknown street";
			}

			case "tentacles": {
				// Tentacles: Multiple choice
				// Answer format: Option letter or number
				const result = await hiderifyTentacles({
					...question,
					...questionData,
					lat: seekerLat,
					lng: seekerLng,
					radius: questionData.radius ?? question?.radius ?? 15,
					unit: questionData.unit ?? question?.unit ?? "miles",
					locationType: questionData.locationType ?? question?.locationType ?? "park",
					location: questionData.location ?? question?.locationAnswer ?? question?.location ?? false,
				} as any);
				if (result?.location === false) {
					return "Not within radius";
				}
				return (
					result?.location?.properties?.name ??
					(result?.location?.properties as any)?.["name:en"] ??
					"Unknown location"
				);
			}

			default:
				return "Not implemented";
		}
	} catch (error) {
		console.error("Error computing answer:", error);
		return "Error computing answer";
	} finally {
		hiderMode.set(previousHiderMode);
	}
}

/**
 * Simple distance calculation (haversine formula)
 * Used for basic radius questions
 */
export function calculateDistance(
	lat1: number,
	lon1: number,
	lat2: number,
	lon2: number,
	unit: "km" | "miles" = "km"
): number {
	const R = unit === "km" ? 6371 : 3959; // Earth's radius

	const dLat = ((lat2 - lat1) * Math.PI) / 180;
	const dLon = ((lon2 - lon1) * Math.PI) / 180;

	const a =
		Math.sin(dLat / 2) * Math.sin(dLat / 2) +
		Math.cos((lat1 * Math.PI) / 180) *
			Math.cos((lat2 * Math.PI) / 180) *
			Math.sin(dLon / 2) *
			Math.sin(dLon / 2);

	const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
	const distance = R * c;

	return distance;
}
