import { forwardRef, type ButtonHTMLAttributes } from "react";

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary";
}

// Maps to the mockup's .tb-btn / .tb-btn.primary.
export const Button = forwardRef<HTMLButtonElement, Props>(function Button(
  { variant = "primary", className = "", ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      className={`tb-btn ${variant === "primary" ? "primary" : ""} ${className}`}
      {...props}
    />
  );
});
