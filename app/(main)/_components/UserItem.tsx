"use client";

import { Avatar, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SignOutButton, useClerk, useUser } from "@clerk/nextjs";
import { ChevronsLeftRight, LogOut, Settings } from "lucide-react";

export const UserItem = () => {
  const { user } = useUser();
  const { openUserProfile } = useClerk();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger>
        <div
          role="button"
          className="hover:bg-primary/8 mx-2 mt-2 flex w-[calc(100%-1rem)] items-center rounded-md border border-transparent px-2.5 py-2 text-sm transition-colors"
        >
          <div className="flex max-w-39 items-center gap-x-2">
            <Avatar className="h-5 w-5">
              <AvatarImage src={user?.imageUrl} />
            </Avatar>
            <span className="line-clamp-1 text-start font-medium">
              {user?.fullName}&apos;s Novaris
            </span>
          </div>
          <ChevronsLeftRight className="text-muted-foreground ml-2 h-4 w-4 rotate-90" />
        </div>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        className="w-80"
        align="start"
        alignOffset={11}
        forceMount
      >
        <div className="flex flex-col space-y-4 p-2">
          <p className="text-muted-foreground text-xs leading-none font-medium">
            {user?.emailAddresses[0]?.emailAddress}
          </p>
          <div className="flex items-center gap-x-2">
            <div className="bg-secondary rounded-md p-1">
              <Avatar>
                <AvatarImage src={user?.imageUrl} />
              </Avatar>
            </div>
            <div className="space-y-1">
              <p className="line-clamp-1 text-sm">
                {user?.fullName}&apos;s Novaris
              </p>
            </div>
          </div>
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          asChild
          className="text-muted-foreground w-full cursor-pointer"
        >
          <button onClick={() => openUserProfile()}>
            <Settings className="text-muted-foreground size-4" />
            Manage Account
          </button>
        </DropdownMenuItem>

        <DropdownMenuItem asChild className="group w-full cursor-pointer">
          <SignOutButton>
            <button>
              <LogOut className="text-muted-foreground size-4" />
              <span className="text-muted-foreground transition-colors group-hover:text-black! hover:text-black">
                Log Out
              </span>
            </button>
          </SignOutButton>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
