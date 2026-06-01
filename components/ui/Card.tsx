import type { HTMLAttributes } from "react";

// Maps to the mockup's .card surface.
export function Card({ className = "", ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={`card ${className}`} {...props} />;
}
