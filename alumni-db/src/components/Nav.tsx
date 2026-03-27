"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";

const allLinks = [
  { href: "/brods", label: "Brods", minRole: "board_member" },
  { href: "/projects", label: "Projects", minRole: "board_member" },
  { href: "/events", label: "Events", minRole: "board_member" },
  { href: "/meetings", label: "Meetings", minRole: "board_member" },
  { href: "/finances", label: "Finances", minRole: "board_member" },
  { href: "/reports", label: "Reports", minRole: "brod" },
];

const roleLevel: Record<string, number> = { brod: 0, board_member: 1, admin: 2 };

export default function Nav() {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useAuth();

  if (pathname === "/login") return null;

  const userLevel = roleLevel[user?.role || "brod"] ?? 0;
  const links = allLinks.filter((l) => userLevel >= roleLevel[l.minRole]);

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <nav className="bg-[#1a3a7a] text-white shadow-lg">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <Link href="/" className="font-bold text-xl tracking-tight">
            UP Alpha Sigma Alumni
          </Link>
          <div className="flex items-center space-x-1">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  pathname.startsWith(link.href)
                    ? "bg-white/20 text-white"
                    : "text-white/80 hover:bg-white/10 hover:text-white"
                }`}
              >
                {link.label}
              </Link>
            ))}
            <Link
              href="/profile"
              className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                pathname === "/profile"
                  ? "bg-white/20 text-white"
                  : "text-white/80 hover:bg-white/10 hover:text-white"
              }`}
            >
              {user?.name?.split(" ")[0] || "Profile"}
            </Link>
            <button
              onClick={handleLogout}
              className="ml-2 px-3 py-1.5 text-sm text-white/70 hover:text-white hover:bg-white/10 rounded-md transition-colors"
            >
              Logout
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}
