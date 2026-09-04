"use client";

import { createContext, useContext, useEffect, useState } from "react";

type Staff = { id: string; name: string; role: string };

const StaffContext = createContext<{
  staff: Staff[];
  currentStaffId: string | null;
  setCurrentStaffId: (id: string) => void;
}>({ staff: [], currentStaffId: null, setCurrentStaffId: () => {} });

export function StaffProvider({ staff, children }: { staff: Staff[]; children: React.ReactNode }) {
  const [currentStaffId, setCurrentStaffIdState] = useState<string | null>(null);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem("gz_current_staff");
      if (saved && staff.some((s) => s.id === saved)) {
        setCurrentStaffIdState(saved);
        return;
      }
    } catch {
      // ignore
    }
    if (staff.length > 0) setCurrentStaffIdState(staff[0].id);
  }, [staff]);

  const setCurrentStaffId = (id: string) => {
    setCurrentStaffIdState(id);
    try {
      window.localStorage.setItem("gz_current_staff", id);
    } catch {
      // ignore
    }
  };

  return (
    <StaffContext.Provider value={{ staff, currentStaffId, setCurrentStaffId }}>{children}</StaffContext.Provider>
  );
}

export function useStaff() {
  return useContext(StaffContext);
}
