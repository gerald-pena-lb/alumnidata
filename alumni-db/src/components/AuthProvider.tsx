"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { usePathname } from "next/navigation";

interface User {
  id: number;
  username: string;
  name: string;
  full_name: string;
  role: "admin" | "board_member" | "brod";
  chapter?: string;
  batch_name?: string;
  phone_number?: string;
  current_company?: string;
  title?: string;
  industry?: string;
}

interface AuthCtx {
  user: User | null;
  loading: boolean;
  refresh: () => void;
  can: (action: string) => boolean;
}

const AuthContext = createContext<AuthCtx>({
  user: null,
  loading: true,
  refresh: () => {},
  can: () => false,
});

export function useAuth() {
  return useContext(AuthContext);
}

function checkPermission(role: string | undefined, action: string): boolean {
  if (!role) return false;
  if (role === "admin") return true;

  const boardMemberAllowed = [
    "view_brods", "add_brods", "edit_brods",
    "view_events", "add_events", "edit_events", "delete_events",
    "view_projects", "add_projects", "edit_projects", "delete_projects",
    "view_finances", "add_finances",
    "view_reports",
    "view_minutes", "add_minutes", "edit_minutes", "delete_minutes",
    "view_tasks", "add_tasks", "edit_tasks", "delete_tasks",
    "upload_csv",
    "edit_profile",
  ];

  const brodAllowed = [
    "view_reports",
    "edit_profile",
  ];

  if (role === "board_member") return boardMemberAllowed.includes(action);
  if (role === "brod") return brodAllowed.includes(action);
  return false;
}

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const pathname = usePathname();

  function refresh() {
    fetch("/api/auth/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => setUser(data))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    if (pathname !== "/login") refresh();
    else setLoading(false);
  }, [pathname]);

  function can(action: string) {
    return checkPermission(user?.role, action);
  }

  return (
    <AuthContext.Provider value={{ user, loading, refresh, can }}>
      {children}
    </AuthContext.Provider>
  );
}
