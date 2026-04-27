export const defaultProjectData = [
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

export const SIDEBAR_STORAGE_KEY = "pt-hub-sidebar-collapsed";
export const VIEW_STORAGE_KEY = "pt-hub-active-view";
export const TABLE_MODE_STORAGE_KEY = "pt-hub-table-mode";
export const LEVEL_OPTIONS = ["V", "K", "R", "N"];
export const STATUS_OPTIONS = ["in design", "installing", "installed", "finished"];
export const TASK_STATUS_OPTIONS = ["todo", "doing", "done"];
export const PROJECT_DATA_ENDPOINT = "/api/project-data";
export const TASK_DATA_ENDPOINT = "/api/task-data";
