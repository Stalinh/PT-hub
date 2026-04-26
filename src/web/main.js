import {
  LEVEL_OPTIONS,
  PROJECT_DATA_ENDPOINT,
  STATUS_OPTIONS,
  TASK_DATA_ENDPOINT,
  defaultProjectData,
} from "./constants.js";
import {
  appPages,
  dataStatusDot,
  dataStatusText,
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
import { clampProgress, escapeHtml, levelClass, statusClass } from "./utils.js";

const state = {
  projectData: [],
  taskData: [],
  nextProjectId: 1,
  copiedProjectName: null,
  copiedDetailMeta: null,
  exportedProjectId: null,
  selectedProjectId: null,
  currentTableMode: readTableMode(),
  activeEditCell: null,
  activeDetailEditor: null,
  activeDetailTaskEdit: null,
  editSessionDirty: false,
  draggedProjectId: null,
  saveChain: Promise.resolve(),
  saveRequestCounter: 0,
  latestCompletedSave: 0,
};

const floatingChoiceMenu = document.createElement("div");
floatingChoiceMenu.className = "floating-choice-menu";
floatingChoiceMenu.hidden = true;
document.body.appendChild(floatingChoiceMenu);

function cloneDefaultProjectData() {
  return defaultProjectData.map((project) => ({ ...project }));
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
                type="checkbox"
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
  return {
    id: Number.isInteger(item?.id) ? item.id : fallbackId,
    projectId: Number.isInteger(item?.projectId) ? item.projectId : 0,
    title: typeof item?.title === "string" ? item.title : `Task ${fallbackId}`,
    owner: typeof item?.owner === "string" ? item.owner : "",
    status: ["todo", "in progress", "done"].includes(item?.status) ? item.status : "todo",
    dueDate: typeof item?.dueDate === "string" ? item.dueDate : "",
    note: typeof item?.note === "string" ? item.note : "",
  };
}

function initializeTaskData(list) {
  state.taskData = Array.isArray(list) ? list.map((task, index) => normalizeTask(task, index + 1)) : [];
}

function getProjectTasks(projectId) {
  return state.taskData.filter((task) => task.projectId === projectId);
}

function getTaskStatusClass(status) {
  if (status === "done") return "task-status-done";
  if (status === "in progress") return "task-status-progress";
  return "task-status-todo";
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
  const requestId = ++state.saveRequestCounter;
  const payload = serializeTaskData();

  setDataStatus("saving", "Saving task data...");

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
        setDataStatus("saved", "Task data saved.");
      }

      return result;
    })
    .catch((error) => {
      if (requestId >= state.latestCompletedSave) {
        setDataStatus("error", error.message || "Failed to save task data.");
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
    checkbox.onchange = (event) => {
      event.stopPropagation();
      const taskId = Number.parseInt(checkbox.dataset.taskId, 10);
      if (Number.isNaN(taskId)) return;
      toggleTaskDone(taskId, checkbox.checked);
    };
  });
}

function toggleTaskDone(taskId, checked) {
  const task = state.taskData.find((item) => item.id === taskId);
  if (!task) return;

  task.status = checked ? "done" : "todo";

  const activeProject =
    state.projectData.find((project) => project.id === state.selectedProjectId) ||
    state.projectData[0] ||
    null;

  if (activeProject) {
    applyProjectToDetail(activeProject);
  } else {
    renderTasksPage(null);
  }

  persistTaskData();
}

function renderTasksPage(project) {
  if (!tasksPageEls.title || !tasksPageEls.list) return;

  if (!project) {
    tasksPageEls.title.textContent = "No project selected";
    tasksPageEls.summary.innerHTML = `
      <span class="detail-meta-value">--</span>
      <span class="detail-meta-divider" aria-hidden="true"></span>
      <span class="detail-meta-value">--</span>
    `;
    tasksPageEls.openCount.textContent = "0";
    tasksPageEls.progressCount.textContent = "0";
    tasksPageEls.doneCount.textContent = "0";
    tasksPageEls.list.innerHTML = `<article class="task-card empty"><p>No tasks available.</p></article>`;
    return;
  }

  const tasks = getProjectTasks(project.id);
  const openCount = tasks.filter((task) => task.status !== "done").length;
  const progressCount = tasks.filter((task) => task.status === "in progress").length;
  const doneCount = tasks.filter((task) => task.status === "done").length;

  tasksPageEls.title.textContent = project.name;
  tasksPageEls.summary.innerHTML = renderProjectMetaMarkup(project);
  tasksPageEls.openCount.textContent = String(openCount);
  tasksPageEls.progressCount.textContent = String(progressCount);
  tasksPageEls.doneCount.textContent = String(doneCount);
  tasksPageEls.list.innerHTML = tasks.length
    ? tasks
        .map(
          (task) => `
            <article class="task-card">
              <div class="task-card-top">
                <div>
                  <label class="task-card-title-row">
                    <input
                      type="checkbox"
                      data-task-checkbox="true"
                      data-task-id="${task.id}"
                      ${task.status === "done" ? "checked" : ""}
                    />
                    <span class="task-check-box" aria-hidden="true"></span>
                    <h4 class="${task.status === "done" ? "is-done" : ""}">${escapeHtml(task.title)}</h4>
                  </label>
                  <p>${escapeHtml(task.note)}</p>
                </div>
                <span class="task-status ${getTaskStatusClass(task.status)}">${escapeHtml(task.status)}</span>
              </div>
              <div class="task-card-meta">
                <span><i data-lucide="user-round"></i>${escapeHtml(task.owner || "Unassigned")}</span>
                <span><i data-lucide="calendar-days"></i>${escapeHtml(task.dueDate || "--")}</span>
              </div>
            </article>
          `
        )
        .join("")
    : `<article class="task-card empty"><p>No task samples for this project.</p></article>`;

  window.lucide.createIcons();
  bindTaskCheckboxes();
}

function initializeProjectData(list) {
  const source = Array.isArray(list) ? list : cloneDefaultProjectData();
  state.projectData = source.map((project, index) => normalizeProject(project, index + 1));
  state.nextProjectId =
    state.projectData.reduce((maxId, project) => Math.max(maxId, project.id), 0) + 1;
  state.selectedProjectId = state.projectData[0]?.id || null;
}

function setDataStatus(status, message) {
  if (!dataStatusText || !dataStatusDot) return;
  dataStatusText.textContent = message;
  dataStatusDot.dataset.state = status;
}

function serializeProjectData() {
  return {
    projectData: state.projectData.map((project) => ({ ...project })),
  };
}

async function persistProjectData() {
  const requestId = ++state.saveRequestCounter;
  const payload = serializeProjectData();

  setDataStatus("saving", "Saving project data...");

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
        setDataStatus("saved", "Project data saved.");
      }

      return result;
    })
    .catch((error) => {
      if (requestId >= state.latestCompletedSave) {
        setDataStatus("error", error.message || "Failed to save project data.");
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
  setDataStatus("loading", "Loading project data...");

  try {
    const [projectResponse, taskResponse] = await Promise.all([
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

    const projectResult = await projectResponse.json().catch(() => ({}));
    const taskResult = await taskResponse.json().catch(() => ({}));
    if (!projectResponse.ok) {
      throw new Error(projectResult.error || "Failed to load project data.");
    }

    if (!taskResponse.ok) {
      throw new Error(taskResult.error || "Failed to load task data.");
    }

    initializeProjectData(projectResult.projectData);
    initializeTaskData(taskResult.taskData);
    renderRows();
    syncDetailPanel();
    setDataStatus("saved", "Project data loaded.");
  } catch (error) {
    initializeProjectData(cloneDefaultProjectData());
    initializeTaskData([]);
    renderRows();
    syncDetailPanel();
    setDataStatus("error", error.message || "Failed to load project data.");
  }
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
      <i data-lucide="chevron-down"></i>
    </button>
  `;
}

function updateProjectField(projectId, field, value, options = {}) {
  const { persist = true } = options;
  const project = state.projectData.find((item) => item.id === projectId);
  if (!project) return;

  if (field === "progress") {
    project.progress = clampProgress(value);
  } else {
    project[field] = value;
  }

  project.version += 1;
  project.updatedAt = new Date().toISOString();

  if (project.id === state.selectedProjectId) {
    applyProjectToDetail(project);
  }

  if (persist) {
    persistProjectData();
  } else {
    state.editSessionDirty = true;
  }
}

function updateFloatingChoiceMenu() {
  if (!state.activeEditCell || !isChoiceField(state.activeEditCell.field)) {
    floatingChoiceMenu.hidden = true;
    floatingChoiceMenu.innerHTML = "";
    return;
  }

  const project = state.projectData.find((item) => item.id === state.activeEditCell.projectId);
  const trigger = tableBody.querySelector(
    `tr[data-project-id="${state.activeEditCell.projectId}"] [data-field="${state.activeEditCell.field}"]`
  );

  if (!project || !trigger) {
    floatingChoiceMenu.hidden = true;
    floatingChoiceMenu.innerHTML = "";
    return;
  }

  const { label, options, renderOption } = getChoiceConfig(state.activeEditCell.field);
  const optionMarkup = options
    .map((option) => {
      const selected = project[state.activeEditCell.field] === option;

      return `
        <button
          class="choice-option ${selected ? "active" : ""}"
          type="button"
          data-choice-option="true"
          data-field="${state.activeEditCell.field}"
          data-value="${escapeHtml(option)}"
          aria-label="${escapeHtml(`${label}: ${option}`)}"
        >
          ${renderOption(option)}
        </button>
      `;
    })
    .join("");

  floatingChoiceMenu.innerHTML = `<div class="choice-menu">${optionMarkup}</div>`;

  const rect = trigger.getBoundingClientRect();
  const viewportPadding = 12;
  floatingChoiceMenu.style.minWidth = "0px";
  floatingChoiceMenu.style.top = "0px";
  floatingChoiceMenu.style.left = "0px";
  floatingChoiceMenu.hidden = false;

  const menuRect = floatingChoiceMenu.getBoundingClientRect();
  const fitsBelow = rect.bottom + 8 + menuRect.height <= window.innerHeight - viewportPadding;
  const top = fitsBelow
    ? rect.bottom + 8
    : Math.max(viewportPadding, rect.top - menuRect.height - 8);
  const left = Math.min(rect.left, window.innerWidth - menuRect.width - viewportPadding);

  floatingChoiceMenu.style.top = `${top}px`;
  floatingChoiceMenu.style.left = `${Math.max(viewportPadding, left)}px`;

  floatingChoiceMenu.querySelectorAll("[data-choice-option='true']").forEach((control) => {
    control.addEventListener("click", (event) => {
      event.stopPropagation();
      updateProjectField(project.id, control.dataset.field, control.dataset.value, {
        persist: false,
      });
      stopCellEdit();
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

function applyProjectToDetail(project) {
  const tasks = getProjectTasks(project.id);
  detailEls.remark.classList.remove("detail-editable-target");
  detailEls.remark.removeAttribute("tabindex");
  detailEls.remark.onclick = null;
  detailEls.title.textContent = project.name;
  detailEls.summary.innerHTML = renderProjectMetaMarkup(project);
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
  detailEls.progressText.textContent = `${project.progress}%`;
  detailEls.progressBar.style.width = `${project.progress}%`;
  detailEls.tasks.innerHTML = renderTaskListMarkup(tasks.length ? tasks : project.tasks);
  detailEls.remark.textContent = project.remark;
  renderTasksPage(project);
  bindTaskCheckboxes();
  bindDetailEditors(project);
  window.lucide.createIcons();
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

  applyProjectToDetail(project);

  window.requestAnimationFrame(() => {
    const input = detailEls.tasks.querySelector(
      `[data-detail-task-input="true"][data-task-id="${taskId}"]`
    );
    input?.focus();
    input?.select?.();
  });
}

function stopDetailTaskEdit(options = {}) {
  const { commit = true } = options;
  const editState = state.activeDetailTaskEdit;
  if (!editState) return;

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
    applyProjectToDetail(project);
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

function bindDetailEditors(project) {
  if (state.currentTableMode !== "edit") return;

  const attachTextEditor = (element, options) => {
    if (!element) return;

    element.classList.add("detail-editable-target");
    element.tabIndex = 0;
    element.onclick = (event) => {
      event.preventDefault();
      event.stopPropagation();
      openDetailTextEditor(element, options());
    };
    element.onkeydown = (event) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      element.click();
    };
  };

  attachTextEditor(detailEls.remark, () => ({
    value: project.remark,
    multiline: true,
    className: "detail-inline-copy",
    onCommit: (nextValue) => {
      updateProjectField(project.id, "remark", nextValue);
      renderRows();
      syncDetailPanel();
    },
    onCancel: () => applyProjectToDetail(project),
  }));

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

function startCellEdit(projectId, field) {
  state.activeEditCell = { projectId, field };
  state.editSessionDirty = false;
  renderRows();
  syncDetailPanel();
  updateFloatingChoiceMenu();

  window.requestAnimationFrame(() => {
    const activeControl = tableBody.querySelector(
      `tr[data-project-id="${projectId}"] [data-field="${field}"]`
    );
    activeControl?.focus();
    if (activeControl?.select) activeControl.select();
  });
}

function stopCellEdit() {
  if (!state.activeEditCell) return;
  const shouldPersist = state.editSessionDirty;
  state.activeEditCell = null;
  state.editSessionDirty = false;
  updateFloatingChoiceMenu();
  renderRows();
  syncDetailPanel();

  if (shouldPersist) {
    persistProjectData();
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

      updateProjectField(project.id, field, nextValue, { persist: false });
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

function selectProject(project, row) {
  state.selectedProjectId = project.id;
  document.querySelectorAll("tbody tr").forEach((tr) => tr.classList.remove("selected"));
  row.classList.add("selected");
  applyProjectToDetail(project);
}

function restoreSelectedRow() {
  const activeProject =
    state.projectData.find((project) => project.id === state.selectedProjectId) ||
    state.projectData[0];
  if (!activeProject) return;

  const activeRow = document.querySelector(`tbody tr[data-project-id="${activeProject.id}"]`);
  if (activeRow) {
    selectProject(activeProject, activeRow);
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
  renderRows();
  restoreSelectedRow();

  window.setTimeout(() => {
    if (state.copiedProjectName !== project.name) return;
    state.copiedProjectName = null;
    renderRows();
    restoreSelectedRow();
  }, 2200);
}

async function copyDetailMeta(field, value) {
  if (!value) return;

  await copyText(value);

  state.copiedDetailMeta = { field, value };
  const activeProject = getActiveProject();
  if (activeProject) {
    applyProjectToDetail(activeProject);
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
      applyProjectToDetail(currentProject);
    }
  }, 2200);
}

function flashExportFeedback(projectId) {
  state.exportedProjectId = projectId;
  const activeProject = getActiveProject();
  if (activeProject) {
    applyProjectToDetail(activeProject);
  }

  window.setTimeout(() => {
    if (state.exportedProjectId !== projectId) return;
    state.exportedProjectId = null;
    const currentProject = getActiveProject();
    if (currentProject) {
      applyProjectToDetail(currentProject);
    }
  }, 2200);
}

function deleteProject(projectId) {
  const index = state.projectData.findIndex((project) => project.id === projectId);
  if (index === -1) return;

  state.projectData.splice(index, 1);
  if (state.selectedProjectId === projectId) {
    state.selectedProjectId = state.projectData[0]?.id || null;
  }

  renderRows();
  syncDetailPanel();
  persistProjectData();
}

function moveProject(fromProjectId, toProjectId) {
  if (fromProjectId === toProjectId) return;

  const fromIndex = state.projectData.findIndex((project) => project.id === fromProjectId);
  const toIndex = state.projectData.findIndex((project) => project.id === toProjectId);
  if (fromIndex === -1 || toIndex === -1) return;

  const [movedProject] = state.projectData.splice(fromIndex, 1);
  state.projectData.splice(toIndex, 0, movedProject);
  movedProject.version += 1;
  movedProject.updatedAt = new Date().toISOString();
  renderRows();
  syncDetailPanel();
  persistProjectData();
}

function renderRows() {
  tableBody.innerHTML = "";

  state.projectData.forEach((project) => {
    const row = document.createElement("tr");
    row.dataset.projectId = String(project.id);
    if (project.id === state.selectedProjectId) row.classList.add("selected");

    row.innerHTML = `
      <td>${renderProjectCell(project)}</td>
      <td>${renderLevelCell(project)}</td>
      <td>${renderStatusCell(project)}</td>
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
      deleteProject(project.id);
    });

    if (state.currentTableMode === "edit") {
      bindEditableCellEvents(row, project);
    }

    tableBody.appendChild(row);
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
    detailEls.tasks.innerHTML = `<li class="detail-task-empty">新增项目后，这里会显示当前任务列表。</li>`;
    detailEls.remark.textContent = "新增项目后，这里会显示当前项目的备注说明。";
    renderTasksPage(null);
    return;
  }

  restoreSelectedRow();
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
    tasks: ["补充首批执行任务", "确认负责人和时间节点", "整理项目启动前提条件"],
    remark: "补充项目目标、负责人和关键里程碑后，再进入正式执行。",
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
  renderRows();
  syncDetailPanel();
  setNewIslandOpen(false);
  persistProjectData();
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

function setTableMode(mode) {
  if (mode !== "edit") {
    closeActiveDetailEditor();
    stopDetailTaskEdit();
  }

  state.currentTableMode = mode === "edit" ? "edit" : "read";
  if (state.currentTableMode !== "edit") state.activeEditCell = null;

  modeButtons.forEach((button) => {
    const active = button.dataset.mode === state.currentTableMode;
    button.classList.toggle("active", active);
    button.setAttribute("aria-pressed", String(active));
  });

  persistTableMode(state.currentTableMode);
  renderRows();
  syncDetailPanel();
  updateFloatingChoiceMenu();
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

  document.addEventListener("click", (event) => {
    if (!state.activeEditCell) return;
    if (event.target.closest(".floating-choice-menu")) return;
    stopCellEdit();
  });

  document.addEventListener("click", (event) => {
    if (!state.activeDetailEditor) return;
    if (event.target === state.activeDetailEditor.control) return;
    if (state.activeDetailEditor.element.contains(event.target)) return;
    closeActiveDetailEditor();
  });

  document.addEventListener("click", (event) => {
    if (!state.activeDetailTaskEdit) return;
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
  initializeProjectData(cloneDefaultProjectData());
  initializeTaskData([]);
  renderRows();
  restoreSelectedRow();
  initSidebarToggle();
  initNavigation();
  initNewIsland();
  initTableModeToggle();
  initGlobalEvents();
  await loadProjectData();
}
