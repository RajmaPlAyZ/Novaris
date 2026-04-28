"use client";

import { Spinner } from "@/components/spinner";
import { useConvexAuth } from "convex/react";
import { redirect } from "next/navigation";
import Navigation from "./_components/Navigation";
import { SearchCommand } from "@/components/search-command";

import { RightSidebar } from "./_components/RightSidebar";

const MainLayout = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, isLoading } = useConvexAuth();

  if (isLoading) {
    return (
      <div className="dark:bg-dark flex h-full items-center justify-center">
        <Spinner size="md" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return redirect("/");
  }

  return (
    <div className="dark:bg-dark from-background via-background to-muted/20 flex h-full overflow-hidden bg-gradient-to-br">
      <Navigation />
      <main className="h-full min-w-0 flex-1 overflow-y-auto">
        <SearchCommand />
        {children}
      </main>
      <RightSidebar />
    </div>
  );
};
export default MainLayout;
