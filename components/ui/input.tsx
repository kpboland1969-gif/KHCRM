"use client";

import * as React from "react";
import clsx from "clsx";

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        ref={ref}
        type={type}
        className={clsx(
          'flex h-10 w-full rounded-md border border-white/25 px-3 py-2 text-sm text-white placeholder:text-white/40 shadow-sm transition hover:border-white/35 hover:bg-white/12 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:border-white/50 disabled:cursor-not-allowed disabled:opacity-50 bg-white/10',
          className
        )}
        {...props}
      />
    );
  }
);

Input.displayName = "Input";
