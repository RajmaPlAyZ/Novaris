import { useState } from "react";
import { useAction, useMutation, useConvexAuth } from "convex/react";
import { Id } from "@/convex/_generated/dataModel";
import { api } from "@/convex/_generated/api";
import { SideMenuExtension } from "@blocknote/core/extensions";
import {
  useBlockNoteEditor,
  useComponentsContext,
  useExtensionState,
  useExtension,
} from "@blocknote/react";
import { PartialBlock } from "@blocknote/core";
import {
  Sparkles,
  ClipboardList,
  Bot,
  ArrowUpDown,
  FileText,
  LayoutDashboard,
  Menu,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface ActionSuggestion {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  action: () => Promise<void>;
}

import { useParams } from "next/navigation";

export const AiSideMenuButton = () => {
  const params = useParams();
  const documentId = params.documentId as Id<"documents">;

  const Components = useComponentsContext()!;
  const editor = useBlockNoteEditor<any, any, any>();
  const { isAuthenticated } = useConvexAuth();

  const sideMenu = useExtension(SideMenuExtension);
  const block = useExtensionState(SideMenuExtension, {
    editor,
    selector: (state) => state?.block,
  });

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const generateText = useAction(api.ai.generateText);
  const createActionItem = useMutation(api.actionItems.create);

  if (block === undefined || !isAuthenticated) {
    return null;
  }

  // Get text of the hovered block using BlockNote's native markdown exporter
  const getBlockText = async () => {
    try {
      const markdown = await editor.blocksToMarkdownLossy([block]);
      return markdown.trim();
    } catch (e) {
      console.warn("Native markdown export failed", e);
      return "";
    }
  };

  const appendToDocument = async (heading: string, text: string) => {
    try {
      try {
        const markdownText = `## ${heading}\n\n${text}`;
        const parsedBlocks =
          await editor.tryParseMarkdownToBlocks(markdownText);
        if (parsedBlocks && parsedBlocks.length > 0) {
          editor.insertBlocks(parsedBlocks, block, "after");
          return;
        }
      } catch (parseErr) {
        console.warn(
          "Markdown parsing failed, falling back to raw blocks",
          parseErr,
        );
      }

      const paragraphs = text.split("\n\n").filter((p) => p.trim() !== "");
      const blocksToInsert: PartialBlock[] = [
        {
          type: "heading",
          props: { level: 2 },
          content: heading,
        } as PartialBlock,
      ];
      for (const p of paragraphs) {
        blocksToInsert.push({ type: "paragraph", content: p } as PartialBlock);
      }
      editor.insertBlocks(blocksToInsert, block, "after");
    } catch (err) {
      console.error("Failed to append AI content:", err);
    }
  };

  const runAiAction = async (
    promptFn: (text: string) => string,
    heading: string,
  ) => {
    const textToAnalyze = await getBlockText();
    if (!textToAnalyze.trim()) return;

    try {
      setIsLoading(true);
      const aiText = await generateText({
        documentId,
        prompt: promptFn(textToAnalyze),
      });
      await appendToDocument(heading, aiText);
    } finally {
      setIsLoading(false);
    }
  };

  const extractActionItems = async () => {
    const textToAnalyze = await getBlockText();
    if (!textToAnalyze.trim()) return;

    try {
      setIsLoading(true);
      const aiText = await generateText({
        documentId,
        prompt:
          "Extract bullet-point action items from the following text: " +
          textToAnalyze,
      });
      await createActionItem({
        documentId,
        title: "Action Items from AI",
        description: aiText.substring(0, 100) + "...",
        isCompleted: false,
      });
      await appendToDocument("Action Items", aiText);
    } catch (err) {
      console.error("Failed to create action item:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const suggestions: ActionSuggestion[] = [
    {
      id: "general-improve",
      title: "Improve Writing",
      description: "Enhance clarity, tone, and grammar",
      icon: Sparkles,
      action: () =>
        runAiAction(
          (t) =>
            "Rewrite this text to be more professional, clear, and grammatically correct: \n" +
            t,
          "Improved Writing",
        ),
    },
    {
      id: "general-summarize",
      title: "Summarize",
      description: "Create a concise summary of the content",
      icon: FileText,
      action: () =>
        runAiAction((t) => "Summarize this text concisely: \n" + t, "Summary"),
    },
    {
      id: "meeting-actions",
      title: "Extract Action Items",
      description: "Identify and create action items from text",
      icon: ClipboardList,
      action: extractActionItems,
    },
    {
      id: "code-explain",
      title: "Explain Code",
      description: "Get a plain English explanation of this code",
      icon: Bot,
      action: () =>
        runAiAction(
          (t) => "Explain the following code in simple terms: \n" + t,
          "Code Explanation",
        ),
    },
    {
      id: "code-optimize",
      title: "Optimize Code",
      description: "Suggest improvements to make this code more efficient",
      icon: ArrowUpDown,
      action: () =>
        runAiAction(
          (t) =>
            "Suggest performance and readability optimizations for this code: \n" +
            t,
          "Code Optimization Suggestions",
        ),
    },
    {
      id: "list-totals",
      title: "Calculate Totals",
      description: "Find and sum numerical values",
      icon: LayoutDashboard,
      action: () =>
        runAiAction(
          (t) =>
            "Identify all numbers in this text and calculate their sum, returning just the breakdown and final total: \n" +
            t,
          "Calculation Result",
        ),
    },
    {
      id: "list-categorize",
      title: "Categorize Items",
      description: "Group similar items together",
      icon: Menu,
      action: () =>
        runAiAction(
          (t) =>
            "Categorize the items in this text into logical groups: \n" + t,
          "Categorized Items",
        ),
    },
  ];

  // Add table-specific features if the hovered block is a table
  if (block.type === "table") {
    suggestions.unshift(
      {
        id: "table-analyze",
        title: "Analyze Table Data",
        description: "Provide insights and analysis of this data",
        icon: Sparkles,
        action: () =>
          runAiAction(
            (t) =>
              "Analyze the following table data. Provide key insights, trends, and a summary of what the data represents:\n\n" +
              t,
            "Data Analysis",
          ),
      },
      {
        id: "table-summarize",
        title: "Summarize Table",
        description: "Convert table to a written summary",
        icon: FileText,
        action: () =>
          runAiAction(
            (t) =>
              "Write a comprehensive paragraph summarizing the information contained in this table:\n\n" +
              t,
            "Table Summary",
          ),
      },
    );
  }

  return (
    <DropdownMenu
      onOpenChange={(open) => {
        if (open) {
          sideMenu.freezeMenu();
        } else {
          sideMenu.unfreezeMenu();
        }
      }}
    >
      <DropdownMenuTrigger asChild>
        <Components.SideMenu.Button
          className="bn-button"
          label="AI Suggestions"
          icon={
            isLoading ? (
              <div className="border-primary h-3 w-3 animate-spin rounded-full border-2 border-t-transparent" />
            ) : (
              <Sparkles size={16} className="text-primary/70" />
            )
          }
        />
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="start"
        side="right"
        className="z-[99999] w-64 p-2"
        sideOffset={10}
      >
        <div className="text-primary mb-2 flex items-center gap-2 border-b px-2 pb-2 text-sm font-medium">
          <Sparkles size={14} />
          AI Actions
        </div>

        <div className="space-y-1">
          {suggestions.map((suggestion) => (
            <DropdownMenuItem
              key={suggestion.id}
              onClick={suggestion.action}
              className="hover:bg-muted flex cursor-pointer items-start gap-x-2 rounded-md px-2 py-2"
            >
              <suggestion.icon className="text-muted-foreground mt-0.5 h-4 w-4 flex-shrink-0" />
              <div className="min-w-0 flex-1">
                <div className="text-sm leading-tight font-medium break-words whitespace-normal">
                  {suggestion.title}
                </div>
                <div className="text-muted-foreground mt-0.5 text-xs leading-tight break-words whitespace-normal">
                  {suggestion.description}
                </div>
              </div>
            </DropdownMenuItem>
          ))}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
