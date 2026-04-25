const projects = [
  {
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

const tableBody = document.getElementById("project-table");
const shell = document.querySelector(".shell");
const sidebarToggle = document.getElementById("sidebar-toggle");
const navItems = document.querySelectorAll(".nav-item[data-view]");
const appPages = document.querySelectorAll(".app-page");
const newIsland = document.getElementById("new-island");
const newTrigger = document.getElementById("new-trigger");
const newIslandPanel = document.getElementById("new-island-panel");
const newIslandClose = document.getElementById("new-island-close");
const newProjectInput = document.getElementById("new-project-input");
const newProjectSubmit = document.getElementById("new-project-submit");
const modeButtons = document.querySelectorAll(".mode-button[data-mode]");
const detailEls = {
  title: document.getElementById("detail-title"),
  summary: document.getElementById("detail-summary"),
  progressText: document.getElementById("detail-progress-text"),
  progressBar: document.getElementById("detail-progress-bar"),
  date: document.getElementById("detail-date"),
  focus: document.getElementById("detail-focus"),
};

const SIDEBAR_STORAGE_KEY = "pt-hub-sidebar-collapsed";
const VIEW_STORAGE_KEY = "pt-hub-active-view";
const TABLE_MODE_STORAGE_KEY = "pt-hub-table-mode";
const LEVEL_OPTIONS = ["V", "K", "R", "N"];
const STATUS_OPTIONS = ["in design", "installing", "installed", "finished"];
let nextProjectId = 1;
let copiedProjectName = null;
let selectedProjectId = null;
let currentTableMode = readTableMode();
let activeEditCell = null;
const floatingChoiceMenu = document.createElement("div");

floatingChoiceMenu.className = "floating-choice-menu";
floatingChoiceMenu.hidden = true;
document.body.appendChild(floatingChoiceMenu);

projects.forEach((project, index) => {
  project.id = index + 1;
});

nextProjectId = projects.length + 1;
selectedProjectId = projects[0]?.id || null;

function readSidebarState() {
  try {
    return window.localStorage.getItem(SIDEBAR_STORAGE_KEY) === "true";
  } catch (_error) {
    return false;
  }
}

function persistSidebarState(collapsed) {
  try {
    window.localStorage.setItem(SIDEBAR_STORAGE_KEY, String(collapsed));
  } catch (_error) {
    // Ignore storage failures in restricted file:// contexts.
  }
}

function readActiveView() {
  try {
    return window.localStorage.getItem(VIEW_STORAGE_KEY) || "projects";
  } catch (_error) {
    return "projects";
  }
}

function persistActiveView(view) {
  try {
    window.localStorage.setItem(VIEW_STORAGE_KEY, view);
  } catch (_error) {
    // Ignore storage failures in restricted file:// contexts.
  }
}

function readTableMode() {
  try {
    return window.localStorage.getItem(TABLE_MODE_STORAGE_KEY) || "read";
  } catch (_error) {
    return "read";
  }
}

function persistTableMode(mode) {
  try {
    window.localStorage.setItem(TABLE_MODE_STORAGE_KEY, mode);
  } catch (_error) {
    // Ignore storage failures in restricted file:// contexts.
  }
}

function levelClass(level) {
  return `level-${level.toLowerCase()}`;
}

function statusClass(status) {
  if (status === "in design") return "status-design";
  if (status === "finished") return "status-finished";
  if (status === "installing") return "status-installing";
  return "status-installed";
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
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

function updateFloatingChoiceMenu() {
  if (!activeEditCell || !isChoiceField(activeEditCell.field)) {
    floatingChoiceMenu.hidden = true;
    floatingChoiceMenu.innerHTML = "";
    return;
  }

  const project = projects.find((item) => item.id === activeEditCell.projectId);
  const trigger = tableBody.querySelector(
    `tr[data-project-id="${activeEditCell.projectId}"] [data-field="${activeEditCell.field}"]`
  );

  if (!project || !trigger) {
    floatingChoiceMenu.hidden = true;
    floatingChoiceMenu.innerHTML = "";
    return;
  }

  const { label, options, renderOption } = getChoiceConfig(activeEditCell.field);
  const optionMarkup = options
    .map((option) => {
      const selected = project[activeEditCell.field] === option;

      return `
        <button
          class="choice-option ${selected ? "active" : ""}"
          type="button"
          data-choice-option="true"
          data-field="${activeEditCell.field}"
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
  const left = Math.min(
    rect.left,
    window.innerWidth - menuRect.width - viewportPadding
  );

  floatingChoiceMenu.style.top = `${top}px`;
  floatingChoiceMenu.style.left = `${Math.max(viewportPadding, left)}px`;

  floatingChoiceMenu.querySelectorAll("[data-choice-option='true']").forEach((control) => {
    control.addEventListener("click", (event) => {
      event.stopPropagation();
      updateProjectField(project.id, control.dataset.field, control.dataset.value);
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

function isEditingCell(projectId, field) {
  return activeEditCell?.projectId === projectId && activeEditCell?.field === field;
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

  if (currentTableMode === "edit") {
    return `
      <div class="project-cell">
        <div class="copy-anchor">
          <button class="copy-button" type="button" aria-label="Copy project name">
            <i data-lucide="${copiedProjectName === project.name ? "check" : "copy"}"></i>
          </button>
        </div>
        <div>
          ${projectNameMarkup}
        </div>
      </div>
    `;
  }

  return `
    <div class="project-cell">
      <div class="copy-anchor">
        <button class="copy-button" type="button" aria-label="Copy project name">
          <i data-lucide="${copiedProjectName === project.name ? "check" : "copy"}"></i>
        </button>
      </div>
      <div>
        <div class="project-name">${escapeHtml(project.name)}</div>
      </div>
    </div>
  `;
}

function renderLevelCell(project) {
  const content = `<span class="pill ${levelClass(project.level)}">${escapeHtml(project.level)}</span>`;

  if (currentTableMode === "edit") {
    return renderChoiceTrigger(project, "level");
  }

  return content;
}

function renderStatusCell(project) {
  const content = `<span class="status ${statusClass(project.status)}">${escapeHtml(project.status)}</span>`;

  if (currentTableMode === "edit") {
    return renderChoiceTrigger(project, "status");
  }

  return content;
}

function renderProgressCell(project) {
  if (isEditingCell(project.id, "progress")) {
    return renderProgressInput(project);
  }

  const content = `
    <div class="progress-cell">
      <div class="progress-track"><span style="width: ${project.progress}%"></span></div>
      <strong>${project.progress}%</strong>
    </div>
  `;

  if (currentTableMode === "edit") {
    return renderEditableShell(project, "progress", "Edit project progress", content);
  }

  return content;
}

function applyProjectToDetail(project) {
  detailEls.title.textContent = project.name;
  detailEls.summary.textContent = project.summary;
  detailEls.progressText.textContent = `${project.progress}%`;
  detailEls.progressBar.style.width = `${project.progress}%`;
  detailEls.date.textContent = `${project.startDate} to ${project.endDate}`;
  detailEls.focus.textContent = project.focus;
}

function clampProgress(value) {
  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed)) return 0;
  return Math.min(100, Math.max(0, parsed));
}

function updateProjectField(projectId, field, value) {
  const project = projects.find((item) => item.id === projectId);
  if (!project) return;

  if (field === "progress") {
    project.progress = clampProgress(value);
  } else {
    project[field] = value;
  }

  if (project.id === selectedProjectId) {
    applyProjectToDetail(project);
  }
}

function startCellEdit(projectId, field) {
  activeEditCell = { projectId, field };
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
  if (!activeEditCell) return;
  activeEditCell = null;
  updateFloatingChoiceMenu();
  renderRows();
  syncDetailPanel();
}

function bindEditableCellEvents(row, project) {
  row.querySelectorAll("[data-editable='true']").forEach((control) => {
    control.addEventListener("click", (event) => {
      event.stopPropagation();
      startCellEdit(project.id, control.dataset.field);
    });
  });

  row.querySelectorAll("input").forEach((control) => {
    control.addEventListener("click", (event) => event.stopPropagation());
    control.addEventListener("keydown", (event) => {
      event.stopPropagation();

      if (event.key === "Enter") {
        event.preventDefault();
        stopCellEdit();
      }

      if (event.key === "Escape") {
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

      updateProjectField(project.id, field, nextValue);
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

function renderRows() {
  tableBody.innerHTML = "";

  projects.forEach((project) => {
    const row = document.createElement("tr");
    row.dataset.projectId = String(project.id);
    if (project.id === selectedProjectId) row.classList.add("selected");

    row.innerHTML = `
      <td>${renderProjectCell(project)}</td>
      <td>${renderLevelCell(project)}</td>
      <td>${renderStatusCell(project)}</td>
      <td>${renderProgressCell(project)}</td>
      <td>${
        isEditingCell(project.id, "projectNo")
          ? renderTextInput(project, "projectNo", "Project number", "compact-input")
          : currentTableMode === "edit"
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
          : currentTableMode === "edit"
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
    const copyButton = row.querySelector(".copy-button");

    if (copyButton) {
      copyButton.addEventListener("click", async (event) => {
        event.stopPropagation();
        await copyProjectName(project.name);
      });
    }

    deleteButton.addEventListener("click", (event) => {
      event.stopPropagation();
      deleteProject(project.id);
    });

    if (currentTableMode === "edit") {
      bindEditableCellEvents(row, project);
    }

    tableBody.appendChild(row);
  });

  lucide.createIcons();
}

function syncDetailPanel() {
  if (!projects.length) {
    detailEls.title.textContent = "No project selected";
    detailEls.summary.textContent = "Create a project to populate the project brief.";
    detailEls.progressText.textContent = "0%";
    detailEls.progressBar.style.width = "0%";
    detailEls.date.textContent = "--";
    detailEls.focus.textContent = "新增项目后，这里会显示当前项目的重点说明。";
    return;
  }

  restoreSelectedRow();
}

async function copyProjectName(name) {
  try {
    await navigator.clipboard.writeText(name);
  } catch (_error) {
    const textarea = document.createElement("textarea");
    textarea.value = name;
    textarea.setAttribute("readonly", "");
    textarea.style.position = "absolute";
    textarea.style.left = "-9999px";
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand("copy");
    document.body.removeChild(textarea);
  }

  copiedProjectName = name;
  renderRows();
  restoreSelectedRow();

  window.setTimeout(() => {
    if (copiedProjectName !== name) return;
    copiedProjectName = null;
    renderRows();
    restoreSelectedRow();
  }, 2200);
}

function selectProject(project, row) {
  selectedProjectId = project.id;
  document.querySelectorAll("tbody tr").forEach((tr) => tr.classList.remove("selected"));
  row.classList.add("selected");
  applyProjectToDetail(project);
}

function restoreSelectedRow() {
  const activeProject = projects.find((project) => project.id === selectedProjectId) || projects[0];
  if (!activeProject) return;
  const activeRow = document.querySelector(`tbody tr[data-project-id="${activeProject.id}"]`);

  if (activeRow) {
    selectProject(activeProject, activeRow);
  }
}

function deleteProject(projectId) {
  const index = projects.findIndex((project) => project.id === projectId);
  if (index === -1) return;

  projects.splice(index, 1);

  if (selectedProjectId === projectId) {
    selectedProjectId = projects[0]?.id || null;
  }

  renderRows();
  syncDetailPanel();
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
  const nextIndex = projects.length + 1;
  const project = {
    id: nextProjectId++,
    name,
    summary: "New project draft ready for scope definition",
    focus: "补充项目目标、负责人和关键里程碑后，再进入正式执行。",
    projectNo: `PT-${String(24000 + nextIndex).padStart(5, "0")}`,
    contractNo: `CN-2024-${String(180 + nextIndex).padStart(4, "0")}`,
    level: "N",
    status: "in design",
    progress: 0,
    startDate: "2024-04-25",
    endDate: "2024-06-30",
    icon: "folder-open",
  };

  projects.unshift(project);
  selectedProjectId = project.id;
  renderRows();
  syncDetailPanel();
  setNewIslandOpen(false);
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
  sidebarToggle.setAttribute(
    "aria-label",
    collapsed ? "Expand sidebar" : "Collapse sidebar"
  );
  persistSidebarState(collapsed);
}

function initSidebarToggle() {
  if (!sidebarToggle || !shell) return;

  const saved = readSidebarState();
  setSidebarCollapsed(saved);

  sidebarToggle.addEventListener("click", () => {
    const next = !shell.classList.contains("sidebar-collapsed");
    setSidebarCollapsed(next);
  });
}

function setTableMode(mode) {
  currentTableMode = mode === "edit" ? "edit" : "read";
  if (currentTableMode !== "edit") activeEditCell = null;

  modeButtons.forEach((button) => {
    const active = button.dataset.mode === currentTableMode;
    button.classList.toggle("active", active);
    button.setAttribute("aria-pressed", String(active));
  });

  persistTableMode(currentTableMode);
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

  setTableMode(currentTableMode);
}

document.addEventListener("click", (event) => {
  if (!activeEditCell) return;
  if (event.target.closest(".floating-choice-menu")) return;
  stopCellEdit();
});

window.addEventListener("resize", () => {
  updateFloatingChoiceMenu();
});

window.addEventListener("scroll", () => {
  updateFloatingChoiceMenu();
}, true);

renderRows();
restoreSelectedRow();
initSidebarToggle();
initNavigation();
initNewIsland();
initTableModeToggle();
