import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const create = mutation({
  args: {
    documentId: v.id("documents"),
    title: v.string(),
    description: v.optional(v.string()),
    isCompleted: v.boolean(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }
    const userId = identity.subject;

    const document = await ctx.db.get(args.documentId);
    if (!document) {
      throw new Error("Not found");
    }

    if (document.userId !== userId) {
      throw new Error("Unauthorized");
    }

    const actionItem = await ctx.db.insert("actionItems", {
      documentId: args.documentId,
      title: args.title,
      description: args.description,
      isCompleted: args.isCompleted,
      createdAt: Date.now(),
    });

    return actionItem;
  },
});

export const createGlobal = mutation({
  args: {
    title: v.string(),
    description: v.optional(v.string()),
    category: v.optional(v.string()),
    isCompleted: v.boolean(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    
    return await ctx.db.insert("actionItems", {
      userId: identity.subject,
      title: args.title,
      description: args.description,
      category: args.category,
      isCompleted: args.isCompleted,
      createdAt: Date.now(),
    });
  },
});

export const getForUser = query({
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];
    
    // Fast path: get all tasks created globally with userId
    const globalTasks = await ctx.db
      .query("actionItems")
      .withIndex("by_user", (q) => q.eq("userId", identity.subject))
      .order("desc")
      .collect();
      
    // Legacy path: get tasks tied to documents but missing userId
    const documents = await ctx.db
      .query("documents")
      .withIndex("by_user", (q) => q.eq("userId", identity.subject))
      .collect();
    const documentIds = new Set(documents.map(d => d._id));
    const allActionItems = await ctx.db.query("actionItems").order("desc").collect();
    const legacyTasks = allActionItems.filter(item => !item.userId && item.documentId && documentIds.has(item.documentId));
    
    // Deduplicate just in case
    const seen = new Set(globalTasks.map(t => t._id));
    for (const lt of legacyTasks) {
      if (!seen.has(lt._id)) {
        globalTasks.push(lt);
      }
    }
    
    return globalTasks.sort((a, b) => b.createdAt - a.createdAt);
  }
});

export const updateCategory = mutation({
  args: { id: v.id("actionItems"), category: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    
    const item = await ctx.db.get(args.id);
    if (!item) throw new Error("Not found");
    
    await ctx.db.patch(args.id, { category: args.category });
  }
});

export const toggleComplete = mutation({
  args: { id: v.id("actionItems") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    
    const item = await ctx.db.get(args.id);
    if (!item) throw new Error("Not found");
    
    await ctx.db.patch(args.id, { isCompleted: !item.isCompleted });
  }
});

export const remove = mutation({
  args: { id: v.id("actionItems") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    
    await ctx.db.delete(args.id);
  }
});
