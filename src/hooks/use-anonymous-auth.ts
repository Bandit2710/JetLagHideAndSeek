import { useEffect } from "react";
import { useStore } from "@nanostores/react";
import { supabase } from "@/lib/supabase";
import { authUser, authSession } from "@/lib/multiplayer-context";

/**
 * Sets up anonymous authentication for the user.
 * If no user is logged in, creates an anonymous session automatically.
 */
export function useAnonymousAuth() {
	useStore(authUser);
	useStore(authSession);

	useEffect(() => {
		// Check if already authenticated
		supabase.auth.getSession().then(({ data: { session } }: any) => {
			if (session?.user) {
				authUser.set(session.user);
				authSession.set(session);
				return;
			}

			// If no session, create anonymous one
			supabase.auth.signInAnonymously().then(({ data, error }: any) => {
				if (error) {
					console.error("Anonymous sign in error:", error);
					return;
				}

				if (data.session?.user) {
					authUser.set(data.session.user);
					authSession.set(data.session);
				}
			});
		});

		// Listen for auth changes
		const {
			data: { subscription },
		} = supabase.auth.onAuthStateChange((_event: any, session: any) => {
			authSession.set(session);
			authUser.set(session?.user ?? null);
		});

		return () => {
			subscription?.unsubscribe();
		};
	}, []);
}
