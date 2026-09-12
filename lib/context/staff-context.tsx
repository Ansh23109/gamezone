"use client";

import { createContext, useCallback, useContext, useMemo, useSyncExternalStore } from "react";

type Staff = { id: string; name: string; role: string };

const STORAGE_KEY = "gz_current_staff";

// A same-tab pub/sub so useSyncExternalStore notices the change right after
// setCurrentStaffId writes to localStorage — the native "storage" event only
// fires in *other* tabs/windows, never the one that made the write.
const listeners = new Set<() => void>();
function subscribe(callback: () => void) {
  listeners.add(callback);
  return () => listeners.delete(callback);
}
function getSnapshot() {
  try {
    return window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}
function getServerSnapshot() {
  return null;
}

const StaffContext = createContext<{
  staff: Staff[];
  currentStaffId: string | null;
  setCurrentStaffId: (id: string) => void;
}>({ staff: [], currentStaffId: null, setCurrentStaffId: () => {} });

export function StaffProvider({ staff, children }: { staff: Staff[]; children: React.ReactNode }) {
  // useSyncExternalStore is the React-sanctioned way to read a browser-only,
  // externally-mutable source like localStorage: it returns getServerSnapshot
  // during SSR and the first client render (avoiding hydration mismatches),
  // then re-renders with getSnapshot's live value — no effect or setState
  // call needed, so there's nothing to trigger a cascading-render warning.
  const savedStaffId = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const currentStaffId = useMemo(() => {
    if (savedStaffId && staff.some((s) => s.id === savedStaffId)) return savedStaffId;
    return staff[0]?.id ?? null;
  }, [savedStaffId, staff]);

  const setCurrentStaffId = useCallback((id: string) => {
    try {
      window.localStorage.setItem(STORAGE_KEY, id);
    } catch {
      // ignore
    }
    listeners.forEach((listener) => listener());
  }, []);

  return (
    <StaffContext.Provider value={{ staff, currentStaffId, setCurrentStaffId }}>{children}</StaffContext.Provider>
  );
}

export function useStaff() {
  return useContext(StaffContext);
}
