"use client";

import React from "react";
import { tokens } from "@/lib/design-tokens";

type ErrorBoundaryProps = {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  onReset?: () => void;
};

type State = { hasError: boolean; error: Error | null };

export default class ErrorBoundary extends React.Component<ErrorBoundaryProps, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("ErrorBoundary:", error, info);
  }

  reset = () => {
    this.setState({ hasError: false, error: null });
    this.props.onReset?.();
  };

  render() {
    if (!this.state.hasError) return this.props.children;
    if (this.props.fallback) return this.props.fallback;

    return (
      <div
        role="alert"
        style={{
          padding: tokens.space.px12,
          background: tokens.colors.surface.glass,
          border: `1px solid ${tokens.colors.border.danger}`,
          borderRadius: tokens.radius.lg,
          color: tokens.colors.text.primary,
          display: "flex",
          flexDirection: "column",
          gap: tokens.space.px5,
        }}
      >
        <strong style={{ color: tokens.colors.state.error, fontSize: tokens.fontSize.md }}>
          Bir sorun oluştu
        </strong>
        <span style={{ color: tokens.colors.text.secondary, fontSize: tokens.fontSize.sm }}>
          {this.state.error?.message ?? "Bilinmeyen hata"}
        </span>
        <button
          onClick={this.reset}
          style={{
            alignSelf: "flex-start",
            padding: `${tokens.space.px4}px ${tokens.space.px8}px`,
            background: tokens.gradient.buttonPrimary,
            color: "#F8FAFC",
            border: "none",
            borderRadius: tokens.radius.sm,
            fontSize: tokens.fontSize.sm,
            cursor: "pointer",
          }}
        >
          Tekrar dene
        </button>
      </div>
    );
  }
}
