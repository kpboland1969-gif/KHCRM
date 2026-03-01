"use client";

import * as React from "react";
import clsx from "clsx";

export type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement>;

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        ref={ref}
          className={clsx(
            'min-h-[96px] flex w-full rounded-md border border-white/25 px-3 py-2 text-sm text-white placeholder:text-white/40 shadow-sm transition hover:border-white/35 hover:bg-white/12 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:border-white/50 disabled:cursor-not-allowed disabled:opacity-50 bg-white/10',
            className
          )}
        {...props}
      />
    );
  }
);

Textarea.displayName = "Textarea";
