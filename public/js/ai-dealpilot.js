/* =====================================================
   RapportLink DealPilot
   Version 1
   ===================================================== */

console.log("DealPilot Loaded");

/* =====================================================
   DealPilot Document Processing Status
   ===================================================== */

window.dealPilotDocumentStatus = null;

function dealPilotSetDocumentStatus(status = null) {
  if (!status || typeof status !== "object") {
    window.dealPilotDocumentStatus = null;
    return;
  }

  window.dealPilotDocumentStatus = {
    transactionId: status.transactionId || null,
    documentName: String(status.documentName || "the uploaded document"),
    stage: String(status.stage || "reading"),
    message: String(status.message || ""),
    detail: String(status.detail || ""),
    progress: Math.max(0, Math.min(100, Number(status.progress || 0))),
    updatedAt: new Date().toISOString(),
  };
}

function dealPilotClearDocumentStatus(transactionId = null) {
  const current = window.dealPilotDocumentStatus;

  if (
    transactionId &&
    current?.transactionId &&
    String(current.transactionId) !== String(transactionId)
  ) {
    return;
  }

  window.dealPilotDocumentStatus = null;
}

function dealPilotBuildDocumentStatusCard(txn = {}) {
  const status = window.dealPilotDocumentStatus;

  if (!status) {
    return "";
  }

  if (status.transactionId && String(status.transactionId) !== String(txn.id)) {
    return "";
  }

  const stageLabels = {
    received: "Document Received",
    reading: "Reading Document",
    analyzing: "Analyzing Document",
    updating: "Updating Transaction Brain",
    complete: "Review Complete",
    failed: "Review Could Not Be Completed",
  };

  const stageLabel = stageLabels[status.stage] || "Reviewing Document";

  const progress = Math.max(0, Math.min(100, Number(status.progress || 0)));

  return `
    <div style="
      background:#F8FFFB;
      border:2px solid #00A143;
      border-radius:18px;
      padding:24px;
      margin-bottom:26px;
      box-shadow:0 8px 24px rgba(4,44,73,.08);
    ">
      <div style="
        color:#00A143;
        font-weight:900;
        font-size:13px;
        letter-spacing:.08em;
        text-transform:uppercase;
      ">
        ${txnSafe(dealPilotName())} • AI Transaction Coordinator
      </div>

      <div style="
        font-size:27px;
        font-weight:900;
        color:#042C49;
        margin-top:7px;
      ">
        ${txnSafe(stageLabel)}
      </div>

      <div style="
        margin-top:14px;
        font-size:17px;
        line-height:1.7;
        color:#334155;
      ">
        ${txnSafe(status.message || "I’m reviewing the uploaded document now.")}
      </div>

      ${
        status.detail
          ? `
            <div style="
              margin-top:10px;
              color:#64748B;
              line-height:1.6;
            ">
              ${txnSafe(status.detail)}
            </div>
          `
          : ""
      }

      <div style="
        margin-top:20px;
        height:12px;
        background:#E2E8F0;
        border-radius:999px;
        overflow:hidden;
      ">
        <div style="
          width:${progress}%;
          height:100%;
          background:#00A143;
          border-radius:999px;
          transition:width .35s ease;
        "></div>
      </div>

      <div style="
        display:flex;
        justify-content:space-between;
        margin-top:8px;
        font-size:13px;
        font-weight:800;
        color:#64748B;
      ">
        <span>${txnSafe(status.documentName)}</span>
        <span>${progress}%</span>
      </div>

      <div style="
        display:grid;
        gap:8px;
        margin-top:20px;
        color:#475569;
        font-size:14px;
      ">
        <div>${progress >= 10 ? "✓" : "○"} File received</div>
        <div>${progress >= 35 ? "✓" : status.stage === "reading" ? "●" : "○"} Text and pages reviewed</div>
        <div>${progress >= 70 ? "✓" : status.stage === "analyzing" ? "●" : "○"} Signatures, dates, terms, and evidence analyzed</div>
        <div>${progress >= 95 ? "✓" : status.stage === "updating" ? "●" : "○"} Transaction Brain updated</div>
      </div>
    </div>
  `;
}

function dealPilotName() {
  try {
    return localStorage.getItem("rapportlinkDealPilotName") || "DealPilot";
  } catch (e) {
    return "DealPilot";
  }
}

function dealPilotSetName(name) {
  const clean = String(name || "").trim();
  try {
    if (clean) localStorage.setItem("rapportlinkDealPilotName", clean);
    else localStorage.removeItem("rapportlinkDealPilotName");
  } catch (e) {}
}

function dealPilotGreetingName() {
  return dealPilotName();
}

function dealPilotBuildBriefing(txn, ai = {}) {
  const documentStatusCard =
    typeof dealPilotBuildDocumentStatusCard === "function"
      ? dealPilotBuildDocumentStatusCard(txn)
      : "";

  if (documentStatusCard) {
    return documentStatusCard;
  }

  const lines = [];
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "morning" : hour < 17 ? "afternoon" : "evening";
  const name = dealPilotGreetingName();

  /*
  --------------------------------------------------------
  Read conclusions produced by the Transaction Brain.

  DealPilot does not independently determine risk,
  priorities, recommendations, health, or confidence.
  --------------------------------------------------------
  */

  const brainPriorities = Array.isArray(ai.priorities) ? ai.priorities : [];

  const brainAlerts = Array.isArray(ai.alerts) ? ai.alerts : [];

  const priorities = (
    brainPriorities.length ? brainPriorities : brainAlerts
  ).slice(0, 5);

  const missingDocuments = Array.isArray(ai.missingDocuments)
    ? ai.missingDocuments
    : [];

  const missingFields = Array.isArray(ai.missingFields) ? ai.missingFields : [];

  const transactionHealth =
    typeof ai.transactionHealth === "number" ? ai.transactionHealth : 0;

  const closingProbability =
    typeof ai.closingProbability === "number" ? ai.closingProbability : 0;

  const riskLevel =
    typeof ai.riskLevel === "string" && ai.riskLevel.trim()
      ? ai.riskLevel.trim()
      : "Unknown";

  const hasBrainIssues =
    priorities.length > 0 ||
    missingDocuments.length > 0 ||
    missingFields.length > 0;

  /*
  --------------------------------------------------------
  Header
  --------------------------------------------------------
  */

  lines.push(`
    <div style="
      font-size:13px;
      font-weight:800;
      letter-spacing:.12em;
      text-transform:uppercase;
      color:#00A143;
      margin-bottom:6px;
    ">
      ${txnSafe(name)} • AI Transaction Coordinator
    </div>

    <div style="
      font-size:28px;
      font-weight:900;
      color:#042C49;
      margin-bottom:12px;
    ">
      Good ${greeting}, Jeff.
    </div>
  `);

  /*
  --------------------------------------------------------
  Transaction summary
  --------------------------------------------------------
  */

  let riskStatement = "";

  if (riskLevel === "Unknown") {
    riskStatement =
      "The Transaction Brain has not yet established a supported risk classification for this file.";
  } else {
    riskStatement =
      `The Transaction Brain currently classifies this file as ` +
      `<b>${txnSafe(riskLevel)}</b>.`;
  }

  let attentionStatement = "";

  if (priorities.length > 0) {
    attentionStatement =
      `I found <b>${priorities.length}</b> priority item` +
      `${priorities.length === 1 ? "" : "s"} that should be reviewed.`;
  } else if (missingDocuments.length > 0 || missingFields.length > 0) {
    const missingCount = missingDocuments.length + missingFields.length;

    attentionStatement =
      `The Transaction Brain identified <b>${missingCount}</b> missing item` +
      `${missingCount === 1 ? "" : "s"} that should be reviewed.`;
  } else {
    attentionStatement =
      "The Transaction Brain has not identified any current priority items.";
  }

  lines.push(`
    <div style="
      font-size:17px;
      line-height:1.7;
      margin-bottom:22px;
      color:#334155;
    ">
      I've finished reviewing
      <b>${txnSafe(txn.address || "this transaction")}</b>.

      <br><br>

      ${riskStatement}

      <br>

      Transaction Health:
      <b>${transactionHealth}%</b>

      <br>

      Closing Confidence:
      <b>${closingProbability}%</b>

      <br><br>

      ${attentionStatement}
    </div>
  `);

  /*
  --------------------------------------------------------
  Brain priorities
  --------------------------------------------------------
  */

  if (priorities.length) {
    lines.push(`
      <div style="
        font-size:20px;
        font-weight:900;
        color:#042C49;
        margin-bottom:14px;
      ">
        Today's Priorities
      </div>
    `);

    priorities.forEach((item) => {
      const severity = String(
        item.severity || item.priority || "medium",
      ).toLowerCase();

      const color =
        severity === "high" || severity === "critical"
          ? "#DC2626"
          : severity === "medium" || severity === "watch"
            ? "#F59E0B"
            : "#00A143";

      const title =
        item.title || item.label || item.name || "Transaction Priority";

      const text =
        item.text || item.description || item.note || item.reason || "";

      lines.push(`
        <div style="
          border-left:5px solid ${color};
          background:#F8FAFC;
          padding:18px 20px;
          margin-bottom:16px;
          border-radius:14px;
          box-shadow:0 8px 22px rgba(4,44,73,.05);
        ">
          <div style="
            font-size:18px;
            font-weight:900;
            color:#042C49;
          ">
            ${txnSafe(title)}
          </div>

          ${
            text
              ? `
                <div style="
                  margin-top:7px;
                  color:#64748B;
                  line-height:1.65;
                ">
                  ${txnSafe(text)}
                </div>
              `
              : ""
          }

          <div style="
            margin-top:12px;
            font-weight:800;
            color:#042C49;
          ">
            Recommended Action
          </div>

          <ul style="
            margin:7px 0 0 18px;
            color:#475569;
            line-height:1.65;
          ">
            ${dealPilotActionSteps(item)
              .map((step) => `<li>${txnSafe(step)}</li>`)
              .join("")}
          </ul>
        </div>
      `);
    });
  }

  /*
  --------------------------------------------------------
  Brain assessment
  --------------------------------------------------------
  */

  const assessment =
    ai.recommendations?.[0] ||
    ai.nextBestAction ||
    (hasBrainIssues
      ? "Review and resolve the priority items identified by the Transaction Brain."
      : "Continue monitoring this transaction as new evidence becomes available.");

  lines.push(`
    <div style="
      margin-top:20px;
      padding:20px;
      background:#ECFDF5;
      border-left:5px solid #00A143;
      border-radius:14px;
    ">
      <div style="
        font-size:18px;
        font-weight:900;
        color:#042C49;
      ">
        My Assessment
      </div>

      <div style="
        margin-top:8px;
        line-height:1.65;
        color:#334155;
      ">
        ${txnSafe(assessment)}
      </div>
    </div>
  `);

  /*
  --------------------------------------------------------
  Workspace actions
  --------------------------------------------------------
  */

  lines.push(`
    <div style="
      display:flex;
      gap:10px;
      flex-wrap:wrap;
      margin-top:26px;
    ">
      <button
        class="btn btn-success"
        onclick="txnWorkspaceShowTab('documents')"
      >
        Review Documents
      </button>

      <button
        class="btn btn-outline-primary"
        onclick="txnWorkspaceShowTab('checklist')"
      >
        Open Checklist
      </button>

      <button
        class="btn btn-outline-primary"
        onclick="txnWorkspaceShowTab('dates')"
      >
        Review Deadlines
      </button>
    </div>
  `);

  return lines.join("");
}

function dealPilotExplainAlert(alert = {}) {
  const title = String(alert.title || "").toLowerCase();
  const text = String(alert.text || "");

  if (title.includes("inspection")) {
    return `${txnSafe(text)} I do not see enough information yet to consider this item fully resolved.`;
  }

  if (title.includes("document")) {
    return `${txnSafe(text)} Once the document is uploaded, I can help review it for missing signatures, initials, pages, dates, and compliance issues.`;
  }

  if (title.includes("checklist")) {
    return `${txnSafe(text)} This may simply mean the file has not been updated yet, but it does affect my confidence in the transaction.`;
  }

  return txnSafe(text);
}

function dealPilotActionSteps(alert = {}) {
  const title = String(alert.title || "").toLowerCase();

  const text = String(alert.text || "").toLowerCase();

  /*
   * Termination must be checked first because its description
   * mentions inspection, appraisal, financing, and closing.
   */
  if (
    title.includes("transaction terminated") ||
    title.includes("termination") ||
    text.includes("signed termination document")
  ) {
    return [
      "Confirm the termination is fully executed and was delivered to the required parties.",
      "Confirm how earnest money will be released or handled.",
      "Notify title or escrow that the contract has been terminated.",
      "Notify the lender if financing was involved.",
      "Change the saved transaction status to Cancelled after confirmation.",
      "Archive the transaction after all cancellation follow-up is complete.",
    ];
  }

  if (title.includes("inspection") || text.includes("inspection")) {
    return [
      "Confirm whether the inspection was completed.",
      "Request the inspection report if it has not been received.",
      "Upload the inspection report to the Documents tab.",
      "Review whether a repair request or amendment is needed.",
    ];
  }

  if (title.includes("document") || text.includes("document")) {
    return [
      "Open the Documents tab.",
      "Upload the missing document if you have it.",
      "If the document was already uploaded, confirm the file name is clear.",
      "Review the document for signatures, initials, and missing pages.",
    ];
  }

  if (title.includes("checklist") || text.includes("checklist")) {
    return [
      "Open the Checklist tab.",
      "Mark completed items that are already done.",
      "Focus first on contract, earnest money, inspection, appraisal, loan, and closing items.",
      "Leave anything uncertain unchecked until verified.",
    ];
  }

  if (
    title.includes("transaction closed") ||
    title.includes("closed transaction") ||
    text.includes("transaction is complete") ||
    text.includes("completed closing")
  ) {
    return [
      "Confirm the final commission has been received and posted.",
      "Verify the brokerage compliance file is complete.",
      "Confirm the final settlement statement and closing documents are retained.",
      "Move the client into your past-client follow-up plan.",
      "Schedule future client care and referral reminders.",
    ];
  }

  if (title.includes("closing") || text.includes("closing")) {
    return [
      "Confirm the closing date with title or escrow.",
      "Verify lender, buyer, seller, and title are aligned.",
      "Review remaining documents and checklist items.",
      "Confirm final walkthrough and signing logistics.",
    ];
  }

  if (
    title.includes("earnest") ||
    title.includes("emd") ||
    text.includes("earnest")
  ) {
    return [
      "Confirm earnest money was delivered.",
      "Request written confirmation from title or escrow.",
      "Upload the receipt or confirmation.",
      "Notify the buyer if anything is still missing.",
    ];
  }

  return [
    "Review this issue today.",
    "Confirm the responsible party.",
    "Update the transaction once resolved.",
  ];
}

/* =====================================================
   AI Advisor
   Document Analysis
   ===================================================== */

window.aiAdvisorDocumentAnalysis = function (txn, doc, analysis) {
  if (!txn || !doc || !analysis) return;

  txn.aiLatestReview = {
    documentId: doc.id,
    documentName: doc.name,
    reviewedAt: new Date().toISOString(),
    analysis,
  };

  if (!Array.isArray(txn.aiDocumentReviews)) {
    txn.aiDocumentReviews = [];
  }

  txn.aiDocumentReviews = txn.aiDocumentReviews.filter(
    (review) => String(review.documentId) !== String(doc.id),
  );

  txn.aiDocumentReviews.unshift(txn.aiLatestReview);

  txn.updatedAt = new Date().toISOString();

  /*
   * Do not save, reload, render, or reopen the workspace here.
   * The upload function will do that after every selected
   * document has finished extraction and AI analysis.
   */
};

function aiAdvisorLatestReviewCard(txn) {
  const review = window.aiAdvisorLatestReview;

  if (!review) return "";
  if (String(review.txnId) !== String(txn.id)) return "";

  const analysis = review.analysis || {};
  const recommendations = Array.isArray(analysis.recommendations)
    ? analysis.recommendations
    : [];

  return `
    <div style="
      background:#F8FFFB;
      border:2px solid #00A143;
      border-radius:18px;
      padding:24px;
      margin-bottom:26px;
      box-shadow:0 8px 24px rgba(0,0,0,.06);
    ">
      <div style="color:#00A143;font-weight:900;font-size:13px;letter-spacing:.08em;text-transform:uppercase;">
        AI Advisor
      </div>

      <div style="font-size:28px;font-weight:900;color:#042C49;margin-top:6px;">
        New Document Reviewed
      </div>

      <div style="margin-top:18px;font-size:18px;">
        <b>${txnSafe(analysis.type || "Document")}</b>
        <span style="color:#64748B;margin-left:10px;">
          Confidence ${analysis.confidence || 0}%
        </span>
      </div>

      <div style="margin-top:18px;color:#334155;line-height:1.8;">
        ${txnSafe(analysis.advisorSummary || "I reviewed this document and prepared recommendations.")}
      </div>

      ${
        recommendations.length
          ? `
            <div style="margin-top:24px;font-weight:800;color:#042C49;">
              I recommend:
            </div>

            <ul style="margin-top:10px;line-height:1.9;color:#334155;">
              ${recommendations.map((r) => `<li>${txnSafe(r)}</li>`).join("")}
            </ul>
          `
          : ""
      }

      <div style="display:flex;gap:12px;flex-wrap:wrap;margin-top:24px;">
        <button class="btn btn-success" onclick="aiAdvisorApplyRecommendations('${txn.id}')">
          Apply Recommendations
        </button>

        <button class="btn btn-outline-primary" onclick="txnWorkspaceShowTab('documents')">
          Review Document
        </button>

        <button class="btn btn-outline-secondary" onclick="window.aiAdvisorLatestReview=null;txnOpenPanel('${txn.id}')">
          Dismiss
        </button>
      </div>
    </div>
  `;
}

function aiAdvisorApplyRecommendations(txnId) {
  if (typeof txnLoad === "function") {
    txnLoad();
  }

  const txn = txnCache.find((item) => String(item.id) === String(txnId));

  if (!txn) return;

  /*
  -------------------------------------------------------
  The AI Advisor never changes transaction status.

  Transaction state must come only from:
  aiBuildTransactionBrain()
  -------------------------------------------------------
  */

  if (typeof aiRefreshTransaction === "function") {
    aiRefreshTransaction(txn);
  } else if (typeof aiAnalyzeTransaction === "function") {
    aiAnalyzeTransaction(txn);
  }

  delete txn.aiLatestReview;

  txn.updatedAt = new Date().toISOString();

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

  if (typeof txnOpenPanel === "function") {
    txnOpenPanel(txnId);
  }
}
