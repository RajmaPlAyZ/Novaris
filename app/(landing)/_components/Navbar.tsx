"use client";

import { useScrollTop } from "@/hooks/useScrollTop";
import { cn } from "@/lib/utils";
import { Logo } from "./Logo";
import { ModeToggle } from "@/components/mode-toggle";
import { useConvexAuth } from "convex/react";
import { SignInButton, SignUpButton, UserButton } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/spinner";
import Link from "next/link";

export const Navbar = () => {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const scrolled = useScrollTop();

  return (
    <nav
      className={cn(
        "bg-background dark:bg-dark sticky inset-x-0 top-0 z-50 mx-auto flex w-full items-center px-4 py-3 sm:p-6",
        scrolled && "border-b shadow-xs",
      )}
    >
      <Logo />
      <div className="flex w-full items-center justify-end md:ml-auto">
        <div className="flex items-center gap-x-1 sm:gap-x-2">
          {isLoading && <Spinner />}
          {!isLoading && !isAuthenticated && (
            <>
              <SignInButton mode="modal">
                <Button variant="ghost" size="sm">
                  Log In
                </Button>
              </SignInButton>
              <SignUpButton mode="modal">
                <Button size="sm" className="hidden sm:flex">Get Novaris Free</Button>
                <Button size="sm" className="sm:hidden">Sign Up</Button>
              </SignUpButton>
            </>
          )}

          {isAuthenticated && !isLoading && (
            <>
              <Button variant="ghost" size="sm" asChild className="hidden sm:flex">
                <Link href="/documents"> Enter Novaris </Link>
              </Button>
              <Button variant="ghost" size="sm" asChild className="sm:hidden">
                <Link href="/documents"> Enter </Link>
              </Button>
              <UserButton afterSignOutUrl="/" />
            </>
          )}
          <ModeToggle />
        </div>
      </div>
    </nav>
  );
};
