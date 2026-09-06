/**
 * Append-only-ish audit log kept in chrome.storage.local as a ring buffer.
 * Nothing is sent off the device; the admin exports CSV from the options page.
 */
import { KEYS } from './constants.js';

/**
 * @param {object} entry
 * @param {number} maxEntries
 */
export async function appendAudit(entry, maxEntries = 500) {
  const store = await chrome.storage.local.get(KEYS.audit);
  const log = Array.isArray(store[KEYS.audit]) ? store[KEYS.audit] : [];
  log.push({ at: new Date().toISOString(), ...entry });
  const trimmed = log.length > maxEntries ? log.slice(log.length - maxEntries) : log;
  await chrome.storage.local.set({ [KEYS.audit]: trimmed });
}

export async function readAudit() {
  const store = await chrome.storage.local.get(KEYS.audit);
  return Array.isArray(store[KEYS.audit]) ? store[KEYS.audit] : [];
}

export async function clearAudit() {
  await chrome.storage.local.remove(KEYS.audit);
}

const CSV_COLUMNS = ['at', 'result', 'code', 'reason', 'url', 'account', 'device', 'ip', 'mode'];

/** Escape a value for CSV, including the leading-quote guard against formula injection. */
function csvCell(value) {
  let text = value === undefined || value === null ? '' : String(value);
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
}

export function auditToCsv(entries) {
  const rows = [CSV_COLUMNS.join(',')];
  for (const entry of entries) {
    rows.push(CSV_COLUMNS.map((col) => csvCell(entry[col])).join(','));
  }
  return rows.join('\r\n');
}
