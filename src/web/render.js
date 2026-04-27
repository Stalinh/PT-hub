import { LEVEL_OPTIONS, STATUS_OPTIONS, TASK_STATUS_OPTIONS } from "./constants.js";
import { escapeHtml, levelClass, statusClass, taskStatusClass } from "./utils.js";

export function renderTaskListMarkup(tasks, state) {
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

export function getTaskStatusClass(status) {
  return taskStatusClass(status);
}

export function isEditingTaskCell(state, taskId, field) {
  return state.activeTaskEditCell?.taskId === taskId && state.activeTaskEditCell?.field === field;
}

export function isTaskChoiceField(field) {
  return field === "status";
}

export function usesTaskChoiceMenu(field) {
  return isTaskChoiceField(field);
}

export function renderTaskTextInput(task, field, label, extraClass = "") {
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

export function renderTaskEditableShell(task, field, label, content, extraClass = "") {
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

export function renderTaskStatusTrigger(state, task) {
  return `
    <button
      class="choice-trigger task-status-trigger status ${getTaskStatusClass(task.status)} ${isEditingTaskCell(state, task.id, "status") ? "active" : ""}"
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

export function renderTaskTitleCell(state, task) {
  const titleMarkup = isEditingTaskCell(state, task.id, "title")
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

export function renderTaskProjectCell(task, getTaskProjectView) {
  const projectView = getTaskProjectView(task);
  return `<div><span class="project-name">${escapeHtml(projectView.name)}</span></div>`;
}

export function renderTaskOwnerCell(state, task) {
  if (isEditingTaskCell(state, task.id, "owner")) {
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

export function renderTaskStatusCell(state, task) {
  const content = `<span class="status ${getTaskStatusClass(task.status)}">${escapeHtml(task.status)}</span>`;
  return state.currentTableMode === "edit" ? renderTaskStatusTrigger(state, task) : content;
}

export function renderTaskDueDateCell(state, task) {
  if (isEditingTaskCell(state, task.id, "dueDate")) {
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

export function renderTaskRowMarkup(state, task, { getTaskProjectView }) {
  return `
    <td>${renderTaskTitleCell(state, task)}</td>
    <td data-task-choice-cell="status">${renderTaskStatusCell(state, task)}</td>
    <td>${renderTaskProjectCell(task, getTaskProjectView)}</td>
    <td>${renderTaskOwnerCell(state, task)}</td>
    <td>${renderTaskDueDateCell(state, task)}</td>
    <td>
      <button class="row-delete-button task-row-delete-button" type="button" data-task-delete-id="${task.id}" aria-label="Delete ${escapeHtml(task.title)}">
        <i data-lucide="trash-2"></i>
      </button>
    </td>
  `;
}

export function renderProjectMetaMarkup(project, state) {
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

export function renderTextInput(project, field, label, extraClass = "") {
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

export function isChoiceField(field) {
  return field === "level" || field === "status";
}

export function isLockedField(field) {
  return field === "progress";
}

export function getChoiceConfig(field) {
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

export function getTaskChoiceConfig(field) {
  return {
    label: "Task status",
    options: TASK_STATUS_OPTIONS,
    renderOption: (option) =>
      `<span class="status ${getTaskStatusClass(option)}">${escapeHtml(option)}</span>`,
  };
}

export function isEditingCell(state, projectId, field) {
  return (
    state.activeEditCell?.projectId === projectId && state.activeEditCell?.field === field
  );
}

export function renderChoiceTrigger(state, project, field) {
  const { label, renderOption } = getChoiceConfig(field);
  const value = typeof project[field] === "string" ? project[field].trim() : "";

  return `
    <button
      class="choice-trigger ${isEditingCell(state, project.id, field) ? "active" : ""}"
      type="button"
      data-editable="true"
      data-project-id="${project.id}"
      data-field="${field}"
      aria-label="${escapeHtml(label)}"
    >
      <span class="choice-trigger-value">${value ? renderOption(value) : ""}</span>
    </button>
  `;
}

export function renderProgressInput(project) {
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

export function renderEditableShell(project, field, label, content, extraClass = "") {
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

export function renderProjectCell(state, project) {
  const projectNameMarkup = isEditingCell(state, project.id, "name")
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

export function renderLevelCell(state, project) {
  const content = project.level
    ? `<span class="pill ${levelClass(project.level)}">${escapeHtml(project.level)}</span>`
    : "";
  return state.currentTableMode === "edit" ? renderChoiceTrigger(state, project, "level") : content;
}

export function renderStatusCell(state, project) {
  const content = project.status
    ? `<span class="status ${statusClass(project.status)}">${escapeHtml(project.status)}</span>`
    : "";
  return state.currentTableMode === "edit" ? renderChoiceTrigger(state, project, "status") : content;
}

export function renderProgressCell(project) {
  return `
    <div class="progress-cell">
      <div class="progress-track"><span style="width: ${project.progress}%"></span></div>
      <strong>${project.progress}%</strong>
    </div>
  `;
}

export function renderProjectRowMarkup(state, project) {
  return `
    <td>${renderProjectCell(state, project)}</td>
    <td data-project-choice-cell="level">${renderLevelCell(state, project)}</td>
    <td data-project-choice-cell="status">${renderStatusCell(state, project)}</td>
    <td>${renderProgressCell(project)}</td>
    <td>${
      isEditingCell(state, project.id, "projectNo")
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
      isEditingCell(state, project.id, "contractNo")
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
      <button
        class="row-delete-button"
        type="button"
        aria-label="Delete project ${escapeHtml(project.name)}"
        title="Delete project ${escapeHtml(project.name)}"
      >
        <i data-lucide="trash-2"></i>
      </button>
    </td>
  `;
}
