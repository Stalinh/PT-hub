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
const detailEls = {
  title: document.getElementById("detail-title"),
  summary: document.getElementById("detail-summary"),
  badge: document.querySelector(".detail-badge"),
  progressText: document.getElementById("detail-progress-text"),
  progressBar: document.getElementById("detail-progress-bar"),
  status: document.getElementById("detail-status"),
  date: document.getElementById("detail-date"),
  focus: document.getElementById("detail-focus"),
};

const SIDEBAR_STORAGE_KEY = "pt-hub-sidebar-collapsed";
const VIEW_STORAGE_KEY = "pt-hub-active-view";
let copiedProjectName = null;
let selectedProjectName = projects[0].name;

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

function levelClass(level) {
  return `level-${level.toLowerCase()}`;
}

function statusClass(status) {
  if (status === "in design") return "status-design";
  if (status === "finished") return "status-finished";
  if (status === "installing") return "status-installing";
  return "status-installed";
}

function renderRows() {
  tableBody.innerHTML = "";

  projects.forEach((project) => {
    const row = document.createElement("tr");
    if (project.name === selectedProjectName) row.classList.add("selected");

    row.innerHTML = `
      <td>
        <div class="project-cell">
          <div class="copy-anchor">
            <button class="copy-button" type="button" aria-label="Copy project name">
              <i data-lucide="${copiedProjectName === project.name ? "check" : "copy"}"></i>
            </button>
          </div>
          <div>
            <div class="project-name">${project.name}</div>
          </div>
        </div>
      </td>
      <td><span class="pill ${levelClass(project.level)}">${project.level}</span></td>
      <td><span class="status ${statusClass(project.status)}">${project.status}</span></td>
      <td>
        <div class="progress-cell">
          <div class="progress-track"><span style="width: ${project.progress}%"></span></div>
          <strong>${project.progress}%</strong>
        </div>
      </td>
      <td><span class="project-code">${project.projectNo}</span></td>
      <td><span class="project-code">${project.contractNo}</span></td>
    `;

    row.addEventListener("click", () => selectProject(project, row));
    const copyButton = row.querySelector(".copy-button");
    copyButton.addEventListener("click", async (event) => {
      event.stopPropagation();
      await copyProjectName(project.name);
    });
    tableBody.appendChild(row);
  });

  lucide.createIcons();
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
  selectedProjectName = project.name;
  document.querySelectorAll("tbody tr").forEach((tr) => tr.classList.remove("selected"));
  row.classList.add("selected");

  detailEls.title.textContent = project.name;
  detailEls.summary.textContent = project.summary;
  detailEls.badge.textContent = project.level;
  detailEls.progressText.textContent = `${project.progress}%`;
  detailEls.progressBar.style.width = `${project.progress}%`;
  detailEls.status.textContent = project.status;
  detailEls.date.textContent = `${project.startDate} to ${project.endDate}`;
  detailEls.focus.textContent = project.focus;

  if (project.level === "N" || project.level === "R") {
    detailEls.badge.style.background = "rgba(255, 255, 255, 0.08)";
    detailEls.badge.style.color = "#F7F2E9";
  } else if (project.level === "K") {
    detailEls.badge.style.background = "rgba(214, 174, 84, 0.18)";
    detailEls.badge.style.color = "#FFE7A3";
  } else {
    detailEls.badge.style.background = "rgba(187, 90, 60, 0.18)";
    detailEls.badge.style.color = "#FFD7CA";
  }
}

function restoreSelectedRow() {
  const activeProject =
    projects.find((project) => project.name === selectedProjectName) || projects[0];
  const activeRow = Array.from(document.querySelectorAll("tbody tr")).find(
    (row) => row.querySelector(".project-name")?.textContent === activeProject.name
  );

  if (activeRow) {
    selectProject(activeProject, activeRow);
  }
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
  selectedProjectName = project.name;
  renderRows();
  restoreSelectedRow();
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

renderRows();
restoreSelectedRow();
initSidebarToggle();
initNavigation();
initNewIsland();
