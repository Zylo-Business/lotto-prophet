"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuList,
} from "@/components/ui/navigation-menu";
import { ThemeToggle } from "@/components/theme-toggle";

export function NavBar() {
  const pathname = usePathname();
  const router = useRouter();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userName, setUserName] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("token");
    const stored = localStorage.getItem("user");
    if (token && stored) {
      setIsLoggedIn(true);
      try {
        const user = JSON.parse(stored);
        setUserName(user.firstname || "User");
      } catch {
        setUserName("User");
      }
    } else {
      setIsLoggedIn(false);
      setUserName("");
    }
  }, [pathname]);

  function handleLogout() {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setIsLoggedIn(false);
    setUserName("");
    router.push("/signin");
  }

  return (
    <nav className="w-full border-b border-border bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <Link
            href={isLoggedIn ? "/dashboard" : "/"}
            className="flex items-center gap-2 font-bold text-xl tracking-tight text-indigo-600 dark:text-indigo-400"
          >
            <Image
              src="/logo.jpeg"
              alt="Lotto Prophet"
              width={36}
              height={36}
              className="rounded-lg"
            />
            Lotto Prophet
          </Link>
        </div>
        <NavigationMenu>
          <NavigationMenuList className="flex items-center gap-2">
            <NavigationMenuItem>
              <ThemeToggle />
            </NavigationMenuItem>
            {isLoggedIn ? (
              <>
                <NavigationMenuItem>
                  <Button asChild variant="ghost" className="font-medium">
                    <Link href="/draws">Draws</Link>
                  </Button>
                </NavigationMenuItem>
                <NavigationMenuItem>
                  <Button asChild variant="ghost" className="font-medium">
                    <Link href="/community">Community</Link>
                  </Button>
                </NavigationMenuItem>
                <NavigationMenuItem>
                  <Button asChild variant="ghost" className="font-medium">
                    <Link href="/university">University</Link>
                  </Button>
                </NavigationMenuItem>
                <NavigationMenuItem className="relative group">
                  <Button variant="ghost" className="font-medium">
                    Tools
                    <svg className="ml-1 w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                  </Button>
                  <div className="absolute top-full left-0 mt-1 w-44 rounded-lg border border-border bg-popover shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                    <Link href="/tools/lapping-2" className="block px-4 py-2.5 text-sm font-medium text-popover-foreground hover:bg-accent rounded-t-lg transition-colors">Lapping 2</Link>
                    <Link href="/tools/lapping-3" className="block px-4 py-2.5 text-sm font-medium text-popover-foreground hover:bg-accent rounded-b-lg transition-colors">Lapping 3</Link>
                  </div>
                </NavigationMenuItem>
                <NavigationMenuItem className="relative group">
                  <Button variant="ghost" className="font-medium">
                    Account
                    <svg className="ml-1 w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                  </Button>
                  <div className="absolute top-full right-0 mt-1 w-44 rounded-lg border border-border bg-popover shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                    <Link href="/profile" className="block px-4 py-2.5 text-sm font-medium text-popover-foreground hover:bg-accent rounded-t-lg transition-colors">Profile</Link>
                    <Link href="/notifications" className="block px-4 py-2.5 text-sm font-medium text-popover-foreground hover:bg-accent transition-colors">Notifications</Link>
                    <Link href="/settings" className="block px-4 py-2.5 text-sm font-medium text-popover-foreground hover:bg-accent transition-colors">Settings</Link>
                    <Link href="/subscription" className="block px-4 py-2.5 text-sm font-medium text-amber-500 hover:bg-accent transition-colors">Subscription</Link>
                    <Link href="/contact" className="block px-4 py-2.5 text-sm font-medium text-popover-foreground hover:bg-accent rounded-b-lg transition-colors">Contact</Link>
                  </div>
                </NavigationMenuItem>
                <NavigationMenuItem>
                  <span className="text-sm font-medium text-muted-foreground">
                    Hi, {userName}
                  </span>
                </NavigationMenuItem>
                <NavigationMenuItem>
                  <Button
                    variant="outline"
                    onClick={handleLogout}
                    className="font-medium"
                  >
                    Log Out
                  </Button>
                </NavigationMenuItem>
              </>
            ) : (
              <>
                <NavigationMenuItem>
                  <Button asChild variant="outline">
                    <Link href="/signin">Sign In</Link>
                  </Button>
                </NavigationMenuItem>
                <NavigationMenuItem>
                  <Button
                    asChild
                    className="bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 text-white"
                  >
                    <Link href="/signup">Sign Up</Link>
                  </Button>
                </NavigationMenuItem>
              </>
            )}
          </NavigationMenuList>
        </NavigationMenu>
      </div>
    </nav>
  );
}
