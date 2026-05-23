"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { ThemeToggle } from "@/components/theme-toggle";

// ── Navigation groups ────────────────────────────────────────────────
const MAIN_ITEMS = [
  { label: "Home", href: "/dashboard", icon: "home" },
  { label: "Draws", href: "/draws", icon: "ticket" },
  { label: "Community", href: "/community", icon: "chat" },
];

const LEARN_ITEMS = [
  { label: "University", href: "/university", icon: "school" },
  { label: "Buy My Chart", href: "/buy-chart", icon: "cart" },
];

const TOOLS_ITEMS = [
  { label: "Lapping 2", href: "/tools/lapping-2", icon: "lapping2" },
  { label: "Lapping 3", href: "/tools/lapping-3", icon: "lapping3" },
];

const ACCOUNT_ITEMS = [
  { label: "Profile", href: "/profile", icon: "person" },
  { label: "Notifications", href: "/notifications", icon: "bell" },
  { label: "Settings", href: "/settings", icon: "settings" },
  { label: "Subscription", href: "/subscription", icon: "diamond" },
];

const SUPPORT_ITEMS = [
  { label: "Contact", href: "/contact", icon: "contact" },
];

const ADMIN_ITEMS = [
  { label: "Admin Dashboard", href: "/admin", icon: "admin" },
];

function SidebarIcon({
  name,
  className = "",
}: {
  name: string;
  className?: string;
}) {
  const cn = `w-5 h-5 ${className}`;
  switch (name) {
    case "home":
      return (
        <svg className={cn} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      );
    case "ticket":
      return (
        <svg className={cn} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
        </svg>
      );
    case "school":
      return (
        <svg className={cn} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 14l9-5-9-5-9 5 9 5z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 14l9-5-9-5-9 5 9 5zm0 0l6.16-3.422M12 14v7" />
        </svg>
      );
    case "cart":
      return (
        <svg className={cn} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 100 4 2 2 0 000-4z" />
        </svg>
      );
    case "bell":
      return (
        <svg className={cn} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
      );
    case "settings":
      return (
        <svg className={cn} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      );
    case "lapping2":
      return (
        <svg className={cn} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
        </svg>
      );
    case "lapping3":
      return (
        <svg className={cn} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m9.86-2.813a4.5 4.5 0 00-6.364-6.364L4.5 8.257" />
        </svg>
      );
    case "person":
      return (
        <svg className={cn} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      );
    case "diamond":
      return (
        <svg className={cn} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 2L2 9l10 13L22 9 12 2z" />
        </svg>
      );
    case "chat":
      return (
        <svg className={cn} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M7 8h10M7 12h6m-4 8a9 9 0 100-18 9 9 0 000 18z" />
        </svg>
      );
    case "contact":
      return (
        <svg className={cn} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
      );
    case "admin":
      return (
        <svg className={cn} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      );
    default:
      return <span className={cn}>•</span>;
  }
}

export function AppSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [userName, setUserName] = useState("");
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [toolsOpen, setToolsOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [supportOpen, setSupportOpen] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("token");
    const stored = localStorage.getItem("user");
    if (token && stored) {
      setIsLoggedIn(true);
      try {
        const user = JSON.parse(stored);
        setUserName(user.firstname || "User");
        setIsAdmin(user.role === "admin");
      } catch {
        setUserName("User");
        setIsAdmin(false);
      }
    } else {
      setIsLoggedIn(false);
      setIsAdmin(false);
      setUserName("");
    }
  }, [pathname]);

  // Close mobile sidebar on navigation
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  function handleLogout() {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setIsLoggedIn(false);
    setUserName("");
    router.push("/signin");
  }

  // Auth pages — no sidebar
  const authPages = ["/signin", "/signup", "/forgot-password", "/"];
  if (authPages.includes(pathname)) {
    return null;
  }

  return (
    <>
      {/* Mobile hamburger button */}
      <button
        onClick={() => setMobileOpen(true)}
        className="fixed top-4 left-4 z-50 lg:hidden bg-sidebar p-2 rounded-lg border border-sidebar-border shadow-sm"
        aria-label="Open menu"
      >
        <svg className="w-5 h-5 text-sidebar-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed top-0 left-0 z-40 h-screen
          bg-sidebar text-sidebar-foreground
          border-r border-sidebar-border
          flex flex-col
          transition-all duration-300 ease-in-out
          ${collapsed ? "w-[68px]" : "w-[260px]"}
          ${mobileOpen ? "translate-x-0" : "-translate-x-full"}
          lg:translate-x-0 lg:static
        `}
      >
        {/* Header */}
        <div className="flex items-center gap-3 px-4 h-16 border-b border-sidebar-border shrink-0">
          <Link href="/dashboard" className="flex items-center gap-3 min-w-0">
            <Image
              src="/logo.jpeg"
              alt="Lotto Prophet"
              width={36}
              height={36}
              className="rounded-lg shrink-0"
            />
            {!collapsed && (
              <span className="font-bold text-lg text-indigo-600 dark:text-indigo-400 truncate">
                Lotto Prophet
              </span>
            )}
          </Link>
          {/* Close button (mobile) */}
          <button
            onClick={() => setMobileOpen(false)}
            className="ml-auto lg:hidden text-sidebar-foreground hover:text-foreground"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          {/* Collapse toggle (desktop) */}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="ml-auto hidden lg:block text-sidebar-foreground hover:text-foreground p-1 rounded"
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            <svg
              className={`w-4 h-4 transition-transform ${collapsed ? "rotate-180" : ""}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
        </div>

        {/* User badge */}
        {isLoggedIn && !collapsed && (
          <div className="px-4 py-3 border-b border-sidebar-border">
            <p className="text-sm font-medium truncate">Hi, {userName}</p>
            <p className="text-xs text-muted-foreground">Welcome back</p>
          </div>
        )}

        {/* Nav links */}
        <nav className="flex-1 overflow-y-auto py-3 px-2">
          {/* ── Main ──────────────────────────────────── */}
          <div className="space-y-1">
            {MAIN_ITEMS.map((item) => {
              const isActive =
                pathname === item.href ||
                (item.href !== "/dashboard" && pathname.startsWith(item.href));
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`
                    flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium
                    transition-colors duration-150
                    ${isActive ? "bg-sidebar-accent text-sidebar-primary" : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"}
                    ${collapsed ? "justify-center" : ""}
                  `}
                  title={collapsed ? item.label : undefined}
                >
                  <SidebarIcon name={item.icon} className={isActive ? "text-sidebar-primary" : ""} />
                  {!collapsed && <span>{item.label}</span>}
                </Link>
              );
            })}
          </div>

          {/* ── Learn & Shop ──────────────────────────── */}
          <div className={`mt-4 pt-4 border-t border-sidebar-border space-y-1 ${collapsed ? "mx-1" : ""}`}>
            {!collapsed && (
              <span className="px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Learn & Shop
              </span>
            )}
            {LEARN_ITEMS.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`
                    flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium
                    transition-colors duration-150
                    ${isActive ? "bg-sidebar-accent text-sidebar-primary" : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"}
                    ${collapsed ? "justify-center" : ""}
                  `}
                  title={collapsed ? item.label : undefined}
                >
                  <SidebarIcon name={item.icon} className={isActive ? "text-sidebar-primary" : ""} />
                  {!collapsed && <span>{item.label}</span>}
                </Link>
              );
            })}
          </div>

          {/* ── Tools (dropdown) ─────────────────────── */}
          <div className={`mt-4 pt-4 border-t border-sidebar-border ${collapsed ? "mx-1" : ""}`}>
            <button
              onClick={() => setToolsOpen((prev) => !prev)}
              className={`
                flex items-center w-full px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground
                hover:text-foreground transition-colors
                ${collapsed ? "justify-center" : "justify-between"}
              `}
            >
              {!collapsed && <span>Tools</span>}
              <svg
                className={`w-3.5 h-3.5 transition-transform duration-200 ${toolsOpen ? "rotate-180" : ""}`}
                fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {toolsOpen && (
              <div className="space-y-1 mt-1">
                {TOOLS_ITEMS.map((item) => {
                  const isActive = pathname === item.href || pathname.startsWith(item.href);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`
                        flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium
                        transition-colors duration-150
                        ${isActive ? "bg-sidebar-accent text-sidebar-primary" : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"}
                        ${collapsed ? "justify-center" : ""}
                      `}
                      title={collapsed ? item.label : undefined}
                    >
                      <SidebarIcon name={item.icon} className={isActive ? "text-sidebar-primary" : ""} />
                      {!collapsed && <span>{item.label}</span>}
                    </Link>
                  );
                })}
              </div>
            )}
          </div>

          {/* ── Account (dropdown) ────────────────────── */}
          <div className={`mt-4 pt-4 border-t border-sidebar-border ${collapsed ? "mx-1" : ""}`}>
            <button
              onClick={() => setAccountOpen((prev) => !prev)}
              className={`
                flex items-center w-full px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground
                hover:text-foreground transition-colors
                ${collapsed ? "justify-center" : "justify-between"}
              `}
            >
              {!collapsed && <span>Account</span>}
              <svg
                className={`w-3.5 h-3.5 transition-transform duration-200 ${accountOpen ? "rotate-180" : ""}`}
                fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {accountOpen && (
              <div className="space-y-1 mt-1">
                {ACCOUNT_ITEMS.map((item) => {
                  const isActive = pathname === item.href || pathname.startsWith(item.href);
                  const isGold = item.icon === "diamond";
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`
                        flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium
                        transition-colors duration-150
                        ${isActive ? "bg-sidebar-accent text-sidebar-primary" : isGold ? "text-amber-500 hover:bg-sidebar-accent" : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"}
                        ${collapsed ? "justify-center" : ""}
                      `}
                      title={collapsed ? item.label : undefined}
                    >
                      <SidebarIcon name={item.icon} className={isActive ? "text-sidebar-primary" : isGold ? "text-amber-500" : ""} />
                      {!collapsed && <span>{item.label}</span>}
                    </Link>
                  );
                })}
              </div>
            )}
          </div>

          {/* ── Admin (only shown to admins) ─────────── */}
          {isAdmin && <div className={`mt-4 pt-4 border-t border-sidebar-border space-y-1 ${collapsed ? "mx-1" : ""}`}>
            {!collapsed && (
              <span className="px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Admin
              </span>
            )}
            {ADMIN_ITEMS.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`
                    flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium
                    transition-colors duration-150
                    ${isActive ? "bg-sidebar-accent text-sidebar-primary" : "text-indigo-500 dark:text-indigo-400 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"}
                    ${collapsed ? "justify-center" : ""}
                  `}
                  title={collapsed ? item.label : undefined}
                >
                  <SidebarIcon name={item.icon} className={isActive ? "text-sidebar-primary" : "text-indigo-500 dark:text-indigo-400"} />
                  {!collapsed && <span>{item.label}</span>}
                </Link>
              );
            })}
          </div>}

          {/* ── Support (dropdown) ────────────────────── */}
          <div className={`mt-4 pt-4 border-t border-sidebar-border ${collapsed ? "mx-1" : ""}`}>
            <button
              onClick={() => setSupportOpen((prev) => !prev)}
              className={`
                flex items-center w-full px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground
                hover:text-foreground transition-colors
                ${collapsed ? "justify-center" : "justify-between"}
              `}
            >
              {!collapsed && <span>Support</span>}
              <svg
                className={`w-3.5 h-3.5 transition-transform duration-200 ${supportOpen ? "rotate-180" : ""}`}
                fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {supportOpen && (
              <div className="space-y-1 mt-1">
                {SUPPORT_ITEMS.map((item) => {
                  const isActive = pathname === item.href || pathname.startsWith(item.href);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`
                        flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium
                        transition-colors duration-150
                        ${isActive ? "bg-sidebar-accent text-sidebar-primary" : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"}
                        ${collapsed ? "justify-center" : ""}
                      `}
                      title={collapsed ? item.label : undefined}
                    >
                      <SidebarIcon name={item.icon} className={isActive ? "text-sidebar-primary" : ""} />
                      {!collapsed && <span>{item.label}</span>}
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </nav>

        {/* Footer */}
        <div className="mt-auto border-t border-sidebar-border px-2 py-3 space-y-1">
          <div className={`flex items-center ${collapsed ? "justify-center" : "px-3"}`}>
            <ThemeToggle />
          </div>
          {isLoggedIn && (
            <button
              onClick={handleLogout}
              className={`
                flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium
                text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30
                transition-colors duration-150
                ${collapsed ? "justify-center" : ""}
              `}
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              {!collapsed && <span>Sign Out</span>}
            </button>
          )}
          {!collapsed && (
            <p className="text-xs text-center text-muted-foreground py-1">
              Version 1.0.0
            </p>
          )}
        </div>
      </aside>
    </>
  );
}
