"use client";

import dynamic from "next/dynamic";
import { useMemo, use, useState, useEffect, useCallback } from "react";
import { useTheme } from "next-themes";

import { Cover } from "@/components/cover";
import { Toolbar } from "@/components/toolbar";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Whiteboard from "@/components/whiteboard/Whiteboard";

import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { BlockNoteEditor } from "@blocknote/core";
import { TableOfContents } from "@/components/table-of-contents";
import { useEditorFont } from "@/hooks/useEditorFont";
import { FileText, PenTool } from "lucide-react";

interface DocumentIdPageProps {
  params: Promise<{
    documentId: Id<"documents">;
  }>;
}

const DocumentIdPage = ({ params }: DocumentIdPageProps) => {
  const { documentId } = use(params);
  const [editor, setEditor] = useState<BlockNoteEditor | null>(null);
  const { resolvedTheme } = useTheme();

  const Editor = useMemo(
    () => dynamic(() => import("@/components/editor"), { ssr: false }),
    [],
  );

  const doc = useQuery(api.documents.getById, {
    documentId: documentId,
  });

  const { editorFont, isFontLoading } = useEditorFont({ enabled: true });

  const update = useMutation(api.documents.update);

  useEffect(() => {
    if (!doc) return;

    const defaultFavicon =
      resolvedTheme === "dark" ? "/logo-dark.svg" : "/logo.svg";

    window.document.title = `${doc.title || "Untitled"} | Novaris`;

    const link = window.document.querySelector(
      "link[rel~='icon']",
    ) as HTMLLinkElement;
    if (link) {
      link.href = doc.icon
        ? `data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text x='50%' y='50%' dominant-baseline='central' text-anchor='middle' font-size='100'>${doc.icon}</text></svg>`
        : defaultFavicon;
    }

    return () => {
      window.document.title = "Novaris";
      if (link) link.href = defaultFavicon;
    };
  }, [doc, resolvedTheme, documentId]);

  useEffect(() => {
    if (!doc) return;
    if (doc.editorFont === editorFont) return;

    update({
      id: documentId,
      editorFont,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editorFont, documentId]);

  const activeFont = doc?.editorFont ?? editorFont;

  const onChange = useCallback(
    (content: string) => {
      update({
        id: documentId,
        content,
      });
    },
    [documentId, update],
  );

  if (doc === undefined || isFontLoading) {
    return (
      <div>
        <Cover.Skeleton />
        <div className="mx-auto mt-10 md:max-w-3xl lg:max-w-4xl">
          <div className="space-y-4 pt-4 pl-8">
            <Skeleton className="h-14 w-1/2" />
            <Skeleton className="h-4 w-4/5" />
            <Skeleton className="h-4 w-2/5" />
            <Skeleton className="h-4 w-3/5" />
          </div>
        </div>
      </div>
    );
  }

  if (doc === null) {
    return <div>Not found</div>;
  }

  return (
    <div className="relative pb-20 sm:pb-35">
      <Cover url={doc.coverImage} />
      <div className="relative mx-auto w-full px-2 sm:px-4 md:w-[90%] md:px-0">
        <Toolbar initialData={doc} editorFont={activeFont} />

        <Tabs defaultValue="editor" className="mt-4 w-full">
          <div className="bg-background/85 sticky top-0 z-30 mb-3 rounded-lg border px-2 py-2 shadow-sm backdrop-blur-sm sm:px-3">
            <TabsList className="w-full bg-transparent p-0 md:ml-9 md:w-fit">
              <TabsTrigger value="editor" className="gap-1.5 text-xs sm:gap-2 sm:text-sm">
                <FileText className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                Document
              </TabsTrigger>
              <TabsTrigger value="whiteboard" className="gap-1.5 text-xs sm:gap-2 sm:text-sm">
                <PenTool className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                Whiteboard
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent
            value="editor"
            className="mt-0 focus-visible:outline-none"
          >
            <Editor
              onChange={onChange}
              initialContent={doc.content}
              onEditorReady={setEditor}
              editorFont={activeFont}
            />
            <TableOfContents editor={editor} />
          </TabsContent>

          <TabsContent
            value="whiteboard"
            className="mt-0 h-[calc(100vh-160px)] min-h-[400px] overflow-hidden pb-6 focus-visible:outline-none sm:min-h-[600px] lg:min-h-[720px]"
          >
            <Whiteboard documentId={documentId} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};
export default DocumentIdPage;
