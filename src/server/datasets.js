const { HttpError } = require("./errors");

const DEFAULT_PROJECT_DATA = [
  {
    id: 1,
    name: "AI Customer Service Upgrade",
    tasks: [
      "完成知识库映射字段核对",
      "联调工单分发规则与回流链路",
      "整理灰度测试前置检查项",
    ],
    remark: "优先完成知识库映射和工单分发联调，避免灰度测试窗口继续后移。",
    projectNo: "PT-24001",
    contractNo: "CN-2024-0186",
    level: "V",
    status: "in design",
    progress: 30,
    icon: "sparkles",
    version: 1,
    createdAt: "2024-01-01T00:00:00.000Z",
    updatedAt: "2024-01-01T00:00:00.000Z",
  },
  {
    id: 2,
    name: "Blockchain Traceability Platform",
    tasks: [
      "锁定跨境供应商字段标准",
      "整理数据映射字典",
      "确认追溯链路验收口径",
    ],
    remark: "需要锁定外部供应商字段标准，避免后续链路追溯口径不一致。",
    projectNo: "PT-24007",
    contractNo: "CN-2024-0241",
    level: "R",
    status: "installing",
    progress: 60,
    icon: "network",
    version: 1,
    createdAt: "2024-03-01T00:00:00.000Z",
    updatedAt: "2024-03-01T00:00:00.000Z",
  },
  {
    id: 3,
    name: "Mobile App 3.0 Redesign",
    tasks: [
      "完成验收问题清单关闭",
      "输出设计系统沉淀文档",
      "同步后续产品复用范围",
    ],
    remark: "已进入验收收尾阶段，建议将设计系统沉淀为后续产品共用资产。",
    projectNo: "PT-23019",
    contractNo: "CN-2023-1138",
    level: "N",
    status: "finished",
    progress: 100,
    icon: "smartphone",
    version: 1,
    createdAt: "2023-11-01T00:00:00.000Z",
    updatedAt: "2024-03-01T00:00:00.000Z",
  },
  {
    id: 4,
    name: "Next-Gen ERP Refactoring",
    tasks: [
      "推进剩余模块拆分",
      "梳理历史流程迁移回退方案",
      "补齐业务中断风险检查表",
    ],
    remark: "模块拆分已经完成一半，下一阶段重点是降低历史流程迁移的业务中断风险。",
    projectNo: "PT-24003",
    contractNo: "CN-2024-0204",
    level: "K",
    status: "installing",
    progress: 45,
    icon: "blocks",
    version: 1,
    createdAt: "2024-02-01T00:00:00.000Z",
    updatedAt: "2024-02-01T00:00:00.000Z",
  },
  {
    id: 5,
    name: "Smart City Data Platform",
    tasks: [
      "完成核心指标看板锁版",
      "确认管理端验收窗口",
      "补齐传感器 KPI 数据校验",
    ],
    remark: "建议本周完成核心指标看板锁版，确保月底前给管理端留出验收窗口。",
    projectNo: "PT-24011",
    contractNo: "CN-2024-0312",
    level: "V",
    status: "installed",
    progress: 75,
    icon: "building-2",
    version: 1,
    createdAt: "2024-01-15T00:00:00.000Z",
    updatedAt: "2024-01-15T00:00:00.000Z",
  },
];

const DEFAULT_TASK_DATA = [
  {
    id: 101,
    projectId: 1,
    projectName: "AI Customer Service Upgrade",
    projectNo: "PT-24001",
    contractNo: "CN-2024-0186",
    projectLevel: "V",
    projectStatus: "in design",
    title: "完成知识库映射字段核对",
    owner: "Lena",
    status: "doing",
    dueDate: "2024-04-12",
    note: "等待客服侧补齐旧字段命名对照。",
  },
  {
    id: 102,
    projectId: 1,
    projectName: "AI Customer Service Upgrade",
    projectNo: "PT-24001",
    contractNo: "CN-2024-0186",
    projectLevel: "V",
    projectStatus: "in design",
    title: "联调工单分发规则与回流链路",
    owner: "Mason",
    status: "todo",
    dueDate: "2024-04-15",
    note: "优先覆盖高频投诉工单类型。",
  },
  {
    id: 103,
    projectId: 1,
    projectName: "AI Customer Service Upgrade",
    projectNo: "PT-24001",
    contractNo: "CN-2024-0186",
    projectLevel: "V",
    projectStatus: "in design",
    title: "整理灰度测试前置检查项",
    owner: "Ava",
    status: "done",
    dueDate: "2024-04-10",
    note: "测试入口和回滚预案已同步。",
  },
  {
    id: 201,
    projectId: 2,
    projectName: "Blockchain Traceability Platform",
    projectNo: "PT-24007",
    contractNo: "CN-2024-0241",
    projectLevel: "R",
    projectStatus: "installing",
    title: "锁定跨境供应商字段标准",
    owner: "Iris",
    status: "doing",
    dueDate: "2024-04-22",
    note: "还差欧洲供应商编码规则确认。",
  },
  {
    id: 202,
    projectId: 2,
    projectName: "Blockchain Traceability Platform",
    projectNo: "PT-24007",
    contractNo: "CN-2024-0241",
    projectLevel: "R",
    projectStatus: "installing",
    title: "整理数据映射字典",
    owner: "Noah",
    status: "todo",
    dueDate: "2024-04-25",
    note: "等待供应商字段标准冻结后输出。",
  },
  {
    id: 203,
    projectId: 2,
    projectName: "Blockchain Traceability Platform",
    projectNo: "PT-24007",
    contractNo: "CN-2024-0241",
    projectLevel: "R",
    projectStatus: "installing",
    title: "确认追溯链路验收口径",
    owner: "Emma",
    status: "todo",
    dueDate: "2024-04-28",
    note: "法务与质量团队联合确认。",
  },
  {
    id: 301,
    projectId: 3,
    projectName: "Mobile App 3.0 Redesign",
    projectNo: "PT-23019",
    contractNo: "CN-2023-1138",
    projectLevel: "N",
    projectStatus: "finished",
    title: "完成验收问题清单关闭",
    owner: "Olivia",
    status: "done",
    dueDate: "2024-03-01",
    note: "所有高优先级问题已关闭。",
  },
  {
    id: 302,
    projectId: 3,
    projectName: "Mobile App 3.0 Redesign",
    projectNo: "PT-23019",
    contractNo: "CN-2023-1138",
    projectLevel: "N",
    projectStatus: "finished",
    title: "输出设计系统沉淀文档",
    owner: "Ethan",
    status: "doing",
    dueDate: "2024-03-03",
    note: "组件用法和 token 定义待补充。",
  },
  {
    id: 303,
    projectId: 3,
    projectName: "Mobile App 3.0 Redesign",
    projectNo: "PT-23019",
    contractNo: "CN-2023-1138",
    projectLevel: "N",
    projectStatus: "finished",
    title: "同步后续产品复用范围",
    owner: "Sophia",
    status: "todo",
    dueDate: "2024-03-05",
    note: "等文档首版后安排跨产品同步。",
  },
  {
    id: 401,
    projectId: 4,
    projectName: "Next-Gen ERP Refactoring",
    projectNo: "PT-24003",
    contractNo: "CN-2024-0204",
    projectLevel: "K",
    projectStatus: "installing",
    title: "推进剩余模块拆分",
    owner: "Leo",
    status: "doing",
    dueDate: "2024-05-06",
    note: "当前卡在审批流模块边界定义。",
  },
  {
    id: 402,
    projectId: 4,
    projectName: "Next-Gen ERP Refactoring",
    projectNo: "PT-24003",
    contractNo: "CN-2024-0204",
    projectLevel: "K",
    projectStatus: "installing",
    title: "梳理历史流程迁移回退方案",
    owner: "Mia",
    status: "todo",
    dueDate: "2024-05-08",
    note: "回退窗口需要业务侧签字。",
  },
  {
    id: 403,
    projectId: 4,
    projectName: "Next-Gen ERP Refactoring",
    projectNo: "PT-24003",
    contractNo: "CN-2024-0204",
    projectLevel: "K",
    projectStatus: "installing",
    title: "补齐业务中断风险检查表",
    owner: "Henry",
    status: "todo",
    dueDate: "2024-05-10",
    note: "待补仓储和财务相关场景。",
  },
  {
    id: 501,
    projectId: 5,
    projectName: "Smart City Data Platform",
    projectNo: "PT-24011",
    contractNo: "CN-2024-0312",
    projectLevel: "V",
    projectStatus: "installed",
    title: "完成核心指标看板锁版",
    owner: "Grace",
    status: "doing",
    dueDate: "2024-04-18",
    note: "剩余城市运行指标颜色待确认。",
  },
  {
    id: 502,
    projectId: 5,
    projectName: "Smart City Data Platform",
    projectNo: "PT-24011",
    contractNo: "CN-2024-0312",
    projectLevel: "V",
    projectStatus: "installed",
    title: "确认管理端验收窗口",
    owner: "Jack",
    status: "todo",
    dueDate: "2024-04-20",
    note: "预计月底前给出正式窗口。",
  },
  {
    id: 503,
    projectId: 5,
    projectName: "Smart City Data Platform",
    projectNo: "PT-24011",
    contractNo: "CN-2024-0312",
    projectLevel: "V",
    projectStatus: "installed",
    title: "补齐传感器 KPI 数据校验",
    owner: "Chloe",
    status: "done",
    dueDate: "2024-04-15",
    note: "异常值校验规则已并入采集脚本。",
  },
];

const PROJECT_FIELDS = [
  "id",
  "name",
  "tasks",
  "remark",
  "projectNo",
  "contractNo",
  "level",
  "status",
  "progress",
  "icon",
  "version",
  "createdAt",
  "updatedAt",
];

function isIsoDateTime(value) {
  return typeof value === "string" && !Number.isNaN(Date.parse(value));
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

    if (!Number.isInteger(project.id)) {
      throw new Error(`projectData[${index}].id must be an integer.`);
    }

    if (typeof project.name !== "string" || !project.name.trim()) {
      throw new Error(`projectData[${index}].name must be a non-empty string.`);
    }

    if (typeof project.projectNo !== "string") {
      throw new Error(`projectData[${index}].projectNo must be a string.`);
    }

    if (typeof project.contractNo !== "string") {
      throw new Error(`projectData[${index}].contractNo must be a string.`);
    }

    if (!Array.isArray(project.tasks) || project.tasks.some((task) => typeof task !== "string")) {
      throw new Error(`projectData[${index}].tasks must be an array of strings.`);
    }

    if (typeof project.remark !== "string") {
      throw new Error(`projectData[${index}].remark must be a string.`);
    }

    if (typeof project.level !== "string") {
      throw new Error(`projectData[${index}].level must be a string.`);
    }

    if (project.level.trim() && !["V", "K", "R", "N"].includes(project.level.trim())) {
      throw new Error(`projectData[${index}].level must be one of V, K, R, N when provided.`);
    }

    if (typeof project.status !== "string") {
      throw new Error(`projectData[${index}].status must be a string.`);
    }

    if (
      project.status.trim() &&
      !["in design", "installing", "installed", "finished"].includes(project.status.trim())
    ) {
      throw new Error(
        `projectData[${index}].status must be one of in design, installing, installed, finished when provided.`
      );
    }

    if (!Number.isInteger(project.progress) || project.progress < 0 || project.progress > 100) {
      throw new Error(`projectData[${index}].progress must be an integer between 0 and 100.`);
    }

    if (!Number.isInteger(project.version) || project.version < 1) {
      throw new Error(`projectData[${index}].version must be an integer greater than 0.`);
    }

    if (!isIsoDateTime(project.createdAt)) {
      throw new Error(`projectData[${index}].createdAt must be a valid ISO datetime string.`);
    }

    if (!isIsoDateTime(project.updatedAt)) {
      throw new Error(`projectData[${index}].updatedAt must be a valid ISO datetime string.`);
    }
  });
}

function validateTaskData(list) {
  if (!Array.isArray(list)) {
    throw new Error("taskData must be an array.");
  }

  list.forEach((task, index) => {
    if (typeof task !== "object" || task === null || Array.isArray(task)) {
      throw new Error(`taskData[${index}] must be an object.`);
    }

    if (!Number.isInteger(task.id)) {
      throw new Error(`taskData[${index}].id must be an integer.`);
    }

    if (!Number.isInteger(task.projectId)) {
      throw new Error(`taskData[${index}].projectId must be an integer.`);
    }

    if (typeof task.projectName !== "string" || !task.projectName.trim()) {
      throw new Error(`taskData[${index}].projectName must be a non-empty string.`);
    }

    if (typeof task.projectNo !== "string") {
      throw new Error(`taskData[${index}].projectNo must be a string.`);
    }

    if (typeof task.contractNo !== "string") {
      throw new Error(`taskData[${index}].contractNo must be a string.`);
    }

    if (typeof task.projectLevel !== "string") {
      throw new Error(`taskData[${index}].projectLevel must be a string.`);
    }

    if (task.projectLevel.trim() && !["V", "K", "R", "N"].includes(task.projectLevel.trim())) {
      throw new Error(`taskData[${index}].projectLevel must be one of V, K, R, N when provided.`);
    }

    if (typeof task.projectStatus !== "string") {
      throw new Error(`taskData[${index}].projectStatus must be a string.`);
    }

    if (
      task.projectStatus.trim() &&
      !["in design", "installing", "installed", "finished"].includes(task.projectStatus.trim())
    ) {
      throw new Error(
        `taskData[${index}].projectStatus must be one of in design, installing, installed, finished when provided.`
      );
    }

    if (typeof task.title !== "string" || !task.title.trim()) {
      throw new Error(`taskData[${index}].title must be a non-empty string.`);
    }

    if (typeof task.owner !== "string") {
      throw new Error(`taskData[${index}].owner must be a string.`);
    }

    if (!["todo", "doing", "done"].includes(task.status)) {
      throw new Error(`taskData[${index}].status must be todo, doing, or done.`);
    }

    if (typeof task.dueDate !== "string") {
      throw new Error(`taskData[${index}].dueDate must be a string.`);
    }

    if (typeof task.note !== "string") {
      throw new Error(`taskData[${index}].note must be a string.`);
    }
  });
}

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
    defaultValue: () => DEFAULT_TASK_DATA.map((task) => ({ ...task })),
    validate: validateTaskData,
  },
};

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

function validateDatasetPayload(datasetKey, value) {
  const { validate } = getDatasetConfig(datasetKey);

  try {
    validate(value, datasetKey);
  } catch (error) {
    throw new HttpError(400, error.message);
  }
}

module.exports = {
  DATASET_CONFIG,
  getDatasetConfig,
  resolveDatasetKey,
  validateDatasetPayload,
};
