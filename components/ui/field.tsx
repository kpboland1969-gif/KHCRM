"use client";

import React from "react";
import clsx from "clsx";

type FieldProps = {
  label: string;
  children: React.ReactNode;
  hint?: string;
  className?: string;
};

export function Field({ label, children, hint, className }: FieldProps) {
  return (
    <div className={clsx("space-y-2", className)}>
      <label className="text-base font-semibold text-white/90 tracking-wide">
        {label}
      </label>
      {children}
      {hint ? <div className="text-xs text-white/50">{hint}</div> : null}
    </div>
  );
}

type ReadOnlyFieldProps = {
  label: string;
  value?: React.ReactNode;
  className?: string;
};

export function ReadOnlyField({ label, value, className }: ReadOnlyFieldProps) {
  return (
    <div className={clsx("space-y-2", className)}>
      <div className="text-base font-semibold text-white/90 tracking-wide">
        {label}
      </div>
      <div className="rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/70">
        {value ?? "—"}
      </div>
    </div>
  );
}
