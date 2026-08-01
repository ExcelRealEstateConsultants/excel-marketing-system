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
  txnCache.forEach((txn) => {
    if (txn.closeDate)
      events.push({
        type: "Transaction",
        title: `Close: ${txn.address || "Transaction"}`,
        date: txn.closeDate,
        transactionId: txn.id,
        priority: "Normal",
      });
    txnApplyAutomation(txn);
    (txn.automationTasks || [])
      .filter((task) => !task.done && task.due)
      .forEach((task) => {
        events.push({
          type: "Transaction Task",
          title: `${task.title} - ${txn.address || ""}`,
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
