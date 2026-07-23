/**
 * Google Apps Script لربط نموذج صفحة بروف كلينك بـ Google Sheets.
 *
 * 1) أنشئ Google Sheet جديدًا.
 * 2) من Extensions > Apps Script الصق هذا الكود.
 * 3) Deploy > New deployment > Web app.
 * 4) Execute as: Me، و Who has access: Anyone.
 * 5) انسخ رابط Web App وضعه في config.js.
 */

const SHEET_NAME = 'Leads';
const HEADERS = [
  'التاريخ والوقت',
  'الاسم',
  'رقم الجوال',
  'الخدمة',
  'UTM Source',
  'UTM Medium',
  'UTM Campaign',
  'رابط الصفحة'
];

function doGet() {
  return jsonResponse({ ok: true, service: 'Prof Clinic Leads API' });
}

function doPost(e) {
  try {
    const data = parseRequest(e);
    validate(data);

    const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = spreadsheet.getSheetByName(SHEET_NAME);
    if (!sheet) sheet = spreadsheet.insertSheet(SHEET_NAME);

    if (sheet.getLastRow() === 0) {
      sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]);
      sheet.setFrozenRows(1);
      sheet.getRange(1, 1, 1, HEADERS.length)
        .setFontWeight('bold')
        .setBackground('#5a2638')
        .setFontColor('#ffffff');
    }

    sheet.appendRow([
      new Date(),
      safeCell(data.name),
      safeCell(data.mobile),
      safeCell(data.service || 'استشارة عامة'),
      safeCell(data.utm_source || ''),
      safeCell(data.utm_medium || ''),
      safeCell(data.utm_campaign || ''),
      safeCell(data.page_url || '')
    ]);

    sheet.autoResizeColumns(1, HEADERS.length);
    return jsonResponse({ ok: true });
  } catch (error) {
    return jsonResponse({ ok: false, error: error.message });
  }
}

function parseRequest(e) {
  if (!e || !e.postData || !e.postData.contents) throw new Error('Empty request');
  try {
    return JSON.parse(e.postData.contents);
  } catch (_) {
    return e.parameter || {};
  }
}

function validate(data) {
  const name = String(data.name || '').trim();
  const mobile = String(data.mobile || '').replace(/\D/g, '');
  if (name.length < 2) throw new Error('Invalid name');
  if (!/^05\d{8}$/.test(mobile)) throw new Error('Invalid mobile');
}

function safeCell(value) {
  const text = String(value ?? '').trim();
  return /^[=+\-@]/.test(text) ? "'" + text : text;
}

function jsonResponse(payload) {
  return ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}
