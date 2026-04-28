# Project UI Redesign Guide

This guide documents the full UI polish pass across the landing pages and the authenticated workspace.

## Goals

- Make the interface cleaner and easier to scan.
- Improve visual consistency between landing and app shells.
- Remove rough edges (encoding artifacts, spacing inconsistencies, layout math issues).
- Preserve existing product behavior while improving usability.

## Updated Areas

## Landing Experience

Files:

- `app/(landing)/page.tsx`
- `app/(landing)/_components/Heading.tsx`
- `app/(landing)/_components/Navbar.tsx`
- `app/(landing)/_components/Heroes.tsx`
- `app/(landing)/_components/Footer.tsx`

Changes:

- Added a subtle gradient and radial glow to the landing background.
- Rewrote headline/subheadline copy for clarity and cleaner typography.
- Improved CTA hierarchy:
  - Primary: `Get Novaris Free`
  - Secondary: `Log In`
- Updated navbar to glass-style sticky behavior with cleaner spacing.
- Refined hero illustration blocks with bordered cards and better depth.
- Footer upgraded with consistent links and responsive action layout.

## Main Workspace Shell

Files:

- `app/(main)/layout.tsx`
- `app/(main)/_components/Navigation.tsx`
- `app/(main)/_components/Navbar.tsx`
- `app/(main)/_components/UserItem.tsx`
- `app/(main)/_components/Item.tsx`
- `app/(main)/_components/RightSidebar.tsx`

Changes:

- Added subtle app-shell gradient for depth while keeping a productivity look.
- Fixed sidebar width math bug:
  - From broken `calc(100%-240px)` to valid `calc(100% - 272px)`.
- Increased sidebar default width from `240px` to `272px` for better readability.
- Improved sidebar visual hierarchy:
  - grouped actions
  - clearer section labels
  - better spacing and borders
- Updated top document navbar to consistent glass/border styling.
- Refined navigation row item styling for cleaner active/hover states.
- Improved user profile row affordance and spacing.
- Rebuilt right sidebar (planner/tasks panel) with:
  - cleaner layout
  - corrected text encoding
  - category + task controls with consistent inputs/buttons
  - responsive visibility (`xl` and above)

## Whiteboard Context

Whiteboard itself was already upgraded in the previous pass and remains compatible with this redesign.
Its detailed behavior and shortcuts are documented separately:

- `docs/WHITEBOARD_UI_GUIDE.md`

## UI System Notes

## Visual Principles Applied

- High-contrast structure with restrained accents.
- Fewer heavy borders; more subtle depth through gradients and backdrop blur.
- Compact but readable spacing for frequent workflows.
- Icons used where they increase scannability without adding noise.

## Interaction Principles Applied

- Keep primary actions close to where decisions happen.
- Use explicit labels for navigation and grouped controls.
- Make hover/active states meaningful and consistent.
- Preserve keyboard shortcuts and fast workflows.

## Production Readiness Checklist

1. Type checks:
   - `npm run lint` (currently configured as `tsc --noEmit`)
2. Production build:
   - `npm run build`
3. Manual smoke test:
   - Landing page (desktop + mobile)
   - Authentication flow entry points
   - Sidebar resize/collapse/expand
   - Document navigation, favorites, trash popover
   - Right sidebar task create/toggle/delete
   - Whiteboard tab open and controls

## Future Enhancements

1. Add true flat-config ESLint migration for full rule-based linting.
2. Add component-level visual regression snapshots for critical screens.
3. Introduce a small shared design token map for spacing/elevation levels.
