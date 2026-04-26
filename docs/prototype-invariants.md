# PT Hub Prototype Invariants

## Purpose

This file defines the parts of the current prototype that must not regress during the rebuild.

The implementation may change. The user-facing result may not.

## Global Rules

- no visual redesign
- no replacement with default component-library styling
- no spacing drift
- no typography drift
- no interaction path changes without explicit approval
- no control removal
- no state feedback delay changes that alter perceived interaction rhythm

## Layout Invariants

### Sidebar

Must preserve:

- expanded width behavior
- collapsed width behavior
- toggle placement
- toggle rotation behavior
- icon-only collapsed navigation treatment
- brand block appearance in expanded and collapsed states

Reference files:

- [index.html](/Users/comptonh/Desktop/pt-hub/index.html)
- [styles.css](/Users/comptonh/Desktop/pt-hub/styles.css)

### Workspace

Must preserve:

- content spacing from sidebar
- page header spacing
- page section order
- dashboard band layout
- projects page split between table and detail panel

## Projects Page Invariants

### Header

Must preserve:

- `Project Overview` heading placement
- data status pill position and appearance
- loading, saving, saved, and error visual states

### Mode Switch

Must preserve:

- `Read mode` and `Edit mode` labels
- active/inactive button appearance
- switching behavior

### `+NEW` Island

Must preserve:

- collapsed appearance
- expansion behavior
- input placement
- confirm and close button arrangement
- open and close timing
- outside click close behavior
- escape close behavior

### Project Table

Must preserve:

- column order
- row selection behavior
- copy button placement
- delete button placement
- selected row highlight
- inline editing behavior in edit mode
- non-editable read mode behavior

Column order must remain:

1. Project
2. Level
3. Status
4. Progress
5. Project No
6. Contract No
7. Delete

### Choice Editing

Must preserve:

- floating choice menu positioning pattern
- level/status pill appearance
- click-to-open behavior
- outside click close behavior

### Progress Editing

Must preserve:

- progress track appearance
- percent text alignment
- inline numeric editing in edit mode

### Detail Panel

Must preserve:

- position on the right side of the projects page
- dark panel treatment
- title, summary, progress, schedule, focus hierarchy
- row selection to detail sync behavior

## Dashboard Page Invariants

Must preserve:

- hero layout
- summary strip
- overview side cards
- current card composition and visual hierarchy

## Placeholder Pages

Tasks, Delivery, Archive, and Test pages may gain real data later, but until product-level approval they must keep their current visible composition and labels.

## Visual Regression Matrix

The following states must have screenshot coverage:

1. dashboard default state
2. projects read mode
3. projects edit mode
4. projects sidebar collapsed
5. projects new island open
6. projects level menu open
7. projects progress editing active
8. projects detail panel with selected row
9. tasks page
10. delivery page
11. archive page
12. test page

## Acceptance Rule

If a reviewer can tell the rebuilt screen apart from the current prototype without using devtools or source inspection, it does not pass.

