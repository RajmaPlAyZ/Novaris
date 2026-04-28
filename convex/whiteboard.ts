import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { Doc, Id } from "./_generated/dataModel";

export const getByDocumentId = query({
  args: {
    documentId: v.id("documents"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();

    if (!identity) {
      throw new Error("Not authenticated");
    }

    const userId = identity.subject;

    // Get the document to verify ownership
    const document = await ctx.db.get(args.documentId);
    if (!document) {
      throw new Error("Document not found");
    }

    if (document.userId !== userId) {
      throw new Error("Not authorized");
    }

    // Get whiteboard data for this document
    const whiteboard = await ctx.db
      .query("whiteboards")
      .filter((q) => q.eq(q.field("documentId"), args.documentId))
      .first();

    return {
      documentId: args.documentId,
      objects: whiteboard?.data || [],
    };
  },
});

export const addObject = mutation({
  args: {
    documentId: v.id("documents"),
    object: v.any(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();

    if (!identity) {
      throw new Error("Not authenticated");
    }

    const userId = identity.subject;

    // Get the document to verify ownership
    const document = await ctx.db.get(args.documentId);
    if (!document) {
      throw new Error("Document not found");
    }

    if (document.userId !== userId) {
      throw new Error("Not authorized");
    }

    // Get existing whiteboard or create new one
    const existingWhiteboard = await ctx.db
      .query("whiteboards")
      .filter((q) => q.eq(q.field("documentId"), args.documentId))
      .first();

    const objectId =
      args.object.id ?? args.object.data?.id ?? crypto.randomUUID();
    const newObject = {
      ...args.object,
      id: objectId,
      data: args.object.data
        ? {
            ...args.object.data,
            id: args.object.data.id ?? objectId,
          }
        : args.object.data,
      _id: objectId,
      _creationTime: Date.now(),
    };

    let whiteboard;
    if (existingWhiteboard) {
      // Update existing whiteboard
      const updatedData = [...existingWhiteboard.data, newObject];
      whiteboard = await ctx.db.patch(existingWhiteboard._id, {
        data: updatedData,
        updatedAt: Date.now(),
      });
    } else {
      // Create new whiteboard
      whiteboard = await ctx.db.insert("whiteboards", {
        documentId: args.documentId,
        data: [newObject],
        updatedAt: Date.now(),
      });
    }

    return {
      documentId: args.documentId,
      object: newObject,
    };
  },
});

export const clear = mutation({
  args: {
    documentId: v.id("documents"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();

    if (!identity) {
      throw new Error("Not authenticated");
    }

    const userId = identity.subject;

    // Get the document to verify ownership
    const document = await ctx.db.get(args.documentId);
    if (!document) {
      throw new Error("Document not found");
    }

    if (document.userId !== userId) {
      throw new Error("Not authorized");
    }

    // Clear or delete whiteboard
    const existingWhiteboard = await ctx.db
      .query("whiteboards")
      .filter((q) => q.eq(q.field("documentId"), args.documentId))
      .first();

    if (existingWhiteboard) {
      await ctx.db.patch(existingWhiteboard._id, {
        data: [],
        updatedAt: Date.now(),
      });
    }

    return true;
  },
});

export const removeObject = mutation({
  args: {
    documentId: v.id("documents"),
    objectId: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();

    if (!identity) {
      throw new Error("Not authenticated");
    }

    const userId = identity.subject;

    // Get the document to verify ownership
    const document = await ctx.db.get(args.documentId);
    if (!document) {
      throw new Error("Document not found");
    }

    if (document.userId !== userId) {
      throw new Error("Not authorized");
    }

    // Get existing whiteboard
    const existingWhiteboard = await ctx.db
      .query("whiteboards")
      .filter((q) => q.eq(q.field("documentId"), args.documentId))
      .first();

    if (existingWhiteboard) {
      // Remove object from whiteboard data
      const updatedData = existingWhiteboard.data.filter((obj: any) => {
        const id = obj.id ?? obj._id ?? obj.data?.id;
        return id !== args.objectId;
      });

      await ctx.db.patch(existingWhiteboard._id, {
        data: updatedData,
        updatedAt: Date.now(),
      });
    }

    return true;
  },
});
