/* =====================================================
   RapportLink Campaigns JavaScript
   Version 1
   ===================================================== */

/* TEMPLATES */
async function loadTemplates() {
  const res = await fetch("/api/templates");
  templatesCache = await res.json();

  templateList.innerHTML = "";

  if (!templatesCache.length) {
    templateList.innerHTML =
      '<div class="text-muted small">No templates saved yet.</div>';
    return;
  }

  templatesCache
    .slice()
    .sort(
      (a, b) =>
        new Date(b.createdAt || b.updatedAt || 0) -
        new Date(a.createdAt || a.updatedAt || 0),
    )
    .forEach((t) => {
      templateList.innerHTML += `
        <div class="template-card">
          <div class="d-flex justify-content-between align-items-start">
            <div>
              <b>${t.name || "Untitled Template"}</b><br>
              <small>Subject: ${t.subject || ""}</small><br>
              <small>Category: ${t.category || "General"}</small>
            </div>
            <div>
              <button class="btn btn-sm btn-outline-primary" onclick="loadTemplateIntoCampaign(${t.id})">Use</button>
              <button class="btn btn-sm btn-outline-danger" onclick="deleteTemplate(${t.id})">Delete</button>
            </div>
          </div>
        </div>
      `;
    });
}

async function saveTemplateFromCampaign() {
  const payload = {
    name:
      templateName.value.trim() ||
      campaignName.value.trim() ||
      "Untitled Template",
    category: templateCategory.value.trim() || "General",
    subject: subject.value,
    preheader: document.getElementById("preheader") ? preheader.value : "",
    html: quill.root.innerHTML,
  };

  if (!payload.subject.trim()) {
    alert("Please enter a subject before saving a template.");
    return;
  }

  const res = await fetch("/api/templates", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const data = await res.json();

  if (data.success) {
    alert("Template saved.");
    templateName.value = "";
    templateCategory.value = "";
    loadTemplates();
  } else {
    alert(data.error || "Template could not be saved.");
  }
}

function loadTemplateIntoCampaign(id) {
  const template = templatesCache.find((t) => t.id == id);
  if (!template) return;

  subject.value = template.subject || "";
  quill.root.innerHTML = template.html || "";
  tryLoadDesignFromHtml(template.html || "");

  if (!campaignName.value.trim()) {
    campaignName.value = template.name || "";
  }

  alert("Template loaded into Campaign Builder.");
}

async function deleteTemplate(id) {
  if (!confirm("Delete this template?")) return;

  const res = await fetch("/api/templates/" + id, { method: "DELETE" });
  const data = await res.json();

  if (data.success) {
    loadTemplates();
  } else {
    alert(data.error || "Template could not be deleted.");
  }
}

/* TAGS */
async function loadTags() {
  const res = await fetch("/api/tags");
  allTagsCache = await res.json();
  renderRecipientTags();
  populateContactFilterControls();
  renderTextCampaignTags();
}

/* SEGMENTS */
async function loadSegments() {
  const res = await fetch("/api/segments");
  segmentsCache = await res.json();

  renderSegmentList();
  renderRecipientSegments();
  renderTextCampaignSegments();
}

function renderSegmentList() {
  segmentList.innerHTML = "";

  if (!segmentsCache.length) {
    segmentList.innerHTML =
      '<div class="text-muted small">No segments saved yet.</div>';
    return;
  }

  segmentsCache.forEach((s) => {
    segmentList.innerHTML += `
      <div class="segment-card">
        <div class="d-flex justify-content-between align-items-start">
          <div>
            <b>${s.name || "Untitled Segment"}</b><br>
            <small>Tags: ${(s.tags || []).join(", ") || "Any"}</small><br>
            <small>Types: ${(s.types || []).join(", ") || "Any"}</small>
          </div>
          <button class="btn btn-sm btn-outline-danger" onclick="deleteSegment(${s.id})">Delete</button>
        </div>
      </div>
    `;
  });
}

async function saveSegment() {
  const payload = {
    name: segmentName.value.trim(),
    tags: parseCommaList(segmentTags.value),
    types: parseCommaList(segmentTypes.value),
  };

  if (!payload.name) {
    alert("Please enter a segment name.");
    return;
  }

  const res = await fetch("/api/segments", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const data = await res.json();

  if (data.success) {
    alert("Segment saved.");
    segmentName.value = "";
    segmentTags.value = "";
    segmentTypes.value = "";
    loadSegments();
  } else {
    alert(data.error || "Segment could not be saved.");
  }
}

async function deleteSegment(id) {
  if (!confirm("Delete this segment?")) return;

  const res = await fetch("/api/segments/" + id, { method: "DELETE" });
  const data = await res.json();

  if (data.success) {
    loadSegments();
  } else {
    alert(data.error || "Segment could not be deleted.");
  }
}

/* SCHEDULING */
async function loadScheduledCampaigns() {
  const res = await fetch("/api/scheduled-campaigns");
  scheduledCampaignsCache = await res.json();

  scheduledCampaignList.innerHTML = "";

  if (!scheduledCampaignsCache.length) {
    scheduledCampaignList.innerHTML =
      '<div class="text-muted small">No scheduled campaigns yet.</div>';
    return;
  }

  scheduledCampaignsCache
    .slice()
    .sort((a, b) => new Date(b.scheduledAt || 0) - new Date(a.scheduledAt || 0))
    .forEach((c) => {
      scheduledCampaignList.innerHTML += `
        <div class="scheduled-card">
          <div class="d-flex justify-content-between align-items-start">
            <div>
              <b>${c.name || "Untitled Scheduled Campaign"}</b><br>
              <small>Subject: ${c.subject || ""}</small><br>${c.preheader ? `<small>Preheader: ${c.preheader}</small><br>` : ""}
              <small>Scheduled: ${formatDate(c.scheduledAt)}</small><br>
              <small>Status: ${c.status || "Scheduled"}</small>
            </div>
            ${
              c.status === "Scheduled"
                ? `<button class="btn btn-sm btn-outline-danger" onclick="deleteScheduledCampaign(${c.id})">Cancel</button>`
                : ""
            }
          </div>
        </div>
      `;
    });
}

async function scheduleCampaign() {
  const selectedRecipients = getSelectedRecipients();

  const payload = {
    name: campaignName.value,
    recipients: selectedRecipients,
    subject: subject.value,
    preheader: document.getElementById("preheader") ? preheader.value : "",
    html: quill.root.innerHTML,
    scheduledAt: scheduleDateTime.value,
  };

  if (!payload.scheduledAt) {
    alert("Please choose a scheduled date/time.");
    return;
  }

  if (payload.recipients.length === 0) {
    alert("Please select at least one recipient.");
    return;
  }

  if (!payload.subject.trim()) {
    alert("Please enter a subject.");
    return;
  }

  const res = await fetch("/api/scheduled-campaigns", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const data = await res.json();

  if (data.success) {
    alert("Campaign scheduled.");
    scheduleDateTime.value = "";
    loadScheduledCampaigns();
    loadCalendar();
  } else {
    alert(data.error || "Campaign could not be scheduled.");
  }
}

async function deleteScheduledCampaign(id) {
  if (!confirm("Cancel this scheduled campaign?")) return;

  const res = await fetch("/api/scheduled-campaigns/" + id, {
    method: "DELETE",
  });
  const data = await res.json();

  if (data.success) {
    loadScheduledCampaigns();
    loadCalendar();
  } else {
    alert(data.error || "Scheduled campaign could not be cancelled.");
  }
}

/* RECIPIENT BUILDER */
function renderRecipientBuilder() {
  renderRecipientSegments();
  renderRecipientTypes();
  renderRecipientTags();
  renderIndividualCampaignSummary();
  updateRecipientCount();
}

function renderRecipientSegments() {
  if (!recipientSegmentList) return;

  recipientSegmentList.innerHTML = "";

  if (!segmentsCache.length) {
    recipientSegmentList.innerHTML =
      '<div class="text-muted small">No segments saved yet.</div>';
    return;
  }

  segmentsCache.forEach((segment) => {
    recipientSegmentList.innerHTML += `
      <label class="recipient-pill">
        <input type="checkbox" class="recipient-segment-checkbox" value="${segment.id}" onchange="updateRecipientCount()">
        ${segment.name}
      </label>
    `;
  });
}

function renderRecipientTypes() {
  recipientTypeList.innerHTML = "";

  contactTypes.sort().forEach((type) => {
    const count = contactsCache.filter(
      (c) =>
        (c.type || "") === type && c.email && !c.unsubscribed && !c.bounced,
    ).length;

    recipientTypeList.innerHTML += `
      <label class="recipient-pill">
        <input type="checkbox" class="recipient-type-checkbox" value="${type}" onchange="updateRecipientCount()">
        ${type}
        <span class="text-muted small">(${count})</span>
      </label>
    `;
  });
}

function renderRecipientTags() {
  if (!recipientTagList) return;

  recipientTagList.innerHTML = "";

  if (!allTagsCache.length) {
    recipientTagList.innerHTML =
      '<div class="text-muted small">No tags created yet.</div>';
    return;
  }

  allTagsCache.forEach((tag) => {
    const count = contactsCache.filter(
      (c) =>
        Array.isArray(c.tags) &&
        c.tags.includes(tag) &&
        c.email &&
        !c.unsubscribed &&
        !c.bounced,
    ).length;

    recipientTagList.innerHTML += `
      <label class="recipient-pill">
        <input type="checkbox" class="recipient-tag-checkbox" value="${tag}" onchange="updateRecipientCount()">
        ${tag}
        <span class="text-muted small">(${count})</span>
      </label>
    `;
  });
}

function renderRecipientContacts() {
  if (!document.getElementById("recipientContactList")) return;
  const search = (
    document.getElementById("recipientSearch")?.value || ""
  ).toLowerCase();
  recipientContactList.innerHTML = "";

  const filtered = contactsCache.filter((c) => {
    const tagText = Array.isArray(c.tags) ? c.tags.join(" ") : "";
    const text =
      `${c.firstName || ""} ${c.lastName || ""} ${c.email || ""} ${formatPhone(c.phone)} ${c.type || ""} ${c.stage || ""} ${tagText} ${c.unsubscribed ? "unsubscribed" : "subscribed"} ${c.bounced ? "bounced invalid" : "valid"}`.toLowerCase();
    return text.includes(search);
  });

  if (filtered.length === 0) {
    recipientContactList.innerHTML =
      '<div class="text-muted p-2">No contacts found.</div>';
    return;
  }

  filtered.forEach((c) => {
    if (!c.email) return;

    const blocked = c.unsubscribed || c.bounced;

    recipientContactList.innerHTML += `
      <label class="contact-select-row" style="${blocked ? "opacity:0.55;" : ""}">
        <input type="checkbox" class="recipient-contact-checkbox" value="${c.email}" onchange="updateRecipientCount()" ${blocked ? "disabled" : ""}>
        <div>
          <div>
            <b>${c.firstName || ""} ${c.lastName || ""}</b>
            ${c.unsubscribed ? '<span class="unsubscribed-badge">Unsubscribed</span>' : ""}
            ${c.bounced ? '<span class="bounced-badge">Bounced</span>' : ""}
          </div>
          <small class="text-muted">${c.email} | ${formatPhone(c.phone)} | ${c.type || ""} | ${c.stage || "New Lead"}</small>
          ${renderTags(c.tags)}
        </div>
      </label>
    `;
  });
}

function renderIndividualCampaignSummary() {
  const container = document.getElementById("individualCampaignSummary");
  if (!container) return;

  const selectedContacts = contactsCache.filter((c) =>
    selectedCampaignContactIds.has(String(c.id)),
  );

  if (selectedContacts.length === 0) {
    container.innerHTML =
      '<div class="text-muted small">No individual contacts selected yet.</div>';
    return;
  }

  container.innerHTML = `
    <div class="mb-2"><span class="status-badge">${selectedContacts.length} individual contact(s) selected</span></div>
    ${selectedContacts
      .map(
        (c) => `
      <span class="tag-pill">
        ${contactName(c)}${c.email ? ` &lt;${c.email}&gt;` : ""}
        <button class="btn btn-sm btn-link p-0 ms-1" onclick="removeIndividualCampaignContact('${c.id}')">remove</button>
      </span>
    `,
      )
      .join("")}
  `;
}

function toggleCurrentContactForCampaign() {
  if (!currentContact) return;
  const id = String(currentContact.id);

  if (selectedCampaignContactIds.has(id)) {
    selectedCampaignContactIds.delete(id);
  } else {
    selectedCampaignContactIds.add(id);
  }

  saveSelectedCampaignContacts();
  updateCampaignContactButton();
  renderIndividualCampaignSummary();
  updateRecipientCount();
}

function removeIndividualCampaignContact(id) {
  selectedCampaignContactIds.delete(String(id));
  saveSelectedCampaignContacts();
  renderIndividualCampaignSummary();
  updateRecipientCount();
  updateCampaignContactButton();
}

function clearIndividualCampaignContacts() {
  selectedCampaignContactIds.clear();
  saveSelectedCampaignContacts();
  renderIndividualCampaignSummary();
  updateRecipientCount();
  updateCampaignContactButton();
}

function updateCampaignContactButton() {
  const button = document.getElementById("campaignSelectContactButton");
  if (!button || !currentContact) return;

  const selected = selectedCampaignContactIds.has(String(currentContact.id));
  button.innerText = selected
    ? "Remove from Campaign Recipients"
    : "Add to Campaign Recipients";
  button.className = selected
    ? "btn btn-sm btn-success"
    : "btn btn-sm btn-outline-primary";
}

function segmentMatchesContact(segment, contact) {
  const contactTags = Array.isArray(contact.tags) ? contact.tags : [];
  const segmentTags = Array.isArray(segment.tags) ? segment.tags : [];
  const segmentTypes = Array.isArray(segment.types) ? segment.types : [];

  const tagMatch =
    segmentTags.length === 0 ||
    segmentTags.some((tag) => contactTags.includes(tag));
  const typeMatch =
    segmentTypes.length === 0 || segmentTypes.includes(contact.type || "");

  return (
    contact.email &&
    !contact.unsubscribed &&
    !contact.bounced &&
    tagMatch &&
    typeMatch
  );
}

function getSelectedRecipients() {
  const selectedEmails = new Set();

  document
    .querySelectorAll(".recipient-segment-checkbox:checked")
    .forEach((box) => {
      const segment = segmentsCache.find(
        (s) => String(s.id) === String(box.value),
      );
      if (segment) {
        contactsCache
          .filter((contact) => segmentMatchesContact(segment, contact))
          .forEach((contact) => selectedEmails.add(contact.email.trim()));
      }
    });

  document
    .querySelectorAll(".recipient-type-checkbox:checked")
    .forEach((box) => {
      contactsCache
        .filter(
          (c) =>
            (c.type || "") === box.value &&
            c.email &&
            !c.unsubscribed &&
            !c.bounced,
        )
        .forEach((c) => selectedEmails.add(c.email.trim()));
    });

  document
    .querySelectorAll(".recipient-tag-checkbox:checked")
    .forEach((box) => {
      contactsCache
        .filter(
          (c) =>
            Array.isArray(c.tags) &&
            c.tags.includes(box.value) &&
            c.email &&
            !c.unsubscribed &&
            !c.bounced,
        )
        .forEach((c) => selectedEmails.add(c.email.trim()));
    });

  selectedCampaignContactIds.forEach((id) => {
    const contact = contactsCache.find((c) => String(c.id) === String(id));
    if (contact && contact.email && !contact.unsubscribed && !contact.bounced) {
      selectedEmails.add(contact.email.trim());
    }
  });

  document
    .querySelectorAll(".recipient-contact-checkbox:checked")
    .forEach((box) => {
      if (box.value) selectedEmails.add(box.value.trim());
    });

  const extra = (extraRecipients.value || "")
    .split(",")
    .map((e) => e.trim())
    .filter((e) => e.length > 0);

  extra.forEach((e) => selectedEmails.add(e));

  return Array.from(selectedEmails);
}

function updateRecipientCount() {
  const count = getSelectedRecipients().length;
  if (recipientCount)
    recipientCount.innerText = count === 1 ? "1 selected" : `${count} selected`;
}
