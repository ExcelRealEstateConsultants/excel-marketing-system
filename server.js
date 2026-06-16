const express = require('express');
const { google } = require('googleapis');
const cors = require('cors');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const session = require('express-session');
const { google } = require('googleapis');

const app = express();
app.use(session({
  secret: process.env.SESSION_SECRET || 'rapportlink-secret',
  resave: false,
  saveUninitialized: false
}));

app.use(cors());
app.use(bodyParser.json({ limit: '75mb' }));
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
/* ================= GMAIL ================= */
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || '';
const GOOGLE_REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI || '';

const GMAIL_TOKEN_FILE = path.join(__dirname, 'gmail-token.json');

const gmailOAuthClient = new google.auth.OAuth2(
  GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET,
  GOOGLE_REDIRECT_URI
);

function loadGmailToken() {
  try {
    if (!fs.existsSync(GMAIL_TOKEN_FILE)) return null;
    return JSON.parse(fs.readFileSync(GMAIL_TOKEN_FILE, 'utf8'));
  } catch {
    return null;
  }
}

function saveGmailToken(tokens) {
  fs.writeFileSync(
    GMAIL_TOKEN_FILE,
    JSON.stringify(tokens, null, 2)
  );
}

function getGmailClient() {
  const tokens = loadGmailToken();

  if (!tokens) {
    throw new Error('Gmail is not connected.');
  }

  gmailOAuthClient.setCredentials(tokens);

  return google.gmail({
    version: 'v1',
    auth: gmailOAuthClient
  });
}
/* ================= GMAIL ROUTES ================= */
app.get('/auth/google', (req, res) => {
  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET || !GOOGLE_REDIRECT_URI) {
    return res.status(500).send('Google OAuth is not configured. Please check GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, and GOOGLE_REDIRECT_URI.');
  }

  const url = gmailOAuthClient.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: [
      'https://www.googleapis.com/auth/gmail.send',
      'https://www.googleapis.com/auth/userinfo.email'
    ]
  });

  res.redirect(url);
});

app.get('/auth/google/callback', async (req, res) => {
  try {
    const code = req.query.code;

    if (!code) {
      return res.status(400).send('Missing Google authorization code.');
    }

    const { tokens } = await gmailOAuthClient.getToken(code);
    saveGmailToken(tokens);

    res.send(`
      <html>
        <body style="font-family:Arial;padding:40px;background:#f4f6f8;">
          <div style="background:white;padding:30px;border-radius:16px;max-width:620px;margin:auto;">
            <h2>Gmail Connected</h2>
            <p>Your Gmail account is now connected to RapportLink.</p>
            <p>You can close this tab and return to RapportLink.</p>
          </div>
        </body>
      </html>
    `);
  } catch (error) {
    res.status(500).send(`Google connection failed: ${error.message}`);
  }
});

app.get('/api/gmail/status', async (req, res) => {
  try {
    const tokens = loadGmailToken();

    if (!tokens) {
      return res.json({ connected: false });
    }

    gmailOAuthClient.setCredentials(tokens);

    const oauth2 = google.oauth2({
      version: 'v2',
      auth: gmailOAuthClient
    });

    const userInfo = await oauth2.userinfo.get();

    res.json({
      connected: true,
      email: userInfo.data.email || ''
    });
  } catch (error) {
    res.json({
      connected: false,
      error: error.message
    });
  }
});

/* ================= TWILIO SMS ================= */
const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID || '';
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN || '';
const TWILIO_PHONE_NUMBER = process.env.TWILIO_PHONE_NUMBER || '';

/* =================  / GMAIL OAUTH ================= */
const _CLIENT_ID = process.env._CLIENT_ID || '';
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || '';
const GOOGLE_REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI || `${BASE_URL}/auth/google/callback`;

const GOOGLE_SCOPES = [
  'https://www.googleapis.com/auth/gmail.send',
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/userinfo.profile'
];

const googleOAuthClient = new google.auth.OAuth2(
  GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET,
  GOOGLE_REDIRECT_URI
);

/* ================= FILES ================= */
const DATA_FILE = path.join(__dirname, 'contacts.json');
const ACTIVITY_FILE = path.join(__dirname, 'activity.json');
const CAMPAIGN_FILE = path.join(__dirname, 'campaigns.json');
const TEMPLATE_FILE = path.join(__dirname, 'templates.json');
const SEGMENT_FILE = path.join(__dirname, 'segments.json');
const SCHEDULED_CAMPAIGN_FILE = path.join(__dirname, 'scheduled-campaigns.json');
const EMAIL_IMAGE_FILE = path.join(__dirname, 'email-images.json');
const SMS_ACTIVITY_FILE = path.join(__dirname, 'sms-activity.json');
const GMAIL_TOKENS_FILE = path.join(__dirname, 'gmail-tokens.json');

const PIPELINE_STAGES = [
  'New Lead',
  'Contacted',
  'Appointment Set',
  'Active Prospect',
  'Listed',
  'Under Contract',
  'Pending',
  'Closed',
  'Past Client'
];

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

function normalizePhone(phone) {
  return String(phone || '').replace(/\D/g, '').slice(0, 10);
}

function normalizeSmsPhone(phone) {
  const raw = String(phone || '').trim();
  const digits = raw.replace(/\D/g, '');

  if (raw.startsWith('+')) return raw;
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`;
  return raw;
}

function maskPhone(phone) {
  const digits = String(phone || '').replace(/\D/g, '');
  if (digits.length >= 10) {
    const last10 = digits.slice(-10);
    return `(${last10.slice(0,3)}) ${last10.slice(3,6)}-${last10.slice(6)}`;
  }
  return phone || '';
}

function defaultStage(stage) {
  return PIPELINE_STAGES.includes(stage) ? stage : 'New Lead';
}

function normalizeStageForPipeline(value) {
  const raw = String(value || '').trim().toLowerCase();
  const matched = PIPELINE_STAGES.find(stage => String(stage).toLowerCase() === raw);
  return matched || 'New Lead';
}

function normalizeContactPipelineFields(contact = {}) {
  const stage = normalizeStageForPipeline(contact.stage || contact.pipelineStage || contact.status || 'New Lead');
  const now = new Date().toISOString();

  return {
    ...contact,
    stage,
    stageUpdatedAt: contact.stageUpdatedAt || contact.updatedAt || contact.createdAt || now,
    stageHistory: Array.isArray(contact.stageHistory) && contact.stageHistory.length
      ? contact.stageHistory
      : [{ stage, date: contact.stageUpdatedAt || contact.updatedAt || contact.createdAt || now }]
  };
}

function normalizeContactsForPipeline(contacts) {
  return (Array.isArray(contacts) ? contacts : []).map(normalizeContactPipelineFields);
}

function todayDateString() {
  return new Date().toISOString().slice(0, 10);
}

function isOverdueTask(task) {
  return task && !task.done && task.due && String(task.due).slice(0, 10) < todayDateString();
}

function isDueTodayTask(task) {
  return task && !task.done && task.due && String(task.due).slice(0, 10) === todayDateString();
}

function escapeHtml(value) {
  return String(value || '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}


function parseTags(value) {
  if (Array.isArray(value)) return value.map(tag => String(tag || '').trim()).filter(Boolean);
  return String(value || '')
    .split(',')
    .map(tag => tag.trim())
    .filter(Boolean);
}

function csvEscape(value) {
  const stringValue = String(value ?? '');
  if (/[",\n\r]/.test(stringValue)) {
    return `"${stringValue.replaceAll('"', '""')}"`;
  }
  return stringValue;
}

function buildContactFromPayload(payload = {}) {
  const stage = normalizeStageForPipeline(payload.stage || payload.pipelineStage || payload.status || 'New Lead');
  const notes = [];

  if (payload.note || payload.notes) {
    notes.push({
      text: String(payload.note || payload.notes || '').trim(),
      date: new Date().toISOString()
    });
  }

  return {
    id: Date.now() + Math.floor(Math.random() * 1000000),
    firstName: payload.firstName || '',
    lastName: payload.lastName || '',
    email: payload.email || '',
    phone: normalizePhone(payload.phone),
    type: payload.type || 'Unassigned',
    stage,
    stageUpdatedAt: new Date().toISOString(),
    stageHistory: [{ stage, date: new Date().toISOString() }],
    tags: parseTags(payload.tags),
    unsubscribed: false,
    unsubscribedAt: null,
    bounced: false,
    bouncedAt: null,
    bounceReason: '',
    notes,
    tasks: []
  };
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
  return normalizeContactsForPipeline(readJsonFile(DATA_FILE, []));
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

function loadTemplates() {
  return readJsonFile(TEMPLATE_FILE, []);
}

function saveTemplates(data) {
  writeJsonFile(TEMPLATE_FILE, data);
}

function loadSegments() {
  return readJsonFile(SEGMENT_FILE, []);
}

function saveSegments(data) {
  writeJsonFile(SEGMENT_FILE, data);
}

function loadScheduledCampaigns() {
  return readJsonFile(SCHEDULED_CAMPAIGN_FILE, []);
}

function saveScheduledCampaigns(data) {
  writeJsonFile(SCHEDULED_CAMPAIGN_FILE, data);
}

function loadEmailImages() {
  return readJsonFile(EMAIL_IMAGE_FILE, []);
}

function saveEmailImages(data) {
  writeJsonFile(EMAIL_IMAGE_FILE, data);
}

function loadSmsActivity() {
  return readJsonFile(SMS_ACTIVITY_FILE, []);
}

function saveSmsActivity(data) {
  writeJsonFile(SMS_ACTIVITY_FILE, data);
}

function loadGmailTokens() {
  return readJsonFile(GMAIL_TOKENS_FILE, {});
}

function saveGmailTokens(data) {
  writeJsonFile(GMAIL_TOKENS_FILE, data);
}

/* ================= EMAIL IMAGE LIBRARY ================= */
app.get('/api/email-images', (req, res) => {
  res.json(loadEmailImages());
});

app.post('/api/email-images', (req, res) => {
  const images = loadEmailImages();
  const image = {
    id: req.body.id || Date.now(),
    name: req.body.name || 'Uploaded image',
    data: req.body.data || '',
    createdAt: req.body.createdAt || new Date().toISOString()
  };

  if (!image.data || !String(image.data).startsWith('data:image/')) {
    return res.status(400).json({ success: false, error: 'Valid image data is required.' });
  }

  images.unshift(image);
  saveEmailImages(images.slice(0, 100));
  res.json({ success: true, image });
});

app.delete('/api/email-images/:id', (req, res) => {
  const id = String(req.params.id || '');
  const images = loadEmailImages().filter(image => String(image.id) !== id);
  saveEmailImages(images);
  res.json({ success: true });
});

app.delete('/api/email-images', (req, res) => {
  saveEmailImages([]);
  res.json({ success: true });
});

function addPreheader(html, preheader) {
  if (!preheader) return html || '';
  const hiddenPreheader = `<div style="display:none!important;visibility:hidden;opacity:0;color:transparent;height:0;width:0;overflow:hidden;mso-hide:all;">${escapeHtml(preheader)}</div>`;
  if (String(html || '').includes('mso-hide:all')) return html || '';
  return `${hiddenPreheader}${html || ''}`;
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


/* ================= TWILIO SEND FUNCTION ================= */
async function sendTwilioSms({ to, body }) {
  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_PHONE_NUMBER) {
    throw new Error('Twilio is not configured. Please check TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_PHONE_NUMBER in your environment variables.');
  }

  const formattedTo = normalizeSmsPhone(to);
  const formattedFrom = normalizeSmsPhone(TWILIO_PHONE_NUMBER);

  if (!formattedTo || !body) {
    throw new Error('Phone number and message are required.');
  }

  const auth = Buffer.from(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`).toString('base64');
  const params = new URLSearchParams();
  params.append('To', formattedTo);
  params.append('From', formattedFrom);
  params.append('Body', body);

  const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: params.toString()
  });

  const result = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(result.message || `Twilio SMS failed for ${maskPhone(formattedTo)}`);
  }

  return result;
}
/* ================= GMAIL CONNECTION ROUTES ================= */
function getGoogleOAuthClientWithTokens() {
  const tokens = loadGmailTokens();

  if (!tokens || !tokens.access_token) {
    return null;
  }

  const client = new google.auth.OAuth2(
    GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET,
    GOOGLE_REDIRECT_URI
  );

  client.setCredentials(tokens);
  return client;
}

app.get('/auth/google', (req, res) => {
  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
    return res.status(500).send('Google OAuth is not configured. Please add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to your environment variables.');
  }

  const authUrl = googleOAuthClient.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: GOOGLE_SCOPES
  });

  res.redirect(authUrl);
});

app.get('/auth/google/callback', async (req, res) => {
  try {
    const code = req.query.code;

    if (!code) {
      return res.status(400).send('Missing Google authorization code.');
    }

    const { tokens } = await googleOAuthClient.getToken(code);
    googleOAuthClient.setCredentials(tokens);

    const oauth2 = google.oauth2({
      auth: googleOAuthClient,
      version: 'v2'
    });

    const profile = await oauth2.userinfo.get();

    saveGmailTokens({
      ...tokens,
      email: profile.data.email || '',
      name: profile.data.name || '',
      connectedAt: new Date().toISOString()
    });

    res.send(`
      <html>
        <body style="font-family:Arial;padding:40px;background:#f4f6f8;">
          <div style="background:white;padding:30px;border-radius:16px;max-width:620px;margin:auto;">
            <h2>Gmail Connected</h2>
            <p>Your Gmail account has been connected successfully.</p>
            <p><b>Connected account:</b> ${escapeHtml(profile.data.email || '')}</p>
            <a href="/" style="display:inline-block;margin-top:16px;background:#00A143;color:white;padding:12px 18px;border-radius:10px;text-decoration:none;font-weight:bold;">Return to RapportLink</a>
          </div>
        </body>
      </html>
    `);
  } catch (error) {
    res.status(500).send(`Google connection failed: ${escapeHtml(error.message || 'Unknown error')}`);
  }
});

app.get('/api/gmail/status', (req, res) => {
  const tokens = loadGmailTokens();

  res.json({
    connected: !!tokens.access_token,
    email: tokens.email || '',
    name: tokens.name || '',
    connectedAt: tokens.connectedAt || ''
  });
});

app.post('/api/gmail/disconnect', (req, res) => {
  saveGmailTokens({});
  res.json({ success: true });
});
/* ================= CONTACT ROUTES ================= */
app.get('/api/contacts', (req, res) => {
  res.json(loadContacts());
});

app.post('/api/contacts', (req, res) => {
  const contacts = loadContacts();
  const newContact = buildContactFromPayload(req.body);

  contacts.push(newContact);
  saveContacts(contacts);

  res.json({ success: true, contact: newContact });
});


app.post('/api/contacts/import', (req, res) => {
  const incoming = Array.isArray(req.body.contacts) ? req.body.contacts : [];
  const contacts = loadContacts();

  const existingEmails = new Set(contacts.map(c => normalizeEmail(c.email)).filter(Boolean));
  const existingPhones = new Set(contacts.map(c => normalizePhone(c.phone)).filter(Boolean));
  const seenEmails = new Set();
  const seenPhones = new Set();

  const importedContacts = [];
  const skippedRows = [];

  incoming.forEach((row, index) => {
    const emailKey = normalizeEmail(row.email);
    const phoneKey = normalizePhone(row.phone);
    const reasons = [];

    if (!emailKey && !phoneKey) reasons.push('Missing email and phone');
    if (emailKey && (existingEmails.has(emailKey) || seenEmails.has(emailKey))) reasons.push('Duplicate email');
    if (phoneKey && (existingPhones.has(phoneKey) || seenPhones.has(phoneKey))) reasons.push('Duplicate phone');

    if (reasons.length) {
      skippedRows.push({ index, row, reasons });
      return;
    }

    const newContact = buildContactFromPayload(row);
    importedContacts.push(newContact);
    contacts.push(newContact);

    if (emailKey) seenEmails.add(emailKey);
    if (phoneKey) seenPhones.add(phoneKey);
  });

  saveContacts(contacts);

  res.json({
    success: true,
    imported: importedContacts.length,
    skipped: skippedRows.length,
    skippedRows,
    contacts: importedContacts
  });
});

app.get('/api/contacts/export', (req, res) => {
  const contacts = loadContacts();
  const headers = ['First Name', 'Last Name', 'Email', 'Phone', 'Type', 'Stage', 'Tags', 'Unsubscribed', 'Bounced', 'Open Tasks', 'Notes'];

  const rows = contacts.map(contact => [
    contact.firstName || '',
    contact.lastName || '',
    contact.email || '',
    contact.phone || '',
    contact.type || '',
    contact.stage || 'New Lead',
    Array.isArray(contact.tags) ? contact.tags.join(', ') : '',
    contact.unsubscribed ? 'Yes' : 'No',
    contact.bounced ? 'Yes' : 'No',
    Array.isArray(contact.tasks) ? contact.tasks.filter(task => !task.done).length : 0,
    Array.isArray(contact.notes) ? contact.notes.map(note => note.text || '').join(' | ') : ''
  ]);

  const csv = [headers, ...rows]
    .map(row => row.map(csvEscape).join(','))
    .join('\n');

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="excel-crm-contacts-export.csv"');
  res.send(csv);
});

app.put('/api/contacts/:id', (req, res) => {
  const contacts = loadContacts();

  const i = contacts.findIndex(c => c.id == req.params.id);

  if (i === -1) return res.status(404).json({ error: 'Not found' });

  const oldStage = normalizeStageForPipeline(contacts[i].stage || 'New Lead');
  const newStage = normalizeStageForPipeline(req.body.stage || oldStage);
  const stageChanged = oldStage !== newStage;

  contacts[i] = {
    ...contacts[i],
    firstName: req.body.firstName,
    lastName: req.body.lastName,
    email: req.body.email,
    phone: normalizePhone(req.body.phone),
    type: req.body.type,
    stage: newStage,
    stageUpdatedAt: stageChanged ? new Date().toISOString() : (contacts[i].stageUpdatedAt || new Date().toISOString()),
    stageHistory: stageChanged
      ? [
          ...(Array.isArray(contacts[i].stageHistory) ? contacts[i].stageHistory : []),
          { from: oldStage, stage: newStage, date: new Date().toISOString() }
        ]
      : (Array.isArray(contacts[i].stageHistory) ? contacts[i].stageHistory : []),
        tags: Array.isArray(req.body.tags) ? req.body.tags : [],

    occupation: req.body.occupation || '',
    birthday: req.body.birthday || '',

    spouseName: req.body.spouseName || '',
    spouseOccupation: req.body.spouseOccupation || '',
    spouseEmail: req.body.spouseEmail || '',
    spouseBirthday: req.body.spouseBirthday || '',
    spousePhone: req.body.spousePhone || '',

    anniversary: req.body.anniversary || '',

    children: Array.isArray(req.body.children) ? req.body.children : [],

    pets: req.body.pets || '',
    hobbies: req.body.hobbies || '',
    favoriteRestaurant: req.body.favoriteRestaurant || '',
    favoriteTeams: req.body.favoriteTeams || '',
    interests: req.body.interests || '',
    relationshipNotes: req.body.relationshipNotes || ''
  };

  saveContacts(contacts);

  res.json({ success: true, contact: contacts[i] });
});

app.delete('/api/contacts/:id', (req, res) => {
  let contacts = loadContacts();
  contacts = contacts.filter(c => c.id != req.params.id);
  saveContacts(contacts);

  res.json({ success: true });
});

/* ================= PIPELINE ================= */
app.get('/api/pipeline-stages', (req, res) => {
  res.json(PIPELINE_STAGES);
});

app.put('/api/contacts/:id/stage', (req, res) => {
  const contacts = loadContacts();
  const contact = contacts.find(c => c.id == req.params.id);

  if (!contact) return res.status(404).json({ success: false, error: 'Contact not found' });

  const oldStage = normalizeStageForPipeline(contact.stage || 'New Lead');
  const newStage = normalizeStageForPipeline(req.body.stage || 'New Lead');

  contact.stage = newStage;

  if (oldStage !== newStage) {
    contact.stageUpdatedAt = new Date().toISOString();
    if (!Array.isArray(contact.stageHistory)) contact.stageHistory = [];
    contact.stageHistory.push({ from: oldStage, stage: newStage, date: new Date().toISOString() });
  }

  saveContacts(contacts);
  res.json({ success: true, contact });
});


/* ================= CONTACT BULK ACTIONS ================= */
app.put('/api/contacts/bulk-update', (req, res) => {
  const contacts = loadContacts();
  const ids = Array.isArray(req.body.ids) ? req.body.ids.map(String) : [];
  const addTags = Array.isArray(req.body.addTags) ? req.body.addTags.map(t => String(t).trim()).filter(Boolean) : [];
  const newType = String(req.body.type || '').trim();
  const newStageRaw = String(req.body.stage || '').trim();
  const newStage = newStageRaw ? normalizeStageForPipeline(newStageRaw) : '';

  if (!ids.length) {
    return res.status(400).json({ success: false, error: 'No contacts selected.' });
  }

  let updated = 0;

  contacts.forEach(contact => {
    if (!ids.includes(String(contact.id))) return;

    if (newType) contact.type = newType;

    if (newStage) {
      const oldStage = normalizeStageForPipeline(contact.stage || 'New Lead');
      if (oldStage !== newStage) {
        contact.stage = newStage;
        contact.stageUpdatedAt = new Date().toISOString();
        if (!Array.isArray(contact.stageHistory)) contact.stageHistory = [];
        contact.stageHistory.push({ from: oldStage, stage: newStage, date: new Date().toISOString() });
      }
    }

    if (!Array.isArray(contact.tags)) contact.tags = [];
    addTags.forEach(tag => {
      if (!contact.tags.includes(tag)) contact.tags.push(tag);
    });

    updated++;
  });

  saveContacts(contacts);
  res.json({ success: true, updated });
});

app.delete('/api/contacts/bulk-delete', (req, res) => {
  const ids = Array.isArray(req.body.ids) ? req.body.ids.map(String) : [];

  if (!ids.length) {
    return res.status(400).json({ success: false, error: 'No contacts selected.' });
  }

  const contacts = loadContacts();
  const remaining = contacts.filter(contact => !ids.includes(String(contact.id)));
  const deleted = contacts.length - remaining.length;

  saveContacts(remaining);
  res.json({ success: true, deleted });
});

app.get('/api/contacts/duplicates', (req, res) => {
  const contacts = loadContacts();
  const emailMap = {};
  const phoneMap = {};

  contacts.forEach(contact => {
    const email = normalizeEmail(contact.email);
    const phone = normalizePhone(contact.phone);

    if (email) {
      if (!emailMap[email]) emailMap[email] = [];
      emailMap[email].push(contact);
    }

    if (phone) {
      if (!phoneMap[phone]) phoneMap[phone] = [];
      phoneMap[phone].push(contact);
    }
  });

  const duplicates = [];

  Object.entries(emailMap).forEach(([value, items]) => {
    if (items.length > 1) duplicates.push({ type: 'email', value, contacts: items });
  });

  Object.entries(phoneMap).forEach(([value, items]) => {
    if (items.length > 1) duplicates.push({ type: 'phone', value, contacts: items });
  });

  res.json(duplicates);
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

/* ================= TASKS / FOLLOW-UPS ================= */
app.post('/api/contacts/:id/task', (req, res) => {
  const contacts = loadContacts();

  const c = contacts.find(x => x.id == req.params.id);
  if (!c) return res.status(404).json({ error: 'Not found' });

  if (!c.tasks) c.tasks = [];

  c.tasks.push({
    id: Date.now(),
    title: req.body.title || '',
    due: req.body.due || '',
    priority: req.body.priority || 'Normal',
    notes: req.body.notes || '',
    done: false,
    createdAt: new Date().toISOString(),
    completedAt: null
  });

  saveContacts(contacts);

  res.json({ success: true, contact: c });
});

app.put('/api/contacts/:id/task/:taskId', (req, res) => {
  const contacts = loadContacts();

  const c = contacts.find(x => x.id == req.params.id);
  if (!c) return res.status(404).json({ error: 'Not found' });

  if (!c.tasks) c.tasks = [];

  const t = c.tasks.find(t => t.id == req.params.taskId);
  if (!t) return res.status(404).json({ success: false, error: 'Task not found' });

  if (req.body.toggleDone) {
    t.done = !t.done;
    t.completedAt = t.done ? new Date().toISOString() : null;
  } else {
    t.title = req.body.title || t.title;
    t.due = req.body.due || t.due;
    t.priority = req.body.priority || t.priority || 'Normal';
    t.notes = req.body.notes || t.notes || '';
  }

  saveContacts(contacts);

  res.json({ success: true, contact: c, task: t });
});

app.delete('/api/contacts/:id/task/:taskId', (req, res) => {
  const contacts = loadContacts();

  const c = contacts.find(x => x.id == req.params.id);
  if (!c) return res.status(404).json({ error: 'Not found' });

  if (!Array.isArray(c.tasks)) c.tasks = [];
  c.tasks = c.tasks.filter(t => t.id != req.params.taskId);

  saveContacts(contacts);

  res.json({ success: true, contact: c });
});

app.get('/api/tasks', (req, res) => {
  const contacts = loadContacts();
  const tasks = [];

  contacts.forEach(contact => {
    (contact.tasks || []).forEach(task => {
      tasks.push({
        ...task,
        contactId: contact.id,
        contactName: `${contact.firstName || ''} ${contact.lastName || ''}`.trim(),
        email: contact.email || '',
        phone: contact.phone || '',
        stage: contact.stage || 'New Lead'
      });
    });
  });

  tasks.sort((a, b) => new Date(a.due || '9999-12-31') - new Date(b.due || '9999-12-31'));

  res.json(tasks);
});

app.get('/api/task-stats', (req, res) => {
  const contacts = loadContacts();
  let dueToday = 0;
  let overdue = 0;
  let upcoming = 0;
  let open = 0;

  contacts.forEach(contact => {
    (contact.tasks || []).forEach(task => {
      if (task.done) return;
      open++;
      if (isDueTodayTask(task)) dueToday++;
      else if (isOverdueTask(task)) overdue++;
      else if (task.due) upcoming++;
    });
  });

  res.json({ dueToday, overdue, upcoming, open });
});

app.get('/api/calendar-events', (req, res) => {
  const contacts = loadContacts();
  const scheduledCampaigns = loadScheduledCampaigns();
  const events = [];

  contacts.forEach(contact => {
    (contact.tasks || []).forEach(task => {
      if (!task.due) return;
      events.push({
        id: `task-${contact.id}-${task.id}`,
        type: task.done ? 'Completed Task' : 'Task',
        title: task.title || 'Untitled Task',
        date: String(task.due).slice(0, 10),
        contactId: contact.id,
        contactName: `${contact.firstName || ''} ${contact.lastName || ''}`.trim(),
        priority: task.priority || 'Normal',
        done: !!task.done
      });
    });

    (contact.notes || []).forEach((note, index) => {
      if (!note.date) return;
      events.push({
        id: `note-${contact.id}-${index}`,
        type: 'Note',
        title: note.text || 'Note',
        date: String(note.date).slice(0, 10),
        contactId: contact.id,
        contactName: `${contact.firstName || ''} ${contact.lastName || ''}`.trim()
      });
    });

    (contact.stageHistory || []).forEach((stageItem, index) => {
      if (!stageItem.date) return;
      events.push({
        id: `stage-${contact.id}-${index}`,
        type: 'Pipeline Stage',
        title: stageItem.stage || 'Stage Change',
        date: String(stageItem.date).slice(0, 10),
        contactId: contact.id,
        contactName: `${contact.firstName || ''} ${contact.lastName || ''}`.trim()
      });
    });
  });

  scheduledCampaigns.forEach(campaign => {
    if (!campaign.scheduledAt) return;
    events.push({
      id: `scheduled-${campaign.id}`,
      type: 'Scheduled Campaign',
      title: campaign.name || campaign.subject || 'Scheduled Campaign',
      date: String(campaign.scheduledAt).slice(0, 10),
      campaignId: campaign.id,
      status: campaign.status || 'Scheduled'
    });
  });

  events.sort((a, b) => new Date(a.date) - new Date(b.date));
  res.json(events);
});


/* ================= SMS ACTIVITY / TEXTING ================= */
app.get('/api/sms-activity', (req, res) => {
  const smsActivity = loadSmsActivity();
  const contactId = req.query.contactId ? String(req.query.contactId) : '';
  const phone = req.query.phone ? normalizeSmsPhone(req.query.phone) : '';

  let filtered = smsActivity;

  if (contactId) {
    filtered = filtered.filter(item => String(item.contactId || '') === contactId);
  }

  if (phone) {
    filtered = filtered.filter(item => normalizeSmsPhone(item.to || item.from || '') === phone);
  }

  filtered.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
  res.json(filtered);
});

app.post('/api/send-sms', async (req, res) => {
  const contacts = loadContacts();
  const smsActivity = loadSmsActivity();

  const contact = req.body.contactId
    ? contacts.find(c => String(c.id) === String(req.body.contactId))
    : null;

  const to = normalizeSmsPhone(req.body.to || (contact ? contact.phone : ''));
  const message = String(req.body.message || '').trim();

  if (!to) {
    return res.status(400).json({ success: false, error: 'A phone number is required before sending a text.' });
  }

  if (!message) {
    return res.status(400).json({ success: false, error: 'A message is required before sending a text.' });
  }

  const baseRecord = {
    id: Date.now(),
    contactId: contact ? contact.id : (req.body.contactId || null),
    contactName: contact ? `${contact.firstName || ''} ${contact.lastName || ''}`.trim() : '',
    to,
    from: normalizeSmsPhone(TWILIO_PHONE_NUMBER),
    message,
    direction: 'outbound',
    provider: 'Twilio',
    status: 'pending',
    createdAt: new Date().toISOString(),
    sentAt: null,
    twilioSid: null,
    error: ''
  };

  try {
    const twilioResult = await sendTwilioSms({ to, body: message });

    const sentRecord = {
      ...baseRecord,
      status: twilioResult.status || 'sent',
      sentAt: new Date().toISOString(),
      twilioSid: twilioResult.sid || null
    };

    smsActivity.unshift(sentRecord);
    saveSmsActivity(smsActivity);

    res.json({ success: true, message: 'Text message sent.', sms: sentRecord });
  } catch (error) {
    const failedRecord = {
      ...baseRecord,
      status: 'failed',
      error: error.message || 'Unknown SMS failure'
    };

    smsActivity.unshift(failedRecord);
    saveSmsActivity(smsActivity);

    res.status(500).json({ success: false, error: failedRecord.error, sms: failedRecord });
  }
});


app.post('/api/send-text-campaign', async (req, res) => {
  const smsActivity = loadSmsActivity();
  const campaignName = String(req.body.name || 'Untitled Text Campaign').trim();
  const message = String(req.body.message || '').trim();
  const recipients = Array.isArray(req.body.recipients) ? req.body.recipients : [];

  if (!message) {
    return res.status(400).json({ success: false, error: 'A message is required before sending a text campaign.' });
  }

  if (recipients.length === 0) {
    return res.status(400).json({ success: false, error: 'At least one recipient is required before sending a text campaign.' });
  }

  const results = [];
  let sent = 0;
  let failed = 0;

  for (const recipient of recipients) {
    const to = normalizeSmsPhone(recipient.to || recipient.phone || '');

    const baseRecord = {
      id: Date.now() + Math.floor(Math.random() * 100000),
      campaignName,
      contactId: recipient.contactId || null,
      contactName: recipient.contactName || '',
      to,
      from: normalizeSmsPhone(TWILIO_PHONE_NUMBER),
      message,
      direction: 'outbound',
      provider: 'Twilio',
      type: 'text-campaign',
      status: 'pending',
      createdAt: new Date().toISOString(),
      sentAt: null,
      twilioSid: null,
      error: ''
    };

    if (!to) {
      failed++;
      const failedRecord = { ...baseRecord, status: 'failed', error: 'Missing phone number.' };
      smsActivity.unshift(failedRecord);
      results.push(failedRecord);
      continue;
    }

    try {
      const twilioResult = await sendTwilioSms({ to, body: message });
      sent++;
      const sentRecord = {
        ...baseRecord,
        status: twilioResult.status || 'sent',
        sentAt: new Date().toISOString(),
        twilioSid: twilioResult.sid || null
      };
      smsActivity.unshift(sentRecord);
      results.push(sentRecord);
    } catch (error) {
      failed++;
      const failedRecord = {
        ...baseRecord,
        status: 'failed',
        error: error.message || 'Unknown SMS failure'
      };
      smsActivity.unshift(failedRecord);
      results.push(failedRecord);
    }
  }

  saveSmsActivity(smsActivity);

  res.json({
    success: sent > 0,
    message: `Text campaign finished. Sent: ${sent}. Failed: ${failed}.`,
    sent,
    failed,
    results
  });
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
    preheader: req.body.preheader || '',
    html: req.body.html || '',
    designData: req.body.designData || null,
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
    preheader: req.body.preheader || '',
    html: req.body.html || '',
    designData: req.body.designData || null,
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


/* ================= TEMPLATES ================= */
app.get('/api/templates', (req, res) => {
  res.json(loadTemplates());
});

app.post('/api/templates', (req, res) => {
  const templates = loadTemplates();

  const newTemplate = {
    id: Date.now(),
    name: req.body.name || 'Untitled Template',
    category: req.body.category || 'General',
    subject: req.body.subject || '',
    preheader: req.body.preheader || '',
    html: req.body.html || '',
    designData: req.body.designData || null,
    createdAt: new Date().toISOString(),
    updatedAt: null
  };

  templates.push(newTemplate);
  saveTemplates(templates);

  res.json({ success: true, template: newTemplate });
});

app.put('/api/templates/:id', (req, res) => {
  const templates = loadTemplates();
  const index = templates.findIndex(t => t.id == req.params.id);

  if (index === -1) {
    return res.status(404).json({ success: false, error: 'Template not found' });
  }

  templates[index] = {
    ...templates[index],
    name: req.body.name || templates[index].name || 'Untitled Template',
    category: req.body.category || 'General',
    subject: req.body.subject || '',
    preheader: req.body.preheader || '',
    html: req.body.html || '',
    designData: req.body.designData || null,
    updatedAt: new Date().toISOString()
  };

  saveTemplates(templates);

  res.json({ success: true, template: templates[index] });
});

app.delete('/api/templates/:id', (req, res) => {
  let templates = loadTemplates();
  const existingTemplate = templates.find(t => t.id == req.params.id);

  if (!existingTemplate) {
    return res.status(404).json({ success: false, error: 'Template not found' });
  }

  templates = templates.filter(t => t.id != req.params.id);
  saveTemplates(templates);

  res.json({ success: true });
});

/* ================= SEGMENTS ================= */
app.get('/api/segments', (req, res) => {
  res.json(loadSegments());
});

app.post('/api/segments', (req, res) => {
  const segments = loadSegments();

  const newSegment = {
    id: Date.now(),
    name: req.body.name || 'Untitled Segment',
    types: Array.isArray(req.body.types) ? req.body.types : [],
    tags: Array.isArray(req.body.tags) ? req.body.tags : [],
    matchMode: req.body.matchMode === 'all' ? 'all' : 'any',
    createdAt: new Date().toISOString(),
    updatedAt: null
  };

  segments.push(newSegment);
  saveSegments(segments);

  res.json({ success: true, segment: newSegment });
});

app.put('/api/segments/:id', (req, res) => {
  const segments = loadSegments();
  const index = segments.findIndex(s => s.id == req.params.id);

  if (index === -1) {
    return res.status(404).json({ success: false, error: 'Segment not found' });
  }

  segments[index] = {
    ...segments[index],
    name: req.body.name || segments[index].name || 'Untitled Segment',
    types: Array.isArray(req.body.types) ? req.body.types : [],
    tags: Array.isArray(req.body.tags) ? req.body.tags : [],
    matchMode: req.body.matchMode === 'all' ? 'all' : 'any',
    updatedAt: new Date().toISOString()
  };

  saveSegments(segments);

  res.json({ success: true, segment: segments[index] });
});

app.delete('/api/segments/:id', (req, res) => {
  let segments = loadSegments();
  const existingSegment = segments.find(s => s.id == req.params.id);

  if (!existingSegment) {
    return res.status(404).json({ success: false, error: 'Segment not found' });
  }

  segments = segments.filter(s => s.id != req.params.id);
  saveSegments(segments);

  res.json({ success: true });
});

/* ================= SCHEDULED CAMPAIGNS ================= */
app.get('/api/scheduled-campaigns', (req, res) => {
  res.json(loadScheduledCampaigns());
});

app.post('/api/scheduled-campaigns', (req, res) => {
  const scheduledCampaigns = loadScheduledCampaigns();

  const recipients = Array.isArray(req.body.recipients)
    ? req.body.recipients.map(normalizeEmail).filter(email => email.includes('@'))
    : [];

  if (!req.body.scheduledAt) {
    return res.status(400).json({ success: false, error: 'Scheduled date/time is required.' });
  }

  if (recipients.length === 0) {
    return res.status(400).json({ success: false, error: 'At least one recipient is required.' });
  }

  if (!req.body.subject || !req.body.html) {
    return res.status(400).json({ success: false, error: 'Subject and content are required.' });
  }

  const scheduledDate = new Date(req.body.scheduledAt);

  if (Number.isNaN(scheduledDate.getTime())) {
    return res.status(400).json({ success: false, error: 'Scheduled date/time is invalid.' });
  }

  const newScheduledCampaign = {
    id: Date.now(),
    name: req.body.name || req.body.subject || 'Untitled Scheduled Campaign',
    subject: req.body.subject || '',
    preheader: req.body.preheader || '',
    html: req.body.html || '',
    designData: req.body.designData || null,
    recipients,
    scheduledAt: scheduledDate.toISOString(),
    status: 'Scheduled',
    createdAt: new Date().toISOString(),
    sentAt: null,
    resultSummary: null
  };

  scheduledCampaigns.push(newScheduledCampaign);
  saveScheduledCampaigns(scheduledCampaigns);

  res.json({ success: true, scheduledCampaign: newScheduledCampaign });
});

app.delete('/api/scheduled-campaigns/:id', (req, res) => {
  let scheduledCampaigns = loadScheduledCampaigns();
  const existingScheduledCampaign = scheduledCampaigns.find(c => c.id == req.params.id);

  if (!existingScheduledCampaign) {
    return res.status(404).json({ success: false, error: 'Scheduled campaign not found' });
  }

  if (existingScheduledCampaign.status === 'Sent') {
    return res.status(400).json({ success: false, error: 'Sent scheduled campaigns cannot be deleted.' });
  }

  scheduledCampaigns = scheduledCampaigns.filter(c => c.id != req.params.id);
  saveScheduledCampaigns(scheduledCampaigns);

  res.json({ success: true });
});

/* ================= SEND ONE-TO-ONE CONTACT EMAIL ================= */
app.post('/api/send-contact-email', async (req, res) => {
  try {
    if (!BREVO_API_KEY || !BREVO_SENDER_EMAIL) {
      return res.status(500).json({
        success: false,
        error: 'Brevo is not configured. Please check BREVO_API_KEY and BREVO_SENDER_EMAIL in your environment variables.'
      });
    }

    const to = normalizeEmail(req.body.to);
    const subject = String(req.body.subject || '').trim();
    const message = String(req.body.message || '').trim();
    const contactId = req.body.contactId || null;

    if (!to || !to.includes('@')) {
      return res.status(400).json({ success: false, error: 'A valid email address is required.' });
    }

    if (!subject) {
      return res.status(400).json({ success: false, error: 'Subject is required.' });
    }

    if (!message) {
      return res.status(400).json({ success: false, error: 'Email message is required.' });
    }

    const safeMessage = escapeHtml(message).replace(/\n/g, '<br>');

    const html = `
      <div style="font-family:Arial,sans-serif;font-size:15px;line-height:1.55;color:#111827;">
        ${safeMessage}
      </div>
    `;

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
    textContent: message,
    htmlContent: html
  })
});

const brevoResult = await response.json().catch(() => ({}));

if (!response.ok) {
  throw new Error(brevoResult.message || `Brevo send failed for ${to}`);
}

    const activity = loadActivity();

    activity.push({
      email: to,
      contactId,
      campaignName: 'One-to-One Contact Email',
      subject,
      sentAt: new Date().toISOString(),
      opened: false,
      clicks: [],
      status: 'sent',
      provider: 'Brevo',
      type: 'direct-email',
      brevoMessageId: brevoResult.messageId || null
    });

    saveActivity(activity);

    res.json({
      success: true,
      message: 'Email sent successfully.',
      brevoMessageId: brevoResult.messageId || null
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message || 'Email failed.'
    });
  }
});

/* ================= SEND CAMPAIGN ================= */
async function sendCampaignCore({ name, recipients, subject, html, preheader = '', saveCampaignRecord = true, scheduledCampaignId = null }) {
  if (!BREVO_API_KEY || !BREVO_SENDER_EMAIL) {
    throw new Error('Brevo is not configured. Please check BREVO_API_KEY and BREVO_SENDER_EMAIL in your environment variables.');
  }

  if (!Array.isArray(recipients) || recipients.length === 0) {
    throw new Error('No recipients were provided.');
  }

  if (!subject || !html) {
    throw new Error('Subject and email content are required.');
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
        brevoMessageId: brevoResult.messageId || null,
        scheduledCampaignId
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
        error: errorMessage,
        scheduledCampaignId
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

  if (saveCampaignRecord) {
    campaigns.push({
      id: Date.now(),
      name: campaignName,
      subject,
      preheader,
      html,
      status: results.failed.length ? 'Sent with Errors' : 'Sent',
      createdAt: new Date().toISOString(),
      sentCount: results.sent.length,
      failedCount: results.failed.length,
      skippedCount: results.skipped.length,
      scheduledCampaignId
    });

    saveCampaigns(campaigns);
  }

  return {
    success: results.failed.length === 0,
    message:
      results.failed.length === 0
        ? `Campaign sent successfully to ${results.sent.length} recipient(s).`
        : `Campaign sent to ${results.sent.length} recipient(s), but ${results.failed.length} failed.`,
    results
  };
}

app.post('/api/send-campaign', async (req, res) => {
  try {
    const result = await sendCampaignCore({
      name: req.body.name,
      recipients: req.body.recipients,
      subject: req.body.subject,
      html: addPreheader(req.body.html, req.body.preheader),
      preheader: req.body.preheader || '',
      saveCampaignRecord: true
    });

    res.json(result);
  } catch (error) {
    const statusCode = error.message.includes('Brevo is not configured') ? 500 : 400;

    res.status(statusCode).json({
      success: false,
      error: error.message
    });
  }
});

async function processDueScheduledCampaigns() {
  const scheduledCampaigns = loadScheduledCampaigns();
  const now = new Date();
  let changed = false;

  for (const scheduled of scheduledCampaigns) {
    if (scheduled.status !== 'Scheduled') continue;

    const scheduledDate = new Date(scheduled.scheduledAt);

    if (Number.isNaN(scheduledDate.getTime()) || scheduledDate > now) continue;

    scheduled.status = 'Sending';
    scheduled.lastAttemptAt = new Date().toISOString();
    changed = true;
    saveScheduledCampaigns(scheduledCampaigns);

    try {
      const result = await sendCampaignCore({
        name: scheduled.name,
        recipients: scheduled.recipients,
        subject: scheduled.subject,
        html: addPreheader(scheduled.html, scheduled.preheader),
        preheader: scheduled.preheader || '',
        saveCampaignRecord: true,
        scheduledCampaignId: scheduled.id
      });

      scheduled.status = result.success ? 'Sent' : 'Sent with Errors';
      scheduled.sentAt = new Date().toISOString();
      scheduled.resultSummary = {
        sent: result.results.sent.length,
        failed: result.results.failed.length,
        skipped: result.results.skipped.length
      };
    } catch (error) {
      scheduled.status = 'Failed';
      scheduled.error = error.message || 'Scheduled send failed.';
      scheduled.lastAttemptAt = new Date().toISOString();
    }

    changed = true;
    saveScheduledCampaigns(scheduledCampaigns);
  }

  if (changed) {
    saveScheduledCampaigns(scheduledCampaigns);
  }
}

setInterval(() => {
  processDueScheduledCampaigns().catch(error => {
    console.error('Scheduled campaign processor error:', error);
  });
}, 60000);

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
