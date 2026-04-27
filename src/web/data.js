import {
  LEVEL_OPTIONS,
  PROJECT_DATA_ENDPOINT,
  STATUS_OPTIONS,
  TASK_DATA_ENDPOINT,
} from "./constants.js";
import { dataStatusDots, dataStatusTexts } from "./dom.js";
import { clampProgress } from "./utils.js";

export function normalizeTaskStatusValue(status) {
  if (status === "Doing" || status === "doing" || status === "in progress") return "doing";
  if (status === "Done" || status === "done") return "done";
  return "todo";
}

export function normalizeProject(item, fallbackId) {
  const now = new Date().toISOString();
  const level = typeof item?.level === "string" ? item.level.trim() : "";
  const status = typeof item?.status === "string" ? item.status.trim() : "";

  return {
    id: Number.isInteger(item?.id) ? item.id : fallbackId,
    name: typeof item?.name === "string" ? item.name : `Project ${fallbackId}`,
    tasks: Array.isArray(item?.tasks)
      ? item.tasks.filter((task) => typeof task === "string")
      : [],
    remark: typeof item?.remark === "string" ? item.remark : "",
    projectNo: typeof item?.projectNo === "string" ? item.projectNo : "",
    contractNo: typeof item?.contractNo === "string" ? item.contractNo : "",
    level: LEVEL_OPTIONS.includes(level) ? level : "",
    status: STATUS_OPTIONS.includes(status) ? status : "",
    progress: clampProgress(item?.progress),
    startDate: typeof item?.startDate === "string" ? item.startDate : "",
    dueDate: typeof item?.dueDate === "string" ? item.dueDate : "",
    icon: typeof item?.icon === "string" ? item.icon : "folder-open",
    version: Number.isInteger(item?.version) && item.version > 0 ? item.version : 1,
    createdAt: typeof item?.createdAt === "string" ? item.createdAt : now,
    updatedAt: typeof item?.updatedAt === "string" ? item.updatedAt : now,
  };
}

export function normalizeTask(item, fallbackId) {
  const normalizedTitle =
    typeof item?.title === "string" && item.title.trim() ? item.title.trim() : `Task ${fallbackId}`;
  const projectLevel = typeof item?.projectLevel === "string" ? item.projectLevel.trim() : "";
  const projectStatus = typeof item?.projectStatus === "string" ? item.projectStatus.trim() : "";

  return {
    id: Number.isInteger(item?.id) ? item.id : fallbackId,
    projectId: Number.isInteger(item?.projectId) ? item.projectId : 0,
    projectName: typeof item?.projectName === "string" ? item.projectName : "",
    projectNo: typeof item?.projectNo === "string" ? item.projectNo : "",
    contractNo: typeof item?.contractNo === "string" ? item.contractNo : "",
    projectLevel: LEVEL_OPTIONS.includes(projectLevel) ? projectLevel : "",
    projectStatus: STATUS_OPTIONS.includes(projectStatus) ? projectStatus : "",
    title: normalizedTitle,
    owner: typeof item?.owner === "string" ? item.owner : "",
    status: normalizeTaskStatusValue(item?.status),
    dueDate: typeof item?.dueDate === "string" ? item.dueDate : "",
    note: typeof item?.note === "string" ? item.note : "",
  };
}

export function buildTaskProjectSnapshot(project) {
  return {
    projectName: project.name,
    projectNo: project.projectNo,
    contractNo: project.contractNo,
    projectLevel: project.level,
    projectStatus: project.status,
  };
}

export function getTaskProjectLinkKey(task) {
  const projectName = typeof task?.projectName === "string" ? task.projectName.trim() : "";
  if (projectName) return `name:${projectName}`;
  if (Number.isInteger(task?.projectId) && task.projectId > 0) return `project:${task.projectId}`;
  return `task:${task?.id ?? "unknown"}`;
}

export function normalizeTaskFieldValue(task, field, value) {
  if (field === "title") {
    const nextValue = typeof value === "string" ? value.trim() : "";
    return nextValue || task.title;
  }

  if (field === "owner") {
    return typeof value === "string" ? value.trim() : "";
  }

  return typeof value === "string" ? value : value;
}

export function serializeTaskData(state) {
  return {
    taskData: state.taskData.map((task) => ({ ...task })),
  };
}

export function serializeProjectData(state) {
  return {
    projectData: state.projectData.map((project) => ({ ...project })),
  };
}

export function setDataStatus(status, message) {
  dataStatusTexts.forEach((node) => {
    node.textContent = message;
  });

  dataStatusDots.forEach((node) => {
    node.dataset.state = status;
  });
}

export function formatGlobalLoadError(detail) {
  return detail ? `Data load failed. ${detail}` : "Data load failed.";
}
