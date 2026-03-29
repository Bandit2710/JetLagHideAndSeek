import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL;
const supabaseKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
	throw new Error(
		"Missing Supabase environment variables. Please set PUBLIC_SUPABASE_URL and PUBLIC_SUPABASE_ANON_KEY in your .env file."
	);
}

export const supabase = createClient(supabaseUrl, supabaseKey);

export type Database = {
	public: {
		Tables: {
			sessions: {
				Row: {
					id: string;
					created_at: string;
					status: "waiting" | "active" | "ended";
					hider_id: string | null;
					settings: any | null;
					invite_code: string;
				};
				Insert: {
					id?: string;
					created_at?: string;
					status?: "waiting" | "active" | "ended";
					hider_id?: string | null;
					settings?: any | null;
					invite_code: string;
				};
				Update: {
					status?: "waiting" | "active" | "ended";
					hider_id?: string | null;
					settings?: any | null;
				};
			};
			players: {
				Row: {
					id: string;
					session_id: string;
					user_id: string;
					role: "hider" | "seeker";
					current_location: {
						latitude: number;
						longitude: number;
					} | null;
					created_at: string;
					username: string;
				};
				Insert: {
					id?: string;
					session_id: string;
					user_id: string;
					role: "hider" | "seeker";
					current_location?: {
						latitude: number;
						longitude: number;
					} | null;
					created_at?: string;
					username: string;
				};
				Update: {
					current_location?: {
						latitude: number;
						longitude: number;
					} | null;
					role?: "hider" | "seeker";
				};
			};
			questions: {
				Row: {
					id: string;
					session_id: string;
					seeker_id: string;
					question_type: string;
					question_text: string;
					location: { latitude: number; longitude: number };
					question_data: any | null;
					answer: string;
					created_at: string;
				};
				Insert: {
					id?: string;
					session_id: string;
					seeker_id: string;
					question_type: string;
					question_text: string;
					location: { latitude: number; longitude: number };
					question_data?: any | null;
					answer: string;
					created_at?: string;
				};
				Update: {
					answer?: string;
					question_data?: any | null;
				};
			};
			timers: {
				Row: {
					id: string;
					session_id: string;
					title: string;
					duration_ms: number;
					started_at: string;
					is_active: boolean;
				};
				Insert: {
					id?: string;
					session_id: string;
					title: string;
					duration_ms: number;
					started_at?: string;
					is_active?: boolean;
				};
				Update: {
					is_active?: boolean;
					duration_ms?: number;
					started_at?: string;
				};
			};
		};
	};
};
