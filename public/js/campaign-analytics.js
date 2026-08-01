/* =====================================================
   RapportLink Campaign Analytics Module
   Version 1
   ===================================================== */

/* CAMPAIGN ANALYTICS PANEL */

function openCampaignPanel(campaignId) {
  const campaign = campaignsCache.find((c) => c.id == campaignId);
  if (!campaign) return;

  const matching = activityCache.filter(
    (a) =>
      a.campaignName === campaign.name || a.campaignName === campaign.subject,
  );

  const sent = matching.filter((a) => a.status === "sent" || !a.status).length;
  const opened = matching.filter((a) => a.opened).length;
  const clicks = matching.reduce((sum, a) => sum + (a.clicks || []).length, 0);
  const openRate = sent ? Math.round((opened / sent) * 100) : 0;

  campaignPanelTitle.innerText = campaign.name || "Untitled Campaign";
  campaignPanelSubject.innerText = "Subject: " + (campaign.subject || "");
  campaignPanelStatus.innerHTML = `<span class="status-badge">${campaign.status || "Draft"}</span>`;

  panelSent.innerText = sent;
  panelOpened.innerText = opened;
  panelOpenRate.innerText = openRate + "%";
  panelClicks.innerText = clicks;

  campaignRecipientActivity.innerHTML = "";

  if (matching.length === 0) {
    campaignRecipientActivity.innerHTML =
      '<div class="text-muted">No recipient activity yet.</div>';
  } else {
    matching.forEach((a) => {
      const clickedCount = (a.clicks || []).length;
      const isFailed = a.status === "failed";

      const clickDetails = clickedCount
        ? (a.clicks || [])
            .map(
              (click) => `
            <div class="mt-1">
              <small><b>Clicked:</b> ${click.url}<br>${formatDate(click.clickedAt)}</small>
            </div>
          `,
            )
            .join("")
        : '<small class="text-muted">No clicks yet.</small>';

      campaignRecipientActivity.innerHTML += `
        <div class="activity-row">
          <div class="d-flex justify-content-between align-items-start">
            <div>
              <b>${a.email}</b><br>
              <small>Sent: ${a.sentAt ? formatDate(a.sentAt) : formatDate(a.sentDate)}</small><br>
              <small>Opened: ${a.opened ? formatDate(a.openedAt) : "No"}</small>
              ${isFailed ? `<br><small class="text-danger">Failed: ${a.error || "Unknown error"}</small>` : ""}
            </div>
            <div>
              ${
                isFailed
                  ? '<span class="bounced-badge">Failed</span>'
                  : `<span class="${a.opened ? "badge-opened" : "badge-closed"}">${a.opened ? "Opened" : "Not Opened"}</span>`
              }
            </div>
          </div>
          <div class="mt-2">
            <b style="color:#00A143;">${clickedCount}</b> <small>clicks</small>
            ${clickDetails}
          </div>
        </div>
      `;
    });
  }

  const linkMap = {};

  matching.forEach((a) => {
    (a.clicks || []).forEach((click) => {
      if (!linkMap[click.url])
        linkMap[click.url] = { url: click.url, clicks: 0, people: [] };
      linkMap[click.url].clicks++;
      linkMap[click.url].people.push({
        email: a.email,
        clickedAt: click.clickedAt,
      });
    });
  });

  const links = Object.values(linkMap).sort((a, b) => b.clicks - a.clicks);

  campaignLinksClicked.innerHTML = "";

  if (links.length === 0) {
    campaignLinksClicked.innerHTML =
      '<div class="text-muted">No links clicked yet.</div>';
  } else {
    links.forEach((link) => {
      const peopleHtml = link.people
        .map(
          (p) => `
        <div><small>${p.email} — ${formatDate(p.clickedAt)}</small></div>
      `,
        )
        .join("");

      campaignLinksClicked.innerHTML += `
        <div class="link-row">
          <b style="color:#00A143;">${link.clicks}</b> clicks<br>
          <small>${link.url}</small>
          <div class="mt-2">${peopleHtml}</div>
        </div>
      `;
    });
  }

  campaignPanel.classList.add("open");
}

function closeCampaignPanel() {
  campaignPanel.classList.remove("open");
}
