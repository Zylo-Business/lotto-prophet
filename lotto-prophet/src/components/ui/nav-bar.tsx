import Link from "next/link";
import { NavigationMenu, NavigationMenuList, NavigationMenuItem } from "@/components/ui/navigation-menu"
import { Button } from "@/components/ui/button"
 
export function NavBar() {
    return (
        <nav className="w-full border-b bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/60 sticky top-0 z-50">
            <div className="container mx-auto flex h-16 items-center justify-between px-4">
                <Link href="/" className="font-bold text-xl tracking-tight text-gray-900">
                    LottoProphet
                </Link>
                <NavigationMenu>
                    <NavigationMenuList className="flex items-center gap-2">
                        <NavigationMenuItem>
                            <Button asChild variant="outline">
                                <Link href="/signin">Sign In</Link>
                            </Button>
                        </NavigationMenuItem>
                        <NavigationMenuItem>
                            <Button asChild variant="outline">
                                <Link href="/signup">Sign Up</Link>
                            </Button>
                        </NavigationMenuItem>
                    </NavigationMenuList>
                </NavigationMenu>
            </div>
        </nav>
    )
}