/* =====================================================
   RapportLink Transaction Engine
   Version 1
   ===================================================== */

window.TransactionEngine = {
  initialize() {
    console.log("Transaction Engine Initialized");
  },

  generateChecklist(transactionType) {
    if (transactionType === "Listing") {
      return [
        "Signed Listing Agreement",
        "Order Photography",
        "Install Sign",
        "Enter into MLS",
        "Schedule Open House",
        "Review Offers",
        "Open Escrow",
        "Inspection",
        "Appraisal",
        "Final Walkthrough",
        "Closing",
      ];
    }

    if (transactionType === "Buyer") {
      return [
        "Buyer Consultation",
        "Loan Preapproval",
        "Property Search",
        "Offer Submitted",
        "Offer Accepted",
        "Open Escrow",
        "Inspection",
        "Appraisal",
        "Final Walkthrough",
        "Closing",
      ];
    }

    return [];
  },

  createTransaction(transaction) {
    return {
      ...transaction,
      checklist: this.generateChecklist(transaction.type),
      createdAt: new Date().toISOString(),
      timeline: [
        {
          date: new Date().toISOString(),
          event: "Transaction Created",
        },
      ],
    };
  },
};

function txnStartFromCurrentContact() {
  if (!currentContact) {
    showTab("transactions");
    txnStartNew();
    return;
  }

  showTab("transactions");

  setTimeout(() => {
    txnStartNew();

    const typeText =
      `${currentContact.type || ""} ${(currentContact.tags || []).join(" ")}`.toLowerCase();
    const isSeller =
      typeText.includes("seller") || typeText.includes("listing");
    const prefix = isSeller ? "Seller" : "Buyer";

    document.getElementById("txnSide").value = isSeller ? "Seller" : "Buyer";
    document.getElementById(`txn${prefix}ContactId`).value = currentContact.id;
    document.getElementById(`txn${prefix}`).value = contactName(currentContact);
    document.getElementById(`txn${prefix}Email`).value =
      currentContact.email || "";
    document.getElementById(`txn${prefix}Phone`).value = formatPhone(
      currentContact.phone || "",
    );
    document.getElementById("txnStatus").value = "Under Contract";

    txnRenderPartySelectors();
    document.getElementById("txnAddress")?.focus();
  }, 120);
}

function txnOpenLinkedContact(id) {
  if (!id) {
    alert("No contact is linked yet.");
    return;
  }

  if (typeof txnClosePanel === "function") {
    txnClosePanel();
  }

  showTab("contacts");

  setTimeout(() => {
    if (typeof loadContacts === "function") {
      loadContacts();
    }

    setTimeout(() => {
      if (typeof openContact === "function") {
        openContact(id);
      } else {
        alert("Contact profile function is not available.");
      }
    }, 250);
  }, 150);
}

function txnEmailLinkedContact(id, email) {
  if (!id) {
    if (email) {
      window.location.href = `mailto:${email}`;
    } else {
      alert("No contact is linked.");
    }
    return;
  }

  if (typeof txnClosePanel === "function") {
    txnClosePanel();
  }

  showTab("contacts");

  setTimeout(() => {
    if (typeof openContact === "function") {
      openContact(id);
    }

    setTimeout(() => {
      const allButtons = Array.from(
        document.querySelectorAll("button, a, div"),
      );

      const communicationsTab = allButtons.find(
        (el) => el.textContent && el.textContent.trim() === "Communications",
      );

      if (communicationsTab) {
        communicationsTab.click();
      }

      setTimeout(() => {
        const emailField =
          document.querySelector("#contactEmailMessage") ||
          document.querySelector("#emailMessage") ||
          document.querySelector("textarea[placeholder*='email']") ||
          document.querySelector("textarea[placeholder*='Email']");

        if (emailField) {
          emailField.focus();
        }
      }, 400);
    }, 600);
  }, 300);
}

function txnTextLinkedContact(id, phone) {
  if (!id) {
    alert("No contact is linked.");
    return;
  }

  if (typeof txnClosePanel === "function") {
    txnClosePanel();
  }

  showTab("contacts");

  setTimeout(() => {
    if (typeof openContact === "function") {
      openContact(id);
    }

    setTimeout(() => {
      const allButtons = Array.from(
        document.querySelectorAll("button, a, div"),
      );

      const communicationsTab = allButtons.find(
        (el) => el.textContent && el.textContent.trim() === "Communications",
      );

      if (communicationsTab) {
        communicationsTab.click();
      }

      setTimeout(() => {
        const smsField =
          document.querySelector("#contactSmsMessage") ||
          document.querySelector("#smsMessage") ||
          document.querySelector("textarea[placeholder*='SMS']") ||
          document.querySelector("textarea[placeholder*='text']") ||
          document.querySelector("textarea");

        if (smsField) {
          smsField.focus();
        }
      }, 400);
    }, 600);
  }, 300);
}

function txnPartyPanelHtml(txn, party) {
  const config = {
    buyer: {
      label: "Buyer",
      name: txn.buyer || "—",
      email: txn.buyerEmail || "",
      phone: txn.buyerPhone || "",
      contactId: txn.buyerContactId || "",
    },
    seller: {
      label: "Seller",
      name: txn.seller || "—",
      email: txn.sellerEmail || "",
      phone: txn.sellerPhone || "",
      contactId: txn.sellerContactId || "",
    },
    lender: {
      label: "Lender",
      name: txn.lender || "—",
      email: txn.lenderEmail || "",
      phone: txn.lenderPhone || "",
      contactId: txn.lenderContactId || "",
    },
    title: {
      label: "Title / Escrow",
      name: txn.titleCompany || "—",
      email: txn.titleEmail || "",
      phone: txn.titlePhone || "",
      contactId: txn.titleContactId || "",
    },
  };

  const item = config[party] || config.buyer;
  const cleanPhone = String(item.phone || "").replace(/\D/g, "");
  const details = [item.email, item.phone ? formatPhone(item.phone) : ""]
    .filter(Boolean)
    .join(" • ");

  return `
    <div class="transaction-meta-box">
      <div class="small-muted">${item.label}</div>

      <b>${txnSafe(item.name)}</b>

      ${details ? `<small>${txnSafe(details)}</small>` : `<small>&nbsp;</small>`}

      <div style="margin-top:auto;display:flex;gap:8px;flex-wrap:wrap;">

        ${
          item.contactId
            ? `<button class="btn btn-success btn-sm" onclick="txnOpenLinkedContact('${item.contactId}')">Open Contact</button>`
            : `<button class="btn btn-outline-secondary btn-sm" onclick="txnEditFromWorkspace('${txn.id}')">Link Contact</button>`
        }

        ${
          item.email
            ? `<button class="btn btn-outline-secondary btn-sm" onclick="txnEmailLinkedContact('${item.contactId}', '${txnSafe(item.email)}')">Email</button>`
            : ""
        }

        ${
          cleanPhone
            ? `<button
                 class="btn btn-outline-secondary btn-sm"
                 onclick="txnTextLinkedContact('${item.contactId}','${cleanPhone}')">
                 Text
              </button>`
            : ""
        }

        ${
          item.contactId
            ? `<button class="btn btn-outline-secondary btn-sm" onclick="txnOpenLinkedContact('${item.contactId}')">Edit</button>`
            : ""
        }

      </div>
    </div>
  `;
}

function txnContactDisplay(contact) {
  if (!contact) return "";
  const name =
    typeof contactName === "function"
      ? contactName(contact)
      : `${contact.firstName || ""} ${contact.lastName || ""}`.trim();
  const email = contact.email ? ` • ${contact.email}` : "";
  const phone = contact.phone ? ` • ${formatPhone(contact.phone)}` : "";
  return `${name}${email}${phone}`;
}

function txnRenderPartySelectors() {
  const buyerSelect = document.getElementById("txnBuyerContactSelect");
  const sellerSelect = document.getElementById("txnSellerContactSelect");
  if (!buyerSelect || !sellerSelect) return;
  const options = ['<option value="">No linked contact selected</option>']
    .concat(
      (contactsCache || [])
        .slice()
        .sort((a, b) => contactName(a).localeCompare(contactName(b)))
        .map(
          (c) =>
            `<option value="${String(c.id)}">${txnSafe(txnContactDisplay(c))}</option>`,
        ),
    )
    .join("");
  buyerSelect.innerHTML = options;
  sellerSelect.innerHTML = options;
  buyerSelect.value = document.getElementById("txnBuyerContactId")?.value || "";
  sellerSelect.value =
    document.getElementById("txnSellerContactId")?.value || "";
}
function txnAttachPartyFromSelect(party) {
  const prefix = party === "seller" ? "Seller" : "Buyer";
  const select = document.getElementById(`txn${prefix}ContactSelect`);
  const hidden = document.getElementById(`txn${prefix}ContactId`);
  const id = select?.value || "";
  if (hidden) hidden.value = id;
  const contact = (contactsCache || []).find(
    (c) => String(c.id) === String(id),
  );
  if (contact) {
    document.getElementById(`txn${prefix}`).value = contactName(contact);
    document.getElementById(`txn${prefix}Email`).value = contact.email || "";
    document.getElementById(`txn${prefix}Phone`).value = formatPhone(
      contact.phone || "",
    );
  }
  txnRenderAutomationPreview();
}

function txnClearPartyLink(party) {
  const prefix = party === "seller" ? "Seller" : "Buyer";
  const hidden = document.getElementById(`txn${prefix}ContactId`);
  const select = document.getElementById(`txn${prefix}ContactSelect`);
  if (hidden) hidden.value = "";
  if (select) select.value = "";
}
/* ================= TRANSACTION CENTER ================= */
const TXN_STORAGE_KEY = "excelMarketingTransactionsV1_TEST";
const TXN_DOC_STORAGE_NOTICE = "Browser storage version";
const TXN_WORKFLOWS = {
  "Buyer Purchase": [
    "Buyer Consultation",
    "Buyer Representation Agreement",
    "Loan Pre-Approval",
    "Property Search",
    "Offer Submitted",
    "Offer Accepted",
    "Purchase Agreement Executed",
    "Earnest Money Received",
    "Disclosures Sent",
    "Inspection Ordered",
    "Inspection Complete",
    "Repair Negotiation Complete",
    "Appraisal Ordered",
    "Appraisal Received",
    "Loan Approval Received",
    "HOA Docs Received",
    "Closing Scheduled",
    "Final Walkthrough Complete",
    "Closing Statement Reviewed",
    "Closed / Recorded",
  ],

  "Seller Sale": [
    "Purchase Agreement Executed",
    "Earnest Money Received",
    "Disclosures Delivered",
    "Inspection Ordered",
    "Inspection Complete",
    "Repair Negotiation Complete",
    "Appraisal Ordered",
    "Appraisal Received",
    "Loan Approval Confirmed",
    "HOA Docs Delivered",
    "Closing Scheduled",
    "Final Walkthrough Complete",
    "Closing Statement Reviewed",
    "Closed / Recorded",
  ],

  Listing: [
    "Listing Presentation",
    "Signed Listing Agreement",
    "Seller Property Disclosure",
    "Professional Photography",
    "Video / Virtual Tour",
    "Floor Plan",
    "Install Sign",
    "Install Lockbox",
    "MLS Entry",
    "Activate Listing",
    "Marketing Campaign Started",
    "Open House Scheduled",
    "Offer Received",
    "Offer Accepted",
    "Open Escrow",
    "Inspection Complete",
    "Appraisal Complete",
    "Final Walkthrough",
    "Closing Statement Reviewed",
    "Closed / Recorded",
  ],

  "Dual Agency": [
    "Buyer Consultation",
    "Listing Agreement",
    "Purchase Agreement Executed",
    "Earnest Money Received",
    "Disclosures Completed",
    "Inspection Ordered",
    "Inspection Complete",
    "Repair Negotiation Complete",
    "Appraisal Ordered",
    "Appraisal Received",
    "Loan Approval Received",
    "Closing Scheduled",
    "Final Walkthrough Complete",
    "Closing Statement Reviewed",
    "Closed / Recorded",
  ],
};

function txnWorkflowItems(txn = {}) {
  const type = typeof txn === "string" ? txn : txn.side || "Buyer";

  switch (type) {
    case "Listing":
      return TXN_WORKFLOWS["Listing"];

    case "Dual Agency":
      return TXN_WORKFLOWS["Dual Agency"];

    case "Buyer":
    default:
      return TXN_WORKFLOWS["Buyer Purchase"];
  }
}

const TXN_AUTOMATION_RULES = [
  {
    field: "contractDate",
    title: "Send executed contract to title/escrow",
    offset: 0,
    priority: "High",
    category: "Opening",
    checklist: "Purchase Agreement Executed",
  },
  {
    field: "contractDate",
    title: "Send disclosure package to client",
    offset: 1,
    priority: "Normal",
    category: "Opening",
    checklist: "Disclosures Sent",
  },
  {
    field: "emdDue",
    title: "Confirm earnest money deposit received",
    offset: 0,
    priority: "High",
    category: "Escrow",
    checklist: "Earnest Money Received",
  },
  {
    field: "inspectionDate",
    title: "Confirm inspection is ordered",
    offset: -3,
    priority: "High",
    category: "Inspection",
    checklist: "Inspection Ordered",
  },
  {
    field: "inspectionDate",
    title: "Confirm inspection is complete",
    offset: 0,
    priority: "High",
    category: "Inspection",
    checklist: "Inspection Complete",
  },
  {
    field: "inspectionDate",
    title: "Resolve inspection / repair negotiations",
    offset: 1,
    priority: "High",
    category: "Inspection",
    checklist: "Repair Negotiation Complete",
  },
  {
    field: "appraisalDate",
    title: "Confirm appraisal has been ordered",
    offset: -5,
    priority: "Normal",
    category: "Appraisal",
    checklist: "Appraisal Ordered",
  },
  {
    field: "appraisalDate",
    title: "Confirm appraisal has been received",
    offset: 0,
    priority: "High",
    category: "Appraisal",
    checklist: "Appraisal Received",
  },
  {
    field: "loanDate",
    title: "Confirm loan approval status with lender",
    offset: 0,
    priority: "High",
    category: "Loan",
    checklist: "Loan Approval Received",
  },
  {
    field: "walkthroughDate",
    title: "Schedule and complete final walkthrough",
    offset: 0,
    priority: "Normal",
    category: "Closing",
    checklist: "Final Walkthrough Complete",
  },
  {
    field: "closeDate",
    title: "Confirm closing appointment is scheduled",
    offset: -5,
    priority: "High",
    category: "Closing",
    checklist: "Closing Scheduled",
  },
  {
    field: "closeDate",
    title: "Review closing statement / settlement statement",
    offset: -2,
    priority: "High",
    category: "Closing",
    checklist: "Closing Statement Reviewed",
  },
  {
    field: "closeDate",
    title: "Confirm closed and recorded",
    offset: 0,
    priority: "High",
    category: "Closing",
    checklist: "Closed / Recorded",
  },
];
const TXN_REQUIRED_DOC_RULES = [
  {
    keyword: "contract|purchase|agreement",
    title: "Upload purchase agreement / executed contract",
    priority: "High",
  },
  {
    keyword: "disclosure|srpd|seller",
    title: "Upload required disclosure package",
    priority: "Normal",
  },
  {
    keyword: "inspection",
    title: "Upload inspection report when received",
    priority: "Normal",
  },
  {
    keyword: "appraisal",
    title: "Upload appraisal when received",
    priority: "Normal",
  },
  {
    keyword: "closing|settlement|cd|alta",
    title: "Upload closing statement / settlement statement",
    priority: "High",
  },
];
let txnCache = [];
let txnWorkingDocs = [];
let txnCacheInitialized = false;

function txnSafe(value) {
  return String(value ?? "").replace(
    /[&<>"']/g,
    (ch) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;",
      })[ch],
  );
}

function txnMoney(value) {
  const num = Number(value || 0);

  const hasCents = Math.abs(num % 1) > 0.000001;

  return num.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: hasCents ? 2 : 0,
    maximumFractionDigits: 2,
  });
}

function txnDate(value) {
  if (!value) return "";
  const d = new Date(String(value).includes("T") ? value : `${value}T00:00:00`);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleDateString();
}

function txnDaysUntil(value) {
  if (!value) return 9999;
  const d = new Date(`${value}T00:00:00`);
  if (isNaN(d.getTime())) return 9999;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.ceil((d - today) / 86400000);
}

/* =========================================================
   TRANSACTION AI SNAPSHOT CACHE
   =========================================================

   Normal page startup must not rebuild every transaction
   from every stored document.

   A transaction is rebuilt only when its relevant source
   information has changed.
   ========================================================= */

const TXN_AI_SNAPSHOT_KEY = `${TXN_STORAGE_KEY}_AI_SNAPSHOTS_V1`;

function txnBuildAISourceFingerprint(txn = {}) {
  const documents = Array.isArray(txn.documents) ? txn.documents : [];

  const documentVersions = documents.map((doc) => {
    const analysis =
      doc?.aiAnalysis && typeof doc.aiAnalysis === "object"
        ? doc.aiAnalysis
        : {};

    return {
      id: String(doc?.id || ""),
      uploadedAt: String(doc?.uploadedAt || ""),
      lastAnalyzed: String(
        doc?.lastAnalyzed ||
          analysis?.reviewedAt ||
          analysis?.lastAnalyzed ||
          "",
      ),
      engineVersion: String(
        doc?.engineVersion || analysis?.engineVersion || "",
      ),
      schemaVersion: String(analysis?.schemaVersion || ""),
      analysisStatus: String(doc?.analysisStatus || ""),
    };
  });

  const relevantTransactionData = {
    id: String(txn.id || ""),

    /*
     * Force AI snapshot invalidation whenever the
     * Transaction Brain engine changes.
     *
     * This prevents older cached Brain conclusions
     * from being restored after Brain logic changes.
     */
    aiBrainVersion: Number(window.AI_TRANSACTION_BRAIN_VERSION || 0),

    side: String(txn.side || ""),

    price: txn.price ?? null,
    purchasePrice: txn.purchasePrice ?? null,
    commissionPercent: txn.commissionPercent ?? null,
    gci: txn.gci ?? null,

    contractDate: String(txn.contractDate || ""),
    closeDate: String(txn.closeDate || ""),
    closingDate: String(txn.closingDate || ""),
    actualClosingDate: String(txn.actualClosingDate || ""),

    checklist:
      txn.checklist && typeof txn.checklist === "object" ? txn.checklist : {},

    documents: documentVersions,
  };

  return JSON.stringify(relevantTransactionData);
}

function txnLoadAISnapshots() {
  try {
    const parsed = JSON.parse(
      localStorage.getItem(TXN_AI_SNAPSHOT_KEY) || "{}",
    );

    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? parsed
      : {};
  } catch (error) {
    console.error("Unable to load Transaction AI snapshots:", error);
    return {};
  }
}

function txnSaveAISnapshots(snapshots = {}) {
  try {
    localStorage.setItem(TXN_AI_SNAPSHOT_KEY, JSON.stringify(snapshots));

    return true;
  } catch (error) {
    console.error("Unable to save Transaction AI snapshots:", error);
    return false;
  }
}

function txnCreateAISnapshot(txn = {}) {
  const brain =
    txn.transactionBrain && typeof txn.transactionBrain === "object"
      ? txn.transactionBrain
      : {};

  return {
    transactionId: String(txn.id || ""),
    fingerprint: txnBuildAISourceFingerprint(txn),

    transactionBrain: {
      transactionState:
        brain.decision?.state || brain.transactionState || "Unknown",

      decision:
        brain.decision && typeof brain.decision === "object"
          ? {
              state:
                brain.decision.state || brain.transactionState || "Unknown",

              confidence: brain.decision.confidence ?? brain.confidence ?? null,

              health: brain.decision.health ?? brain.health ?? null,

              reason: brain.decision.reason || brain.decision.summary || "",
            }
          : null,

      canonicalFacts:
        brain.canonicalFacts && typeof brain.canonicalFacts === "object"
          ? brain.canonicalFacts
          : {},

      health:
        brain.health ?? brain.transactionHealth ?? brain.healthScore ?? null,

      confidence:
        brain.confidence ??
        brain.closingConfidence ??
        brain.closingProbability ??
        null,

      completion:
        brain.completion ?? brain.progress ?? txn.checklistCompleted ?? null,

      risk:
        brain.risk && typeof brain.risk === "object"
          ? brain.risk
          : brain.risk || null,

      priorities: Array.isArray(brain.priorities) ? brain.priorities : [],

      alerts: Array.isArray(brain.alerts) ? brain.alerts : [],

      recommendations: Array.isArray(brain.recommendations)
        ? brain.recommendations
        : [],
    },

    checklistCompleted: txn.checklistCompleted ?? null,
    savedAt: new Date().toISOString(),
  };
}

async function txnHydrateStoredDocumentAnalyses() {
  if (typeof repoHydrateDocument !== "function") {
    return;
  }

  const parsed = JSON.parse(localStorage.getItem(TXN_STORAGE_KEY) || "[]");

  if (!Array.isArray(parsed)) {
    return;
  }

  for (const txn of parsed) {
    if (!Array.isArray(txn.documents)) {
      txn.documents = [];
      continue;
    }

    txn.documents = await Promise.all(
      txn.documents.map(async (doc) => {
        if (!doc || typeof doc !== "object" || !doc.id) {
          return doc;
        }

        try {
          /*
           * If this document already contains a valid AI analysis,
           * do not hit the repository again.
           */
          if (
            doc.aiAnalysis &&
            typeof doc.aiAnalysis === "object" &&
            Object.keys(doc.aiAnalysis).length > 0
          ) {
            return doc;
          }

          return await repoHydrateDocument(doc);
        } catch (error) {
          console.error(
            `Unable to hydrate stored analysis for ${doc.name || doc.id}:`,
            error,
          );

          return doc;
        }
      }),
    );
  }

  /*
   * Supply the hydrated transactions to txnLoad().
   * Do not write the large repository analyses back into localStorage.
   */
  window.txnHydratedStartupTransactions = parsed;
}

function txnLoad() {
  if (txnCacheInitialized) {
    return txnCache;
  }

  try {
    const parsed = Array.isArray(window.txnHydratedStartupTransactions)
      ? window.txnHydratedStartupTransactions
      : JSON.parse(localStorage.getItem(TXN_STORAGE_KEY) || "[]");

    delete window.txnHydratedStartupTransactions;
    const snapshots = txnLoadAISnapshots();
    let snapshotsChanged = false;

    txnCache = Array.isArray(parsed)
      ? parsed.map((savedTxn) => {
          const txn = { ...savedTxn };

          txn.documents = Array.isArray(txn.documents) ? txn.documents : [];

          txn.checklist =
            txn.checklist && typeof txn.checklist === "object"
              ? txn.checklist
              : typeof txnDefaultChecklist === "function"
                ? txnDefaultChecklist(txn, {})
                : {};

          /*
           * Legacy Transaction Intelligence must never return.
           */
          delete txn.aiTransactionIntelligence;

          /*
           * Preserve manual automation tasks during startup.
           * AI automation is rebuilt when the transaction changes.
           */
          txn.automationTasks = Array.isArray(txn.automationTasks)
            ? txn.automationTasks.filter(
                (task) => task && task.source === "Manual",
              )
            : [];

          const transactionId = String(txn.id || "");
          const currentFingerprint = txnBuildAISourceFingerprint(txn);
          const savedSnapshot = snapshots[transactionId];

          const snapshotIsCurrent =
            savedSnapshot &&
            savedSnapshot.fingerprint === currentFingerprint &&
            savedSnapshot.transactionBrain &&
            typeof savedSnapshot.transactionBrain === "object" &&
            Number(savedSnapshot.transactionBrain.engineVersion || 0) ===
              Number(AI_TRANSACTION_BRAIN_VERSION || 0);

          /*
           * Nothing relevant changed:
           * restore the previously completed intelligence immediately.
           */
          if (snapshotIsCurrent) {
            txn.transactionBrain = savedSnapshot.transactionBrain;

            txn.aiCoordinator =
              savedSnapshot.aiCoordinator &&
              typeof savedSnapshot.aiCoordinator === "object"
                ? savedSnapshot.aiCoordinator
                : null;

            txn.checklistCompleted = savedSnapshot.checklistCompleted ?? null;

            txn.aiTransactionState =
              txn.transactionBrain?.decision?.state ||
              txn.transactionBrain?.transactionState ||
              "Unknown";

            txn.derivedStatus = txn.aiTransactionState;

            return txn;
          }

          /*
           * Something changed, or no snapshot exists:
           * rebuild only this transaction.
           */
          delete txn.transactionBrain;
          delete txn.aiCoordinator;
          delete txn.aiTransactionState;
          delete txn.derivedStatus;

          let refreshedTxn =
            typeof txnApplyAutomation === "function"
              ? txnApplyAutomation(txn)
              : txn;

          if (typeof aiRefreshTransaction === "function") {
            try {
              refreshedTxn = aiRefreshTransaction(refreshedTxn) || refreshedTxn;
            } catch (aiError) {
              console.error(
                "AI refresh failed. Keeping transaction data intact:",
                aiError,
              );

              refreshedTxn = txn;
            }
          }

          if (
            transactionId &&
            refreshedTxn.transactionBrain &&
            typeof refreshedTxn.transactionBrain === "object"
          ) {
            snapshots[transactionId] = txnCreateAISnapshot(refreshedTxn);
            snapshotsChanged = true;
          }

          return refreshedTxn;
        })
      : [];

    if (snapshotsChanged) {
      txnSaveAISnapshots(snapshots);
    }
  } catch (error) {
    console.error("Unable to load transactions:", error);
    txnCache = [];
  }

  txnCacheInitialized = true;
  return txnCache;
}

function txnSaveAll() {
  /*
  -------------------------------------------------------
  Save only durable transaction data.

  Generated AI conclusions are rebuilt whenever transactions
  load. They must not be written into browser storage.

  This prevents circular references, oversized snapshots,
  stale Brain conclusions, and inconsistent document saves.
  -------------------------------------------------------
  */

  try {
    const isObject = (value) =>
      value !== null && typeof value === "object" && !Array.isArray(value);

    const resolveSavedAnalysis = (doc = {}) => {
      const candidates = [
        doc.aiAnalysis,
        doc.aiAnalysis?.analysis,

        doc.universalAnalysis,
        doc.universalAnalysis?.analysis,

        doc.ai,
        doc.ai?.analysis,

        doc.analysis,
        doc.analysis?.analysis,

        doc.documentAnalysis,
        doc.documentAnalysis?.analysis,
      ].filter(isObject);

      const scoreAnalysis = (analysis) => {
        let score = Object.keys(analysis).length;

        if (analysis.documentType) score += 25;
        if (Array.isArray(analysis.documentTypes)) score += 20;
        if (analysis.execution && isObject(analysis.execution)) score += 50;
        if (analysis.classification && isObject(analysis.classification))
          score += 50;
        if (analysis.facts && isObject(analysis.facts)) score += 75;
        if (Array.isArray(analysis.evidence)) score += 100;
        if (Array.isArray(analysis.evidence?.items)) score += 100;
        if (Array.isArray(analysis.transactionEvents)) score += 125;
        if (analysis.semanticEffects && isObject(analysis.semanticEffects)) {
          score += 150;
        }

        if (
          analysis.universalAnalysis &&
          isObject(analysis.universalAnalysis)
        ) {
          score += 200;
        }

        return score;
      };

      return (
        candidates
          .map((candidate, index) => ({
            candidate,
            index,
            score: scoreAnalysis(candidate),
          }))
          .sort((left, right) => {
            if (right.score !== left.score) {
              return right.score - left.score;
            }

            return left.index - right.index;
          })[0]?.candidate || null
      );
    };

    const storageSafeTransactions = txnCache.map((sourceTxn) => {
      const txn = sourceTxn && typeof sourceTxn === "object" ? sourceTxn : {};

      /*
       * Remove generated and transient AI objects before saving.
       *
       * These objects may contain Maps, class instances, ledgers,
       * circular references, or stale conclusions.
       */
      const {
        transactionBrain,
        aiCoordinator,
        aiTransactionIntelligence,
        aiTransactionState,
        derivedStatus,

        health,
        transactionHealth,
        healthScore,

        confidence,
        closingConfidence,
        closingProbability,

        completion,
        progress,

        alerts,
        priorities,
        recommendations,
        missingItems,
        missingDocuments,
        missingFields,
        reasoning,

        ...durableTransaction
      } = txn;

      const safeDocuments = Array.isArray(txn.documents)
        ? txn.documents
            .filter(
              (doc) => doc && typeof doc === "object" && !Array.isArray(doc),
            )
            .map((doc) => {
              const authoritativeAnalysis = resolveSavedAnalysis(doc);

              return {
                id: doc.id || null,

                name: doc.name || "Uploaded Document",

                type: doc.type || "file",

                mimeType: doc.mimeType || doc.fileType || "",

                size: Number(doc.size || 0),

                uploadedAt: doc.uploadedAt || "",

                storage:
                  "AI analysis retained - original file not stored in browser",

                /*
                 * Large source-file content is deliberately not
                 * stored in localStorage.
                 */
                data: "",
                text: "",
                extractedText: "",
                ocrText: "",

                /*
                 * Preserve extraction metadata needed for auditing
                 * and document display.
                 */
                extraction:
                  doc.extraction && typeof doc.extraction === "object"
                    ? {
                        method: doc.extraction.method || "unknown",

                        pages: Number(doc.extraction.pages || 0),

                        warnings: Array.isArray(doc.extraction.warnings)
                          ? [...doc.extraction.warnings]
                          : [],

                        extractedAt: doc.extraction.extractedAt || "",
                      }
                    : {
                        method: "unknown",
                        pages: 0,
                        warnings: [],
                        extractedAt: "",
                      },

                /*
                 * Save one authoritative document-analysis object.
                 *
                 * aiAnalyzeTransaction() will restore compatibility
                 * aliases when the transaction loads.
                 */
                aiAnalysis:
                  doc.analysisStoredInRepository === true
                    ? null
                    : authoritativeAnalysis,

                analysisStoredInRepository:
                  doc.analysisStoredInRepository === true,

                engineVersion: Number(doc.engineVersion || 0),

                schemaVersion: doc.schemaVersion ?? null,

                lastAnalyzed: doc.lastAnalyzed || "",

                analysisStatus: doc.analysisStatus || "",

                analysisError: doc.analysisError || null,
              };
            })
        : [];

      return {
        ...durableTransaction,

        documents: safeDocuments,

        /*
         * Document reviews may be retained for display and audit,
         * but must remain plain JSON data.
         */
        aiDocumentReviews: [],
        /*
         * Generated checklist percentage will be recalculated.
         */
        checklistCompleted: undefined,
      };
    });

    console.log(
      "Largest transaction before save",
      storageSafeTransactions
        .map((txn) => ({
          address: txn.address,
          brain: new Blob([JSON.stringify(txn.transactionBrain || {})]).size,
          coordinator: new Blob([JSON.stringify(txn.aiCoordinator || {})]).size,
          total: new Blob([JSON.stringify(txn)]).size,
        }))
        .sort((a, b) => b.total - a.total),
    );

    localStorage.setItem(
      TXN_STORAGE_KEY,
      JSON.stringify(storageSafeTransactions),
    );

    return true;
  } catch (error) {
    console.error("Unable to save transactions:", error);

    alert(
      "RapportLink could not save the transactions. Browser storage may be full.",
    );

    return false;
  }
}

function txnDefaultChecklist(txn = {}, existing = {}) {
  if (
    txn &&
    !txn.side &&
    !txn.transactionType &&
    typeof txn === "object" &&
    !Array.isArray(txn)
  ) {
    existing = txn;
    txn = {
      side: document.getElementById("txnSide")?.value || "Buyer Purchase",
    };
  }

  const checklist = {};

  txnWorkflowItems(txn).forEach((item) => {
    checklist[item] = !!existing[item];
  });

  return checklist;
}

function txnAddDays(dateValue, offset) {
  if (!dateValue) return "";
  const d = new Date(`${dateValue}T00:00:00`);
  if (isNaN(d.getTime())) return "";
  d.setDate(d.getDate() + Number(offset || 0));
  return d.toISOString().slice(0, 10);
}

function txnAutomationId(txnId, title, due) {
  return `auto_${txnId}_${String(title || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")}_${due || "nodate"}`;
}

function txnDocKeywordFound(txn = {}, keyword = "") {
  const docs = Array.isArray(txn.documents) ? txn.documents : [];
  const haystack = docs
    .map((d) => String(d.name || "").toLowerCase())
    .join(" ");
  return String(keyword || "")
    .split("|")
    .some((k) => k && haystack.includes(k.toLowerCase()));
}

function txnBuildAutomationTasks(txn = {}) {
  if (txn.automationEnabled === false) return [];

  const checklist = txnDefaultChecklist(txn.checklist || {});

  const existingAuto = Array.isArray(txn.automationTasks)
    ? txn.automationTasks
    : [];

  const existingDoneMap = {};

  existingAuto.forEach((task) => {
    existingDoneMap[String(task.id)] = !!task.done;
  });

  const tasks = [];

  const automationState =
    txn.transactionBrain?.transactionState ||
    txn.aiCoordinator?.transactionState ||
    "";

  if (automationState === "Cancelled" || automationState === "Closed") {
    return [];
  }

  const canonicalFacts =
    txn?.transactionBrain?.canonicalFacts &&
    typeof txn.transactionBrain.canonicalFacts === "object"
      ? txn.transactionBrain.canonicalFacts
      : {};

  /*
  --------------------------------------------------------
  AUTHORITATIVE TRANSACTION DATES

  All AI automation must use Transaction Brain dates.
  Legacy transaction fields must not override Brain dates.
  --------------------------------------------------------
  */

  const authoritativeDates = {
    contractDate: canonicalFacts.effectiveDate || "",

    emdDue:
      canonicalFacts.earnestMoneyDeadline || canonicalFacts.emdDeadline || "",

    inspectionDate:
      canonicalFacts.inspectionDeadline || canonicalFacts.inspectionDate || "",

    appraisalDate:
      canonicalFacts.appraisalDeadline || canonicalFacts.appraisalDate || "",

    loanDate:
      canonicalFacts.financingDeadline || canonicalFacts.loanDeadline || "",

    walkthroughDate:
      canonicalFacts.walkthroughDate ||
      canonicalFacts.finalWalkthroughDate ||
      "",

    closeDate:
      canonicalFacts.actualClosingDate || canonicalFacts.closingDate || "",
  };

  /*
  --------------------------------------------------------
  WORKFLOW / TRANSACTION TASKS
  --------------------------------------------------------
  */

  TXN_AUTOMATION_RULES.forEach((rule) => {
    if (rule.checklist && checklist[rule.checklist]) {
      return;
    }

    if (txn.autoCreateDates === false) {
      return;
    }

    /*
     * Use the authoritative Brain date associated with
     * this automation rule.
     *
     * Legacy txn fields are allowed only as compatibility
     * fallback when no Brain date exists for that field.
     */

    const sourceDate = authoritativeDates[rule.field] || txn[rule.field] || "";

    const due = txnAddDays(sourceDate, rule.offset || 0);

    if (!due) {
      return;
    }

    const id = txnAutomationId(txn.id || "new", rule.title, due);

    tasks.push({
      id,
      title: rule.title,
      due,
      priority: rule.priority || "Normal",
      category: rule.category || "Transaction",
      source: "AI Automation",
      done: !!existingDoneMap[id],
    });
  });

  /*
  --------------------------------------------------------
  REQUIRED DOCUMENT WATCH

  Document-watch tasks must use the deadline logically
  associated with the document.

  Never put every missing document on the effective date
  or closing date merely because another date is absent.
  --------------------------------------------------------
  */

  const transactionState =
    txn.transactionBrain?.transactionState ||
    txn.aiCoordinator?.transactionState ||
    "";

  if (
    txn.autoCreateDocs !== false &&
    (transactionState === "Active" || transactionState === "Pending")
  ) {
    TXN_REQUIRED_DOC_RULES.forEach((rule) => {
      if (txnDocKeywordFound(txn, rule.keyword)) {
        return;
      }

      const title = String(rule.title || "")
        .trim()
        .toLowerCase();

      let due = "";

      /*
       * Inspection documents belong to the inspection
       * contingency deadline.
       */
      if (title.includes("inspection")) {
        due = authoritativeDates.inspectionDate || "";
      } else if (title.includes("appraisal")) {
        /*
         * Appraisal documents belong to the appraisal
         * contingency deadline.
         */
        due = authoritativeDates.appraisalDate || "";
      } else if (
        /*
         * Financing / loan documents belong to the
         * financing contingency deadline.
         */
        title.includes("loan") ||
        title.includes("financing") ||
        title.includes("lender")
      ) {
        due = authoritativeDates.loanDate || "";
      } else if (
        /*
         * Closing / settlement documents belong to
         * the authoritative closing date.
         */
        title.includes("closing statement") ||
        title.includes("settlement statement") ||
        title.includes("closing disclosure") ||
        title.includes("hud") ||
        title.includes("alta")
      ) {
        due = authoritativeDates.closeDate || "";
      } else if (title.includes("earnest") || title.includes("deposit")) {
        /*
         * Earnest-money documents belong to the EMD
         * deadline only when the Brain has established one.
         */
        due = authoritativeDates.emdDue || "";
      } else if (
        /*
         * Final-walkthrough documents/tasks belong to the
         * walkthrough date only when established.
         */
        title.includes("walkthrough") ||
        title.includes("walk-through") ||
        title.includes("final walk")
      ) {
        due = authoritativeDates.walkthroughDate || "";
      }

      /*
       * Do not invent a date for an unmatched required
       * document.
       */
      if (!due) {
        return;
      }

      const id = txnAutomationId(txn.id || "new", rule.title, due);

      tasks.push({
        id,
        title: rule.title,
        due,
        priority: rule.priority || "Normal",
        category: "Documents",
        source: "AI Document Watch",
        done: !!existingDoneMap[id],
      });
    });
  }

  /*
  --------------------------------------------------------
  SORT
  --------------------------------------------------------
  */

  return tasks.sort((a, b) => {
    const priorityWeight = {
      High: 3,
      Normal: 2,
      Low: 1,
    };

    const da = a.due || "9999-12-31";
    const db = b.due || "9999-12-31";

    return (
      da.localeCompare(db) ||
      (priorityWeight[b.priority] || 0) - (priorityWeight[a.priority] || 0)
    );
  });
}

function txnApplyAutomation(txn = {}) {
  const prior = Array.isArray(txn.automationTasks) ? txn.automationTasks : [];
  const manual = prior.filter((task) => task && task.source === "Manual");
  txn.automationTasks = [...txnBuildAutomationTasks(txn), ...manual];
  return txn;
}

function txnAutomationSummary(txn = {}) {
  const tasks = Array.isArray(txn.automationTasks)
    ? txn.automationTasks
    : txnBuildAutomationTasks(txn);
  const open = tasks.filter((t) => !t.done);
  const high = open.filter((t) => t.priority === "High");
  const overdue = open.filter((t) => t.due && txnDaysUntil(t.due) < 0);
  return {
    total: tasks.length,
    open: open.length,
    high: high.length,
    overdue: overdue.length,
    tasks,
  };
}

function txnRenderAutomationPreview() {
  const el = document.getElementById("txnAutomationPreview");
  if (!el) return;
  const temp = txnReadTransactionForm(false);
  temp.automationTasks = txnBuildAutomationTasks(temp);
  const summary = txnAutomationSummary(temp);
  if (!temp.automationEnabled) {
    el.innerHTML =
      '<div class="small-muted">Automation is turned off for this transaction.</div>';
    return;
  }
  if (!summary.open) {
    el.innerHTML =
      '<div class="small-muted">No automation items yet. Add dates/documents or save the transaction.</div>';
    return;
  }
  el.innerHTML =
    `<div class="small-muted mb-2">Preview: ${summary.open} open automated action item(s), ${summary.high} high priority.</div>` +
    summary.tasks
      .filter((t) => !t.done)
      .slice(0, 5)
      .map(
        (t) => `
    <span class="automation-pill ${String(t.priority || "Normal").toLowerCase()}">${txnSafe(t.priority)} • ${txnSafe(t.title)}${t.due ? " • " + txnDate(t.due) : ""}</span>
  `,
      )
      .join("");
}

function txnRenderAutomationTasks(txn = {}) {
  const tasks = Array.isArray(txn.automationTasks)
    ? txn.automationTasks
    : txnBuildAutomationTasks(txn);
  const openTasks = tasks.filter((t) => !t.done);
  if (!tasks.length)
    return '<div class="small-muted">No automated transaction tasks yet.</div>';
  return (
    tasks
      .map(
        (task) => `
    <div class="transaction-auto-task ${task.done ? "done" : ""} ${String(task.priority || "Normal").toLowerCase()}" >
      <div class="d-flex justify-content-between align-items-start gap-2">
        <div>
          <b>${task.done ? "✅" : "☐"} ${txnSafe(task.title)}</b><br>
          <small>${txnSafe(task.category || "Transaction")} • Due: ${txnDate(task.due) || "No due date"} • ${txnSafe(task.source || "AI Automation")}</small>
        </div>
        <div class="text-end">
          <span class="automation-pill ${String(task.priority || "Normal").toLowerCase()}">${txnSafe(task.priority || "Normal")}</span><br>
          <button class="btn btn-sm btn-outline-primary mt-2" onclick="txnToggleAutomationTask('${txn.id}','${task.id}')">${task.done ? "Reopen" : "Done"}</button>
        </div>
      </div>
    </div>
  `,
      )
      .join("") +
    (openTasks.length
      ? ""
      : '<div class="small-muted">All automated action items are complete.</div>')
  );
}

function txnPartyRoleOptions(selected = "") {
  const roles = [
    "Buyer Spouse / Co-Buyer",
    "Seller Spouse / Co-Seller",
    "Additional Buyer",
    "Additional Seller",
    "Trust / Entity",
    "Trust Signer",
    "Lender / Loan Officer",
    "Title / Escrow Officer",
    "Home Inspector",
    "Other Inspector",
    "Cooperating Agent",
    "Appraiser",
    "HOA Contact",
    "Attorney",
    "Other",
  ];

  return roles
    .map(
      (role) =>
        `<option ${role === selected ? "selected" : ""}>${txnSafe(role)}</option>`,
    )
    .join("");
}

function txnContactSelectOptions(selectedId = "") {
  const contacts = Array.isArray(contactsCache) ? contactsCache : [];

  return ['<option value="">No linked contact</option>']
    .concat(
      contacts
        .slice()
        .sort((a, b) => contactName(a).localeCompare(contactName(b)))
        .map(
          (c) =>
            `<option value="${String(c.id)}" ${String(c.id) === String(selectedId) ? "selected" : ""}>${txnSafe(txnContactDisplay(c))}</option>`,
        ),
    )
    .join("");
}

function txnRenderPartiesEditor(parties = []) {
  const el = document.getElementById("txnPartiesEditor");
  if (!el) return;

  const list = Array.isArray(parties) ? parties : [];

  if (!list.length) {
    el.innerHTML =
      '<div class="small-muted">No additional parties or vendors added yet.</div>';
    return;
  }

  el.innerHTML = list
    .map((party, index) => {
      const rowId = party.id || `party_${Date.now()}_${index}`;

      return `
        <div class="transaction-party-link-card mb-3" data-txn-party-row="${rowId}">
          <div class="d-flex justify-content-between align-items-center gap-2 flex-wrap mb-2">
            <div class="feature-title mb-0">Party / Vendor</div>
            <button type="button" class="btn btn-sm btn-outline-danger" onclick="txnRemoveParty('${rowId}')">
              Remove
            </button>
          </div>

          <input type="hidden" data-party-field="id" value="${txnSafe(rowId)}">

          <div class="transaction-form-grid">
            <div>
              <label class="form-label small fw-bold">Role</label>
              <select class="form-control" data-party-field="role">
                ${txnPartyRoleOptions(party.role || "")}
              </select>
            </div>

            <div>
              <label class="form-label small fw-bold">Linked Contact</label>
              <select class="form-control" data-party-field="contactId" onchange="txnAttachContactToPartyRow('${rowId}')">
                ${txnContactSelectOptions(party.contactId || "")}
              </select>
            </div>

            <div>
              <label class="form-label small fw-bold">Name</label>
              <input class="form-control" data-party-field="name" value="${txnSafe(party.name || "")}" placeholder="Person name">
            </div>

            <div>
              <label class="form-label small fw-bold">Company / Entity</label>
              <input class="form-control" data-party-field="company" value="${txnSafe(party.company || "")}" placeholder="Company, trust, brokerage, etc.">
            </div>

            <div>
              <label class="form-label small fw-bold">Email</label>
              <input class="form-control" data-party-field="email" value="${txnSafe(party.email || "")}" placeholder="email@example.com">
            </div>

            <div>
              <label class="form-label small fw-bold">Phone</label>
              <input class="form-control" data-party-field="phone" value="${txnSafe(party.phone || "")}" placeholder="(775) 555-1234">
            </div>

            <div class="wide-2">
              <label class="form-label small fw-bold">Notes</label>
              <input class="form-control" data-party-field="notes" value="${txnSafe(party.notes || "")}" placeholder="Signer, spouse, trust role, inspection type, etc.">
            </div>
          </div>

          <div class="mt-2">
            <button type="button" class="btn btn-sm btn-outline-primary" onclick="txnCreateContactFromPartyRow('${rowId}')">
              Create / Link Contact
            </button>
          </div>
        </div>
      `;
    })
    .join("");
}

function txnAddParty() {
  const parties = txnReadPartiesEditor();

  parties.push({
    id: `party_${Date.now()}`,
    role: "Other",
    contactId: "",
    name: "",
    company: "",
    email: "",
    phone: "",
    notes: "",
  });

  txnRenderPartiesEditor(parties);
}

function txnRemoveParty(rowId) {
  const parties = txnReadPartiesEditor().filter(
    (p) => String(p.id) !== String(rowId),
  );

  txnRenderPartiesEditor(parties);
}

function txnReadPartiesEditor() {
  const rows = Array.from(document.querySelectorAll("[data-txn-party-row]"));

  return rows.map((row) => {
    const get = (field) =>
      row.querySelector(`[data-party-field="${field}"]`)?.value.trim() || "";

    return {
      id: get("id") || `party_${Date.now()}`,
      role: get("role"),
      contactId: get("contactId"),
      name: get("name"),
      company: get("company"),
      email: get("email"),
      phone: get("phone"),
      notes: get("notes"),
    };
  });
}

function txnAttachContactToPartyRow(rowId) {
  const row = document.querySelector(`[data-txn-party-row="${rowId}"]`);
  if (!row) return;

  const contactId =
    row.querySelector('[data-party-field="contactId"]')?.value || "";
  const contact = (contactsCache || []).find(
    (c) => String(c.id) === String(contactId),
  );

  if (!contact) return;

  const nameEl = row.querySelector('[data-party-field="name"]');
  const emailEl = row.querySelector('[data-party-field="email"]');
  const phoneEl = row.querySelector('[data-party-field="phone"]');

  if (nameEl) nameEl.value = contactName(contact);
  if (emailEl) emailEl.value = contact.email || "";
  if (phoneEl) phoneEl.value = formatPhone(contact.phone || "");
}

async function txnCreateContactFromPartyRow(rowId) {
  const row = document.querySelector(`[data-txn-party-row="${rowId}"]`);
  if (!row) return;

  const get = (field) =>
    row.querySelector(`[data-party-field="${field}"]`)?.value.trim() || "";

  const name = get("name");
  const email = get("email");
  const phone = get("phone");
  const role = get("role");
  const company = get("company");

  if (!name && !email && !phone && !company) {
    alert("Enter a name, company, email, or phone first.");
    return;
  }

  const existing = (contactsCache || []).find(
    (c) =>
      (email && String(c.email || "").toLowerCase() === email.toLowerCase()) ||
      (phone &&
        String(c.phone || "").replace(/\D/g, "") === phone.replace(/\D/g, "")),
  );

  if (existing) {
    row.querySelector('[data-party-field="contactId"]').value = existing.id;
    alert(`${contactName(existing)} is now linked.`);
    return;
  }

  const displayName = name || company;
  const parts = displayName.split(/\s+/).filter(Boolean);
  const firstName = parts.shift() || displayName;
  const lastName = parts.join(" ");

  const payload = {
    firstName,
    lastName,
    email,
    phone,
    company,
    type: role || "Transaction Contact",
    stage: "Transaction Contact",
    tags: ["Transaction", role || "Party"],
  };

  const res = await fetch("/api/contacts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const data = await res.json().catch(() => ({}));

  if (!data.success || !data.contact) {
    alert("Contact could not be created.");
    return;
  }

  await loadContacts();

  row.querySelector('[data-party-field="contactId"]').value = data.contact.id;

  txnRenderPartySelectors();

  alert(`${contactName(data.contact)} was created and linked.`);
}

function txnReadTransactionForm(requireAddress = true) {
  const id = document.getElementById("txnId")?.value || String(Date.now());
  const price = Number(document.getElementById("txnPrice")?.value || 0);
  const pct = Number(
    document.getElementById("txnCommissionPercent")?.value || 0,
  );
  const manualGci = Number(document.getElementById("txnGci")?.value || 0);

  return {
    id,
    address: document.getElementById("txnAddress")?.value.trim() || "",
    side: document.getElementById("txnSide")?.value || "Buyer",
    status: document.getElementById("txnStatus")?.value || "Active",
    price,
    commissionPercent: pct,
    gci: manualGci || Math.round(price * (pct / 100)),
    agent: document.getElementById("txnAgent")?.value.trim() || "",
    mls: document.getElementById("txnMls")?.value.trim() || "",

    buyerContactId: document.getElementById("txnBuyerContactId")?.value || "",
    sellerContactId: document.getElementById("txnSellerContactId")?.value || "",

    buyer: document.getElementById("txnBuyer")?.value.trim() || "",
    buyerEmail: document.getElementById("txnBuyerEmail")?.value.trim() || "",
    buyerPhone: document.getElementById("txnBuyerPhone")?.value.trim() || "",

    seller: document.getElementById("txnSeller")?.value.trim() || "",
    sellerEmail: document.getElementById("txnSellerEmail")?.value.trim() || "",
    sellerPhone: document.getElementById("txnSellerPhone")?.value.trim() || "",

    lender: document.getElementById("txnLender")?.value.trim() || "",
    lenderContactId: document.getElementById("txnLenderContactId")?.value || "",

    titleCompany:
      document.getElementById("txnTitleCompany")?.value.trim() || "",
    titleContactId: document.getElementById("txnTitleContactId")?.value || "",

    contractDate: document.getElementById("txnContractDate")?.value || "",
    emdDue: document.getElementById("txnEmdDue")?.value || "",
    inspectionDate: document.getElementById("txnInspectionDate")?.value || "",
    appraisalDate: document.getElementById("txnAppraisalDate")?.value || "",
    loanDate: document.getElementById("txnLoanDate")?.value || "",
    walkthroughDate: document.getElementById("txnWalkthroughDate")?.value || "",
    closeDate: document.getElementById("txnCloseDate")?.value || "",

    risk: document.getElementById("txnRisk")?.value || "Normal",
    notes: document.getElementById("txnNotes")?.value.trim() || "",

    checklist: txnReadChecklistEditor(),
    documents: txnWorkingDocs,
    parties:
      typeof txnReadPartiesEditor === "function" ? txnReadPartiesEditor() : [],

    automationEnabled:
      document.getElementById("txnAutomationEnabled")?.checked !== false,
    autoCreateDates:
      document.getElementById("txnAutoCreateDates")?.checked !== false,
    autoCreateDocs:
      document.getElementById("txnAutoCreateDocs")?.checked !== false,
  };
}

function txnProgress(txn = {}) {
  const checklist = txnDefaultChecklist(txn, txn.checklist || {});
  const total = Object.keys(checklist).length;

  if (!total) return 0;

  const done = Object.values(checklist).filter(Boolean).length;
  return Math.round((done / total) * 100);
}

function txnGci(txn = {}) {
  const brainFacts =
    txn?.transactionBrain?.canonicalFacts &&
    typeof txn.transactionBrain.canonicalFacts === "object"
      ? txn.transactionBrain.canonicalFacts
      : {};

  const brainPrice = Number(brainFacts.purchasePrice);
  const brainPct = Number(brainFacts.commissionPercent);

  if (
    Number.isFinite(brainPrice) &&
    brainPrice > 0 &&
    Number.isFinite(brainPct) &&
    brainPct > 0
  ) {
    return brainPrice * (brainPct / 100);
  }

  const manual = Number(txn.gci || 0);

  if (manual > 0) {
    return manual;
  }

  const price = Number(txn.price || 0);
  const pct = Number(txn.commissionPercent || 0);

  return price * (pct / 100);
}

function txnStatusClass(status = "") {
  const s = String(status).toLowerCase();
  if (s.includes("closed")) return "closed";
  if (s.includes("pending")) return "pending";
  if (s.includes("risk") || s.includes("cancel")) return "risk";
  return "active";
}

function txnIsActive(txn = {}) {
  const brain =
    txn?.transactionBrain && typeof txn.transactionBrain === "object"
      ? txn.transactionBrain
      : null;

  const transactionState =
    typeof brain?.transactionState === "string" &&
    brain.transactionState.trim() !== ""
      ? brain.transactionState.trim()
      : "Unknown";

  return !["Closed", "Cancelled", "Canceled", "Terminated"].includes(
    transactionState,
  );
}

function txnCriticalAlerts(txn = {}) {
  /*
   * Dashboard alerts must come only from current
   * Transaction Brain conclusions.
   *
   * Do not read persisted Coordinator priorities because
   * they may contain stale conclusions from older logic.
   */

  const brain =
    txn?.transactionBrain && typeof txn.transactionBrain === "object"
      ? txn.transactionBrain
      : {};

  const transactionState = String(brain.transactionState || "Unknown")
    .trim()
    .toLowerCase();

  const finalStates = [
    "closed",
    "cancelled",
    "canceled",
    "terminated",
    "archived",
  ];

  if (finalStates.includes(transactionState)) {
    return [];
  }

  const output = [];

  function addConclusion(item, defaultCategory = "Transaction Brain Priority") {
    if (!item) return;

    if (typeof item === "string") {
      const title = item.trim();

      if (!title) return;

      output.push({
        severity: "medium",
        title,
        text: title,
        category: defaultCategory,
        source: "Transaction Brain",
      });

      return;
    }

    if (typeof item !== "object") return;

    const title = String(
      item.title ||
        item.label ||
        item.message ||
        item.text ||
        item.description ||
        "",
    ).trim();

    if (!title) return;

    const rawSeverity = String(
      item.severity || item.priority || item.level || "medium",
    )
      .trim()
      .toLowerCase();

    let severity = "medium";

    if (
      rawSeverity === "high" ||
      rawSeverity === "critical" ||
      rawSeverity === "urgent"
    ) {
      severity = "high";
    } else if (rawSeverity === "good") {
      severity = "good";
    }

    output.push({
      severity,
      title,
      text: String(
        item.text || item.description || item.reason || item.message || title,
      ),
      category: String(item.category || item.type || defaultCategory),
      source: "Transaction Brain",
      evidence: Array.isArray(item.evidence) ? [...item.evidence] : [],
    });
  }

  const brainPriorities = Array.isArray(brain.priorities)
    ? brain.priorities
    : [];

  brainPriorities.forEach((item) =>
    addConclusion(item, "Transaction Brain Priority"),
  );

  if (output.length === 0) {
    const brainAlerts = Array.isArray(brain.alerts) ? brain.alerts : [];

    brainAlerts.forEach((item) =>
      addConclusion(item, "Transaction Brain Alert"),
    );
  }

  const seen = new Set();

  return output.filter((item) => {
    const key = `${item.severity}|${item.title}`.trim().toLowerCase();

    if (seen.has(key)) {
      return false;
    }

    seen.add(key);

    return true;
  });
}

function txnAllAlerts() {
  return txnCache
    .flatMap((txn) =>
      txnCriticalAlerts(txn).map((alert) => ({ ...alert, txn })),
    )
    .sort(
      (a, b) =>
        (({ high: 0, medium: 1, good: 2 })[a.severity] ?? 3) -
        ({ high: 0, medium: 1, good: 2 }[b.severity] ?? 3),
    );
}

function txnNewTransactionParty(party) {
  const prefix = party === "seller" ? "Seller" : "Buyer";

  const hidden = document.getElementById(`txn${prefix}ContactId`);
  const select = document.getElementById(`txn${prefix}ContactSelect`);
  const name = document.getElementById(`txn${prefix}`);
  const email = document.getElementById(`txn${prefix}Email`);
  const phone = document.getElementById(`txn${prefix}Phone`);

  if (hidden) hidden.value = "";
  if (select) select.value = "";
  if (name) name.value = "";
  if (email) email.value = "";
  if (phone) phone.value = "";

  if (name) name.focus();
}

async function txnCreateContactFromParty(party) {
  const prefix = party === "seller" ? "Seller" : "Buyer";
  const name = (document.getElementById(`txn${prefix}`)?.value || "").trim();
  const email = (
    document.getElementById(`txn${prefix}Email`)?.value || ""
  ).trim();
  const phone = (
    document.getElementById(`txn${prefix}Phone`)?.value || ""
  ).trim();
  if (!name && !email && !phone) {
    alert(`Enter a ${party} name, email, or phone first.`);
    return;
  }

  const existing = (contactsCache || []).find(
    (c) =>
      (email && String(c.email || "").toLowerCase() === email.toLowerCase()) ||
      (phone &&
        String(c.phone || "").replace(/\D/g, "") === phone.replace(/\D/g, "")),
  );

  if (existing) {
    document.getElementById(`txn${prefix}ContactId`).value = existing.id;
    document.getElementById(`txn${prefix}`).value = contactName(existing);
    document.getElementById(`txn${prefix}Email`).value =
      existing.email || email;
    document.getElementById(`txn${prefix}Phone`).value = formatPhone(
      existing.phone || phone,
    );
    txnRenderPartySelectors();
    alert(`${contactName(existing)} is now linked as the ${party}.`);
    return;
  }

  const parts = name.split(/\s+/).filter(Boolean);
  const firstName = parts.shift() || "";
  const lastName = parts.join(" ");
  const payload = {
    firstName,
    lastName,
    email,
    phone,
    type: party === "seller" ? "Seller" : "Buyer",
    stage: "Under Contract",
    tags: ["Transaction"],
  };

  const res = await fetch("/api/contacts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  if (!data.success || !data.contact) {
    alert("Contact could not be created.");
    return;
  }
  await loadContacts();
  document.getElementById(`txn${prefix}ContactId`).value = data.contact.id;
  document.getElementById(`txn${prefix}`).value = contactName(data.contact);
  document.getElementById(`txn${prefix}Email`).value =
    data.contact.email || email;
  document.getElementById(`txn${prefix}Phone`).value = formatPhone(
    data.contact.phone || phone,
  );
  txnRenderPartySelectors();
  renderContactTransactions();
  alert(`${contactName(data.contact)} was created and linked as the ${party}.`);
}

function txnTransactionsForContact(contact) {
  if (!contact) return [];
  if (typeof txnLoad === "function") txnLoad();

  const id = String(contact.id || "");
  const email = String(contact.email || "")
    .toLowerCase()
    .trim();
  const name = contactName(contact).toLowerCase().trim();

  return (txnCache || [])
    .filter((txn) => {
      const possibleIds = [
        txn.contactId,
        txn.clientContactId,
        txn.primaryContactId,
        txn.buyerContactId,
        txn.sellerContactId,
        ...(Array.isArray(txn.contactIds) ? txn.contactIds : []),
        ...(Array.isArray(txn.linkedContactIds) ? txn.linkedContactIds : []),
      ].map((v) => String(v || ""));

      if (id && possibleIds.includes(id)) return true;

      const possibleEmails = [
        txn.contactEmail,
        txn.clientEmail,
        txn.primaryEmail,
        txn.buyerEmail,
        txn.sellerEmail,
      ].map((v) =>
        String(v || "")
          .toLowerCase()
          .trim(),
      );

      if (email && possibleEmails.includes(email)) return true;

      const possibleNames = [
        txn.contactName,
        txn.clientName,
        txn.primaryName,
        txn.buyer,
        txn.seller,
      ].map((v) =>
        String(v || "")
          .toLowerCase()
          .trim(),
      );

      if (name && possibleNames.includes(name)) return true;

      return false;
    })
    .sort(
      (a, b) =>
        new Date(b.updatedAt || b.createdAt || 0) -
        new Date(a.updatedAt || a.createdAt || 0),
    );
}

function renderContactTransactions() {
  const el = document.getElementById("contactTransactionList");

  if (!el || !currentContact) {
    return;
  }

  const txns = txnTransactionsForContact(currentContact);

  if (!txns.length) {
    el.innerHTML =
      '<div class="small-muted">No transactions linked to this contact yet.</div>';

    return;
  }

  el.innerHTML = txns
    .map((txn) => {
      const isBuyer =
        String(txn.buyerContactId || "") === String(currentContact.id) ||
        String(txn.buyerEmail || "").toLowerCase() ===
          String(currentContact.email || "").toLowerCase() ||
        String(txn.buyer || "").toLowerCase() ===
          contactName(currentContact).toLowerCase();

      const role = isBuyer ? "Buyer" : "Seller";

      const transactionState =
        typeof txn?.transactionBrain?.transactionState === "string" &&
        txn.transactionBrain.transactionState.trim()
          ? txn.transactionBrain.transactionState.trim()
          : "Unknown";

      const alerts =
        typeof txnCriticalAlerts === "function"
          ? txnCriticalAlerts(txn).filter((alert) => alert.severity !== "good")
          : [];

      return `
        <div
          class="transaction-card"
          onclick="showTab('transactions'); setTimeout(()=>txnOpenPanel('${txn.id}'), 100);"
        >
          <div class="d-flex justify-content-between align-items-start gap-2">
            <div>
              <div class="transaction-card-title">
                ${txnSafe(
                  txn.address || txn.propertyAddress || "Untitled Transaction",
                )}
              </div>

              <small>
                ${role} • ${txnSafe(transactionState)} • Close:
                ${txnDate(txn.closeDate) || "Not set"}
              </small>
            </div>

            <div class="text-end">
              <span class="transaction-status-pill ${txnStatusClass(
                transactionState,
              )}">
                ${txnSafe(transactionState)}
              </span><br>

              <small>
                ${alerts.length ? alerts.length + " alert(s)" : "On track"}
              </small>
            </div>
          </div>
        </div>
      `;
    })
    .join("");
}

async function txnInit() {
  /*
   * Repository-backed document analyses must be restored
   * before transactions are loaded and the Transaction Brain
   * is rebuilt.
   */
  if (typeof txnHydrateStoredDocumentAnalyses === "function") {
    try {
      await txnHydrateStoredDocumentAnalyses();
    } catch (error) {
      console.error(
        "Stored document analysis hydration failed during startup:",
        error,
      );
    }
  }

  txnLoad();
  txnRenderPartySelectors();
  txnRenderChecklistEditor({});
  txnRenderAll();
}

function txnRenderAll() {
  txnLoad();
  txnRenderSummary();
  txnRenderAIAlerts();
  txnRenderBrokerReport();
  txnRenderList();
}

function txnSummaryStats() {
  const normalizedStatus = (txn = {}) =>
    String(txn?.transactionBrain?.transactionState || "Unknown")
      .trim()
      .toLowerCase();

  const closed = txnCache.filter((txn) => normalizedStatus(txn) === "closed");

  const cancelled = txnCache.filter((txn) =>
    ["cancelled", "canceled", "terminated"].includes(normalizedStatus(txn)),
  );

  const pending = txnCache.filter((txn) =>
    ["pending closing", "pending"].includes(normalizedStatus(txn)),
  );

  /*
   * Open includes every working transaction except files that
   * are Pending Closing, Closed, Cancelled, or Archived.
   */
  const open = txnCache.filter((txn) => {
    const status = normalizedStatus(txn);

    return ![
      "pending closing",
      "pending",
      "closed",
      "cancelled",
      "canceled",
      "terminated",
      "archived",
    ].includes(status);
  });

  const archived = txnCache.filter(
    (txn) => normalizedStatus(txn) === "archived",
  );

  /*
   * Needs Attention only evaluates current working files.
   * Closed, Cancelled, and Archived transactions should not
   * generate active-transaction alerts.
   */
  const workingTransactions = [...open, ...pending];

  const needsAttention = workingTransactions.filter((txn) => {
    const alerts =
      typeof txnCriticalAlerts === "function" ? txnCriticalAlerts(txn) : [];

    return (
      normalizedStatus(txn) === "at risk" ||
      String(txn.risk || "").toLowerCase() === "high risk" ||
      alerts.some((alert) => alert?.severity === "high")
    );
  });

  const activeGci = workingTransactions.reduce(
    (sum, txn) => sum + txnGci(txn),
    0,
  );

  const activeVolume = workingTransactions.reduce(
    (sum, txn) => sum + Number(txn.price || 0),
    0,
  );

  return {
    openCount: open.length,
    pendingCount: pending.length,
    needsAttentionCount: needsAttention.length,
    closedCount: closed.length,
    cancelledCount: cancelled.length,
    archivedCount: archived.length,
    allCount: txnCache.length,
    activeGci,
    activeVolume,
  };
}

function txnRenderSummary() {
  const el = document.getElementById("transactionSummaryGrid");
  if (!el) return;

  const s = txnSummaryStats();
  const selectedCategory = window.txnSelectedCategory || "open";

  const cards = [
    {
      category: "open",
      title: "Open",
      count: s.openCount,
      description: "Active working files",
      accent: "#00A143",
      background:
        "linear-gradient(135deg, rgba(0,161,67,.16), rgba(255,255,255,1) 62%)",
    },
    {
      category: "pending",
      title: "Pending",
      count: s.pendingCount,
      description: "Approaching closing",
      accent: "#042C49",
      background:
        "linear-gradient(135deg, rgba(4,44,73,.15), rgba(255,255,255,1) 62%)",
    },
    {
      category: "attention",
      title: "Needs Attention",
      count: s.needsAttentionCount,
      description: "AI-flagged files",
      accent: "#A8B2BD",
      background:
        "linear-gradient(135deg, rgba(168,178,189,.28), rgba(255,255,255,1) 62%)",
    },
    {
      category: "closed",
      title: "Closed",
      count: s.closedCount,
      description: "Completed transactions",
      accent: "#00A143",
      background:
        "linear-gradient(135deg, rgba(0,161,67,.16), rgba(255,255,255,1) 62%)",
    },
    {
      category: "cancelled",
      title: "Cancelled",
      count: s.cancelledCount,
      description: "Terminated transactions",
      accent: "#042C49",
      background:
        "linear-gradient(135deg, rgba(4,44,73,.15), rgba(255,255,255,1) 62%)",
    },
    {
      category: "all",
      title: "All Transactions",
      count: s.allCount,
      description: "Complete transaction history",
      accent: "#A8B2BD",
      background:
        "linear-gradient(135deg, rgba(168,178,189,.28), rgba(255,255,255,1) 62%)",
    },
  ];

  el.innerHTML = cards
    .map((card) => {
      const selected = selectedCategory === card.category;

      const restingTransform = selected
        ? "translateY(-6px) scale(1.05)"
        : "translateY(0) scale(1)";

      const restingShadow = selected
        ? "0 22px 48px rgba(4,44,73,.24)"
        : "0 10px 26px rgba(4,44,73,.09)";

      return `
        <div
          class="transaction-summary-card"
          onclick="txnSelectCategory('${card.category}')"
          style="
            position:relative;
            overflow:hidden;
            cursor:pointer;
            min-height:155px;
            padding:27px 28px;
            border-radius:22px;
            background:${card.background};
            border:${selected ? "3px" : "2px"} solid ${
              selected ? "#00A143" : card.accent
            };
            border-top:7px solid ${card.accent};
            box-shadow:${restingShadow};
            transform:${restingTransform};
            transition:transform .18s ease, box-shadow .18s ease, border-color .18s ease;
          "
          onmouseover="
            this.style.transform='translateY(-8px) scale(${
              selected ? "1.06" : "1.02"
            })';
            this.style.boxShadow='0 24px 50px rgba(4,44,73,.20)';
         "
          onmouseout="
            this.style.transform='${restingTransform}';
            this.style.boxShadow='${restingShadow}';
          "
        >

          <div
            style="
              padding-right:38px;
              font-size:14px;
              font-weight:850;
              letter-spacing:.04em;
              color:${card.accent === "#A8B2BD" ? "#52606D" : card.accent};
            "
          >
            ${card.title}
          </div>

          <div
            style="
              margin-top:10px;
              font-size:38px;
              line-height:1;
              font-weight:950;
              color:#042C49;
            "
          >
            ${card.count}
          </div>

          <div
            style="
              margin-top:12px;
              font-size:14px;
              font-weight:650;
              color:#6B7280;
            "
          >
            ${card.description}
          </div>
        </div>
      `;
    })
    .join("");
}

function txnSelectCategory(category = "open") {
  window.txnSelectedCategory = category;

  txnRenderSummary();
  txnRenderList();
}

function txnRenderAIAlerts() {
  const el = document.getElementById("transactionAIAlerts");

  if (!el) {
    return;
  }

  const finalStatuses = [
    "closed",
    "cancelled",
    "canceled",
    "terminated",
    "archived",
  ];

  const effectiveStatus = (txn = {}) =>
    String(txn?.transactionBrain?.transactionState || "Unknown")
      .trim()
      .toLowerCase();

  /*
   * Closed, Cancelled, Terminated, and Archived transactions
   * must never appear in Today's AI Priorities.
   *
   * Transaction state comes only from the Transaction Brain.
   */
  const alerts = txnAllAlerts()
    .filter((item) => {
      if (!item || item.severity === "good") {
        return false;
      }

      return !finalStatuses.includes(effectiveStatus(item.txn));
    })
    .slice(0, 4);

  if (!alerts.length) {
    el.innerHTML = `
      <div style="font-size:20px;font-weight:900;color:#042C49;margin-bottom:14px;">
        Today's AI Priorities
      </div>

      <div class="transaction-alert good">
        <b>Everything is on track.</b><br>
        <small>No urgent transaction issues right now.</small>
      </div>
    `;

    return;
  }

  el.innerHTML = `
    <div style="font-size:20px;font-weight:900;color:#042C49;margin-bottom:14px;">
      Today's AI Priorities
    </div>

    ${alerts
      .map(
        (item) => `
          <div
            class="transaction-alert ${item.severity}"
            onclick="txnOpenPanel('${item.txn.id}')"
            style="cursor:pointer;"
          >
            <b>${txnSafe(item.title)}</b><br>
            <small>${txnSafe(item.txn.address || "Transaction")}</small>
          </div>
        `,
      )
      .join("")}
  `;
}

function txnRenderBrokerReport() {
  const el = document.getElementById("transactionBrokerReport");
  if (!el) return;

  el.innerHTML = "";
}

function txnCardHtml(txn) {
  const brain =
    txn?.transactionBrain || txn?.aiTransactionBrain || txn?.brain || null;

  const canonicalFacts =
    brain?.canonicalFacts && typeof brain.canonicalFacts === "object"
      ? brain.canonicalFacts
      : {};

  const coordinator =
    txn?.aiCoordinator && typeof txn.aiCoordinator === "object"
      ? txn.aiCoordinator
      : {};

  const effectiveStatus =
    typeof aiTransactionState === "function"
      ? aiTransactionState(txn)
      : "Unknown";

  const status = String(effectiveStatus).trim().toLowerCase();

  const isClosed = status === "closed";

  const isCancelled =
    status === "cancelled" || status === "canceled" || status === "terminated";

  const validPercent = (value) =>
    typeof value === "number" &&
    Number.isFinite(value) &&
    value >= 0 &&
    value <= 100;

  const numericValue = (value) => {
    if (typeof value === "number") {
      return Number.isFinite(value) ? value : null;
    }

    if (typeof value !== "string") {
      return null;
    }

    const cleaned = value.replace(/[$,%\s,]/g, "");

    if (!cleaned) {
      return null;
    }

    const parsed = Number(cleaned);

    return Number.isFinite(parsed) ? parsed : null;
  };

  const firstPositiveNumber = (...values) => {
    for (const value of values) {
      const parsed = numericValue(value);

      if (parsed !== null && parsed > 0) {
        return parsed;
      }
    }

    return null;
  };

  const firstValidPercent = (...values) => {
    for (const value of values) {
      const parsed = numericValue(value);

      if (validPercent(parsed)) {
        return parsed;
      }
    }

    return null;
  };

  const brainProgress = firstValidPercent(
    brain?.transactionCompletion,
    brain?.completionPercentage,
    brain?.completion,
    brain?.progress,
    brain?.scores?.completion,
    coordinator?.transactionCompletion,
    coordinator?.completionPercentage,
    coordinator?.completion,
  );

  const storedProgress =
    typeof txnProgress === "function" ? txnProgress(txn) : null;

  const progress =
    brainProgress !== null
      ? Math.round(brainProgress)
      : validPercent(storedProgress)
        ? Math.round(storedProgress)
        : null;

  const authoritativeClosingDate =
    canonicalFacts.actualClosingDate || canonicalFacts.closingDate || "";

  const authoritativePurchasePrice = firstPositiveNumber(
    canonicalFacts.purchasePrice,
    canonicalFacts.listPrice,
    canonicalFacts.listingPrice,
  );

  const hasPurchasePrice =
    authoritativePurchasePrice !== null && authoritativePurchasePrice > 0;

  let authoritativeGci = firstPositiveNumber(
    brain?.finalGci,
    brain?.expectedGci,
    brain?.gci,
    brain?.financials?.finalGci,
    brain?.financials?.expectedGci,
    coordinator?.finalGci,
    coordinator?.expectedGci,
    coordinator?.gci,
  );

  if (
    authoritativeGci === null &&
    authoritativePurchasePrice &&
    typeof txnGci === "function"
  ) {
    authoritativeGci = firstPositiveNumber(
      txnGci({
        ...txn,
        price: authoritativePurchasePrice,
        purchasePrice: authoritativePurchasePrice,
      }),
    );
  }

  const closeDays = authoritativeClosingDate
    ? txnDaysUntil(authoritativeClosingDate)
    : 9999;

  const statusClass = txnStatusClass(effectiveStatus);

  const brainAlerts = Array.isArray(brain?.alerts) ? brain.alerts : [];
  const coordinatorAlerts = Array.isArray(coordinator?.alerts)
    ? coordinator.alerts
    : [];

  const brainPriorities = Array.isArray(brain?.priorities)
    ? brain.priorities
    : [];

  const coordinatorPriorities = Array.isArray(coordinator?.priorities)
    ? coordinator.priorities
    : [];

  const alerts =
    isClosed || isCancelled
      ? []
      : [...brainAlerts, ...coordinatorAlerts].filter(
          (alert) =>
            alert && String(alert?.severity || "").toLowerCase() !== "good",
        );

  const priorities =
    isClosed || isCancelled
      ? []
      : brainPriorities.length
        ? brainPriorities
        : coordinatorPriorities;

  const tasks =
    isClosed || isCancelled
      ? []
      : Array.isArray(brain?.tasks) && brain.tasks.length
        ? brain.tasks
        : Array.isArray(coordinator?.tasks) && coordinator.tasks.length
          ? coordinator.tasks
          : Array.isArray(txn?.automationTasks)
            ? txn.automationTasks
            : Array.isArray(txn?.tasks)
              ? txn.tasks
              : [];

  const nextAlert = alerts[0] || priorities[0] || null;

  const openTaskCount = tasks.filter(
    (task) =>
      task &&
      task.done !== true &&
      task.completed !== true &&
      String(task.status || "").toLowerCase() !== "completed" &&
      String(task.status || "").toLowerCase() !== "done",
  ).length;

  let timingText = "";

  if (isClosed) {
    if (closeDays !== 9999) {
      if (closeDays < 0) {
        timingText = ` • ${Math.abs(closeDays)} ${
          Math.abs(closeDays) === 1 ? "day since closing" : "days since closing"
        }`;
      } else if (closeDays === 0) {
        timingText = " • closed today";
      }
    }
  } else if (isCancelled) {
    timingText = " • transaction cancelled";
  } else if (closeDays !== 9999) {
    timingText =
      closeDays >= 0
        ? ` • ${closeDays} ${closeDays === 1 ? "day" : "days"} to close`
        : ` • ${Math.abs(closeDays)} ${
            Math.abs(closeDays) === 1 ? "day" : "days"
          } past close`;
  }

  const gciLabel = isClosed ? "Final GCI" : "GCI";

  const riskLevel = String(
    brain?.riskLevel ||
      brain?.risk?.level ||
      brain?.decision?.riskLevel ||
      coordinator?.riskLevel ||
      "",
  ).trim();

  const aiStatus = isClosed
    ? "Closed"
    : isCancelled
      ? "Cancelled"
      : riskLevel
        ? riskLevel
        : alerts.length
          ? `${alerts.length} Alert${alerts.length > 1 ? "s" : ""}`
          : priorities.length
            ? `${priorities.length} Priorit${
                priorities.length === 1 ? "y" : "ies"
              }`
            : "No current risk";

  const priceDisplay = hasPurchasePrice
    ? txnMoney(authoritativePurchasePrice)
    : "Not established";

  const gciDisplay =
    authoritativeGci !== null ? txnMoney(authoritativeGci) : "Not established";

  const expectedNetCommission = Number(brain?.commission?.userGrossCommission);

  const expectedNetCommissionDisplay =
    Number.isFinite(expectedNetCommission) && expectedNetCommission >= 0
      ? txnMoney(expectedNetCommission)
      : "Not established";

  const closingDateDisplay = authoritativeClosingDate
    ? txnDate(authoritativeClosingDate) || "Not established"
    : "Not established";

  const progressText =
    progress === null ? "Completion not established" : `${progress}% complete`;

  const alertTitle =
    typeof nextAlert === "string"
      ? nextAlert
      : nextAlert?.title || nextAlert?.message || nextAlert?.description || "";

  return `
    <div class="transaction-card" style="cursor:pointer;padding:22px;border-radius:18px;" onclick="txnOpenPanel('${txn.id}')">

      <div class="d-flex justify-content-between align-items-start gap-3 flex-wrap">

        <div style="min-width:260px;flex:1;">
          <div class="transaction-card-title" style="font-size:20px;font-weight:850;color:#042C49;margin-bottom:6px;">
            ${txnSafe(txn.address || "Untitled Transaction")}
          </div>

          <div class="small-muted">
            ${txnSafe(txn.side || "—")}
            ${txn.buyer ? ` • Buyer: ${txnSafe(txn.buyer)}` : ""}
            ${txn.seller ? ` • Seller: ${txnSafe(txn.seller)}` : ""}
          </div>
        </div>

        <div class="text-end">
          <span class="transaction-status-pill ${statusClass}">
            ${txnSafe(effectiveStatus)}
          </span>
        </div>

      </div>

      <div style="display:grid;grid-template-columns:repeat(4,minmax(140px,1fr));gap:14px;margin-top:18px;">

        <div>
          <div class="small-muted">${isClosed ? "Closed Date" : "Close Date"}</div>
          <b>${closingDateDisplay}</b>
        </div>

        <div>
          <div class="small-muted">Price</div>
          <b>${priceDisplay}</b>
        </div>

        <div>
          <div class="small-muted">${gciLabel}</div>
          <b>${gciDisplay}</b>
        </div>

        <div>
          <div class="small-muted">
          ${isClosed ? "Final Net Commission" : "Expected Net Commission"}
        </div>
        <b>${expectedNetCommissionDisplay}</b>
      </div>

        <div>
          <div class="small-muted">AI Status</div>
          <b>${txnSafe(aiStatus)}</b>
          <div class="small-muted">${openTaskCount} open task(s)</div>
        </div>

      </div>

      <div style="margin-top:18px;">
        <div class="transaction-progress-wrap">
          <div
            class="transaction-progress-fill"
            style="width:${progress === null ? 0 : progress}%"
          ></div>
        </div>

        <div class="small-muted mt-1">
          ${progressText}${timingText}
        </div>
      </div>

      ${
        alertTitle
          ? `
            <div style="margin-top:14px;">
              <span class="pipeline-warning-pill">
                ${txnSafe(alertTitle)}
              </span>
            </div>
          `
          : ""
      }

    </div>
  `;
}

function txnRenderList() {
  const el = document.getElementById("transactionList");
  if (!el) return;

  const search = String(document.getElementById("txnSearch")?.value || "")
    .trim()
    .toLowerCase();

  const statusFilter = document.getElementById("txnStatusFilter")?.value || "";

  const sideFilter = document.getElementById("txnSideFilter")?.value || "";

  const riskFilter = document.getElementById("txnRiskFilter")?.value || "";

  const selectedCategory = window.txnSelectedCategory || "open";

  const normalizedStatus = (txn = {}) =>
    String(txn?.transactionBrain?.transactionState || "Unknown")
      .trim()
      .toLowerCase();

  let list = [...txnCache];

  /*
   * Filter by the selected summary card.
   */
  if (selectedCategory === "open") {
    list = list.filter((txn) => {
      const status = normalizedStatus(txn);

      return ![
        "pending closing",
        "pending",
        "closed",
        "cancelled",
        "canceled",
        "terminated",
        "archived",
      ].includes(status);
    });
  }

  if (selectedCategory === "pending") {
    list = list.filter((txn) =>
      ["pending closing", "pending"].includes(normalizedStatus(txn)),
    );
  }

  if (selectedCategory === "attention") {
    list = list.filter((txn) => {
      const status = normalizedStatus(txn);

      if (
        ["closed", "cancelled", "canceled", "terminated", "archived"].includes(
          status,
        )
      ) {
        return false;
      }

      const alerts =
        typeof txnCriticalAlerts === "function" ? txnCriticalAlerts(txn) : [];

      return (
        status === "at risk" ||
        String(txn.risk || "").toLowerCase() === "high risk" ||
        alerts.some((alert) => alert?.severity === "high")
      );
    });
  }

  if (selectedCategory === "closed") {
    list = list.filter((txn) => normalizedStatus(txn) === "closed");
  }

  if (selectedCategory === "cancelled") {
    list = list.filter((txn) =>
      ["cancelled", "canceled", "terminated"].includes(normalizedStatus(txn)),
    );
  }

  /*
   * "All" intentionally keeps every transaction.
   */
  if (search) {
    list = list.filter((txn) => {
      const searchableText = [
        txn.address,
        txn.buyer,
        txn.seller,
        txn.agent,
        txn.otherAgent,
        txn.cooperatingAgent,
        txn.listingAgent,
        txn.buyerAgent,
        txn.lender,
        txn.lenderName,
        txn.titleCompany,
        txn.escrowCompany,
        txn.escrowOfficer,
        txn.mls,
        txn.status,
        txn.side,
        txn.buyerEmail,
        txn.sellerEmail,
        txn.buyerPhone,
        txn.sellerPhone,
        ...(Array.isArray(txn.parties)
          ? txn.parties.flatMap((party) => [
              party?.name,
              party?.role,
              party?.company,
              party?.email,
              party?.phone,
            ])
          : []),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return searchableText.includes(search);
    });
  }

  if (
    statusFilter &&
    String(statusFilter).trim() !== "" &&
    String(statusFilter) !== "All Statuses"
  ) {
    list = list.filter(
      (txn) =>
        normalizedStatus(txn) === String(statusFilter).trim().toLowerCase(),
    );
  }

  if (sideFilter) {
    list = list.filter((txn) => txn.side === sideFilter);
  }

  if (riskFilter) {
    list = list.filter((txn) => txn.risk === riskFilter);
  }

  list.sort((a, b) => {
    const severityRank = (txn) => {
      const status = normalizedStatus(txn);

      if (
        ["closed", "cancelled", "canceled", "terminated", "archived"].includes(
          status,
        )
      ) {
        return 3;
      }

      const alerts = txnCriticalAlerts(txn);

      if (alerts.some((alert) => alert.severity === "high")) {
        return 0;
      }

      if (alerts.some((alert) => alert.severity === "medium")) {
        return 1;
      }

      return 2;
    };

    return (
      severityRank(a) - severityRank(b) ||
      txnDaysUntil(a.closeDate) - txnDaysUntil(b.closeDate)
    );
  });

  if (list.length === 0) {
    const emptyMessages = {
      open: "No open transactions.",
      pending: "No transactions are currently pending closing.",
      attention: "No transactions currently need attention.",
      closed: "No closed transactions were found.",
      cancelled: "No cancelled transactions were found.",
      all: "No transactions were found.",
    };

    el.innerHTML = `
      <div class="modern-card text-muted">
        ${emptyMessages[selectedCategory] || "No transactions were found."}
      </div>
    `;

    return;
  }

  el.innerHTML = list.map((txn) => txnCardHtml(txn)).join("");
}

function txnSetTransactionCenterEditMode(isEditing) {
  const summary = document.getElementById("transactionSummaryGrid");
  const command = document.querySelector(".transaction-command-grid");
  const toolbar = document.querySelector("#transactionsTab .pipeline-toolbar");
  const list = document.getElementById("transactionList");

  if (summary) summary.style.display = isEditing ? "none" : "";
  if (command) command.style.display = isEditing ? "none" : "";
  if (toolbar) toolbar.style.display = isEditing ? "none" : "";
  if (list) list.style.display = isEditing ? "none" : "";
}

function txnStartNewChooser() {
  const chooser = document.getElementById("txnChooserCard");
  const form = document.getElementById("transactionFormCard");

  txnSetTransactionCenterEditMode(true);

  if (form) form.style.display = "none";
  if (chooser) {
    chooser.style.display = "block";
    chooser.scrollIntoView({ behavior: "smooth", block: "start" });
  }
}

function txnStartNewFromType(type) {
  const chooser = document.getElementById("txnChooserCard");
  if (chooser) chooser.style.display = "none";

  txnStartNew(type);
}

function txnCancelChooser() {
  const chooser = document.getElementById("txnChooserCard");
  if (chooser) chooser.style.display = "none";

  txnSetTransactionCenterEditMode(false);
}

function txnStartNew(type = "Buyer") {
  txnWorkingDocs = [];

  const summary = document.getElementById("transactionSummaryGrid");
  const command = document.querySelector(".transaction-command-grid");
  const toolbar = document.querySelector("#transactionsTab .pipeline-toolbar");
  const list = document.getElementById("transactionList");

  if (summary) summary.style.display = "none";
  if (command) command.style.display = "none";
  if (toolbar) toolbar.style.display = "none";
  if (list) list.style.display = "none";

  document.getElementById("transactionFormCard").style.display = "block";
  document.getElementById("transactionFormTitle").innerText = "New Transaction";

  [
    "txnId",
    "txnAddress",
    "txnPrice",
    "txnGci",
    "txnAgent",
    "txnMls",
    "txnBuyerContactId",
    "txnSellerContactId",
    "txnBuyer",
    "txnBuyerEmail",
    "txnBuyerPhone",
    "txnSeller",
    "txnSellerEmail",
    "txnSellerPhone",
    "txnLender",
    "txnTitleCompany",
    "txnContractDate",
    "txnEmdDue",
    "txnInspectionDate",
    "txnAppraisalDate",
    "txnLoanDate",
    "txnWalkthroughDate",
    "txnCloseDate",
    "txnNotes",
  ].forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.value = "";
  });

  if (document.getElementById("txnCommissionPercent"))
    document.getElementById("txnCommissionPercent").value = "2.5";

  if (document.getElementById("txnSide"))
    document.getElementById("txnSide").value = type;

  if (document.getElementById("txnStatus"))
    document.getElementById("txnStatus").value = "Active";

  if (document.getElementById("txnRisk"))
    document.getElementById("txnRisk").value = "Normal";

  ["txnAutomationEnabled", "txnAutoCreateDates", "txnAutoCreateDocs"].forEach(
    (id) => {
      const el = document.getElementById(id);
      if (el) el.checked = true;
    },
  );

  txnRenderPartySelectors();
  txnRenderChecklistEditor({});
  txnRenderDocumentList();

  if (typeof txnRenderPartiesEditor === "function") {
    txnRenderPartiesEditor([]);
  }

  txnRenderAutomationPreview();

  setTimeout(() => {
    if (typeof txnInitContactPickers === "function") {
      txnInitContactPickers();
    }
  }, 100);

  document.getElementById("transactionFormCard").scrollIntoView({
    behavior: "smooth",
    block: "start",
  });
}

function txnCancelEdit() {
  document.getElementById("transactionFormCard").style.display = "none";

  const summary = document.getElementById("transactionSummaryGrid");
  const command = document.querySelector(".transaction-command-grid");
  const toolbar = document.querySelector("#transactionsTab .pipeline-toolbar");
  const list = document.getElementById("transactionList");

  if (summary) summary.style.display = "";
  if (command) command.style.display = "";
  if (toolbar) toolbar.style.display = "";
  if (list) list.style.display = "";
}

function txnRenderChecklistEditor(checklist = {}) {
  const el = document.getElementById("txnChecklistEditor");
  if (!el) return;

  const txn = {
    side: document.getElementById("txnSide")?.value || "Buyer Purchase",
  };

  const full = txnDefaultChecklist(txn, checklist);

  el.innerHTML = txnWorkflowItems(txn)
    .map(
      (item) => `
        <label class="transaction-check-item">
          <input type="checkbox" data-txn-check="${txnSafe(item)}" ${full[item] ? "checked" : ""}>
          ${txnSafe(item)}
        </label>
      `,
    )
    .join("");
}

function txnReadChecklistEditor() {
  const checklist = {};
  document
    .querySelectorAll("[data-txn-check]")
    .forEach(
      (input) =>
        (checklist[input.getAttribute("data-txn-check")] = input.checked),
    );
  return checklist;
}

async function txnHandleDocumentUpload(event) {
  const files = Array.from(event.target.files || []);

  if (!files.length) return;

  const uploadInput = event.target;
  uploadInput.disabled = true;

  try {
    for (const file of files) {
      const doc = {
        id: String(Date.now() + Math.floor(Math.random() * 100000)),
        name: file.name,
        type: file.type || "file",
        mimeType: file.type || "",
        size: file.size || 0,
        provider: "Local File",
        storage: "RapportLink Document Repository",
        uploadedAt: new Date().toISOString(),
        data: "",
        text: "",
        extractedText: "",
        pageImages: [],
        extraction: {
          method: "pending",
          pages: 0,
          warnings: [],
          extractedAt: "",
        },
        ai: {},
        aiAnalysis: null,
        analysisStatus: "Reading document",
      };

      txnWorkingDocs.push(doc);
      txnRenderDocumentList();

      const txn =
        typeof txnReadTransactionForm === "function"
          ? txnReadTransactionForm(false)
          : {};

      try {
        /*
        ---------------------------------------------------------
        Save the original uploaded file immediately.

        This preserves the PDF, JPG, PNG, DOCX, TXT, or other
        supported source file even if extraction or AI analysis
        later fails.
        ---------------------------------------------------------
        */

        if (typeof window.repoSaveOriginalDocument !== "function") {
          throw new Error("RapportLink Document Repository is not available.");
        }

        await window.repoSaveOriginalDocument(doc.id, {
          blob: file,
          fileName: file.name,
          mimeType: file.type || "",
          size: file.size || 0,
          uploadedAt: doc.uploadedAt,
        });

        await window.repoUpdateMetadata(doc.id, {
          transactionId: txn?.id || "",
          fileName: file.name,
          mimeType: file.type || "",
          size: file.size || 0,
          uploadedAt: doc.uploadedAt,
          provider: "Local File",
        });

        /*
        ---------------------------------------------------------
        Extract text and page images.
        ---------------------------------------------------------
        */

        doc.data = "";

        if (typeof window.aiExtractDocumentText !== "function") {
          throw new Error("AI Extraction Engine is not available.");
        }

        const extraction = await window.aiExtractDocumentText(file);

        doc.text = String(extraction?.text || "");
        doc.extractedText = doc.text;

        doc.pageImages = Array.isArray(extraction?.pageImages)
          ? extraction.pageImages
          : [];

        doc.extraction = {
          method: extraction?.method || "none",
          pages: Number(extraction?.pages || 0),
          warnings: Array.isArray(extraction?.warnings)
            ? extraction.warnings
            : [],
          extractedAt: extraction?.extractedAt || new Date().toISOString(),
        };

        /*
        ---------------------------------------------------------
        Save reusable extraction assets.

        This stores:
        - extracted text
        - OCR method
        - page count
        - warnings
        - rendered PDF page images
        ---------------------------------------------------------
        */

        await window.repoSaveOCR(doc.id, {
          extractedText: doc.extractedText,
          method: doc.extraction.method,
          pages: doc.extraction.pages,
          warnings: doc.extraction.warnings,
          extractedAt: doc.extraction.extractedAt,
        });

        await window.repoSavePageImages(doc.id, doc.pageImages, {
          pageCount: doc.extraction.pages || doc.pageImages.length,
          renderScale: 1.5,
          imageFormat: doc.pageImages[0]?.mimeType || "image/jpeg",
          generatedAt: doc.extraction.extractedAt,
        });

        if (!doc.text.trim()) {
          throw new Error(
            "RapportLink could not extract readable text from this document.",
          );
        }

        doc.analysisStatus = "Document read";
        txnRenderDocumentList();

        /*
        ---------------------------------------------------------
        Run Universal Document Intelligence.
        ---------------------------------------------------------
        */

        if (typeof txnAnalyzeDocumentWithUniversalAI !== "function") {
          throw new Error("Universal Document Intelligence is not available.");
        }

        doc.analysisStatus = "AI reviewing document";
        txnRenderDocumentList();

        const analysis = await txnAnalyzeDocumentWithUniversalAI(txn, doc);

        if (!analysis || typeof analysis !== "object") {
          throw new Error(
            "Universal Document Intelligence returned no analysis.",
          );
        }

        doc.aiAnalysis = analysis;
        doc.ai = analysis;
        doc.engineVersion = analysis.engineVersion || null;
        doc.analysisModel = analysis.model || analysis.usage?.model || "";
        doc.lastAnalyzed = analysis.reviewedAt || new Date().toISOString();
        doc.analysisStatus = "AI review complete";

        /*
        ---------------------------------------------------------
        Save the completed AI analysis.

        Future transaction loads can reuse this result without
        rereading the original file or calling OpenAI again.
        ---------------------------------------------------------
        */

        await window.repoSaveAnalysis(doc.id, analysis, {
          model: analysis.model || analysis.usage?.model || "",
          reviewedAt: doc.lastAnalyzed,
          engineVersion: analysis.engineVersion || "",
          schemaVersion: analysis.schemaVersion || "",
          status: "Complete",
        });

        doc.analysisStoredInRepository = true;

        /*
         * Keep the current analysis attached in memory so the
         * Transaction Brain can rebuild immediately without
         * requiring asynchronous repository hydration.
         *
         * txnSaveAll() will still strip repository-backed analysis
         * before writing the transaction to localStorage.
         */
        doc.aiAnalysis = analysis;

        doc.ai = null;
        doc.universalAnalysis = null;
        doc.analysis = null;

        console.log("DOCUMENT SAVED TO REPOSITORY", {
          documentId: doc.id,
          transactionId: txn?.id || "",
          name: doc.name,
          mimeType: doc.mimeType,
          extractedTextLength: doc.extractedText.length,
          pageImages: doc.pageImages.length,
          analysisSaved: true,
        });

        console.log("UNIVERSAL AI ANALYSIS", {
          documentType: analysis.classification?.documentType || "Unknown",

          documentFamily: analysis.classification?.documentFamily || "Unknown",

          transactionEffect: analysis.classification?.transactionEffect || "",

          semanticEffects: analysis.semanticEffects || {},

          transactionEvents: Array.isArray(analysis.transactionEvents)
            ? analysis.transactionEvents
            : [],

          evidenceTypes: Array.isArray(analysis.evidence)
            ? analysis.evidence.map((item) => item.type)
            : [],

          evidence: analysis.evidence || [],
        });

        if (typeof window.aiAdvisorDocumentAnalysis === "function") {
          window.aiAdvisorDocumentAnalysis(txn, doc, analysis);
        }
      } catch (err) {
        console.error(`Document processing failed for ${file.name}:`, err);

        doc.analysisStatus = "Review failed";

        doc.extraction = doc.extraction || {
          method: "failed",
          pages: 0,
          warnings: [],
          extractedAt: new Date().toISOString(),
        };

        doc.extraction.warnings = [
          ...(doc.extraction.warnings || []),
          err?.message || "The document could not be processed.",
        ];

        doc.aiAnalysis = null;

        doc.ai = {
          type: "Document Review Failed",
          confidence: 0,
          alerts: [
            {
              severity: "high",
              title: "Document Could Not Be Read",
              text:
                err?.message ||
                "RapportLink could not read or analyze this uploaded document.",
            },
          ],
          recommendations: [
            "Open the document and confirm that it is not corrupted or password protected.",
          ],
          advisorSummary:
            "The document was uploaded, but RapportLink could not read or analyze its contents.",
          reviewedAt: new Date().toISOString(),
        };

        /*
        ---------------------------------------------------------
        Preserve the failure status in the repository.

        The original source file and any successfully extracted
        assets remain saved.
        ---------------------------------------------------------
        */

        if (typeof window.repoMarkAnalysisFailed === "function") {
          try {
            await window.repoMarkAnalysisFailed(doc.id, err, {
              model: "",
            });
          } catch (repositoryError) {
            console.error(
              "Unable to save document failure status:",
              repositoryError,
            );
          }
        }
      }

      txnRenderDocumentList();
    }

    txnRenderAutomationPreview();

    const currentTxn =
      typeof txnReadTransactionForm === "function"
        ? txnReadTransactionForm(false)
        : {};

    if (currentTxn && typeof txnRunCoordinator === "function") {
      currentTxn.documents = txnWorkingDocs;

      currentTxn.aiCoordinator = txnRunCoordinator(currentTxn, {
        checklist: currentTxn.checklist || {},
        docs: txnWorkingDocs,
      });
    }
  } finally {
    uploadInput.disabled = false;
    uploadInput.value = "";
  }
}

function txnReadFileAsDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => resolve(reader.result);

    reader.onerror = () =>
      reject(
        reader.error ||
          new Error(`Unable to read ${file?.name || "the uploaded file"}.`),
      );

    reader.readAsDataURL(file);
  });
}

function txnRenderDocumentList() {
  const el = document.getElementById("txnDocumentList");
  if (!el) return;
  if (!txnWorkingDocs.length) {
    el.innerHTML = '<div class="small-muted">No documents uploaded yet.</div>';
    return;
  }
  el.innerHTML = txnWorkingDocs
    .map(
      (doc) => `
    <div class="transaction-doc-row">
      <div><b>${txnSafe(doc.name)}</b><br><small>${txnSafe(doc.type || "file")} • ${Math.round((doc.size || 0) / 1024)} KB</small></div>
      <div class="d-flex gap-1">
        <a class="btn btn-sm btn-outline-primary" href="${doc.data}" download="${txnSafe(doc.name)}">Download</a>
        <button class="btn btn-sm btn-outline-danger" onclick="txnRemoveDocument('${doc.id}')">Remove</button>
      </div>
    </div>
  `,
    )
    .join("");
}

function txnRemoveDocument(id) {
  txnWorkingDocs = txnWorkingDocs.filter(
    (doc) => String(doc.id) !== String(id),
  );
  txnRenderDocumentList();
}

function txnSaveTransaction() {
  txnLoad();

  const txn = txnReadTransactionForm(true);
  const id = txn.id;

  const existing = txnCache.find((item) => String(item.id) === String(id));

  if (!txn.address) {
    alert("Please enter a property address.");
    return;
  }

  /*
  -------------------------------------------------------
  Preserve durable transaction history
  -------------------------------------------------------
  */

  txn.createdAt = existing?.createdAt || new Date().toISOString();

  txn.updatedAt = new Date().toISOString();

  /*
  -------------------------------------------------------
  Human-entered lifecycle provenance

  The status selected in the transaction form came directly
  from the user.

  This allows the Transaction Brain to distinguish:

  - user-entered transaction status
  - old AI-generated status
  - document-derived transaction conclusions
  -------------------------------------------------------
  */

  txn.statusSource = "User";

  txn.statusUpdatedAt = new Date().toISOString();

  txn.statusUpdatedBy = "Transaction Form";

  /*
  -------------------------------------------------------
  Preserve existing document intelligence unless the form
  currently contains an explicit document collection.

  This prevents an ordinary transaction edit from silently
  removing documents or their saved AI analyses.
  -------------------------------------------------------
  */

  if (
    (!Array.isArray(txn.documents) || txn.documents.length === 0) &&
    Array.isArray(existing?.documents) &&
    existing.documents.length > 0
  ) {
    txn.documents = existing.documents;
  }

  /*
  -------------------------------------------------------
  Preserve existing document reviews and AI audit history.

  These are document records, not authoritative transaction
  conclusions.
  -------------------------------------------------------
  */

  txn.aiDocumentReviews = Array.isArray(existing?.aiDocumentReviews)
    ? existing.aiDocumentReviews
    : [];

  txn.aiLatestReview = existing?.aiLatestReview || null;

  txn.lastAIReviewAt = existing?.lastAIReviewAt || "";

  txn.lastAIAdvisorSummary = existing?.lastAIAdvisorSummary || "";

  /*
  -------------------------------------------------------
  Preserve manual automation tasks
  -------------------------------------------------------
  */

  txn.automationTasks = Array.isArray(existing?.automationTasks)
    ? existing.automationTasks
    : [];

  /*
  -------------------------------------------------------
  Remove stale generated AI conclusions before rebuilding
  -------------------------------------------------------
  */

  delete txn.transactionBrain;
  delete txn.aiCoordinator;
  delete txn.aiTransactionIntelligence;
  delete txn.aiTransactionState;
  delete txn.derivedStatus;

  delete txn.health;
  delete txn.transactionHealth;
  delete txn.healthScore;

  delete txn.confidence;
  delete txn.closingConfidence;
  delete txn.closingProbability;

  delete txn.alerts;
  delete txn.priorities;
  delete txn.recommendations;
  delete txn.missingItems;
  delete txn.missingDocuments;
  delete txn.missingFields;
  delete txn.reasoning;

  /*
  -------------------------------------------------------
  Build the current authoritative Transaction Brain
  -------------------------------------------------------
  */

  if (typeof aiAnalyzeTransaction === "function") {
    aiAnalyzeTransaction(txn);
  } else if (typeof aiRefreshTransaction === "function") {
    aiRefreshTransaction(txn);
  }

  /*
  -------------------------------------------------------
  Rebuild operational automation after the Brain
  -------------------------------------------------------
  */

  if (typeof txnApplyAutomation === "function") {
    txnApplyAutomation(txn);
  }

  /*
  -------------------------------------------------------
  Store the transaction
  -------------------------------------------------------
  */

  const index = txnCache.findIndex((item) => String(item.id) === String(id));

  if (index >= 0) {
    txnCache[index] = txn;
  } else {
    txnCache.unshift(txn);
  }

  console.log("BEFORE TXN SAVE", {
    id: txn.id,
    address: txn.address,
    status: txn.status,
    statusSource: txn.statusSource,
    statusUpdatedAt: txn.statusUpdatedAt,
    statusUpdatedBy: txn.statusUpdatedBy,
  });

  const saved = txnSaveAll();

  if (saved === false) {
    alert("The transaction could not be saved.");
    return;
  }

  /*
-------------------------------------------------------
Maintain contact relationships
-------------------------------------------------------
*/

  if (typeof txnSyncTransactionRelationships === "function") {
    txnSyncTransactionRelationships(txn);
  }

  const formCard = document.getElementById("transactionFormCard");

  if (formCard) {
    formCard.style.display = "none";
  }

  txnRenderAll();

  if (typeof renderContactTransactions === "function") {
    renderContactTransactions();
  }

  if (typeof loadCalendar === "function") {
    loadCalendar();
  }

  if (window.txnReturnToWorkspace) {
    const returnId = window.txnReturnToWorkspace;

    window.txnReturnToWorkspace = null;

    setTimeout(() => {
      txnOpenPanel(returnId);
    }, 150);
  }
}

function txnRunAutomationAll() {
  txnLoad();
  txnCache = txnCache.map((txn) => txnApplyAutomation(txn));
  txnSaveAll();
  txnRenderAll();
  loadCalendar();
  alert("AI automation updated transaction action items.");
}

function txnToggleAutomationTask(txnId, taskId) {
  txnLoad();
  const txn = txnCache.find((t) => String(t.id) === String(txnId));
  if (!txn) return;
  txnApplyAutomation(txn);
  const task = (txn.automationTasks || []).find(
    (t) => String(t.id) === String(taskId),
  );
  if (task) task.done = !task.done;
  txn.updatedAt = new Date().toISOString();
  txnSaveAll();
  txnRenderAll();
  txnOpenPanel(txnId);
  loadCalendar();
}

function txnEditFromWorkspace(id) {
  window.txnReturnToWorkspace = id;
  txnEdit(id);
}

function txnEdit(id) {
  txnLoad();

  const txn = txnCache.find((t) => String(t.id) === String(id));
  if (!txn) return;

  document.getElementById("transactionFormCard").style.display = "block";
  document.getElementById("transactionFormTitle").innerText =
    "Edit Transaction";

  document.getElementById("txnId").value = txn.id;
  document.getElementById("txnAddress").value = txn.address || "";
  document.getElementById("txnSide").value = txn.side || "Buyer";
  document.getElementById("txnStatus").value = txn.status || "Active";
  document.getElementById("txnPrice").value = txn.price || "";
  document.getElementById("txnCommissionPercent").value =
    txn.commissionPercent || 2.5;
  document.getElementById("txnGci").value = txn.gci || "";
  document.getElementById("txnAgent").value = txn.agent || "";
  document.getElementById("txnMls").value = txn.mls || "";

  document.getElementById("txnBuyerContactId").value = txn.buyerContactId || "";
  document.getElementById("txnSellerContactId").value =
    txn.sellerContactId || "";

  document.getElementById("txnBuyer").value = txn.buyer || "";
  document.getElementById("txnBuyerEmail").value = txn.buyerEmail || "";
  document.getElementById("txnBuyerPhone").value = txn.buyerPhone || "";

  document.getElementById("txnSeller").value = txn.seller || "";
  document.getElementById("txnSellerEmail").value = txn.sellerEmail || "";
  document.getElementById("txnSellerPhone").value = txn.sellerPhone || "";

  document.getElementById("txnLender").value = txn.lender || "";
  document.getElementById("txnTitleCompany").value = txn.titleCompany || "";

  document.getElementById("txnContractDate").value = txn.contractDate || "";
  document.getElementById("txnEmdDue").value = txn.emdDue || "";
  document.getElementById("txnInspectionDate").value = txn.inspectionDate || "";
  document.getElementById("txnAppraisalDate").value = txn.appraisalDate || "";
  document.getElementById("txnLoanDate").value = txn.loanDate || "";
  document.getElementById("txnWalkthroughDate").value =
    txn.walkthroughDate || "";
  document.getElementById("txnCloseDate").value = txn.closeDate || "";

  document.getElementById("txnRisk").value = txn.risk || "Normal";

  document.getElementById("txnNotes").value = txn.notes || "";

  if (document.getElementById("txnAutomationEnabled"))
    document.getElementById("txnAutomationEnabled").checked =
      txn.automationEnabled !== false;

  if (document.getElementById("txnAutoCreateDates"))
    document.getElementById("txnAutoCreateDates").checked =
      txn.autoCreateDates !== false;

  if (document.getElementById("txnAutoCreateDocs"))
    document.getElementById("txnAutoCreateDocs").checked =
      txn.autoCreateDocs !== false;

  txnWorkingDocs = Array.isArray(txn.documents) ? [...txn.documents] : [];

  txnRenderPartySelectors();
  txnRenderChecklistEditor(txn.checklist || {});
  txnRenderDocumentList();

  // NEW
  if (typeof txnRenderPartiesEditor === "function") {
    txnRenderPartiesEditor(txn.parties || []);
  }

  txnRenderAutomationPreview();

  setTimeout(() => {
    if (typeof txnInitContactPickers === "function") {
      txnInitContactPickers();
    }
  }, 100);

  txnClosePanel();

  document.getElementById("transactionFormCard").scrollIntoView({
    behavior: "smooth",
    block: "start",
  });
}

function txnDeleteCurrent() {
  const id = document.getElementById("txnId")?.value || "";

  if (!id) {
    txnCancelEdit();
    return;
  }

  if (!confirm("Delete this transaction?")) return;

  txnLoad();

  txnCache = txnCache.filter((t) => String(t.id) !== String(id));

  txnSaveAll();
  txnCancelEdit();
  txnRenderAll();

  if (typeof renderContactTransactions === "function") {
    renderContactTransactions();
  }

  if (typeof loadCalendar === "function") {
    loadCalendar();
  }

  alert("Transaction deleted.");
}

function txnDeleteById(id) {
  if (!id) return;

  if (!confirm("Delete this transaction?")) return;

  txnLoad();

  txnCache = txnCache.filter((t) => String(t.id) !== String(id));

  txnSaveAll();

  if (typeof txnClosePanel === "function") {
    txnClosePanel();
  }

  txnRenderAll();

  if (typeof renderContactTransactions === "function") {
    renderContactTransactions();
  }

  if (typeof loadCalendar === "function") {
    loadCalendar();
  }

  alert("Transaction deleted.");
}

function txnOpenPanel(id) {
  txnLoad();

  const txn = txnCache.find((item) => String(item.id) === String(id));

  if (!txn) {
    alert("Transaction could not be found.");
    return;
  }

  /*
  --------------------------------------------------------
  Documents

  Documents are analyzed only when uploaded through the
  server-side Universal Document Engine.

  Opening a transaction must never rerun OCR, call OpenAI,
  or replace saved document analysis.
  --------------------------------------------------------
  */

  if (!Array.isArray(txn.documents)) {
    txn.documents = [];
  }

  /*
  --------------------------------------------------------
  Rebuild the authoritative Transaction Brain

  The Transaction Brain derives its conclusions from the
  evidence already stored for this transaction.
  --------------------------------------------------------
  */

  if (typeof aiRefreshTransaction === "function") {
    try {
      const refreshedTxn = aiRefreshTransaction(txn);

      if (refreshedTxn && typeof refreshedTxn === "object") {
        Object.assign(txn, refreshedTxn);
      }
    } catch (error) {
      console.error("Transaction Brain refresh failed:", error);
    }
  }

  const brain =
    txn.transactionBrain &&
    typeof txn.transactionBrain === "object" &&
    !Array.isArray(txn.transactionBrain)
      ? txn.transactionBrain
      : null;

  /*
  --------------------------------------------------------
  Authoritative AI conclusions

  Do not use saved transaction status, alerts, checklist
  calculations, or legacy AI objects as substitute reasoning.

  Missing Brain conclusions remain unknown.
  --------------------------------------------------------
  */

  const validNumber = (value) =>
    typeof value === "number" && Number.isFinite(value);

  const transactionState =
    typeof brain?.transactionState === "string" && brain.transactionState.trim()
      ? brain.transactionState.trim()
      : "Unknown";

  const transactionHealth = validNumber(brain?.health) ? brain.health : null;

  const closingProbability = validNumber(brain?.confidence)
    ? brain.confidence
    : null;

  const riskLevel =
    typeof brain?.riskLevel === "string" && brain.riskLevel.trim()
      ? brain.riskLevel.trim()
      : "Unknown";

  const authoritativeAI = {
    transactionState,
    transactionHealth,
    closingProbability,
    riskLevel,

    scoreBreakdown:
      brain?.scoreBreakdown &&
      typeof brain.scoreBreakdown === "object" &&
      !Array.isArray(brain.scoreBreakdown)
        ? brain.scoreBreakdown
        : {},

    evidence: Array.isArray(brain?.evidence) ? [...brain.evidence] : [],

    reasoning: Array.isArray(brain?.reasoning) ? [...brain.reasoning] : [],

    missingItems: Array.isArray(brain?.missingItems)
      ? [...brain.missingItems]
      : [],

    missingDocuments: Array.isArray(brain?.missingDocuments)
      ? [...brain.missingDocuments]
      : [],

    missingFields: Array.isArray(brain?.missingFields)
      ? [...brain.missingFields]
      : [],

    recommendations: Array.isArray(brain?.recommendations)
      ? [...brain.recommendations]
      : [],

    priorities: Array.isArray(brain?.priorities) ? [...brain.priorities] : [],

    alerts: Array.isArray(brain?.alerts) ? [...brain.alerts] : [],

    tasks: Array.isArray(brain?.tasks) ? [...brain.tasks] : [],

    nextBestAction:
      typeof brain?.nextBestAction === "string" ? brain.nextBestAction : "",
  };

  /*
  --------------------------------------------------------
  Display-only derived state

  Do not overwrite txn.status. A property can have multiple
  transactions with separate evidence and lifecycles.
  --------------------------------------------------------
  */

  txn.derivedStatus = transactionState;
  txn.aiTransactionState = transactionState;

  /*
  --------------------------------------------------------
  Coordinator mirror

  The Coordinator may display Brain conclusions, but it must
  not independently calculate or reinterpret them.
  --------------------------------------------------------
  */

  if (
    txn.aiCoordinator &&
    typeof txn.aiCoordinator === "object" &&
    !Array.isArray(txn.aiCoordinator)
  ) {
    Object.assign(txn.aiCoordinator, authoritativeAI);
  }

  /*
  --------------------------------------------------------
  Automation

  Existing automation may consume the authoritative state,
  but it must not replace Brain conclusions.
  --------------------------------------------------------
  */

  txnApplyAutomation(txn);

  const workspaceTxn = {
    ...txn,
    status: transactionState,
    derivedStatus: transactionState,
    aiTransactionState: transactionState,
  };

  const docs = Array.isArray(workspaceTxn.documents)
    ? workspaceTxn.documents
    : [];

  /*
  --------------------------------------------------------
  Supporting display information

  Alerts, tasks, and checklist information may be rendered,
  but they are not permitted to calculate health, confidence,
  risk, or transaction state.
  --------------------------------------------------------
  */

  const alerts =
    typeof txnCriticalAlerts === "function"
      ? txnCriticalAlerts(workspaceTxn)
      : [];

  const autoSummary =
    typeof txnAutomationSummary === "function"
      ? txnAutomationSummary(workspaceTxn)
      : {
          total: 0,
          open: 0,
          high: 0,
          overdue: 0,
          tasks: [],
        };

  const checklist =
    typeof txnDefaultChecklist === "function"
      ? txnDefaultChecklist(workspaceTxn, workspaceTxn.checklist || {})
      : workspaceTxn.checklist || {};

  /*
  --------------------------------------------------------
  Completion progress

  This remains a separate completion measurement. It does
  not determine state, health, confidence, or risk.

  Do not manufacture 100% solely from a final state.
  --------------------------------------------------------
  */

  const progress =
    typeof txnProgress === "function" ? txnProgress(workspaceTxn) : null;

  /*
  --------------------------------------------------------
  Save rebuilt AI results

  This does not reanalyze documents or make an OpenAI call.
  --------------------------------------------------------
  */

  txn.updatedAt = new Date().toISOString();

  if (typeof txnSaveAll === "function") {
    txnSaveAll();
  }

  const panel = document.getElementById("transactionPanel");
  const el = document.getElementById("transactionPanelContent");

  if (!panel || !el) {
    alert("Transaction Workspace panel is missing from app.html.");
    return;
  }

  document.body.appendChild(panel);

  panel.classList.add("open");

  panel.style.cssText = `
    display: block !important;
    position: fixed !important;
    top: 0 !important;
    left: 0 !important;
    right: 0 !important;
    bottom: 0 !important;
    width: 100vw !important;
    max-width: 100vw !important;
    height: 100vh !important;
    z-index: 2147483647 !important;
    overflow-y: auto !important;
    background: #f5f7fa !important;
    padding: 0 !important;
    margin: 0 !important;
    opacity: 1 !important;
    visibility: visible !important;
    pointer-events: auto !important;
    transform: none !important;
  `;

  if (typeof renderTransactionWorkspace !== "function") {
    alert("Transaction Workspace file is not loaded.");
    return;
  }

  el.innerHTML = renderTransactionWorkspace(workspaceTxn, {
    alerts,
    autoSummary,
    checklist,
    docs,
    progress,

    /*
     * The workspace receives one authoritative AI object.
     * It must not select among competing Brain objects.
     */
    ai: authoritativeAI,
  });

  if (typeof window.txnWorkspaceShowTab === "function") {
    window.txnWorkspaceShowTab(window.txnWorkspaceActiveTab || "overview");
  }
}

function txnWorkspaceSaveParties(txnId) {
  txnLoad();

  const txn = txnCache.find((t) => String(t.id) === String(txnId));
  if (!txn) return;

  txn.buyer =
    document.getElementById(`txnWorkspaceBuyer_${txnId}`)?.value.trim() || "";
  txn.buyerEmail =
    document.getElementById(`txnWorkspaceBuyerEmail_${txnId}`)?.value.trim() ||
    "";
  txn.buyerPhone =
    document.getElementById(`txnWorkspaceBuyerPhone_${txnId}`)?.value.trim() ||
    "";

  txn.seller =
    document.getElementById(`txnWorkspaceSeller_${txnId}`)?.value.trim() || "";
  txn.sellerEmail =
    document.getElementById(`txnWorkspaceSellerEmail_${txnId}`)?.value.trim() ||
    "";
  txn.sellerPhone =
    document.getElementById(`txnWorkspaceSellerPhone_${txnId}`)?.value.trim() ||
    "";

  txn.lender =
    document.getElementById(`txnWorkspaceLender_${txnId}`)?.value.trim() || "";
  txn.titleCompany =
    document.getElementById(`txnWorkspaceTitle_${txnId}`)?.value.trim() || "";

  txn.updatedAt = new Date().toISOString();

  txnApplyAutomation(txn);
  txnSaveAll();
  txnRenderAll();
  txnOpenPanel(txnId);
}

async function txnAnalyzeDocumentWithUniversalAI(txn = {}, doc = {}) {
  const documentText = String(
    doc.text || doc.extractedText || doc.ocrText || "",
  ).trim();

  const pageImages = Array.isArray(doc.pageImages)
    ? doc.pageImages.filter((image) => {
        if (typeof image === "string") {
          return image.trim() !== "";
        }

        return (
          image &&
          typeof image === "object" &&
          !Array.isArray(image) &&
          String(
            image.dataUrl ||
              image.imageUrl ||
              image.image_url ||
              image.url ||
              "",
          ).trim() !== ""
        );
      })
    : [];

  if (!documentText && pageImages.length === 0) {
    throw new Error(
      "RapportLink cannot analyze this document because no readable text or page images were produced.",
    );
  }

  /*
  ---------------------------------------------------------
  Send both forms of document evidence:

  - extracted text for clauses, dates, amounts, and terms
  - rendered page images for signatures, initials, boxes,
    handwriting, stamps, strikeouts, and visual execution

  The prior version created pageImages but did not include
  them in this request, so the server never received them.
  ---------------------------------------------------------
  */

  const response = await fetch("/api/ai/universal-document", {
    method: "POST",

    headers: {
      "Content-Type": "application/json",
    },

    body: JSON.stringify({
      txn: {
        id: txn.id || null,

        side: txn.side || "",

        address: txn.address || txn.propertyAddress || "",

        propertyAddress: txn.propertyAddress || txn.address || "",

        country: txn.country || "",

        state: txn.state || "",
      },

      doc: {
        id: doc.id || null,

        sourceDocumentId: doc.id || null,

        name: doc.name || "Uploaded Document",

        originalName: doc.name || "Uploaded Document",

        type: doc.type || doc.mimeType || "",

        mimeType: doc.mimeType || doc.type || "",

        size: Number(doc.size || 0),

        fileSize: Number(doc.size || 0),

        uploadedAt: doc.uploadedAt || "",

        text: documentText,

        extractedText: documentText,

        pageImages,

        pageCount:
          Number(
            doc.extraction?.pages || doc.pageCount || pageImages.length || 0,
          ) || null,

        extraction:
          doc.extraction && typeof doc.extraction === "object"
            ? {
                method: doc.extraction.method || "unknown",

                pages: Number(doc.extraction.pages || pageImages.length || 0),

                warnings: Array.isArray(doc.extraction.warnings)
                  ? [...doc.extraction.warnings]
                  : [],

                extractedAt: doc.extraction.extractedAt || "",
              }
            : {
                method: "unknown",

                pages: pageImages.length,

                warnings: [],

                extractedAt: "",
              },
      },
    }),
  });

  const result = await response.json().catch(() => null);

  if (!response.ok || !result?.success || !result?.analysis) {
    throw new Error(
      result?.error ||
        `Universal Document Engine failed with status ${response.status}.`,
    );
  }

  const universalAnalysis =
    result.analysis &&
    typeof result.analysis === "object" &&
    !Array.isArray(result.analysis)
      ? result.analysis
      : {};

  /*
  ---------------------------------------------------------
  Compatibility normalization

  Preserve the complete authoritative Universal analysis,
  while also exposing the fields directly at the top level
  for the Transaction Brain and existing workspace UI.
  ---------------------------------------------------------
  */

  const normalizeConfidence = (value) => {
    const number = Number(value || 0);

    if (!Number.isFinite(number)) {
      return 0;
    }

    if (number > 0 && number <= 1) {
      return Math.round(number * 100);
    }

    return Math.max(0, Math.min(100, Math.round(number)));
  };

  const normalizeFacts = (facts) => {
    if (!Array.isArray(facts)) {
      return facts && typeof facts === "object" && !Array.isArray(facts)
        ? facts
        : {};
    }

    return facts.reduce((output, item) => {
      if (!item || typeof item !== "object" || !item.name) {
        return output;
      }

      output[item.name] = item.value;

      return output;
    }, {});
  };

  const evidence = Array.isArray(universalAnalysis.evidence)
    ? universalAnalysis.evidence.map((item) => ({
        ...item,

        confidence: normalizeConfidence(item?.confidence),

        facts: normalizeFacts(item?.facts),

        sourceDocumentId:
          item?.sourceDocumentId ||
          universalAnalysis.sourceDocumentId ||
          doc.id ||
          null,

        sourceDocument:
          item?.sourceDocument ||
          universalAnalysis.sourceDocument ||
          doc.name ||
          "Uploaded Document",
      }))
    : [];

  const execution =
    universalAnalysis.execution &&
    typeof universalAnalysis.execution === "object" &&
    !Array.isArray(universalAnalysis.execution)
      ? {
          ...universalAnalysis.execution,

          confidence: normalizeConfidence(
            universalAnalysis.execution.confidence,
          ),
        }
      : {
          executed: false,

          fullyExecuted: false,

          signaturesComplete: false,

          initialsComplete: false,

          effective: false,

          executionDate: "",

          effectiveDate: "",

          confidence: 0,

          supportingText: "",
        };

  const semanticEffects =
    universalAnalysis.semanticEffects &&
    typeof universalAnalysis.semanticEffects === "object" &&
    !Array.isArray(universalAnalysis.semanticEffects)
      ? universalAnalysis.semanticEffects
      : {};

  const transactionEvents = Array.isArray(universalAnalysis.transactionEvents)
    ? universalAnalysis.transactionEvents
    : [];

  const signatures = Array.isArray(universalAnalysis.signatures)
    ? universalAnalysis.signatures
    : [];

  const initials = Array.isArray(universalAnalysis.initials)
    ? universalAnalysis.initials
    : [];

  return {
    ...universalAnalysis,

    engine: "RapportLink Universal Document Engine",

    engineVersion: Number(universalAnalysis.engineVersion || 1),

    documentId: doc.id || universalAnalysis.sourceDocumentId || null,

    documentName:
      doc.name || universalAnalysis.sourceDocument || "Uploaded Document",

    documentType:
      universalAnalysis.classification?.documentType ||
      universalAnalysis.documentType ||
      "Unknown",

    documentTypes: [
      universalAnalysis.classification?.documentType ||
        universalAnalysis.documentType ||
        "Unknown",
    ],

    confidence: normalizeConfidence(
      universalAnalysis.classification?.confidence ??
        universalAnalysis.confidence,
    ),

    execution,

    semanticEffects,

    transactionEvents,

    signatures,

    initials,

    evidence,

    facts: normalizeFacts(universalAnalysis.facts),

    advisorSummary:
      universalAnalysis.summary ||
      universalAnalysis.advisorSummary ||
      "RapportLink completed its AI review of this document.",

    reviewedAt: universalAnalysis.reviewedAt || new Date().toISOString(),

    universalAnalysis,
  };
}

async function txnWorkspaceUploadDocuments(txnId, event) {
  const files = Array.from(event?.target?.files || []);

  if (!files.length) {
    return;
  }

  const uploadInput = event.target;
  uploadInput.disabled = true;

  /*
  -------------------------------------------------------
  Safe DealPilot progress renderer

  This updates only a temporary DOM card. It does not:

  - reload txnCache
  - reopen the workspace
  - rebuild the transaction
  - render the transaction list
  - interrupt document processing
  -------------------------------------------------------
  */

  const renderDealPilotProgress = (txn, status) => {
    if (typeof dealPilotSetDocumentStatus === "function") {
      dealPilotSetDocumentStatus(status);
    }

    let overlay = document.getElementById("dealPilotDocumentProcessingOverlay");

    if (!overlay) {
      overlay = document.createElement("div");
      overlay.id = "dealPilotDocumentProcessingOverlay";

      overlay.style.cssText = `
        position: fixed;
        right: 28px;
        bottom: 28px;
        width: min(460px, calc(100vw - 40px));
        max-height: calc(100vh - 56px);
        overflow-y: auto;
        z-index: 2147483647;
      `;

      document.body.appendChild(overlay);
    }

    if (typeof dealPilotBuildDocumentStatusCard === "function") {
      overlay.innerHTML = dealPilotBuildDocumentStatusCard(txn);
    }
  };

  const removeDealPilotProgress = () => {
    const overlay = document.getElementById(
      "dealPilotDocumentProcessingOverlay",
    );

    if (overlay) {
      overlay.remove();
    }
  };

  /*
  -------------------------------------------------------
  Confirm permanent repository availability
  -------------------------------------------------------
  */

  const repositoryReady =
    typeof window.repoSaveOriginalDocument === "function" &&
    typeof window.repoUpdateMetadata === "function" &&
    typeof window.repoSaveOCR === "function" &&
    typeof window.repoSavePageImages === "function" &&
    typeof window.repoSaveAnalysis === "function" &&
    typeof window.repoMarkAnalysisFailed === "function";

  if (!repositoryReady) {
    uploadInput.disabled = false;
    uploadInput.value = "";

    alert(
      "RapportLink Document Repository is not available. The document was not uploaded.",
    );

    return;
  }

  /*
  -------------------------------------------------------
  Load once before processing begins.

  Nothing inside the file-processing loop may reload
  txnCache.
  -------------------------------------------------------
  */

  txnLoad();

  const txn = txnCache.find((item) => String(item.id) === String(txnId));

  if (!txn) {
    uploadInput.disabled = false;
    uploadInput.value = "";

    alert("Transaction could not be found.");

    return;
  }

  if (!Array.isArray(txn.documents)) {
    txn.documents = [];
  }

  const uploadLabel =
    files.length === 1 ? files[0].name : `${files.length} documents`;

  renderDealPilotProgress(txn, {
    transactionId: txnId,

    documentName: uploadLabel,

    stage: "received",

    message:
      files.length === 1
        ? `Thanks, Jeff. I received ${files[0].name}. I’m preparing to read it now.`
        : `Thanks, Jeff. I received ${files.length} documents. I’m preparing to read them now.`,

    detail:
      "I’ll review the text, page images, signatures, initials, dates, checkboxes, handwriting, and transaction terms.",

    progress: 10,
  });

  try {
    /*
    -------------------------------------------------------
    Process every file against this same live transaction.

    Save and render only after every selected file has
    completed.
    -------------------------------------------------------
    */

    for (let fileIndex = 0; fileIndex < files.length; fileIndex++) {
      const file = files[fileIndex];

      const doc = {
        id: String(Date.now() + fileIndex + Math.floor(Math.random() * 100000)),

        name: file.name,

        type: file.type || "file",

        mimeType: file.type || "",

        size: Number(file.size || 0),

        data: "",

        text: "",

        extractedText: "",

        pageImages: [],

        uploadedAt: new Date().toISOString(),

        storage: "RapportLink Document Repository",

        extraction: {
          method: "pending",

          pages: 0,

          warnings: [],

          extractedAt: "",
        },

        aiAnalysis: null,

        engineVersion: 0,

        lastAnalyzed: "",

        analysisStatus: "Reading document",

        analysisError: null,
      };

      txn.documents.push(doc);
      txn.updatedAt = new Date().toISOString();

      try {
        /*
        ---------------------------------------------------
        Stage 0: Save the original source file
        ---------------------------------------------------
        */

        await window.repoSaveOriginalDocument(doc.id, {
          blob: file,
          fileName: file.name,
          mimeType: file.type || "",
          size: Number(file.size || 0),
          uploadedAt: doc.uploadedAt,
        });

        await window.repoUpdateMetadata(doc.id, {
          transactionId: String(txn.id || txnId || ""),
          transactionAddress: txn.address || txn.propertyAddress || "",
          fileName: file.name,
          mimeType: file.type || "",
          size: Number(file.size || 0),
          uploadedAt: doc.uploadedAt,
          provider: "Local File",
        });

        /*
        ---------------------------------------------------
        Stage 1: Read and visually render the document
        ---------------------------------------------------
        */

        if (typeof window.aiExtractDocumentText !== "function") {
          throw new Error("AI Extraction Engine is not available.");
        }

        renderDealPilotProgress(txn, {
          transactionId: txnId,

          documentName: file.name,

          stage: "reading",

          message: `I’m reading ${file.name} now.`,

          detail:
            "I’m extracting the text and rendering each page so I can review signatures, initials, checkboxes, handwriting, stamps, and other visual evidence.",

          progress: 30,
        });

        const extraction = await window.aiExtractDocumentText(file);

        doc.text = String(extraction?.text || "");
        doc.extractedText = doc.text;

        doc.pageImages = Array.isArray(extraction?.pageImages)
          ? extraction.pageImages
          : [];

        doc.extraction = {
          method: extraction?.method || "none",

          pages: Number(extraction?.pages || 0),

          warnings: Array.isArray(extraction?.warnings)
            ? [...extraction.warnings]
            : [],

          extractedAt: extraction?.extractedAt || new Date().toISOString(),
        };

        await window.repoSaveOCR(doc.id, {
          extractedText: doc.extractedText,
          method: doc.extraction.method,
          pages: doc.extraction.pages,
          warnings: doc.extraction.warnings,
          extractedAt: doc.extraction.extractedAt,
        });

        await window.repoSavePageImages(doc.id, doc.pageImages, {
          pageCount: doc.extraction.pages || doc.pageImages.length,
          renderScale: 1.5,
          imageFormat:
            doc.pageImages[0]?.mimeType ||
            (file.type && file.type.startsWith("image/")
              ? file.type
              : "image/jpeg"),
          generatedAt: doc.extraction.extractedAt,
        });

        console.log(
          `Extracted ${doc.text.length} characters and ${doc.pageImages.length} page images from ${doc.name}`,
        );

        doc.analysisStatus = doc.text.trim()
          ? "Document read"
          : "No readable text found";

        /*
        ---------------------------------------------------
        Stage 2: Universal Document Intelligence
        ---------------------------------------------------
        */

        if (typeof txnAnalyzeDocumentWithUniversalAI !== "function") {
          throw new Error("Universal Document Engine is not available.");
        }

        renderDealPilotProgress(txn, {
          transactionId: txnId,

          documentName: file.name,

          stage: "analyzing",

          message: "I’ve finished reading the document. I’m analyzing it now.",

          detail:
            "I’m identifying the document type and reviewing the parties, signatures, initials, dates, amounts, handwritten changes, checkboxes, obligations, execution status, and transaction effects.",

          progress: 65,
        });

        const analysis = await txnAnalyzeDocumentWithUniversalAI(txn, doc);

        if (
          !analysis ||
          typeof analysis !== "object" ||
          Array.isArray(analysis)
        ) {
          throw new Error(
            "Universal Document Engine returned an invalid analysis.",
          );
        }

        doc.aiAnalysis = analysis;

        console.log("AI ANALYSIS", {
          documentId: doc.id,

          documentName: doc.name,

          documentType: analysis.documentType,

          documentTypes: analysis.documentTypes,

          execution:
            analysis.execution || analysis.universalAnalysis?.execution || null,

          transactionEffect: analysis.classification?.transactionEffect || "",

          semanticEffects:
            analysis.semanticEffects ||
            analysis.universalAnalysis?.semanticEffects ||
            null,

          transactionEvents: Array.isArray(analysis.transactionEvents)
            ? analysis.transactionEvents
            : Array.isArray(analysis.universalAnalysis?.transactionEvents)
              ? analysis.universalAnalysis.transactionEvents
              : [],

          signatures: Array.isArray(analysis.signatures)
            ? analysis.signatures
            : Array.isArray(analysis.universalAnalysis?.signatures)
              ? analysis.universalAnalysis.signatures
              : [],

          evidenceTypes: Array.isArray(analysis.evidence)
            ? analysis.evidence.map((item) => item?.type)
            : Array.isArray(analysis.evidence?.items)
              ? analysis.evidence.items.map((item) => item?.type)
              : Array.isArray(analysis.universalAnalysis?.evidence?.items)
                ? analysis.universalAnalysis.evidence.items.map(
                    (item) => item?.type,
                  )
                : [],

          evidence:
            analysis.evidence || analysis.universalAnalysis?.evidence || null,
        });

        doc.engineVersion = Number(
          analysis.engineVersion ||
            analysis.version ||
            analysis.universalAnalysis?.engineVersion ||
            0,
        );

        doc.lastAnalyzed = analysis.reviewedAt || new Date().toISOString();

        await window.repoSaveAnalysis(doc.id, analysis, {
          model:
            analysis.model ||
            analysis.usage?.model ||
            analysis.universalAnalysis?.model ||
            "",
          reviewedAt: doc.lastAnalyzed,
          engineVersion:
            analysis.engineVersion ||
            analysis.universalAnalysis?.engineVersion ||
            "",
          schemaVersion:
            analysis.schemaVersion ||
            analysis.universalAnalysis?.schemaVersion ||
            "",
          status: "Complete",
        });

        /*
        ---------------------------------------------------
        Stage 3: Update the Transaction Brain

        This operates on the same live transaction object.
        It does not reload txnCache or render the UI.
        ---------------------------------------------------
        */

        renderDealPilotProgress(txn, {
          transactionId: txnId,

          documentName: file.name,

          stage: "updating",

          message:
            "I’ve completed the document review. I’m updating the Transaction Brain now.",

          detail:
            "I’m adding the new evidence and checking whether it changes the transaction state, health, confidence, priorities, recommendations, or missing items.",

          progress: 88,
        });

        if (typeof aiRefreshTransaction === "function") {
          aiRefreshTransaction(txn);
        } else if (typeof aiBuildTransactionBrain === "function") {
          txn.transactionBrain = aiBuildTransactionBrain(txn);
        }

        /*
        ---------------------------------------------------
        Advisor compatibility

        This only records the completed document review.
        It must not save, reload, or reopen the workspace.
        ---------------------------------------------------
        */

        if (typeof window.aiAdvisorDocumentAnalysis === "function") {
          window.aiAdvisorDocumentAnalysis(txn, doc, doc.aiAnalysis);
        }

        doc.analysisStatus = "AI review complete";
        doc.analysisError = null;

        console.log("DOCUMENT SAVED TO REPOSITORY", {
          documentId: doc.id,
          transactionId: String(txn.id || txnId || ""),
          documentName: doc.name,
          mimeType: doc.mimeType,
          extractedTextLength: doc.extractedText.length,
          pageImageCount: doc.pageImages.length,
          analysisSaved: true,
        });
      } catch (error) {
        console.error(`Document processing failed for ${file.name}:`, error);

        doc.analysisStatus = "Review failed";

        doc.analysisError =
          error?.message || "The document could not be processed.";

        doc.extraction =
          doc.extraction && typeof doc.extraction === "object"
            ? doc.extraction
            : {
                method: "failed",

                pages: 0,

                warnings: [],

                extractedAt: "",
              };

        if (doc.extraction.method === "pending") {
          doc.extraction.method = "failed";
        }

        doc.extraction.warnings = [
          ...(Array.isArray(doc.extraction.warnings)
            ? doc.extraction.warnings
            : []),

          doc.analysisError,
        ];

        doc.aiAnalysis = {
          engineVersion: null,

          documentId: doc.id,

          documentName: doc.name,

          documentType: "Document Review Failed",

          documentTypes: ["Document Review Failed"],

          confidence: 0,

          execution: {
            executed: false,

            fullyExecuted: false,

            signaturesComplete: false,

            initialsComplete: false,

            effective: false,

            executionDate: "",

            effectiveDate: "",

            confidence: 0,

            supportingText: doc.analysisError,
          },

          evidence: [],

          facts: {},

          semanticEffects: {},

          transactionEvents: [],

          alerts: [
            {
              severity: "high",

              title: "Document Could Not Be Read",

              text: doc.analysisError,
            },
          ],

          recommendations: [
            "Confirm the file is not corrupted or password protected.",
          ],

          checklistUpdates: [],

          timelineUpdates: [],

          advisorSummary:
            "The document was uploaded, but RapportLink could not read its contents.",

          reviewedAt: new Date().toISOString(),

          autoApplied: false,

          autoAppliedActions: [],
        };

        try {
          await window.repoMarkAnalysisFailed(doc.id, error, {
            model: "",
          });
        } catch (repositoryError) {
          console.error(
            "Unable to save repository failure status:",
            repositoryError,
          );
        }

        renderDealPilotProgress(txn, {
          transactionId: txnId,

          documentName: file.name,

          stage: "failed",

          message:
            "I received the document, but I could not complete the review.",

          detail: doc.analysisError,

          progress: 100,
        });
      }
    }

    /*
    -------------------------------------------------------
    Every selected file has now finished.

    Rebuild once, save once, and render once.
    -------------------------------------------------------
    */

    txn.updatedAt = new Date().toISOString();

    if (typeof aiAnalyzeTransaction === "function") {
      aiAnalyzeTransaction(txn);
    } else if (typeof aiRefreshTransaction === "function") {
      aiRefreshTransaction(txn);
    }

    if (typeof txnApplyAutomation === "function") {
      txnApplyAutomation(txn);
    }

    const saved = txnSaveAll();

    if (saved === false) {
      throw new Error("The uploaded documents could not be saved.");
    }

    renderDealPilotProgress(txn, {
      transactionId: txnId,

      documentName: uploadLabel,

      stage: "complete",

      message:
        files.length === 1
          ? "Review complete. I’ve saved the source document, retained the document analysis, and updated the Transaction Brain."
          : `Review complete. I’ve saved all ${files.length} source documents, retained their analyses, and updated the Transaction Brain.`,

      detail:
        "The original files, extracted text, rendered page images, and completed AI reviews are now stored in the RapportLink Document Repository.",

      progress: 100,
    });

    /*
    -------------------------------------------------------
    Processing is finished, so normal rendering is safe.
    -------------------------------------------------------
    */

    if (typeof dealPilotClearDocumentStatus === "function") {
      dealPilotClearDocumentStatus(txnId);
    }

    txnRenderAll();
    txnOpenPanel(txnId);

    /*
     * Keep the completion message visible briefly without
     * reopening or reloading the transaction.
     */
    window.setTimeout(() => {
      removeDealPilotProgress();
    }, 1800);
  } catch (error) {
    console.error("Transaction document upload failed:", error);

    renderDealPilotProgress(txn, {
      transactionId: txnId,

      documentName: uploadLabel,

      stage: "failed",

      message: "I could not finish processing the uploaded document.",

      detail:
        error?.message || "RapportLink could not complete the document review.",

      progress: 100,
    });

    alert(
      error?.message ||
        "RapportLink could not finish processing the uploaded documents.",
    );

    window.setTimeout(() => {
      removeDealPilotProgress();

      if (typeof dealPilotClearDocumentStatus === "function") {
        dealPilotClearDocumentStatus(txnId);
      }
    }, 3500);
  } finally {
    uploadInput.disabled = false;
    uploadInput.value = "";
  }
}

function txnWorkspaceDeleteDocument(txnId, documentId) {
  const confirmed = confirm(
    "Delete this document and its AI review from the transaction?",
  );

  if (!confirmed) return;

  txnLoad();

  const txn = txnCache.find((item) => String(item.id) === String(txnId));

  if (!txn) {
    alert("Transaction could not be found.");
    return;
  }

  txn.documents = Array.isArray(txn.documents)
    ? txn.documents.filter((doc) => String(doc.id) !== String(documentId))
    : [];

  txn.aiDocumentReviews = Array.isArray(txn.aiDocumentReviews)
    ? txn.aiDocumentReviews.filter(
        (review) => String(review.documentId) !== String(documentId),
      )
    : [];

  if (
    txn.aiLatestReview &&
    String(txn.aiLatestReview.documentId) === String(documentId)
  ) {
    txn.aiLatestReview = null;
  }

  if (Array.isArray(txn.activity)) {
    txn.activity = txn.activity.filter(
      (item) =>
        !(
          item.type === "AI Document Review" &&
          String(item.documentId || "") === String(documentId)
        ),
    );
  }

  txn.lastAIAdvisorSummary = txn.aiDocumentReviews[0]?.advisorSummary || "";

  txn.lastAIReviewAt = txn.aiDocumentReviews[0]?.reviewedAt || "";

  /*
   * Rebuild the transaction only through the current
   * Transaction Brain architecture.
   *
   * Do not run the legacy Transaction Intelligence engine.
   */
  if (typeof aiRefreshTransaction === "function") {
    try {
      aiRefreshTransaction(txn);
    } catch (error) {
      console.error(
        "Transaction Brain refresh failed after document deletion:",
        error,
      );
    }
  }

  txn.updatedAt = new Date().toISOString();

  txnApplyAutomation(txn);
  txnSaveAll();
  txnRenderAll();
  txnOpenPanel(txnId);
}

function txnClosePanel() {
  const panel = document.getElementById("transactionPanel");
  if (!panel) return;

  panel.classList.remove("open");
  panel.removeAttribute("style");
}

function txnClearFilters() {
  ["txnSearch", "txnStatusFilter", "txnSideFilter", "txnRiskFilter"].forEach(
    (id) => {
      const el = document.getElementById(id);
      if (el) el.value = "";
    },
  );
  txnRenderList();
}

function txnLoadDemoData() {
  console.warn(
    "Demo transaction creation is disabled. RapportLink is using real transaction data only.",
  );

  alert(
    "Demo transactions are disabled. RapportLink will not add sample transactions.",
  );
}

document.addEventListener("DOMContentLoaded", () => {
  if (
    window.TransactionEngine &&
    typeof TransactionEngine.initialize === "function"
  ) {
    TransactionEngine.initialize();
  }
});

function txnEffectiveStatus(txn = {}) {
  /*
   * The Transaction Brain is the single source of truth.
   * Everything else is only a fallback.
   */

  if (txn.transactionBrain?.transactionState) {
    return txn.transactionBrain.transactionState;
  }

  // No fallback AI state.
  // If the Brain has not produced a decision yet,
  // report Unknown so the UI never invents one.

  return "Unknown";
}
