/* =====================================================
   RapportLink Tasks JavaScript
   Version 1
   ===================================================== */

/* TASKS */
async function loadTasks() {
  const res = await fetch("/api/tasks");
  allTasksCache = await res.json();
  updateNotificationBadge();

  taskList.innerHTML = "";

  if (!allTasksCache.length) {
    taskList.innerHTML =
      '<div class="modern-card text-muted">No tasks yet.</div>';
    return;
  }

  allTasksCache.forEach((task) => {
    taskList.innerHTML += `
      <div class="task-card ${taskIsOverdue(task) ? "task-overdue" : ""} ${task.done ? "task-done" : ""}">
        <div class="d-flex justify-content-between align-items-start">
          <div>
            <b>${task.title || "Untitled Task"}</b><br>
            <small>Contact: ${task.contactName || ""}</small><br>
            <small>Due: ${task.due ? formatShortDate(task.due) : "No due date"}</small><br>
            <small>Stage: ${task.stage || "New Lead"}</small>
            ${task.notes ? `<br><small>${task.notes}</small>` : ""}
          </div>
          <div class="text-end">
            <span class="priority-pill ${priorityClass(task.priority)}">${task.priority || "Normal"}</span><br>
            <button class="btn btn-sm btn-outline-primary mt-2" onclick="openContact(${task.contactId})">Open Contact</button>
            <button class="btn btn-sm btn-outline-primary mt-2" onclick="toggleTask(${task.contactId}, ${task.id})">${task.done ? "Reopen" : "Done"}</button>
          </div>
        </div>
      </div>
    `;
  });
}
