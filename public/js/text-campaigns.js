/* =====================================================
   RapportLink Text Campaigns Module
   Version 1
   ===================================================== */

/* TEXT CAMPAIGNS */
function renderTextCampaignBuilder() {
  renderTextCampaignSegments();
  renderTextCampaignTypes();
  renderTextCampaignTags();
  updateTextCampaignCount();
}

function renderTextCampaignSegments() {
  const container = document.getElementById("textCampaignSegmentList");
  if (!container) return;

  container.innerHTML = "";

  if (!segmentsCache.length) {
    container.innerHTML =
      '<div class="text-muted small">No segments saved yet.</div>';
    return;
  }

  segmentsCache.forEach((segment) => {
    const count = contactsCache.filter((contact) =>
      segmentMatchesContactForText(segment, contact),
    ).length;
    container.innerHTML += `
      <label class="recipient-pill">
        <input type="checkbox" class="text-campaign-segment-checkbox" value="${segment.id}" onchange="updateTextCampaignCount()">
        ${segment.name}
        <span class="text-muted small">(${count})</span>
      </label>
    `;
  });
}

function renderTextCampaignTypes() {
  const container = document.getElementById("textCampaignTypeList");
  if (!container) return;

  container.innerHTML = "";

  contactTypes.sort().forEach((type) => {
    const count = contactsCache.filter(
      (c) => (c.type || "") === type && c.phone,
    ).length;
    container.innerHTML += `
      <label class="recipient-pill">
        <input type="checkbox" class="text-campaign-type-checkbox" value="${type}" onchange="updateTextCampaignCount()">
        ${type}
        <span class="text-muted small">(${count})</span>
      </label>
    `;
  });
}

function renderTextCampaignTags() {
  const container = document.getElementById("textCampaignTagList");
  if (!container) return;

  container.innerHTML = "";

  if (!allTagsCache.length) {
    container.innerHTML =
      '<div class="text-muted small">No tags created yet.</div>';
    return;
  }

  allTagsCache.forEach((tag) => {
    const count = contactsCache.filter(
      (c) => Array.isArray(c.tags) && c.tags.includes(tag) && c.phone,
    ).length;
    container.innerHTML += `
      <label class="recipient-pill">
        <input type="checkbox" class="text-campaign-tag-checkbox" value="${tag}" onchange="updateTextCampaignCount()">
        ${tag}
        <span class="text-muted small">(${count})</span>
      </label>
    `;
  });
}

function segmentMatchesContactForText(segment, contact) {
  const contactTags = Array.isArray(contact.tags) ? contact.tags : [];
  const segmentTags = Array.isArray(segment.tags) ? segment.tags : [];
  const segmentTypes = Array.isArray(segment.types) ? segment.types : [];

  const tagMatch =
    segmentTags.length === 0 ||
    segmentTags.some((tag) => contactTags.includes(tag));
  const typeMatch =
    segmentTypes.length === 0 || segmentTypes.includes(contact.type || "");

  return contact.phone && tagMatch && typeMatch;
}

function normalizeTextPhoneClient(phone) {
  const raw = String(phone || "").trim();
  const digits = raw.replace(/\D/g, "");
  if (raw.startsWith("+")) return raw;
  if (digits.length === 10) return "+1" + digits;
  if (digits.length === 11 && digits.startsWith("1")) return "+" + digits;
  return raw;
}

function getTextCampaignRecipients() {
  const recipientMap = new Map();

  function addContact(contact) {
    if (!contact || !contact.phone) return;
    const phone = normalizeTextPhoneClient(contact.phone);
    if (!phone) return;
    recipientMap.set(phone, {
      contactId: contact.id,
      contactName: contactName(contact),
      to: phone,
      phone,
    });
  }

  document
    .querySelectorAll(".text-campaign-segment-checkbox:checked")
    .forEach((box) => {
      const segment = segmentsCache.find(
        (s) => String(s.id) === String(box.value),
      );
      if (segment) {
        contactsCache
          .filter((contact) => segmentMatchesContactForText(segment, contact))
          .forEach(addContact);
      }
    });

  document
    .querySelectorAll(".text-campaign-type-checkbox:checked")
    .forEach((box) => {
      contactsCache
        .filter((c) => (c.type || "") === box.value && c.phone)
        .forEach(addContact);
    });

  document
    .querySelectorAll(".text-campaign-tag-checkbox:checked")
    .forEach((box) => {
      contactsCache
        .filter(
          (c) => Array.isArray(c.tags) && c.tags.includes(box.value) && c.phone,
        )
        .forEach(addContact);
    });

  const extra = (document.getElementById("extraTextRecipients")?.value || "")
    .split(",")
    .map((p) => normalizeTextPhoneClient(p.trim()))
    .filter((p) => p.length > 0);

  extra.forEach((phone) => {
    if (!recipientMap.has(phone)) {
      recipientMap.set(phone, {
        contactId: null,
        contactName: "Additional Number",
        to: phone,
        phone,
      });
    }
  });

  return Array.from(recipientMap.values());
}

function updateTextCampaignCount() {
  const message = document.getElementById("textCampaignMessage")?.value || "";
  const recipients = getTextCampaignRecipients();

  const countLabel = document.getElementById("textCampaignRecipientCount");
  if (countLabel)
    countLabel.innerText =
      recipients.length === 1 ? "1 selected" : `${recipients.length} selected`;

  const charLabel = document.getElementById("textCampaignCharacterCount");
  if (charLabel)
    charLabel.innerText = `${message.length} character${message.length === 1 ? "" : "s"}`;

  const preview = document.getElementById("textCampaignRecipientPreview");
  if (preview) {
    if (recipients.length === 0) {
      preview.innerHTML = "No recipients selected yet.";
    } else {
      preview.innerHTML =
        recipients
          .slice(0, 20)
          .map(
            (r) => `
        <span class="tag-pill">${r.contactName || "Number"} — ${formatPhone(r.phone)}</span>
      `,
          )
          .join("") +
        (recipients.length > 20
          ? `<div class="small-muted mt-2">+ ${recipients.length - 20} more recipient(s)</div>`
          : "");
    }
  }
}

async function sendTextCampaign() {
  const recipients = getTextCampaignRecipients();
  const payload = {
    name:
      (document.getElementById("textCampaignName")?.value || "").trim() ||
      "Untitled Text Campaign",
    message: (
      document.getElementById("textCampaignMessage")?.value || ""
    ).trim(),
    recipients,
  };

  if (recipients.length === 0) {
    alert("Please select at least one text recipient.");
    return;
  }

  if (!payload.message) {
    alert("Please write a text message.");
    return;
  }

  if (!confirm(`Send this text campaign to ${recipients.length} recipient(s)?`))
    return;

  try {
    const res = await fetch("/api/send-text-campaign", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await res.json();

    if (data.success) {
      alert(data.message || "Text campaign sent.");
      clearTextCampaignForm(false);
    } else {
      alert(data.error || data.message || "Text campaign failed.");
      console.log("Text campaign response:", data);
    }

    loadTextCampaignActivity();
    if (currentContact) loadSmsHistory(currentContact.id);
  } catch (error) {
    alert(
      "Text campaign could not be sent. Check the browser console and server logs.",
    );
    console.error("Text campaign error:", error);
  }
}

function clearTextCampaignForm(showAlert = true) {
  if (document.getElementById("textCampaignName")) textCampaignName.value = "";
  if (document.getElementById("textCampaignMessage"))
    textCampaignMessage.value = "";
  if (document.getElementById("extraTextRecipients"))
    extraTextRecipients.value = "";
  document
    .querySelectorAll(
      ".text-campaign-segment-checkbox,.text-campaign-type-checkbox,.text-campaign-tag-checkbox",
    )
    .forEach((box) => (box.checked = false));
  updateTextCampaignCount();
  if (showAlert) alert("Text campaign form cleared.");
}

async function loadTextCampaignActivity() {
  const container = document.getElementById("textCampaignActivityList");
  if (!container) return;

  try {
    const res = await fetch("/api/sms-activity");
    const rows = await res.json();

    if (!rows.length) {
      container.innerHTML =
        '<div class="text-muted small">No text activity yet.</div>';
      return;
    }

    container.innerHTML = rows
      .slice(0, 25)
      .map(
        (item) => `
      <div class="activity-row">
        <div class="d-flex justify-content-between align-items-start">
          <div>
            <b>${item.campaignName || item.contactName || "Text Message"}</b><br>
            <small>${formatPhone(item.to || "")} | ${item.status || ""}</small>
          </div>
          <small>${formatDate(item.sentAt || item.createdAt)}</small>
        </div>
        <div class="mt-2">${item.message || ""}</div>
        ${item.error ? `<div class="text-danger small mt-1">${item.error}</div>` : ""}
      </div>
    `,
      )
      .join("");
  } catch (error) {
    container.innerHTML =
      '<div class="text-muted small">Text activity could not be loaded.</div>';
  }
}
