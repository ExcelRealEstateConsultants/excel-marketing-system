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
const TXN_STORAGE_KEY = "excelMarketingTransactionsV1";
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
  return num.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
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

function txnLoad() {
  try {
    const parsed = JSON.parse(localStorage.getItem(TXN_STORAGE_KEY) || "[]");

    txnCache = Array.isArray(parsed)
      ? parsed.map((savedTxn) => {
          const txn = { ...savedTxn };

          const documents = Array.isArray(txn.documents) ? txn.documents : [];

          const hasCurrentDocumentEvidence = documents.some((doc) => {
            if (!doc || typeof doc !== "object") {
              return false;
            }

            const analysis =
              doc.aiAnalysis && typeof doc.aiAnalysis === "object"
                ? doc.aiAnalysis
                : null;

            const evidence = Array.isArray(analysis?.evidence)
              ? analysis.evidence
              : [];

            const facts =
              analysis?.facts && typeof analysis.facts === "object"
                ? Object.keys(analysis.facts)
                : [];

            return evidence.length > 0 || facts.length > 0;
          });

          /*
           * Legacy cleanup:
           *
           * If a transaction no longer has document evidence,
           * remove values that older AI code may have copied
           * from deleted documents into the saved transaction.
           */
          if (!hasCurrentDocumentEvidence) {
            /*
             * IMPORTANT:
             *
             * No document evidence does NOT mean the transaction
             * facts are invalid.
             *
             * Transaction data entered by the user must remain.
             * The AI Brain determines confidence from evidence.
             * It must never erase transaction facts because
             * documents have not been uploaded.
             */

            txn.checklist =
              txn.checklist && typeof txn.checklist === "object"
                ? txn.checklist
                : typeof txnDefaultChecklist === "function"
                  ? txnDefaultChecklist(txn, {})
                  : {};

            /*
             * Preserve:
             * - price
             * - GCI
             * - dates
             * - commission
             * - parties
             * - transaction details
             *
             * Missing documents are handled by AI reasoning,
             * not by deleting transaction information.
             */
          }

          /*
           * Remove previously generated automation tasks
           * because they may be based on the cleared dates
           * or deleted document conclusions.
           */
          txn.automationTasks = Array.isArray(txn.automationTasks)
            ? txn.automationTasks.filter(
                (task) => task && task.source === "Manual",
              )
            : [];

          /*
           * Remove all previously saved AI conclusions.
           *
           * These must be rebuilt from the transaction's
           * current evidence every time transactions load.
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

          delete txn.completion;
          delete txn.progress;
          delete txn.checklistCompleted;

          delete txn.alerts;
          delete txn.priorities;
          delete txn.recommendations;
          delete txn.missingItems;
          delete txn.missingDocuments;
          delete txn.missingFields;
          delete txn.reasoning;

          /*
           * Rebuild workflow automation from the cleaned
           * transaction data.
           */
          let refreshedTxn =
            typeof txnApplyAutomation === "function"
              ? txnApplyAutomation(txn)
              : txn;

          /*
           * Rebuild the Transaction Brain and Coordinator
           * from the current transaction information.
           */
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

          return refreshedTxn;
        })
      : [];
  } catch (error) {
    console.error("Unable to load transactions:", error);
    txnCache = [];
  }

  return txnCache;
}

function txnSaveAll() {
  try {
    localStorage.setItem(TXN_STORAGE_KEY, JSON.stringify(txnCache));

    return true;
  } catch (err) {
    console.error("Transaction storage limit reached:", err);
  }

  /*
  -------------------------------------------------------
  Browser-storage fallback

  Save a smaller COPY to localStorage, but do not replace
  the live txnCache objects while documents are processing.
  -------------------------------------------------------
  */

  const storageSafeTransactions = txnCache.map((txn) => ({
    ...txn,

    documents: Array.isArray(txn.documents)
      ? txn.documents.map((doc) => ({
          id: doc.id,

          name: doc.name,

          type: doc.type || "file",

          size: doc.size || 0,

          uploadedAt: doc.uploadedAt || "",

          storage: "AI analysis retained - original file not stored in browser",

          /*
          -------------------------------------------------
          Large file content is not stored in localStorage.
          -------------------------------------------------
          */

          data: "",
          text: "",
          extractedText: "",

          /*
          -------------------------------------------------
          Preserve extraction metadata.
          -------------------------------------------------
          */

          extraction: doc.extraction
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
          -------------------------------------------------
          Preserve AI analysis and evidence.
          -------------------------------------------------
          */

          aiAnalysis:
            doc.aiAnalysis && typeof doc.aiAnalysis === "object"
              ? doc.aiAnalysis
              : null,

          engineVersion: Number(doc.engineVersion || 0),

          lastAnalyzed: doc.lastAnalyzed || "",

          analysisStatus: doc.analysisStatus || "",
        }))
      : [],
  }));

  try {
    localStorage.setItem(
      TXN_STORAGE_KEY,
      JSON.stringify(storageSafeTransactions),
    );

    /*
    IMPORTANT:

    Do not assign storageSafeTransactions back to txnCache.

    The live objects must remain intact while document
    extraction and AI analysis are still running.
    */

    console.warn(
      "RapportLink saved a reduced browser-storage copy while preserving the live transaction data in memory.",
    );

    return true;
  } catch (fallbackError) {
    console.error("Transaction fallback storage also failed:", fallbackError);

    alert(
      "RapportLink could not save the transaction because browser storage is full.",
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

  TXN_AUTOMATION_RULES.forEach((rule) => {
    if (rule.checklist && checklist[rule.checklist]) return;
    if (txn.autoCreateDates === false) return;
    const due = txnAddDays(txn[rule.field], rule.offset || 0);
    if (!due) return;
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

  const transactionState =
    txn.transactionBrain?.transactionState ||
    txn.aiCoordinator?.transactionState ||
    "";

  if (
    txn.autoCreateDocs !== false &&
    (transactionState === "Active" || transactionState === "Pending")
  ) {
    TXN_REQUIRED_DOC_RULES.forEach((rule) => {
      if (txnDocKeywordFound(txn, rule.keyword)) return;

      const due = txn.contractDate || txn.closeDate || todayKey();
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

  return tasks.sort((a, b) => {
    const priorityWeight = { High: 3, Normal: 2, Low: 1 };
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
  const manual = Number(txn.gci || 0);
  if (manual > 0) return manual;
  const price = Number(txn.price || 0);
  const pct = Number(txn.commissionPercent || 0);
  return Math.round(price * (pct / 100));
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

function txnInit() {
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
    String(
      txn?.transactionBrain?.transactionState ||
        txn?.aiCoordinator?.transactionState ||
        txn?.aiTransactionIntelligence?.transactionState ||
        "Unknown",
    )
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

  const intelligence =
    txn?.aiTransactionIntelligence &&
    typeof txn.aiTransactionIntelligence === "object"
      ? txn.aiTransactionIntelligence
      : {};

  const effectiveStatus = brain?.transactionState || "Unknown";

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
    intelligence?.transactionCompletion,
    intelligence?.completionPercentage,
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
    canonicalFacts.actualClosingDate ||
    brain?.actualClosingDate ||
    txn?.actualClosingDate ||
    canonicalFacts.closingDate ||
    brain?.closingDate ||
    txn?.closeDate ||
    txn?.closingDate ||
    "";

  const authoritativePurchasePrice = firstPositiveNumber(
    canonicalFacts.purchasePrice,
    canonicalFacts.listPrice,
    canonicalFacts.listingPrice,
    brain?.purchasePrice,
    brain?.listPrice,
    brain?.listingPrice,
    txn?.purchasePrice,
    txn?.price,
    txn?.listPrice,
    txn?.listingPrice,
    txn?.askingPrice,
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
    intelligence?.finalGci,
    intelligence?.expectedGci,
    txn?.finalGci,
    txn?.expectedGci,
    txn?.expectedGCI,
    txn?.gci,
    txn?.commission,
    txn?.expectedCommission,
  );

  if (authoritativeGci === null && typeof txnGci === "function") {
    authoritativeGci = firstPositiveNumber(
      txnGci({
        ...txn,
        price:
          authoritativePurchasePrice ||
          firstPositiveNumber(txn?.price, txn?.purchasePrice, txn?.listPrice) ||
          0,
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

  const gciLabel = isClosed ? "Final GCI" : "Expected GCI";

  const riskLevel = String(
    brain?.riskLevel ||
      brain?.risk?.level ||
      brain?.decision?.riskLevel ||
      coordinator?.riskLevel ||
      intelligence?.riskLevel ||
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

  if (statusFilter) {
    list = list.filter((txn) => txn.status === statusFilter);
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
        id: Date.now() + Math.floor(Math.random() * 100000),
        name: file.name,
        type: file.type || "file",
        size: file.size || 0,
        provider: "Local File",
        storage: "Browser Storage",
        uploadedAt: new Date().toISOString(),
        data: "",
        text: "",
        extractedText: "",
        extraction: {
          method: "pending",
          pages: 0,
          warnings: [],
        },
        ai: {},
        aiAnalysis: null,
        analysisStatus: "Reading document",
      };

      txnWorkingDocs.push(doc);
      txnRenderDocumentList();

      try {
        doc.data = "";

        if (typeof window.aiExtractDocumentText !== "function") {
          throw new Error("AI Extraction Engine is not available.");
        }

        const extraction = await window.aiExtractDocumentText(file);

        doc.text = String(extraction?.text || "");
        doc.extractedText = doc.text;

        doc.extraction = {
          method: extraction?.method || "none",
          pages: Number(extraction?.pages || 0),
          warnings: Array.isArray(extraction?.warnings)
            ? extraction.warnings
            : [],
          extractedAt: extraction?.extractedAt || new Date().toISOString(),
        };

        if (!doc.text.trim()) {
          throw new Error(
            "RapportLink could not extract readable text from this document.",
          );
        }

        doc.analysisStatus = "Document read";
        txnRenderDocumentList();

        if (typeof txnAnalyzeDocumentWithUniversalAI !== "function") {
          throw new Error("Universal Document Intelligence is not available.");
        }

        const txn =
          typeof txnReadTransactionForm === "function"
            ? txnReadTransactionForm(false)
            : {};

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
        doc.analysisModel = analysis.model || "";
        doc.lastAnalyzed = analysis.reviewedAt || new Date().toISOString();
        doc.analysisStatus = "AI review complete";

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
  const existing = txnCache.find((t) => String(t.id) === String(id));

  txn.createdAt = existing?.createdAt || new Date().toISOString();
  txn.updatedAt = new Date().toISOString();

  txn.automationTasks = Array.isArray(existing?.automationTasks)
    ? existing.automationTasks
    : [];

  txnApplyAutomation(txn);

  if (!txn.address) {
    alert("Please enter a property address.");
    return;
  }

  const idx = txnCache.findIndex((t) => String(t.id) === String(id));

  if (idx >= 0) txnCache[idx] = txn;
  else txnCache.unshift(txn);

  txnSaveAll();

  if (typeof txnSyncTransactionRelationships === "function") {
    txnSyncTransactionRelationships(txn);
  }

  document.getElementById("transactionFormCard").style.display = "none";

  txnRenderAll();
  renderContactTransactions();
  loadCalendar();

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
      aiRefreshTransaction(txn);
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

  if (!documentText) {
    throw new Error(
      "RapportLink cannot analyze this document because no readable text was extracted.",
    );
  }

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
        name: doc.name || "Uploaded Document",
        type: doc.type || "",
        text: documentText,
        extractedText: documentText,
        extraction: doc.extraction || {},
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

  const universalAnalysis = result.analysis;

  /*
  ---------------------------------------------------------
  Normalize Universal AI output for the Transaction Brain.

  The full Universal analysis is preserved, while the
  compatibility fields allow the existing Brain to consume
  the evidence during the architecture transition.
  ---------------------------------------------------------
  */

  const normalizeConfidence = (value) => {
    const number = Number(value || 0);

    if (number > 0 && number <= 1) {
      return Math.round(number * 100);
    }

    return Math.max(0, Math.min(100, Math.round(number)));
  };

  const normalizeFacts = (facts) => {
    if (!Array.isArray(facts)) {
      return facts && typeof facts === "object" ? facts : {};
    }

    return facts.reduce((output, item) => {
      if (!item || !item.name) return output;

      output[item.name] = item.value;

      return output;
    }, {});
  };

  const evidence = Array.isArray(universalAnalysis.evidence)
    ? universalAnalysis.evidence.map((item) => ({
        ...item,

        confidence: normalizeConfidence(item.confidence),

        facts: normalizeFacts(item.facts),

        sourceDocumentId:
          item.sourceDocumentId ||
          universalAnalysis.sourceDocumentId ||
          doc.id ||
          null,

        sourceDocument:
          item.sourceDocument ||
          universalAnalysis.sourceDocument ||
          doc.name ||
          "Uploaded Document",
      }))
    : [];

  return {
    ...universalAnalysis,

    engine: "RapportLink Universal Document Engine",

    engineVersion: Number(universalAnalysis.engineVersion || 1),

    documentId: doc.id || universalAnalysis.sourceDocumentId || null,

    documentName:
      doc.name || universalAnalysis.sourceDocument || "Uploaded Document",

    documentType: universalAnalysis.classification?.documentType || "Unknown",

    documentTypes: [
      universalAnalysis.classification?.documentType || "Unknown",
    ],

    confidence: normalizeConfidence(
      universalAnalysis.classification?.confidence,
    ),

    evidence,

    advisorSummary:
      universalAnalysis.summary ||
      "RapportLink completed its AI review of this document.",

    reviewedAt: universalAnalysis.reviewedAt || new Date().toISOString(),

    universalAnalysis,
  };
}

async function txnWorkspaceUploadDocuments(txnId, event) {
  const files = Array.from(event.target.files || []);

  if (!files.length) return;

  const uploadInput = event.target;
  uploadInput.disabled = true;

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

  try {
    for (const file of files) {
      const doc = {
        id: Date.now() + Math.floor(Math.random() * 100000),
        name: file.name,
        type: file.type || "file",
        size: file.size || 0,

        data: "",
        text: "",
        extractedText: "",

        uploadedAt: new Date().toISOString(),

        storage: TXN_DOC_STORAGE_NOTICE,

        extraction: {
          method: "pending",
          pages: 0,
          warnings: [],
        },

        aiAnalysis: null,

        engineVersion: 0,

        analysisStatus: "Reading document",
      };

      txn.documents.push(doc);
      txn.updatedAt = new Date().toISOString();

      /*
      ---------------------------------------------------
      IMPORTANT

      Do not call txnRenderAll(), txnOpenPanel(), or
      txnLoad() while extraction is running.

      Those functions reload txnCache and disconnect the
      live document object being processed.
      ---------------------------------------------------
      */

      try {
        if (typeof window.aiExtractDocumentText !== "function") {
          throw new Error("AI Extraction Engine is not available.");
        }

        const extraction = await window.aiExtractDocumentText(file);

        doc.text = String(extraction?.text || "");
        doc.extractedText = doc.text;

        doc.extraction = {
          method: extraction?.method || "none",

          pages: Number(extraction?.pages || 0),

          warnings: Array.isArray(extraction?.warnings)
            ? extraction.warnings
            : [],

          extractedAt: extraction?.extractedAt || new Date().toISOString(),
        };

        console.log(`Extracted ${doc.text.length} characters from ${doc.name}`);

        doc.analysisStatus = doc.text.trim()
          ? "Document read"
          : "No readable text found";

        if (typeof txnAnalyzeDocumentWithUniversalAI !== "function") {
          throw new Error("Universal Document Engine is not available.");
        }

        const analysis = await txnAnalyzeDocumentWithUniversalAI(txn, doc);

        doc.aiAnalysis = analysis;

        console.log("AI ANALYSIS", {
          documentType: analysis.documentType,
          documentTypes: analysis.documentTypes,

          transactionEffect: analysis.classification?.transactionEffect || "",

          semanticEffects: analysis.semanticEffects || null,

          transactionEvents: Array.isArray(analysis.transactionEvents)
            ? analysis.transactionEvents
            : [],

          evidenceTypes: Array.isArray(analysis.evidence)
            ? analysis.evidence.map((item) => item.type)
            : [],

          evidence: analysis.evidence,
        });

        doc.engineVersion = analysis.engineVersion || null;

        doc.lastAnalyzed = new Date().toISOString();

        if (typeof aiRefreshTransaction === "function") {
          aiRefreshTransaction(txn);
        }

        if (typeof window.aiAdvisorDocumentAnalysis === "function") {
          window.aiAdvisorDocumentAnalysis(txn, doc, doc.aiAnalysis);
        }

        doc.analysisStatus = "AI review complete";
      } catch (err) {
        console.error(`Document processing failed for ${file.name}:`, err);

        doc.analysisStatus = "Review failed";

        doc.extraction = doc.extraction || {
          method: "failed",
          pages: 0,
          warnings: [],
        };

        doc.extraction.method =
          doc.extraction.method === "pending"
            ? "failed"
            : doc.extraction.method;

        doc.extraction.warnings = [
          ...(doc.extraction.warnings || []),

          err?.message || "The document could not be processed.",
        ];

        doc.aiAnalysis = {
          engineVersion: null,

          documentId: doc.id,
          documentName: doc.name,

          documentType: "Document Review Failed",
          documentTypes: ["Document Review Failed"],

          confidence: 0,

          evidence: [],
          facts: {},

          alerts: [
            {
              severity: "high",
              title: "Document Could Not Be Read",
              text:
                err?.message ||
                "RapportLink could not read this uploaded document.",
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
      }

      /*
      ---------------------------------------------------
      Save and render only after extraction and analysis
      are completely finished.
      ---------------------------------------------------
      */

      txn.updatedAt = new Date().toISOString();

      if (typeof txnApplyAutomation === "function") {
        txnApplyAutomation(txn);
      }

      txnSaveAll();
      txnRenderAll();
      txnOpenPanel(txnId);
    }
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

  if (txn.aiCoordinator?.transactionState) {
    return txn.aiCoordinator.transactionState;
  }

  return txn.status || "Active";
}
