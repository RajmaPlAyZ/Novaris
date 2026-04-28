"use client";

import { useState } from "react";
import { format, isToday, isTomorrow, isYesterday } from "date-fns";
import { useMutation, useQuery } from "convex/react";
import {
  CheckCircle2,
  Circle,
  Plus,
  Tag,
  Trash2,
  ListChecks,
  CalendarDays,
  ChevronDown,
} from "lucide-react";

import { api } from "@/convex/_generated/api";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function formatSelectedDate(date: Date | undefined): string {
  if (!date) return "No date selected";
  if (isToday(date)) return "Today";
  if (isTomorrow(date)) return "Tomorrow";
  if (isYesterday(date)) return "Yesterday";
  return format(date, "EEEE, MMM d");
}

export const RightSidebar = () => {
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newCategoryName, setNewCategoryName] = useState("");
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(true);

  const actionItems = useQuery(api.actionItems.getForUser);
  const toggleComplete = useMutation(api.actionItems.toggleComplete);
  const remove = useMutation(api.actionItems.remove);
  const createGlobal = useMutation(api.actionItems.createGlobal);

  const userSettings = useQuery(api.userSettings.getUserSettings);
  const addCategory = useMutation(api.userSettings.addCategory);
  const customCategories = userSettings?.categories || [];

  const displayedTasks =
    selectedCategory === "all"
      ? actionItems
      : actionItems?.filter((item) => item.category === selectedCategory);

  const pendingCount =
    displayedTasks?.filter((item) => !item.isCompleted).length || 0;

  const completedCount =
    displayedTasks?.filter((item) => item.isCompleted).length || 0;

  const handleAddTask = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== "Enter" || !newTaskTitle.trim()) return;
    await createGlobal({
      title: newTaskTitle.trim(),
      category: selectedCategory === "all" ? undefined : selectedCategory,
      isCompleted: false,
    });
    setNewTaskTitle("");
  };

  const handleAddCategory = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== "Enter" || !newCategoryName.trim()) return;
    const category = newCategoryName.trim();
    await addCategory({ category });
    setSelectedCategory(category);
    setNewCategoryName("");
    setIsAddingCategory(false);
  };

  return (
    <aside className="border-border/50 bg-background/60 hidden h-full w-72 shrink-0 flex-col border-l backdrop-blur-md xl:flex overflow-hidden pt-14">

      {/* ── Calendar section ── */}
      <div className="border-border/40 border-b shrink-0">

        {/* Collapsible header */}
        <button
          onClick={() => setCalendarOpen((v) => !v)}
          className="hover:bg-muted/30 flex w-full items-center justify-between px-4 pt-5 pb-3 transition-colors"
        >
          <div className="flex items-center gap-2">
            <div className="bg-primary/10 flex h-6 w-6 items-center justify-center rounded-md">
              <CalendarDays className="text-primary h-3.5 w-3.5" />
            </div>
            <span className="text-[11px] font-semibold tracking-widest uppercase text-foreground/60">
              Calendar
            </span>
          </div>
          <ChevronDown
            className={cn(
              "text-muted-foreground/50 h-3.5 w-3.5 transition-transform duration-200",
              !calendarOpen && "-rotate-90",
            )}
          />
        </button>

        {calendarOpen && (
          <>
            {/* Selected date display */}
            {date && (
              <div className="px-4 pb-3">
                <div className="bg-primary/8 border-primary/15 flex items-center justify-between rounded-xl border px-4 py-2.5">
                  <div>
                    <p className="text-primary text-sm font-semibold leading-tight">
                      {formatSelectedDate(date)}
                    </p>
                    <p className="text-muted-foreground/70 mt-0.5 text-[11px]">
                      {format(date, "MMMM d, yyyy")}
                    </p>
                  </div>
                  <div className="bg-primary/15 text-primary rounded-lg px-2.5 py-1 text-xs font-bold">
                    {format(date, "EEE")}
                  </div>
                </div>
              </div>
            )}

            {/* Calendar — full width, centered */}
            <div className="flex w-full justify-center px-3 pb-3">
              <Calendar
                mode="single"
                selected={date}
                onSelect={setDate}
                showOutsideDays
                className="w-full"
              />
            </div>
          </>
        )}

        {/* Category filter */}
        <div className="border-border/40 border-t px-4 py-3">
          <div className="mb-2.5 flex items-center justify-between">
            <span className="text-[10px] font-semibold tracking-widest uppercase text-muted-foreground/60">
              Filter
            </span>
            <Button
              variant="ghost"
              size="xs"
              onClick={() => setIsAddingCategory((v) => !v)}
              className="text-muted-foreground hover:text-foreground h-5 gap-1 px-1.5 text-[10px]"
            >
              <Plus className="h-2.5 w-2.5" />
              New
            </Button>
          </div>

          {isAddingCategory ? (
            <Input
              placeholder="Category name + Enter"
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              onKeyDown={handleAddCategory}
              autoFocus
              className="h-7 text-xs"
            />
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {["all", ...customCategories].map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={cn(
                    "rounded-full border px-3 py-0.5 text-[11px] font-medium transition-all",
                    selectedCategory === cat
                      ? "bg-primary border-primary text-primary-foreground shadow-sm"
                      : "border-border/50 text-muted-foreground hover:border-primary/40 hover:text-foreground bg-transparent",
                  )}
                >
                  {cat === "all" ? "All" : cat}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Tasks section ── */}
      <div className="flex min-h-0 flex-1 flex-col px-4 py-3">

        {/* Header */}
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-primary/10 flex h-6 w-6 items-center justify-center rounded-md">
              <ListChecks className="text-primary h-3.5 w-3.5" />
            </div>
            <span className="text-[11px] font-semibold tracking-widest uppercase text-foreground/60">
              Tasks
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            {completedCount > 0 && (
              <span className="text-muted-foreground/50 rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium">
                {completedCount} done
              </span>
            )}
            {pendingCount > 0 && (
              <span className="bg-primary/10 text-primary rounded-full px-2 py-0.5 text-[10px] font-semibold">
                {pendingCount} left
              </span>
            )}
          </div>
        </div>

        {/* Add task */}
        <div className="relative mb-3">
          <Plus className="text-muted-foreground/40 pointer-events-none absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2" />
          <Input
            placeholder="Add task, press Enter"
            value={newTaskTitle}
            onChange={(e) => setNewTaskTitle(e.target.value)}
            onKeyDown={handleAddTask}
            className="h-9 pl-8 text-sm"
          />
        </div>

        {/* Task list */}
        {displayedTasks === undefined ? (
          <div className="flex flex-1 items-center justify-center">
            <div className="border-primary/40 h-5 w-5 animate-spin rounded-full border-2 border-t-transparent" />
          </div>
        ) : displayedTasks.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-2 py-8">
            <div className="bg-muted/40 flex h-10 w-10 items-center justify-center rounded-full">
              <ListChecks className="text-muted-foreground/30 h-5 w-5" />
            </div>
            <p className="text-muted-foreground/50 text-center text-xs leading-relaxed">
              No tasks yet.
              <br />
              Add one above.
            </p>
          </div>
        ) : (
          <div className="hide-scrollbar space-y-1.5 overflow-y-auto pb-2">
            {displayedTasks.map((item) => (
              <div
                key={item._id}
                className={cn(
                  "group relative overflow-hidden rounded-lg border px-3 py-2.5 transition-all duration-150",
                  item.isCompleted
                    ? "border-transparent bg-muted/15 opacity-55"
                    : "border-border/40 bg-background/60 hover:border-primary/25 hover:bg-muted/20",
                )}
              >
                {/* Left accent */}
                {!item.isCompleted && (
                  <div className="bg-primary/50 absolute inset-y-0 left-0 w-[3px]" />
                )}

                <div className="flex items-start gap-2.5 pl-1">
                  <button
                    onClick={() => toggleComplete({ id: item._id })}
                    className="mt-0.5 shrink-0"
                  >
                    {item.isCompleted ? (
                      <CheckCircle2 className="text-primary/50 h-4 w-4" />
                    ) : (
                      <Circle className="text-muted-foreground/40 hover:text-primary h-4 w-4 transition-colors" />
                    )}
                  </button>

                  <div className="min-w-0 flex-1">
                    <p
                      className={cn(
                        "text-sm leading-snug",
                        item.isCompleted
                          ? "text-muted-foreground/50 line-through"
                          : "text-foreground/90 font-medium",
                      )}
                    >
                      {item.title}
                    </p>

                    <div className="mt-1 flex flex-wrap items-center gap-1.5">
                      <span className="text-muted-foreground/40 text-[10px]">
                        {format(new Date(item.createdAt), "MMM d")}
                      </span>
                      {item.category && (
                        <span className="bg-primary/8 text-primary/60 border-primary/15 inline-flex items-center gap-0.5 rounded-full border px-1.5 py-px text-[10px] font-medium">
                          <Tag className="h-2 w-2" />
                          {item.category}
                        </span>
                      )}
                    </div>
                  </div>

                  <button
                    onClick={() => remove({ id: item._id })}
                    className="text-muted-foreground/20 hover:text-destructive mt-0.5 shrink-0 opacity-0 transition-all group-hover:opacity-100"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </aside>
  );
};
