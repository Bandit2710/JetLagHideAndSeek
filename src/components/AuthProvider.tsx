import { useAnonymousAuth } from "@/hooks/use-anonymous-auth";

export function AuthProvider({ children }: { children: React.ReactNode }) {
	// Initialize anonymous auth and set up auth state
	useAnonymousAuth();

	return <>{children}</>;
}
