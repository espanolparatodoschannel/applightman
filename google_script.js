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
  getOrCreateSheetWithHeaders(SHEET_NAME_RECORDS, ["Date", "Type de tâche", "# Type de tâche", "# Bon de trabajo", "# Soumission", "Étage", "Catégorie", "Description", "Quantité", "Id", "Note"]);
}

function doPost(e) {
  try {
    // Asegurarse de que las hojas existen
    setup();

    const data = JSON.parse(e.postData.contents);
    const action = data.action;

    if (action === 'addRecord') {
      const record = data.record;
      const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME_RECORDS);

      // Obtener cabeceras actuales para mapear correctamente las columnas por nombre
      const lastCol = sheet.getLastColumn();
      let headers = [];
      if (lastCol > 0) {
        headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
      }

      const idIdx = headers.indexOf("Id");
      let fechaIdx = headers.indexOf("Date");
      if (fechaIdx === -1) {
        fechaIdx = headers.indexOf("Fecha");
      }
      const etageIdx = headers.indexOf("Étage");
      const descIdx = headers.indexOf("Description");
      const catIdx = headers.indexOf("Catégorie");
      const quantIdx = headers.indexOf("Quantité");
      const tacheIdx = headers.indexOf("Type de tâche");
      const numTacheIdx = headers.indexOf("# Type de tâche");
      let numBonIdx = headers.indexOf("# Bon de trabajo");
      if (numBonIdx === -1) {
        numBonIdx = headers.indexOf("# Bon de travail");
      }
      const numSoumIdx = headers.indexOf("# Soumission");
      const noteIdx = headers.indexOf("Note");

      // Si la hoja estaba totalmente vacía o sin cabeceras
      if (headers.length === 0 || (headers.length === 1 && headers[0] === "")) {
        const defaultHeaders = ["Date", "Type de tâche", "# Type de tâche", "# Bon de trabajo", "# Soumission", "Étage", "Catégorie", "Description", "Quantité", "Id", "Note"];
        sheet.appendRow(defaultHeaders);
        sheet.appendRow([
          record.fecha,
          record.tache,
          record.num_tache,
          record.num_bon,
          record.num_soumission,
          record.etage,
          record.categorie,
          record.description,
          record.quantite,
          record.id_item,
          record.note
        ]);
      } else {
        // Crear una fila vacía con el tamaño de las cabeceras
        const row = new Array(headers.length);
        for (let i = 0; i < row.length; i++) {
          row[i] = "";
        }

        // Rellenar la fila según el índice de cada cabecera
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

        sheet.appendRow(row);
      }

      return createJsonResponse({ status: 'success', message: 'Record added successfully' });
    }
  } catch (error) {
    return createJsonResponse({ status: 'error', message: error.toString() });
  }
}

function doGet(e) {
  try {
    // Asegurarse de que las hojas existen
    setup();

    const action = e.parameter.action || 'getData';

    if (action === 'getData') {
      const ss = SpreadsheetApp.getActiveSpreadsheet();

      // 1. Obtener Opciones (Id, Description, Catégorie)
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

      // 4. Obtener Registros
      const recordsData = ss.getSheetByName(SHEET_NAME_RECORDS).getDataRange().getValues();
      const records = [];
      if (recordsData.length > 1) {
        const headers = recordsData[0];
        let fechaIdx = headers.indexOf("Date");
        if (fechaIdx === -1) {
          fechaIdx = headers.indexOf("Fecha");
        }
        const etageIdx = headers.indexOf("Étage");
        const descIdx = headers.indexOf("Description");
        const catIdx = headers.indexOf("Catégorie");
        const quantIdx = headers.indexOf("Quantité");
        const tacheIdx = headers.indexOf("Type de tâche");
        const numTacheIdx = headers.indexOf("# Type de tâche");
        const idIdx = headers.indexOf("Id");
        const noteIdx = headers.indexOf("Note");

        for (let i = 1; i < recordsData.length; i++) {
          const row = recordsData[i];
          records.push({
            date: fechaIdx > -1 ? row[fechaIdx] : "",
            etage: etageIdx > -1 ? row[etageIdx] : "",
            description: descIdx > -1 ? row[descIdx] : "",
            categorie: catIdx > -1 ? row[catIdx] : "",
            quantite: quantIdx > -1 ? row[quantIdx] : 0,
            tache: tacheIdx > -1 ? row[tacheIdx] : "",
            num_tache: numTacheIdx > -1 ? row[numTacheIdx] : "",
            id_item: idIdx > -1 ? row[idIdx] : "",
            note: noteIdx > -1 ? row[noteIdx] : ""
          });
        }
      }

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
