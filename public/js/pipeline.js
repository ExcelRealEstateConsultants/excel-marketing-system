/* =====================================================
   RapportLink Pipeline JavaScript
   Version 1
   ===================================================== */

/* PIPELINE */
function setPipelineView(view) {
  currentPipelineView = view;
  localStorage.setItem("excelMarketingPipelineView", view);
  renderPipelineCurrentView();
}

function updatePipelineViewButtons() {
  ["kanban", "compact", "analytics"].forEach((view) => {
    const button = document.getElementById(
      "pipelineView" + view.charAt(0).toUpperCase() + view.slice(1),
    );
    if (button) button.classList.toggle("active", currentPipelineView === view);
  });
}

function renderPipelineTypeFilter() {
  if (!document.getElementById("pipelineTypeFilter")) return;

  const existing = pipelineTypeFilter.value || "";
  const types = Array.from(
    new Set(contactsCache.map((c) => c.type || "Unassigned").filter(Boolean)),
  ).sort();

  pipelineTypeFilter.innerHTML = '<option value="">All Types</option>';
  types.forEach((type) => {
    pipelineTypeFilter.innerHTML += `<option value="${type}">${type}</option>`;
  });
  pipelineTypeFilter.value = types.includes(existing) ? existing : "";
}

function clearPipelineFilters() {
  if (document.getElementById("pipelineSearch")) pipelineSearch.value = "";
  if (document.getElementById("pipelineTypeFilter"))
    pipelineTypeFilter.value = "";
  renderPipelineCurrentView();
}

function getPipelineFilteredContacts() {
  const search = (
    document.getElementById("pipelineSearch")?.value || ""
  ).toLowerCase();
  const typeFilter = document.getElementById("pipelineTypeFilter")?.value || "";

  return contactsCache.filter((contact) => {
    const tagText = Array.isArray(contact.tags) ? contact.tags.join(" ") : "";
    const text =
      `${contactName(contact)} ${contact.email || ""} ${formatPhone(contact.phone || "")} ${contact.type || ""} ${inferStageFromContact(contact)} ${tagText}`.toLowerCase();
    const matchesSearch = !search || text.includes(search);
    const matchesType =
      !typeFilter || (contact.type || "Unassigned") === typeFilter;
    return matchesSearch && matchesType;
  });
}

function getOpenTasksForContact(contact) {
  return (contact.tasks || []).filter((task) => !task.done);
}

function getOverdueTasksForContact(contact) {
  return getOpenTasksForContact(contact).filter((task) => taskIsOverdue(task));
}

function getLastContactActivityDate(contact) {
  const dates = [];
  if (contact.stageUpdatedAt) dates.push(contact.stageUpdatedAt);
  (contact.notes || []).forEach((note) => {
    if (note.date) dates.push(note.date);
  });
  (contact.tasks || []).forEach((task) => {
    if (task.createdAt) dates.push(task.createdAt);
    if (task.completedAt) dates.push(task.completedAt);
  });
  activityCache
    .filter(
      (a) =>
        String(a.email || "").toLowerCase() ===
        String(contact.email || "").toLowerCase(),
    )
    .forEach((a) => {
      if (a.sentAt || a.sentDate) dates.push(a.sentAt || a.sentDate);
      if (a.openedAt) dates.push(a.openedAt);
      (a.clicks || []).forEach((click) => {
        if (click.clickedAt) dates.push(click.clickedAt);
      });
    });

  if (!dates.length) return "";
  return dates.sort((a, b) => new Date(b) - new Date(a))[0];
}

function renderPipelineSummary(filteredContacts) {
  if (!document.getElementById("pipelineSummary")) return;

  const openTasks = filteredContacts.reduce(
    (sum, c) => sum + getOpenTasksForContact(c).length,
    0,
  );
  const overdueTasks = filteredContacts.reduce(
    (sum, c) => sum + getOverdueTasksForContact(c).length,
    0,
  );
  const activeStages = new Set(
    filteredContacts.map((c) => inferStageFromContact(c)),
  ).size;

  pipelineSummary.innerHTML = `
    <div class="pipeline-summary-card clickable" onclick="openPipelineSummaryDrilldown('contacts')">
      <div class="pipeline-summary-number">${filteredContacts.length}</div>
      <div class="kpi-label">Pipeline Contacts</div>
      <div class="small-muted">Click to view contacts</div>
    </div>
    <div class="pipeline-summary-card clickable" onclick="openPipelineSummaryDrilldown('stages')">
      <div class="pipeline-summary-number">${activeStages}</div>
      <div class="kpi-label">Active Stages</div>
      <div class="small-muted">Click to view stages</div>
    </div>
    <div class="pipeline-summary-card clickable" onclick="openPipelineSummaryDrilldown('openTasks')">
      <div class="pipeline-summary-number">${openTasks}</div>
      <div class="kpi-label">Open Tasks</div>
      <div class="small-muted">Click to view tasks</div>
    </div>
    <div class="pipeline-summary-card clickable" onclick="openPipelineSummaryDrilldown('overdueTasks')">
      <div class="pipeline-summary-number">${overdueTasks}</div>
      <div class="kpi-label">Overdue Tasks</div>
      <div class="small-muted">Click to view overdue</div>
    </div>
  `;
}

function openPipelineSummaryDrilldown(type) {
  const filteredContacts = getPipelineFilteredContacts();

  const titleMap = {
    contacts: "Pipeline Contacts",
    stages: "Active Pipeline Stages",
    openTasks: "Open Pipeline Tasks",
    overdueTasks: "Overdue Pipeline Tasks",
  };

  dashboardDrilldownTitle.innerText = titleMap[type] || "Pipeline Detail";
  dashboardDrilldownSubtitle.innerText =
    "Pipeline details based on the current search and type filters.";
  dashboardDrilldownContent.innerHTML = buildPipelineSummaryDrilldownHtml(
    type,
    filteredContacts,
  );
  dashboardDrilldownPanel.classList.add("open");
}

function buildPipelineSummaryDrilldownHtml(type, filteredContacts) {
  if (type === "contacts") {
    if (!filteredContacts.length)
      return '<div class="text-muted">No contacts match the current pipeline filters.</div>';

    return filteredContacts
      .slice()
      .sort((a, b) => contactName(a).localeCompare(contactName(b)))
      .map(
        (contact) => `
        <div class="drilldown-row" onclick="openContact(${contact.id})">
          <b>${contactName(contact)}</b><br>
          <small>${contact.email || ""} | ${formatPhone(contact.phone || "")}</small><br>
          <small>${contact.type || "Unassigned"} | ${inferStageFromContact(contact)}</small>
          ${renderTags(contact.tags)}
        </div>
      `,
      )
      .join("");
  }

  if (type === "stages") {
    const stages = pipelineStagesCache.length
      ? pipelineStagesCache
      : getFallbackPipelineStages();
    const activeStageRows = stages
      .map((stage) => ({
        stage,
        contacts: filteredContacts.filter(
          (contact) => inferStageFromContact(contact) === stage,
        ),
      }))
      .filter((row) => row.contacts.length > 0);

    if (!activeStageRows.length)
      return '<div class="text-muted">No active stages match the current filters.</div>';

    return activeStageRows
      .map(
        (row) => `
      <div class="mb-3">
        <div class="d-flex justify-content-between align-items-center mb-2">
          <h6 class="widget-title m-0">${row.stage}</h6>
          <span class="pipeline-count">${row.contacts.length}</span>
        </div>
        ${row.contacts
          .slice()
          .sort((a, b) => contactName(a).localeCompare(contactName(b)))
          .map(
            (contact) => `
            <div class="drilldown-row" onclick="openContact(${contact.id})">
              <b>${contactName(contact)}</b><br>
              <small>${contact.email || ""} | ${formatPhone(contact.phone || "")} | ${contact.type || "Unassigned"}</small>
            </div>
          `,
          )
          .join("")}
      </div>
    `,
      )
      .join("");
  }

  if (type === "openTasks" || type === "overdueTasks") {
    const rows = [];

    filteredContacts.forEach((contact) => {
      const tasks =
        type === "overdueTasks"
          ? getOverdueTasksForContact(contact)
          : getOpenTasksForContact(contact);

      tasks.forEach((task) => {
        rows.push({ contact, task });
      });
    });

    rows.sort(
      (a, b) =>
        new Date(a.task.due || "9999-12-31") -
        new Date(b.task.due || "9999-12-31"),
    );

    if (!rows.length) {
      return type === "overdueTasks"
        ? '<div class="text-muted">No overdue tasks match the current pipeline filters.</div>'
        : '<div class="text-muted">No open tasks match the current pipeline filters.</div>';
    }

    return rows
      .map(
        (row) => `
      <div class="drilldown-row" onclick="openContact(${row.contact.id})">
        <div class="d-flex justify-content-between align-items-start gap-2">
          <div>
            <b>${row.task.title || "Untitled Task"}</b><br>
            <small>Contact: ${contactName(row.contact)}</small><br>
            <small>${row.contact.email || ""} | ${inferStageFromContact(row.contact)}</small>
          </div>
          <div class="text-end">
            <span class="priority-pill ${priorityClass(row.task.priority)}">${row.task.priority || "Normal"}</span><br>
            <small>${row.task.due ? formatShortDate(row.task.due) : "No due date"}</small>
          </div>
        </div>
        ${row.task.notes ? `<div class="small-muted mt-2">${row.task.notes}</div>` : ""}
      </div>
    `,
      )
      .join("");
  }

  return '<div class="text-muted">No detail available.</div>';
}

async function loadPipeline() {
  await loadPipelineStages();
  renderEmailWidgetPalette();
  await loadContacts();
  await loadTasks().catch(() => {});
  const activityRes = await fetch("/api/activity").catch(() => null);
  if (activityRes) activityCache = await activityRes.json();

  renderPipelineTypeFilter();
  renderPipelineCurrentView();
}

function renderPipelineCurrentView() {
  if (!document.getElementById("pipelineBoard")) return;

  updatePipelineViewButtons();
  const filteredContacts = getPipelineFilteredContacts();
  renderPipelineSummary(filteredContacts);

  pipelineSortables.forEach((s) => s.destroy && s.destroy());
  pipelineSortables = [];

  if (currentPipelineView === "compact")
    return renderPipelineCompact(filteredContacts);
  if (currentPipelineView === "analytics")
    return renderPipelineAnalytics(filteredContacts);
  return renderPipelineKanban(filteredContacts);
}

function renderPipelineKanban(filteredContacts) {
  pipelineBoard.className = "pipeline-board";
  pipelineBoard.innerHTML = "";

  const stages = pipelineStagesCache.length
    ? pipelineStagesCache
    : getFallbackPipelineStages();
  const contactsByStage = {};
  stages.forEach((stage) => (contactsByStage[stage] = []));

  filteredContacts.forEach((contact) => {
    const stage = inferStageFromContact(contact);
    if (!contactsByStage[stage]) contactsByStage[stage] = [];
    contactsByStage[stage].push(contact);
  });

  stages.forEach((stage) => {
    const stageContacts = (contactsByStage[stage] || [])
      .slice()
      .sort((a, b) => {
        const aiA =
          buildAIContactInsights([a], activityCache, smsActivityCache)[0] || {};
        const aiB =
          buildAIContactInsights([b], activityCache, smsActivityCache)[0] || {};
        const scoreDiff =
          (aiB.opportunityScore || 0) - (aiA.opportunityScore || 0) ||
          (aiB.leadScore || 0) - (aiA.leadScore || 0);
        if (scoreDiff) return scoreDiff;
        const overdueDiff =
          getOverdueTasksForContact(b).length -
          getOverdueTasksForContact(a).length;
        if (overdueDiff) return overdueDiff;
        return contactName(a).localeCompare(contactName(b));
      });

    const column = document.createElement("div");
    column.className = "pipeline-column";
    column.innerHTML = `
      <div class="pipeline-column-header">
        <span>${stage}</span>
        <span class="pipeline-count">${stageContacts.length}</span>
      </div>
      <div class="pipeline-dropzone" data-stage="${stage}"></div>
    `;

    const dropzone = column.querySelector(".pipeline-dropzone");

    if (stageContacts.length === 0) {
      dropzone.innerHTML =
        '<div class="text-muted small p-2">No contacts in this stage.</div>';
    }

    stageContacts.forEach((c) => {
      const openTasks = getOpenTasksForContact(c);
      const overdueTasks = getOverdueTasksForContact(c);
      const lastActivity = getLastContactActivityDate(c);
      const insight =
        buildAIContactInsights([c], activityCache, smsActivityCache)[0] || {};
      const heatClass = aiHeatClass(insight.heat || "Cold");

      const card = document.createElement("div");
      card.className = "pipeline-card";
      card.dataset.contactId = c.id;
      card.innerHTML = `
        <div class="d-flex justify-content-between align-items-start gap-2">
          <div>
            <b>${contactName(c)}</b><br>
            <small>${c.email || ""}</small><br>
            <small>${formatPhone(c.phone || "")}</small>
          </div>
          ${overdueTasks.length ? `<span class="pipeline-warning-pill">${overdueTasks.length} overdue</span>` : ""}
        </div>
        <div class="pipeline-meta-row">
          <span class="stage-pill">${c.type || "Unassigned"}</span>
          <span class="ai-contact-badge ${heatClass}">${aiSafe(aiHeatBadgeText(insight))}</span>
          <span class="ai-contact-badge action">Opp ${insight.opportunityScore ?? 0}</span>
          ${openTasks.length ? `<span class="priority-pill priority-normal">${openTasks.length} task(s)</span>` : ""}
        </div>
        <div class="small-muted mt-1"><b>AI:</b> ${aiSafe(insight.nextAction || "Stay in touch")}</div>
        ${renderTags(c.tags)}
        ${lastActivity ? `<small class="text-muted">Last activity: ${formatDate(lastActivity)}</small>` : ""}
        <div class="mt-2">
          <button class="btn btn-sm btn-outline-primary" onclick="event.stopPropagation(); openContact(${c.id})">Open</button>
        </div>
      `;
      dropzone.appendChild(card);
    });

    pipelineBoard.appendChild(column);

    if (window.Sortable) {
      const sortable = Sortable.create(dropzone, {
        group: "pipeline",
        animation: 150,
        filter: ".text-muted",
        onStart: function () {
          dropzone
            .querySelectorAll(".text-muted.small.p-2")
            .forEach((el) => el.remove());
        },
        onAdd: async function (evt) {
          const contactId = evt.item.dataset.contactId;
          const newStage = evt.to.dataset.stage;
          const movedContact = contactsCache.find(
            (c) => String(c.id) === String(contactId),
          );
          if (movedContact) movedContact.stage = newStage;

          const res = await fetch(`/api/contacts/${contactId}/stage`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ stage: newStage }),
          });

          if (!res.ok) {
            alert("Stage could not be updated. The pipeline will refresh.");
          }

          await loadContacts();
          await loadDashboard();
          await loadTasks();
          await loadCalendar();

          if (
            currentContact &&
            String(currentContact.id) === String(contactId)
          ) {
            currentContact = contactsCache.find(
              (c) => String(c.id) === String(contactId),
            );
            if (currentContact) {
              editStage.value = inferStageFromContact(currentContact);
              renderContactQuickSummary();
              renderQuickStageButtons();
            }
          }

          await loadPipeline();
        },
      });

      pipelineSortables.push(sortable);
    }
  });
}

function renderPipelineCompact(filteredContacts) {
  pipelineBoard.className = "pipeline-compact-table";

  const rows = filteredContacts.slice().sort((a, b) => {
    const aiA =
      buildAIContactInsights([a], activityCache, smsActivityCache)[0] || {};
    const aiB =
      buildAIContactInsights([b], activityCache, smsActivityCache)[0] || {};
    const scoreDiff =
      (aiB.opportunityScore || 0) - (aiA.opportunityScore || 0) ||
      (aiB.leadScore || 0) - (aiA.leadScore || 0);
    if (scoreDiff) return scoreDiff;
    const stageCompare = inferStageFromContact(a).localeCompare(
      inferStageFromContact(b),
    );
    if (stageCompare) return stageCompare;
    return contactName(a).localeCompare(contactName(b));
  });

  if (!rows.length) {
    pipelineBoard.innerHTML =
      '<div class="p-3 text-muted">No contacts match this pipeline filter.</div>';
    return;
  }

  pipelineBoard.innerHTML = `
    <div class="table-responsive">
      <table class="table table-hover align-middle">
        <thead>
          <tr>
            <th>Contact</th>
            <th>Stage</th>
            <th>Type</th>
            <th>AI Score</th>
            <th>Next Action</th>
            <th>Tasks</th>
            <th>Tags</th>
            <th>Last Activity</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          ${rows
            .map((c) => {
              const openTasks = getOpenTasksForContact(c);
              const overdueTasks = getOverdueTasksForContact(c);
              const lastActivity = getLastContactActivityDate(c);
              const insight =
                buildAIContactInsights(
                  [c],
                  activityCache,
                  smsActivityCache,
                )[0] || {};
              const heatClass = aiHeatClass(insight.heat || "Cold");
              return `
              <tr>
                <td><b>${contactName(c)}</b><br><small>${c.email || ""}<br>${formatPhone(c.phone || "")}</small></td>
                <td>
                  <select class="form-control form-control-sm" onchange="updatePipelineStageInline(${c.id}, this.value)">
                    ${(pipelineStagesCache.length ? pipelineStagesCache : getFallbackPipelineStages()).map((stage) => `<option value="${stage}" ${inferStageFromContact(c) === stage ? "selected" : ""}>${stage}</option>`).join("")}
                  </select>
                </td>
                <td>${c.type || "Unassigned"}</td>
                <td><span class="ai-contact-badge ${heatClass}">${aiSafe(aiHeatBadgeText(insight))}</span><br><span class="ai-contact-badge action">Opp ${insight.opportunityScore ?? 0}</span></td>
                <td><small>${aiSafe(insight.nextAction || "Stay in touch")}</small></td>
                <td>
                  ${openTasks.length ? `<span class="priority-pill priority-normal">${openTasks.length} open</span>` : '<span class="text-muted small">None</span>'}
                  ${overdueTasks.length ? `<br><span class="pipeline-warning-pill mt-1">${overdueTasks.length} overdue</span>` : ""}
                </td>
                <td>${renderTags(c.tags) || '<span class="text-muted small">No tags</span>'}</td>
                <td><small>${lastActivity ? formatDate(lastActivity) : "No activity yet"}</small></td>
                <td><button class="btn btn-sm btn-outline-primary" onclick="openContact(${c.id})">Open</button></td>
              </tr>
            `;
            })
            .join("")}
        </tbody>
      </table>
    </div>
  `;
}

async function updatePipelineStageInline(contactId, stage) {
  const res = await fetch(`/api/contacts/${contactId}/stage`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ stage }),
  });

  if (!res.ok) {
    alert("Stage could not be updated.");
    await loadPipeline();
    return;
  }

  await loadContacts();
  await loadDashboard();
  renderPipelineCurrentView();
}

function renderPipelineAnalytics(filteredContacts) {
  pipelineBoard.className = "pipeline-analytics-grid";

  const stages = pipelineStagesCache.length
    ? pipelineStagesCache
    : getFallbackPipelineStages();
  const total = filteredContacts.length || 1;
  const stageRows = stages.map((stage) => {
    const contacts = filteredContacts.filter(
      (c) => inferStageFromContact(c) === stage,
    );
    return {
      stage,
      count: contacts.length,
      pct: Math.round((contacts.length / total) * 100),
    };
  });

  const typeMap = {};
  filteredContacts.forEach((c) => {
    const type = c.type || "Unassigned";
    typeMap[type] = (typeMap[type] || 0) + 1;
  });

  const overdueRows = filteredContacts
    .map((c) => ({
      contact: c,
      overdue: getOverdueTasksForContact(c).length,
      open: getOpenTasksForContact(c).length,
    }))
    .filter((row) => row.overdue || row.open)
    .sort((a, b) => b.overdue - a.overdue || b.open - a.open)
    .slice(0, 10);

  pipelineBoard.innerHTML = `
    <div class="pipeline-analytics-card">
      <h5 class="widget-title">Stage Distribution</h5>
      ${stageRows
        .map(
          (row) => `
        <div class="mb-3">
          <div class="d-flex justify-content-between"><b>${row.stage}</b><span>${row.count}</span></div>
          <div class="pipeline-stage-bar"><div class="pipeline-stage-bar-fill" style="width:${row.pct}%;"></div></div>
        </div>
      `,
        )
        .join("")}
    </div>

    <div class="pipeline-analytics-card">
      <h5 class="widget-title">Contacts by Type</h5>
      ${
        Object.keys(typeMap).length
          ? Object.entries(typeMap)
              .sort((a, b) => b[1] - a[1])
              .map(
                ([type, count]) => `
        <div class="d-flex justify-content-between border-bottom py-2"><b>${type}</b><span>${count}</span></div>
      `,
              )
              .join("")
          : '<div class="text-muted">No contacts yet.</div>'
      }
    </div>

    <div class="pipeline-analytics-card">
      <h5 class="widget-title">Follow-Up Attention Needed</h5>
      ${
        overdueRows.length
          ? overdueRows
              .map(
                (row) => `
        <div class="drilldown-row" onclick="openContact(${row.contact.id})">
          <b>${contactName(row.contact)}</b><br>
          <small>${row.open} open task(s) ${row.overdue ? "| " + row.overdue + " overdue" : ""}</small><br>
          <small>${inferStageFromContact(row.contact)} | ${row.contact.type || "Unassigned"}</small>
        </div>
      `,
              )
              .join("")
          : '<div class="text-muted">No open or overdue tasks found.</div>'
      }
    </div>

    <div class="pipeline-analytics-card">
      <h5 class="widget-title">Most Recent Pipeline Activity</h5>
      ${
        filteredContacts
          .slice()
          .map((c) => ({ contact: c, date: getLastContactActivityDate(c) }))
          .filter((row) => row.date)
          .sort((a, b) => new Date(b.date) - new Date(a.date))
          .slice(0, 10)
          .map(
            (row) => `
        <div class="drilldown-row" onclick="openContact(${row.contact.id})">
          <b>${contactName(row.contact)}</b><br>
          <small>${inferStageFromContact(row.contact)} | ${formatDate(row.date)}</small>
        </div>
      `,
          )
          .join("") || '<div class="text-muted">No pipeline activity yet.</div>'
      }
    </div>
  `;
}

function renderQuickStageButtons() {
  quickStageButtons.innerHTML = "";

  pipelineStagesCache.forEach((stage) => {
    const active = (currentContact.stage || "New Lead") === stage;

    quickStageButtons.innerHTML += `
      <button
        class="btn btn-sm ${active ? "btn-success" : "btn-outline-primary"} me-1 mb-1"
        onclick="quickMoveStage('${stage}')"
      >
        ${stage}
      </button>
    `;
  });
}

async function quickMoveStage(stage) {
  if (!currentContact) return;
  editStage.value = stage;
  currentContact.stage = stage;
  currentContact.pipelineStage = stage;
  currentContact.status = stage;

  const res = await fetch("/api/contacts/" + currentContact.id + "/stage", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ stage }),
  });

  if (!res.ok) {
    alert("Stage could not be updated.");
    return;
  }

  await loadContacts();
  await loadPipeline();
  await loadDashboard();
  await loadTasks();
  await loadCalendar();

  currentContact = contactsCache.find(
    (c) => String(c.id) === String(currentContact.id),
  );
  if (currentContact) {
    currentContact.stage = stage;
    editStage.value = stage;
    renderContactQuickSummary();
    renderQuickStageButtons();
    renderContactTimeline([]);
    loadContactEmailHistory();
  }
}
