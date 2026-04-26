# PT Hub Projects API Draft

## API Principles

- preserve current prototype behavior and field names at the web boundary where practical
- validate all request and response payloads
- return stable ids
- reject invalid writes explicitly
- preserve compatibility with JSON-backed storage

## Resource Shape

```json
{
  "id": "0c2ed3d7-2f95-4f6d-8be0-3a4559cb9cb3",
  "name": "AI Customer Service Upgrade",
  "summary": "Customer service project for omnichannel automation rollout",
  "focus": "优先完成知识库映射和工单分发联调，避免灰度测试窗口继续后移。",
  "projectNo": "PT-24001",
  "contractNo": "CN-2024-0186",
  "level": "V",
  "status": "in design",
  "progress": 30,
  "startDate": "2024-01-01",
  "endDate": "2024-04-15",
  "icon": "sparkles"
}
```

## Endpoints

### `GET /api/projects`

List projects for the overview table.

Response:

```json
{
  "projectData": []
}
```

### `PUT /api/project-data`

Replace the current project dataset with a validated new list.

Request:

```json
{
  "projectData": []
}
```

Rules:

- request body must be a JSON object
- `projectData` must exist
- `projectData` must be an array
- every project record must include the required project fields

## Validation Rules

### `level`

Allowed:

- `V`
- `K`
- `R`
- `N`

### `status`

Allowed at API boundary:

- `in design`
- `installing`
- `installed`
- `finished`

### `progress`

- integer
- minimum `0`
- maximum `100`

### `project records`

Required fields:

- `id`
- `name`
- `summary`
- `focus`
- `projectNo`
- `contractNo`
- `level`
- `status`
- `progress`
- `startDate`
- `endDate`
- `icon`

## Error Shape

```json
{
  "error": {
    "code": "validation_failed",
    "message": "progress must be between 0 and 100",
    "details": [
      {
        "field": "progress",
        "message": "must be between 0 and 100"
      }
    ]
  }
}
```

## Archive Requirements

Every write must:

- validate the incoming dataset
- archive the existing JSON file into `data/old/`
- write the new dataset atomically

## Compatibility Phase

The API surface should remain stable while the backend internals move from a single-file server implementation to modular JSON repositories and validators.
