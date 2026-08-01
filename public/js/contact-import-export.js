/* =====================================================
   RapportLink Contact Import / Export
   Version 1
   ===================================================== */

/* CONTACT IMPORT / EXPORT */
function syncImportDefaultSelects() {
  const typeSelect = document.getElementById("importDefaultType");
  const stageSelect = document.getElementById("importDefaultStage");
  if (typeSelect) {
    const current = typeSelect.value;
    typeSelect.innerHTML =
      '<option value="">Use file value / Unassigned</option>';
    contactTypes
      .slice()
      .sort()
      .forEach((type) => {
        typeSelect.innerHTML += `<option value="${type}">${type}</option>`;
      });
    if (current) typeSelect.value = current;
  }
  if (stageSelect) {
    const current = stageSelect.value;
    stageSelect.innerHTML =
      '<option value="">Use file value / New Lead</option>';
    pipelineStagesCache.forEach((stage) => {
      stageSelect.innerHTML += `<option value="${stage}">${stage}</option>`;
    });
    if (current) stageSelect.value = current;
  }
}

function normalizeImportHeader(header) {
  return String(header || "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

function getImportValue(row, aliases) {
  const keys = Object.keys(row || {});
  for (const alias of aliases) {
    const normalizedAlias = normalizeImportHeader(alias);
    const match = keys.find(
      (key) => normalizeImportHeader(key) === normalizedAlias,
    );
    if (match !== undefined && row[match] !== undefined && row[match] !== null)
      return String(row[match]).trim();
  }
  return "";
}

function mapImportRow(row) {
  const defaultType = document.getElementById("importDefaultType")?.value || "";
  const defaultStage =
    document.getElementById("importDefaultStage")?.value || "";
  const defaultTags = parseCommaList(
    document.getElementById("importDefaultTags")?.value || "",
  );

  const firstName = getImportValue(row, [
    "First Name",
    "Firstname",
    "First",
    "Given Name",
    "GivenName",
  ]);
  const lastName = getImportValue(row, [
    "Last Name",
    "Lastname",
    "Last",
    "Surname",
    "Family Name",
    "FamilyName",
  ]);
  const fullName = getImportValue(row, [
    "Name",
    "Full Name",
    "FullName",
    "Contact Name",
  ]);
  let finalFirst = firstName;
  let finalLast = lastName;

  if (!finalFirst && !finalLast && fullName) {
    const parts = fullName.split(/\s+/).filter(Boolean);
    finalFirst = parts.shift() || "";
    finalLast = parts.join(" ");
  }

  const fileTags = parseCommaList(
    getImportValue(row, ["Tags", "Tag", "Labels", "Groups"]),
  );
  const allTags = Array.from(new Set([...fileTags, ...defaultTags]));

  return {
    firstName: finalFirst,
    lastName: finalLast,
    email: getImportValue(row, [
      "Email",
      "Email Address",
      "EmailAddress",
      "E-mail",
      "E-mail Address",
    ]),
    phone: getImportValue(row, [
      "Phone",
      "Phone Number",
      "PhoneNumber",
      "Mobile",
      "Cell",
      "Cell Phone",
      "CellPhone",
      "Mobile Phone",
    ]),
    type:
      getImportValue(row, [
        "Type",
        "Contact Type",
        "ContactType",
        "Category",
      ]) ||
      defaultType ||
      "Unassigned",
    stage:
      getImportValue(row, [
        "Stage",
        "Pipeline Stage",
        "PipelineStage",
        "Status",
      ]) ||
      defaultStage ||
      "New Lead",
    tags: allTags,
    note: getImportValue(row, ["Note", "Notes", "Comments", "Description"]),
  };
}

function parseCsvText(text) {
  const rows = [];
  let current = [];
  let value = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const next = text[i + 1];

    if (char === '"' && inQuotes && next === '"') {
      value += '"';
      i++;
    } else if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      current.push(value);
      value = "";
    } else if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && next === "\n") i++;
      current.push(value);
      if (current.some((cell) => String(cell).trim() !== ""))
        rows.push(current);
      current = [];
      value = "";
    } else {
      value += char;
    }
  }

  current.push(value);
  if (current.some((cell) => String(cell).trim() !== "")) rows.push(current);

  if (rows.length < 2) return [];
  const headers = rows[0].map((h) => String(h || "").trim());
  return rows.slice(1).map((row) => {
    const obj = {};
    headers.forEach(
      (header, index) =>
        (obj[header || `Column ${index + 1}`] = row[index] || ""),
    );
    return obj;
  });
}

async function handleContactImportFile(event) {
  const file = event.target.files && event.target.files[0];
  if (!file) return;

  const extension = file.name.split(".").pop().toLowerCase();

  try {
    let rawRows = [];

    if (extension === "csv") {
      const text = await file.text();
      rawRows = parseCsvText(text);
    } else if (extension === "xlsx" || extension === "xls") {
      if (typeof XLSX === "undefined") {
        alert(
          "Excel parser could not load. Please save your file as CSV and try again.",
        );
        return;
      }
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: "array" });
      const firstSheetName = workbook.SheetNames[0];
      rawRows = XLSX.utils.sheet_to_json(workbook.Sheets[firstSheetName], {
        defval: "",
      });
    } else {
      alert("Please upload a CSV, XLSX, or XLS file.");
      return;
    }

    contactImportRows = rawRows
      .map(mapImportRow)
      .filter((row) => row.firstName || row.lastName || row.email || row.phone);
    analyzeContactImport();
    renderContactImportPreview();
  } catch (error) {
    console.error("Import parse error:", error);
    alert(
      "Could not read this file. Please check the column headers or save it as a CSV and try again.",
    );
  }
}

function analyzeContactImport() {
  const existingEmails = new Set(
    contactsCache
      .map((c) =>
        String(c.email || "")
          .trim()
          .toLowerCase(),
      )
      .filter(Boolean),
  );
  const existingPhones = new Set(
    contactsCache
      .map((c) =>
        String(c.phone || "")
          .replace(/\D/g, "")
          .slice(0, 10),
      )
      .filter(Boolean),
  );
  const seenEmails = new Set();
  const seenPhones = new Set();

  let valid = 0;
  let duplicates = 0;
  let missingContactInfo = 0;
  const rows = contactImportRows.map((row) => {
    const emailKey = String(row.email || "")
      .trim()
      .toLowerCase();
    const phoneKey = String(row.phone || "")
      .replace(/\D/g, "")
      .slice(0, 10);
    const reasons = [];

    if (!emailKey && !phoneKey) reasons.push("Missing email and phone");
    if (emailKey && existingEmails.has(emailKey))
      reasons.push("Duplicate email already in CRM");
    if (phoneKey && existingPhones.has(phoneKey))
      reasons.push("Duplicate phone already in CRM");
    if (emailKey && seenEmails.has(emailKey))
      reasons.push("Duplicate email in file");
    if (phoneKey && seenPhones.has(phoneKey))
      reasons.push("Duplicate phone in file");

    if (emailKey) seenEmails.add(emailKey);
    if (phoneKey) seenPhones.add(phoneKey);

    if (reasons.length) {
      duplicates += reasons.some((r) => r.toLowerCase().includes("duplicate"))
        ? 1
        : 0;
      missingContactInfo += reasons.some((r) =>
        r.toLowerCase().includes("missing"),
      )
        ? 1
        : 0;
    } else {
      valid++;
    }

    return {
      ...row,
      importStatus: reasons.length ? "Skip" : "Ready",
      importReasons: reasons,
    };
  });

  contactImportAnalysis = {
    total: contactImportRows.length,
    valid,
    duplicates,
    missingContactInfo,
    rows,
  };
}

function renderContactImportPreview() {
  const area = document.getElementById("importPreviewArea");
  const summary = document.getElementById("importSummary");
  const warnings = document.getElementById("importWarnings");
  const table = document.getElementById("importPreviewTable");
  if (!area || !summary || !warnings || !table || !contactImportAnalysis)
    return;

  area.style.display = "block";
  const data = contactImportAnalysis;

  summary.innerHTML = `
    <div class="import-summary-card"><div class="import-summary-number">${data.total}</div><div class="small-muted">Rows Found</div></div>
    <div class="import-summary-card"><div class="import-summary-number">${data.valid}</div><div class="small-muted">Ready To Import</div></div>
    <div class="import-summary-card"><div class="import-summary-number">${data.duplicates}</div><div class="small-muted">Duplicates</div></div>
    <div class="import-summary-card"><div class="import-summary-number">${data.missingContactInfo}</div><div class="small-muted">Missing Email/Phone</div></div>
  `;

  warnings.innerHTML =
    data.valid === 0
      ? '<div class="import-warning">No importable contacts were found. Check that your file has at least an email or phone column.</div>'
      : '<div class="small-muted">Duplicates and rows without email/phone will be skipped automatically.</div>';

  const previewRows = data.rows.slice(0, 50);
  table.innerHTML = `
    <table class="table table-sm table-hover">
      <thead>
        <tr>
          <th>Status</th><th>Name</th><th>Email</th><th>Phone</th><th>Type</th><th>Stage</th><th>Tags</th><th>Notes</th>
        </tr>
      </thead>
      <tbody>
        ${previewRows
          .map(
            (row) => `
          <tr class="${row.importStatus === "Skip" ? "table-warning" : ""}">
            <td><b>${row.importStatus}</b>${row.importReasons.length ? `<br><small>${row.importReasons.join("<br>")}</small>` : ""}</td>
            <td>${row.firstName || ""} ${row.lastName || ""}</td>
            <td>${row.email || ""}</td>
            <td>${formatPhone(row.phone || "")}</td>
            <td>${row.type || ""}</td>
            <td>${row.stage || ""}</td>
            <td>${(row.tags || []).join(", ")}</td>
            <td>${row.note || ""}</td>
          </tr>
        `,
          )
          .join("")}
      </tbody>
    </table>
    ${data.rows.length > 50 ? `<div class="small-muted p-2">Showing first 50 of ${data.rows.length} rows.</div>` : ""}
  `;

  document.getElementById("runImportButton").disabled = data.valid === 0;
}

async function runContactImport() {
  if (!contactImportAnalysis || contactImportAnalysis.valid === 0) {
    alert("There are no valid contacts to import.");
    return;
  }

  const rowsToImport = contactImportAnalysis.rows.filter(
    (row) => row.importStatus === "Ready",
  );

  const res = await fetch("/api/contacts/import", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ contacts: rowsToImport }),
  });

  const data = await res.json();

  if (data.success) {
    alert(
      `Import complete. Added ${data.imported || 0} contact(s). Skipped ${data.skipped || 0}.`,
    );
    clearContactImport();
    loadContacts();
    loadTags();
    loadDashboard();
    loadPipeline();
    loadTextCampaignActivity();
  } else {
    alert(data.error || "Import failed.");
  }
}

function clearContactImport() {
  contactImportRows = [];
  contactImportAnalysis = null;
  const fileInput = document.getElementById("contactImportFile");
  if (fileInput) fileInput.value = "";
  const area = document.getElementById("importPreviewArea");
  if (area) area.style.display = "none";
}

function downloadContactTemplate() {
  const csv =
    'First Name,Last Name,Email,Phone,Type,Stage,Tags,Notes\nJohn,Smith,john@example.com,7755551234,Buyer,New Lead,"Imported, Reno",Met at open house\n';
  downloadTextFile("excel-crm-contact-import-template.csv", csv, "text/csv");
}

function exportContactsCsv() {
  window.location.href = "/api/contacts/export";
}

function downloadTextFile(filename, text, mimeType) {
  const blob = new Blob([text], { type: mimeType || "text/plain" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
