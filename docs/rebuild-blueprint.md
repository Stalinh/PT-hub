# PT Hub Rebuild Blueprint

## Goal

Rebuild PT Hub into a maintainable business system without any regression in the current prototype's visual appearance or user interaction behavior.

This means:

- the current prototype remains the visual and interaction baseline
- implementation is allowed to change completely
- user-visible layout, styling, motion, and interaction flow must remain equivalent

## Non-Negotiable Constraint

Prototype fidelity is a release gate.

No rebuild milestone is acceptable if it changes:

- layout structure
- spacing, sizing, radius, borders, shadows, colors
- interactive flow
- visible wording placement
- control states and feedback timing
- sidebar collapse behavior
- project table behavior
- detail panel synchronization
- `+NEW` interaction
- `Read mode / Edit mode` behavior

See [prototype-invariants.md](/Users/comptonh/Desktop/pt-hub/docs/prototype-invariants.md).

## Target Architecture

```text
pt-hub/
  src/
    server/
      config.js
      errors.js
      datasets.js
      repository.js
      http.js
      static.js
      api.js
      app.js
    web/
      constants.js
      dom.js
      storage.js
      utils.js
      main.js
  docs/
  data/
```

## Runtime Stack

- browser-native ES modules on the frontend
- Node.js HTTP server on the backend
- JSON files as the only persistence layer

## Design Rule For The Web Rebuild

The frontend migration is not a redesign.

Use componentization to preserve the prototype, not to reinterpret it. Keep the current CSS values, state names, and interaction sequencing unless there is a concrete compatibility reason to change internals.

## Domain Modules

### 1. Projects

Core entity. Owns project master data and project lifecycle state.

### 2. Tasks

Tracks project execution items, assignees, due dates, and progress.

### 3. Deliveries

Tracks milestones, delivery checkpoints, acceptance state, and schedule.

### 4. Dashboards

Aggregated read models and metrics derived from projects, tasks, and deliveries.

### 5. Archives

Closed or archived projects and their historical records.

### 6. Users / Roles

Authentication, authorization, ownership, and access control, if and when the product introduces them. This stays optional until the product scope requires it.

### 7. Audit Logs

Every write operation on business entities should eventually emit an auditable event. For the current pure-JSON architecture, this starts with file snapshots in `data/old/` and can later grow into structured audit logs.

## Layering Rules

### Web

- pages compose domain components
- browser modules do not mix local storage helpers, DOM references, and business rendering in one file
- styling tokens are preserved from the prototype
- local UI state is separated from server-backed data

### API

- route handling: HTTP transport only
- repository: JSON persistence only
- validators: request and dataset validation
- no route handler should contain inline file-system business logic

## Delivery Plan

### Milestone 1: Freeze Prototype Baseline

Deliverables:

- prototype invariant checklist
- baseline screenshots
- viewport matrix
- critical interaction states list

Exit criteria:

- visual baseline approved
- protected interactions enumerated

### Milestone 2: Static Web Rebuild

Deliverables:

- new web app shell
- componentized layout
- static data rendering
- screenshot parity against prototype

Exit criteria:

- dashboard, projects, tasks, delivery, archive, and test page render equivalently

### Milestone 3: Projects Vertical Slice

Deliverables:

- JSON-backed `projects` contract
- `projects` API behavior
- project list and detail loading
- create, update, delete project
- file snapshot archiving for project writes

Exit criteria:

- current prototype project behaviors fully work through the new backend

### Milestone 4: Tasks And Delivery

Deliverables:

- task and delivery schema
- task and delivery APIs
- UI modules wired to real data

### Milestone 5: Archive, Dashboard, Roles

Deliverables:

- archive flows
- dashboard read models
- roles and permissions
- user identity binding

### Milestone 6: Hardening

Deliverables:

- test coverage
- observability
- backup and restore
- deployment workflow
- retention and restore scripts for JSON archives

## Testing Strategy

### Visual Regression

Required for:

- sidebar expanded
- sidebar collapsed
- projects page in read mode
- projects page in edit mode
- `+NEW` opened
- inline editing active
- floating choice menu visible
- detail panel populated

Suggested baseline viewports:

- 1440x900
- 1280x800

### API Tests

Required for:

- project create
- project update
- project delete
- validation failures
- write serialization behavior
- archive snapshot creation

### E2E Tests

Required for:

- open page and load projects
- select project and verify detail panel sync
- edit project field and persist
- create project
- delete project
- switch navigation views

## Data Migration Path

1. Keep current JSON-backed prototype as the source of truth.
2. Refactor backend internals behind the same API surface.
3. Refactor frontend internals behind the same UI surface.
4. Keep parity checks until the modularized code fully replaces the legacy single-file structure.

## Immediate Build Order

1. Split backend into JSON-oriented modules under `src/server/`
2. Split frontend into browser modules under `src/web/`
3. Preserve the current API surface and current UI
4. Add JSON validation and write-serialization tests
5. Add Playwright screenshot baseline tests
