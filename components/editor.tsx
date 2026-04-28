"use client";

import { useTheme } from "next-themes";
import { useEffect, useRef, useState } from "react";

import { useCoverImage } from "@/hooks/useCoverImage";
import { EditorFont } from "@/hooks/useEditorFont";
import { useEdgeStore } from "@/lib/edgestore";
import { fontFamilies } from "@/lib/editorFont";

import {
  BlockNoteEditor,
  BlockNoteSchema,
  PartialBlock,
  createCodeBlockSpec,
} from "@blocknote/core";

import {
  AddBlockButton,
  DragHandleButton,
  SideMenu,
  SideMenuController,
  useBlockNoteEditor,
  useCreateBlockNote,
  useExtensionState,
} from "@blocknote/react";
import { SideMenuExtension } from "@blocknote/core/extensions";

import { codeBlockOptions } from "@blocknote/code-block";
import { BlockNoteView } from "@blocknote/mantine";

import { AiSideMenuButton } from "./ai/AiSideMenuButton";
import { useAction, useConvexAuth } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useParams } from "next/navigation";
import { Id } from "@/convex/_generated/dataModel";
import {
  Plus,
  Sparkles,
  Trash2,
  FileText,
  Bot,
  ArrowUpDown,
  ClipboardList,
  LayoutDashboard,
  Menu,
  X,
  GripVertical,
  ChevronUp,
  ChevronDown,
} from "lucide-react";
import { PartialBlock as PB } from "@blocknote/core";

import "@blocknote/core/style.css";
import "@blocknote/mantine/style.css";

interface EditorProps {
  onChange: (value: string) => void;
  initialContent?: string;
  editable?: boolean;
  editorFont?: string;
  onEditorReady?: (editor: BlockNoteEditor) => void;
}

const schema = BlockNoteSchema.create().extend({
  blockSpecs: {
    codeBlock: createCodeBlockSpec({
      ...codeBlockOptions,
      defaultLanguage: "typescript",
      supportedLanguages: {
        typescript: { name: "TypeScript", aliases: ["ts"] },
        javascript: { name: "JavaScript", aliases: ["js"] },
        python: { name: "Python", aliases: ["py"] },
        cpp: { name: "C++", aliases: ["cpp", "c++"] },
        java: { name: "Java" },
        rust: { name: "Rust", aliases: ["rs"] },
        go: { name: "Go" },
        sql: { name: "SQL" },
        html: { name: "HTML" },
        css: { name: "CSS" },
      },
    }),
  },
});

const MEDIA_BLOCK_TYPES = new Set(["image", "video", "audio", "file"]);

const getMediaUrls = (editor: BlockNoteEditor): Set<string> => {
  const urls = new Set<string>();
  editor.forEachBlock((block) => {
    if (MEDIA_BLOCK_TYPES.has(block.type)) {
      const url = (block.props as any)?.url;
      if (url && typeof url === "string" && url.trim() !== "") urls.add(url);
    }
    return true;
  });
  return urls;
};

const DeleteBlockButton = () => {
  const editor = useBlockNoteEditor<any, any, any>();
  const block = useExtensionState(SideMenuExtension, {
    editor,
    selector: (state) => state?.block,
  });
  if (!block) return null;
  return (
    <button
      className="h-6 w-6 flex items-center justify-center text-xs rounded hover:bg-muted"
      onClick={(e) => {
        e.stopPropagation();
        editor.removeBlocks([block.id]);
      }}
    >
      ✕
    </button>
  );
};

// ── Mobile bottom toolbar ──────────────────────────────────────────────────
interface MobileBlockToolbarProps {
  editor: BlockNoteEditor;
  editable: boolean;
}

const MobileBlockToolbar = ({ editor, editable }: MobileBlockToolbarProps) => {
  const params = useParams();
  const documentId = params.documentId as Id<"documents">;
  const { isAuthenticated } = useConvexAuth();
  const generateText = useAction(api.ai.generateText);

  const [aiOpen, setAiOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [activeBlock, setActiveBlock] = useState<any>(null);
  const [activeBlockText, setActiveBlockText] = useState("");

  // Drag state
  const [isDragging, setIsDragging] = useState(false);
  const [dragBlockId, setDragBlockId] = useState<string | null>(null);
  const [dragOverBlockId, setDragOverBlockId] = useState<string | null>(null);
  const [allBlocks, setAllBlocks] = useState<any[]>([]);
  const dragStartY = useRef(0);
  const dragCurrentY = useRef(0);

  // Track cursor position
  useEffect(() => {
    const update = () => {
      try {
        const pos = editor.getTextCursorPosition();
        if (pos?.block) {
          setActiveBlock(pos.block);
          const text = (pos.block.content as any[])
            ?.map((c: any) => (c.type === "text" ? c.text : ""))
            .join("") ?? "";
          setActiveBlockText(text.trim());
        }
      } catch {}
    };
    const tiptap = (editor as any)._tiptapEditor;
    if (!tiptap) return;
    tiptap.on("selectionUpdate", update);
    tiptap.on("focus", update);
    return () => {
      tiptap.off("selectionUpdate", update);
      tiptap.off("focus", update);
    };
  }, [editor]);

  // Collect all blocks for drag reorder
  const collectBlocks = () => {
    const blocks: any[] = [];
    editor.forEachBlock((b) => { blocks.push(b); return true; });
    return blocks;
  };

  if (!editable || !isAuthenticated) return null;

  // ── Block insertion ──
  const handleAddAbove = () => {
    if (!activeBlock) return;
    editor.insertBlocks([{ type: "paragraph", content: "" }], activeBlock, "before");
  };

  const handleAddBelow = () => {
    if (!activeBlock) return;
    editor.insertBlocks([{ type: "paragraph", content: "" }], activeBlock, "after");
  };

  const handleDelete = () => {
    if (!activeBlock) return;
    editor.removeBlocks([activeBlock.id]);
    setActiveBlock(null);
    setActiveBlockText("");
  };

  // ── Move block up/down (swap with neighbour) ──
  const handleMoveUp = () => {
    if (!activeBlock) return;
    const prev = editor.getPrevBlock(activeBlock.id);
    if (!prev) return;
    // Remove active block and re-insert it before prev
    const blockCopy = { ...activeBlock };
    editor.removeBlocks([activeBlock.id]);
    editor.insertBlocks([blockCopy], prev, "before");
    // Re-focus
    setTimeout(() => {
      try { editor.setTextCursorPosition(blockCopy.id, "start"); } catch {}
    }, 0);
  };

  const handleMoveDown = () => {
    if (!activeBlock) return;
    const next = editor.getNextBlock(activeBlock.id);
    if (!next) return;
    const blockCopy = { ...activeBlock };
    editor.removeBlocks([activeBlock.id]);
    editor.insertBlocks([blockCopy], next, "after");
    setTimeout(() => {
      try { editor.setTextCursorPosition(blockCopy.id, "start"); } catch {}
    }, 0);
  };

  // ── Touch drag reorder ──
  const handleDragStart = (e: React.TouchEvent, blockId: string) => {
    setIsDragging(true);
    setDragBlockId(blockId);
    dragStartY.current = e.touches[0].clientY;
    dragCurrentY.current = e.touches[0].clientY;
    setAllBlocks(collectBlocks());
  };

  const handleDragMove = (e: React.TouchEvent) => {
    if (!isDragging) return;
    dragCurrentY.current = e.touches[0].clientY;
    // Find which block the finger is over by querying DOM
    const el = document.elementFromPoint(
      e.touches[0].clientX,
      e.touches[0].clientY,
    );
    const blockEl = el?.closest("[data-id]");
    const overId = blockEl?.getAttribute("data-id") ?? null;
    if (overId && overId !== dragBlockId) setDragOverBlockId(overId);
  };

  const handleDragEnd = () => {
    if (dragBlockId && dragOverBlockId && dragBlockId !== dragOverBlockId) {
      const draggedBlock = allBlocks.find((b) => b.id === dragBlockId);
      const overBlock = allBlocks.find((b) => b.id === dragOverBlockId);
      if (draggedBlock && overBlock) {
        const dragIdx = allBlocks.indexOf(draggedBlock);
        const overIdx = allBlocks.indexOf(overBlock);
        const position = dragIdx < overIdx ? "after" : "before";
        try {
          const blockCopy = { ...draggedBlock };
          editor.removeBlocks([draggedBlock.id]);
          editor.insertBlocks([blockCopy], overBlock, position);
        } catch {}
      }
    }
    setIsDragging(false);
    setDragBlockId(null);
    setDragOverBlockId(null);
  };

  // ── AI ──
  const getBlockText = async (block: any) => {
    try { return (await editor.blocksToMarkdownLossy([block])).trim(); }
    catch { return ""; }
  };

  const appendToDoc = async (heading: string, text: string, block: any) => {
    try {
      const parsed = await editor.tryParseMarkdownToBlocks(`## ${heading}\n\n${text}`);
      if (parsed?.length) { editor.insertBlocks(parsed, block, "after"); return; }
    } catch {}
    const blocks: PB[] = [{ type: "heading", props: { level: 2 }, content: heading } as PB];
    text.split("\n\n").filter(Boolean).forEach((p) =>
      blocks.push({ type: "paragraph", content: p } as PB)
    );
    editor.insertBlocks(blocks, block, "after");
  };

  const runAi = async (promptFn: (t: string) => string, heading: string) => {
    if (!activeBlock) return;
    const text = await getBlockText(activeBlock);
    if (!text.trim()) return;
    try {
      setIsLoading(true);
      const result = await generateText({ documentId, prompt: promptFn(text) });
      await appendToDoc(heading, result, activeBlock);
    } finally {
      setIsLoading(false);
      setAiOpen(false);
    }
  };

  const aiActions = [
    { label: "Improve Writing", icon: Sparkles, fn: (t: string) => `Rewrite this text to be more professional and clear:\n${t}`, heading: "Improved Writing" },
    { label: "Summarize", icon: FileText, fn: (t: string) => `Summarize this text concisely:\n${t}`, heading: "Summary" },
    { label: "Extract Actions", icon: ClipboardList, fn: (t: string) => `Extract bullet-point action items from:\n${t}`, heading: "Action Items" },
    { label: "Explain Code", icon: Bot, fn: (t: string) => `Explain this code in simple terms:\n${t}`, heading: "Code Explanation" },
    { label: "Optimize Code", icon: ArrowUpDown, fn: (t: string) => `Suggest optimizations for this code:\n${t}`, heading: "Optimizations" },
    { label: "Categorize", icon: Menu, fn: (t: string) => `Categorize the items in this text:\n${t}`, heading: "Categorized Items" },
    { label: "Calculate", icon: LayoutDashboard, fn: (t: string) => `Find all numbers and calculate their sum:\n${t}`, heading: "Calculation" },
  ];

  return (
    <>
      {/* AI action sheet */}
      {aiOpen && (
        <div className="fixed inset-0 z-[9998] flex flex-col justify-end md:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setAiOpen(false)} />
          <div className="relative z-10 bg-background rounded-t-2xl border-t shadow-xl px-4 pt-4 pb-8">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="text-primary h-4 w-4" />
                <span className="font-semibold text-sm">AI Actions</span>
              </div>
              <button onClick={() => setAiOpen(false)} className="text-muted-foreground p-1">
                <X className="h-4 w-4" />
              </button>
            </div>
            {activeBlockText && (
              <div className="mb-3 rounded-lg bg-muted/50 border px-3 py-2">
                <p className="text-[10px] text-muted-foreground uppercase tracking-widest mb-0.5 font-semibold">Selected block</p>
                <p className="text-xs text-foreground/80 line-clamp-2">{activeBlockText}</p>
              </div>
            )}
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-8 gap-2">
                <div className="border-primary h-6 w-6 animate-spin rounded-full border-2 border-t-transparent" />
                <p className="text-xs text-muted-foreground">Generating...</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {aiActions.map((a) => (
                  <button
                    key={a.label}
                    onClick={() => runAi(a.fn, a.heading)}
                    disabled={!activeBlockText}
                    className="flex items-center gap-2 rounded-xl border bg-muted/40 px-3 py-3 text-left transition-colors hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <a.icon className="text-primary h-4 w-4 shrink-0" />
                    <span className="text-xs font-medium leading-tight">{a.label}</span>
                  </button>
                ))}
              </div>
            )}
            {!activeBlockText && !isLoading && (
              <p className="mt-3 text-center text-xs text-muted-foreground">
                Tap inside a block first, then open AI actions.
              </p>
            )}
          </div>
        </div>
      )}

      {/* Drag overlay indicator */}
      {isDragging && (
        <div className="fixed inset-0 z-[9996] md:hidden pointer-events-none">
          <div className="absolute inset-x-0 top-0 bottom-20 bg-primary/5" />
          <div className="absolute bottom-20 left-0 right-0 flex items-center justify-center py-2 bg-primary/10 border-t border-primary/20">
            <GripVertical className="text-primary h-4 w-4 mr-1" />
            <span className="text-xs text-primary font-medium">Drag to reorder — release to drop</span>
          </div>
        </div>
      )}

      {/* Bottom toolbar */}
      <div className="fixed bottom-0 left-0 right-0 z-[9997] border-t bg-background/95 backdrop-blur-sm md:hidden">
        {/* Active block preview */}
        {activeBlockText && (
          <div className="border-b px-4 py-1.5 flex items-center gap-2">
            <div className="h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
            <p className="text-[11px] text-muted-foreground truncate flex-1">{activeBlockText}</p>
          </div>
        )}

        <div className="flex items-center justify-around px-2 py-1.5">

          {/* Add above */}
          <button
            onClick={handleAddAbove}
            disabled={!activeBlock}
            className="flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-lg transition-colors active:bg-muted disabled:opacity-35"
          >
            <div className="relative">
              <Plus className="h-4 w-4 text-muted-foreground" />
              <ChevronUp className="h-2.5 w-2.5 text-muted-foreground absolute -top-1.5 -right-1.5" />
            </div>
            <span className="text-[9px] text-muted-foreground">Above</span>
          </button>

          {/* Add below */}
          <button
            onClick={handleAddBelow}
            disabled={!activeBlock}
            className="flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-lg transition-colors active:bg-muted disabled:opacity-35"
          >
            <div className="relative">
              <Plus className="h-4 w-4 text-muted-foreground" />
              <ChevronDown className="h-2.5 w-2.5 text-muted-foreground absolute -bottom-1.5 -right-1.5" />
            </div>
            <span className="text-[9px] text-muted-foreground">Below</span>
          </button>

          {/* Move up */}
          <button
            onClick={handleMoveUp}
            disabled={!activeBlock}
            className="flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-lg transition-colors active:bg-muted disabled:opacity-35"
          >
            <ChevronUp className="h-5 w-5 text-muted-foreground" />
            <span className="text-[9px] text-muted-foreground">Move up</span>
          </button>

          {/* Move down */}
          <button
            onClick={handleMoveDown}
            disabled={!activeBlock}
            className="flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-lg transition-colors active:bg-muted disabled:opacity-35"
          >
            <ChevronDown className="h-5 w-5 text-muted-foreground" />
            <span className="text-[9px] text-muted-foreground">Move dn</span>
          </button>

          {/* AI */}
          <button
            onClick={() => setAiOpen(true)}
            className="flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-lg transition-colors active:bg-muted"
          >
            <Sparkles className="h-5 w-5 text-primary" />
            <span className="text-[9px] text-primary font-medium">AI</span>
          </button>

          {/* Delete */}
          <button
            onClick={handleDelete}
            disabled={!activeBlock}
            className="flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-lg transition-colors active:bg-muted disabled:opacity-35"
          >
            <Trash2 className="h-5 w-5 text-destructive/70" />
            <span className="text-[9px] text-destructive/70">Delete</span>
          </button>

        </div>
      </div>
    </>
  );
};

const Editor = ({
  onChange,
  initialContent,
  editable = true,
  editorFont,
  onEditorReady,
}: EditorProps) => {
  const { resolvedTheme } = useTheme();
  const { edgestore } = useEdgeStore();
  const coverImage = useCoverImage();

  const wrapperRef = useRef<HTMLDivElement>(null);
  const trackedUrlsRef = useRef<Set<string>>(new Set());

  const handleUpload = async (file: File) => {
    const res = await edgestore.publicFiles.upload({ file });
    return res.url;
  };

  const editor: BlockNoteEditor = useCreateBlockNote({
    initialContent: initialContent
      ? (JSON.parse(initialContent) as PartialBlock[])
      : undefined,
    uploadFile: handleUpload,
    schema,
  });

  useEffect(() => {
    if (editor) {
      trackedUrlsRef.current = getMediaUrls(editor);
    }
    if (editor && onEditorReady) {
      onEditorReady(editor);
    }
  }, [editor]);

  const handleEditorChange = () => {
    const currentUrls = getMediaUrls(editor);
    const previousUrls = trackedUrlsRef.current;
    const removedUrls = [...previousUrls].filter((url) => !currentUrls.has(url));
    removedUrls.forEach((url) => { edgestore.publicFiles.delete({ url }).catch(() => {}); });
    trackedUrlsRef.current = currentUrls;
    onChange(JSON.stringify(editor.document, null, 2));
  };

  const handleCapture = (e: React.DragEvent) => {
    if (coverImage.isOpen) { e.preventDefault(); e.stopPropagation(); }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!editable || coverImage.isOpen) return;
    const blockEl = (e.target as HTMLElement).closest<HTMLElement>("[data-node-type='blockContainer']");
    if (!blockEl) return;
    const blockId = blockEl.getAttribute("data-id");
    if (!blockId) return;
    const prevBlock = editor.getPrevBlock(blockId);
    if (!prevBlock) return;
    if (!MEDIA_BLOCK_TYPES.has(prevBlock?.type as string)) return;
    e.stopPropagation();
    const view = (editor as any)._tiptapEditor.view;
    const pos = view.posAtCoords({ left: e.clientX, top: e.clientY });
    if (pos) {
      view.dispatch(view.state.tr.setSelection(
        view.state.selection.constructor.near(view.state.doc.resolve(pos.pos))
      ));
    }
    editor.focus();
  };

  return (
    <div
      ref={wrapperRef}
      className="relative flex-1 shrink-0 pb-10 md:pb-10 pb-20"
      style={{ "--editor-font": fontFamilies[editorFont as EditorFont] } as React.CSSProperties}
      onDropCapture={handleCapture}
      onDragOverCapture={handleCapture}
      onMouseDown={handleMouseDown}
    >
      <BlockNoteView
        editor={editor}
        editable={editable && !coverImage.isOpen}
        theme={resolvedTheme === "dark" ? "dark" : "light"}
        onChange={handleEditorChange}
        sideMenu={false}
        className="wrap-break-word [&_.bn-editor]:max-w-full [&_.bn-editor]:px-6"
      >
        <div className="hidden md:block">
          <SideMenuController
            sideMenu={(props) => (
              <SideMenu {...props}>
                <div
                  className="flex items-center gap-1 p-1 rounded-md bg-muted/80 border border-border shadow-sm pointer-events-auto"
                  onMouseDown={(e) => e.stopPropagation()}
                  onClick={(e) => e.stopPropagation()}
                >
                  <AddBlockButton />
                  <div className="cursor-grab">
                    <DragHandleButton {...props} />
                  </div>
                  <AiSideMenuButton />
                  <DeleteBlockButton />
                </div>
              </SideMenu>
            )}
          />
        </div>
      </BlockNoteView>

      {/* Mobile toolbar — only rendered when editable */}
      {editable && <MobileBlockToolbar editor={editor} editable={editable} />}
    </div>
  );
};

export default Editor;