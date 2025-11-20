const SPREADSHEET_ID = '1l7gEdZJrgfTbXPF3wWyM1DjfALJIKLM8zokXEfZLw_k';

function doGet(e) {
  const action = e.parameter.action;
  let result = {};
  
  try {
    if (action === 'getDrugList') {
      result = getDrugList();
    } else if (action === 'getReportData') {
      result = getReportData();
    }
  } catch (err) {
    result = { error: err.toString() };
  }
  
  return ContentService.createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  // รับข้อมูลจาก fetch (JSON String)
  const data = JSON.parse(e.postData.contents);
  const action = data.action;
  let result = {};

  try {
    if (action === 'saveData') {
      result = saveData(data.payload);
    } else if (action === 'deleteItem') {
      result = deleteItem(data.rowIndex);
    } else if (action === 'manageItem') {
      result = manageItem(data.rowIndex, data.manageQty, data.newAction, data.newDetails, data.newNotes);
    } else if (action === 'updateStockQuantity') {
      result = updateStockQuantity(data.rowIndex, data.newQty);
    }
  } catch (err) {
    result = { success: false, message: err.toString() };
  }

  return ContentService.createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}

// --- Functions เดิม (คงไว้เหมือนเดิม) ---

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
  let sheet = ss.getSheetByName('action');
  if (!sheet) sheet = ss.insertSheet('action');
  if (sheet.getLastRow() === 0) {
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

  const rowData = [
    new Date(), formObject.drugName, formObject.generic, formObject.strength, "'" + formObject.qty, formObject.unit,
    formObject.expiryDate, formObject.actionType, formObject.subDetails || "", formObject.notes || ""
  ];
  sheet.appendRow(rowData);

  const detailLog = (formObject.subDetails || "") + " " + (formObject.notes || "");
  logActionToSheet(ss, formObject.drugName, formObject.qty, "New Entry (" + formObject.actionType + ")", detailLog.trim());

  return { success: true, message: "Saved successfully!" };
}

function getReportData() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName('data');
  if (!sheet) return [];
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];
  
  const data = sheet.getRange(2, 1, lastRow - 1, 10).getDisplayValues();
  return data.map((row, i) => ({
    rowIndex: i + 2, 
    drugName: row[1], strength: row[3], qty: parseInt(row[4]) || 0, unit: row[5],
    expiryDate: row[6], action: row[7], subDetails: row[8]
  })).filter(item => item.drugName && item.drugName !== "");
}

function deleteItem(rowIndex) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName('data');
  const rowData = sheet.getRange(rowIndex, 1, 1, 10).getDisplayValues()[0];
  logActionToSheet(ss, rowData[1], rowData[4], "Deleted", "User deleted entire row");
  sheet.deleteRow(rowIndex);
  return { success: true, message: "Deleted successfully" };
}

function manageItem(rowIndex, manageQty, newAction, newDetails, newNotes) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName('data');
  const range = sheet.getRange(rowIndex, 1, 1, 10);
  const originalData = range.getValues()[0];
  const currentQty = parseInt(originalData[4]) || 0;
  const reqQty = parseInt(manageQty);
  const drugName = originalData[1];

  if (reqQty <= 0) return { success: false, message: "Quantity must be > 0" };
  if (reqQty > currentQty) return { success: false, message: "Not enough stock" };

  const detailLog = `${newDetails} ${newNotes}`.trim();
  logActionToSheet(ss, drugName, reqQty, newAction, detailLog);

  if (reqQty === currentQty) {
      sheet.getRange(rowIndex, 8).setValue(newAction);
      sheet.getRange(rowIndex, 9).setValue(newDetails);
      sheet.getRange(rowIndex, 10).setValue(newNotes);
      return { success: true, message: "Updated all items successfully" };
  } else {
      const remainQty = currentQty - reqQty;
      sheet.getRange(rowIndex, 5).setValue("'" + remainQty);
      const newRow = [...originalData];
      newRow[0] = new Date();
      newRow[4] = "'" + reqQty;
      newRow[7] = newAction;
      newRow[8] = newDetails;
      newRow[9] = newNotes;
      sheet.appendRow(newRow);
      return { success: true, message: `Split ${reqQty} items successfully` };
  }
}

function updateStockQuantity(rowIndex, newQty) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName('data');
  const oldQty = sheet.getRange(rowIndex, 5).getValue();
  const drugName = sheet.getRange(rowIndex, 2).getValue();
  logActionToSheet(ss, drugName, newQty, "Stock Correction", `Adjusted from ${oldQty} to ${newQty}`);
  sheet.getRange(rowIndex, 5).setValue("'" + newQty);
  return { success: true, message: "Stock adjusted successfully" };
}