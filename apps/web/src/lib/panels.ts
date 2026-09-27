import { useCallback, useEffect, useState } from 'react';

export type PanelSide = 'left' | 'right';

/** Panels open by default on every visit. Only phone-width screens start collapsed. */
export const NARROW_VIEWPORT_PX = 700;

// Session-scoped: a collapse lasts for this visit only, so each new visit opens both panels.
const storageKey = (side: PanelSide) => `gsp:panel2:${side}`;
const store = (): Storage | null => {
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
};

function readSaved(side: PanelSide): boolean | null {
  try {
    const v = store()?.getItem(storageKey(side)) ?? null;
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

/** Open/collapsed state for a side panel, persisted per side for this visit (sessionStorage). */
export function usePanelOpen(side: PanelSide): [boolean, () => void] {
  const [open, setOpen] = useState<boolean>(() => defaultOpen(side));
  const toggle = useCallback(() => {
    setOpen((prev) => {
      const next = !prev;
      try {
        store()?.setItem(storageKey(side), next ? 'open' : 'collapsed');
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
