/* =====================================================
   RapportLink Contacts JavaScript
   Version 1
   ===================================================== */

/* CONTACTS */
async function addContact() {
  await fetch("/api/contacts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      firstName: firstName.value,
      lastName: lastName.value,
      email: email.value,
      phone: phone.value,
      type: contactType.value,
      stage: contactStage.value,
      tags: parseCommaList(contactTags.value),
    }),
  });

  firstName.value = "";
  lastName.value = "";
  email.value = "";
  phone.value = "";
  contactTags.value = "";

  loadContacts();
  loadTags();
  loadDashboard();
  loadPipeline();
}
function showContactProfileTab(tabName) {
  const tabs = [
    "overview",
    "profile",
    "transactions",
    "tasks",
    "communications",
    "ai",
  ];

  tabs.forEach((name) => {
    const panel = document.getElementById(
      "contactTab" + name.charAt(0).toUpperCase() + name.slice(1),
    );
    if (panel) panel.style.display = name === tabName ? "block" : "none";
  });

  document.querySelectorAll("#contactProfileTabs .nav-link").forEach((btn) => {
    btn.classList.remove("active");
  });

  const buttons = Array.from(
    document.querySelectorAll("#contactProfileTabs .nav-link"),
  );
  const activeButton = buttons.find(
    (btn) => (btn.innerText || "").toLowerCase() === tabName,
  );
  if (activeButton) activeButton.classList.add("active");

  if (tabName === "communications") {
    loadContactEmailHistory();
    loadSmsHistory();
  }

  if (tabName === "ai") renderContactAIProfilePanel();
}

function setContactFieldValue(id, value) {
  const field = document.getElementById(id);
  if (field) field.value = value || "";
}
function getContactFieldValue(id) {
  const field = document.getElementById(id);
  return field ? field.value : "";
}

function addChildField(child = {}) {
  const container = document.getElementById("childrenContainer");
  if (!container) return;

  const row = document.createElement("div");
  row.className = "row g-2 mb-2 child-row";

  row.innerHTML = `
    <div class="col-md-3">
      <input class="form-control child-name" placeholder="Child name" value="${child.name || ""}">
    </div>
    <div class="col-md-2">
      <input type="date" class="form-control child-birthday" value="${child.birthday || ""}">
    </div>
    <div class="col-md-3">
      <input class="form-control child-phone" placeholder="Child phone" value="${formatPhone(child.phone || "")}" oninput="this.value=formatPhone(this.value)">
    </div>
    <div class="col-md-3">
      <input type="email" class="form-control child-email" placeholder="Child email" value="${child.email || ""}">
    </div>
    <div class="col-md-1">
      <button type="button" class="btn btn-outline-danger btn-sm w-100" onclick="this.closest('.child-row').remove()">×</button>
    </div>
  `;

  container.appendChild(row);
}

function renderChildrenFields(children) {
  const container = document.getElementById("childrenContainer");
  if (!container) return;

  container.innerHTML = "";

  const list = Array.isArray(children) ? children : [];

  if (list.length === 0) {
    addChildField();
    return;
  }

  list.forEach((child) => addChildField(child));
}

function getChildrenFromProfile() {
  return Array.from(document.querySelectorAll("#childrenContainer .child-row"))
    .map((row) => ({
      name: row.querySelector(".child-name")?.value || "",
      birthday: row.querySelector(".child-birthday")?.value || "",
      phone: formatPhone(row.querySelector(".child-phone")?.value || ""),
      email: row.querySelector(".child-email")?.value || "",
    }))
    .filter(
      (child) => child.name || child.birthday || child.phone || child.email,
    );
}

function openContact(id) {
  currentContact = contactsCache.find((c) => String(c.id) === String(id));

  if (!currentContact) {
    alert("Contact could not be found. Refreshing contacts now.");
    loadContacts();
    return;
  }

  const mainTabs = document.querySelector(".nav-tabs");
  if (mainTabs) mainTabs.style.display = "none";

  const appToolbar = document.querySelector(".app-toolbar");
  if (appToolbar) appToolbar.style.display = "none";

  const contactsAddressBookView = document.getElementById(
    "contactsAddressBookView",
  );
  if (contactsAddressBookView) contactsAddressBookView.style.display = "none";

  const contactsTab = document.getElementById("contactsTab");

  if (contactsTab && contactPanel.parentElement !== contactsTab) {
    contactsTab.appendChild(contactPanel);
  }

  contactPanel.classList.add("open");

  window.scrollTo({
    top: 0,
    behavior: "smooth",
  });

  editFirst.value = currentContact.firstName || "";
  editLast.value = currentContact.lastName || "";
  editEmail.value = currentContact.email || "";

  setContactFieldValue("editWorkEmail", currentContact.workEmail);
  setContactFieldValue("editSecondaryEmail", currentContact.secondaryEmail);
  setContactFieldValue("editSpouseEmailAlt", currentContact.spouseEmailAlt);

  editPhone.value = formatPhone(currentContact.phone || "");

  setContactFieldValue(
    "editWorkPhone",
    formatPhone(currentContact.workPhone || ""),
  );
  setContactFieldValue(
    "editHomePhone",
    formatPhone(currentContact.homePhone || ""),
  );
  setContactFieldValue(
    "editOtherPhone",
    formatPhone(currentContact.otherPhone || ""),
  );

  const currentRoles = Array.isArray(currentContact.roles)
    ? currentContact.roles
    : String(currentContact.type || "")
        .split(",")
        .map((r) => r.trim())
        .filter(Boolean);

  document.getElementById("roleBuyer").checked = currentRoles.includes("Buyer");
  document.getElementById("roleSeller").checked =
    currentRoles.includes("Seller");
  document.getElementById("roleInvestor").checked =
    currentRoles.includes("Investor");
  document.getElementById("roleReferralPartner").checked =
    currentRoles.includes("Referral Partner");

  editStage.value = inferStageFromContact(currentContact);

  editTags.value = Array.isArray(currentContact.tags)
    ? currentContact.tags.join(", ")
    : "";

  setContactFieldValue("editBirthday", currentContact.birthday);
  setContactFieldValue("editOccupation", currentContact.occupation);
  setContactFieldValue("editCompany", currentContact.company);
  setContactFieldValue("editSpouseName", currentContact.spouseName);
  setContactFieldValue("editSpouseBirthday", currentContact.spouseBirthday);
  setContactFieldValue("editSpouseOccupation", currentContact.spouseOccupation);
  setContactFieldValue("editSpouseEmail", currentContact.spouseEmail);
  setContactFieldValue(
    "editSpousePhone",
    formatPhone(currentContact.spousePhone || ""),
  );
  setContactFieldValue("editAnniversary", currentContact.anniversary);

  renderChildrenFields(currentContact.children);

  setContactFieldValue("editChild1Name", currentContact.child1Name);
  setContactFieldValue("editChild1Birthday", currentContact.child1Birthday);
  setContactFieldValue("editChild2Name", currentContact.child2Name);
  setContactFieldValue("editChild2Birthday", currentContact.child2Birthday);
  setContactFieldValue("editPets", currentContact.pets);
  setContactFieldValue("editHobbies", currentContact.hobbies);
  setContactFieldValue(
    "editFavoriteRestaurant",
    currentContact.favoriteRestaurant,
  );
  setContactFieldValue("editFavoriteTeams", currentContact.favoriteTeams);
  setContactFieldValue("editInterests", currentContact.interests);
  setContactFieldValue(
    "editRelationshipNotes",
    currentContact.relationshipNotes,
  );

  const contactWorkspaceTitle = document.getElementById(
    "contactWorkspaceTitle",
  );
  if (contactWorkspaceTitle) {
    contactWorkspaceTitle.innerText = contactName(currentContact);
  }

  renderContactQuickSummary();
  renderContactTransactions();
  renderQuickStageButtons();
  renderQuickTagButtons();
  updateCampaignContactButton();

  contactUnsubscribeStatus.innerHTML = currentContact.unsubscribed
    ? `<span class="unsubscribed-badge">Unsubscribed</span><br><small class="text-muted">Unsubscribed: ${formatDate(currentContact.unsubscribedAt)}</small>`
    : `<span class="active-badge">Subscribed</span>`;

  contactBounceStatus.innerHTML = currentContact.bounced
    ? `<span class="bounced-badge">Bounced / Invalid Email</span><br><small class="text-muted">Bounced: ${formatDate(currentContact.bouncedAt)}</small>${currentContact.bounceReason ? `<br><small class="text-danger">${currentContact.bounceReason}</small>` : ""}`
    : `<span class="active-badge">Valid Email</span>`;

  const notesListEl = document.getElementById("notesList");
  if (notesListEl) {
    notesListEl.innerHTML = (currentContact.notes || [])
      .map(
        (n) =>
          `<div class="note">${n.text}<br><small>${formatDate(n.date)}</small></div>`,
      )
      .join("");
  }

  renderContactTasks();
  renderContactTimeline([]);
  renderContactAIProfilePanel();
  showContactProfileTab("overview");
  loadActivity(currentContact.email);
  loadSmsHistory();
}

function renderContactAIProfilePanel() {
  const panel = document.getElementById("contactAIProfilePanel");
  if (!panel || !currentContact) return;

  try {
    const insight =
      typeof buildAIContactInsights === "function"
        ? buildAIContactInsights(
            [currentContact],
            activityCache || [],
            smsActivityCache || [],
          )[0] || {}
        : {};

    const leadScore = Number(insight.leadScore || 0);
    const oppScore = Number(insight.opportunityScore || 0);
    const heat = insight.heat || "Cold";
    const heatClass =
      typeof aiHeatClass === "function" ? aiHeatClass(heat) : "cold";
    const badgeText =
      typeof aiHeatBadgeText === "function"
        ? aiHeatBadgeText(insight)
        : `${heat} ${leadScore}`;
    const coach =
      typeof getAIContactCoachMessage === "function"
        ? getAIContactCoachMessage(insight)
        : "AI is reviewing this contact based on activity, tasks, stage, and communication history.";

    panel.innerHTML = `
      <div class="modern-card mb-3">
        <h5 class="mb-2">AI Contact Intelligence</h5>

        <div class="mb-3">
          <span class="ai-contact-badge ${heatClass}">${aiSafe(badgeText)}</span>
          <span class="ai-contact-badge action">Lead Score ${leadScore}</span>
          <span class="ai-contact-badge action">Opportunity Score ${oppScore}</span>
        </div>

        <div class="ai-contact-detail-grid">
          <div class="ai-contact-detail-card">
            <div class="ai-contact-detail-number">${leadScore}</div>
            <div class="ai-contact-detail-label">Lead Score</div>
            <div class="ai-score-bar"><div class="ai-score-bar-fill" style="width:${Math.min(100, leadScore)}%;"></div></div>
          </div>

          <div class="ai-contact-detail-card">
            <div class="ai-contact-detail-number">${oppScore}</div>
            <div class="ai-contact-detail-label">Opportunity Score</div>
            <div class="ai-score-bar"><div class="ai-score-bar-fill" style="width:${Math.min(100, oppScore)}%;"></div></div>
          </div>

          <div class="ai-contact-detail-card">
            <div class="ai-contact-detail-number">${Number(insight.opens || 0)}</div>
            <div class="ai-contact-detail-label">Email Opens</div>
          </div>

          <div class="ai-contact-detail-card">
            <div class="ai-contact-detail-number">${Number(insight.clicks || 0)}</div>
            <div class="ai-contact-detail-label">Link Clicks</div>
          </div>
        </div>

        <div class="ai-contact-coach-note mt-3">
          <b>AI Coach:</b> ${aiSafe(coach)}
        </div>

        <div class="ai-score-explanation">
          <b>Recommended Next Action:</b><br>
          ${aiSafe(insight.nextAction || "Stay in touch")}
          ${insight.nextActionReason ? `<br><small>${aiSafe(insight.nextActionReason)}</small>` : ""}
        </div>

        <div class="ai-contact-action-grid">
          <button class="btn btn-primary" onclick="aiPrepareFollowUpTask()">Add Follow-Up Task</button>
          <button class="btn btn-outline-primary" onclick="aiPrepareTextMessage()">Draft Text</button>
          <button class="btn btn-outline-primary" onclick="aiSuggestStageMove()">Suggest Stage</button>
          <button class="btn btn-outline-primary" onclick="aiAddContactToCampaignFromPanel()">Add to Campaign</button>
        </div>
      </div>
    `;
  } catch (error) {
    panel.innerHTML = `
      <div class="modern-card">
        <h5>AI Contact Intelligence</h5>
        <div class="text-muted small">AI could not load for this contact yet. Check the browser console for the exact error.</div>
      </div>
    `;
    console.error("Contact AI tab error:", error);
  }
}

function getAIContactCoachMessage(insight = {}) {
  const name = insight.contact ? contactName(insight.contact) : "This contact";
  const heat = insight.heat || "Cold";
  const leadScore = Number(insight.leadScore || 0);
  const oppScore = Number(insight.opportunityScore || 0);
  const stage = insight.stage || "New Lead";
  const clicks = Number(insight.clicks || 0);
  const opens = Number(insight.opens || 0);
  const stale = Number(insight.staleDays || 9999);
  const sentiment = insight.sentiment || "Neutral";

  if (heat === "Network")
    return `${name} appears to be a business or network relationship, so the system is not treating this person as a buyer/seller lead.`;
  if (sentiment === "Negative")
    return `${name} has a negative or cool-down signal. Avoid aggressive follow-up and keep this contact out of active sales outreach.`;
  if (oppScore >= 80)
    return `${name} is one of your best opportunities. The next step should be personal outreach, not a broad campaign.`;
  if (leadScore >= 80)
    return `${name} is highly engaged. Follow up quickly while the activity is fresh.`;
  if (["Under Contract", "Pending"].includes(stage))
    return `${name} is in an active transaction stage. The next best action is to confirm deadlines, status, and next steps.`;
  if (clicks > 0)
    return `${name} clicked at least one link. That usually deserves a specific follow-up about what they clicked.`;
  if (opens >= 3)
    return `${name} is opening your emails. Keep the contact warm with a useful, personal message.`;
  if (stale >= 90 && stale !== 9999)
    return `${name} has gone quiet for a while. Use a re-engagement message or long-term nurture campaign.`;
  if (heat === "Warm")
    return `${name} is warm but not urgent. A simple value-based follow-up this week is appropriate.`;
  return `${name} does not have a strong signal yet. Keep nurturing and watch for opens, clicks, texts, appointment notes, or stage changes.`;
}

function aiPrepareFollowUpTask() {
  if (!currentContact) return;
  const insight =
    buildAIContactInsights(
      [currentContact],
      activityCache,
      smsActivityCache,
    )[0] || {};
  const titleField = document.getElementById("taskTitle");
  const dueField = document.getElementById("taskDue");
  const priorityField = document.getElementById("taskPriority");
  const notesField = document.getElementById("taskNotes");
  const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);

  if (titleField) titleField.value = insight.nextAction || "Follow up";
  if (dueField) dueField.value = tomorrow;
  if (priorityField)
    priorityField.value =
      insight.leadScore >= 80 ||
      insight.opportunityScore >= 80 ||
      insight.overdueTasks > 0
        ? "High"
        : "Normal";
  if (notesField)
    notesField.value = `AI suggestion: ${insight.nextAction || "Follow up"} - ${insight.nextActionReason || "Review this contact and decide the next best step."}`;
  alert(
    "I filled in a suggested follow-up task. Review it, then click Add Task.",
  );
}

function aiPrepareTextMessage() {
  if (!currentContact) return;
  const insight =
    buildAIContactInsights(
      [currentContact],
      activityCache,
      smsActivityCache,
    )[0] || {};
  const textBox = document.getElementById("singleSmsBody");
  const first = currentContact.firstName || "there";
  let msg = `Hi ${first}, just checking in to see how things are going.`;

  if (insight.opportunityScore >= 80 || insight.leadScore >= 80) {
    msg = `Hi ${first}, I wanted to quickly follow up while this is fresh. Do you have a few minutes today to talk?`;
  } else if ((insight.clicks || 0) > 0) {
    msg = `Hi ${first}, I noticed you may have been looking at the information I sent over. Any questions I can help answer?`;
  } else if ((insight.staleDays || 9999) >= 60 && insight.staleDays !== 9999) {
    msg = `Hi ${first}, hope you are doing well. Just wanted to check in and see if anything has changed with your real estate plans.`;
  }

  if (textBox) textBox.value = msg;
  alert("I drafted a suggested text message. Review it, then click Send Text.");
}

function aiAddContactToCampaignFromPanel() {
  if (!currentContact) return;
  selectedCampaignContactIds.add(String(currentContact.id));
  saveSelectedCampaignContacts();
  updateCampaignContactButton();
  renderIndividualCampaignSummary();
  alert(
    `${contactName(currentContact)} was added to individual campaign recipients.`,
  );
}

function aiSuggestStageMove() {
  if (!currentContact) return;
  const insight =
    buildAIContactInsights(
      [currentContact],
      activityCache,
      smsActivityCache,
    )[0] || {};
  const stageField = document.getElementById("editStage");
  let suggested = inferStageFromContact(currentContact);

  if (insight.opportunityScore >= 80) suggested = "Appointment Set";
  else if (insight.leadScore >= 70 || insight.clicks > 0)
    suggested = "Active Prospect";
  else if (insight.leadScore >= 45) suggested = "Contacted";
  else if ((insight.staleDays || 0) >= 90) suggested = "New Lead";

  if (stageField) stageField.value = suggested;
  alert(
    `Suggested stage: ${suggested}. Review it, then click Save Changes if you agree.`,
  );
}

function renderContactQuickSummary() {
  if (!currentContact) return;

  const taskCount = (currentContact.tasks || []).filter((t) => !t.done).length;

  const transactionCount = (Array.isArray(txnCache) ? txnCache : []).filter(
    (t) => {
      const transactionText = JSON.stringify(t || {}).toLowerCase();
      const contactId = String(currentContact.id || "").toLowerCase();
      const contactEmail = String(currentContact.email || "").toLowerCase();

      return (
        (contactId && transactionText.includes(contactId)) ||
        (contactEmail && transactionText.includes(contactEmail))
      );
    },
  ).length;

  const insight =
    buildAIContactInsights(
      [currentContact],
      activityCache,
      smsActivityCache,
    )[0] || {};

  const heatClass = aiHeatClass(insight.heat || "Cold");
  const leadScore = Number(insight.leadScore || 0);
  const oppScore = Number(insight.opportunityScore || 0);
  const relationshipScore = Math.round((leadScore + oppScore) / 2);
  const aiCoach = getAIContactCoachMessage(insight);

  let relationshipLinkedCount = 0;
  let relationshipTimelineCount = 0;

  try {
    if (window.RelationshipEngine) {
      const graph = window.RelationshipEngine.load();
      const graphPerson = (graph.people || []).find((p) => {
        return (
          (currentContact.email && p.email === currentContact.email) ||
          (currentContact.id &&
            String(p.sourceContactId) === String(currentContact.id))
        );
      });

      if (graphPerson) {
        relationshipLinkedCount = window.RelationshipEngine.getLinkedRecords(
          "person",
          graphPerson.id,
        ).length;
        relationshipTimelineCount = window.RelationshipEngine.getTimelineFor(
          "person",
          graphPerson.id,
        ).length;
      }
    }
  } catch (err) {
    console.error("Relationship summary error:", err);
  }

  const workspaceTitle = document.getElementById("contactWorkspaceTitle");
  if (workspaceTitle) workspaceTitle.innerText = contactName(currentContact);

  const workspaceSubtitle = document.getElementById("contactWorkspaceSubtitle");
  if (workspaceSubtitle) {
    workspaceSubtitle.innerHTML = `
      ${currentContact.email || "No email"}
      ${currentContact.phone ? " • " + formatPhone(currentContact.phone || "") : ""}
    `;
  }

  const workspacePills = document.getElementById("contactWorkspacePills");
  if (workspacePills) {
    workspacePills.innerHTML = `
      <span class="contact-workspace-pill">${inferStageFromContact(currentContact)}</span>
      <span class="contact-workspace-pill">${currentContact.type || "Unassigned"}</span>
      <span class="contact-workspace-pill">${taskCount} open task(s)</span>
      <span class="contact-workspace-pill">${transactionCount} transaction(s)</span>
    `;
  }

  const workspaceScore = document.getElementById("contactWorkspaceScore");
  if (workspaceScore) {
    workspaceScore.innerHTML = `
      <div class="score-label">AI Relationship</div>
      <div class="score-number">${relationshipScore}</div>
      <div class="score-note">${insight.heat || "Cold"} signal</div>
    `;
  }

  contactQuickSummary.innerHTML = `
    <div class="contact-ai-grid">

      <div class="contact-ai-card">
        <h5 class="mb-3">AI Signal</h5>

        <div class="contact-ai-metric">
          <span>Lead Score</span>
          <b>${leadScore}</b>
        </div>

        <div class="contact-ai-metric">
          <span>Opportunity Score</span>
          <b>${oppScore}</b>
        </div>

        <div class="contact-ai-metric">
          <span>Heat Level</span>
          <b>${aiSafe(insight.heat || "Cold")}</b>
        </div>

        <div class="contact-ai-metric">
          <span>Open Tasks</span>
          <b>${taskCount}</b>
        </div>

        <div class="contact-ai-metric">
          <span>Transactions</span>
          <b>${transactionCount}</b>
        </div>
      </div>

      ${window.RelationshipUI.renderRelationshipCard(currentContact)}

      <div class="contact-ai-main">
        <div class="d-flex justify-content-between align-items-start gap-3 flex-wrap">
          <div>
            <h5 class="mb-2">AI Relationship Coach</h5>

            <div class="mb-3">
              <span class="ai-contact-badge ${heatClass}">${aiSafe(aiHeatBadgeText(insight))}</span>
              <span class="stage-pill">${inferStageFromContact(currentContact)}</span>
              <span class="tag-pill">${currentContact.type || "Unassigned"}</span>
            </div>

            <div style="font-size:15px; line-height:1.55;">
              ${aiSafe(aiCoach)}
            </div>

            <div class="contact-next-action">
              <b>Recommended Next Action</b><br>
              <span>${aiSafe(insight.nextAction || "Stay in touch")}</span>
            </div>
          </div>
        </div>

        <div class="d-flex gap-2 flex-wrap mt-4">
          <button class="btn btn-sm btn-primary" onclick="event.stopPropagation(); aiPrepareFollowUpTask()">
            Add Follow-Up Task
          </button>
          <button class="btn btn-sm btn-outline-primary" onclick="event.stopPropagation(); aiPrepareTextMessage()">
            Draft Text
          </button>
          <button class="btn btn-sm btn-outline-primary" onclick="event.stopPropagation(); aiSuggestStageMove()">
            Suggest Stage
          </button>
        </div>
      </div>

    </div>
  `;
}

function renderQuickTagButtons() {
  if (!document.getElementById("quickTagButtons")) return;

  if (
    window.RelationshipUI &&
    typeof window.RelationshipUI.renderQuickRelationshipButtons === "function"
  ) {
    quickTagButtons.innerHTML =
      window.RelationshipUI.renderQuickRelationshipButtons(currentContact);
    return;
  }

  quickTagButtons.innerHTML =
    '<div class="text-muted small">Relationship tools are loading...</div>';
}

function quickAddTagValue(tag) {
  if (
    window.RelationshipUI &&
    typeof window.RelationshipUI.createRelationshipFromButton === "function"
  ) {
    window.RelationshipUI.createRelationshipFromButton(tag, currentContact);
    return;
  }

  alert("Relationship tools are not ready yet.");
}

function quickAddTagToCurrentContact() {
  const tag = quickTagInput.value.trim();
  if (!tag) return;
  quickAddTagValue(tag);
  quickTagInput.value = "";
}

function renderContactTimeline(activityRows) {
  if (!document.getElementById("contactTimeline") || !currentContact) return;

  const timeline = [];

  (currentContact.stageHistory || []).forEach((item) => {
    timeline.push({
      date: item.date,
      title: "Pipeline Stage",
      detail: `Moved to ${item.stage || "New Lead"}`,
    });
  });

  (currentContact.notes || []).forEach((note) => {
    timeline.push({
      date: note.date,
      title: "Note Added",
      detail: note.text || "",
    });
  });

  (currentContact.tasks || []).forEach((task) => {
    timeline.push({
      date: task.createdAt || task.due,
      title: task.done ? "Task Completed" : "Task Created",
      detail: `${task.title || "Untitled Task"}${task.due ? " | Due " + formatShortDate(task.due) : ""}`,
    });
  });

  (activityRows || []).forEach((a) => {
    if (a.sentAt || a.sentDate)
      timeline.push({
        date: a.sentAt || a.sentDate,
        title: a.status === "failed" ? "Email Failed" : "Email Sent",
        detail: a.campaignName || "",
      });
    if (a.opened && a.openedAt)
      timeline.push({
        date: a.openedAt,
        title: "Email Opened",
        detail: a.campaignName || "",
      });
    (a.clicks || []).forEach((click) =>
      timeline.push({
        date: click.clickedAt,
        title: "Link Clicked",
        detail: click.url || "",
      }),
    );
  });

  timeline.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));

  if (timeline.length === 0) {
    contactTimeline.innerHTML =
      '<div class="text-muted small">No timeline activity yet.</div>';
    return;
  }

  contactTimeline.innerHTML = timeline
    .slice(0, 25)
    .map(
      (item) => `
    <div class="timeline-row">
      <b>${item.title}</b><br>
      <small>${formatDate(item.date)}</small>
      ${item.detail ? `<br><small>${item.detail}</small>` : ""}
    </div>
  `,
    )
    .join("");
}

async function saveContact() {
  if (!currentContact) {
    alert("No contact is currently open.");
    return;
  }

  const response = await fetch("/api/contacts/" + currentContact.id, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      firstName: editFirst.value,
      lastName: editLast.value,

      email: editEmail.value,
      workEmail: getContactFieldValue("editWorkEmail"),
      secondaryEmail: getContactFieldValue("editSecondaryEmail"),
      spouseEmailAlt: getContactFieldValue("editSpouseEmailAlt"),

      phone: formatPhone(editPhone.value),
      workPhone: formatPhone(getContactFieldValue("editWorkPhone")),
      homePhone: formatPhone(getContactFieldValue("editHomePhone")),
      otherPhone: formatPhone(getContactFieldValue("editOtherPhone")),

      roles: [
        ...(document.getElementById("roleBuyer").checked ? ["Buyer"] : []),
        ...(document.getElementById("roleSeller").checked ? ["Seller"] : []),
        ...(document.getElementById("roleInvestor").checked
          ? ["Investor"]
          : []),
        ...(document.getElementById("roleReferralPartner").checked
          ? ["Referral Partner"]
          : []),
      ],

      type: [
        ...(document.getElementById("roleBuyer").checked ? ["Buyer"] : []),
        ...(document.getElementById("roleSeller").checked ? ["Seller"] : []),
        ...(document.getElementById("roleInvestor").checked
          ? ["Investor"]
          : []),
        ...(document.getElementById("roleReferralPartner").checked
          ? ["Referral Partner"]
          : []),
      ].join(", "),

      stage: editStage.value,
      tags: parseCommaList(editTags.value),

      birthday: getContactFieldValue("editBirthday"),
      occupation: getContactFieldValue("editOccupation"),
      company: getContactFieldValue("editCompany"),

      spouseName: getContactFieldValue("editSpouseName"),
      spouseBirthday: getContactFieldValue("editSpouseBirthday"),
      spouseOccupation: getContactFieldValue("editSpouseOccupation"),
      spouseEmail: getContactFieldValue("editSpouseEmail"),
      spousePhone: formatPhone(getContactFieldValue("editSpousePhone")),

      anniversary: getContactFieldValue("editAnniversary"),
      children: getChildrenFromProfile(),

      pets: getContactFieldValue("editPets"),
      hobbies: getContactFieldValue("editHobbies"),
      favoriteRestaurant: getContactFieldValue("editFavoriteRestaurant"),
      favoriteTeams: getContactFieldValue("editFavoriteTeams"),
      interests: getContactFieldValue("editInterests"),
      relationshipNotes: getContactFieldValue("editRelationshipNotes"),
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("Contact save failed:", errorText);
    alert("Contact did not save. Check the console for the error.");
    return;
  }

  await loadContacts();
  await loadTags();
  await loadDashboard();
  await loadPipeline();
  await loadTasks();
  await loadCalendar();

  currentContact = contactsCache.find((c) => c.id == currentContact.id);

  if (currentContact) {
    openContact(currentContact.id);
    alert("Contact saved successfully.");
  } else {
    closePanel();
    alert("Contact saved, but could not be reopened.");
  }
}

async function deleteCurrentContact() {
  if (!currentContact) return;

  const name =
    `${currentContact.firstName || ""} ${currentContact.lastName || ""}`.trim();

  const confirmed = confirm(
    `Are you sure you want to permanently delete "${name}"?\n\nThis action cannot be undone.`,
  );

  if (!confirmed) return;

  try {
    const response = await fetch(`/api/contacts/${currentContact.id}`, {
      method: "DELETE",
    });

    if (!response.ok) {
      throw new Error("Delete failed.");
    }

    closePanel();

    await loadContacts();

    if (typeof loadDashboard === "function") {
      await loadDashboard();
    }

    alert("Contact deleted successfully.");
  } catch (err) {
    console.error(err);

    alert("Unable to delete contact.");
  }
}

async function sendEmailToCurrentContact() {
  if (!currentContact) {
    alert("No contact selected.");
    return;
  }

  const email = String(currentContact.email || "").trim();
  const subjectValue =
    document.getElementById("contactEmailSubject")?.value || "";
  const messageValue =
    document.getElementById("contactEmailMessage")?.value || "";
  const status = document.getElementById("contactEmailSendStatus");

  if (!email) {
    alert("This contact does not have an email address.");
    return;
  }

  if (!subjectValue.trim()) {
    alert("Please enter a subject.");
    return;
  }

  if (!messageValue.trim()) {
    alert("Please enter an email message.");
    return;
  }

  if (status) status.innerText = "Sending email through Gmail...";

  try {
    const response = await fetch("/api/gmail/send-contact-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contactId: currentContact.id,
        to: email,
        subject: subjectValue.trim(),
        message: messageValue.trim(),
      }),
    });

    const result = await response.json();

    if (result.success) {
      if (status) status.innerText = "Email sent successfully through Gmail.";
      document.getElementById("contactEmailSubject").value = "";
      document.getElementById("contactEmailMessage").value = "";

      if (typeof loadContactEmailHistory === "function")
        await loadContactEmailHistory();
      if (typeof renderContactTimeline === "function") renderContactTimeline();
    } else {
      if (status) status.innerText = result.error || "Gmail send failed.";
    }
  } catch (error) {
    console.error(error);
    if (status) status.innerText = "Gmail send failed.";
  }
}

async function sendSmsToCurrentContact() {
  if (!currentContact) return;

  const message = (smsMessage.value || "").trim();

  if (!currentContact.phone) {
    alert("This contact does not have a phone number yet.");
    return;
  }

  if (!message) {
    alert("Please type a text message first.");
    return;
  }

  smsSendStatus.innerText = "Sending text...";

  try {
    const res = await fetch("/api/send-sms", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contactId: currentContact.id,
        to: currentContact.phone,
        message,
      }),
    });

    const data = await res.json();

    if (data.success) {
      smsMessage.value = "";
      smsSendStatus.innerText = "Text sent successfully.";
      await loadSmsHistory();
      renderContactTimeline([]);
    } else {
      smsSendStatus.innerText = data.error || "Text could not be sent.";
      alert(data.error || "Text could not be sent.");
      await loadSmsHistory();
    }
  } catch (error) {
    smsSendStatus.innerText =
      "Text could not be sent. Check Twilio settings and server logs.";
    alert("Text could not be sent. Check Twilio settings and server logs.");
    console.error("SMS send error:", error);
  }
}
async function loadContactEmailHistory() {
  if (!currentContact) return;

  const el = document.getElementById("contactEmailHistory");
  const panelCampaignsEl = document.getElementById("panelCampaigns");

  if (!el) return;

  try {
    const res = await fetch("/api/activity");
    const activityRows = await res.json();

    if (Array.isArray(activityRows)) activityCache = activityRows;

    const email = String(currentContact.email || "")
      .toLowerCase()
      .trim();

    const rows = (Array.isArray(activityRows) ? activityRows : []).filter(
      (a) => {
        return (
          String(a.email || a.to || a.recipientEmail || "")
            .toLowerCase()
            .trim() === email
        );
      },
    );

    if (typeof renderContactTimeline === "function") {
      renderContactTimeline(rows);
    }

    if (!rows.length) {
      el.innerHTML =
        '<div class="text-muted small">No email activity yet.</div>';
      if (panelCampaignsEl)
        panelCampaignsEl.innerHTML =
          '<div class="text-muted small">No campaign history yet.</div>';
      return;
    }

    const html = rows
      .slice()
      .sort(
        (a, b) =>
          new Date(b.date || b.sentAt || b.sentDate || 0) -
          new Date(a.date || a.sentAt || a.sentDate || 0),
      )
      .map(
        (a) => `
        <div class="activity-row">
          <b>${a.campaignName || a.subject || "Direct Email"}</b><br>
          <small>${formatDate(a.date || a.sentAt || a.sentDate)}</small><br>
          <span class="status-badge">${a.provider || "Email"}</span>
          <span class="status-badge">${a.status || (a.opened ? "Opened" : "Sent")}</span>
          ${Array.isArray(a.clicks) && a.clicks.length ? `<span class="status-badge">${a.clicks.length} click(s)</span>` : ""}
        </div>
      `,
      )
      .join("");

    el.innerHTML = html;
    if (panelCampaignsEl) panelCampaignsEl.innerHTML = html;
  } catch (error) {
    console.error("Email history load error:", error);
    el.innerHTML =
      '<div class="text-muted small">Email history could not be loaded.</div>';
  }
}

async function loadSmsHistory() {
  if (!currentContact) return;

  try {
    const res = await fetch("/api/sms-activity?contactId=" + currentContact.id);
    const data = await res.json();
    renderSmsHistory(Array.isArray(data) ? data : []);
  } catch (error) {
    const contactSmsHistoryEl = document.getElementById("contactSmsHistory");
    if (contactSmsHistoryEl) {
      contactSmsHistoryEl.innerHTML =
        '<div class="text-muted small">SMS history could not be loaded.</div>';
    }
  }
}

function renderSmsHistory(items) {
  contactSmsHistory.innerHTML = "";

  if (!items.length) {
    contactSmsHistory.innerHTML =
      '<div class="text-muted small">No text messages yet.</div>';
    return;
  }

  items
    .slice()
    .sort(
      (a, b) =>
        new Date(b.createdAt || b.sentAt || 0) -
        new Date(a.createdAt || a.sentAt || 0),
    )
    .forEach((item) => {
      const failed = item.status === "failed";
      contactSmsHistory.innerHTML += `
        <div class="activity-row ${failed ? "task-overdue" : ""}">
          <div class="d-flex justify-content-between align-items-start gap-2">
            <div>
              <b>${item.direction === "inbound" ? "Incoming Text" : "Outgoing Text"}</b><br>
              <small>${formatDate(item.sentAt || item.createdAt)}</small><br>
              <div class="mt-2">${item.message || ""}</div>
              ${item.error ? `<small class="text-danger">${item.error}</small>` : ""}
            </div>
            <span class="status-badge">${item.status || "sent"}</span>
          </div>
        </div>
      `;
    });
}

function closePanel() {
  contactPanel.classList.remove("open");

  const appHeader = document.querySelector(".header");
  if (appHeader) appHeader.style.display = "";

  const mainTabs = document.querySelector(".nav-tabs");
  if (mainTabs) mainTabs.style.display = "";

  const appToolbar = document.querySelector(".app-toolbar");
  if (appToolbar) appToolbar.style.display = "";

  const contactsTab = document.getElementById("contactsTab");

  if (contactsTab) {
    Array.from(contactsTab.children).forEach((child) => {
      if (child !== contactPanel) {
        child.style.display = "";
      }
    });
  }

  window.scrollTo({
    top: 0,
    behavior: "smooth",
  });
}

async function addNote() {
  await fetch(`/api/contacts/${currentContact.id}/note`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text: noteInput.value }),
  });

  noteInput.value = "";
  await loadContacts();
  currentContact = contactsCache.find((c) => c.id == currentContact.id);
  openContact(currentContact.id);
  loadCalendar();
}

async function addTask() {
  if (!taskTitle.value.trim()) {
    alert("Please enter a task title.");
    return;
  }

  await fetch(`/api/contacts/${currentContact.id}/task`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      title: taskTitle.value,
      due: taskDue.value,
      priority: taskPriority.value,
      notes: taskNotes.value,
    }),
  });

  taskTitle.value = "";
  taskDue.value = "";
  taskPriority.value = "Normal";
  taskNotes.value = "";

  await loadContacts();
  currentContact = contactsCache.find((c) => c.id == currentContact.id);
  renderContactTasks();
  loadTasks();
  loadDashboard();
  loadCalendar();
}

async function toggleTask(contactId, taskId) {
  await fetch(`/api/contacts/${contactId}/task/${taskId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ toggleDone: true }),
  });

  await loadContacts();

  if (currentContact && currentContact.id == contactId) {
    currentContact = contactsCache.find((c) => c.id == contactId);
    renderContactTasks();
  }

  loadTasks();
  loadDashboard();
  loadCalendar();
}

async function deleteTask(contactId, taskId) {
  if (!confirm("Delete this task?")) return;

  await fetch(`/api/contacts/${contactId}/task/${taskId}`, {
    method: "DELETE",
  });
  await loadContacts();

  if (currentContact && currentContact.id == contactId) {
    currentContact = contactsCache.find((c) => c.id == contactId);
    renderContactTasks();
  }

  loadTasks();
  loadDashboard();
  loadCalendar();
}

function renderContactTasks() {
  contactTasksList.innerHTML = "";

  const tasks = currentContact.tasks || [];

  if (!tasks.length) {
    contactTasksList.innerHTML =
      '<div class="text-muted small">No tasks yet.</div>';
    return;
  }

  tasks
    .slice()
    .sort(
      (a, b) =>
        new Date(a.due || "9999-12-31") - new Date(b.due || "9999-12-31"),
    )
    .forEach((task) => {
      contactTasksList.innerHTML += `
        <div class="task-card ${taskIsOverdue(task) ? "task-overdue" : ""} ${task.done ? "task-done" : ""}">
          <div class="d-flex justify-content-between">
            <div>
              <b>${task.title || "Untitled Task"}</b><br>
              <small>Due: ${task.due ? formatShortDate(task.due) : "No due date"}</small>
              ${task.notes ? `<br><small>${task.notes}</small>` : ""}
            </div>
            <div class="text-end">
              <span class="priority-pill ${priorityClass(task.priority)}">${task.priority || "Normal"}</span><br>
              <button class="btn btn-sm btn-outline-primary mt-2" onclick="toggleTask(${currentContact.id}, ${task.id})">${task.done ? "Reopen" : "Done"}</button>
              <button class="btn btn-sm btn-outline-danger mt-2" onclick="deleteTask(${currentContact.id}, ${task.id})">Delete</button>
            </div>
          </div>
        </div>
      `;
    });
}

async function loadActivity(email) {
  const res = await fetch("/api/contact-activity?email=" + email);
  const data = await res.json();
  renderContactTimeline(data);

  const panelCampaignsEl = document.getElementById("panelCampaigns");
  if (!panelCampaignsEl) return;

  panelCampaignsEl.innerHTML = "";

  if (data.length === 0) {
    panelCampaignsEl.innerHTML =
      '<div class="text-muted">No campaign activity yet.</div>';
    return;
  }

  data.sort(
    (a, b) =>
      new Date(b.sentAt || b.sentDate || 0) -
      new Date(a.sentAt || a.sentDate || 0),
  );

  data.forEach((c) => {
    const clickList = (c.clicks || [])
      .map(
        (click) =>
          `<div><small>Clicked: ${click.url}<br>${formatDate(click.clickedAt)}</small></div>`,
      )
      .join("");

    const failedHtml =
      c.status === "failed"
        ? `<br><span class="bounced-badge">Failed</span><br><small class="text-danger">${c.error || ""}</small>`
        : "";

    panelCampaignsEl.innerHTML += `
      <div class="campaign-card">
        <b>${c.campaignName}</b><br>
        <small>${formatDate(c.sentDate || c.sentAt)}</small><br>
        ${
          failedHtml ||
          `
          <span class="${c.opened ? "badge-opened" : "badge-closed"}">
            ${c.opened ? "Opened" : "Not opened"}
          </span>
        `
        }
        ${clickList ? `<div class="mt-2">${clickList}</div>` : ""}
      </div>
    `;
  });
}

async function loadContacts() {
  const res = await fetch("/api/contacts");
  const data = await res.json();

  contactsCache = normalizeContactsForPipeline(data);
  data.splice(0, data.length, ...contactsCache);
  populateContactFilterControls();
  renderSavedContactFilters();

  const s = (contactSearch.value || "").toLowerCase();
  const typeFilter = document.getElementById("contactTypeFilter")?.value || "";
  const stageFilter =
    document.getElementById("contactStageFilter")?.value || "";
  const tagFilter = document.getElementById("contactTagFilter")?.value || "";

  let filtered = data.filter((c) => {
    const tagText = Array.isArray(c.tags) ? c.tags.join(" ") : "";
    const textMatch = (
      (c.firstName || "") +
      (c.lastName || "") +
      (c.email || "") +
      formatPhone(c.phone || "") +
      (c.type || "") +
      inferStageFromContact(c) +
      tagText +
      (c.unsubscribed ? "unsubscribed" : "subscribed") +
      (c.bounced ? "bounced invalid" : "valid")
    )
      .toLowerCase()
      .includes(s);

    const typeMatch = !typeFilter || (c.type || "") === typeFilter;
    const stageMatch = !stageFilter || inferStageFromContact(c) === stageFilter;
    const tagMatch =
      !tagFilter || (Array.isArray(c.tags) && c.tags.includes(tagFilter));

    return textMatch && typeMatch && stageMatch && tagMatch;
  });

  lastFilteredContactIds = filtered.map((c) => String(c.id));

  const grouped = {};

  filtered.forEach((c) => {
    const letter = (c.lastName || c.firstName || "#")[0].toUpperCase();
    if (!grouped[letter]) grouped[letter] = [];
    grouped[letter].push(c);
  });

  contactList.innerHTML = "";

  if (filtered.length === 0) {
    contactList.innerHTML =
      '<div class="modern-card text-muted">No contacts match the current filters.</div>';
  }

  Object.keys(grouped)
    .sort()
    .forEach((l) => {
      contactList.innerHTML += `<div class="contact-letter">${l}</div>`;

      grouped[l].forEach((c) => {
        const checked = selectedBulkContactIds.has(String(c.id))
          ? "checked"
          : "";
        contactList.innerHTML += `
        <div class="contact-item" onclick="openContact(${c.id})">
          <div class="contact-name">
            <input type="checkbox" class="contact-checkbox" ${checked} onclick="event.stopPropagation(); toggleBulkContactSelection('${c.id}', this.checked)">
            ${c.firstName || ""} ${c.lastName || ""}
            ${c.unsubscribed ? '<span class="unsubscribed-badge">Unsubscribed</span>' : ""}
            ${c.bounced ? '<span class="bounced-badge">Bounced</span>' : ""}
          </div>
          <div style="font-size:12px;color:#777;">
            ${c.email || ""} | ${formatPhone(c.phone || "")} | ${c.type || ""} | ${inferStageFromContact(c)}
          </div>
          ${(() => {
            const insight =
              buildAIContactInsights([c], activityCache, smsActivityCache)[0] ||
              {};
            const heatClass = aiHeatClass(insight.heat || "Cold");
            return `<div class="ai-contact-score-row">
              <span class="ai-contact-badge ${heatClass}">${aiSafe(aiHeatBadgeText(insight))}</span>
              <span class="ai-contact-badge action">Opp ${insight.opportunityScore ?? 0}</span>
              <span class="ai-contact-badge action">${aiSafe(insight.nextAction || "Stay in touch")}</span>
            </div>`;
          })()}
          ${renderTags(c.tags)}
        </div>
      `;
      });
    });

  if (typeof updateBulkSelectedCount === "function") updateBulkSelectedCount();
  if (typeof renderDuplicateContacts === "function")
    renderDuplicateContacts(false);

  try {
    if (typeof renderRecipientBuilder === "function") renderRecipientBuilder();
  } catch (error) {
    console.warn("Recipient Builder render skipped during startup:", error);
  }

  try {
    if (typeof renderTextCampaignBuilder === "function")
      renderTextCampaignBuilder();
  } catch (error) {
    console.warn("Text Campaign Builder render skipped during startup:", error);
  }
}

function populateContactFilterControls() {
  const typeFilter = document.getElementById("contactTypeFilter");
  const bulkType = document.getElementById("bulkTypeSelect");
  const stageFilter = document.getElementById("contactStageFilter");
  const bulkStage = document.getElementById("bulkStageSelect");
  const tagFilter = document.getElementById("contactTagFilter");

  if (typeFilter) {
    const current = typeFilter.value;
    typeFilter.innerHTML = '<option value="">All Types</option>';
    contactTypes
      .slice()
      .sort()
      .forEach(
        (type) =>
          (typeFilter.innerHTML += `<option value="${type}">${type}</option>`),
      );
    typeFilter.value = current;
  }

  if (bulkType) {
    const current = bulkType.value;
    bulkType.innerHTML = '<option value="">Do not change</option>';
    contactTypes
      .slice()
      .sort()
      .forEach(
        (type) =>
          (bulkType.innerHTML += `<option value="${type}">${type}</option>`),
      );
    bulkType.value = current;
  }

  if (stageFilter) {
    const current = stageFilter.value;
    stageFilter.innerHTML = '<option value="">All Stages</option>';
    pipelineStagesCache.forEach(
      (stage) =>
        (stageFilter.innerHTML += `<option value="${stage}">${stage}</option>`),
    );
    stageFilter.value = current;
  }

  if (bulkStage) {
    const current = bulkStage.value;
    bulkStage.innerHTML = '<option value="">Do not change</option>';
    pipelineStagesCache.forEach(
      (stage) =>
        (bulkStage.innerHTML += `<option value="${stage}">${stage}</option>`),
    );
    bulkStage.value = current;
  }

  if (tagFilter) {
    const current = tagFilter.value;
    tagFilter.innerHTML = '<option value="">All Tags</option>';
    allTagsCache
      .slice()
      .sort()
      .forEach(
        (tag) =>
          (tagFilter.innerHTML += `<option value="${tag}">${tag}</option>`),
      );
    tagFilter.value = current;
  }
}

function toggleBulkContactSelection(id, checked) {
  if (checked) selectedBulkContactIds.add(String(id));
  else selectedBulkContactIds.delete(String(id));
  updateBulkSelectedCount();
}

function updateBulkSelectedCount() {
  const count = selectedBulkContactIds.size;
  const el = document.getElementById("bulkSelectedCount");
  if (el) el.innerText = count === 1 ? "1 selected" : `${count} selected`;
}

function selectVisibleContacts() {
  lastFilteredContactIds.forEach((id) =>
    selectedBulkContactIds.add(String(id)),
  );
  loadContacts();
}

function clearBulkSelection() {
  selectedBulkContactIds.clear();
  loadContacts();
}

async function applyBulkContactUpdate() {
  const ids = Array.from(selectedBulkContactIds);
  if (ids.length === 0) {
    alert("Please select at least one contact first.");
    return;
  }

  const payload = {
    ids,
    type: document.getElementById("bulkTypeSelect")?.value || "",
    stage: document.getElementById("bulkStageSelect")?.value || "",
    addTags: parseCommaList(
      document.getElementById("bulkTagsInput")?.value || "",
    ),
  };

  if (!payload.type && !payload.stage && payload.addTags.length === 0) {
    alert("Choose a type, stage, or tags before applying a bulk update.");
    return;
  }

  const res = await fetch("/api/contacts/bulk-update", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await res.json();

  if (data.success) {
    alert(`Updated ${data.updated || ids.length} contact(s).`);
    document.getElementById("bulkTagsInput").value = "";
    selectedBulkContactIds.clear();
    await loadContacts();
    loadTags();
    loadPipeline();
    loadDashboard();
  } else {
    alert(data.error || "Bulk update failed.");
  }
}

async function deleteSelectedContacts() {
  const ids = Array.from(selectedBulkContactIds);
  if (ids.length === 0) {
    alert("Please select at least one contact first.");
    return;
  }
  if (
    !confirm(`Delete ${ids.length} selected contact(s)? This cannot be undone.`)
  )
    return;

  const res = await fetch("/api/contacts/bulk-delete", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ids }),
  });
  const data = await res.json();

  if (data.success) {
    selectedBulkContactIds.clear();
    await loadContacts();
    loadDashboard();
    loadPipeline();
  } else {
    alert(data.error || "Bulk delete failed.");
  }
}

function clearContactFilters() {
  contactSearch.value = "";
  if (document.getElementById("contactTypeFilter"))
    contactTypeFilter.value = "";
  if (document.getElementById("contactStageFilter"))
    contactStageFilter.value = "";
  if (document.getElementById("contactTagFilter")) contactTagFilter.value = "";
  loadContacts();
}

function getCurrentContactFilterState() {
  return {
    search: contactSearch.value || "",
    type: document.getElementById("contactTypeFilter")?.value || "",
    stage: document.getElementById("contactStageFilter")?.value || "",
    tag: document.getElementById("contactTagFilter")?.value || "",
  };
}

function saveCurrentContactFilter() {
  const state = getCurrentContactFilterState();
  if (!state.search && !state.type && !state.stage && !state.tag) {
    alert("Set at least one filter before saving a saved search.");
    return;
  }

  const name = prompt(
    "Name this saved search:",
    state.search || state.type || state.stage || state.tag || "Saved Search",
  );
  if (!name) return;

  savedContactFiltersCache.push({ id: Date.now(), name, ...state });
  localStorage.setItem(
    "savedContactFilters",
    JSON.stringify(savedContactFiltersCache),
  );
  renderSavedContactFilters();
}

function renderSavedContactFilters() {
  const container = document.getElementById("savedContactFilters");
  if (!container) return;

  if (!savedContactFiltersCache.length) {
    container.innerHTML =
      '<div class="small-muted">No saved searches yet.</div>';
    return;
  }

  container.innerHTML = savedContactFiltersCache
    .map(
      (filter) => `
    <span class="saved-filter-pill" onclick="applySavedContactFilter(${filter.id})">
      ${filter.name}
      <button class="btn btn-sm btn-link p-0" onclick="event.stopPropagation(); deleteSavedContactFilter(${filter.id})">×</button>
    </span>
  `,
    )
    .join("");
}

function applySavedContactFilter(id) {
  const filter = savedContactFiltersCache.find((f) => f.id == id);
  if (!filter) return;

  contactSearch.value = filter.search || "";
  if (document.getElementById("contactTypeFilter"))
    contactTypeFilter.value = filter.type || "";
  if (document.getElementById("contactStageFilter"))
    contactStageFilter.value = filter.stage || "";
  if (document.getElementById("contactTagFilter"))
    contactTagFilter.value = filter.tag || "";
  loadContacts();
}

function deleteSavedContactFilter(id) {
  savedContactFiltersCache = savedContactFiltersCache.filter((f) => f.id != id);
  localStorage.setItem(
    "savedContactFilters",
    JSON.stringify(savedContactFiltersCache),
  );
  renderSavedContactFilters();
}

function renderDuplicateContacts(showAlert) {
  const container = document.getElementById("duplicateContactList");
  if (!container) return;

  const emailMap = {};
  const phoneMap = {};

  contactsCache.forEach((c) => {
    const email = String(c.email || "")
      .trim()
      .toLowerCase();
    const phoneDigits = String(c.phone || "").replace(/\D/g, "");
    if (email) {
      if (!emailMap[email]) emailMap[email] = [];
      emailMap[email].push(c);
    }
    if (phoneDigits) {
      if (!phoneMap[phoneDigits]) phoneMap[phoneDigits] = [];
      phoneMap[phoneDigits].push(c);
    }
  });

  const groups = [];
  Object.entries(emailMap).forEach(([key, items]) => {
    if (items.length > 1) groups.push({ type: "Email", key, items });
  });
  Object.entries(phoneMap).forEach(([key, items]) => {
    if (items.length > 1)
      groups.push({ type: "Phone", key: formatPhone(key), items });
  });

  if (groups.length === 0) {
    container.innerHTML =
      '<div class="text-muted small">No likely duplicates found.</div>';
    if (showAlert) alert("No likely duplicates found.");
    return;
  }

  container.innerHTML = groups
    .map(
      (group) => `
    <div class="duplicate-group">
      <div class="d-flex justify-content-between align-items-center">
        <b>${group.type} Match: ${group.key}</b>
        <span class="status-badge">${group.items.length} records</span>
      </div>
      ${group.items
        .map(
          (c) => `
        <div class="duplicate-contact-row">
          <div>
            <b>${contactName(c)}</b><br>
            <small>${c.email || ""} | ${formatPhone(c.phone || "")} | ${c.type || ""} | ${inferStageFromContact(c)}</small>
          </div>
          <div>
            <button class="btn btn-sm btn-outline-primary" onclick="openContact(${c.id})">Open</button>
            <button class="btn btn-sm btn-outline-danger" onclick="event.stopPropagation(); deleteSingleDuplicateContact(${c.id})">Delete</button>
          </div>
        </div>
      `,
        )
        .join("")}
    </div>
  `,
    )
    .join("");
}

async function deleteSingleDuplicateContact(id) {
  if (!confirm("Delete this duplicate contact?")) return;
  await fetch("/api/contacts/" + id, { method: "DELETE" });
  await loadContacts();
  loadDashboard();
  loadPipeline();
}
function renderTags(tags) {
  const safeTags = Array.isArray(tags) ? tags : [];
  if (safeTags.length === 0) return "";
  return `<div class="mt-1">${safeTags.map((tag) => `<span class="tag-pill">${tag}</span>`).join("")}</div>`;
}

function getFallbackPipelineStages() {
  return [
    "New Lead",
    "Contacted",
    "Appointment Set",
    "Active Prospect",
    "Listed",
    "Under Contract",
    "Pending",
    "Closed",
    "Past Client",
  ];
}

function normalizeStageValue(value) {
  return String(value || "")
    .trim()
    .toLowerCase();
}

function inferStageFromContact(contact) {
  const fallback = "New Lead";
  const rawStage = String(
    contact && contact.stage ? contact.stage : fallback,
  ).trim();
  const stages =
    Array.isArray(pipelineStagesCache) && pipelineStagesCache.length
      ? pipelineStagesCache
      : getFallbackPipelineStages();
  const matchedStage = stages.find(
    (stage) => normalizeStageValue(stage) === normalizeStageValue(rawStage),
  );
  return matchedStage || fallback;
}

function normalizeContactsForPipeline(contactList) {
  const stages =
    Array.isArray(pipelineStagesCache) && pipelineStagesCache.length
      ? pipelineStagesCache
      : getFallbackPipelineStages();

  return (Array.isArray(contactList) ? contactList : []).map((contact) => {
    const rawStage = String(
      contact.stage || contact.pipelineStage || contact.status || "",
    ).trim();
    const matchedStage = stages.find(
      (stage) => normalizeStageValue(stage) === normalizeStageValue(rawStage),
    );
    const stage = matchedStage || "New Lead";

    return {
      ...contact,
      stage,
      stageUpdatedAt:
        contact.stageUpdatedAt ||
        contact.updatedAt ||
        contact.createdAt ||
        new Date().toISOString(),
      stageHistory:
        Array.isArray(contact.stageHistory) && contact.stageHistory.length
          ? contact.stageHistory
          : [
              {
                stage,
                date:
                  contact.stageUpdatedAt ||
                  contact.updatedAt ||
                  contact.createdAt ||
                  new Date().toISOString(),
              },
            ],
    };
  });
}

function saveSelectedCampaignContacts() {
  localStorage.setItem(
    "selectedCampaignContactIds",
    JSON.stringify(Array.from(selectedCampaignContactIds)),
  );
}

function contactName(contact) {
  return (
    `${contact.firstName || ""} ${contact.lastName || ""}`.trim() ||
    "Unnamed Contact"
  );
}

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function taskIsOverdue(task) {
  return (
    task && !task.done && task.due && String(task.due).slice(0, 10) < todayKey()
  );
}

function priorityClass(priority) {
  const p = String(priority || "Normal").toLowerCase();
  if (p === "high") return "priority-high";
  if (p === "low") return "priority-low";
  return "priority-normal";
}

function saveTypes() {
  localStorage.setItem("contactTypes", JSON.stringify(contactTypes));
  renderTypes();
  renderRecipientTypes();
  renderTextCampaignTypes();
}

function renderTypes() {
  const contactTypeEl = document.getElementById("contactType");
  const editTypeEl = document.getElementById("editType");

  if (contactTypeEl) contactTypeEl.innerHTML = "";
  if (editTypeEl) editTypeEl.innerHTML = "";

  contactTypes.sort().forEach((t) => {
    if (contactTypeEl) contactTypeEl.innerHTML += `<option>${t}</option>`;
    if (editTypeEl) editTypeEl.innerHTML += `<option>${t}</option>`;
  });

  if (typeof populateContactFilterControls === "function") {
    populateContactFilterControls();
  }
}

async function loadPipelineStages() {
  try {
    const res = await fetch("/api/pipeline-stages");
    pipelineStagesCache = await res.json();
    if (
      !Array.isArray(pipelineStagesCache) ||
      pipelineStagesCache.length === 0
    ) {
      pipelineStagesCache = getFallbackPipelineStages();
    }

    if (!pipelineStagesCache.includes("Listed"))
      pipelineStagesCache.splice(
        pipelineStagesCache.indexOf("Under Contract"),
        0,
        "Listed",
      );
  } catch (e) {
    pipelineStagesCache = getFallbackPipelineStages();
  }

  renderStageSelects();
}

function renderStageSelects() {
  contactStage.innerHTML = "";
  editStage.innerHTML = "";

  pipelineStagesCache.forEach((stage) => {
    contactStage.innerHTML += `<option>${stage}</option>`;
    editStage.innerHTML += `<option>${stage}</option>`;
  });
  syncImportDefaultSelects();
  populateContactFilterControls();
}

function addContactType() {
  const v = newContactType.value.trim();
  if (!v) return;
  if (!contactTypes.includes(v)) contactTypes.push(v);
  newContactType.value = "";
  saveTypes();
}

/* =====================================================
   Relationship Engine Contact Sync
   ===================================================== */

function syncContactsToRelationshipEngine() {
  try {
    if (!window.RelationshipEngine) {
      console.warn("RelationshipEngine not available yet.");
      return;
    }

    const contacts = Array.isArray(contactsCache)
      ? contactsCache
      : Array.isArray(window.contacts)
        ? window.contacts
        : [];

    window.contactsCache = contacts;

    if (!contacts.length) {
      console.info("No contacts found to sync into RelationshipEngine.");
      return;
    }

    const syncedPeople =
      window.RelationshipEngine.migrateExistingContacts(contacts);

    console.log(`RelationshipEngine synced contacts: ${syncedPeople.length}`);
  } catch (err) {
    console.error("syncContactsToRelationshipEngine error:", err);
  }
}

setTimeout(syncContactsToRelationshipEngine, 500);
