# Whiteboard UI Guide

This document explains the current whiteboard experience, implementation choices, and production validation workflow.

## What Was Improved

The whiteboard tab is now designed as a full workspace rather than a small embedded canvas.

- Larger board viewport in the document route:
  - Uses `h-[calc(100vh-160px)]` with `min-h-[720px]` for desktop.
- Visual polish:
  - Glass-style floating control panels, improved hierarchy, and clearer active tool indicator.
  - Empty-state guidance when the board has no objects.
- Intuitive controls:
  - Tooltips for all key actions.
  - Dedicated help popover with shortcuts.
  - Current tool label and object count badge.
- Better reliability:
  - Save status indicator.
  - Rollback behavior for erase and clear mutations if network requests fail.
  - Draft handling uses refs to prevent stale pointer-up commits.

## Files You Should Know

- Whiteboard UI and interaction logic:
  - `components/whiteboard/Whiteboard.tsx`
- Whiteboard tab layout in the document page:
  - `app/(main)/(routes)/documents/[documentId]/page.tsx`
- Backend mutations/queries for board data:
  - `convex/whiteboard.ts`

## User Interactions

### Primary Tools

- Pan
- Pen
- Eraser
- Rectangle
- Ellipse

### Mouse and Trackpad

- Draw using the active tool.
- Pan by:
  - choosing Pan tool,
  - middle/right mouse button drag,
  - holding `Alt` and dragging,
  - holding `Space` and dragging.
- Zoom by:
  - `Ctrl/Cmd + Mouse Wheel`,
  - zoom buttons in the lower-left panel.
- Scroll wheel without `Ctrl/Cmd` pans the viewport.

### Keyboard Shortcuts

- `V`: Pan
- `B`: Pen
- `E`: Eraser
- `R`: Rectangle
- `O`: Ellipse
- `F`: Fit content to view
- `Ctrl/Cmd + +`: Zoom in
- `Ctrl/Cmd + -`: Zoom out
- `Ctrl/Cmd + 0`: Reset view
- Hold `Space`: temporary pan mode

## Data and Rendering Model

### Object Types

The canvas stores two object kinds:

- `stroke`
- `shape` (`rect` or `ellipse`)

Each object has a stable `id`. Rendering is camera-based (`x`, `y`, `zoom`) and the board is effectively infinite because objects are stored in world coordinates.

### Persistence

Whiteboard data is stored per document in Convex (`whiteboards` table).

- `getByDocumentId`: fetches objects for current document.
- `addObject`: appends new object with stable id.
- `removeObject`: removes by id and supports legacy object shape.
- `clear`: clears the board for current document.

### Failure Handling

- Erase and clear operations optimistically update local state.
- If mutation fails, state is restored from a snapshot.

## UI Component Structure

Inside `Whiteboard.tsx`:

- Main canvas element with pointer and wheel handlers.
- Top-center tool strip with active tool state.
- Top-left color and stroke-size controls.
- Top-right help popover.
- Bottom-left viewport controls (zoom, reset, fit).
- Bottom-right status row (`Saving`, object count, clear button).

The document page wraps this in tabs and keeps the whiteboard area large enough for practical use.

## Production Validation Checklist

Before release:

1. Run type checks:
   - `npm run lint`
2. Run production build:
   - `npm run build`
3. Manual smoke test:
   - Open a document.
   - Switch to Whiteboard tab.
   - Draw pen strokes, shapes, erase, pan, zoom.
   - Reload and confirm persistence.
   - Clear board and confirm confirm-dialog + expected state.

## Known Constraints

- No undo/redo stack yet.
- No multi-select or object move/resize handles yet.
- Lint script currently gates on TypeScript (`tsc --noEmit`) for stable CI behavior in this dependency set.

## Suggested Next Iteration

If you want parity with tools like Excalidraw/FigJam:

1. Add undo/redo history with keyboard shortcuts (`Ctrl/Cmd+Z`, `Shift+Ctrl/Cmd+Z`).
2. Add selection/move/resize handles for shapes and strokes.
3. Add shape fill toggle and style presets.
4. Add minimap for large canvases.
