/* =====================================================
   RapportLink Main JavaScript
   Version 2.1
   ===================================================== */

/* ===== RAPPORTLINK TOOLBAR MENU HARDENING FIX ===== */

(function () {
  function getEl(id) {
    return document.getElementById(id);
  }

  function closeToolbarMenus(exceptId) {
    ["notificationMenu", "settingsMenu"].forEach(function (id) {
      if (id === exceptId) return;
      var menu = getEl(id);
      if (menu) menu.classList.remove("open");
    });
  }

  window.closeToolbarMenus = function () {
    closeToolbarMenus(null);
  };

  window.toggleSettingsMenu = function (event) {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }

    var menu = getEl("settingsMenu");
    if (!menu) return false;

    closeToolbarMenus("settingsMenu");
    menu.classList.toggle("open");
    return false;
  };

  window.toggleNotificationMenu = function (event) {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }

    var menu = getEl("notificationMenu");
    if (!menu) return false;

    closeToolbarMenus("notificationMenu");

    if (typeof window.renderNotificationMenu === "function") {
      try {
        window.renderNotificationMenu();
      } catch (error) {
        console.warn("Notification render failed:", error);
      }
    }

    menu.classList.toggle("open");
    return false;
  };

  document.addEventListener("click", function (event) {
    if (event.target.closest && event.target.closest(".toolbar-menu-wrap")) {
      return;
    }
    closeToolbarMenus(null);
  });

  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape") closeToolbarMenus(null);
  });
})();

/* ===== SAFE STARTUP HELPERS ===== */

function rlSafeRun(label, fn) {
  try {
    if (typeof fn === "function") {
      return fn();
    }
  } catch (error) {
    console.warn(label + " failed:", error);
  }
  return null;
}

async function rlSafeAwait(label, fn) {
  try {
    if (typeof fn === "function") {
      return await fn();
    }
  } catch (error) {
    console.warn(label + " failed:", error);
  }
  return null;
}

function rlShowDashboardFallback() {
  const tabs = [
    "dashboardTab",
    "snapshotTab",
    "calendarTab",
    "campaignsTab",
    "emailDesignerTab",
    "textCampaignsTab",
    "contactsTab",
    "pipelineTab",
    "transactionsTab",
    "tasksTab",
    "settingsTab",
  ];

  tabs.forEach((id) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.style.display = id === "dashboardTab" ? "block" : "none";
  });

  document.querySelectorAll(".nav-link").forEach((btn) => {
    btn.classList.remove("active");
  });

  const dashboardButton = document.getElementById("tabDashboard");
  if (dashboardButton) dashboardButton.classList.add("active");
}

function rlShowDashboard() {
  if (typeof showTab === "function") {
    try {
      showTab("dashboard");
      return;
    } catch (error) {
      console.warn("showTab dashboard failed, using fallback:", error);
    }
  }

  rlShowDashboardFallback();
}

/* ===== EVENT BINDINGS ===== */

document.addEventListener("click", function (event) {
  const searchWrap = document.querySelector(".global-search-wrap");
  if (searchWrap && !searchWrap.contains(event.target)) {
    document.getElementById("globalSearchResults")?.classList.remove("open");
  }
});

function bindRapportLinkEvents() {
  const contactSearchEl = document.getElementById("contactSearch");
  if (contactSearchEl && typeof loadContacts === "function") {
    contactSearchEl.addEventListener("input", loadContacts);
  }

  ["contactTypeFilter", "contactStageFilter", "contactTagFilter"].forEach(
    (id) => {
      const el = document.getElementById(id);
      if (el && typeof loadContacts === "function") {
        el.addEventListener("change", loadContacts);
      }
    },
  );

  const recipientSearchEl = document.getElementById("recipientSearch");
  if (recipientSearchEl && typeof renderRecipientContacts === "function") {
    recipientSearchEl.addEventListener("input", renderRecipientContacts);
  }

  const extraRecipientsEl = document.getElementById("extraRecipients");
  if (extraRecipientsEl && typeof updateRecipientCount === "function") {
    extraRecipientsEl.addEventListener("input", updateRecipientCount);
  }

  ["importDefaultType", "importDefaultStage", "importDefaultTags"].forEach(
    (id) => {
      const el = document.getElementById(id);
      if (!el) return;

      el.addEventListener("change", () => {
        if (
          typeof contactImportRows !== "undefined" &&
          Array.isArray(contactImportRows) &&
          contactImportRows.length
        ) {
          contactImportRows = contactImportRows.map((row) => ({
            ...row,
            type: row.type || el.value,
            stage: row.stage || el.value,
          }));

          rlSafeRun("analyzeContactImport", analyzeContactImport);
          rlSafeRun("renderContactImportPreview", renderContactImportPreview);
        }
      });
    },
  );

  const phoneEl = document.getElementById("phone");
  if (phoneEl && typeof normalizePhoneInput === "function") {
    phoneEl.addEventListener("input", () => normalizePhoneInput(phoneEl));
  }

  const editPhoneEl = document.getElementById("editPhone");
  if (editPhoneEl && typeof normalizePhoneInput === "function") {
    editPhoneEl.addEventListener("input", () =>
      normalizePhoneInput(editPhoneEl),
    );
  }

  [
    "txnStatus",
    "txnContractDate",
    "txnEmdDue",
    "txnInspectionDate",
    "txnAppraisalDate",
    "txnLoanDate",
    "txnWalkthroughDate",
    "txnCloseDate",
    "txnAutomationEnabled",
    "txnAutoCreateDates",
    "txnAutoCreateDocs",
  ].forEach((id) => {
    const el = document.getElementById(id);
    if (el && typeof txnRenderAutomationPreview === "function") {
      el.addEventListener("change", txnRenderAutomationPreview);
    }
  });

  document.addEventListener("change", (event) => {
    if (
      event.target &&
      event.target.hasAttribute("data-txn-check") &&
      typeof txnRenderAutomationPreview === "function"
    ) {
      txnRenderAutomationPreview();
    }
  });
}

/* ===== GMAIL ===== */

function connectGmailAccount() {
  window.location.href = "/auth/google";
}

async function loadGmailStatus() {
  const statusEls = [
    document.getElementById("gmailConnectionStatus"),
    document.getElementById("gmailConnectionStatusSettings"),
  ].filter(Boolean);

  const buttonEls = [
    document.getElementById("gmailConnectButton"),
    document.getElementById("gmailConnectButtonSettings"),
  ].filter(Boolean);

  if (!statusEls.length) return;

  try {
    const res = await fetch("/api/gmail/status");
    const data = await res.json();

    if (data.connected) {
      statusEls.forEach((el) => {
        el.innerHTML = `Connected to Gmail as <b>${data.email || "your Google account"}</b>`;
      });

      buttonEls.forEach((btn) => {
        btn.textContent = "Reconnect Gmail";
      });
    } else {
      statusEls.forEach((el) => {
        el.textContent = "Gmail is not connected yet.";
      });

      buttonEls.forEach((btn) => {
        btn.textContent = "Connect Gmail";
      });
    }
  } catch (error) {
    statusEls.forEach((el) => {
      el.textContent = "Could not check Gmail connection status.";
    });
  }
}

/* ===== STARTUP ===== */

async function startRapportLink() {
  bindRapportLinkEvents();

  // Show Dashboard immediately. Do not wait for API calls.
  rlShowDashboard();

  rlSafeRun("renderTypes", renderTypes);
  rlSafeRun("loadGmailStatus", loadGmailStatus);

  await rlSafeAwait("loadPipelineStages", loadPipelineStages);

  await rlSafeAwait(
    "txnHydrateStoredDocumentAnalyses",
    txnHydrateStoredDocumentAnalyses,
  );

  rlSafeRun("txnLoad", txnLoad);

  if (typeof window.loadTags === "function")
    await rlSafeAwait("loadTags", window.loadTags);
  if (typeof window.loadContacts === "function")
    await rlSafeAwait("loadContacts", window.loadContacts);
  if (typeof window.loadCampaigns === "function")
    await rlSafeAwait("loadCampaigns", window.loadCampaigns);
  if (typeof window.loadTemplates === "function")
    await rlSafeAwait("loadTemplates", window.loadTemplates);
  if (typeof window.loadSegments === "function")
    await rlSafeAwait("loadSegments", window.loadSegments);
  if (typeof window.loadScheduledCampaigns === "function")
    await rlSafeAwait("loadScheduledCampaigns", window.loadScheduledCampaigns);
  if (typeof window.loadTasks === "function")
    await rlSafeAwait("loadTasks", window.loadTasks);
  if (typeof window.loadCalendar === "function")
    await rlSafeAwait("loadCalendar", window.loadCalendar);
  if (typeof window.loadTextCampaignActivity === "function")
    await rlSafeAwait(
      "loadTextCampaignActivity",
      window.loadTextCampaignActivity,
    );

  // Refresh Dashboard after all data has had a chance to load.
  rlShowDashboard();

  if (typeof loadDashboard === "function") {
    await rlSafeAwait("loadDashboard", loadDashboard);
  }

  // Final safety pass in case another startup process changed tabs.
  setTimeout(() => {
    rlShowDashboard();

    if (typeof loadDashboard === "function") {
      rlSafeRun("loadDashboard final refresh", loadDashboard);
    }
  }, 500);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", startRapportLink);
} else {
  startRapportLink();
}
