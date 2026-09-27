"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { LogOut, User } from "lucide-react";

import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

function initialsFrom(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function Navbar() {
  const router = useRouter();

  const { data: session, isPending } =
    authClient.useSession();

  const handleSignOut = async () => {
    await authClient.signOut();

    router.push("/signin");
    router.refresh();
  };

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
        <Link
          href="/"
          className="font-medium text-foreground"
        >
          Skilledgelms
        </Link>

        <nav className="flex items-center gap-3">
          <ThemeToggle />

          {isPending ? null : session?.user ? (
            <DropdownMenu>
              <DropdownMenuTrigger>
                <Avatar className="size-8">
                  <AvatarImage
                    src={
                      session.user.image ?? undefined
                    }
                    alt={session.user.name}
                  />

                  <AvatarFallback>
                    {initialsFrom(
                      session.user.name
                    )}
                  </AvatarFallback>
                </Avatar>
              </DropdownMenuTrigger>

              <DropdownMenuContent
                align="end"
                className="w-56"
              >
                <DropdownMenuGroup>
                  <DropdownMenuLabel className="flex flex-col">
                    <span className="text-sm font-medium">
                      {session.user.name}
                    </span>

                    <span className="text-xs font-normal text-muted-foreground">
                      {session.user.email}
                    </span>
                  </DropdownMenuLabel>

                  <DropdownMenuSeparator />

                  <DropdownMenuItem
                    render={
                      <Link
                        href="/dashboard"
                        className="flex items-center gap-2"
                      />
                    }
                  >
                    <User className="size-4" />
                    Dashboard
                  </DropdownMenuItem>
                </DropdownMenuGroup>

                <DropdownMenuSeparator />

                <DropdownMenuGroup>
                  <DropdownMenuItem
                    onClick={handleSignOut}
                    className="flex items-center gap-2 text-destructive focus:text-destructive"
                  >
                    <LogOut className="size-4" />
                    Sign out
                  </DropdownMenuItem>
                </DropdownMenuGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                nativeButton={false}
                render={
                  <Link href="/signin" />
                }
              >
                Sign in
              </Button>

              <Button
                nativeButton={false}
                render={
                  <Link href="/signup" />
                }
              >
                Sign up
              </Button>
            </div>
          )}
        </nav>
      </div>
    </header>
  );
}