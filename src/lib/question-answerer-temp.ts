import { hiderifyRadius } from "@/maps/questions/radius";
import { hiderifyMeasuring } from "@/maps/questions/measuring";
import { hiderifyMatching } from "@/maps/questions/matching";
import type { Question, RadiusQuestion, MeasuringQuestion, MatchingQuestion } from "@/maps/schema";

/**
 * Computes the answer to a question based on hider location
 * This runs on the hider's device only
 */
export async function computeQuestionAnswer(
	questionType: string,
	hiderLocation: { latitude: number; longitude: number }
): Promise<string> {
	try {
		switch (questionType) {
			case "radius": {
				// Radius question: "Is hider within X km?"
				// Answer format: "YES" or "NO"
				try {
					// Call the radius hiderify function to compute answer
					const result = hiderifyRadius({
						answer: hiderLocation,
						type: "radius"
					} as any);
					return result ? "YES" : "NO";
				} catch {
					// Fallback: if radius logic fails, return NO
					return "NO";
				}
			}

			case "matching-zone": {
				// Matching question: Same prefecture/zone
				// Answer format: "YES" or "NO"
				try {
					// Call the matching hiderify function
					const result = hiderifyMatching({
						answer: hiderLocation,
						type: "matching"
					} as any);
					return result ? "YES" : "NO";
				} catch {
					return "NO";
				}
			}

			case "matching-nearest": {
				// Matching question: Same nearest location
				// Answer format: "YES" or "NO"
				try {
					const result = hiderifyMatching({
						answer: hiderLocation,
						type: "matching"
					} as any);
					return result ? "YES" : "NO";
				} catch {
					return "NO";
				}
			}

			case "measuring-distance": {
				// Measuring question: Distance to location
				// Answer format: "X km" or "X miles"
				try {
					// Call the measuring hiderify function
					const result = hiderifyMeasuring({
						answer: hiderLocation,
						type: "measuring"
					} as any);
					// Result should be a number (distance)
					return `${Number(result).toFixed(1)} km`;
				} catch {
					return "Unknown distance";
				}
			}

			case "thermometer": {
				// Thermometer: Getting closer or farther
				// Answer format: "HOTTER" or "COLDER"
				// Hider always says getting closer at start
				return "HOTTER";
			}

			case "street-trace": {
				// Street trace: Which street
				// Answer format: "Street name"
				// Requires additional context from question data
				return "Unknown street";
			}

			case "tentacles": {
				// Tentacles: Multiple choice
				// Answer format: Option letter or number
				// Requires question context to determine which option
				return "A";
			}

			default:
				return "Not implemented";
		}
	} catch (error) {
		console.error("Error computing answer:", error);
		return "Error computing answer";
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
