/**
 * Dashboard JavaScript for Records Management
 */

const API_BASE = "/api/records";
const ADMIN_STORAGE_KEY = "gc_admin";

// Check admin access
function isAdmin() {
  return localStorage.getItem(ADMIN_STORAGE_KEY) === "true";
}

// Redirect non-admins
if (!isAdmin()) {
  window.location.href = "access.html";
}

// State
let records = [];
let editingId = null;
let deleteId = null;

// DOM Elements
const tableBody = document.querySelector("[data-dashboard-body]");
const loadingEl = document.querySelector("[data-dashboard-loading]");
const emptyEl = document.querySelector("[data-dashboard-empty]");
const noticeEl = document.querySelector("[data-dashboard-notice]");
const modal = document.querySelector("[data-modal]");
const modalTitle = document.querySelector("[data-modal-title]");
const modalNotice = document.querySelector("[data-modal-notice]");
const recordForm = document.querySelector("[data-record-form]");
const deleteModal = document.querySelector("[data-delete-modal]");
const deleteIdEl = document.querySelector("[data-delete-id]");

// Filters
const divisionFilter = document.querySelector('[data-filter="division"]');
const statusFilter = document.querySelector('[data-filter="status"]');
const searchFilter = document.querySelector('[data-filter="search"]');

// Helper functions
function showNotice(message, isError = false) {
  if (noticeEl) {
    noticeEl.textContent = message;
    noticeEl.hidden = false;
    if (isError) {
      noticeEl.style.color = "#c00";
    } else {
      noticeEl.style.color = "";
    }
    setTimeout(() => {
      noticeEl.hidden = true;
    }, 5000);
  }
}

function showModalNotice(message, isError = false) {
  if (modalNotice) {
    modalNotice.textContent = message;
    modalNotice.hidden = false;
    if (isError) {
      modalNotice.style.color = "#c00";
    } else {
      modalNotice.style.color = "";
    }
  }
}

function parseArrayField(value) {
  if (!value) return null;
  if (Array.isArray(value)) return value;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.split(",").map(item => item.trim()).filter(Boolean);
}

function formatArrayField(value) {
  if (!value) return "";
  if (Array.isArray(value)) return value.join(", ");
  return value;
}

// API Functions
async function fetchRecords() {
  try {
    loadingEl.hidden = false;
    emptyEl.hidden = true;
    tableBody.textContent = "";

    const response = await fetch(API_BASE);
    const result = await response.json();

    if (result.success) {
      records = result.data || [];
      renderTable();
    } else {
      throw new Error(result.error || "Failed to fetch records");
    }
  } catch (error) {
    showNotice(`Error: ${error.message}`, true);
    // Fallback to static data if API fails
    try {
      const module = await import("./records-data.js");
      records = module.records || [];
      renderTable();
      showNotice("Using local data (API unavailable)", false);
    } catch (e) {
      showNotice("Failed to load records", true);
    }
  } finally {
    loadingEl.hidden = true;
  }
}

async function createRecord(data) {
  const response = await fetch(API_BASE, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data)
  });
  return response.json();
}

async function updateRecord(data) {
  const response = await fetch(API_BASE, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data)
  });
  return response.json();
}

async function deleteRecord(id) {
  const response = await fetch(`${API_BASE}?id=${encodeURIComponent(id)}`, {
    method: "DELETE"
  });
  return response.json();
}

// Rendering
function getFilteredRecords() {
  let filtered = [...records];

  const division = divisionFilter?.value;
  const status = statusFilter?.value;
  const search = searchFilter?.value?.toLowerCase();

  if (division) {
    filtered = filtered.filter(r => r.division === division);
  }
  if (status) {
    filtered = filtered.filter(r => r.status === status);
  }
  if (search) {
    filtered = filtered.filter(r =>
      r.id.toLowerCase().includes(search) ||
      r.title.toLowerCase().includes(search)
    );
  }

  return filtered;
}

function renderTable() {
  const filtered = getFilteredRecords();
  tableBody.textContent = "";

  if (filtered.length === 0) {
    emptyEl.hidden = false;
    return;
  }

  emptyEl.hidden = true;

  filtered.forEach(record => {
    const row = document.createElement("tr");
    row.dataset.id = record.id;

    const idCell = document.createElement("td");
    idCell.textContent = record.id;

    const titleCell = document.createElement("td");
    titleCell.textContent = record.title;

    const divisionCell = document.createElement("td");
    divisionCell.textContent = record.division;

    const yearCell = document.createElement("td");
    yearCell.textContent = record.year;

    const statusCell = document.createElement("td");
    const statusSpan = document.createElement("span");
    statusSpan.textContent = record.status;
    statusSpan.className = `status status-${record.status}`;
    statusCell.appendChild(statusSpan);

    const actionsCell = document.createElement("td");
    actionsCell.className = "actions-cell";

    const editBtn = document.createElement("button");
    editBtn.textContent = "Edit";
    editBtn.className = "btn-sm";
    editBtn.addEventListener("click", () => openEditModal(record));

    const deleteBtn = document.createElement("button");
    deleteBtn.textContent = "Delete";
    deleteBtn.className = "btn-sm btn-danger";
    deleteBtn.addEventListener("click", () => openDeleteModal(record.id));

    actionsCell.append(editBtn, deleteBtn);

    row.append(idCell, titleCell, divisionCell, yearCell, statusCell, actionsCell);
    tableBody.appendChild(row);
  });
}

// Modal Functions
function openCreateModal() {
  editingId = null;
  modalTitle.textContent = "New Record";
  recordForm.reset();
  recordForm.querySelector('[data-field="id"]').disabled = false;
  modalNotice.hidden = true;
  modal.hidden = false;
  modal.style.display = "flex";
}

function openEditModal(record) {
  editingId = record.id;
  modalTitle.textContent = `Edit ${record.id}`;
  modalNotice.hidden = true;

  // Populate form
  const fields = recordForm.querySelectorAll("[data-field]");
  fields.forEach(field => {
    const key = field.dataset.field;
    let value = record[key];

    // Handle array fields
    if (["author", "tags", "project"].includes(key)) {
      value = formatArrayField(value);
    }

    if (field.tagName === "SELECT") {
      field.value = value || field.options[0].value;
    } else {
      field.value = value || "";
    }
  });

  // Disable ID field when editing
  recordForm.querySelector('[data-field="id"]').disabled = true;

  modal.hidden = false;
  modal.style.display = "flex";
}

function closeModal() {
  modal.hidden = true;
  modal.style.display = "none";
  editingId = null;
  recordForm.reset();
}

function openDeleteModal(id) {
  deleteId = id;
  deleteIdEl.textContent = id;
  deleteModal.hidden = false;
  deleteModal.style.display = "flex";
}

function closeDeleteModal() {
  deleteModal.hidden = true;
  deleteModal.style.display = "none";
  deleteId = null;
}

// Form Handling
async function handleSubmit(event) {
  event.preventDefault();

  const formData = {};
  const fields = recordForm.querySelectorAll("[data-field]");

  fields.forEach(field => {
    const key = field.dataset.field;
    let value = field.value.trim();

    // Handle array fields
    if (["author", "tags", "project"].includes(key)) {
      value = parseArrayField(value);
    }

    // Handle numeric fields
    if (["year", "archival_since"].includes(key) && value) {
      value = parseInt(value, 10);
    }

    // Only include non-empty values
    if (value !== "" && value !== null) {
      formData[key] = value;
    }
  });

  try {
    let result;
    if (editingId) {
      formData.id = editingId;
      result = await updateRecord(formData);
    } else {
      result = await createRecord(formData);
    }

    if (result.success) {
      closeModal();
      showNotice(editingId ? "Record updated" : "Record created");
      fetchRecords();
    } else {
      showModalNotice(result.error || "Operation failed", true);
    }
  } catch (error) {
    showModalNotice(`Error: ${error.message}`, true);
  }
}

async function handleDelete() {
  if (!deleteId) return;

  try {
    const result = await deleteRecord(deleteId);

    if (result.success) {
      closeDeleteModal();
      showNotice("Record deleted");
      fetchRecords();
    } else {
      showNotice(result.error || "Delete failed", true);
      closeDeleteModal();
    }
  } catch (error) {
    showNotice(`Error: ${error.message}`, true);
    closeDeleteModal();
  }
}

function exportRecords() {
  const data = getFilteredRecords();
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `records_export_${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
  showNotice("Records exported");
}

// Event Listeners
document.querySelectorAll("[data-action]").forEach(el => {
  const action = el.dataset.action;

  el.addEventListener("click", () => {
    switch (action) {
      case "create":
        openCreateModal();
        break;
      case "export":
        exportRecords();
        break;
      case "refresh":
        fetchRecords();
        break;
      case "close-modal":
        closeModal();
        break;
      case "close-delete-modal":
        closeDeleteModal();
        break;
      case "confirm-delete":
        handleDelete();
        break;
    }
  });
});

// Filter listeners
[divisionFilter, statusFilter, searchFilter].forEach(el => {
  if (el) {
    el.addEventListener("input", renderTable);
    el.addEventListener("change", renderTable);
  }
});

// Form submit
if (recordForm) {
  recordForm.addEventListener("submit", handleSubmit);
}

// Close modals on overlay click
modal?.addEventListener("click", (e) => {
  if (e.target === modal) closeModal();
});

deleteModal?.addEventListener("click", (e) => {
  if (e.target === deleteModal) closeDeleteModal();
});

// Close modals on Escape key
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    if (!modal.hidden) closeModal();
    if (!deleteModal.hidden) closeDeleteModal();
  }
});

// Initialize - ensure modals are hidden
if (modal) {
  modal.hidden = true;
  modal.style.display = "none";
}
if (deleteModal) {
  deleteModal.hidden = true;
  deleteModal.style.display = "none";
}

fetchRecords();
