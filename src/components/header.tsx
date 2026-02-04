"use client";

import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetClose,
} from "@/components/ui/sheet";

export function Header() {
  const { data: session } = useSession();

  return (
    <header className="border-b bg-white dark:bg-gray-950">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <div className="flex items-center gap-4">
          {/* Mobile hamburger menu */}
          {session && (
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden">
                  <Menu className="h-5 w-5" />
                  <span className="sr-only">Open menu</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-64">
                <SheetHeader>
                  <SheetTitle className="flex items-center gap-2">
                    <span className="text-xl">🌱</span>
                    <span>Menu</span>
                  </SheetTitle>
                </SheetHeader>
                <nav className="flex flex-col gap-2 px-4">
                  <SheetClose asChild>
                    <Link
                      href="/plants"
                      className="flex items-center gap-2 rounded-lg px-3 py-2 text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-100"
                    >
                      My Plants
                    </Link>
                  </SheetClose>
                  <SheetClose asChild>
                    <Link
                      href="/gardens"
                      className="flex items-center gap-2 rounded-lg px-3 py-2 text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-100"
                    >
                      Gardens
                    </Link>
                  </SheetClose>
                  <SheetClose asChild>
                    <Link
                      href="/schedules"
                      className="flex items-center gap-2 rounded-lg px-3 py-2 text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-100"
                    >
                      Schedules
                    </Link>
                  </SheetClose>
                  <SheetClose asChild>
                    <Link
                      href="/species"
                      className="flex items-center gap-2 rounded-lg px-3 py-2 text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-100"
                    >
                      Plant Library
                    </Link>
                  </SheetClose>
                </nav>
              </SheetContent>
            </Sheet>
          )}

          <Link href="/" className="flex items-center gap-2 font-semibold text-lg">
            <span className="text-2xl">🌱</span>
            <span>Garden Optimus</span>
          </Link>

          {/* Desktop navigation */}
          {session && (
            <nav className="hidden md:flex items-center gap-4">
              <Link
                href="/plants"
                className="text-sm text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
              >
                My Plants
              </Link>
              <Link
                href="/gardens"
                className="text-sm text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
              >
                Gardens
              </Link>
              <Link
                href="/schedules"
                className="text-sm text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
              >
                Schedules
              </Link>
              <Link
                href="/species"
                className="text-sm text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
              >
                Plant Library
              </Link>
            </nav>
          )}
        </div>
        <div className="flex items-center gap-4">
          {session ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={session.user?.image || ""} alt={session.user?.name || ""} />
                    <AvatarFallback>
                      {session.user?.name?.charAt(0).toUpperCase() || "U"}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <div className="flex flex-col space-y-1 p-2">
                  <p className="text-sm font-medium">{session.user?.name}</p>
                  <p className="text-xs text-gray-500">{session.user?.email}</p>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/plants">My Plants</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/gardens">Gardens</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/schedules">Schedules</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/species">Plant Library</Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="cursor-pointer text-red-600"
                  onClick={() => signOut({ callbackUrl: "/login" })}
                >
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button asChild>
              <Link href="/login">Sign in</Link>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
