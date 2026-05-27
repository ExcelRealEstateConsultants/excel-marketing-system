const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const app = express();

app.use(cors());
app.use(bodyParser.json());
app.use(express.static('public'));

/* ================= ROOT ROUTE FOR GODADDY ================= */
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'app.html'));
});

/* ================= HEALTH CHECK ================= */
app.get('/health', (req, res) => {
  res.status(200).send('OK');
});

/* ================= BREVO ================= */
const BREVO_API_KEY = process.env.BREVO_API_KEY || '';
const BREVO_SENDER_EMAIL = process.env.BREVO_SENDER_EMAIL || process.env.SENDER_EMAIL || '';
const BREVO_SENDER_NAME = process.env.BREVO_SENDER_NAME || 'Jeff Peterson';
const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

/* ================= FILES ================= */
const DATA_FILE = path.join(__dirname, 'contacts.json');
const ACTIVITY_FILE = path.join(__dirname, 'activity.json');
const CAMPAIGN_FILE = path.join(__dirname, 'campaigns.json');

/* ================= HELPERS ================= */
function readJsonFile(filePath, fallback) {
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, JSON.stringify(fallback, null, 2));
  }

  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8') || JSON.stringify(fallback));
  } catch (error) {
    return fallback;
  }
}

function writeJsonFile(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

function escapeHtml(value) {
  return String(value || '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function isBounceError(message = '') {
  const m = String(message).toLowerCase();

  return (
    m.includes('invalid') ||
    m.includes('does not exist') ||
    m.includes('recipient') ||
    m.includes('bounce') ||
    m.includes('blocked') ||
    m.includes('rejected') ||
    m.includes('unknown user') ||
    m.includes('mailbox')
  );
}

/* ================= DATA LOAD/SAVE ================= */
function loadContacts() {
  return readJsonFile(DATA_FILE, []);
}

function saveContacts(data) {
  writeJsonFile(DATA_FILE, data);
}

function loadActivity() {
  return readJsonFile(ACTIVITY_FILE, []);
}

function saveActivity(data) {
  writeJsonFile(ACTIVITY_FILE, data);
}

function loadCampaigns() {
  return readJsonFile(CAMPAIGN_FILE, []);
}

function saveCampaigns(data) {
  writeJsonFile(CAMPAIGN_FILE, data);
}

/* ================= EMAIL FOOTER ================= */
function addUnsubscribeFooter(html, email) {
  const unsubscribeUrl = `${BASE_URL}/unsubscribe?email=${encodeURIComponent(email)}`;

  const footer = `
    <div style="margin-top:32px;padding-top:16px;border-top:1px solid #e5e7eb;font-family:Arial,sans-serif;font-size:12px;line-height:1.5;color:#6b7280;">
      <p style="margin:0 0 6px 0;">
        You are receiving this email from ${escapeHtml(BREVO_SENDER_NAME)}.
      </p>
      <p style="margin:0;">
        If you no longer wish to receive these emails, you may
        <a href="${unsubscribeUrl}" style="color:#6b7280;text-decoration:underline;">unsubscribe here</a>.
      </p>
    </div>
  `;

  return `${html || ''}${footer}`;
}

/* ================= BREVO SEND FUNCTION ================= */
async function sendBrevoEmail({ to, subject, html }) {
  const response = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      accept: 'application/json',
      'content-type': 'application/json',
      'api-key': BREVO_API_KEY
    },
    body: JSON.stringify({
      sender: {
        name: BREVO_SENDER_NAME,
        email: BREVO_SENDER_EMAIL
      },
      to: [{ email: to }],
      subject,
      htmlContent: html
    })
  });

  const result = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(result.message || `Brevo send failed for ${to}`);
  }

  return result;
}

/* ================= CONTACT ROUTES ================= */
app.get('/api/contacts', (req, res) => {
  res.json(loadContacts());
});

app.post('/api/contacts', (req, res) => {
  const contacts = loadContacts();

  const newContact = {
    id: Date.now(),
    firstName: req.body.firstName || '',
    lastName: req.body.lastName || '',
    email: req.body.email || '',
    phone: req.body.phone || '',
    type: req.body.type || 'Unassigned',
    unsubscribed: false,
    unsubscribedAt: null,
    bounced: false,
    bouncedAt: null,
    bounceReason: '',
    notes: [],
    tasks: []
  };

  contacts.push(newContact);
  saveContacts(contacts);

  res.json({ success: true, contact: newContact });
});

app.put('/api/contacts/:id', (req, res) => {
  const contacts = loadContacts();

  const i = contacts.findIndex(c => c.id == req.params.id);

  if (i === -1) return res.status(404).json({ error: 'Not found' });

  contacts[i] = {
    ...contacts[i],
    firstName: req.body.firstName,
    lastName: req.body.lastName,
    email: req.body.email,
    phone: req.body.phone,
    type: req.body.type
  };

  saveContacts(contacts);

  res.json({ success: true });
});

app.delete('/api/contacts/:id', (req, res) => {
  let contacts = loadContacts();
  contacts = contacts.filter(c => c.id != req.params.id);
  saveContacts(contacts);

  res.json({ success: true });
});

/* ================= NOTES ================= */
app.post('/api/contacts/:id/note', (req, res) => {
  const contacts = loadContacts();

  const c = contacts.find(x => x.id == req.params.id);
  if (!c) return res.status(404).json({ error: 'Not found' });

  if (!c.notes) c.notes = [];

  c.notes.unshift({
    text: req.body.text || '',
    date: new Date().toISOString()
  });

  saveContacts(contacts);

  res.json({ success: true });
});

/* ================= TASKS ================= */
app.post('/api/contacts/:id/task', (req, res) => {
  const contacts = loadContacts();

  const c = contacts.find(x => x.id == req.params.id);
  if (!c) return res.status(404).json({ error: 'Not found' });

  if (!c.tasks) c.tasks = [];

  c.tasks.push({
    id: Date.now(),
    title: req.body.title || '',
    due: req.body.due || '',
    done: false
  });

  saveContacts(contacts);

  res.json({ success: true });
});

app.put('/api/contacts/:id/task/:taskId', (req, res) => {
  const contacts = loadContacts();

  const c = contacts.find(x => x.id == req.params.id);
  if (!c) return res.status(404).json({ error: 'Not found' });

  if (!c.tasks) c.tasks = [];

  const t = c.tasks.find(t => t.id == req.params.taskId);
  if (t) t.done = !t.done;

  saveContacts(contacts);

  res.json({ success: true });
});

/* ================= UNSUBSCRIBE ================= */
app.get('/unsubscribe', (req, res) => {
  const email = normalizeEmail(req.query.email);

  const contacts = loadContacts();

  contacts.forEach(contact => {
    if (normalizeEmail(contact.email) === email) {
      contact.unsubscribed = true;
      contact.unsubscribedAt = new Date().toISOString();
    }
  });

  saveContacts(contacts);

  res.send(`
    <html>
      <body style="font-family:Arial;padding:40px;background:#f4f6f8;">
        <div style="background:white;padding:30px;border-radius:16px;max-width:600px;margin:auto;">
          <h2>You have been unsubscribed.</h2>
          <p>${escapeHtml(email)} will no longer receive future campaigns.</p>
        </div>
      </body>
    </html>
  `);
});

/* ================= ACTIVITY ================= */
app.get('/api/activity', (req, res) => {
  res.json(loadActivity());
});

app.get('/api/contact-activity', (req, res) => {
  const email = req.query.email;
  const activity = loadActivity();

  res.json(activity.filter(a => a.email === email));
});

/* ================= DASHBOARD ================= */
app.get('/api/dashboard-stats', (req, res) => {
  const contacts = loadContacts();
  const campaigns = loadCampaigns();
  const activity = loadActivity();

  const totalContacts = contacts.length;
  const totalCampaigns = campaigns.length;
  const totalSent = activity.filter(a => a.status === 'sent').length;
  const totalOpened = activity.filter(a => a.opened).length;
  const totalClicks = activity.reduce((sum, a) => sum + ((a.clicks || []).length), 0);
  const totalUnsubscribed = contacts.filter(c => c.unsubscribed).length;
  const totalBounced = contacts.filter(c => c.bounced).length;

  const openRate = totalSent ? Math.round((totalOpened / totalSent) * 100) : 0;
  const clickRate = totalSent ? Math.round((totalClicks / totalSent) * 100) : 0;

  const recentActivity = [];

  activity.forEach(a => {
    if (a.sentAt || a.sentDate) {
      recentActivity.push({
        type: a.status || 'Sent',
        email: a.email,
        campaignName: a.campaignName,
        date: a.sentAt || a.sentDate,
        error: a.error || '',
        url: ''
      });
    }

    if (a.opened && a.openedAt) {
      recentActivity.push({
        type: 'Opened',
        email: a.email,
        campaignName: a.campaignName,
        date: a.openedAt,
        url: ''
      });
    }

    (a.clicks || []).forEach(click => {
      recentActivity.push({
        type: 'Clicked',
        email: a.email,
        campaignName: a.campaignName,
        date: click.clickedAt,
        url: click.url
      });
    });
  });

  recentActivity.sort((a, b) => new Date(b.date) - new Date(a.date));

  const linkMap = {};

  activity.forEach(a => {
    (a.clicks || []).forEach(click => {
      if (!linkMap[click.url]) {
        linkMap[click.url] = {
          url: click.url,
          clicks: 0
        };
      }

      linkMap[click.url].clicks++;
    });
  });

  const topLinks = Object.values(linkMap)
    .sort((a, b) => b.clicks - a.clicks)
    .slice(0, 10);

  res.json({
    totalContacts,
    totalCampaigns,
    totalSent,
    totalOpened,
    totalClicks,
    totalUnsubscribed,
    totalBounced,
    openRate,
    clickRate,
    recentActivity: recentActivity.slice(0, 10),
    topLinks
  });
});

/* ================= CAMPAIGNS ================= */
app.get('/api/campaigns', (req, res) => {
  res.json(loadCampaigns());
});

app.post('/api/campaigns', (req, res) => {
  const campaigns = loadCampaigns();

  const newCampaign = {
    id: Date.now(),
    name: req.body.name || 'Untitled',
    subject: req.body.subject || '',
    html: req.body.html || '',
    status: 'Draft',
    createdAt: new Date().toISOString()
  };

  campaigns.push(newCampaign);
  saveCampaigns(campaigns);

  res.json({ success: true, campaign: newCampaign });
});

app.get('/api/campaigns/:id', (req, res) => {
  const campaigns = loadCampaigns();

  const c = campaigns.find(x => x.id == req.params.id);
  if (!c) return res.status(404).json({ error: 'Not found' });

  res.json(c);
});

app.put('/api/campaigns/:id', (req, res) => {
  const campaigns = loadCampaigns();

  const index = campaigns.findIndex(c => c.id == req.params.id);

  if (index === -1) {
    return res.status(404).json({ success: false, error: 'Campaign not found' });
  }

  campaigns[index] = {
    ...campaigns[index],
    name: req.body.name || campaigns[index].name || 'Untitled',
    subject: req.body.subject || '',
    html: req.body.html || '',
    updatedAt: new Date().toISOString()
  };

  saveCampaigns(campaigns);

  res.json({ success: true, campaign: campaigns[index] });
});

app.delete('/api/campaigns/:id', (req, res) => {
  let campaigns = loadCampaigns();

  const existingCampaign = campaigns.find(c => c.id == req.params.id);

  if (!existingCampaign) {
    return res.status(404).json({ success: false, error: 'Campaign not found' });
  }

  campaigns = campaigns.filter(c => c.id != req.params.id);
  saveCampaigns(campaigns);

  res.json({ success: true });
});

/* ================= SEND CAMPAIGN ================= */
app.post('/api/send-campaign', async (req, res) => {
  const { name, recipients, subject, html } = req.body;

  if (!BREVO_API_KEY || !BREVO_SENDER_EMAIL) {
    return res.status(500).json({
      success: false,
      error: 'Brevo is not configured. Please check BREVO_API_KEY and BREVO_SENDER_EMAIL in your environment variables.'
    });
  }

  if (!Array.isArray(recipients) || recipients.length === 0) {
    return res.status(400).json({
      success: false,
      error: 'No recipients were provided.'
    });
  }

  if (!subject || !html) {
    return res.status(400).json({
      success: false,
      error: 'Subject and email content are required.'
    });
  }

  const contacts = loadContacts();
  const campaigns = loadCampaigns();
  const activity = loadActivity();

  const unsubscribedEmails = new Set(
    contacts
      .filter(c => c.unsubscribed)
      .map(c => normalizeEmail(c.email))
  );

  const bouncedEmails = new Set(
    contacts
      .filter(c => c.bounced)
      .map(c => normalizeEmail(c.email))
  );

  const cleanRecipients = [
    ...new Set(
      recipients
        .map(email => normalizeEmail(email))
        .filter(email => email.includes('@'))
    )
  ];

  const allowedRecipients = cleanRecipients.filter(email =>
    !unsubscribedEmails.has(email) &&
    !bouncedEmails.has(email)
  );

  const skippedRecipients = cleanRecipients.filter(email =>
    unsubscribedEmails.has(email) ||
    bouncedEmails.has(email)
  );

  const campaignName = name || subject || 'Untitled Campaign';

  const results = {
    sent: [],
    failed: [],
    skipped: skippedRecipients
  };

  for (const email of allowedRecipients) {
    const pixel =
      `<img src="${BASE_URL}/track-open?email=${encodeURIComponent(email)}&campaign=${encodeURIComponent(campaignName)}" width="1" height="1" style="display:none;" />`;

    let trackedHtml = addUnsubscribeFooter(html || '', email);

    trackedHtml = trackedHtml.replace(/href="(.*?)"/g, (match, url) => {
      if (
        !url ||
        url.startsWith('#') ||
        url.startsWith('mailto:') ||
        url.startsWith('tel:')
      ) {
        return match;
      }

      return `href="${BASE_URL}/track-click?email=${encodeURIComponent(email)}&campaign=${encodeURIComponent(campaignName)}&url=${encodeURIComponent(url)}"`;
    });

    const finalHtml = trackedHtml + pixel;

    try {
      const brevoResult = await sendBrevoEmail({
        to: email,
        subject,
        html: finalHtml
      });

      activity.push({
        email,
        campaignName,
        subject,
        sentAt: new Date().toISOString(),
        opened: false,
        clicks: [],
        status: 'sent',
        provider: 'Brevo',
        brevoMessageId: brevoResult.messageId || null
      });

      results.sent.push(email);

    } catch (error) {
      const errorMessage = error.message || 'Unknown send failure';

      activity.push({
        email,
        campaignName,
        subject,
        sentAt: new Date().toISOString(),
        opened: false,
        clicks: [],
        status: 'failed',
        error: errorMessage
      });

      const matchingContact = contacts.find(
        c => normalizeEmail(c.email) === normalizeEmail(email)
      );

      if (matchingContact && isBounceError(errorMessage)) {
        matchingContact.bounced = true;
        matchingContact.bouncedAt = new Date().toISOString();
        matchingContact.bounceReason = errorMessage;
      }

      results.failed.push({
        email,
        error: errorMessage
      });
    }
  }

  saveContacts(contacts);
  saveActivity(activity);

  campaigns.push({
    id: Date.now(),
    name: campaignName,
    subject,
    html,
    status: results.failed.length ? 'Sent with Errors' : 'Sent',
    createdAt: new Date().toISOString(),
    sentCount: results.sent.length,
    failedCount: results.failed.length,
    skippedCount: results.skipped.length
  });

  saveCampaigns(campaigns);

  res.json({
    success: results.failed.length === 0,
    message:
      results.failed.length === 0
        ? `Campaign sent successfully to ${results.sent.length} recipient(s).`
        : `Campaign sent to ${results.sent.length} recipient(s), but ${results.failed.length} failed.`,
    results
  });
});

/* ================= OPEN TRACKING ================= */
app.get('/track-open', (req, res) => {
  const { email, campaign } = req.query;

  const activity = loadActivity();

  const record = activity.find(
    a => a.email === email && a.campaignName === campaign
  );

  if (record) {
    record.opened = true;
    record.openedAt = record.openedAt || new Date().toISOString();
  }

  saveActivity(activity);

  const img = Buffer.from(
    'R0lGODlhAQABAPAAAAAAAAAAACH5BAEAAAAALAAAAAABAAEAAAICRAEAOw==',
    'base64'
  );

  res.writeHead(200, {
    'Content-Type': 'image/gif',
    'Content-Length': img.length,
    'Cache-Control': 'no-cache'
  });

  res.end(img);
});

/* ================= CLICK TRACKING ================= */
app.get('/track-click', (req, res) => {
  const { email, campaign, url } = req.query;

  const activity = loadActivity();

  const record = activity.find(
    a => a.email === email && a.campaignName === campaign
  );

  if (record) {
    record.opened = true;
    record.openedAt = record.openedAt || new Date().toISOString();

    if (!record.clicks) {
      record.clicks = [];
    }

    record.clicks.push({
      url,
      clickedAt: new Date().toISOString()
    });
  }

  saveActivity(activity);

  res.redirect(url);
});

/* ================= START ================= */
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Excel Marketing System running on port ${PORT}`);
});
