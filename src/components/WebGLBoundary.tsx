"use client";

import { Component, type ReactNode } from "react";

/** A failed canvas must leave the server-rendered artwork usable. */
export default class WebGLBoundary extends Component<
  {
    children: ReactNode;
    onError: () => void;
  },
  { failed: boolean }
> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch() {
    this.props.onError();
  }

  render() {
    return this.state.failed ? null : this.props.children;
  }
}
