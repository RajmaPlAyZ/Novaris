import { Button } from "@/components/ui/button";
import { Logo } from "./Logo";

export const Footer = () => {
  return (
    <footer className="bg-background dark:bg-dark z-50 flex w-full flex-wrap items-center gap-y-2 p-4 md:px-8">
      <Logo />
      <div className="text-muted-foreground flex w-full items-center justify-between gap-x-1 sm:w-auto sm:ml-auto">
        <Button variant="ghost" size="sm">
          Privacy Policy
        </Button>
        <Button variant="ghost" size="sm">
          Terms and Conditions
        </Button>
      </div>
    </footer>
  );
};
