/* =====================================================
   RapportLink Transaction Workspace
   Version 2
   ===================================================== */

console.log("Transaction Workspace Loaded");

function renderTransactionWorkspace(txn, data = {}) {
  const {
    alerts = [],
    checklist = {},
    docs = [],
    progress = 0,
    healthScore = 0,
    closingProbability = 0,
  } = data;

  const ai =
    typeof txnRunCoordinator === "function"
      ? txnRunCoordinator(txn, {
          ...data,
          checklist,
          docs,
        })
      : {
          transactionHealth: healthScore,
          closingProbability,
          riskLevel: "Watch",
          alerts,
          priorities: [],
          recommendations: [],
          tasks: [],
        };

  return `
    ${renderTransactionWorkspaceHeader(txn)}

    <div style="padding:24px 28px;">

      <div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:24px;">
        <button id="txnWorkspaceBtn_overview" class="btn btn-sm btn-success txn-workspace-tab-button" onclick="txnWorkspaceShowTab('overview')">Overview</button>
        <button id="txnWorkspaceBtn_people" class="btn btn-sm btn-outline-secondary txn-workspace-tab-button" onclick="txnWorkspaceShowTab('people')">People & Vendors</button>
        <button id="txnWorkspaceBtn_dates" class="btn btn-sm btn-outline-secondary txn-workspace-tab-button" onclick="txnWorkspaceShowTab('dates')">Dates & Tasks</button>
        <button id="txnWorkspaceBtn_documents" class="btn btn-sm btn-outline-secondary txn-workspace-tab-button" onclick="txnWorkspaceShowTab('documents')">Documents</button>
        <button id="txnWorkspaceBtn_checklist" class="btn btn-sm btn-outline-secondary txn-workspace-tab-button" onclick="txnWorkspaceShowTab('checklist')">Checklist</button>
        <button id="txnWorkspaceBtn_notes" class="btn btn-sm btn-outline-secondary txn-workspace-tab-button" onclick="txnWorkspaceShowTab('notes')">Notes & Activity</button>
      </div>

      <div id="txnWorkspaceTab_overview" class="txn-workspace-tab-panel">

        ${renderTransactionWorkspaceKPIs(txn, {
          progress,
          healthScore,
          closingProbability,
          ai,
        })}

        ${renderTransactionWorkspaceOverview(txn, {
          ai,
        })}

      </div>

      <div id="txnWorkspaceTab_people" class="txn-workspace-tab-panel" style="display:none;">
        ${renderTransactionWorkspacePeople(txn)}
      </div>

      <div id="txnWorkspaceTab_dates" class="txn-workspace-tab-panel" style="display:none;">
        ${renderTransactionWorkspaceDatesAndTasks(txn)}
      </div>

      <div id="txnWorkspaceTab_documents" class="txn-workspace-tab-panel" style="display:none;">
        ${renderTransactionWorkspaceDocuments(txn, docs)}
      </div>

      <div id="txnWorkspaceTab_checklist" class="txn-workspace-tab-panel" style="display:none;">
        ${renderTransactionWorkspaceChecklist(txn, checklist)}
      </div>

      <div id="txnWorkspaceTab_notes" class="txn-workspace-tab-panel" style="display:none;">
        ${renderTransactionWorkspaceNotesActivity(txn)}
      </div>

    </div>
  `;
}

function renderTransactionWorkspaceHeader(txn) {
  const brain =
    txn?.transactionBrain || txn?.aiTransactionBrain || txn?.brain || null;

  const canonicalFacts =
    brain?.canonicalFacts && typeof brain.canonicalFacts === "object"
      ? brain.canonicalFacts
      : {};

  const transactionState =
    brain?.transactionState ||
    txn?.aiCoordinator?.transactionState ||
    txn?.aiTransactionIntelligence?.transactionState ||
    "Unknown";

  const isClosed = String(transactionState).toLowerCase() === "closed";

  const purchasePrice =
    canonicalFacts.purchasePrice !== undefined &&
    canonicalFacts.purchasePrice !== null &&
    canonicalFacts.purchasePrice !== ""
      ? Number(canonicalFacts.purchasePrice)
      : null;

  const hasPurchasePrice = Number.isFinite(purchasePrice) && purchasePrice > 0;

  let gci = null;

  if (hasPurchasePrice && typeof txnGci === "function") {
    const calculatedGci = Number(
      txnGci({
        ...txn,
        price: purchasePrice,
      }),
    );

    if (Number.isFinite(calculatedGci) && calculatedGci >= 0) {
      gci = calculatedGci;
    }
  }

  const purchasePriceDisplay = hasPurchasePrice ? txnMoney(purchasePrice) : "—";

  const gciDisplay = gci !== null ? txnMoney(gci) : "—";

  return `
    <div style="
      background:#042C49;
      color:#fff;
      padding:22px 28px;
      border-radius:18px 18px 0 0;
      display:flex;
      justify-content:space-between;
      align-items:center;
      flex-wrap:wrap;
      gap:18px;
    ">

      <div>
        <div style="font-size:30px;font-weight:800;">
          Transaction Workspace
        </div>

        <div style="font-size:22px;font-weight:700;margin-top:6px;">
          ${txnSafe(txn.address || "Untitled Transaction")}
        </div>

        <div style="margin-top:6px;color:#D8E6F3;font-size:15px;">
          ${txnSafe(txn.side || "—")}
          •
          ${txnSafe(transactionState)}
          •
          ${purchasePriceDisplay}
          •
          ${isClosed ? "Final GCI" : "Expected GCI"}
          ${gciDisplay}
        </div>
      </div>

      <div>
        <button
          class="btn btn-light"
          onclick="txnClosePanel()">
          Back to Transactions
        </button>
      </div>

    </div>
  `;
}

function renderTransactionWorkspaceKPIs(txn, data = {}) {
  const { ai = null } = data;

  /*
   * The Transaction Brain is the authoritative source
   * for current transaction facts and AI conclusions.
   */

  const brain =
    txn?.transactionBrain || txn?.aiTransactionBrain || txn?.brain || null;

  const canonicalFacts =
    brain?.canonicalFacts && typeof brain.canonicalFacts === "object"
      ? brain.canonicalFacts
      : {};

  const transactionState =
    typeof ai?.transactionState === "string" &&
    ai.transactionState.trim() !== ""
      ? ai.transactionState.trim()
      : typeof brain?.transactionState === "string" &&
          brain.transactionState.trim() !== ""
        ? brain.transactionState.trim()
        : "Unknown";

  const normalizedState = transactionState.toLowerCase();

  const isClosed = normalizedState === "closed";
  const isCancelled = normalizedState === "cancelled";

  const validPercent = (value) =>
    typeof value === "number" &&
    Number.isFinite(value) &&
    value >= 0 &&
    value <= 100;

  const displayPercent = (value) =>
    validPercent(value) ? `${Math.round(value)}%` : "Unknown";

  /*
   * Completion must come from the Brain or Coordinator.
   * Do not use the separately calculated workspace progress.
   */

  const completionCandidates = [
    ai?.transactionCompletion,
    ai?.completion,
    brain?.transactionCompletion,
    brain?.completion,
  ];

  const authoritativeCompletion = completionCandidates.find(validPercent);

  const transactionHealth = validPercent(ai?.transactionHealth)
    ? ai.transactionHealth
    : validPercent(brain?.health)
      ? brain.health
      : null;

  const closingConfidence = validPercent(ai?.closingProbability)
    ? ai.closingProbability
    : validPercent(brain?.confidence)
      ? brain.confidence
      : null;

  /*
   * Authoritative current facts.
   *
   * These values come only from reconciled document evidence.
   */

  const authoritativePurchasePrice =
    canonicalFacts.purchasePrice !== undefined &&
    canonicalFacts.purchasePrice !== null &&
    canonicalFacts.purchasePrice !== ""
      ? Number(canonicalFacts.purchasePrice)
      : null;

  const authoritativeClosingDate =
    canonicalFacts.actualClosingDate || canonicalFacts.closingDate || "";

  const hasPurchasePrice =
    Number.isFinite(authoritativePurchasePrice) &&
    authoritativePurchasePrice > 0;

  const hasClosingDate = Boolean(authoritativeClosingDate);

  /*
   * Expected GCI may use the transaction's commission configuration,
   * but its purchase price must be the authoritative Brain price.
   */

  let authoritativeGci = null;

  if (hasPurchasePrice && typeof txnGci === "function") {
    const gciValue = Number(
      txnGci({
        ...txn,
        price: authoritativePurchasePrice,
      }),
    );

    if (Number.isFinite(gciValue) && gciValue >= 0) {
      authoritativeGci = gciValue;
    }
  }

  /*
   * Closing-date display and timing.
   */

  const daysFromClosing = hasClosingDate
    ? txnDaysUntil(authoritativeClosingDate)
    : 9999;

  let dateHeading = "Estimated Closing";
  let dateValue = hasClosingDate
    ? txnDate(authoritativeClosingDate) || "Date not confirmed"
    : "Not established";

  if (isClosed) {
    dateHeading = "Closed";
    dateValue = hasClosingDate
      ? txnDate(authoritativeClosingDate) || "Date not confirmed"
      : "Date not confirmed";
  } else if (isCancelled) {
    dateHeading = "Transaction Status";
    dateValue = "Cancelled";
  }

  let timingNumber = daysFromClosing === 9999 ? "—" : daysFromClosing;
  let timingLabel = "Days Remaining";

  if (isClosed) {
    if (daysFromClosing === 9999) {
      timingNumber = "—";
      timingLabel = "Closing Date";
    } else if (daysFromClosing < 0) {
      timingNumber = Math.abs(daysFromClosing);
      timingLabel =
        Math.abs(daysFromClosing) === 1
          ? "Day Since Closing"
          : "Days Since Closing";
    } else if (daysFromClosing === 0) {
      timingNumber = "Today";
      timingLabel = "Closing Completed";
    } else {
      timingNumber = daysFromClosing;
      timingLabel =
        daysFromClosing === 1
          ? "Day Until Closing Date"
          : "Days Until Closing Date";
    }
  } else if (isCancelled) {
    timingNumber = "—";
    timingLabel = "Active Deadlines";
  }

  const gciLabel = isClosed ? "Final GCI" : "Expected GCI";

  const progressText = validPercent(authoritativeCompletion)
    ? `${Math.round(authoritativeCompletion)}%`
    : "Unknown";

  const progressWidth = validPercent(authoritativeCompletion)
    ? Math.max(0, Math.min(100, authoritativeCompletion))
    : 0;

  const purchasePriceDisplay = hasPurchasePrice
    ? txnMoney(authoritativePurchasePrice)
    : "—";

  const gciDisplay =
    authoritativeGci !== null ? txnMoney(authoritativeGci) : "—";

  return `
    <div style="margin-bottom:26px;">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
        <div style="font-size:18px;font-weight:800;color:#042C49;">
          Transaction Completion
        </div>

        <div style="font-size:26px;font-weight:900;color:#00A143;">
          ${progressText}
        </div>
      </div>

      <div class="transaction-progress-wrap">
        <div
          class="transaction-progress-fill"
          style="width:${progressWidth}%"
        ></div>
      </div>

      <div style="margin-top:10px;display:flex;justify-content:space-between;font-size:14px;color:#6B7280;">
        <div>
          ${dateHeading}
          <b style="color:#042C49;">${dateValue}</b>
        </div>

        <div>
          ${
            validPercent(authoritativeCompletion)
              ? `${Math.round(authoritativeCompletion)}% Complete`
              : "Completion not established"
          }
        </div>
      </div>
    </div>

    <div class="transaction-workspace-kpis">
      <div class="transaction-workspace-kpi">
        <div class="kpi-number">
          ${displayPercent(transactionHealth)}
        </div>
        <div class="kpi-label">Transaction Health</div>
      </div>

      <div class="transaction-workspace-kpi">
        <div class="kpi-number">
          ${displayPercent(closingConfidence)}
        </div>
        <div class="kpi-label">Closing Confidence</div>
      </div>

      <div class="transaction-workspace-kpi">
        <div class="kpi-number">${timingNumber}</div>
        <div class="kpi-label">${timingLabel}</div>
      </div>

      <div class="transaction-workspace-kpi">
        <div class="kpi-number">${gciDisplay}</div>
        <div class="kpi-label">${gciLabel}</div>
      </div>

      <div class="transaction-workspace-kpi">
        <div class="kpi-number">${purchasePriceDisplay}</div>
        <div class="kpi-label">Purchase Price</div>
      </div>
    </div>
  `;
}

function renderTransactionWorkspaceOverview(txn, data = {}) {
  const ai = data.ai || {
    transactionHealth: data.healthScore || 0,
    closingProbability: data.closingProbability || 0,
    riskLevel: "Watch",
    alerts: data.alerts || [],
    priorities: [],
    recommendations: [
      "Continue monitoring upcoming deadlines and maintain communication with all parties.",
    ],
  };

  return `
    ${
      typeof aiAdvisorLatestReviewCard === "function"
        ? aiAdvisorLatestReviewCard(txn)
        : ""
    }

    <div class="section">
      ${
        typeof dealPilotBuildBriefing === "function"
          ? dealPilotBuildBriefing(txn, ai)
          : typeof txnBuildDailyBriefing === "function"
            ? txnBuildDailyBriefing(txn, ai)
            : `
              <div class="modern-card" style="padding:24px;">
                <b>AI Advisor</b><br><br>
                AI Transaction Coordinator is loading...
              </div>
            `
      }
    </div>
  `;
}

function renderTransactionWorkspacePeople(txn) {
  const parties = Array.isArray(txn.parties) ? txn.parties : [];

  return `
    <div class="section">

      <div class="d-flex justify-content-between align-items-center gap-2 flex-wrap mb-3">

        <div>
          <h5 style="margin-bottom:4px;">People & Vendors</h5>
          <div class="small-muted">
            Buyer, seller, lender, title, and additional transaction parties.
          </div>
        </div>

        <button
          class="btn btn-sm btn-success"
          onclick="txnEditFromWorkspace('${txn.id}')">
          Edit Details
        </button>

      </div>

      <div class="transaction-meta-grid">

        ${txnPartyPanelHtml(txn, "buyer")}

        ${txnPartyPanelHtml(txn, "seller")}

        ${txnPartyPanelHtml(txn, "lender")}

        ${txnPartyPanelHtml(txn, "title")}

      </div>

      <div class="mt-4">

        <div class="feature-title mb-2">
          Additional Parties & Vendors
        </div>

        ${
          parties.length
            ? parties
                .map(
                  (party) => `
                    <div class="transaction-doc-row">

                      <div>

                        <b>${txnSafe(party.role || "Party / Vendor")}</b><br>

                        <small>
                          ${txnSafe(party.name || party.company || "Unnamed")}
                          ${party.company && party.name ? " • " + txnSafe(party.company) : ""}
                          ${party.email ? " • " + txnSafe(party.email) : ""}
                          ${party.phone ? " • " + txnSafe(formatPhone(party.phone)) : ""}
                        </small>

                        ${
                          party.notes
                            ? `<br><small>${txnSafe(party.notes)}</small>`
                            : ""
                        }

                      </div>

                      <div>

                        ${
                          party.contactId
                            ? `
                              <button
                                class="btn btn-sm btn-success"
                                onclick="txnOpenLinkedContact('${party.contactId}')">
                                Open Contact
                              </button>
                            `
                            : `
                              <button
                                class="btn btn-sm btn-outline-secondary"
                                onclick="txnEditFromWorkspace('${txn.id}')">
                                Link Contact
                              </button>
                            `
                        }

                      </div>

                    </div>
                  `,
                )
                .join("")
            : `<div class="small-muted">
                No additional parties or vendors added yet.
              </div>`
        }

      </div>

    </div>
  `;
}

function renderTransactionWorkspaceDatesAndTasks(txn) {
  return `
    <div class="section">
      <h5>Critical Dates</h5>

      <div class="transaction-meta-grid">
        <div class="transaction-meta-box"><div class="small-muted">Contract</div><b>${txnDate(txn.contractDate) || "—"}</b></div>
        <div class="transaction-meta-box"><div class="small-muted">EMD</div><b>${txnDate(txn.emdDue) || "—"}</b></div>
        <div class="transaction-meta-box"><div class="small-muted">Inspection</div><b>${txnDate(txn.inspectionDate) || "—"}</b></div>
        <div class="transaction-meta-box"><div class="small-muted">Appraisal</div><b>${txnDate(txn.appraisalDate) || "—"}</b></div>
        <div class="transaction-meta-box"><div class="small-muted">Loan</div><b>${txnDate(txn.loanDate) || "—"}</b></div>
        <div class="transaction-meta-box"><div class="small-muted">Walkthrough</div><b>${txnDate(txn.walkthroughDate) || "—"}</b></div>
        <div class="transaction-meta-box"><div class="small-muted">Closing</div><b>${txnDate(txn.closeDate) || "—"}</b></div>
      </div>
    </div>

    <div class="section">
      <h5>Search Transaction Calendar</h5>
      <div class="small-muted mb-2">Search milestones and calendar items for this transaction.</div>

      <input
        class="form-control"
        placeholder="Search EMD, inspection, appraisal, loan, walkthrough, closing..."
        oninput="txnSearchTransactionMilestones('${txn.id}', this.value)"
      >

      <div id="txnMilestoneSearchResults_${txn.id}" class="mt-3 small-muted">
        Start typing to search this transaction's milestones.
      </div>
    </div>

    <div class="section">
      <h5>AI Automated Action Items</h5>
      ${txnRenderAutomationTasks(txn)}
    </div>
  `;
}

function renderTransactionWorkspaceDocuments(txn, docs = []) {
  const latestReview = txn.aiLatestReview
    ? txn.aiLatestReview.analysis
      ? txn.aiLatestReview
      : {
          documentId: txn.aiLatestReview.documentId || null,
          documentName: txn.aiLatestReview.documentName || "",
          reviewedAt: txn.aiLatestReview.reviewedAt || "",
          analysis: txn.aiLatestReview,
        }
    : null;

  return `
    <div class="section">

      ${
        latestReview
          ? `
            <div style="
              background:#F8FFFB;
              border:2px solid #00A143;
              border-radius:18px;
              padding:24px;
              margin-bottom:24px;
              box-shadow:0 8px 24px rgba(4,44,73,.08);
            ">

              <div style="
                color:#00A143;
                font-size:13px;
                font-weight:900;
                letter-spacing:.08em;
                text-transform:uppercase;
              ">
                AI Advisor
              </div>

              <div style="
                font-size:28px;
                font-weight:900;
                color:#042C49;
                margin-top:6px;
              ">
                New Document Reviewed
              </div>

              <div style="
                margin-top:18px;
                font-size:18px;
              ">
                <b>${txnSafe(latestReview.analysis.type || "Document")}</b>

                <span style="
                  margin-left:10px;
                  color:#64748B;
                ">
                  Confidence ${latestReview.analysis.confidence || 0}%
                </span>
              </div>

              <div style="
                margin-top:18px;
                line-height:1.75;
                color:#334155;
              ">
                ${txnSafe(
                  latestReview.analysis.advisorSummary ||
                    "I've finished reviewing your document.",
                )}
              </div>

              ${
                Array.isArray(latestReview.analysis.recommendations)
                  ? `
                    <div style="
                      margin-top:22px;
                      font-weight:800;
                      color:#042C49;
                    ">
                      My Recommendations
                    </div>

                    <ul style="
                      margin-top:10px;
                      line-height:1.9;
                      color:#334155;
                    ">
                      ${latestReview.analysis.recommendations
                        .map((r) => `<li>${txnSafe(r)}</li>`)
                        .join("")}
                    </ul>
                  `
                  : ""
              }

              <div style="
                display:flex;
                gap:10px;
                flex-wrap:wrap;
                margin-top:22px;
              ">

                <button
                  class="btn btn-success"
                  onclick="aiAdvisorApplyRecommendations('${txn.id}')">
                  Apply Recommendations
                </button>

                <button
                  class="btn btn-outline-primary"
                  onclick="txnWorkspaceShowTab('documents')">
                  Review Document
                </button>

                <button
                  class="btn btn-outline-secondary"
                  onclick="
                    delete txnCache.find(t=>String(t.id)==='${txn.id}').aiLatestReview;
                    txnSaveAll();
                    txnOpenPanel('${txn.id}');
                  ">
                  Dismiss
                </button>

              </div>

            </div>
          `
          : ""
      }

      <div class="d-flex justify-content-between align-items-center gap-2 flex-wrap mb-3">

        <div>
          <h5 style="margin-bottom:4px;">Documents</h5>
          <div class="small-muted">
            Upload, manage, and review transaction documents.
          </div>
        </div>

        <div>

          <input
            type="file"
            id="txnWorkspaceDocUpload_${txn.id}"
            multiple
            style="display:none;"
            onchange="txnWorkspaceUploadDocuments('${txn.id}', event)"
          >

          <button
            class="btn btn-sm btn-success"
            onclick="document.getElementById('txnWorkspaceDocUpload_${txn.id}').click()">
            Upload Documents
          </button>

        </div>

      </div>

      ${
        docs.length
          ? docs
              .map(
                (doc) => `
                  <div class="transaction-doc-row">

                    <div>

                      <b>${txnSafe(doc.name)}</b><br>

                      <small>
                        ${txnDate(doc.uploadedAt)}
                        •
                        ${Math.round((doc.size || 0) / 1024)} KB
                      </small>

                    </div>

                    <div style="display:flex;gap:8px;flex-wrap:wrap;">
  ${
    doc.data
      ? `
        <a
          class="btn btn-sm btn-outline-primary"
          href="${doc.data}"
          download="${txnSafe(doc.name)}">
          Download
        </a>
      `
      : ""
  }

  <button
    type="button"
    class="btn btn-sm btn-outline-danger"
    onclick="txnWorkspaceDeleteDocument('${txn.id}', '${doc.id}')">
    Delete
  </button>
</div>

                  </div>
                `,
              )
              .join("")
          : `
            <div class="small-muted">
              No documents uploaded.
            </div>
          `
      }

    </div>
  `;
}

function renderTransactionWorkspaceChecklist(txn, checklist = {}) {
  /*
   * Always preserve the checklist values saved directly
   * on this transaction.
   *
   * The normalized checklist passed by the workspace may use
   * different workflow item names and must not erase or hide
   * the user's saved checkbox selections.
   */
  const savedChecklist =
    txn?.checklist &&
    typeof txn.checklist === "object" &&
    !Array.isArray(txn.checklist)
      ? txn.checklist
      : {};

  const providedChecklist =
    checklist && typeof checklist === "object" && !Array.isArray(checklist)
      ? checklist
      : {};

  const activeChecklist = {
    ...providedChecklist,
    ...savedChecklist,
  };

  const configuredItems = Array.isArray(window.TXN_CHECKLIST_ITEMS)
    ? window.TXN_CHECKLIST_ITEMS
    : [];

  const savedItems = Object.keys(activeChecklist);

  const checklistItems = [...new Set([...configuredItems, ...savedItems])];

  const finalChecklistItems = checklistItems.length
    ? checklistItems
    : [
        "Purchase Contract",
        "Earnest Money Receipt",
        "Seller Disclosures",
        "Inspection Completed",
        "Appraisal Completed",
        "Loan Approval",
        "Final Walkthrough",
        "Closing Package",
      ];

  return `
    <div class="section">
      <h5>Checklist</h5>

      <div class="transaction-checklist-grid">
        ${finalChecklistItems
          .map((item) => {
            const safeItem = txnSafe(item);
            const isChecked = activeChecklist[item] === true;

            return `
              <label
                class="transaction-check-item"
                style="cursor:pointer;"
              >
                <input
                  type="checkbox"
                  ${isChecked ? "checked" : ""}
                  onchange="txnWorkspaceToggleChecklist(
                    '${txn.id}',
                    this.getAttribute('data-check-item'),
                    this.checked
                  )"
                  data-check-item="${safeItem}"
                  style="margin-right:8px;cursor:pointer;"
                >
                ${safeItem}
              </label>
            `;
          })
          .join("")}
      </div>
    </div>
  `;
}

function renderTransactionWorkspaceNotesActivity(txn) {
  return `
    <div class="section">
      <h5>Notes</h5>
      <div class="note">${txnSafe(txn.notes || "No notes yet.")}</div>
    </div>

    <div class="section">
      <h5>Activity</h5>

      <div class="transaction-doc-row">
        <div>
          <b>Transaction created</b><br>
          <small>${txnDate(txn.createdAt) || "—"}</small>
        </div>
      </div>

      <div class="transaction-doc-row">
        <div>
          <b>Last updated</b><br>
          <small>${txnDate(txn.updatedAt) || "—"}</small>
        </div>
      </div>
    </div>

    <div class="section">
      <h5>Quick Actions</h5>

      <div class="d-grid gap-2">
        <button class="btn btn-success" onclick="txnEditFromWorkspace('${txn.id}')">
          Edit Details
        </button>

        <button class="btn btn-outline-primary" onclick="showTab('calendar')">
          Open Calendar
        </button>

        <button class="btn btn-outline-secondary" onclick="txnClosePanel()">
          Back to Transactions
        </button>
      </div>
    </div>
  `;
}

function renderTransactionWorkspaceSide(txn) {
  return `
    <div>
      <div class="section">
        <h5>AI Automated Action Items</h5>
        ${txnRenderAutomationTasks(txn)}
      </div>

      <div class="section">
        <h5>Notes</h5>
        <div class="note">${txnSafe(txn.notes || "No notes yet.")}</div>
      </div>

      <div class="section">
        <h5>Activity</h5>

        <div class="transaction-doc-row">
          <div>
            <b>Transaction created</b><br>
            <small>${txnDate(txn.createdAt) || "—"}</small>
          </div>
        </div>

        <div class="transaction-doc-row">
          <div>
            <b>Last updated</b><br>
            <small>${txnDate(txn.updatedAt) || "—"}</small>
          </div>
        </div>
      </div>

      <div class="section">
        <h5>Quick Actions</h5>

        <div class="d-grid gap-2">
          <button class="btn btn-success" onclick="txnEditFromWorkspace('${txn.id}')">
            Edit Details
          </button>

          <button class="btn btn-outline-primary" onclick="showTab('calendar')">
            Open Calendar
          </button>

          <button class="btn btn-outline-secondary" onclick="txnClosePanel()">
            Back to Transactions
          </button>
        </div>
      </div>
    </div>
  `;
}

function txnWorkspaceToggleChecklist(txnId, item, checked) {
  if (typeof txnLoad === "function") {
    txnLoad();
  }

  const txn = txnCache.find(
    (transaction) => String(transaction.id) === String(txnId),
  );

  if (!txn) {
    console.error("Checklist update failed: transaction not found.");
    return;
  }

  if (!txn.checklist || typeof txn.checklist !== "object") {
    txn.checklist = {};
  }

  /*
   * Save the user's checklist selection.
   */
  txn.checklist[item] = checked === true;
  txn.updatedAt = new Date().toISOString();

  /*
   * Rebuild the Transaction Brain so checklist completion,
   * health, and Coordinator recommendations reflect the
   * newly updated checklist.
   *
   * This does not reanalyze documents or call OpenAI.
   */
  if (typeof aiRefreshTransaction === "function") {
    try {
      aiRefreshTransaction(txn);
    } catch (error) {
      console.error(
        "Transaction Brain refresh failed after checklist update:",
        error,
      );
    }
  }

  if (typeof txnApplyAutomation === "function") {
    txnApplyAutomation(txn);
  }

  if (typeof txnSaveAll === "function") {
    txnSaveAll();
  }

  if (typeof txnRenderAll === "function") {
    txnRenderAll();
  }

  if (typeof loadDashboard === "function") {
    loadDashboard();
  }

  if (typeof loadCalendar === "function") {
    loadCalendar();
  }

  /*
   * Refresh only the Checklist tab instead of reopening
   * the entire Transaction Workspace.
   */
  const checklistContainer = document.getElementById("txnWorkspaceTabContent");

  if (checklistContainer) {
    checklistContainer.innerHTML = renderTransactionWorkspaceChecklist(
      txn,
      txn.checklist || {},
    );

    return;
  }

  /*
   * Fallback only if the workspace tab container
   * cannot be found.
   */
  txnOpenPanel(txnId);
}

window.txnRunAITransactionCoordinator = function (txnId) {
  alert(
    "AI Transaction Coordinator is reviewing this file.\n\nNext version will extract deadlines, signatures, missing addenda, and document issues from uploaded files.",
  );
};

window.txnWorkspaceShowTab = function (tabName) {
  const selectedTab = tabName || "overview";

  window.txnWorkspaceActiveTab = selectedTab;

  document.querySelectorAll(".txn-workspace-tab-panel").forEach((panel) => {
    panel.style.display = "none";
  });

  document.querySelectorAll(".txn-workspace-tab-button").forEach((button) => {
    button.classList.remove("btn-success");
    button.classList.add("btn-outline-secondary");
  });

  const activePanel = document.getElementById("txnWorkspaceTab_" + selectedTab);

  if (activePanel) {
    activePanel.style.display = "block";
  }

  const activeButton = document.getElementById(
    "txnWorkspaceBtn_" + selectedTab,
  );

  if (activeButton) {
    activeButton.classList.remove("btn-outline-secondary");
    activeButton.classList.add("btn-success");
  }
};
