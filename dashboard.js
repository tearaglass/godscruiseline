/**
 * Dashboard JavaScript for Records & Projects Management
 */

const RECORDS_API = "/api/records";
const PROJECTS_API = "/api/projects";
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
let projects = [];
let editingRecordId = null;
let editingProjectId = null;
let deleteTarget = { type: null, id: null };
let publishingProject = null;

// DOM Elements - General
const noticeEl = document.querySelector("[data-dashboard-notice]");

// DOM Elements - Tabs
const tabBtns = document.querySelectorAll("[data-tab]");
const tabContents = document.querySelectorAll("[data-tab-content]");

// DOM Elements - Records
const recordsBody = document.querySelector("[data-records-body]");
const recordsLoading = document.querySelector("[data-records-loading]");
const recordsEmpty = document.querySelector("[data-records-empty]");
const recordModal = document.querySelector("[data-record-modal]");
const recordModalTitle = document.querySelector("[data-record-modal-title]");
const recordModalNotice = document.querySelector("[data-record-modal-notice]");
const recordForm = document.querySelector("[data-record-form]");

// DOM Elements - Projects
const projectsBody = document.querySelector("[data-projects-body]");
const projectsLoading = document.querySelector("[data-projects-loading]");
const projectsEmpty = document.querySelector("[data-projects-empty]");
const projectModal = document.querySelector("[data-project-modal]");
const projectModalTitle = document.querySelector("[data-project-modal-title]");
const projectModalNotice = document.querySelector("[data-project-modal-notice]");
const projectForm = document.querySelector("[data-project-form]");

// DOM Elements - Publish Modal
const publishModal = document.querySelector("[data-publish-modal]");
const publishModalNotice = document.querySelector("[data-publish-modal-notice]");
const publishForm = document.querySelector("[data-publish-form]");
const publishProjectName = document.querySelector("[data-publish-project-name]");

// DOM Elements - Delete Modal
const deleteModal = document.querySelector("[data-delete-modal]");
const deleteIdEl = document.querySelector("[data-delete-id]");

// DOM Elements - Filters
const divisionFilter = document.querySelector('[data-filter="division"]');
const statusFilter = document.querySelector('[data-filter="status"]');
const searchFilter = document.querySelector('[data-filter="search"]');
const projectStatusFilter = document.querySelector('[data-filter="project-status"]');
const projectSearchFilter = document.querySelector('[data-filter="project-search"]');

// Helper functions
function showNotice(message, isError = false) {
  if (noticeEl) {
    noticeEl.textContent = message;
    noticeEl.hidden = false;
    noticeEl.style.color = isError ? "#c00" : "";
    setTimeout(() => { noticeEl.hidden = true; }, 5000);
  }
}

function hideModal(modal) {
  if (modal) {
    modal.hidden = true;
    modal.style.display = "none";
  }
}

function showModal(modal) {
  if (modal) {
    modal.hidden = false;
    modal.style.display = "flex";
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

// Tab switching
tabBtns.forEach(btn => {
  btn.addEventListener("click", () => {
    const tab = btn.dataset.tab;

    tabBtns.forEach(b => b.classList.toggle("active", b.dataset.tab === tab));
    tabContents.forEach(c => {
      const isActive = c.dataset.tabContent === tab;
      c.classList.toggle("active", isActive);
      // Use style.display instead of hidden attribute to avoid CSS conflicts
      c.style.display = isActive ? "block" : "none";
    });

    // Load data for tab if needed
    if (tab === "projects" && projects.length === 0) {
      fetchProjects();
    }
  });
});

// ============ RECORDS ============

async function fetchRecords() {
  try {
    if (recordsLoading) recordsLoading.hidden = false;
    if (recordsEmpty) recordsEmpty.hidden = true;
    if (recordsBody) recordsBody.textContent = "";

    const response = await fetch(RECORDS_API);
    const result = await response.json();

    if (result.success) {
      records = result.data || [];
      renderRecordsTable();
    } else {
      throw new Error(result.error || "Failed to fetch records");
    }
  } catch (error) {
    showNotice(`Error: ${error.message}`, true);
    // Fallback to static data
    try {
      const module = await import("./records-data.js");
      records = module.records || [];
      renderRecordsTable();
      showNotice("Using local data (API unavailable)", false);
    } catch (e) {
      showNotice("Failed to load records", true);
    }
  } finally {
    if (recordsLoading) recordsLoading.hidden = true;
  }
}

function getFilteredRecords() {
  let filtered = [...records];
  const division = divisionFilter?.value;
  const status = statusFilter?.value;
  const search = searchFilter?.value?.toLowerCase();

  if (division) filtered = filtered.filter(r => r.division === division);
  if (status) filtered = filtered.filter(r => r.status === status);
  if (search) filtered = filtered.filter(r =>
    r.id.toLowerCase().includes(search) || r.title.toLowerCase().includes(search)
  );
  return filtered;
}

function renderRecordsTable() {
  const filtered = getFilteredRecords();
  if (recordsBody) recordsBody.textContent = "";

  if (filtered.length === 0) {
    if (recordsEmpty) recordsEmpty.hidden = false;
    return;
  }
  if (recordsEmpty) recordsEmpty.hidden = true;

  filtered.forEach(record => {
    const row = document.createElement("tr");

    const cells = [
      record.id,
      record.title,
      record.division,
      record.year,
    ];

    cells.forEach(text => {
      const td = document.createElement("td");
      td.textContent = text;
      row.appendChild(td);
    });

    const statusCell = document.createElement("td");
    const statusSpan = document.createElement("span");
    statusSpan.textContent = record.status;
    statusSpan.className = `status status-${record.status}`;
    statusCell.appendChild(statusSpan);
    row.appendChild(statusCell);

    const actionsCell = document.createElement("td");
    actionsCell.className = "actions-cell";

    const editBtn = document.createElement("button");
    editBtn.textContent = "Edit";
    editBtn.className = "btn-sm";
    editBtn.addEventListener("click", () => openEditRecordModal(record));

    const deleteBtn = document.createElement("button");
    deleteBtn.textContent = "Delete";
    deleteBtn.className = "btn-sm btn-danger";
    deleteBtn.addEventListener("click", () => openDeleteModal("record", record.id));

    actionsCell.append(editBtn, deleteBtn);
    row.appendChild(actionsCell);
    recordsBody.appendChild(row);
  });
}

function openCreateRecordModal() {
  editingRecordId = null;
  if (recordModalTitle) recordModalTitle.textContent = "New Record";
  if (recordForm) recordForm.reset();
  const idField = recordForm?.querySelector('[data-record-field="id"]');
  if (idField) idField.disabled = false;
  if (recordModalNotice) recordModalNotice.hidden = true;
  showModal(recordModal);
}

function openEditRecordModal(record) {
  editingRecordId = record.id;
  if (recordModalTitle) recordModalTitle.textContent = `Edit ${record.id}`;
  if (recordModalNotice) recordModalNotice.hidden = true;

  const fields = recordForm?.querySelectorAll("[data-record-field]");
  fields?.forEach(field => {
    const key = field.dataset.recordField;
    let value = record[key];
    if (["author", "tags", "project"].includes(key)) value = formatArrayField(value);
    if (field.tagName === "SELECT") {
      field.value = value || field.options[0].value;
    } else {
      field.value = value || "";
    }
  });

  const idField = recordForm?.querySelector('[data-record-field="id"]');
  if (idField) idField.disabled = true;

  showModal(recordModal);
}

function closeRecordModal() {
  hideModal(recordModal);
  editingRecordId = null;
  if (recordForm) recordForm.reset();
}

async function handleRecordSubmit(event) {
  event.preventDefault();

  const formData = {};
  const fields = recordForm?.querySelectorAll("[data-record-field]");

  fields?.forEach(field => {
    const key = field.dataset.recordField;
    let value = field.value.trim();

    if (["author", "tags", "project"].includes(key)) value = parseArrayField(value);
    if (["year", "archival_since"].includes(key) && value) value = parseInt(value, 10);
    if (value !== "" && value !== null) formData[key] = value;
  });

  try {
    let result;
    if (editingRecordId) {
      formData.id = editingRecordId;
      const response = await fetch(RECORDS_API, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData)
      });
      result = await response.json();
    } else {
      const response = await fetch(RECORDS_API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData)
      });
      result = await response.json();
    }

    if (result.success) {
      closeRecordModal();
      showNotice(editingRecordId ? "Record updated" : "Record created");
      fetchRecords();
    } else {
      if (recordModalNotice) {
        recordModalNotice.textContent = result.error || "Operation failed";
        recordModalNotice.hidden = false;
        recordModalNotice.style.color = "#c00";
      }
    }
  } catch (error) {
    if (recordModalNotice) {
      recordModalNotice.textContent = `Error: ${error.message}`;
      recordModalNotice.hidden = false;
      recordModalNotice.style.color = "#c00";
    }
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

// ============ PROJECTS ============

async function fetchProjects() {
  try {
    if (projectsLoading) projectsLoading.hidden = false;
    if (projectsEmpty) projectsEmpty.hidden = true;
    if (projectsBody) projectsBody.textContent = "";

    const response = await fetch(PROJECTS_API);
    const result = await response.json();

    if (result.success) {
      projects = result.data || [];
      renderProjectsTable();
    } else {
      throw new Error(result.error || "Failed to fetch projects");
    }
  } catch (error) {
    showNotice(`Error: ${error.message}`, true);
    // Fallback to static data
    try {
      const module = await import("./projects-data.js");
      projects = module.projects || [];
      renderProjectsTable();
      showNotice("Using local data (API unavailable)", false);
    } catch (e) {
      showNotice("Failed to load projects", true);
    }
  } finally {
    if (projectsLoading) projectsLoading.hidden = true;
  }
}

function getFilteredProjects() {
  let filtered = [...projects];
  const status = projectStatusFilter?.value;
  const search = projectSearchFilter?.value?.toLowerCase();

  if (status) filtered = filtered.filter(p => p.status === status);
  if (search) filtered = filtered.filter(p =>
    p.id.toLowerCase().includes(search) || p.name.toLowerCase().includes(search)
  );
  return filtered;
}

function renderProjectsTable() {
  const filtered = getFilteredProjects();
  if (projectsBody) projectsBody.textContent = "";

  if (filtered.length === 0) {
    if (projectsEmpty) projectsEmpty.hidden = false;
    return;
  }
  if (projectsEmpty) projectsEmpty.hidden = true;

  filtered.forEach(project => {
    const row = document.createElement("tr");

    const idCell = document.createElement("td");
    idCell.textContent = project.id;
    row.appendChild(idCell);

    const nameCell = document.createElement("td");
    nameCell.textContent = project.name;
    row.appendChild(nameCell);

    const descCell = document.createElement("td");
    descCell.textContent = project.description || "";
    descCell.style.maxWidth = "200px";
    descCell.style.overflow = "hidden";
    descCell.style.textOverflow = "ellipsis";
    descCell.style.whiteSpace = "nowrap";
    row.appendChild(descCell);

    const statusCell = document.createElement("td");
    const statusSpan = document.createElement("span");
    statusSpan.textContent = project.status;
    statusSpan.className = `status status-${project.status}`;
    statusCell.appendChild(statusSpan);
    row.appendChild(statusCell);

    const startCell = document.createElement("td");
    startCell.textContent = project.start_year || project.startYear || "";
    row.appendChild(startCell);

    const actionsCell = document.createElement("td");
    actionsCell.className = "actions-cell";

    const editBtn = document.createElement("button");
    editBtn.textContent = "Edit";
    editBtn.className = "btn-sm";
    editBtn.addEventListener("click", () => openEditProjectModal(project));

    const publishBtn = document.createElement("button");
    publishBtn.textContent = "Publish";
    publishBtn.className = "btn-sm";
    publishBtn.addEventListener("click", () => openPublishModal(project));

    const deleteBtn = document.createElement("button");
    deleteBtn.textContent = "Delete";
    deleteBtn.className = "btn-sm btn-danger";
    deleteBtn.addEventListener("click", () => openDeleteModal("project", project.id));

    actionsCell.append(editBtn, publishBtn, deleteBtn);
    row.appendChild(actionsCell);
    projectsBody.appendChild(row);
  });
}

function openCreateProjectModal() {
  editingProjectId = null;
  if (projectModalTitle) projectModalTitle.textContent = "New Project";
  if (projectForm) projectForm.reset();
  const idField = projectForm?.querySelector('[data-project-field="id"]');
  if (idField) idField.disabled = false;
  if (projectModalNotice) projectModalNotice.hidden = true;
  showModal(projectModal);
}

function openEditProjectModal(project) {
  editingProjectId = project.id;
  if (projectModalTitle) projectModalTitle.textContent = `Edit ${project.id}`;
  if (projectModalNotice) projectModalNotice.hidden = true;

  const fields = projectForm?.querySelectorAll("[data-project-field]");
  fields?.forEach(field => {
    const key = field.dataset.projectField;
    let value = project[key] || project[key.replace(/_/g, "")]; // Handle snake_case vs camelCase
    if (field.tagName === "SELECT") {
      field.value = value || field.options[0].value;
    } else {
      field.value = value || "";
    }
  });

  const idField = projectForm?.querySelector('[data-project-field="id"]');
  if (idField) idField.disabled = true;

  showModal(projectModal);
}

function closeProjectModal() {
  hideModal(projectModal);
  editingProjectId = null;
  if (projectForm) projectForm.reset();
}

async function handleProjectSubmit(event) {
  event.preventDefault();

  const formData = {};
  const fields = projectForm?.querySelectorAll("[data-project-field]");

  fields?.forEach(field => {
    const key = field.dataset.projectField;
    let value = field.value.trim();
    if (["start_year", "end_year"].includes(key) && value) value = parseInt(value, 10);
    if (value !== "" && value !== null) formData[key] = value;
  });

  try {
    let result;
    if (editingProjectId) {
      formData.id = editingProjectId;
      const response = await fetch(PROJECTS_API, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData)
      });
      result = await response.json();
    } else {
      const response = await fetch(PROJECTS_API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData)
      });
      result = await response.json();
    }

    if (result.success) {
      closeProjectModal();
      showNotice(editingProjectId ? "Project updated" : "Project created");
      fetchProjects();
    } else {
      if (projectModalNotice) {
        projectModalNotice.textContent = result.error || "Operation failed";
        projectModalNotice.hidden = false;
        projectModalNotice.style.color = "#c00";
      }
    }
  } catch (error) {
    if (projectModalNotice) {
      projectModalNotice.textContent = `Error: ${error.message}`;
      projectModalNotice.hidden = false;
      projectModalNotice.style.color = "#c00";
    }
  }
}

function exportProjects() {
  const data = getFilteredProjects();
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `projects_export_${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
  showNotice("Projects exported");
}

// ============ PUBLISH TO RECORDS ============

function openPublishModal(project) {
  publishingProject = project;
  if (publishProjectName) publishProjectName.textContent = project.name;
  if (publishForm) publishForm.reset();
  if (publishModalNotice) publishModalNotice.hidden = true;

  // Pre-fill some fields
  const titleField = publishForm?.querySelector('[data-publish-field="title"]');
  if (titleField) titleField.value = project.name;

  const yearField = publishForm?.querySelector('[data-publish-field="year"]');
  if (yearField) yearField.value = new Date().getFullYear();

  const statusField = publishForm?.querySelector('[data-publish-field="status"]');
  if (statusField) statusField.value = project.status;

  const projectField = publishForm?.querySelector('[data-publish-field="project"]');
  if (projectField) projectField.value = project.id;

  const contentField = publishForm?.querySelector('[data-publish-field="content"]');
  if (contentField) contentField.value = project.description || "";

  showModal(publishModal);
}

function closePublishModal() {
  hideModal(publishModal);
  publishingProject = null;
  if (publishForm) publishForm.reset();
}

async function handlePublishSubmit(event) {
  event.preventDefault();

  const formData = {};
  const fields = publishForm?.querySelectorAll("[data-publish-field]");

  fields?.forEach(field => {
    const key = field.dataset.publishField;
    let value = field.value.trim();
    if (key === "year" && value) value = parseInt(value, 10);
    if (key === "project" && value) value = [value]; // Make it an array
    if (value !== "" && value !== null) formData[key] = value;
  });

  try {
    const response = await fetch(RECORDS_API, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(formData)
    });
    const result = await response.json();

    if (result.success) {
      closePublishModal();
      showNotice(`Record ${formData.id} created from project`);
      fetchRecords();
    } else {
      if (publishModalNotice) {
        publishModalNotice.textContent = result.error || "Publish failed";
        publishModalNotice.hidden = false;
        publishModalNotice.style.color = "#c00";
      }
    }
  } catch (error) {
    if (publishModalNotice) {
      publishModalNotice.textContent = `Error: ${error.message}`;
      publishModalNotice.hidden = false;
      publishModalNotice.style.color = "#c00";
    }
  }
}

// ============ DELETE ============

function openDeleteModal(type, id) {
  deleteTarget = { type, id };
  if (deleteIdEl) deleteIdEl.textContent = id;
  showModal(deleteModal);
}

function closeDeleteModal() {
  hideModal(deleteModal);
  deleteTarget = { type: null, id: null };
}

async function handleDelete() {
  const { type, id } = deleteTarget;
  if (!type || !id) return;

  const apiUrl = type === "record" ? RECORDS_API : PROJECTS_API;

  try {
    const response = await fetch(`${apiUrl}?id=${encodeURIComponent(id)}`, {
      method: "DELETE"
    });
    const result = await response.json();

    if (result.success) {
      closeDeleteModal();
      showNotice(`${type === "record" ? "Record" : "Project"} deleted`);
      if (type === "record") fetchRecords();
      else fetchProjects();
    } else {
      showNotice(result.error || "Delete failed", true);
      closeDeleteModal();
    }
  } catch (error) {
    showNotice(`Error: ${error.message}`, true);
    closeDeleteModal();
  }
}

// ============ EVENT LISTENERS ============

document.querySelectorAll("[data-action]").forEach(el => {
  const action = el.dataset.action;
  el.addEventListener("click", () => {
    switch (action) {
      case "create-record": openCreateRecordModal(); break;
      case "export-records": exportRecords(); break;
      case "refresh-records": fetchRecords(); break;
      case "close-record-modal": closeRecordModal(); break;
      case "create-project": openCreateProjectModal(); break;
      case "export-projects": exportProjects(); break;
      case "refresh-projects": fetchProjects(); break;
      case "close-project-modal": closeProjectModal(); break;
      case "close-publish-modal": closePublishModal(); break;
      case "close-delete-modal": closeDeleteModal(); break;
      case "confirm-delete": handleDelete(); break;
    }
  });
});

// Filter listeners
[divisionFilter, statusFilter, searchFilter].forEach(el => {
  if (el) {
    el.addEventListener("input", renderRecordsTable);
    el.addEventListener("change", renderRecordsTable);
  }
});

[projectStatusFilter, projectSearchFilter].forEach(el => {
  if (el) {
    el.addEventListener("input", renderProjectsTable);
    el.addEventListener("change", renderProjectsTable);
  }
});

// Form submits
if (recordForm) recordForm.addEventListener("submit", handleRecordSubmit);
if (projectForm) projectForm.addEventListener("submit", handleProjectSubmit);
if (publishForm) publishForm.addEventListener("submit", handlePublishSubmit);

// Close modals on overlay click
[recordModal, projectModal, publishModal, deleteModal].forEach(modal => {
  modal?.addEventListener("click", (e) => {
    if (e.target === modal) {
      if (modal === recordModal) closeRecordModal();
      else if (modal === projectModal) closeProjectModal();
      else if (modal === publishModal) closePublishModal();
      else if (modal === deleteModal) closeDeleteModal();
    }
  });
});

// Close modals on Escape
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    if (recordModal && !recordModal.hidden) closeRecordModal();
    if (projectModal && !projectModal.hidden) closeProjectModal();
    if (publishModal && !publishModal.hidden) closePublishModal();
    if (deleteModal && !deleteModal.hidden) closeDeleteModal();
  }
});

// ============ INITIALIZE ============

// Ensure all modals are hidden
[recordModal, projectModal, publishModal, deleteModal].forEach(hideModal);

// Load records
fetchRecords();
