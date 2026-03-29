import React from "react";
import { AlertCircle } from "lucide-react";

interface Props {
	children: React.ReactNode;
	fallback?: React.ReactNode;
}

interface State {
	hasError: boolean;
	error?: Error;
}

export class ErrorBoundary extends React.Component<Props, State> {
	constructor(props: Props) {
		super(props);
		this.state = { hasError: false };
	}

	static getDerivedStateFromError(error: Error): State {
		return { hasError: true, error };
	}

	componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
		console.error("Error caught by boundary:", error, errorInfo);
	}

	render() {
		if (this.state.hasError) {
			return (
				this.props.fallback || (
					<div className="flex items-center justify-center p-4 rounded-lg bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-900">
						<div className="flex items-center gap-3">
							<AlertCircle className="text-red-600 dark:text-red-400" size={20} />
							<div>
								<p className="font-semibold text-red-800 dark:text-red-200">Something went wrong</p>
								<p className="text-sm text-red-700 dark:text-red-300">
									{this.state.error?.message || "An unexpected error occurred"}
								</p>
							</div>
						</div>
					</div>
				)
			);
		}

		return this.props.children;
	}
}
