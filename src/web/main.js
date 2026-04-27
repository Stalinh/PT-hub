import {
  LEVEL_OPTIONS,
  PROJECT_DATA_ENDPOINT,
  STATUS_OPTIONS,
  TASK_STATUS_OPTIONS,
  TASK_DATA_ENDPOINT,
} from "./constants.js";
import {
  appPages,
  dataStatusDots,
  dataStatusTexts,
  detailCopyButton,
  detailExportButton,
  detailEls,
  modeButtons,
  navItems,
  newIsland,
  newIslandClose,
  newIslandPanel,
  newProjectInput,
  newProjectSubmit,
  newTrigger,
  shell,
  sidebarToggle,
  tableBody,
  tasksPageEls,
} from "./dom.js";
import {
  persistActiveView,
  persistSidebarState,
  persistTableMode,
  readActiveView,
  readSidebarState,
  readTableMode,
} from "./storage.js";
import { clampProgress, escapeHtml, levelClass, statusClass, taskStatusClass } from "./utils.js";

const state = {
  projectData: [],
  taskData: [],
  nextProjectId: 1,
  nextTaskId: 1,
  copiedProjectName: null,
  copiedDetailMeta: null,
  exportedProjectId: null,
  selectedProjectId: null,
  selectedTaskId: null,
  currentTableMode: readTableMode(),
  activeEditCell: null,
  activeTaskEditCell: null,
  isOpeningTaskCellEdit: false,
  activeDetailEditor: null,
  activeDetailTaskEdit: null,
  isOpeningDetailTaskEdit: false,
  editSessionDirty: false,
  editSessionTaskDirty: false,
  draggedProjectId: null,
  saveChain: Promise.resolve(),
  saveRequestCounter: 0,
  latestCompletedSave: 0,
  loadIncomplete: false,
};

const floatingChoiceMenu = document.createElement("div");
floatingChoiceMenu.className = "floating-choice-menu";
floatingChoiceMenu.dataset.state = "closed";
floatingChoiceMenu.hidden = true;
document.body.appendChild(floatingChoiceMenu);

const confirmDialog = document.createElement("div");
confirmDialog.className = "confirm-dialog";
confirmDialog.hidden = true;
confirmDialog.innerHTML = `
  <div class="confirm-dialog-backdrop" data-confirm-close="true"></div>
  <div
    class="confirm-dialog-panel"
    role="dialog"
    aria-modal="true"
    aria-labelledby="confirm-dialog-title"
    aria-describedby="confirm-dialog-message"
  >
    <div class="confirm-dialog-icon" aria-hidden="true">
      <i data-lucide="triangle-alert"></i>
    </div>
    <div class="confirm-dialog-copy">
      <span class="confirm-dialog-eyebrow">Delete item</span>
      <h3 id="confirm-dialog-title"></h3>
      <p id="confirm-dialog-message"></p>
    </div>
    <div class="confirm-dialog-actions">
      <button class="confirm-dialog-button secondary" type="button" data-confirm-cancel="true">取消</button>
      <button class="confirm-dialog-button danger" type="button" data-confirm-accept="true">删除</button>
    </div>
  </div>
`;
document.body.appendChild(confirmDialog);

let floatingChoiceMenuOpenFrame = 0;
let floatingChoiceMenuCloseTimer = 0;
let confirmDialogCleanup = null;

function clearFloatingChoiceMenuMotion() {
  if (floatingChoiceMenuOpenFrame) {
    window.cancelAnimationFrame(floatingChoiceMenuOpenFrame);
    floatingChoiceMenuOpenFrame = 0;
  }

  if (floatingChoiceMenuCloseTimer) {
    window.clearTimeout(floatingChoiceMenuCloseTimer);
    floatingChoiceMenuCloseTimer = 0;
  }
}

function closeFloatingChoiceMenu({ immediate = false } = {}) {
  clearFloatingChoiceMenuMotion();

  if (immediate) {
    floatingChoiceMenu.dataset.state = "closed";
    floatingChoiceMenu.hidden = true;
    floatingChoiceMenu.innerHTML = "";
    return;
  }

  if (floatingChoiceMenu.hidden) {
    floatingChoiceMenu.dataset.state = "closed";
    floatingChoiceMenu.innerHTML = "";
    return;
  }

  floatingChoiceMenu.dataset.state = "closed";
  floatingChoiceMenuCloseTimer = window.setTimeout(() => {
    if (floatingChoiceMenu.dataset.state !== "closed") return;
    floatingChoiceMenu.hidden = true;
    floatingChoiceMenu.innerHTML = "";
    floatingChoiceMenuCloseTimer = 0;
  }, 180);
}

function closeConfirmDialog() {
  if (confirmDialog.hidden) return;
  confirmDialog.hidden = true;
  document.body.classList.remove("dialog-open");
  confirmDialogCleanup?.();
  confirmDialogCleanup = null;
}

function openConfirmDialog({ title, message, confirmLabel = "删除", onConfirm }) {
  closeConfirmDialog();

  const titleEl = confirmDialog.querySelector("#confirm-dialog-title");
  const messageEl = confirmDialog.querySelector("#confirm-dialog-message");
  const acceptButton = confirmDialog.querySelector("[data-confirm-accept='true']");
  const cancelButton = confirmDialog.querySelector("[data-confirm-cancel='true']");

  titleEl.textContent = title;
  messageEl.textContent = message;
  acceptButton.textContent = confirmLabel;
  confirmDialog.hidden = false;
  document.body.classList.add("dialog-open");
  window.lucide.createIcons();

  const handleCloseClick = (event) => {
    if (!event.target.closest("[data-confirm-close='true'], [data-confirm-cancel='true']")) return;
    closeConfirmDialog();
  };

  const handleAcceptClick = () => {
    closeConfirmDialog();
    onConfirm?.();
  };

  const handleKeydown = (event) => {
    if (event.key !== "Escape") return;
    event.preventDefault();
    closeConfirmDialog();
  };

  confirmDialog.addEventListener("click", handleCloseClick);
  acceptButton.addEventListener("click", handleAcceptClick);
  cancelButton.focus();
  document.addEventListener("keydown", handleKeydown);

  confirmDialogCleanup = () => {
    confirmDialog.removeEventListener("click", handleCloseClick);
    acceptButton.removeEventListener("click", handleAcceptClick);
    document.removeEventListener("keydown", handleKeydown);
  };
}

function normalizeTaskStatusValue(status) {
  if (status === "Doing" || status === "doing" || status === "in progress") return "doing";
  if (status === "Done" || status === "done") return "done";
  return "todo";
}

function normalizeProject(item, fallbackId) {
  const now = new Date().toISOString();

  return {
    id: Number.isInteger(item?.id) ? item.id : fallbackId,
    name: typeof item?.name === "string" ? item.name : `Project ${fallbackId}`,
    tasks: Array.isArray(item?.tasks)
      ? item.tasks.filter((task) => typeof task === "string")
      : [],
    remark: typeof item?.remark === "string" ? item.remark : "",
    projectNo: typeof item?.projectNo === "string" ? item.projectNo : "",
    contractNo: typeof item?.contractNo === "string" ? item.contractNo : "",
    level: LEVEL_OPTIONS.includes(item?.level) ? item.level : "N",
    status: STATUS_OPTIONS.includes(item?.status) ? item.status : "in design",
    progress: clampProgress(item?.progress),
    icon: typeof item?.icon === "string" ? item.icon : "folder-open",
    version: Number.isInteger(item?.version) && item.version > 0 ? item.version : 1,
    createdAt: typeof item?.createdAt === "string" ? item.createdAt : now,
    updatedAt: typeof item?.updatedAt === "string" ? item.updatedAt : now,
  };
}

function renderTaskListMarkup(tasks) {
  if (!tasks.length) {
    return `<li class="detail-task-empty">No tasks yet.</li>`;
  }

  return tasks
    .map(
      (task) => `
        <li class="detail-task-item">
          <div class="task-check detail-task-row">
            <label class="task-check-toggle">
              <input
                type="radio"
                name="detail-task-status-${task.id}"
                data-task-checkbox="true"
                data-task-id="${task.id}"
                ${task.status === "done" ? "checked" : ""}
              />
              <span class="task-check-box" aria-hidden="true"></span>
            </label>
            ${
              state.currentTableMode === "edit" && state.activeDetailTaskEdit?.taskId === task.id
                ? `
                  <input
                    class="cell-input detail-task-input"
                    type="text"
                    value="${escapeHtml(task.title || task)}"
                    data-detail-task-input="true"
                    data-task-id="${task.id}"
                    aria-label="Edit task title"
                  />
                `
                : `
                  <span
                    class="task-check-label ${task.status === "done" ? "is-done" : ""} ${state.currentTableMode === "edit" ? "detail-editable-target" : ""}"
                    data-detail-editable="${state.currentTableMode === "edit" ? "taskTitle" : ""}"
                    data-task-id="${task.id ?? ""}"
                    tabindex="${state.currentTableMode === "edit" ? "0" : "-1"}"
                  >${escapeHtml(task.title || task)}</span>
                `
            }
          </div>
        </li>
      `
    )
    .join("");
}

function normalizeTask(item, fallbackId) {
  const normalizedTitle =
    typeof item?.title === "string" && item.title.trim() ? item.title.trim() : `Task ${fallbackId}`;

  return {
    id: Number.isInteger(item?.id) ? item.id : fallbackId,
    projectId: Number.isInteger(item?.projectId) ? item.projectId : 0,
    projectName: typeof item?.projectName === "string" ? item.projectName : "",
    projectNo: typeof item?.projectNo === "string" ? item.projectNo : "",
    contractNo: typeof item?.contractNo === "string" ? item.contractNo : "",
    projectLevel: LEVEL_OPTIONS.includes(item?.projectLevel) ? item.projectLevel : "N",
    projectStatus: STATUS_OPTIONS.includes(item?.projectStatus)
      ? item.projectStatus
      : "in design",
    title: normalizedTitle,
    owner: typeof item?.owner === "string" ? item.owner : "",
    status: normalizeTaskStatusValue(item?.status),
    dueDate: typeof item?.dueDate === "string" ? item.dueDate : "",
    note: typeof item?.note === "string" ? item.note : "",
  };
}

function initializeTaskData(list) {
  state.taskData = Array.isArray(list) ? list.map((task, index) => normalizeTask(task, index + 1)) : [];
  state.nextTaskId =
    state.taskData.reduce((maxId, task) => Math.max(maxId, task.id), 0) + 1;
  state.selectedTaskId = state.taskData[0]?.id || null;
}

function buildTaskProjectSnapshot(project) {
  return {
    projectName: project.name,
    projectNo: project.projectNo,
    contractNo: project.contractNo,
    projectLevel: project.level,
    projectStatus: project.status,
  };
}

function getTaskProjectLinkKey(task) {
  const projectName = typeof task?.projectName === "string" ? task.projectName.trim() : "";
  if (projectName) return `name:${projectName}`;
  if (Number.isInteger(task?.projectId) && task.projectId > 0) return `project:${task.projectId}`;
  return `task:${task?.id ?? "unknown"}`;
}

function getLinkedProjectForTask(task) {
  if (!task) return null;
  return state.projectData.find((project) => project.id === task.projectId) || null;
}

function getTaskProjectView(task) {
  const linkedProject = getLinkedProjectForTask(task);
  if (linkedProject) {
    return {
      id: linkedProject.id,
      name: linkedProject.name,
      projectNo: linkedProject.projectNo,
      contractNo: linkedProject.contractNo,
      level: linkedProject.level,
      status: linkedProject.status,
      progress: linkedProject.progress,
      remark: linkedProject.remark,
      isLinked: true,
    };
  }

  return {
    id: task?.projectId ?? null,
    name: task?.projectName || "Unlinked project",
    projectNo: task?.projectNo || "",
    contractNo: task?.contractNo || "",
    level: task?.projectLevel || "N",
    status: task?.projectStatus || "in design",
    progress: 0,
    remark: task?.note || "This task is not currently linked to a live project record.",
    isLinked: false,
  };
}

function getTasksForTaskGroup(task) {
  const groupKey = getTaskProjectLinkKey(task);
  return state.taskData.filter((item) => getTaskProjectLinkKey(item) === groupKey);
}

function getProjectTasks(projectId) {
  return state.taskData.filter((task) => task.projectId === projectId);
}

function getProjectTaskSnapshot(project) {
  const tasks = project ? getProjectTasks(project.id) : [];

  return {
    tasks,
    openCount: tasks.filter((task) => task.status !== "done").length,
    progressCount: tasks.filter((task) => task.status === "doing").length,
    doneCount: tasks.filter((task) => task.status === "done").length,
  };
}

function getTaskStatusClass(status) {
  return taskStatusClass(status);
}

function isEditingTaskCell(taskId, field) {
  return state.activeTaskEditCell?.taskId === taskId && state.activeTaskEditCell?.field === field;
}

function isTaskChoiceField(field) {
  return field === "status";
}

function usesTaskChoiceMenu(field) {
  return isTaskChoiceField(field);
}

function renderTaskTextInput(task, field, label, extraClass = "") {
  const className = ["cell-input", extraClass].filter(Boolean).join(" ");
  const inputType = field === "dueDate" ? "date" : "text";

  return `
    <input
      class="${className}"
      type="${inputType}"
      value="${escapeHtml(task[field] || "")}"
      data-task-field="${field}"
      data-task-id="${task.id}"
      aria-label="${escapeHtml(label)}"
    />
  `;
}

function renderTaskEditableShell(task, field, label, content, extraClass = "") {
  const className = ["editable-shell", extraClass].filter(Boolean).join(" ");

  return `
    <button
      class="${className}"
      type="button"
      data-task-editable="true"
      data-task-id="${task.id}"
      data-task-field="${field}"
      aria-label="${escapeHtml(label)}"
    >
      ${content}
    </button>
  `;
}

function renderTaskStatusTrigger(task) {
  return `
    <button
      class="choice-trigger task-status-trigger status ${getTaskStatusClass(task.status)} ${isEditingTaskCell(task.id, "status") ? "active" : ""}"
      type="button"
      data-task-editable="true"
      data-task-id="${task.id}"
      data-task-field="status"
      data-task-choice-anchor="true"
      aria-label="Task status"
      value="${escapeHtml(task.status)}"
    >
      <span class="task-status-trigger-label">${escapeHtml(task.status)}</span>
    </button>
  `;
}

function renderTaskTitleCell(task) {
  const titleMarkup = isEditingTaskCell(task.id, "title")
    ? renderTaskTextInput(task, "title", "Task title")
    : state.currentTableMode === "edit"
      ? renderTaskEditableShell(
          task,
          "title",
          "Edit task title",
          `<div class="project-name ${task.status === "done" ? "is-done" : ""}">${escapeHtml(task.title)}</div>`,
          "editable-shell-text"
        )
      : `<div class="project-name ${task.status === "done" ? "is-done" : ""}">${escapeHtml(task.title)}</div>`;

  return `
    <div class="project-cell task-project-cell-main">
      <div class="project-tools">
        <label class="task-check-toggle">
          <input
            type="radio"
            name="task-status-${task.id}"
            data-task-checkbox="true"
            data-task-id="${task.id}"
            ${task.status === "done" ? "checked" : ""}
          />
          <span class="task-check-box" aria-hidden="true"></span>
        </label>
      </div>
      <div>
        ${titleMarkup}
      </div>
    </div>
  `;
}

function renderTaskProjectCell(task) {
  const projectView = getTaskProjectView(task);
  return `<div><span class="project-name">${escapeHtml(projectView.name)}</span></div>`;
}

function renderTaskOwnerCell(task) {
  if (isEditingTaskCell(task.id, "owner")) {
    return renderTaskTextInput(task, "owner", "Task owner");
  }

  if (state.currentTableMode === "edit") {
    return renderTaskEditableShell(
      task,
      "owner",
      "Edit task owner",
      `<span class="project-code">${escapeHtml(task.owner || "--")}</span>`
    );
  }

  return `<span class="project-code">${escapeHtml(task.owner || "--")}</span>`;
}

function renderTaskStatusCell(task) {
  const content = `<span class="status ${getTaskStatusClass(task.status)}">${escapeHtml(task.status)}</span>`;
  return state.currentTableMode === "edit" ? renderTaskStatusTrigger(task) : content;
}

function renderTaskDueDateCell(task) {
  if (isEditingTaskCell(task.id, "dueDate")) {
    return renderTaskTextInput(task, "dueDate", "Due date", "compact-input");
  }

  if (state.currentTableMode === "edit") {
    return renderTaskEditableShell(
      task,
      "dueDate",
      "Edit due date",
      `<span class="project-code">${escapeHtml(task.dueDate || "--")}</span>`
    );
  }

  return `<span class="project-code">${escapeHtml(task.dueDate || "--")}</span>`;
}

function renderTaskRowMarkup(task) {
  return `
    <td>${renderTaskTitleCell(task)}</td>
    <td data-task-choice-cell="status">${renderTaskStatusCell(task)}</td>
    <td>${renderTaskProjectCell(task)}</td>
    <td>${renderTaskOwnerCell(task)}</td>
    <td>${renderTaskDueDateCell(task)}</td>
    <td>
      <button class="row-delete-button task-row-delete-button" type="button" data-task-delete-id="${task.id}" aria-label="Delete ${escapeHtml(task.title)}">
        <i data-lucide="trash-2"></i>
      </button>
    </td>
  `;
}

function renderProjectMetaMarkup(project) {
  const projectNo = project.projectNo?.trim() || "";
  const contractNo = project.contractNo?.trim() || "";
  const copiedField = state.copiedDetailMeta;

  const renderMetaItem = (label, value, fieldKey) => `
    <span class="detail-meta-item">
      <span class="detail-meta-value">${escapeHtml(value || "--")}</span>
      <button
        class="detail-meta-copy-button"
        type="button"
        data-detail-copy-field="${fieldKey}"
        data-detail-copy-value="${escapeHtml(value)}"
        aria-label="Copy ${label}"
        title="Copy ${label}"
        ${value ? "" : "disabled"}
      >
        <i data-lucide="${copiedField?.field === fieldKey && copiedField?.value === value ? "check" : "copy"}"></i>
      </button>
    </span>
  `;

  return `
    ${renderMetaItem("project number", projectNo, "projectNo")}
    <span class="detail-meta-divider" aria-hidden="true"></span>
    ${renderMetaItem("contract number", contractNo, "contractNo")}
  `;
}

function serializeTaskData() {
  return {
    taskData: state.taskData.map((task) => ({ ...task })),
  };
}

async function persistTaskData() {
  if (state.loadIncomplete) {
    setDataStatus("error", "Data load is incomplete. Reload before saving data.");
    return;
  }

  const requestId = ++state.saveRequestCounter;
  const payload = serializeTaskData();

  setDataStatus("saving", "Saving data...");

  state.saveChain = state.saveChain
    .catch(() => {})
    .then(async () => {
      const response = await fetch(TASK_DATA_ENDPOINT, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(result.error || "Failed to save task data.");
      }

      state.latestCompletedSave = requestId;
      if (requestId === state.saveRequestCounter) {
        setDataStatus("saved", "Data saved");
      }

      return result;
    })
    .catch((error) => {
      if (requestId >= state.latestCompletedSave) {
        setDataStatus("error", error.message || "Failed to save data.");
      }
      throw error;
    });

  try {
    await state.saveChain;
  } catch (_error) {
    // Status text already updated. Keep the UI interactive.
  }
}

function bindTaskCheckboxes() {
  document.querySelectorAll("[data-task-checkbox='true']").forEach((checkbox) => {
    checkbox.onclick = (event) => {
      event.preventDefault();
      event.stopPropagation();
      const taskId = Number.parseInt(checkbox.dataset.taskId, 10);
      if (Number.isNaN(taskId)) return;
      const task = state.taskData.find((item) => item.id === taskId);
      if (!task) return;
      toggleTaskDone(taskId, task.status !== "done");
    };
  });
}

function toggleTaskDone(taskId, checked) {
  const task = state.taskData.find((item) => item.id === taskId);
  if (!task) return;

  task.status = checked ? "done" : "todo";
  state.selectedTaskId = task.id;

  const linkedProject = getLinkedProjectForTask(task);

  if (linkedProject) {
    state.selectedProjectId = linkedProject.id;
    refreshProjectTaskSurfaces(linkedProject);
  } else {
    state.selectedProjectId = null;
    renderTasksPage(null);
  }

  persistTaskData();
}

function getSelectedTask() {
  return state.taskData.find((task) => task.id === state.selectedTaskId) || null;
}

function setSelectedTask(taskId) {
  const task = state.taskData.find((item) => item.id === taskId);
  if (!task) return;

  state.selectedTaskId = task.id;

  const linkedProject = getLinkedProjectForTask(task);
  if (linkedProject) {
    state.selectedProjectId = linkedProject.id;
    applyProjectToDetail(linkedProject);
  } else {
    state.selectedProjectId = null;
  }

  syncSelectedRow(state.selectedProjectId);
  renderTasksPage();
}

function syncTaskSelectionFromProject(projectId = state.selectedProjectId) {
  const matchingTask =
    state.taskData.find((task) => task.projectId === projectId) || state.taskData[0] || null;

  state.selectedTaskId = matchingTask?.id || null;
}

function bindTaskTableRows() {
  document.querySelectorAll("[data-task-row-id]").forEach((row) => {
    const taskId = Number.parseInt(row.dataset.taskRowId, 10);
    if (Number.isNaN(taskId)) return;

    const task = state.taskData.find((item) => item.id === taskId);
    if (!task) return;

    bindTaskRowEvents(row, task);
  });
}

function normalizeTaskFieldValue(task, field, value) {
  if (field === "title") {
    const nextValue = typeof value === "string" ? value.trim() : "";
    return nextValue || task.title;
  }

  if (field === "owner") {
    return typeof value === "string" ? value.trim() : "";
  }

  return typeof value === "string" ? value : value;
}

function updateTaskField(taskId, field, value, options = {}) {
  const { persist = true, rerender = true } = options;
  const task = state.taskData.find((item) => item.id === taskId);
  if (!task) return;

  task[field] = normalizeTaskFieldValue(task, field, value);
  const linkedProject = getLinkedProjectForTask(task);

  if (state.selectedTaskId === task.id) {
    state.selectedTaskId = task.id;
  }

  if (linkedProject && state.selectedProjectId === linkedProject.id) {
    if (rerender) {
      refreshProjectTaskSurfaces(linkedProject);
    }
  } else if (rerender) {
    replaceTaskRow(task.id);
  }

  if (persist) {
    persistTaskData();
  } else {
    state.editSessionTaskDirty = true;
  }
}

function startTaskCellEdit(taskId, field) {
  if (state.activeTaskEditCell?.taskId === taskId && state.activeTaskEditCell?.field === field) {
    stopTaskCellEdit({ force: true });
    return;
  }

  if (state.activeTaskEditCell) {
    stopTaskCellEdit();
  }

  state.activeTaskEditCell = { taskId, field };
  state.editSessionTaskDirty = false;
  replaceTaskRow(taskId);
  updateFloatingChoiceMenu();

  if (usesTaskChoiceMenu(field)) {
    window.requestAnimationFrame(() => {
      focusActiveTaskCellControl();
    });
    return;
  }

  state.isOpeningTaskCellEdit = true;
  window.requestAnimationFrame(() => {
    focusActiveTaskCellControl();
    window.setTimeout(() => {
      state.isOpeningTaskCellEdit = false;
    }, 0);
  });
}

function stopTaskCellEdit(options = {}) {
  const { commit = true, force = false } = options;
  const editState = state.activeTaskEditCell;
  if (!editState) return;
  if (state.isOpeningTaskCellEdit && !force && !usesTaskChoiceMenu(editState.field)) return;

  const shouldPersist = commit && state.editSessionTaskDirty;
  const taskId = editState.taskId;
  state.activeTaskEditCell = null;
  state.isOpeningTaskCellEdit = false;
  state.editSessionTaskDirty = false;
  updateFloatingChoiceMenu();
  replaceTaskRow(taskId);

  if (shouldPersist) {
    persistTaskData();
  }
}

function focusActiveTaskCellControl() {
  if (!state.activeTaskEditCell || !tasksPageEls.tableBody) return;

  const activeControl = tasksPageEls.tableBody.querySelector(
    `[data-task-id="${state.activeTaskEditCell.taskId}"][data-task-field="${state.activeTaskEditCell.field}"]`
  );
  activeControl?.focus();
  if (activeControl?.select) activeControl.select();
}

function bindTaskEditableCellEvents(row) {
  row.querySelectorAll("[data-task-editable='true']").forEach((control) => {
    control.addEventListener("click", (event) => {
      event.stopPropagation();
      startTaskCellEdit(
        Number.parseInt(control.dataset.taskId, 10),
        control.dataset.taskField
      );
    });
  });

  row
    .querySelectorAll("[data-task-editable='true'][data-task-field='status']")
    .forEach((control) => {
      control.addEventListener("keydown", (event) => {
        if (event.key !== "Enter" && event.key !== " ") return;
        event.preventDefault();
        event.stopPropagation();
        startTaskCellEdit(
          Number.parseInt(control.dataset.taskId, 10),
          control.dataset.taskField
        );
      });
    });

  row.querySelectorAll("[data-task-field]").forEach((control) => {
    if (control.matches("button")) return;

    const taskId = Number.parseInt(control.dataset.taskId, 10);
    const { taskField } = control.dataset;
    const task = Number.isNaN(taskId)
      ? null
      : state.taskData.find((item) => item.id === taskId) || null;

    if (task && taskField && "value" in control) {
      control.value = task[taskField] || "";
    }

    control.addEventListener("click", (event) => {
      event.stopPropagation();
    });

    control.addEventListener("input", (event) => {
      const taskId = Number.parseInt(event.currentTarget.dataset.taskId, 10);
      const { taskField } = event.currentTarget.dataset;
      if (Number.isNaN(taskId) || !taskField) return;
      updateTaskField(taskId, taskField, event.currentTarget.value, {
        persist: false,
        rerender: false,
      });
    });

    control.addEventListener("keydown", (event) => {
      event.stopPropagation();
      if (event.key === "Enter") {
        event.preventDefault();
        stopTaskCellEdit();
      }
      if (event.key === "Escape") {
        event.preventDefault();
        stopTaskCellEdit({ commit: false });
      }
    });

    control.addEventListener("blur", (event) => {
      if (state.isOpeningTaskCellEdit) return;
      const taskId = Number.parseInt(event.currentTarget.dataset.taskId, 10);
      const { taskField } = event.currentTarget.dataset;
      if (Number.isNaN(taskId) || !taskField) return;
      updateTaskField(taskId, taskField, event.currentTarget.value, {
        persist: false,
        rerender: false,
      });
      window.setTimeout(() => {
        if (state.activeTaskEditCell?.taskId === taskId && state.activeTaskEditCell?.field === taskField) {
          stopTaskCellEdit();
        }
      }, 0);
    });
  });
}

function bindTaskRowEvents(row, task) {
  row.addEventListener("click", () => setSelectedTask(task.id));

  if (state.currentTableMode === "edit") {
    row.querySelectorAll("[data-task-choice-cell]").forEach((cell) => {
      cell.addEventListener("click", (event) => {
        if (event.target.closest("button, input, select, textarea, a, label")) return;
        event.stopPropagation();
        startTaskCellEdit(task.id, cell.dataset.taskChoiceCell);
      });
    });

    bindTaskEditableCellEvents(row);
  }

  const deleteButton = row.querySelector("[data-task-delete-id]");
  deleteButton?.addEventListener("click", (event) => {
    event.stopPropagation();
    confirmDeleteTask(task.id);
  });
}

function renderTaskRowElement(task) {
  const row = document.createElement("tr");
  row.dataset.taskRowId = String(task.id);
  row.classList.toggle("selected", task.id === state.selectedTaskId);
  row.className = `task-table-row ${task.id === state.selectedTaskId ? "selected" : ""}`;
  row.innerHTML = renderTaskRowMarkup(task);
  bindTaskRowEvents(row, task);
  return row;
}

function replaceTaskRow(taskId, { refreshIcons = true } = {}) {
  const task = state.taskData.find((item) => item.id === taskId);
  const currentRow = tasksPageEls.tableBody?.querySelector(`tr[data-task-row-id="${taskId}"]`);
  if (!task || !currentRow) return null;

  const nextRow = renderTaskRowElement(task);
  currentRow.replaceWith(nextRow);
  if (refreshIcons) {
    window.lucide.createIcons();
  }
  return nextRow;
}

function deleteTask(taskId) {
  const index = state.taskData.findIndex((task) => task.id === taskId);
  if (index === -1) return;

  const [deletedTask] = state.taskData.splice(index, 1);
  const linkedProject = getLinkedProjectForTask(deletedTask);

  if (state.activeDetailTaskEdit?.taskId === taskId) {
    state.activeDetailTaskEdit = null;
  }

  if (state.selectedTaskId === taskId) {
    const nextTask =
      state.taskData.find((task) => task.projectId === deletedTask.projectId) ||
      state.taskData[index] ||
      state.taskData[index - 1] ||
      state.taskData[0] ||
      null;
    state.selectedTaskId = nextTask?.id || null;
  }

  if (linkedProject && state.selectedProjectId === linkedProject.id) {
    refreshProjectTaskSurfaces(linkedProject);
  } else {
    renderTasksPage();
  }

  persistTaskData();
}

function confirmDeleteTask(taskId) {
  const task = state.taskData.find((item) => item.id === taskId);
  if (!task) return;

  openConfirmDialog({
    title: "删除任务",
    message: `任务“${task.title}”删除后将无法恢复，相关执行记录会从当前任务列表中移除。`,
    confirmLabel: "删除任务",
    onConfirm: () => deleteTask(taskId),
  });
}

function renderTasksPage(project = null) {
  if (!tasksPageEls.tableBody) return;

  tasksPageEls.tableBody.innerHTML = "";

  if (!state.taskData.length) {
    tasksPageEls.tableBody.innerHTML = `
      <tr class="tasks-empty-row">
        <td colspan="5">No task records available.</td>
      </tr>
    `;
  } else {
    state.taskData.forEach((task) => {
      tasksPageEls.tableBody.appendChild(renderTaskRowElement(task));
    });
  }

  window.lucide.createIcons();
  bindTaskCheckboxes();
}

function initializeProjectData(list) {
  const source = Array.isArray(list) ? list : [];
  state.projectData = source.map((project, index) => normalizeProject(project, index + 1));
  state.nextProjectId =
    state.projectData.reduce((maxId, project) => Math.max(maxId, project.id), 0) + 1;
  state.selectedProjectId = state.projectData[0]?.id || null;
  syncTaskSelectionFromProject(state.selectedProjectId);
}

function setDataStatus(status, message) {
  dataStatusTexts.forEach((node) => {
    node.textContent = message;
  });

  dataStatusDots.forEach((node) => {
    node.dataset.state = status;
  });
}

function formatGlobalLoadError(detail) {
  return detail ? `Data load failed. ${detail}` : "Data load failed.";
}

function serializeProjectData() {
  return {
    projectData: state.projectData.map((project) => ({ ...project })),
  };
}

async function persistProjectData() {
  if (state.loadIncomplete) {
    setDataStatus("error", "Data load is incomplete. Reload before saving data.");
    return;
  }

  const requestId = ++state.saveRequestCounter;
  const payload = serializeProjectData();

  setDataStatus("saving", "Saving data...");

  state.saveChain = state.saveChain
    .catch(() => {})
    .then(async () => {
      const response = await fetch(PROJECT_DATA_ENDPOINT, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(result.error || "Failed to save project data.");
      }

      state.latestCompletedSave = requestId;
      if (requestId === state.saveRequestCounter) {
        setDataStatus("saved", "Data saved");
      }

      return result;
    })
    .catch((error) => {
      if (requestId >= state.latestCompletedSave) {
        setDataStatus("error", error.message || "Failed to save data.");
      }
      throw error;
    });

  try {
    await state.saveChain;
  } catch (_error) {
    // Status text already updated. Keep the UI interactive.
  }
}

async function loadProjectData() {
  setDataStatus("loading", "Loading data...");

  const [projectResult, taskResult] = await Promise.allSettled([
    fetch(PROJECT_DATA_ENDPOINT, {
      headers: {
        Accept: "application/json",
      },
    }),
    fetch(TASK_DATA_ENDPOINT, {
      headers: {
        Accept: "application/json",
      },
    }),
  ]);

  const loadErrors = [];

  if (projectResult.status === "fulfilled") {
    const projectResponse = projectResult.value;
    const projectPayload = await projectResponse.json().catch(() => ({}));

    if (projectResponse.ok) {
      initializeProjectData(projectPayload.projectData);
    } else {
      loadErrors.push(projectPayload.error || "One data source could not be loaded.");
    }
  } else {
    loadErrors.push(projectResult.reason?.message || "One data source could not be loaded.");
  }

  if (taskResult.status === "fulfilled") {
    const taskResponse = taskResult.value;
    const taskPayload = await taskResponse.json().catch(() => ({}));

    if (taskResponse.ok) {
      initializeTaskData(taskPayload.taskData);
    } else {
      loadErrors.push(taskPayload.error || "One data source could not be loaded.");
    }
  } else {
    loadErrors.push(taskResult.reason?.message || "One data source could not be loaded.");
  }

  state.loadIncomplete = loadErrors.length > 0;
  syncTaskSelectionFromProject(state.selectedProjectId);
  renderRows();
  syncDetailPanel();

  if (state.loadIncomplete) {
    setDataStatus("error", formatGlobalLoadError(loadErrors.join(" ")));
    return;
  }

  setDataStatus("saved", "Data loaded");
}

function renderTextInput(project, field, label, extraClass = "") {
  const className = ["cell-input", extraClass].filter(Boolean).join(" ");

  return `
    <input
      class="${className}"
      type="text"
      value="${escapeHtml(project[field])}"
      data-field="${field}"
      aria-label="${escapeHtml(label)}"
    />
  `;
}

function isChoiceField(field) {
  return field === "level" || field === "status";
}

function isLockedField(field) {
  return field === "progress";
}

function getChoiceConfig(field) {
  if (field === "level") {
    return {
      label: "Project level",
      options: LEVEL_OPTIONS,
      renderOption: (option) => `<span class="pill ${levelClass(option)}">${escapeHtml(option)}</span>`,
    };
  }

  return {
    label: "Project status",
    options: STATUS_OPTIONS,
    renderOption: (option) =>
      `<span class="status ${statusClass(option)}">${escapeHtml(option)}</span>`,
  };
}

function getTaskChoiceConfig(field) {
  return {
    label: "Task status",
    options: TASK_STATUS_OPTIONS,
    renderOption: (option) =>
      `<span class="status ${getTaskStatusClass(option)}">${escapeHtml(option)}</span>`,
  };
}

function isEditingCell(projectId, field) {
  return (
    state.activeEditCell?.projectId === projectId && state.activeEditCell?.field === field
  );
}

function renderChoiceTrigger(project, field) {
  const { label, renderOption } = getChoiceConfig(field);

  return `
    <button
      class="choice-trigger ${isEditingCell(project.id, field) ? "active" : ""}"
      type="button"
      data-editable="true"
      data-project-id="${project.id}"
      data-field="${field}"
      aria-label="${escapeHtml(label)}"
    >
      <span class="choice-trigger-value">${renderOption(project[field])}</span>
    </button>
  `;
}

function syncTaskProjectSnapshot(project) {
  const snapshot = buildTaskProjectSnapshot(project);
  let changed = false;

  state.taskData.forEach((task) => {
    if (task.projectId !== project.id) return;

    for (const [key, value] of Object.entries(snapshot)) {
      if (task[key] === value) continue;
      task[key] = value;
      changed = true;
    }
  });

  return changed;
}

function updateProjectField(projectId, field, value, options = {}) {
  const { persist = true, rerenderRow = true } = options;
  const project = state.projectData.find((item) => item.id === projectId);
  if (!project) return;

  if (field === "progress") {
    project.progress = clampProgress(value);
  } else {
    project[field] = value;
  }

  project.version += 1;
  project.updatedAt = new Date().toISOString();
  const taskSnapshotChanged = syncTaskProjectSnapshot(project);

  if (project.id === state.selectedProjectId) {
    if (field === "name" || field === "projectNo" || field === "contractNo") {
      updateDetailHeader(project);
      renderTasksPage(project);
    } else if (field === "progress") {
      updateDetailProgress(project);
    } else if (field === "remark") {
      updateDetailRemark(project);
    }
  }

  if (rerenderRow) {
    replaceProjectRow(project.id);
  }

  if (persist) {
    persistProjectData();
    if (taskSnapshotChanged) {
      persistTaskData();
    }
  } else {
    state.editSessionDirty = true;
    if (taskSnapshotChanged) {
      state.editSessionTaskDirty = true;
    }
  }
}

function updateFloatingChoiceMenu() {
  const hasProjectChoice = state.activeEditCell && isChoiceField(state.activeEditCell.field);
  const hasTaskChoice = state.activeTaskEditCell && state.activeTaskEditCell.field === "status";

  if (!hasProjectChoice && !hasTaskChoice) {
    closeFloatingChoiceMenu();
    return;
  }

  let trigger = null;
  let label = "";
  let options = [];
  let renderOption = null;
  let selectedValue = "";

  if (hasProjectChoice) {
    const project = state.projectData.find((item) => item.id === state.activeEditCell.projectId);
    trigger = tableBody.querySelector(
      `tr[data-project-id="${state.activeEditCell.projectId}"] [data-field="${state.activeEditCell.field}"]`
    );

    if (!project || !trigger) {
      closeFloatingChoiceMenu({ immediate: true });
      return;
    }

    const config = getChoiceConfig(state.activeEditCell.field);
    label = config.label;
    options = config.options;
    renderOption = config.renderOption;
    selectedValue = project[state.activeEditCell.field];
  } else if (hasTaskChoice) {
    const task = state.taskData.find((item) => item.id === state.activeTaskEditCell.taskId);
    const taskTrigger = tasksPageEls.tableBody?.querySelector(
      `tr[data-task-row-id="${state.activeTaskEditCell.taskId}"] [data-task-field="${state.activeTaskEditCell.field}"]`
    );
    const taskAnchor = taskTrigger?.querySelector?.("[data-task-choice-anchor='true']");
    trigger = taskAnchor || taskTrigger;

    if (!task || !trigger) {
      closeFloatingChoiceMenu({ immediate: true });
      return;
    }

    const config = getTaskChoiceConfig(state.activeTaskEditCell.field);
    label = config.label;
    options = config.options;
    renderOption = config.renderOption;
    selectedValue = task[state.activeTaskEditCell.field];
  }

  const optionMarkup = options
    .map((option) => {
      const selected = selectedValue === option;

      return `
        <button
          class="choice-option ${selected ? "active" : ""}"
          type="button"
          data-choice-option="true"
          data-field="${hasProjectChoice ? state.activeEditCell.field : state.activeTaskEditCell.field}"
          data-value="${escapeHtml(option)}"
          aria-label="${escapeHtml(`${label}: ${option}`)}"
        >
          ${renderOption(option)}
        </button>
      `;
    })
    .join("");

  clearFloatingChoiceMenuMotion();
  const shouldAnimateOpen = floatingChoiceMenu.hidden;
  floatingChoiceMenu.innerHTML = `<div class="choice-menu">${optionMarkup}</div>`;
  const rect = trigger.getBoundingClientRect();
  const viewportPadding = 12;
  floatingChoiceMenu.style.minWidth = "0px";
  floatingChoiceMenu.style.top = "0px";
  floatingChoiceMenu.style.left = "0px";
  floatingChoiceMenu.hidden = false;
  floatingChoiceMenu.dataset.state = shouldAnimateOpen ? "closed" : "open";

  const menuRect = floatingChoiceMenu.getBoundingClientRect();
  const fitsBelow = rect.bottom + 8 + menuRect.height <= window.innerHeight - viewportPadding;
  const top = fitsBelow
    ? rect.bottom + 8
    : Math.max(viewportPadding, rect.top - menuRect.height - 8);
  const left = Math.min(rect.left, window.innerWidth - menuRect.width - viewportPadding);

  floatingChoiceMenu.style.top = `${top}px`;
  floatingChoiceMenu.style.left = `${Math.max(viewportPadding, left)}px`;

  if (shouldAnimateOpen) {
    floatingChoiceMenuOpenFrame = window.requestAnimationFrame(() => {
      floatingChoiceMenu.dataset.state = "open";
      floatingChoiceMenuOpenFrame = 0;
    });
  }

  floatingChoiceMenu.querySelectorAll("[data-choice-option='true']").forEach((control) => {
    control.addEventListener("click", (event) => {
      event.stopPropagation();
      if (hasProjectChoice) {
        const project = state.projectData.find((item) => item.id === state.activeEditCell.projectId);
        if (!project) return;
        updateProjectField(project.id, control.dataset.field, control.dataset.value, {
          persist: false,
          rerenderRow: false,
        });
        stopCellEdit();
        return;
      }

      const task = state.taskData.find((item) => item.id === state.activeTaskEditCell.taskId);
      if (!task) return;
      updateTaskField(task.id, control.dataset.field, control.dataset.value, {
        persist: false,
        rerender: false,
      });
      stopTaskCellEdit();
    });
  });
}

function renderProgressInput(project) {
  return `
    <label class="progress-editor" aria-label="Edit project progress">
      <input
        class="cell-input progress-input"
        type="number"
        min="0"
        max="100"
        step="1"
        value="${project.progress}"
        data-field="progress"
      />
      <span>%</span>
    </label>
  `;
}

function renderEditableShell(project, field, label, content, extraClass = "") {
  const className = ["editable-shell", extraClass].filter(Boolean).join(" ");

  return `
    <button
      class="${className}"
      type="button"
      data-editable="true"
      data-project-id="${project.id}"
      data-field="${field}"
      aria-label="${escapeHtml(label)}"
    >
      ${content}
    </button>
  `;
}

function renderProjectCell(project) {
  const projectNameMarkup = isEditingCell(project.id, "name")
    ? renderTextInput(project, "name", "Project name")
    : renderEditableShell(
        project,
        "name",
        "Edit project name",
        `<div class="project-name">${escapeHtml(project.name)}</div>`,
        "editable-shell-text"
      );

  return `
    <div class="project-cell">
      <div class="project-tools">
        <button
          class="row-drag-handle"
          type="button"
          draggable="true"
          aria-label="Reorder project row"
          title="Reorder project row"
        >
          <i data-lucide="grip-vertical"></i>
        </button>
      </div>
      <div>
        ${state.currentTableMode === "edit" ? projectNameMarkup : `<div class="project-name">${escapeHtml(project.name)}</div>`}
      </div>
    </div>
  `;
}

function renderLevelCell(project) {
  const content = `<span class="pill ${levelClass(project.level)}">${escapeHtml(project.level)}</span>`;
  return state.currentTableMode === "edit" ? renderChoiceTrigger(project, "level") : content;
}

function renderStatusCell(project) {
  const content = `<span class="status ${statusClass(project.status)}">${escapeHtml(project.status)}</span>`;
  return state.currentTableMode === "edit" ? renderChoiceTrigger(project, "status") : content;
}

function renderProgressCell(project) {
  return `
    <div class="progress-cell">
      <div class="progress-track"><span style="width: ${project.progress}%"></span></div>
      <strong>${project.progress}%</strong>
    </div>
  `;
}

function getActiveProject() {
  return (
    state.projectData.find((project) => project.id === state.selectedProjectId) ||
    state.projectData[0] ||
    null
  );
}

function syncSelectedRow(projectId = state.selectedProjectId) {
  const nextId = projectId == null ? null : String(projectId);
  document.querySelectorAll("tbody tr").forEach((tr) => {
    tr.classList.toggle("selected", tr.dataset.projectId === nextId);
  });
}

function updateDetailHeaderActions(project) {
  if (detailCopyButton) {
    detailCopyButton.setAttribute("aria-label", `Copy ${project.name}`);
    detailCopyButton.setAttribute("title", `Copy ${project.name}`);
    detailCopyButton.innerHTML = `<i data-lucide="${state.copiedProjectName === project.name ? "check" : "copy"}"></i>`;
  }

  if (detailExportButton) {
    detailExportButton.setAttribute("aria-label", `Export ${project.name}`);
    detailExportButton.setAttribute("title", `Export ${project.name}`);
    detailExportButton.innerHTML = `<i data-lucide="${state.exportedProjectId === project.id ? "check" : "download"}"></i>`;
  }
}

function updateDetailHeader(project) {
  detailEls.title.textContent = project.name;
  detailEls.summary.innerHTML = renderProjectMetaMarkup(project);
  updateDetailHeaderActions(project);
  window.lucide.createIcons();
}

function updateDetailProgress(project) {
  detailEls.progressText.textContent = `${project.progress}%`;
  detailEls.progressBar.style.width = `${project.progress}%`;
}

function bindDetailRemarkEditor(project) {
  if (state.currentTableMode !== "edit") return;

  detailEls.remark.classList.add("detail-editable-target");
  detailEls.remark.tabIndex = 0;
  detailEls.remark.onclick = (event) => {
    event.preventDefault();
    event.stopPropagation();
    openDetailTextEditor(detailEls.remark, {
      value: project.remark,
      multiline: true,
      className: "detail-inline-copy",
      onCommit: (nextValue) => {
        updateProjectField(project.id, "remark", nextValue);
      },
      onCancel: () => updateDetailRemark(project),
    });
  };
  detailEls.remark.onkeydown = (event) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    detailEls.remark.click();
  };
}

function updateDetailRemark(project) {
  detailEls.remark.classList.remove("detail-editable-target");
  detailEls.remark.removeAttribute("tabindex");
  detailEls.remark.onclick = null;
  detailEls.remark.onkeydown = null;
  detailEls.remark.textContent = project.remark;
  bindDetailRemarkEditor(project);
}

function bindDetailTaskEditors(project) {
  if (state.currentTableMode !== "edit") return;

  detailEls.tasks.querySelectorAll("[data-detail-editable='taskTitle']").forEach((node) => {
    node.onclick = (event) => {
      event.preventDefault();
      event.stopPropagation();

      const taskId = Number.parseInt(node.dataset.taskId, 10);
      if (Number.isNaN(taskId)) return;
      startDetailTaskEdit(taskId);
    };

    node.onkeydown = (event) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      node.click();
    };
  });

  detailEls.tasks.querySelectorAll("[data-detail-task-input='true']").forEach((input) => {
    const taskId = Number.parseInt(input.dataset.taskId, 10);
    const task = Number.isNaN(taskId) ? null : state.taskData.find((item) => item.id === taskId) || null;

    if (task) {
      input.value = task.title || "";
    }

    input.addEventListener("click", (event) => {
      event.stopPropagation();
    });

    input.addEventListener("keydown", (event) => {
      event.stopPropagation();

      if (event.key === "Enter") {
        event.preventDefault();
        stopDetailTaskEdit();
        return;
      }

      if (event.key === "Escape") {
        event.preventDefault();
        stopDetailTaskEdit({ commit: false });
      }
    });

    input.addEventListener("focusout", (event) => {
      if (!state.activeDetailTaskEdit) return;
      if (!event.relatedTarget) return;
      if (input.contains(event.relatedTarget)) return;
      stopDetailTaskEdit();
    });
  });
}

function updateDetailTasks(project, taskSnapshot = getProjectTaskSnapshot(project)) {
  const detailTasks = taskSnapshot.tasks.length ? taskSnapshot.tasks : project.tasks;
  detailEls.tasks.innerHTML = renderTaskListMarkup(detailTasks);
  bindTaskCheckboxes();
  bindDetailTaskEditors(project);
}

function refreshProjectTaskSurfaces(project, taskSnapshot = getProjectTaskSnapshot(project)) {
  updateDetailTasks(project, taskSnapshot);
  renderTasksPage(project);
}

function applyProjectToDetail(project) {
  updateDetailHeader(project);
  updateDetailProgress(project);
  refreshProjectTaskSurfaces(project);
  updateDetailRemark(project);
}

function closeActiveDetailEditor(options = {}) {
  const { commit = true } = options;
  const editorState = state.activeDetailEditor;
  if (!editorState) return;

  const { control, restore, originalValue, onCommit, onCancel, multiline } = editorState;
  const nextValue = control.value;

  state.activeDetailEditor = null;

  if (!commit) {
    restore(originalValue);
    onCancel?.();
    return;
  }

  const normalizedValue = multiline ? nextValue.trim() : nextValue.trim();
  restore(normalizedValue);
  onCommit(normalizedValue);
}

function startDetailTaskEdit(taskId) {
  const task = state.taskData.find((item) => item.id === taskId);
  const project = getActiveProject();
  if (!task || !project) return;

  if (state.activeDetailTaskEdit?.taskId === taskId) return;
  if (state.activeDetailTaskEdit) {
    stopDetailTaskEdit();
  }

  state.activeDetailTaskEdit = {
    taskId,
    originalValue: task.title,
  };
  state.isOpeningDetailTaskEdit = true;

  updateDetailTasks(project);

  window.requestAnimationFrame(() => {
    const input = detailEls.tasks.querySelector(
      `[data-detail-task-input="true"][data-task-id="${taskId}"]`
    );

    if (input) {
      input.value = task.title || "";
      input.focus();
      input.select?.();
    }

    window.setTimeout(() => {
      state.isOpeningDetailTaskEdit = false;
    }, 0);
  });
}

function stopDetailTaskEdit(options = {}) {
  const { commit = true } = options;
  const editState = state.activeDetailTaskEdit;
  if (!editState) return;
  if (state.isOpeningDetailTaskEdit) return;

  const task = state.taskData.find((item) => item.id === editState.taskId);
  const project = getActiveProject();
  const input = detailEls.tasks.querySelector(
    `[data-detail-task-input="true"][data-task-id="${editState.taskId}"]`
  );
  const rawValue = input?.value ?? task?.title ?? editState.originalValue;
  const nextValue = rawValue.trim() || editState.originalValue;
  const changed = Boolean(task) && nextValue !== editState.originalValue;

  if (task) {
    task.title = commit ? nextValue : editState.originalValue;
  }

  state.activeDetailTaskEdit = null;

  if (project) {
    refreshProjectTaskSurfaces(project);
  }

  if (commit && changed) {
    persistTaskData();
  }
}

function openDetailTextEditor(element, options) {
  const {
    value,
    multiline = false,
    className = "",
    closeOnBlur = true,
    onCommit,
    onCancel,
  } = options;

  if (!element) return;

  if (state.activeDetailEditor?.element === element) return;
  closeActiveDetailEditor();

  const initialValue = typeof value === "string" ? value : element.textContent || "";
  const editor = document.createElement(multiline ? "textarea" : "input");
  editor.className = ["detail-inline-editor", className].filter(Boolean).join(" ");
  if (!multiline) {
    editor.type = "text";
  } else {
    editor.rows = 1;
  }

  const computed = window.getComputedStyle(element);
  editor.value = initialValue;
  editor.setAttribute("aria-label", "Edit detail content");
  editor.style.font = computed.font;
  editor.style.fontSize = computed.fontSize;
  editor.style.fontWeight = computed.fontWeight;
  editor.style.lineHeight = computed.lineHeight;
  editor.style.letterSpacing = computed.letterSpacing;
  editor.style.color = computed.color;
  editor.style.textAlign = computed.textAlign;

  const restore = (nextValue) => {
    element.textContent = nextValue;
  };

  element.textContent = "";
  element.appendChild(editor);

  const resizeTextarea = () => {
    if (!multiline) return;
    editor.style.height = "0px";
    editor.style.height = `${editor.scrollHeight}px`;
  };

  state.activeDetailEditor = {
    element,
    control: editor,
    originalValue: initialValue,
    restore,
    onCommit,
    onCancel,
    multiline,
  };

  editor.addEventListener("click", (event) => event.stopPropagation());
  editor.addEventListener("input", () => {
    resizeTextarea();
  });
  editor.addEventListener("blur", () => {
    if (!closeOnBlur) return;
    window.setTimeout(() => {
      if (state.activeDetailEditor?.control === editor) {
        closeActiveDetailEditor();
      }
    }, 0);
  });
  editor.addEventListener("keydown", (event) => {
    event.stopPropagation();

    if (event.key === "Escape") {
      event.preventDefault();
      closeActiveDetailEditor({ commit: false });
      return;
    }

    if (!multiline && event.key === "Enter") {
      event.preventDefault();
      closeActiveDetailEditor();
      return;
    }

    if (multiline && event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
      event.preventDefault();
      closeActiveDetailEditor();
    }
  });

  resizeTextarea();

  window.requestAnimationFrame(() => {
    editor.focus();
    editor.setSelectionRange(editor.value.length, editor.value.length);
  });
}

function startCellEdit(projectId, field) {
  if (state.activeEditCell?.projectId === projectId && state.activeEditCell?.field === field) {
    stopCellEdit();
    return;
  }

  state.activeEditCell = { projectId, field };
  state.editSessionDirty = false;
  state.editSessionTaskDirty = false;
  replaceProjectRow(projectId);
  updateFloatingChoiceMenu();

  window.requestAnimationFrame(() => {
    focusActiveCellControl();
  });
}

function stopCellEdit() {
  if (!state.activeEditCell) return;
  const projectId = state.activeEditCell.projectId;
  const shouldPersist = state.editSessionDirty;
  const shouldPersistTaskData = state.editSessionTaskDirty;
  state.activeEditCell = null;
  state.editSessionDirty = false;
  state.editSessionTaskDirty = false;
  updateFloatingChoiceMenu();
  replaceProjectRow(projectId);

  if (shouldPersist) {
    persistProjectData();
  }

  if (shouldPersistTaskData) {
    persistTaskData();
  }
}

function bindEditableCellEvents(row, project) {
  row.querySelectorAll("[data-editable='true']").forEach((control) => {
    control.addEventListener("click", (event) => {
      event.stopPropagation();
      if (isLockedField(control.dataset.field)) return;
      startCellEdit(project.id, control.dataset.field);
    });
  });

  row.querySelectorAll("input").forEach((control) => {
    control.addEventListener("click", (event) => event.stopPropagation());
    control.addEventListener("keydown", (event) => {
      event.stopPropagation();

      if (event.key === "Enter" || event.key === "Escape") {
        event.preventDefault();
        stopCellEdit();
      }
    });

    control.addEventListener("input", (event) => {
      const { field } = event.currentTarget.dataset;
      if (!field) return;

      const nextValue =
        field === "progress"
          ? clampProgress(event.currentTarget.value)
          : event.currentTarget.value;

      if (field === "progress") {
        event.currentTarget.value = nextValue;
      }

      updateProjectField(project.id, field, nextValue, { persist: false, rerenderRow: false });
    });

    control.addEventListener("blur", () => {
      window.setTimeout(() => {
        if (document.activeElement !== control) {
          stopCellEdit();
        }
      }, 0);
    });
  });
}

function renderProjectRowMarkup(project) {
  return `
    <td>${renderProjectCell(project)}</td>
    <td data-project-choice-cell="level">${renderLevelCell(project)}</td>
    <td data-project-choice-cell="status">${renderStatusCell(project)}</td>
    <td>${renderProgressCell(project)}</td>
    <td>${
      isEditingCell(project.id, "projectNo")
        ? renderTextInput(project, "projectNo", "Project number", "compact-input")
        : state.currentTableMode === "edit"
          ? renderEditableShell(
              project,
              "projectNo",
              "Edit project number",
              `<span class="project-code">${escapeHtml(project.projectNo)}</span>`
            )
          : `<span class="project-code">${escapeHtml(project.projectNo)}</span>`
    }</td>
    <td>${
      isEditingCell(project.id, "contractNo")
        ? renderTextInput(project, "contractNo", "Contract number", "compact-input")
        : state.currentTableMode === "edit"
          ? renderEditableShell(
              project,
              "contractNo",
              "Edit contract number",
              `<span class="project-code">${escapeHtml(project.contractNo)}</span>`
            )
          : `<span class="project-code">${escapeHtml(project.contractNo)}</span>`
    }</td>
    <td>
      <button class="row-delete-button" type="button" aria-label="Delete ${escapeHtml(project.name)}">
        <i data-lucide="trash-2"></i>
      </button>
    </td>
  `;
}

function bindProjectRowEvents(row, project) {
  row.addEventListener("click", () => selectProject(project, row));
  const deleteButton = row.querySelector(".row-delete-button");
  const dragHandle = row.querySelector(".row-drag-handle");

  if (dragHandle) {
    dragHandle.addEventListener("click", (event) => {
      event.stopPropagation();
    });

    dragHandle.addEventListener("dragstart", (event) => {
      event.stopPropagation();
      state.draggedProjectId = project.id;
      row.classList.add("dragging");
      if (event.dataTransfer) {
        event.dataTransfer.effectAllowed = "move";
        event.dataTransfer.setData("text/plain", String(project.id));
      }
    });

    dragHandle.addEventListener("dragend", () => {
      state.draggedProjectId = null;
      row.classList.remove("dragging");
      document.querySelectorAll("tbody tr").forEach((tr) => tr.classList.remove("drag-over"));
    });
  }

  row.addEventListener("dragover", (event) => {
    if (!state.draggedProjectId || state.draggedProjectId === project.id) return;
    event.preventDefault();
    row.classList.add("drag-over");
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = "move";
    }
  });

  row.addEventListener("dragleave", () => {
    row.classList.remove("drag-over");
  });

  row.addEventListener("drop", (event) => {
    if (!state.draggedProjectId || state.draggedProjectId === project.id) return;
    event.preventDefault();
    event.stopPropagation();
    row.classList.remove("drag-over");
    moveProject(state.draggedProjectId, project.id);
    state.draggedProjectId = null;
  });

  deleteButton.addEventListener("click", (event) => {
    event.stopPropagation();
    confirmDeleteProject(project.id);
  });

  if (state.currentTableMode === "edit") {
    row.querySelectorAll("[data-project-choice-cell]").forEach((cell) => {
      cell.addEventListener("click", (event) => {
        if (event.target.closest("button, input, select, textarea, a, label")) return;
        event.stopPropagation();
        startCellEdit(project.id, cell.dataset.projectChoiceCell);
      });
    });

    bindEditableCellEvents(row, project);
  }
}

function renderProjectRowElement(project) {
  const row = document.createElement("tr");
  row.dataset.projectId = String(project.id);
  row.classList.toggle("selected", project.id === state.selectedProjectId);
  row.innerHTML = renderProjectRowMarkup(project);
  bindProjectRowEvents(row, project);
  return row;
}

function replaceProjectRow(projectId, { refreshIcons = true } = {}) {
  const project = state.projectData.find((item) => item.id === projectId);
  const currentRow = tableBody.querySelector(`tr[data-project-id="${projectId}"]`);
  if (!project || !currentRow) return null;

  const nextRow = renderProjectRowElement(project);
  currentRow.replaceWith(nextRow);
  if (refreshIcons) {
    window.lucide.createIcons();
  }
  return nextRow;
}

function insertProjectRow(project, index = state.projectData.length - 1) {
  if (!project) return null;

  const nextRow = renderProjectRowElement(project);
  const referenceRow = tableBody.children[index] || null;
  tableBody.insertBefore(nextRow, referenceRow);
  window.lucide.createIcons();
  return nextRow;
}

function removeProjectRow(projectId) {
  const currentRow = tableBody.querySelector(`tr[data-project-id="${projectId}"]`);
  if (!currentRow) return false;

  currentRow.remove();
  return true;
}

function moveProjectRow(projectId, targetProjectId, placeAfter = false) {
  const currentRow = tableBody.querySelector(`tr[data-project-id="${projectId}"]`);
  const targetRow = tableBody.querySelector(`tr[data-project-id="${targetProjectId}"]`);
  if (!currentRow || !targetRow) return null;

  if (currentRow === targetRow) return currentRow;

  const referenceRow = placeAfter ? targetRow.nextSibling : targetRow;
  tableBody.insertBefore(currentRow, referenceRow);
  return currentRow;
}

function refreshVisibleProjectRows() {
  const visibleProjectIds = Array.from(tableBody.querySelectorAll("tr[data-project-id]"))
    .map((row) => Number(row.dataset.projectId))
    .filter((projectId) => Number.isInteger(projectId));

  visibleProjectIds.forEach((projectId) => {
    replaceProjectRow(projectId, { refreshIcons: false });
  });

  window.lucide.createIcons();
}

function focusActiveCellControl() {
  if (!state.activeEditCell) return;

  const activeControl = tableBody.querySelector(
    `tr[data-project-id="${state.activeEditCell.projectId}"] [data-field="${state.activeEditCell.field}"]`
  );
  activeControl?.focus();
  if (activeControl?.select) activeControl.select();
}

function selectProject(project, row) {
  state.selectedProjectId = project.id;
  syncTaskSelectionFromProject(project.id);
  syncSelectedRow(project.id);
  if (row) row.classList.add("selected");
  applyProjectToDetail(project);
}

function restoreSelectedRow() {
  const activeProject =
    state.projectData.find((project) => project.id === state.selectedProjectId) ||
    state.projectData[0];
  if (!activeProject) return;

  const activeRow = document.querySelector(`tbody tr[data-project-id="${activeProject.id}"]`);
  if (activeRow) {
    syncSelectedRow(activeProject.id);
  }
}

async function copyText(value) {
  try {
    await navigator.clipboard.writeText(value);
  } catch (_error) {
    const textarea = document.createElement("textarea");
    textarea.value = value;
    textarea.setAttribute("readonly", "");
    textarea.style.position = "absolute";
    textarea.style.left = "-9999px";
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand("copy");
    document.body.removeChild(textarea);
  }
}

function buildDetailCopyText(project) {
  return [project.name, project.projectNo || "", project.contractNo || ""].join("    ");
}

async function copyProjectSummary(project) {
  const payload = buildDetailCopyText(project);
  await copyText(payload);

  state.copiedProjectName = project.name;
  const activeProject = getActiveProject();
  if (activeProject) {
    updateDetailHeaderActions(activeProject);
    window.lucide.createIcons();
  }

  window.setTimeout(() => {
    if (state.copiedProjectName !== project.name) return;
    state.copiedProjectName = null;
    const currentProject = getActiveProject();
    if (currentProject) {
      updateDetailHeaderActions(currentProject);
      window.lucide.createIcons();
    }
  }, 2200);
}

async function copyDetailMeta(field, value) {
  if (!value) return;

  await copyText(value);

  state.copiedDetailMeta = { field, value };
  const activeProject = getActiveProject();
  if (activeProject) {
    updateDetailHeader(activeProject);
  }

  window.setTimeout(() => {
    if (
      !state.copiedDetailMeta ||
      state.copiedDetailMeta.field !== field ||
      state.copiedDetailMeta.value !== value
    ) {
      return;
    }

    state.copiedDetailMeta = null;
    const currentProject = getActiveProject();
    if (currentProject) {
      updateDetailHeader(currentProject);
    }
  }, 2200);
}

function flashExportFeedback(projectId) {
  state.exportedProjectId = projectId;
  const activeProject = getActiveProject();
  if (activeProject) {
    updateDetailHeader(activeProject);
  }

  window.setTimeout(() => {
    if (state.exportedProjectId !== projectId) return;
    state.exportedProjectId = null;
    const currentProject = getActiveProject();
    if (currentProject) {
      updateDetailHeader(currentProject);
    }
  }, 2200);
}

function deleteProject(projectId) {
  const index = state.projectData.findIndex((project) => project.id === projectId);
  if (index === -1) return;

  if (state.activeEditCell?.projectId === projectId) {
    state.activeEditCell = null;
    state.editSessionDirty = false;
    updateFloatingChoiceMenu();
  }

  state.projectData.splice(index, 1);
  removeProjectRow(projectId);

  if (state.selectedProjectId === projectId) {
    state.selectedProjectId = state.projectData[0]?.id || null;
  }

  syncTaskSelectionFromProject(state.selectedProjectId);
  syncDetailPanel();
  persistProjectData();
}

function confirmDeleteProject(projectId) {
  const project = state.projectData.find((item) => item.id === projectId);
  if (!project) return;

  const relatedTaskCount = state.taskData.filter((task) => task.projectId === projectId).length;
  const message = relatedTaskCount
    ? `项目“${project.name}”删除后将无法恢复。当前关联的 ${relatedTaskCount} 条任务会保留在任务总表中，但会失去该项目的详情联动。`
    : `项目“${project.name}”删除后将无法恢复。`;

  openConfirmDialog({
    title: "删除项目",
    message,
    confirmLabel: "删除项目",
    onConfirm: () => deleteProject(projectId),
  });
}

function moveProject(fromProjectId, toProjectId) {
  if (fromProjectId === toProjectId) return;

  const fromIndex = state.projectData.findIndex((project) => project.id === fromProjectId);
  const toIndex = state.projectData.findIndex((project) => project.id === toProjectId);
  if (fromIndex === -1 || toIndex === -1) return;

  const moveAfterTarget = fromIndex < toIndex;
  const [movedProject] = state.projectData.splice(fromIndex, 1);
  state.projectData.splice(toIndex, 0, movedProject);
  movedProject.version += 1;
  movedProject.updatedAt = new Date().toISOString();

  moveProjectRow(movedProject.id, toProjectId, moveAfterTarget);
  syncSelectedRow();

  if (state.selectedProjectId === movedProject.id || state.selectedProjectId === toProjectId) {
    const activeProject = getActiveProject();
    if (activeProject) {
      applyProjectToDetail(activeProject);
    }
  }

  persistProjectData();
}

function renderRows() {
  tableBody.innerHTML = "";

  state.projectData.forEach((project) => {
    tableBody.appendChild(renderProjectRowElement(project));
  });

  window.lucide.createIcons();
}

function syncDetailPanel() {
  if (!state.projectData.length) {
    detailEls.title.textContent = "No project selected";
    detailEls.summary.innerHTML = `
      <span class="detail-meta-value">--</span>
      <span class="detail-meta-divider" aria-hidden="true"></span>
      <span class="detail-meta-value">--</span>
    `;
    detailEls.progressText.textContent = "0%";
    detailEls.progressBar.style.width = "0%";
    detailEls.tasks.innerHTML = `<li class="detail-task-empty">Task items for the selected project will appear here.</li>`;
    detailEls.remark.textContent = "Project notes for the selected project will appear here.";
    renderTasksPage(null);
    return;
  }

  const activeProject = getActiveProject();
  if (!activeProject) return;

  syncSelectedRow(activeProject.id);
  applyProjectToDetail(activeProject);
}

function setActiveView(view) {
  navItems.forEach((item) => {
    item.classList.toggle("active", item.dataset.view === view);
  });

  appPages.forEach((page) => {
    page.classList.toggle("active", page.dataset.page === view);
  });

  persistActiveView(view);
}

function initNavigation() {
  const savedView = readActiveView();
  setActiveView(savedView);

  navItems.forEach((item) => {
    item.addEventListener("click", () => {
      setActiveView(item.dataset.view);
    });
  });
}

function setNewIslandOpen(open) {
  if (!newIsland || !newTrigger || !newIslandPanel) return;

  newIsland.classList.toggle("open", open);
  newTrigger.setAttribute("aria-expanded", String(open));
  newIslandPanel.setAttribute("aria-hidden", String(!open));

  if (open) {
    window.setTimeout(() => {
      newProjectInput?.focus();
    }, 120);
  } else if (newProjectInput) {
    newProjectInput.value = "";
  }
}

function createProjectDraft(name) {
  const nextIndex = state.projectData.length + 1;
  const now = new Date().toISOString();
  const project = {
    id: state.nextProjectId++,
    name,
    tasks: [],
    remark: "",
    projectNo: `PT-${String(24000 + nextIndex).padStart(5, "0")}`,
    contractNo: `CN-2024-${String(180 + nextIndex).padStart(4, "0")}`,
    level: "N",
    status: "in design",
    progress: 0,
    icon: "folder-open",
    version: 1,
    createdAt: now,
    updatedAt: now,
  };

  state.projectData.unshift(project);
  state.selectedProjectId = project.id;
  syncTaskSelectionFromProject(project.id);
  insertProjectRow(project, 0);
  syncDetailPanel();
  setNewIslandOpen(false);
  persistProjectData();
  renderTasksPage(project);
}

function submitNewProject() {
  if (!newProjectInput) return;

  const name = newProjectInput.value.trim();
  if (!name) {
    newProjectInput.focus();
    return;
  }

  createProjectDraft(name);
}

function initNewIsland() {
  if (!newIsland || !newTrigger || !newIslandPanel) return;

  newTrigger.addEventListener("click", () => {
    setNewIslandOpen(!newIsland.classList.contains("open"));
  });

  newIslandClose?.addEventListener("click", () => {
    setNewIslandOpen(false);
  });

  newProjectSubmit?.addEventListener("click", () => {
    submitNewProject();
  });

  newProjectInput?.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      submitNewProject();
    }
  });

  document.addEventListener("click", (event) => {
    if (!newIsland.contains(event.target)) {
      setNewIslandOpen(false);
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      setNewIslandOpen(false);
    }
  });
}

function setSidebarCollapsed(collapsed) {
  shell.classList.toggle("sidebar-collapsed", collapsed);
  sidebarToggle.setAttribute("aria-expanded", String(!collapsed));
  sidebarToggle.setAttribute("aria-label", collapsed ? "Expand sidebar" : "Collapse sidebar");
  sidebarToggle.innerHTML = `<i data-lucide="${collapsed ? "panel-left-open" : "panel-left-close"}"></i>`;
  window.lucide.createIcons();
  persistSidebarState(collapsed);
}

function initSidebarToggle() {
  if (!sidebarToggle || !shell) return;

  setSidebarCollapsed(readSidebarState());

  sidebarToggle.addEventListener("click", () => {
    const next = !shell.classList.contains("sidebar-collapsed");
    setSidebarCollapsed(next);
  });
}

function initTableDragScroll() {
  const tableWraps = document.querySelectorAll(".table-wrap");
  if (!tableWraps.length) return;

  const interactiveSelector = "button, input, select, textarea, a, label, [contenteditable='true']";

  tableWraps.forEach((currentTableWrap) => {
    const dragState = {
      active: false,
      moved: false,
      startX: 0,
      startScrollLeft: 0,
    };

    currentTableWrap.addEventListener("mousedown", (event) => {
      if (event.button !== 0) return;
      if (event.target.closest(interactiveSelector)) return;

      dragState.active = true;
      dragState.moved = false;
      dragState.startX = event.clientX;
      dragState.startScrollLeft = currentTableWrap.scrollLeft;
      currentTableWrap.classList.add("drag-scroll-ready");
    });

    window.addEventListener("mousemove", (event) => {
      if (!dragState.active) return;

      const deltaX = event.clientX - dragState.startX;
      if (!dragState.moved && Math.abs(deltaX) > 4) {
        dragState.moved = true;
        currentTableWrap.classList.add("drag-scrolling");
      }

      if (!dragState.moved) return;

      currentTableWrap.scrollLeft = dragState.startScrollLeft - deltaX;
      event.preventDefault();
    });

    window.addEventListener("mouseup", () => {
      if (!dragState.active) return;

      dragState.active = false;
      window.setTimeout(() => {
        dragState.moved = false;
      }, 0);
      currentTableWrap.classList.remove("drag-scroll-ready", "drag-scrolling");
    });

    currentTableWrap.addEventListener(
      "click",
      (event) => {
        if (!dragState.moved) return;
        event.preventDefault();
        event.stopPropagation();
      },
      true
    );

    currentTableWrap.addEventListener("mouseleave", () => {
      if (!dragState.active) {
        currentTableWrap.classList.remove("drag-scroll-ready", "drag-scrolling");
      }
    });
  });
}

function setTableMode(mode) {
  if (mode !== "edit") {
    closeActiveDetailEditor();
    stopDetailTaskEdit();
    stopTaskCellEdit({ commit: true });
  }

  state.currentTableMode = mode === "edit" ? "edit" : "read";
  if (state.currentTableMode !== "edit") {
    state.activeEditCell = null;
    state.activeTaskEditCell = null;
    state.activeDetailTaskEdit = null;
  }

  modeButtons.forEach((button) => {
    const active = button.dataset.mode === state.currentTableMode;
    button.classList.toggle("active", active);
    button.setAttribute("aria-pressed", String(active));
  });

  shell.dataset.mode = state.currentTableMode;
  document.body.dataset.mode = state.currentTableMode;

  persistTableMode(state.currentTableMode);
  refreshVisibleProjectRows();
  syncDetailPanel();
  updateFloatingChoiceMenu();

  if (state.currentTableMode === "edit" && state.activeEditCell) {
    window.requestAnimationFrame(() => {
      focusActiveCellControl();
    });
  }
}

function initTableModeToggle() {
  modeButtons.forEach((button) => {
    button.addEventListener("click", () => {
      setTableMode(button.dataset.mode);
    });
  });

  setTableMode(state.currentTableMode);
}

function initGlobalEvents() {
  detailCopyButton?.addEventListener("click", async (event) => {
    event.stopPropagation();
    const activeProject = getActiveProject();
    if (!activeProject) return;
    await copyProjectSummary(activeProject);
  });

  detailEls.summary?.addEventListener("click", async (event) => {
    const button = event.target.closest("[data-detail-copy-field]");
    if (!button || button.disabled) return;

    event.stopPropagation();
    await copyDetailMeta(button.dataset.detailCopyField, button.dataset.detailCopyValue || "");
  });

  detailExportButton?.addEventListener("click", (event) => {
    event.stopPropagation();
    const activeProject = getActiveProject();
    if (!activeProject) return;
    flashExportFeedback(activeProject.id);
  });

  detailEls.tasks?.addEventListener("click", (event) => {
    if (event.target.closest("[data-detail-task-input='true']")) {
      event.stopPropagation();
      return;
    }

    const editable = event.target.closest("[data-detail-editable='taskTitle']");
    if (!editable || state.currentTableMode !== "edit") return;

    event.preventDefault();
    event.stopPropagation();
    const taskId = Number.parseInt(editable.dataset.taskId, 10);
    if (Number.isNaN(taskId)) return;
    startDetailTaskEdit(taskId);
  });

  detailEls.tasks?.addEventListener("keydown", (event) => {
    const editable = event.target.closest("[data-detail-editable='taskTitle']");
    if (editable) {
      if (event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      event.stopPropagation();
      const taskId = Number.parseInt(editable.dataset.taskId, 10);
      if (Number.isNaN(taskId)) return;
      startDetailTaskEdit(taskId);
      return;
    }

    const input = event.target.closest("[data-detail-task-input='true']");
    if (!input) return;

    event.stopPropagation();
    if (event.key === "Enter") {
      event.preventDefault();
      stopDetailTaskEdit();
      return;
    }

    if (event.key === "Escape") {
      event.preventDefault();
      stopDetailTaskEdit({ commit: false });
    }
  });

  detailEls.tasks?.addEventListener("focusout", (event) => {
    const input = event.target.closest("[data-detail-task-input='true']");
    if (!input || !state.activeDetailTaskEdit) return;
    if (state.isOpeningDetailTaskEdit) return;
    if (event.relatedTarget && input.contains(event.relatedTarget)) return;
    stopDetailTaskEdit();
  });

  document.addEventListener("click", (event) => {
    if (!state.activeEditCell) return;
    if (event.target.closest(".floating-choice-menu")) return;
    if (event.target.closest("[data-editable='true']")) return;
    if (event.target.closest("[data-field]")) return;
    stopCellEdit();
  });

  document.addEventListener("click", (event) => {
    if (!state.activeTaskEditCell) return;
    if (state.isOpeningTaskCellEdit && !usesTaskChoiceMenu(state.activeTaskEditCell.field)) return;
    if (event.target.closest(".floating-choice-menu")) return;
    if (event.target.closest("[data-task-editable='true']")) return;
    if (event.target.closest("[data-task-field]")) return;
    stopTaskCellEdit();
  });

  document.addEventListener("click", (event) => {
    if (!state.activeDetailEditor) return;
    if (event.target === state.activeDetailEditor.control) return;
    if (state.activeDetailEditor.element.contains(event.target)) return;
    closeActiveDetailEditor();
  });

  document.addEventListener("click", (event) => {
    if (!state.activeDetailTaskEdit) return;
    if (state.isOpeningDetailTaskEdit) return;
    if (event.target.closest("[data-detail-task-input='true']")) return;
    stopDetailTaskEdit();
  });

  window.addEventListener("resize", () => {
    updateFloatingChoiceMenu();
  });

  window.addEventListener(
    "scroll",
    () => {
      updateFloatingChoiceMenu();
    },
    true
  );
}

export async function initApp() {
  initializeProjectData([]);
  initializeTaskData([]);
  renderRows();
  restoreSelectedRow();
  initSidebarToggle();
  initNavigation();
  initNewIsland();
  initTableDragScroll();
  initTableModeToggle();
  initGlobalEvents();
  await loadProjectData();
}
