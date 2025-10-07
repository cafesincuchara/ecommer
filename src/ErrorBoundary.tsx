import React, { Component, ReactNode } from "react";

class ErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: any) {
    console.error("Error atrapado por ErrorBoundary:", error, info);
  }

  render() {
    if (this.state.hasError) {
      return <div className="text-red-500 p-4">Ocurrió un error en la app. Revisa la consola.</div>;
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
