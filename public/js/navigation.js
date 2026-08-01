/* =====================================================
   RapportLink Navigation JavaScript
   Version 1
   ===================================================== */

function showTab(t) {
  const tabs = {
    dashboard: "dashboardTab",
    snapshot: "snapshotTab",
    campaigns: "campaignsTab",
    emailDesigner: "emailDesignerTab",
    textCampaigns: "textCampaignsTab",
    contacts: "contactsTab",
    pipeline: "pipelineTab",
    transactions: "transactionsTab",
    tasks: "tasksTab",
    calendar: "calendarTab",
  };

  const buttons = {
    dashboard: "tabDashboard",
    snapshot: "tabSnapshot",
    campaigns: "tabCampaigns",
    emailDesigner: "tabEmailDesigner",
    textCampaigns: "tabTextCampaigns",
    contacts: "tabContacts",
    pipeline: "tabPipeline",
    transactions: "tabTransactions",
    tasks: "tabTasks",
    calendar: "tabCalendar",
  };

  Object.values(tabs).forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.style.display = "none";
  });

  Object.values(buttons).forEach((id) => {
    const btn = document.getElementById(id);
    if (btn) btn.classList.remove("active");
  });

  const panel = document.getElementById(tabs[t]);
  if (panel) panel.style.display = "block";

  const btn = document.getElementById(buttons[t]);
  if (btn) btn.classList.add("active");

  if (typeof closeToolbarMenus === "function") closeToolbarMenus();

  try {
    if (t === "dashboard" && typeof loadDashboard === "function")
      loadDashboard();
    if (t === "snapshot" && typeof loadDashboard === "function")
      loadDashboard();
    if (t === "campaigns") {
      if (typeof loadCampaigns === "function") loadCampaigns();
      if (typeof loadTemplates === "function") loadTemplates();
      if (typeof loadSegments === "function") loadSegments();
      if (typeof loadScheduledCampaigns === "function")
        loadScheduledCampaigns();
      if (typeof loadTags === "function") loadTags();
      if (typeof renderRecipientBuilder === "function")
        renderRecipientBuilder();
    }
    if (
      t === "emailDesigner" &&
      typeof initEmailDesignerIfNeeded === "function"
    )
      initEmailDesignerIfNeeded();
    if (t === "textCampaigns") {
      if (typeof loadContacts === "function") loadContacts();
      if (typeof loadSegments === "function") loadSegments();
      if (typeof loadTags === "function") loadTags();
      if (typeof renderTextCampaignBuilder === "function")
        renderTextCampaignBuilder();
      if (typeof loadTextCampaignActivity === "function")
        loadTextCampaignActivity();
    }
    if (t === "contacts") {
      if (typeof loadContacts === "function") loadContacts();
      if (typeof loadTags === "function") loadTags();
    }
    if (t === "pipeline" && typeof loadPipeline === "function") loadPipeline();
    if (t === "transactions" && typeof txnInit === "function") txnInit();
    if (t === "tasks" && typeof loadTasks === "function") loadTasks();
    if (t === "calendar" && typeof loadCalendar === "function") loadCalendar();
  } catch (error) {
    console.error("Tab load error:", t, error);
  }

  return false;
}

/* HEADER / GLOBAL SEARCH / NOTIFICATIONS */
function closeToolbarMenus() {
  document.getElementById("notificationMenu")?.classList.remove("open");
  document.getElementById("settingsMenu")?.classList.remove("open");
}

function toggleNotificationMenu() {
  const menu = document.getElementById("notificationMenu");
  if (!menu) return;
  document.getElementById("settingsMenu")?.classList.remove("open");
  renderNotificationMenu();
  menu.classList.toggle("open");
}

function toggleSettingsMenu() {
  const menu = document.getElementById("settingsMenu");
  const notificationMenu = document.getElementById("notificationMenu");

  if (!menu) {
    alert("Settings menu not found.");
    return;
  }

  if (notificationMenu) notificationMenu.classList.remove("open");

  menu.classList.toggle("open");

  if (typeof loadGmailStatus === "function") {
    loadGmailStatus();
  }
}

function updateNotificationBadge(taskStats = null) {
  const badge = document.getElementById("notificationBadge");
  if (!badge) return;
  const overdue = taskStats
    ? taskStats.overdue || 0
    : allTasksCache.filter(taskIsOverdue).length;
  const dueToday = taskStats
    ? taskStats.dueToday || 0
    : allTasksCache.filter(
        (t) => !t.done && t.due && String(t.due).slice(0, 10) === todayKey(),
      ).length;
  const total = overdue + dueToday;
  badge.innerText = total;
  badge.style.display = total ? "flex" : "none";
}

function renderNotificationMenu() {
  const menu = document.getElementById("notificationMenu");
  if (!menu) return;
  const overdue = allTasksCache.filter(taskIsOverdue);
  const dueToday = allTasksCache.filter(
    (t) => !t.done && t.due && String(t.due).slice(0, 10) === todayKey(),
  );
  let html = '<div class="small-muted mb-2">Notifications</div>';
  if (!overdue.length && !dueToday.length) {
    html +=
      '<div class="text-muted small p-2">No urgent tasks right now.</div>';
  } else {
    overdue.slice(0, 5).forEach((t) => {
      html += `<div class="quick-add-item" onclick="showTab('tasks')"><b>Overdue:</b> ${t.title || "Task"}<br><small>${t.contactName || ""} | Due ${formatShortDate(t.due)}</small></div>`;
    });
    dueToday.slice(0, 5).forEach((t) => {
      html += `<div class="quick-add-item" onclick="showTab('tasks')"><b>Due Today:</b> ${t.title || "Task"}<br><small>${t.contactName || ""}</small></div>`;
    });
  }
  menu.innerHTML = html;
}

function quickAddContact() {
  showTab("contacts");
  setTimeout(() => {
    firstName?.focus();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, 100);
}

function handleGlobalSearch() {
  const input = document.getElementById("globalSearchInput");
  const results = document.getElementById("globalSearchResults");
  if (!input || !results) return;
  const q = input.value.trim().toLowerCase();
  if (!q) {
    results.classList.remove("open");
    results.innerHTML = "";
    return;
  }

  const contactMatches = contactsCache
    .filter((c) => {
      const text =
        `${contactName(c)} ${c.email || ""} ${formatPhone(c.phone || "")} ${c.type || ""} ${inferStageFromContact(c)} ${(c.tags || []).join(" ")}`.toLowerCase();
      return text.includes(q);
    })
    .slice(0, 8);

  const campaignMatches = campaignsCache
    .filter((c) => {
      const text = `${c.name || ""} ${c.subject || ""}`.toLowerCase();
      return text.includes(q);
    })
    .slice(0, 5);

  let html = "";

  if (contactMatches.length) {
    html += '<div class="small-muted p-2">Contacts</div>';
    html += contactMatches
      .map(
        (c) => `
      <div class="global-result-row" onclick="openGlobalContact(${c.id})">
        <b>${contactName(c)}</b><br>
        <small>${c.email || ""} | ${formatPhone(c.phone || "")} | ${c.type || ""} | ${inferStageFromContact(c)}</small>
      </div>
    `,
      )
      .join("");
  }

  if (campaignMatches.length) {
    html += '<div class="small-muted p-2">Email Campaigns</div>';
    html += campaignMatches
      .map(
        (c) => `
      <div class="global-result-row" onclick="openGlobalCampaign(${c.id})">
        <b>${c.name || "Untitled Campaign"}</b><br>
        <small>${c.subject || ""}</small>
      </div>
    `,
      )
      .join("");
  }

  if (!html) html = '<div class="text-muted small p-3">No matches found.</div>';
  results.innerHTML = html;
  results.classList.add("open");
}

function openGlobalContact(id) {
  document.getElementById("globalSearchResults")?.classList.remove("open");
  document.getElementById("globalSearchInput").value = "";
  showTab("contacts");
  setTimeout(() => openContact(id), 100);
}

function openGlobalCampaign(id) {
  document.getElementById("globalSearchResults")?.classList.remove("open");
  document.getElementById("globalSearchInput").value = "";
  showTab("campaigns");
  setTimeout(() => openCampaignPanel(id), 150);
}
