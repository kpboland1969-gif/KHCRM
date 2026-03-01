"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import clsx from "clsx";

export type SelectOption = { value: string; label: string };

export type SelectProps = {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  disabled?: boolean;
  className?: string;
};

type MenuPos = {
  top: number;
  left: number;
  width: number;
  maxHeight: number;
};

export function Select({
  value,
  onChange,
  options,
  placeholder = "Select…",
  disabled = false,
  className,
}: SelectProps) {
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  const [open, setOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState<number>(-1);
  const [menuPos, setMenuPos] = useState<MenuPos | null>(null);
  const [mounted, setMounted] = useState(false);

  // Hydration-safe portal rendering
  useEffect(() => setMounted(true), []);

  const selectedLabel = useMemo(() => {
    const hit = options.find((o) => o.value === value);
    return hit?.label ?? "";
  }, [options, value]);

  function computeMenuPos() {
    const btn = buttonRef.current;
    if (!btn) return;

    const rect = btn.getBoundingClientRect();

    // viewport padding so we don't hug edges
    const viewportPad = 10;
    const gap = 8; // distance between trigger and menu

    const viewportHeight = window.innerHeight;
    const spaceBelow = viewportHeight - rect.bottom - viewportPad;
    const spaceAbove = rect.top - viewportPad;

    // Estimate a "desired" menu height. We'll clamp via maxHeight.
    // If you have a fixed item height, use it; otherwise choose a reasonable value.
    const desired = Math.min(320, Math.max(180, options.length * 40));

    const openUp = spaceBelow < 200 && spaceAbove > spaceBelow;

    const maxHeight = Math.max(
      120,
      Math.min(openUp ? spaceAbove - gap : spaceBelow - gap, desired)
    );

    let top: number;
    if (openUp) {
      // place menu above trigger; we don't know menu height exactly,
      // so we position using maxHeight and allow internal scroll.
      top = Math.max(viewportPad, rect.top - gap - maxHeight);
    } else {
      top = Math.min(viewportHeight - viewportPad - maxHeight, rect.bottom + gap);
    }

    setMenuPos({
      top,
      left: rect.left,
      width: rect.width,
      maxHeight,
    });
  }

  const openMenu = () => {
    if (disabled) return;
    computeMenuPos();
    setOpen(true);
    const idx = options.findIndex((o) => o.value === value);
    setHighlightedIndex(idx >= 0 ? idx : 0);
  };

  const closeMenu = () => setOpen(false);

  // Recompute position whenever open, options, or value changes
  useEffect(() => {
    if (!open) return;
    computeMenuPos();
  }, [open, options.length, value]);

  // Add scroll/resize listeners only while open
  useEffect(() => {
    if (!open) return;

    const onResize = () => computeMenuPos();
    const onScroll = () => computeMenuPos();

    window.addEventListener("resize", onResize);
    // capture=true catches scroll on nested containers
    window.addEventListener("scroll", onScroll, true);

    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("scroll", onScroll, true);
    };
  }, [open, options.length, value]);

  // Close on outside click + escape, while open
  useEffect(() => {
    if (!open) return;

    const onMouseDownCapture = (e: MouseEvent) => {
      const t = e.target as Node | null;
      if (!t) return;

      const btn = buttonRef.current;
      const menu = menuRef.current;

      if (btn && btn.contains(t)) return;
      if (menu && menu.contains(t)) return;

      closeMenu();
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeMenu();
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setHighlightedIndex((i) => Math.min(i + 1, options.length - 1));
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setHighlightedIndex((i) => Math.max(i - 1, 0));
      }
      if (e.key === "Enter") {
        e.preventDefault();
        const opt = options[highlightedIndex];
        if (opt) {
          onChange(opt.value);
          closeMenu();
        }
      }
    };

    const onWinChange = () => computeMenuPos();

    document.addEventListener("mousedown", onMouseDownCapture, true);
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("resize", onWinChange);
    window.addEventListener("scroll", onWinChange, true);

    return () => {
      document.removeEventListener("mousedown", onMouseDownCapture, true);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("resize", onWinChange);
      window.removeEventListener("scroll", onWinChange, true);
    };
  }, [open, highlightedIndex, options, onChange]);

  const triggerClasses = clsx(
    'flex h-10 w-full rounded-md border border-white/25 px-3 py-2 text-sm text-white shadow-sm transition hover:border-white/35 hover:bg-white/12 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:border-white/50 disabled:cursor-not-allowed disabled:opacity-50 flex items-center justify-between gap-3 cursor-pointer bg-white/10',
    className
  );

  const menu =
    mounted && open && menuPos
      ? createPortal(
          <div
            ref={menuRef}
            role="listbox"
            aria-label="Select options"
            className={clsx(
              "rounded-md border border-white/25 bg-[#1b1620] shadow-lg",
              "text-white text-sm"
            )}
            style={{
              position: "fixed",
              top: menuPos.top,
              left: menuPos.left,
              width: menuPos.width,
              maxHeight: menuPos.maxHeight,
              overflowY: "auto",
              zIndex: 1000,
              pointerEvents: "auto",
            }}
          >
            {options.map((opt, i) => {
              const active = i === highlightedIndex;
              const selected = opt.value === value;
              return (
                <div
                  key={opt.value}
                  role="option"
                  aria-selected={selected}
                  onMouseEnter={() => setHighlightedIndex(i)}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    onChange(opt.value);
                    closeMenu();
                  }}
                  className={clsx(
                    "cursor-pointer px-3 py-2 text-sm select-none",
                    selected ? "text-white font-semibold" : "text-white/90",
                    active ? "bg-white/15" : "bg-transparent",
                    "hover:bg-white/15"
                  )}
                >
                  {opt.label}
                </div>
              );
            })}
          </div>,
          document.body
        )
      : null;

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        className={triggerClasses}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={(e) => {
          e.stopPropagation();
          if (disabled) return;
          if (open) closeMenu();
          else openMenu();
        }}
      >
        <span className="truncate">
          {selectedLabel || <span className="text-white/50">{placeholder}</span>}
        </span>
        <span className="shrink-0 text-white/70" aria-hidden="true">
          ▼
        </span>
      </button>

      {menu}
    </>
  );
}
