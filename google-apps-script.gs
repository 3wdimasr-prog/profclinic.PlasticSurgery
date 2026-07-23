/**
 * PROF CLINIC — Google Sheets Booking Endpoint
 * اربط هذا السكربت بملف Google Sheet ثم انشره Web App بصلاحية Anyone.
 */

const SHEET_NAME = 'حجوزات جراحة التجميل';
const HEADERS = [
  'Lead ID',
  'التاريخ والوقت',
  'الاسم',
  'رقم الجوال',
  'الخدمة',
  'الحالة',
  'UTM Source',
  'UTM Medium',
  'UTM Campaign',
  'رابط الصفحة',
  'المصدر السابق',
  'الجهاز والمتصفح'
];

function doGet() {
  return jsonResponse({ ok: true, service: 'Prof Clinic Booking API' });
}

function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);

  try {
    const data = parseRequest(e);
    validate(data);

    const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    if (!spreadsheet) throw new Error('يجب ربط السكربت بملف Google Sheet.');

    let sheet = spreadsheet.getSheetByName(SHEET_NAME);
    if (!sheet) sheet = spreadsheet.insertSheet(SHEET_NAME);
    prepareSheet(sheet);

    sheet.appendRow([
      safeCell(data.lead_id || Utilities.getUuid()),
      new Date(),
      safeCell(data.name),
      safeCell(data.mobile),
      safeCell(data.service || 'استشارة عامة'),
      'جديد',
      safeCell(data.utm_source || ''),
      safeCell(data.utm_medium || ''),
      safeCell(data.utm_campaign || ''),
      safeCell(data.page_url || ''),
      safeCell(data.referrer || ''),
      safeCell(data.user_agent || '')
    ]);

    return jsonResponse({ ok: true, message: 'Lead saved' });
  } catch (error) {
    console.error(error);
    return jsonResponse({ ok: false, error: String(error.message || error) });
  } finally {
    lock.releaseLock();
  }
}

function prepareSheet(sheet) {
  if (sheet.getLastRow() === 0) {
    sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]);
    sheet.setFrozenRows(1);
    sheet.getRange(1, 1, 1, HEADERS.length)
      .setFontWeight('bold')
      .setBackground('#5a2638')
      .setFontColor('#ffffff')
      .setHorizontalAlignment('center');
    sheet.setRightToLeft(true);
    sheet.getRange('B:B').setNumberFormat('yyyy-mm-dd hh:mm:ss');
    sheet.autoResizeColumns(1, HEADERS.length);
    sheet.setColumnWidth(3, 180);
    sheet.setColumnWidth(4, 130);
    sheet.setColumnWidth(5, 190);
    sheet.setColumnWidth(10, 260);
    sheet.setColumnWidth(12, 300);
  }
}

function parseRequest(e) {
  if (!e) throw new Error('Empty request');
  if (e.postData && e.postData.contents) {
    try {
      return JSON.parse(e.postData.contents);
    } catch (_) {}
  }
  return e.parameter || {};
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
