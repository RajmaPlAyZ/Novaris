"use client";

import { Spinner } from "@/components/spinner";
import { Button } from "@/components/ui/button";
import { SignInButton, SignUpButton } from "@clerk/nextjs";
import { useConvexAuth } from "convex/react";
import { ArrowRight } from "lucide-react";
import Link from "next/link";

export const Heading = () => {
  const { isAuthenticated, isLoading } = useConvexAuth();

  return (
    <div className="max-w-3xl space-y-4 px-2">
      <h1 className="text-2xl font-bold sm:text-4xl md:text-5xl">
        Your Ideas💡, Documents📕, & Plans🚀. Welcome to{" "}
        <span className="underline">Novaris</span>
      </h1>
      <h2 className="text-sm font-medium sm:text-lg md:text-xl">
        Novaris is the connected workspace where{" "}
        <span className="hidden sm:inline"><br /></span>
        better, faster work happens.
      </h2>
      {isLoading && (
        <div className="flex w-full items-center justify-center">
          <Spinner size="md" />
        </div>
      )}
      {isAuthenticated && !isLoading && (
        <Button asChild>
          <Link href="/documents">
            Enter Novaris
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      )}
      {!isAuthenticated && !isLoading && (
        <SignUpButton mode="modal">
          <Button>
            Get Novaris free
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </SignUpButton>
      )}
    </div>
  );
};
