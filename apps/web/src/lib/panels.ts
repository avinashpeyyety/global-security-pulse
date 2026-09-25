import { useCallback, useEffect, useState } from 'react';

export type PanelSide = 'left' | 'right';

/** Below this viewport width both side panels default to collapsed (no saved pref). */
export const NARROW_VIEWPORT_PX = 1000;

const storageKey = (side: PanelSide) => `gsp:panel:${side}`;

function readSaved(side: PanelSide): boolean | null {
  try {
    const v = window.localStorage.getItem(storageKey(side));
    if (v === 'open') return true;
    if (v === 'collapsed') return false;
  } catch {
    /* storage unavailable (private mode etc.) */
  }
  return null;
}

function defaultOpen(side: PanelSide): boolean {
  const saved = readSaved(side);
  if (saved !== null) return saved;
  return typeof window === 'undefined' ? true : window.innerWidth >= NARROW_VIEWPORT_PX;
}

/** Open/collapsed state for a side panel, persisted per side in localStorage. */
export function usePanelOpen(side: PanelSide): [boolean, () => void] {
  const [open, setOpen] = useState<boolean>(() => defaultOpen(side));
  const toggle = useCallback(() => {
    setOpen((prev) => {
      const next = !prev;
      try {
        window.localStorage.setItem(storageKey(side), next ? 'open' : 'collapsed');
      } catch {
        /* ignore */
      }
      return next;
    });
  }, [side]);
  return [open, toggle];
}

function isTypingTarget(t: EventTarget | null): boolean {
  if (!(t instanceof HTMLElement)) return false;
  if (t.isContentEditable) return true;
  const tag = t.tagName;
  if (tag === 'TEXTAREA' || tag === 'SELECT') return true;
  if (tag === 'INPUT') {
    const type = (t as HTMLInputElement).type;
    return !['checkbox', 'radio', 'button', 'submit', 'reset', 'range', 'color', 'file'].includes(type);
  }
  return false;
}

/** `[` toggles left panel, `]` toggles right panel (ignored while typing / with modifiers). */
export function usePanelShortcuts(toggleLeft: () => void, toggleRight: () => void) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.ctrlKey || e.metaKey || e.altKey) return;
      if (isTypingTarget(e.target)) return;
      if (e.key === '[') {
        e.preventDefault();
        toggleLeft();
      } else if (e.key === ']') {
        e.preventDefault();
        toggleRight();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [toggleLeft, toggleRight]);
}
