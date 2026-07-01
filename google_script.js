// google_script.js
// COPIA ESTE CÓDIGO EN GOOGLE APPS SCRIPT

const SHEET_NAME_OPTIONS = "Opciones";
const SHEET_NAME_ETAGES = "Étages";
const SHEET_NAME_TACHES = "Tâches";
const SHEET_NAME_RECORDS = "Registros";

function setup() {
  getOrCreateSheetWithHeaders(SHEET_NAME_OPTIONS, ["Id", "Description", "Catégorie"]);
  getOrCreateSheetWithHeaders(SHEET_NAME_ETAGES, ["Étages"]);
  getOrCreateSheetWithHeaders(SHEET_NAME_TACHES, ["Tâches"]);
  getOrCreateSheetWithHeaders(SHEET_NAME_RECORDS, ["Date", "Type de tâche", "# Type de tâche", "# Bon de trabajo", "# Soumission", "Étage", "Catégorie", "Description", "Quantité", "Id", "Note", "UUID"]);
  ensureUUIDColumn();
}

function ensureUUIDColumn() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_NAME_RECORDS);
  if (!sheet) return;
  const lastCol = sheet.getLastColumn();
  if (lastCol === 0) return;
  const headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  if (headers.indexOf("UUID") === -1) {
    sheet.insertColumnAfter(lastCol);
    sheet.getRange(1, lastCol + 1).setValue("UUID");
  }
}

function doPost(e) {
  try {
    setup();

    const data = JSON.parse(e.postData.contents);
    const action = data.action;

    if (action === 'addRecord' || action === 'addRecordsBatch') {
      const recordsToInsert = action === 'addRecord' ? [data.record] : (data.records || []);
      const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME_RECORDS);

      const lastCol = sheet.getLastColumn();
      let headers = [];
      if (lastCol > 0) {
        headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
      }

      if (headers.length === 0 || (headers.length === 1 && headers[0] === "")) {
        headers = ["Date", "Type de tâche", "# Type de tâche", "# Bon de trabajo", "# Soumission", "Étage", "Catégorie", "Description", "Quantité", "Id", "Note", "UUID"];
        sheet.appendRow(headers);
      }

      const idIdx = headers.indexOf("Id");
      let fechaIdx = headers.indexOf("Date");
      if (fechaIdx === -1) fechaIdx = headers.indexOf("Fecha");
      const etageIdx = headers.indexOf("Étage");
      const descIdx = headers.indexOf("Description");
      const catIdx = headers.indexOf("Catégorie");
      const quantIdx = headers.indexOf("Quantité");
      const tacheIdx = headers.indexOf("Type de tâche");
      const numTacheIdx = headers.indexOf("# Type de tâche");
      let numBonIdx = headers.indexOf("# Bon de trabajo");
      if (numBonIdx === -1) numBonIdx = headers.indexOf("# Bon de travail");
      const numSoumIdx = headers.indexOf("# Soumission");
      const noteIdx = headers.indexOf("Note");
      const uuidIdx = headers.indexOf("UUID");

      const rowsToAppend = [];

      for (const record of recordsToInsert) {
        const row = new Array(headers.length).fill("");
        if (idIdx > -1) row[idIdx] = record.id_item;
        if (fechaIdx > -1) row[fechaIdx] = record.fecha;
        if (etageIdx > -1) row[etageIdx] = record.etage;
        if (descIdx > -1) row[descIdx] = record.description;
        if (catIdx > -1) row[catIdx] = record.categorie;
        if (quantIdx > -1) row[quantIdx] = record.quantite;
        if (tacheIdx > -1) row[tacheIdx] = record.tache;
        if (numTacheIdx > -1) row[numTacheIdx] = record.num_tache;
        if (numBonIdx > -1) row[numBonIdx] = record.num_bon;
        if (numSoumIdx > -1) row[numSoumIdx] = record.num_soumission;
        if (noteIdx > -1) row[noteIdx] = record.note;
        if (uuidIdx > -1) row[uuidIdx] = record.uuid;
        rowsToAppend.push(row);
      }

      if (rowsToAppend.length > 0) {
        sheet.getRange(sheet.getLastRow() + 1, 1, rowsToAppend.length, headers.length).setValues(rowsToAppend);
      }

      return createJsonResponse({ status: 'success', message: 'Records added successfully' });
    }

    if (action === 'deleteRecord') {
      const targetUuid = data.uuid;
      if (!targetUuid) throw new Error("UUID no proporcionado");

      const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME_RECORDS);
      const lastRow = sheet.getLastRow();
      const lastCol = sheet.getLastColumn();

      if (lastRow > 1) {
        const headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
        const uuidIdx = headers.indexOf("UUID");
        if (uuidIdx > -1) {
          const uuidValues = sheet.getRange(2, uuidIdx + 1, lastRow - 1, 1).getValues();
          for (let i = 0; i < uuidValues.length; i++) {
            if (uuidValues[i][0] === targetUuid) {
              sheet.deleteRow(i + 2); // +2 porque el arreglo empieza en 0 y la primera fila es cabecera
              return createJsonResponse({ status: 'success', message: 'Record deleted successfully' });
            }
          }
        }
      }
      return createJsonResponse({ status: 'error', message: 'Record not found' });
    }

    if (action === 'editRecord') {
      const targetUuid = data.uuid;
      const record = data.record;
      if (!targetUuid) throw new Error("UUID no proporcionado");
      if (!record) throw new Error("Record no proporcionado");
      
      const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME_RECORDS);
      const lastRow = sheet.getLastRow();
      const lastCol = sheet.getLastColumn();
      
      if (lastRow > 1) {
        const headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
        const uuidIdx = headers.indexOf("UUID");
        
        if (uuidIdx > -1) {
          const uuidValues = sheet.getRange(2, uuidIdx + 1, lastRow - 1, 1).getValues();
          for (let i = 0; i < uuidValues.length; i++) {
            if (uuidValues[i][0] === targetUuid) {
              const rowIndex = i + 2;
              
              // Prepare updated row
              const updatedRow = [];
              for (let c = 0; c < headers.length; c++) {
                const h = headers[c];
                if (h === "Date" || h === "Fecha") updatedRow.push(record.fecha || "");
                else if (h === "Étage") updatedRow.push(record.etage || "");
                else if (h === "Catégorie") updatedRow.push(record.categorie || "");
                else if (h === "Description") updatedRow.push(record.description || "");
                else if (h === "Quantité") updatedRow.push(record.quantite || 0);
                else if (h === "Id") updatedRow.push(record.id_item || "");
                else if (h === "Note") updatedRow.push(record.note || "");
                else if (h === "Type de tâche") updatedRow.push(record.tache || "");
                else if (h === "# Type de tâche") updatedRow.push(record.num_tache || "");
                else if (h === "# Bon de trabajo" || h === "# Bon de travail") updatedRow.push(record.num_bon || "");
                else if (h === "# Soumission") updatedRow.push(record.num_soumission || "");
                else if (h === "UUID") updatedRow.push(targetUuid);
                else updatedRow.push("");
              }
              
              sheet.getRange(rowIndex, 1, 1, headers.length).setValues([updatedRow]);
              return createJsonResponse({ status: 'success', message: 'Record updated successfully' });
            }
          }
        }
      }
      return createJsonResponse({ status: 'error', message: 'Record not found' });
    }
  } catch (error) {
    return createJsonResponse({ status: 'error', message: error.toString() });
  }
}

function doGet(e) {
  try {
    setup();

    const action = e.parameter.action || 'getData';

    if (action === 'getData') {
      const ss = SpreadsheetApp.getActiveSpreadsheet();

      // 1. Obtener Opciones
      const optionsData = ss.getSheetByName(SHEET_NAME_OPTIONS).getDataRange().getValues();
      const opcionesList = [];
      if (optionsData.length > 1) {
        const headers = optionsData[0];
        const idIdx = headers.indexOf("Id");
        const descIdx = headers.indexOf("Description");
        const catIdx = headers.indexOf("Catégorie");

        for (let i = 1; i < optionsData.length; i++) {
          const row = optionsData[i];
          const desc = descIdx > -1 ? row[descIdx] : "";
          const cat = catIdx > -1 ? row[catIdx] : "";
          if (desc || cat) {
            opcionesList.push({
              id: idIdx > -1 ? row[idIdx] : "",
              description: desc,
              categorie: cat
            });
          }
        }
      }

      // 2. Obtener Étages
      const etagesData = ss.getSheetByName(SHEET_NAME_ETAGES).getDataRange().getValues();
      const etagesList = [];
      if (etagesData.length > 1) {
        const headers = etagesData[0];
        const etageIdx = headers.indexOf("Étages");
        for (let i = 1; i < etagesData.length; i++) {
          const val = etageIdx > -1 ? etagesData[i][etageIdx] : etagesData[i][0];
          if (val !== undefined && val !== "") etagesList.push(val);
        }
      }

      // 3. Obtener Tâches
      const tachesData = ss.getSheetByName(SHEET_NAME_TACHES).getDataRange().getValues();
      const tachesList = [];
      if (tachesData.length > 1) {
        const headers = tachesData[0];
        const tacheIdx = headers.indexOf("Tâches");
        for (let i = 1; i < tachesData.length; i++) {
          const val = tacheIdx > -1 ? tachesData[i][tacheIdx] : tachesData[i][0];
          if (val !== undefined && val !== "") tachesList.push(val);
        }
      }

      // 4. Obtener Registros limitados a los últimos 500 para evitar timeout
      const recordsSheet = ss.getSheetByName(SHEET_NAME_RECORDS);
      const lastRow = recordsSheet.getLastRow();
      const lastCol = recordsSheet.getLastColumn();

      const records = [];
      if (lastRow > 1) {
        const headers = recordsSheet.getRange(1, 1, 1, lastCol).getValues()[0];
        let fechaIdx = headers.indexOf("Date");
        if (fechaIdx === -1) fechaIdx = headers.indexOf("Fecha");
        const etageIdx = headers.indexOf("Étage");
        const descIdx = headers.indexOf("Description");
        const catIdx = headers.indexOf("Catégorie");
        const quantIdx = headers.indexOf("Quantité");
        const tacheIdx = headers.indexOf("Type de tâche");
        const numTacheIdx = headers.indexOf("# Type de tâche");
        let numBonIdx = headers.indexOf("# Bon de trabajo");
        if (numBonIdx === -1) numBonIdx = headers.indexOf("# Bon de travail");
        const numSoumIdx = headers.indexOf("# Soumission");
        const idIdx = headers.indexOf("Id");
        const noteIdx = headers.indexOf("Note");
        const uuidIdx = headers.indexOf("UUID");

        const LIMIT = 500; // Limite de carga
        const startRow = Math.max(2, lastRow - LIMIT + 1);
        const numRows = lastRow - startRow + 1;

        const recordsData = recordsSheet.getRange(startRow, 1, numRows, lastCol).getValues();
        let sheetUpdated = false;

        for (let i = 0; i < recordsData.length; i++) {
          const row = recordsData[i];
          let descVal = descIdx > -1 ? row[descIdx] : "";
          let idVal = idIdx > -1 ? row[idIdx] : "";
          let uuidVal = uuidIdx > -1 ? row[uuidIdx] : "";

          // Auto-correction
          if (descVal === "F32T8/TL930/ALTO PHILIPS-479592 30/CASE" && idVal === "FC-15") {
            if (idIdx > -1) {
              idVal = "FC-23";
              row[idIdx] = "FC-23";
              sheetUpdated = true;
            }
          }

          // Auto-populate UUID if missing
          if (uuidIdx > -1 && !uuidVal) {
            uuidVal = Utilities.getUuid();
            row[uuidIdx] = uuidVal;
            sheetUpdated = true;
          }

          records.push({
            date: fechaIdx > -1 ? row[fechaIdx] : "",
            etage: etageIdx > -1 ? row[etageIdx] : "",
            description: descVal,
            categorie: catIdx > -1 ? row[catIdx] : "",
            quantite: quantIdx > -1 ? row[quantIdx] : 0,
            tache: tacheIdx > -1 ? row[tacheIdx] : "",
            num_tache: numTacheIdx > -1 ? row[numTacheIdx] : "",
            num_bon: numBonIdx > -1 ? row[numBonIdx] : "",
            num_soumission: numSoumIdx > -1 ? row[numSoumIdx] : "",
            id_item: idVal,
            note: noteIdx > -1 ? row[noteIdx] : "",
            uuid: uuidVal
          });
        }

        if (sheetUpdated) {
          recordsSheet.getRange(startRow, 1, numRows, lastCol).setValues(recordsData);
        }
      }

      // Invertir para que los más recientes estén al principio (si la app asume eso)
      records.reverse();

      const options = {
        opciones: opcionesList,
        etage: etagesList,
        tache: tachesList
      };

      return createJsonResponse({ status: 'success', options: options, records: records });
    }
  } catch (error) {
    return createJsonResponse({ status: 'error', message: error.toString() });
  }
}

// Funciones Auxiliares
function getOrCreateSheetWithHeaders(sheetName, headers) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
    if (headers && headers.length > 0) {
      sheet.appendRow(headers);
    }
  } else if (sheet.getLastRow() === 0 && headers && headers.length > 0) {
    sheet.appendRow(headers);
  }
  return sheet;
}

function createJsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
