/* =====================================================
   RapportLink Calendar JavaScript
   Version 1
   ===================================================== */

/* CALENDAR */
async function loadCalendar() {
  const res = await fetch("/api/calendar-events");
  calendarEventsCache = await res.json();
  renderCalendar();
}

function changeCalendarMonth(delta) {
  calendarDate.setMonth(calendarDate.getMonth() + delta);
  renderCalendar();
}

function txnCalendarEvents() {
  txnLoad();

  const events = [];
  const seen = new Set();

  const addEvent = ({
    type = "Transaction",
    title = "",
    date = "",
    transactionId = null,
    priority = "Normal",
    historical = false,
  }) => {
    const cleanDate = String(date || "").trim();

    if (!/^\d{4}-\d{2}-\d{2}$/.test(cleanDate)) {
      return;
    }

    const key = [
      transactionId || "",
      type,
      title,
      cleanDate,
      historical ? "historical" : "current",
    ].join("|");

    if (seen.has(key)) {
      return;
    }

    seen.add(key);

    events.push({
      type,
      title,
      date: cleanDate,
      transactionId,
      priority,
      historical,
    });
  };

  txnCache.forEach((txn) => {
    const address = txn.address || "Transaction";
    const brain = txn.transactionBrain || {};
    const facts = brain.canonicalFacts || {};

    /*
    --------------------------------------------------------
    CURRENT AUTHORITATIVE CONTRACT DATES
    --------------------------------------------------------
    */

    if (facts.effectiveDate) {
      addEvent({
        type: "Contract Date",
        title: `Effective Date - ${address}`,
        date: facts.effectiveDate,
        transactionId: txn.id,
        priority: "Normal",
      });
    }

    if (facts.closingDate) {
      addEvent({
        type: "Closing",
        title: `Closing - ${address}`,
        date: facts.closingDate,
        transactionId: txn.id,
        priority: "High",
      });
    }

    if (facts.actualClosingDate) {
      addEvent({
        type: "Closed",
        title: `Closed - ${address}`,
        date: facts.actualClosingDate,
        transactionId: txn.id,
        priority: "Normal",
      });
    }

    if (facts.terminationDate) {
      addEvent({
        type: "Cancellation",
        title: `Cancellation Effective - ${address}`,
        date: facts.terminationDate,
        transactionId: txn.id,
        priority: "High",
      });
    }

    if (facts.inspectionDeadline) {
      addEvent({
        type: "Contract Deadline",
        title: `Inspection Deadline - ${address}`,
        date: facts.inspectionDeadline,
        transactionId: txn.id,
        priority: "High",
      });
    }

    if (facts.financingDeadline) {
      addEvent({
        type: "Contract Deadline",
        title: `Financing Deadline - ${address}`,
        date: facts.financingDeadline,
        transactionId: txn.id,
        priority: "High",
      });
    }

    if (facts.appraisalDeadline) {
      addEvent({
        type: "Contract Deadline",
        title: `Appraisal Deadline - ${address}`,
        date: facts.appraisalDeadline,
        transactionId: txn.id,
        priority: "High",
      });
    }

    /*
--------------------------------------------------------
HISTORICAL / SUPERSEDED DOCUMENT DATES

Keep prior contract dates visible for transaction history.
Current canonical dates above remain authoritative.
--------------------------------------------------------
*/

    const historicalEvidence = Array.isArray(brain.reconciledEvidence)
      ? brain.reconciledEvidence
      : [];

    const calculateHistoricalDeadline = (baseDate, days) => {
      const cleanBase = String(baseDate || "").trim();
      const cleanDays = Number(days);

      if (
        !/^\d{4}-\d{2}-\d{2}$/.test(cleanBase) ||
        !Number.isFinite(cleanDays)
      ) {
        return "";
      }

      const [year, month, day] = cleanBase.split("-").map(Number);
      const deadline = new Date(Date.UTC(year, month - 1, day));

      deadline.setUTCDate(deadline.getUTCDate() + cleanDays);

      return deadline.toISOString().slice(0, 10);
    };

    historicalEvidence.forEach((item) => {
      if (!item || typeof item !== "object") {
        return;
      }

      const key = String(item.key || "")
        .trim()
        .toLowerCase();
      const value = String(item.value || "").trim();
      const documentName = String(
        item.documentName || item.sourceDocument || "",
      ).trim();

      /*
       * Historical appraisal contingency.
       */
      if (
        key === "appraisaldeadline" ||
        key === "appraisal contingency deadline"
      ) {
        const dayMatch = value.match(/(\d+)\s*days?/i);

        if (!dayMatch) {
          return;
        }

        const days = Number(dayMatch[1]);
        const date = calculateHistoricalDeadline(facts.effectiveDate, days);

        if (!date || date === facts.appraisalDeadline) {
          return;
        }

        addEvent({
          type: "Transaction History",
          title: `Prior Appraisal Deadline (${days} days) - ${address}`,
          date,
          transactionId: txn.id,
          priority: "Normal",
          historical: true,
          documentName,
        });

        return;
      }

      /*
       * Historical financing / loan contingency.
       */
      if (key === "financingdeadline" || key === "loan contingency deadline") {
        const dayMatch = value.match(/(\d+)\s*days?/i);

        if (!dayMatch) {
          return;
        }

        const days = Number(dayMatch[1]);
        const date = calculateHistoricalDeadline(facts.effectiveDate, days);

        if (!date || date === facts.financingDeadline) {
          return;
        }

        addEvent({
          type: "Transaction History",
          title: `Prior Financing Deadline (${days} days) - ${address}`,
          date,
          transactionId: txn.id,
          priority: "Normal",
          historical: true,
          documentName,
        });

        return;
      }

      /*
       * Historical explicit closing dates.
       */
      if (
        key === "closingdate" ||
        key === "closing date" ||
        key === "proposed close of escrow"
      ) {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
          return;
        }

        if (value === facts.closingDate) {
          return;
        }

        addEvent({
          type: "Transaction History",
          title: `Prior Closing Date - ${address}`,
          date: value,
          transactionId: txn.id,
          priority: "Normal",
          historical: true,
          documentName,
        });
      }
    });

    /*
    --------------------------------------------------------
    AUTOMATION TASKS
    --------------------------------------------------------
    */

    txnApplyAutomation(txn);

    (txn.automationTasks || [])
      .filter((task) => !task.done && task.due)
      .forEach((task) => {
        addEvent({
          type: "Transaction Task",
          title: `${task.title} - ${address}`,
          date: task.due,
          transactionId: txn.id,
          priority: task.priority || "Normal",
        });
      });
  });

  return events;
}

function renderCalendar() {
  const year = calendarDate.getFullYear();
  const month = calendarDate.getMonth();

  calendarMonthTitle.innerText = calendarDate.toLocaleDateString([], {
    month: "long",
    year: "numeric",
  });

  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startDay = firstDay.getDay();
  const totalDays = lastDay.getDate();

  const dayHeaders = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  calendarGrid.innerHTML = "";

  dayHeaders.forEach((day) => {
    calendarGrid.innerHTML += `<div class="calendar-day-header">${day}</div>`;
  });

  for (let i = 0; i < startDay; i++) {
    calendarGrid.innerHTML += `<div class="calendar-day"></div>`;
  }

  for (let day = 1; day <= totalDays; day++) {
    const dateKey = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const events = calendarEventsCache.filter(
      (event) => event.date === dateKey,
    );
    const txnEvents = txnCalendarEvents().filter(
      (event) => event.date === dateKey,
    );
    const allDayEvents = [...events, ...txnEvents];

    const eventsHtml = allDayEvents
      .map((event) => {
        let cls = "";
        if (event.type === "Task")
          cls = event.done
            ? "task"
            : event.date < todayKey()
              ? "overdue"
              : "task";
        if (event.type === "Scheduled Campaign") cls = "campaign";
        if (event.type === "Transaction" || event.type === "Transaction Task")
          cls = event.priority === "High" ? "overdue" : "campaign";

        const clickAction = event.transactionId
          ? `showTab('transactions'); txnOpenPanel('${event.transactionId}')`
          : event.contactId
            ? `openContact(${event.contactId})`
            : "";
        return `
        <div class="calendar-event ${cls}" onclick="${clickAction}">
          <b>${event.type}</b><br>${event.title || ""}
          ${event.contactName ? `<br><small>${event.contactName}</small>` : ""}
        </div>
      `;
      })
      .join("");

    calendarGrid.innerHTML += `
      <div class="calendar-day">
        <div class="calendar-day-number">${day}</div>
        ${eventsHtml}
      </div>
    `;
  }
}
