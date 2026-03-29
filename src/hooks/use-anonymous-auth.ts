import { useEffect } from "react";
import { useAtom } from "nanostores/react";
import { supabase } from "@/lib/supabase";
import { authUser, authSession } from "@/lib/multiplayer-context";

/**
 * Sets up anonymous authentication for the user.
 * If no user is logged in, creates an anonymous session automatically.
 */
export function useAnonymousAuth() {
	const [user, setUser] = useAtom(authUser);
	const [session, setSession] = useAtom(authSession);

	useEffect(() => {
		// Check if already authenticated
		supabase.auth.getSession().then(({ data: { session } }: any) => {
			if (session?.user) {
				setUser(session.user);
				setSession(session);
				return;
			}

			// If no session, create anonymous one
			supabase.auth.signInAnonymously().then(({ data, error }: any) => {
				if (error) {
					console.error("Anonymous sign in error:", error);
					return;
				}

				if (data.session?.user) {
					setUser(data.session.user);
					setSession(data.session);
				}
			});
		});

		// Listen for auth changes
		const {
			data: { subscription },
		} = supabase.auth.onAuthStateChange((_event: any, session: any) => {
			setSession(session);
			setUser(session?.user ?? null);
		});

		return () => {
			subscription?.unsubscribe();
		};
	}, [setUser, setSession]);
}
