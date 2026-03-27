"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/brods", label: "Brods" },
  { href: "/projects", label: "Projects" },
  { href: "/events", label: "Events" },
  { href: "/finances", label: "Finances" },
  { href: "/reports", label: "Reports" },
];

export default function Nav() {
  const pathname = usePathname();

  return (
    <nav className="bg-maroon-800 text-white shadow-lg">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <Link href="/" className="font-bold text-xl tracking-tight">
            UP Alpha Sigma Alumni
          </Link>
          <div className="flex space-x-1">
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
          </div>
        </div>
      </div>
    </nav>
  );
}
