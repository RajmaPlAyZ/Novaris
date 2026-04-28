import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  documents: defineTable({
    title: v.string(),
    userId: v.string(),
    isArchived: v.boolean(),
    parentDocument: v.optional(v.id("documents")),
    content: v.optional(v.string()),
    coverImage: v.optional(v.string()),
    icon: v.optional(v.string()),
    isPublished: v.boolean(),
    order: v.optional(v.number()),
    updatedAt: v.optional(v.number()),
    isFavorite: v.optional(v.boolean()),
    editorFont: v.optional(v.string()),
  })
    .index("by_user", ["userId"])
    .index("by_user_parent", ["userId", "parentDocument"]),

  userSettings: defineTable({
    userId: v.string(),
    editorFont: v.optional(v.string()),
    categories: v.optional(v.array(v.string())),
  }).index("by_user", ["userId"]),

  // Whiteboard storage for collaborative whiteboard feature
  whiteboards: defineTable({
    documentId: v.id("documents"),
    data: v.any(), // Array of whiteboard objects
    updatedAt: v.number(),
  }).index("by_document", ["documentId"]),

  // Action items for AI-generated suggestions and general To-Do tasks
  actionItems: defineTable({
    documentId: v.optional(v.id("documents")),
    userId: v.optional(v.string()),
    title: v.string(),
    description: v.optional(v.string()),
    category: v.optional(v.string()),
    isCompleted: v.boolean(),
    createdAt: v.number(),
  }).index("by_document", ["documentId"]).index("by_user", ["userId"]),
});
