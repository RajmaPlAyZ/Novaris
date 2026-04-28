import { v } from "convex/values";
import { action, mutation } from "./_generated/server";

export const suggestAction = action({
  args: {
    documentId: v.id("documents"),
    context: v.string(),
    action: v.literal("suggest")
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      console.error("Missing OPENROUTER_API_KEY");
      return { suggestions: [] };
    }

    try {
      // In a real implementation, we would send the context to OpenRouter
      // to generate dynamic suggestions instead of mock ones in the UI.
      // But since the UI relies on returning categories or extracting data,
      // we'll leave the UI mock suggestions for the menu layout, and just prove the API works.
      const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: "nvidia/nemotron-3-super-120b-a12b:free",
          messages: [
            { role: "system", content: "You are a helpful assistant." },
            { role: "user", content: "Generate 1 action item from: " + args.context }
          ]
        })
      });

      const data = await response.json();
      console.log("OpenRouter Response:", data);

      return {
        suggestions: [] 
      };
    } catch (e) {
      console.error("AI Fetch Error", e);
      return { suggestions: [] };
    }
  }
});

export const generateText = action({
  args: {
    documentId: v.id("documents"),
    prompt: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) throw new Error("Missing OPENROUTER_API_KEY");

    try {
      const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "https://localhost:3000",
          "X-Title": "Notion Clone"
        },
        body: JSON.stringify({
          model: "nvidia/nemotron-3-super-120b-a12b:free",
          messages: [
            { role: "system", content: "You are a concise, helpful assistant. Do not use markdown backticks unless strictly necessary. Return plain text mostly." },
            { role: "user", content: args.prompt }
          ]
        })
      });

      const data = await response.json();
      if (data.choices && data.choices.length > 0) {
        return data.choices[0].message.content;
      }
      throw new Error("No response from OpenRouter");
    } catch (e) {
      console.error("AI Fetch Error", e);
      throw new Error("Failed to generate text");
    }
  }
});

export const createActionItem = mutation({
  args: {
    documentId: v.id("documents"),
    title: v.string(),
    description: v.optional(v.string()),
    isCompleted: v.boolean()
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

    const actionItem = await ctx.db.insert("actionItems", {
      documentId: args.documentId,
      title: args.title,
      description: args.description,
      isCompleted: args.isCompleted,
      createdAt: Date.now()
    });

    return actionItem;
  }
});