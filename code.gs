const SPREADSHEET_ID = '1l7gEdZJrgfTbXPF3wWyM1DjfALJIKLM8zokXEfZLw_k';
const OTHER_STOCK_OUT_TOKEN = '__ROOM_OUT__';

function doGet(e) {
  const action = e.parameter.action;
  let result = {};
  try {
    if (action === 'getDrugList') {
      result = getDrugList();
    } else if (action === 'getReportData') {
      result = getReportData();
    } else if (action === 'getActionHistory') {
      result = getActionHistory(e.parameter.drugName, e.parameter.limit);
    }
  } catch (err) {
    result = { error: err.toString() };
  }
  
  return ContentService.createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  const data = JSON.parse(e.postData.contents);
  const action = data.action;
  const payload = data.payload || {}; 
  let result = {};
  try {
    if (action === 'saveData') {
      result = saveData(payload);
    } else if (action === 'deleteItem') {
      result = deleteItem(payload.rowIndex, payload.note);
    } else if (action === 'manageItem') {
      result = manageItem(payload.rowIndex, payload.manageQty, payload.newAction, payload.newDetails, payload.newNotes);
    } else if (action === 'updateStockQuantity') {
      result = updateStockQuantity(payload.rowIndex, payload.newQty);
    }
  } catch (err) {
    result = { success: false, message: err.toString() };
  }

  return ContentService.createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}

// --- Functions ---

function getDrugList() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName('list');
  if (!sheet) return [];
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];
  const data = sheet.getRange(2, 1, lastRow - 1, 4).getDisplayValues();
  return data.map(row => ({
    drugName: row[0], generic: row[1], strength: row[2], unit: row[3], displayName: `${row[0]} - ${row[2]}`
  })).filter(item => item.drugName !== "");
}

function logActionToSheet(ss, drugName, qty, action, details) {
  const logSheetName = 'action.log';
  let sheet = ss.getSheetByName(logSheetName);
  if (!sheet) {
    sheet = ss.insertSheet(logSheetName);
    const header = ['Timestamp', 'Drug Name', 'Quantity Managed', 'Action Type', 'Details'];
    sheet.appendRow(header);
    sheet.getRange(1, 1, 1, header.length).setFontWeight("bold").setBackground("#f3f4f6");
  } else if (sheet.getLastRow() === 0) {
    const header = ['Timestamp', 'Drug Name', 'Quantity Managed', 'Action Type', 'Details'];
    sheet.appendRow(header);
  }
  sheet.appendRow([new Date(), drugName, "'" + qty, action, details]);
}

function saveData(formObject) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sheet = ss.getSheetByName('data');
  if (!sheet) sheet = ss.insertSheet('data');
  if (sheet.getLastRow() === 0) {
    const header = ['Timestamp', 'Drug Name', 'Generic', 'Strength', 'Quantity', 'Unit', 'Expiry Date', 'Action', 'Sub-details', 'Notes'];
    sheet.appendRow(header);
  }

  const entryTimestamp = parseEntryTimestamp_(formObject.entryDate, ss.getSpreadsheetTimeZone());
  const rowData = [
    entryTimestamp, formObject.drugName, formObject.generic, formObject.strength, "'" + formObject.qty, formObject.unit,
    formObject.expiryDate, formObject.actionType, formObject.subDetails || "", formObject.notes || ""
  ];
  sheet.appendRow(rowData);

  const detailLog = `${humanizeManagedDetails_(formObject.subDetails || "")} ${formObject.notes || ""}`.trim();
  logActionToSheet(ss, formObject.drugName, formObject.qty, "New Entry (" + formObject.actionType + ")", detailLog.trim());

  return { success: true, message: "Saved successfully!" };
}

function getReportData() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName('data');
  if (!sheet) return [];
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];
  
  // Fetch columns A to J (10 columns)
  const data = sheet.getRange(2, 1, lastRow - 1, 10).getDisplayValues();

  return data.map((row, i) => ({
    rowIndex: i + 2, 
    drugName: row[1], 
    strength: row[3], 
    qty: parseInt(row[4]) || 0, 
    unit: row[5],
    expiryDate: row[6], 
    action: row[7], 
    subDetails: row[8],
    notes: row[9] // <--- Column J (Notes) is now included
  })).filter(item => item.drugName && item.drugName !== "");
}

function deleteItem(rowIndex, note) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName('data');
  if (!sheet) return { success: false, message: "Data sheet not found" };
  const idx = validateRowIndex_(sheet, rowIndex);
  const rowData = sheet.getRange(idx, 1, 1, 10).getDisplayValues()[0];
  const deleteNote = (note || "").toString().trim();
  const detail = deleteNote ? `User deleted entire row | ${deleteNote}` : "User deleted entire row";
  logActionToSheet(ss, rowData[1], rowData[4], "Deleted", detail);
  sheet.deleteRow(idx);
  return { success: true, message: "Deleted successfully" };
}

function manageItem(rowIndex, manageQty, newAction, newDetails, newNotes) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName('data');
  if (!sheet) return { success: false, message: "Data sheet not found" };
  const idx = validateRowIndex_(sheet, rowIndex);
  const range = sheet.getRange(idx, 1, 1, 10);
  const originalData = range.getValues()[0];
  
  const currentQty = parseInt(originalData[4]) || 0;
  const reqQty = parseInt(manageQty);
  const drugName = originalData[1];
  const currentAction = originalData[7] || "";
  const currentDetails = originalData[8] || "";
  const currentNotes = originalData[9] || "";
  const actionToUse = newAction || currentAction;
  const detailsToUse = normalizeManagedField_(newDetails, actionToUse === currentAction ? currentDetails : "");
  const notesToUse = normalizeManagedField_(newNotes, actionToUse === currentAction ? currentNotes : "");

  if (reqQty <= 0) return { success: false, message: "Quantity must be > 0" };
  if (reqQty > currentQty) return { success: false, message: "Not enough stock" };

  const detailLog = `${humanizeManagedDetails_(detailsToUse)} ${notesToUse}`.trim();
  logActionToSheet(ss, drugName, reqQty, actionToUse, detailLog);

  if (reqQty === currentQty) {
      sheet.getRange(idx, 8).setValue(actionToUse);
      sheet.getRange(idx, 9).setValue(detailsToUse);
      sheet.getRange(idx, 10).setValue(notesToUse);
      return { success: true, message: "Updated all items successfully" };
  } else {
      const remainQty = currentQty - reqQty;
      sheet.getRange(idx, 5).setValue("'" + remainQty);
      
      const newRow = [...originalData];
      newRow[0] = new Date();
      newRow[4] = "'" + reqQty;
      newRow[7] = actionToUse;
      newRow[8] = detailsToUse;
      newRow[9] = notesToUse;

      if (originalData[6] instanceof Date) {
        newRow[6] = Utilities.formatDate(originalData[6], ss.getSpreadsheetTimeZone(), "yyyy-MM-dd");
      }

      sheet.appendRow(newRow);
      return { success: true, message: `Split ${reqQty} items successfully` };
  }
}

function updateStockQuantity(rowIndex, newQty) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName('data');
  if (!sheet) return { success: false, message: "Data sheet not found" };
  const idx = validateRowIndex_(sheet, rowIndex);
  const parsedQty = parseInt(newQty, 10);
  if (isNaN(parsedQty) || parsedQty < 0) return { success: false, message: "Invalid quantity" };
  const oldQty = sheet.getRange(idx, 5).getValue();
  const drugName = sheet.getRange(idx, 2).getValue();
  logActionToSheet(ss, drugName, parsedQty, "Stock Correction", `Adjusted from ${oldQty} to ${parsedQty}`);
  sheet.getRange(idx, 5).setValue("'" + parsedQty);
  return { success: true, message: "Stock adjusted successfully" };
}

function getActionHistory(drugName, limit) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName('action.log');
  if (!sheet) return [];

  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];

  const maxItems = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 100);
  const normalizedDrugName = (drugName || "").toString().trim().toLowerCase();
  const data = sheet.getRange(2, 1, lastRow - 1, 5).getDisplayValues();

  const filtered = data
    .filter((row) => {
      if (!normalizedDrugName) return true;
      return (row[1] || "").toString().trim().toLowerCase() === normalizedDrugName;
    })
    .reverse()
    .slice(0, maxItems);

  return filtered.map((row) => ({
    timestamp: row[0],
    drugName: row[1],
    qty: row[2],
    action: row[3],
    details: row[4]
  }));
}

function validateRowIndex_(sheet, rowIndex) {
  const idx = parseInt(rowIndex, 10);
  if (isNaN(idx) || idx < 2 || idx > sheet.getLastRow()) {
    throw new Error("Invalid row index");
  }
  return idx;
}

function normalizeManagedField_(value, fallback) {
  if (value === undefined || value === null) return fallback || "";
  return value;
}

function humanizeManagedDetails_(details) {
  const normalized = String(details || "").replace(OTHER_STOCK_OUT_TOKEN, "").trim();
  if (String(details || "").includes(OTHER_STOCK_OUT_TOKEN)) {
    return normalized ? `ตัด stock ออกจากห้องแล้ว ${normalized}` : "ตัด stock ออกจากห้องแล้ว";
  }
  return normalized;
}

function parseEntryTimestamp_(entryDate, timezone) {
  if (!entryDate) return new Date();
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(entryDate);
  if (!match) return new Date();

  const today = new Date();
  const year = parseInt(match[1], 10);
  const month = parseInt(match[2], 10) - 1;
  const day = parseInt(match[3], 10);

  return new Date(
    year,
    month,
    day,
    today.getHours(),
    today.getMinutes(),
    today.getSeconds()
  );
}
