import {
  SIDEBAR_STORAGE_KEY,
  TABLE_MODE_STORAGE_KEY,
  VIEW_STORAGE_KEY,
} from "./constants.js";

export function readSidebarState() {
  try {
    return window.localStorage.getItem(SIDEBAR_STORAGE_KEY) === "true";
  } catch (_error) {
    return false;
  }
}

export function persistSidebarState(collapsed) {
  try {
    window.localStorage.setItem(SIDEBAR_STORAGE_KEY, String(collapsed));
  } catch (_error) {
    // Ignore storage failures in restricted file:// contexts.
  }
}

export function readActiveView() {
  try {
    return window.localStorage.getItem(VIEW_STORAGE_KEY) || "projects";
  } catch (_error) {
    return "projects";
  }
}

export function persistActiveView(view) {
  try {
    window.localStorage.setItem(VIEW_STORAGE_KEY, view);
  } catch (_error) {
    // Ignore storage failures in restricted file:// contexts.
  }
}

export function readTableMode() {
  try {
    return window.localStorage.getItem(TABLE_MODE_STORAGE_KEY) || "read";
  } catch (_error) {
    return "read";
  }
}

export function persistTableMode(mode) {
  try {
    window.localStorage.setItem(TABLE_MODE_STORAGE_KEY, mode);
  } catch (_error) {
    // Ignore storage failures in restricted file:// contexts.
  }
}

