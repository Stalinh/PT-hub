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

export function getFloatingChoiceMenu() {
  return floatingChoiceMenu;
}

export function getConfirmDialog() {
  return confirmDialog;
}

export function clearFloatingChoiceMenuMotion() {
  if (floatingChoiceMenuOpenFrame) {
    window.cancelAnimationFrame(floatingChoiceMenuOpenFrame);
    floatingChoiceMenuOpenFrame = 0;
  }

  if (floatingChoiceMenuCloseTimer) {
    window.clearTimeout(floatingChoiceMenuCloseTimer);
    floatingChoiceMenuCloseTimer = 0;
  }
}

export function closeFloatingChoiceMenu({ immediate = false } = {}) {
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

export function closeConfirmDialog() {
  if (confirmDialog.hidden) return;
  confirmDialog.hidden = true;
  document.body.classList.remove("dialog-open");
  confirmDialogCleanup?.();
  confirmDialogCleanup = null;
}

export function openConfirmDialog({
  title,
  message,
  eyebrow = "Delete item",
  confirmLabel = "删除",
  onConfirm,
}) {
  closeConfirmDialog();

  const eyebrowEl = confirmDialog.querySelector(".confirm-dialog-eyebrow");
  const titleEl = confirmDialog.querySelector("#confirm-dialog-title");
  const messageEl = confirmDialog.querySelector("#confirm-dialog-message");
  const acceptButton = confirmDialog.querySelector("[data-confirm-accept='true']");
  const cancelButton = confirmDialog.querySelector("[data-confirm-cancel='true']");

  eyebrowEl.textContent = eyebrow;
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

export function updateFloatingChoiceMenu(state, tableBody, tasksPageEls) {
  const isChoiceField = (field) => field === "level" || field === "status";
  const usesTaskChoiceMenu = (field) => field === "status";

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
  let field = "";

  if (hasProjectChoice) {
    const project = state.projectData.find((item) => item.id === state.activeEditCell.projectId);
    trigger = tableBody.querySelector(
      `tr[data-project-id="${state.activeEditCell.projectId}"] [data-field="${state.activeEditCell.field}"]`
    );

    if (!project || !trigger) {
      closeFloatingChoiceMenu({ immediate: true });
      return;
    }

    const getChoiceConfig = (f) => {
      if (f === "level") {
        return {
          label: "Project level",
          options: ["V", "K", "R", "N"],
          renderOption: (option) => `<span class="pill">${option}</span>`,
        };
      }
      return {
        label: "Project status",
        options: ["in design", "in progress", "in review", "completed", "archived"],
        renderOption: (option) => `<span class="status">${option}</span>`,
      };
    };

    const config = getChoiceConfig(state.activeEditCell.field);
    field = state.activeEditCell.field;
    label = config.label;
    options = config.options;
    renderOption = config.renderOption;
    selectedValue = project[field];
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

    const getTaskChoiceConfig = () => ({
      label: "Task status",
      options: ["todo", "doing", "done"],
      renderOption: (option) => `<span class="status">${option}</span>`,
    });

    const config = getTaskChoiceConfig();
    field = state.activeTaskEditCell.field;
    label = config.label;
    options = config.options;
    renderOption = config.renderOption;
    selectedValue = task[field];
  }

  const escapeHtml = (str) => {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  };

  const optionMarkup = options
    .map((option) => {
      const selected = selectedValue === option;

      return `
        <button
          class="choice-option ${selected ? "active" : ""}"
          type="button"
          data-choice-option="true"
          data-field="${field}"
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
}

export function bindFloatingChoiceMenuEvents(state, onProjectChoice, onTaskChoice, onStopCellEdit, onStopTaskCellEdit) {
  floatingChoiceMenu.addEventListener("click", (event) => {
    const control = event.target.closest("[data-choice-option='true']");
    if (!control) return;

    event.stopPropagation();
    const hasProjectChoice = state.activeEditCell && (state.activeEditCell.field === "level" || state.activeEditCell.field === "status");
    const hasTaskChoice = state.activeTaskEditCell && state.activeTaskEditCell.field === "status";

    if (hasProjectChoice) {
      const project = state.projectData.find((item) => item.id === state.activeEditCell.projectId);
      if (!project) return;
      onProjectChoice(project.id, control.dataset.field, control.dataset.value);
      onStopCellEdit();
      return;
    }

    if (hasTaskChoice) {
      const task = state.taskData.find((item) => item.id === state.activeTaskEditCell.taskId);
      if (!task) return;
      onTaskChoice(task.id, control.dataset.field, control.dataset.value);
      onStopTaskCellEdit();
    }
  });
}
