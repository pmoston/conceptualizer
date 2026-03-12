"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Users, FolderOpen, HelpCircle, Settings, LogOut } from "lucide-react";

const mainLinks = [
  { href: "/",          label: "Dashboard", icon: LayoutDashboard },
  { href: "/customers", label: "Customers", icon: Users },
  { href: "/projects",  label: "Projects",  icon: FolderOpen },
  { href: "/help",      label: "Help",      icon: HelpCircle },
];

export default function Nav({ isAdmin }: { isAdmin: boolean }) {
  const pathname = usePathname();

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <aside className="w-56 bg-[#1c1e3b] flex flex-col h-full shrink-0">
      <div className="px-6 py-6 border-b border-white/10">
        <img src="/brand/dataciders_primär_weiß.svg" alt="Dataciders" className="h-8" />
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1">
        {mainLinks.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition ${
              isActive(href)
                ? "bg-[#b3cc26] text-[#1c1e3b]"
                : "text-white/70 hover:text-white hover:bg-white/10"
            }`}
          >
            <Icon size={16} />
            {label}
          </Link>
        ))}
      </nav>

      <div className="px-3 py-4 border-t border-white/10 space-y-1">
        {isAdmin && (
          <Link
            href="/settings/users"
            className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition ${
              pathname.startsWith("/settings")
                ? "bg-[#b3cc26] text-[#1c1e3b]"
                : "text-white/70 hover:text-white hover:bg-white/10"
            }`}
          >
            <Settings size={16} />
            Settings
          </Link>
        )}
        <form action="/api/auth/logout" method="POST">
          <button
            type="submit"
            className="flex items-center gap-3 px-3 py-2 w-full rounded-lg text-sm text-white/70 hover:text-white hover:bg-white/10 transition"
          >
            <LogOut size={16} />
            Sign out
          </button>
        </form>
      </div>
    </aside>
  );
}
