const http = require("http");
const fs = require("fs/promises");
const path = require("path");

const PORT = Number.parseInt(process.env.PORT || "4173", 10);
const HOST = process.env.HOST || "127.0.0.1";
const ROOT_DIR = __dirname;
const DATA_DIR = path.join(ROOT_DIR, "data");
const ARCHIVE_DIR = path.join(DATA_DIR, "old");
const DEFAULT_PROJECT_DATA = [
  {
    id: 1,
    name: "AI Customer Service Upgrade",
    summary: "Customer service project for omnichannel automation rollout",
    focus: "优先完成知识库映射和工单分发联调，避免灰度测试窗口继续后移。",
    projectNo: "PT-24001",
    contractNo: "CN-2024-0186",
    level: "V",
    status: "in design",
    progress: 30,
    startDate: "2024-01-01",
    endDate: "2024-04-15",
    icon: "sparkles",
  },
  {
    id: 2,
    name: "Blockchain Traceability Platform",
    summary: "Traceability project for cross-border supplier data integration",
    focus: "需要锁定外部供应商字段标准，避免后续链路追溯口径不一致。",
    projectNo: "PT-24007",
    contractNo: "CN-2024-0241",
    level: "R",
    status: "installing",
    progress: 60,
    startDate: "2024-03-01",
    endDate: "2024-09-30",
    icon: "network",
  },
  {
    id: 3,
    name: "Mobile App 3.0 Redesign",
    summary: "App redesign project for membership and checkout experience",
    focus: "已进入验收收尾阶段，建议将设计系统沉淀为后续产品共用资产。",
    projectNo: "PT-23019",
    contractNo: "CN-2023-1138",
    level: "N",
    status: "finished",
    progress: 100,
    startDate: "2023-11-01",
    endDate: "2024-03-01",
    icon: "smartphone",
  },
  {
    id: 4,
    name: "Next-Gen ERP Refactoring",
    summary: "ERP refactoring project for workflow migration and modularization",
    focus: "模块拆分已经完成一半，下一阶段重点是降低历史流程迁移的业务中断风险。",
    projectNo: "PT-24003",
    contractNo: "CN-2024-0204",
    level: "K",
    status: "installing",
    progress: 45,
    startDate: "2024-02-01",
    endDate: "2024-12-31",
    icon: "blocks",
  },
  {
    id: 5,
    name: "Smart City Data Platform",
    summary: "Data platform project for sensor streams and KPI dashboards",
    focus: "建议本周完成核心指标看板锁版，确保月底前给管理端留出验收窗口。",
    projectNo: "PT-24011",
    contractNo: "CN-2024-0312",
    level: "V",
    status: "installed",
    progress: 75,
    startDate: "2024-01-15",
    endDate: "2024-06-30",
    icon: "building-2",
  },
];
const PROJECT_FIELDS = [
  "id",
  "name",
  "summary",
  "focus",
  "projectNo",
  "contractNo",
  "level",
  "status",
  "progress",
  "startDate",
  "endDate",
  "icon",
];
const DATASET_CONFIG = {
  projectData: {
    route: "/api/project-data",
    fileName: "project_data.json",
    defaultValue: () => DEFAULT_PROJECT_DATA.map((project) => ({ ...project })),
    validate: validateProjectData,
  },
  taskData: {
    route: "/api/task-data",
    fileName: "task_data.json",
    defaultValue: () => [],
    validate: validateArrayDataset,
  },
  dashboardData: {
    route: "/api/dashboard-data",
    fileName: "dashboard_data.json",
    defaultValue: () => [],
    validate: validateArrayDataset,
  },
};
const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
};

class HttpError extends Error {
  constructor(statusCode, message) {
    super(message);
    this.statusCode = statusCode;
  }
}

function validateProjectData(list) {
  if (!Array.isArray(list)) {
    throw new Error("projectData must be an array.");
  }

  list.forEach((project, index) => {
    if (typeof project !== "object" || project === null || Array.isArray(project)) {
      throw new Error(`projectData[${index}] must be an object.`);
    }

    PROJECT_FIELDS.forEach((field) => {
      if (!(field in project)) {
        throw new Error(`projectData[${index}] is missing required field "${field}".`);
      }
    });
  });
}

function validateArrayDataset(list, datasetKey) {
  if (!Array.isArray(list)) {
    throw new Error(`${datasetKey} must be an array.`);
  }
}

function timestampForArchive(date = new Date()) {
  const parts = [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
    "-",
    String(date.getHours()).padStart(2, "0"),
    String(date.getMinutes()).padStart(2, "0"),
    String(date.getSeconds()).padStart(2, "0"),
    "-",
    String(date.getMilliseconds()).padStart(3, "0"),
  ];

  return parts.join("");
}

function datasetParamToKey(datasetParam) {
  if (!/^[a-z0-9-]+$/.test(datasetParam)) return null;

  return datasetParam
    .split("-")
    .filter(Boolean)
    .map((segment, index) =>
      index === 0 ? segment : `${segment[0].toUpperCase()}${segment.slice(1)}`
    )
    .join("");
}

function getDatasetConfig(datasetKey) {
  const config = DATASET_CONFIG[datasetKey];
  if (!config) {
    throw new HttpError(404, "Unknown dataset.");
  }

  return config;
}

function getDatasetFilePath(datasetKey) {
  return path.join(DATA_DIR, getDatasetConfig(datasetKey).fileName);
}

async function ensureDataDirs() {
  await fs.mkdir(ARCHIVE_DIR, { recursive: true });
}

async function writeDatasetAtomically(datasetKey, value) {
  const filePath = getDatasetFilePath(datasetKey);
  const tempFile = `${filePath}.tmp`;
  const serialized = `${JSON.stringify({ [datasetKey]: value }, null, 2)}\n`;

  await fs.writeFile(tempFile, serialized, "utf8");
  await fs.rename(tempFile, filePath);
}

async function archiveDatasetFile(datasetKey) {
  const { fileName } = getDatasetConfig(datasetKey);
  const filePath = getDatasetFilePath(datasetKey);

  try {
    await fs.access(filePath);
  } catch (_error) {
    return;
  }

  const baseName = fileName.replace(/\.json$/i, "");
  const archiveName = `${baseName}-${timestampForArchive()}.json`;
  await fs.rename(filePath, path.join(ARCHIVE_DIR, archiveName));
}

function validateDatasetPayload(datasetKey, value) {
  const { validate } = getDatasetConfig(datasetKey);

  try {
    validate(value, datasetKey);
  } catch (error) {
    throw new HttpError(400, error.message);
  }
}

async function ensureDatasetFile(datasetKey) {
  const config = getDatasetConfig(datasetKey);
  const filePath = getDatasetFilePath(datasetKey);

  try {
    await fs.access(filePath);
  } catch (_error) {
    await writeDatasetAtomically(datasetKey, config.defaultValue());
  }
}

async function ensureAllDatasetFiles() {
  await ensureDataDirs();
  await Promise.all(Object.keys(DATASET_CONFIG).map((datasetKey) => ensureDatasetFile(datasetKey)));
}

async function readDataset(datasetKey) {
  await ensureDatasetFile(datasetKey);

  const raw = await fs.readFile(getDatasetFilePath(datasetKey), "utf8");
  let parsed;

  try {
    parsed = JSON.parse(raw);
  } catch (_error) {
    throw new HttpError(500, `${getDatasetConfig(datasetKey).fileName} is not valid JSON.`);
  }

  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    throw new HttpError(500, `${getDatasetConfig(datasetKey).fileName} must contain a JSON object.`);
  }

  if (!(datasetKey in parsed)) {
    throw new HttpError(
      500,
      `${getDatasetConfig(datasetKey).fileName} must contain the "${datasetKey}" field.`
    );
  }

  validateDatasetPayload(datasetKey, parsed[datasetKey]);
  return parsed[datasetKey];
}

async function updateDataset(datasetKey, nextValue) {
  validateDatasetPayload(datasetKey, nextValue);
  await ensureDatasetFile(datasetKey);
  await archiveDatasetFile(datasetKey);
  await writeDatasetAtomically(datasetKey, nextValue);
  return nextValue;
}

async function readRequestBody(req) {
  const chunks = [];

  for await (const chunk of req) {
    chunks.push(chunk);
  }

  const body = Buffer.concat(chunks).toString("utf8");
  if (!body) return {};

  try {
    return JSON.parse(body);
  } catch (_error) {
    throw new HttpError(400, "Request body must be valid JSON.");
  }
}

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
  });
  res.end(`${JSON.stringify(payload, null, 2)}\n`);
}

async function serveStaticFile(res, pathname) {
  const requestedPath = pathname === "/" ? "/index.html" : pathname;
  const normalizedPath = path
    .normalize(requestedPath)
    .replace(/^(\.\.[/\\])+/, "")
    .replace(/^[/\\]+/, "");
  const filePath = path.resolve(ROOT_DIR, normalizedPath);

  if (!filePath.startsWith(ROOT_DIR)) {
    sendJson(res, 403, { error: "Forbidden" });
    return;
  }

  try {
    const content = await fs.readFile(filePath);
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, {
      "Content-Type": MIME_TYPES[ext] || "application/octet-stream",
      "Cache-Control": "no-store",
    });
    res.end(content);
  } catch (error) {
    if (error.code === "ENOENT") {
      sendJson(res, 404, { error: "Not found" });
      return;
    }

    sendJson(res, 500, { error: "Failed to read static file." });
  }
}

function resolveDatasetKey(pathname) {
  for (const [datasetKey, config] of Object.entries(DATASET_CONFIG)) {
    if (pathname === config.route) {
      return datasetKey;
    }
  }

  const match = pathname.match(/^\/api\/data\/([a-z0-9-]+)$/);
  if (!match) return null;

  const datasetKey = datasetParamToKey(match[1]);
  return DATASET_CONFIG[datasetKey] ? datasetKey : null;
}

async function handleApiRequest(req, res, pathname) {
  const datasetKey = resolveDatasetKey(pathname);
  if (!datasetKey) {
    sendJson(res, 404, { error: "Unknown API route." });
    return;
  }

  if (req.method === "GET") {
    const datasetValue = await readDataset(datasetKey);
    sendJson(res, 200, { [datasetKey]: datasetValue });
    return;
  }

  if (req.method === "PUT") {
    const body = await readRequestBody(req);
    if (typeof body !== "object" || body === null || Array.isArray(body)) {
      throw new HttpError(400, "Request body must be a JSON object.");
    }

    if (!(datasetKey in body)) {
      throw new HttpError(400, `Request body must include "${datasetKey}".`);
    }

    const nextValue = await updateDataset(datasetKey, body[datasetKey]);
    sendJson(res, 200, { [datasetKey]: nextValue });
    return;
  }

  res.setHeader("Allow", "GET, PUT");
  sendJson(res, 405, { error: "Method not allowed." });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || `${HOST}:${PORT}`}`);
  const { pathname } = url;

  try {
    if (pathname.startsWith("/api/")) {
      await handleApiRequest(req, res, pathname);
      return;
    }

    await serveStaticFile(res, pathname);
  } catch (error) {
    sendJson(res, error.statusCode || 500, {
      error: error.message || "Internal server error.",
    });
  }
});

ensureAllDatasetFiles()
  .then(() => {
    server.listen(PORT, HOST, () => {
      console.log(`PT Hub server running at http://${HOST}:${PORT}`);
      console.log(`Data directory: ${DATA_DIR}`);
    });
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
