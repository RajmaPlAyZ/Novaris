"use client";

import React, { ComponentRef, useEffect, useRef, useState } from "react";
import { useMediaQuery } from "usehooks-ts";
import { useMutation } from "convex/react";
import { useParams, usePathname, useRouter } from "next/navigation";

import { cn } from "@/lib/utils";
import { api } from "@/convex/_generated/api";
import { DocumentList } from "./DocumentList";
import { Item } from "./Item";
import { UserItem } from "./UserItem";

import { toast } from "sonner";
import {
  ChevronsLeft,
  MenuIcon,
  Plus,
  PlusCircle,
  Search,
  Settings,
  Trash,
} from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { TrashBox } from "./TrashBox";
import { useSearch } from "@/hooks/useSearch";
import { useSettings } from "@/hooks/useSettingsModal";
import { Navbar } from "./Navbar";
import { ScrollableList } from "@/components/scrollable-list";
import { FavoritesList } from "./FavoritesList";
import { ActionTooltip } from "@/components/action-tooltip";

const Navigation = () => {
  const params = useParams();
  const router = useRouter();
  const pathname = usePathname();

  const isMobile = useMediaQuery("(max-width: 768px)");

  const search = useSearch();
  const settings = useSettings();

  const create = useMutation(api.documents.create);

  const isResizingRef = useRef(false);
  const sidebarRef = useRef<ComponentRef<"aside">>(null);
  const navbarRef = useRef<ComponentRef<"div">>(null);
  const [isResetting, setIsResetting] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(isMobile);

  useEffect(() => {
    if (isMobile) {
      collapse();
    } else {
      resetWidth();
    }
  }, [isMobile]);

  useEffect(() => {
    if (isMobile) {
      collapse();
    }
  }, [pathname, isMobile]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === "\\") {
        e.preventDefault();
        isCollapsed ? resetWidth() : collapse();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isCollapsed]);

  const handleMouseDown = (
    event: React.MouseEvent<HTMLDivElement, MouseEvent>,
  ) => {
    event.preventDefault();
    event.stopPropagation();

    isResizingRef.current = true;
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isResizingRef.current) return;
    let newWidth = e.clientX;

    if (newWidth < 240) newWidth = 240;
    if (newWidth > 480) newWidth = 480;

    if (sidebarRef.current && navbarRef.current) {
      sidebarRef.current.style.width = `${newWidth}px`;
      navbarRef.current.style.setProperty("left", `${newWidth}px`);
      navbarRef.current.style.setProperty(
        "width",
        `calc(100% - ${newWidth}px)`,
      );
    }
  };

  const handleMouseUp = () => {
    isResizingRef.current = false;
    document.removeEventListener("mousemove", handleMouseMove);
    document.removeEventListener("mouseup", handleMouseUp);
  };

  const resetWidth = () => {
    if (sidebarRef.current && navbarRef.current) {
      setIsCollapsed(false);
      setIsResetting(true);

      sidebarRef.current.style.width = isMobile ? "100%" : "272px";
      navbarRef.current.style.removeProperty("width");
      navbarRef.current.style.setProperty(
        "width",
        isMobile ? "0" : "calc(100% - 272px)",
      );
      navbarRef.current.style.setProperty("left", isMobile ? "100%" : "272px");
      setTimeout(() => setIsResetting(false), 300);
    }
  };

  const collapse = () => {
    if (sidebarRef.current && navbarRef.current) {
      setIsCollapsed(true);
      setIsResetting(true);

      sidebarRef.current.style.width = "0";
      navbarRef.current.style.setProperty("width", "100%");
      navbarRef.current.style.setProperty("left", "0");
      setTimeout(() => setIsResetting(false), 300);
    }
  };

  const handleCreate = () => {
    const promise = create({ title: "Untitled" }).then((documentId) =>
      router.push(`/documents/${documentId}`),
    );

    toast.promise(promise, {
      loading: "Creating a new note....",
      success: "New note created.",
      error: "Failed to create a note.",
    });
  };

  return (
    <>
      <aside
        ref={sidebarRef}
        className={cn(
          "group/sidebar bg-secondary/85 relative z-300 flex h-full w-[272px] flex-col overflow-hidden overflow-x-hidden border-r shadow-sm backdrop-blur-sm",
          isResetting && "transition-all duration-300 ease-in-out",
          isMobile && "w-0",
        )}
      >
        <ActionTooltip label="Close sidebar (Ctrl + \)">
          <div
            onClick={collapse}
            role="button"
            className={cn(
              "text-muted-foreground absolute top-3 right-2 h-6 w-6 rounded-sm opacity-0 transition group-hover/sidebar:opacity-100 hover:bg-neutral-300 dark:hover:bg-neutral-600",
              isMobile && "opacity-100",
            )}
          >
            <ChevronsLeft className="h-6 w-6" />
          </div>
        </ActionTooltip>
        <div>
          <UserItem />
          <div className="space-y-0.5 px-2">
            <Item
              label="Search"
              icon={Search}
              onClick={search.onOpen}
              shortcut="Ctrl + K"
            />
            <Item label="Settings" icon={Settings} onClick={settings.onOpen} />
            <Item onClick={handleCreate} label="New page" icon={PlusCircle} />
          </div>
        </div>
        <div className="mt-4 flex min-h-0 flex-1 flex-col">
          <div className="min-h-0 flex-1">
            <ScrollableList>
              <FavoritesList />
              <div>
                <p className="text-muted-foreground/70 px-3 py-1 text-xs font-semibold tracking-[0.08em] uppercase">
                  Notes
                </p>
                <DocumentList />
              </div>
            </ScrollableList>
          </div>
          <div className="space-y-2 border-t px-2 pt-3">
            <Item onClick={handleCreate} icon={Plus} label="Add a page" />
          </div>
          <Popover>
            <PopoverTrigger className="w-full px-2">
              <Item label="Trash" icon={Trash} />
            </PopoverTrigger>
            <PopoverContent
              side={isMobile ? "bottom" : "right"}
              className="w-72 p-0"
              collisionPadding={16}
            >
              <TrashBox />
            </PopoverContent>
          </Popover>
        </div>
        <div
          onMouseDown={handleMouseDown}
          onClick={resetWidth}
          className="bg-primary/10 absolute top-0 right-0 h-full w-1 cursor-ew-resize opacity-0 transition group-hover/sidebar:opacity-100"
        ></div>
      </aside>
      <div
        ref={navbarRef}
        className={cn(
          "absolute top-0 left-[272px] z-40 w-[calc(100%-272px)]",
          isResetting && "transition-all duration-300 ease-in-out",
          isMobile && "left-0 w-full",
        )}
      >
        {!!params.documentId ? (
          (!isMobile || isCollapsed) && (
            <Navbar isCollapsed={isCollapsed} onResetWidth={resetWidth} />
          )
        ) : (
          <nav
            className={cn(
              "w-full bg-transparent px-3 py-2",
              !isCollapsed && "p-0",
            )}
          >
            {isCollapsed && (
              <ActionTooltip label="Open sidebar (Ctrl + \)">
                <button onClick={resetWidth}>
                  <MenuIcon className="text-muted-foreground h-6 w-6" />
                </button>
              </ActionTooltip>
            )}
          </nav>
        )}
      </div>
    </>
  );
};
export default Navigation;
