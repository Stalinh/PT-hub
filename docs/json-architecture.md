# PT Hub JSON Architecture

## Goal

Keep JSON as the only persistence layer while making the system maintainable for long-term single-instance internal use.

This is not a database replacement. It is a disciplined file-backed architecture with explicit limits.

## Intended Operating Envelope

Suitable for:

- single deployed instance
- internal team use
- low write concurrency
- moderate data volume
- explicit backup and recovery workflows

Not suitable for:

- distributed writers
- high-concurrency edits
- large analytical querying workloads
- multi-node active-active deployments

## Storage Layout

```text
data/
  project_data.json
  task_data.json
  old/
runtime/
  locks/
backups/
```

## Storage Rules

### 1. Fixed Dataset Contracts

Each dataset must have:

- one file name
- one top-level JSON object
- one required root field matching the dataset key
- one validation function

### 2. Atomic Writes

Every write must:

1. validate payload
2. snapshot current file into `data/old/`
3. write a temporary file
4. rename temporary file into place

### 3. Serialized Writes

Writes for the same dataset must execute in sequence.

The application should never perform overlapping writes to the same JSON file. This protects against partial overwrite races in a single Node.js process.

### 4. Startup Validation

At startup:

- ensure all dataset files exist
- validate all dataset JSON
- fail fast if a file is malformed

### 5. Recovery Model

If a dataset becomes unreadable:

- reject writes
- surface explicit error to operators
- recover from the latest archived snapshot

## Backend Module Structure

```text
src/server/
  config.js
  errors.js
  datasets.js
  repository.js
  http.js
  static.js
  api.js
  app.js
```

## Frontend Module Structure

```text
src/web/
  constants.js
  dom.js
  storage.js
  utils.js
  main.js
```

## Data Integrity Practices

### Validation

Validate on both:

- read
- write

For `projectData`, validate:

- required fields
- value shape
- enum fields
- array root type

### Archiving

Keep every overwritten snapshot in `data/old/`.

Future enhancement:

- retention policy
- restore CLI script
- periodic compressed backups

### Versioning

Recommended next step:

- add `version`, `createdAt`, and `updatedAt` to project records
- reject stale updates from clients

This is not required for the first refactor pass, but it should be the next hardening step for JSON-based persistence.

## API Shape

The current API style remains valid:

- `GET /api/project-data`
- `PUT /api/project-data`
- `GET /api/task-data`
- `PUT /api/task-data`

This preserves prototype behavior while allowing the backend internals to become maintainable.
