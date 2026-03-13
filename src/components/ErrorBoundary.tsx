"use client";

import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle, RefreshCcw } from "lucide-react";

interface Props {
    children?: ReactNode;
    fallback?: ReactNode;
    onReset?: () => void;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false,
        error: null,
    };

    public static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error("Uncaught UI error:", error, errorInfo);
    }

    public handleReset = () => {
        this.setState({ hasError: false, error: null });
        if (this.props.onReset) {
            this.props.onReset();
        }
    };

    public render() {
        if (this.state.hasError) {
            if (this.props.fallback) {
                return this.props.fallback;
            }
            return (
                <div className="min-h-[400px] w-full flex flex-col items-center justify-center p-8 bg-zinc-950 rounded-2xl border border-red-500/20 text-center">
                    <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mb-6">
                        <AlertTriangle className="w-8 h-8 text-red-500" />
                    </div>
                    <h2 className="text-xl font-bold text-white mb-2 tracking-widest" style={{ fontFamily: "var(--font-heading)" }}>
                        UI COMPONENT CRASHED
                    </h2>
                    <p className="text-zinc-500 text-xs tracking-wide max-w-md mb-8" style={{ fontFamily: "var(--font-body)" }}>
                        An unexpected rendering error occurred. You can attempt to recover the UI without losing your background state.
                        {this.state.error?.message && (
                            <span className="block mt-4 text-[10px] text-red-400 font-mono bg-red-500/10 p-3 rounded text-left overflow-x-auto">
                                {this.state.error.message}
                            </span>
                        )}
                    </p>
                    <button
                        onClick={this.handleReset}
                        className="flex items-center gap-2 px-6 py-3 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-500 rounded-xl text-xs font-bold tracking-[0.2em] transition-all"
                        style={{ fontFamily: "var(--font-body)" }}
                    >
                        <RefreshCcw className="w-4 h-4" />
                        RECOVER UI
                    </button>
                </div>
            );
        }

        return this.props.children;
    }
}
