/* =====================================================
   RapportLink Utilities Module
   Version 1
   ===================================================== */

function formatDate(value) {
  if (!value) return "";
  const date = new Date(value);
  if (isNaN(date.getTime())) return value;
  return date.toLocaleString([], {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatShortDate(value) {
  if (!value) return "";
  const date = new Date(value);
  if (isNaN(date.getTime())) return value;
  return date.toLocaleDateString([], {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatPhone(value) {
  const digits = String(value || "")
    .replace(/\D/g, "")
    .slice(0, 10);
  if (digits.length === 10)
    return `(${digits.slice(0, 3)})${digits.slice(3, 6)}-${digits.slice(6)}`;
  return value || "";
}

function normalizePhoneInput(input) {
  input.value = formatPhone(input.value);
}

function parseCommaList(value) {
  return (value || "")
    .split(",")
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}
