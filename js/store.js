// js/store.js

export const CONFIG_KEY = "lightman_api_url";
export let apiUrl = localStorage.getItem(CONFIG_KEY) || "https://script.google.com/macros/s/AKfycbwI3o54GHtgvGu7pafOkRiDL8jWoLw2sHSw2TfAGD2k_KCRtZO6f-ma2RQYx_gZD5OHvQ/exec";

// Mock Data
export const mockOptions = {
    opciones: [
        { id: "FC-01", description: "801014 TCP CF14/27K SPIRAL", categorie: "Flux Compact" },
        { id: "FC-02", description: "CF11/T2/27K/SPIRAL/E26", categorie: "Flux Compact" },
        { id: "LED-01", description: "Foco LED 10W", categorie: "Éclairage Général" }
    ],
    etage: ["25", "24", "23", "22", "21", "20", "19", "18", "17", "16A", "16", "15", "14", "12", "11", "10", "9", "8", "7A", "7", "6", "5", "4", "3", "2", "1", "RDC", "SS1", "SS2", "SS3"],
    tache: ["Bon de trabajo", "Tournée"]
};

export let appOptions = {
    opciones: [],
    etage: [],
    tache: []
};

export let records = [];
export let syncQueue = JSON.parse(localStorage.getItem('lightman_sync_queue')) || [];

export function setApiUrl(url) {
    apiUrl = url;
    if (url) {
        localStorage.setItem(CONFIG_KEY, url);
    } else {
        localStorage.removeItem(CONFIG_KEY);
    }
}

export function setAppOptions(options) {
    appOptions = options;
    localStorage.setItem('lightman_app_options', JSON.stringify(appOptions));
}

export function setRecords(newRecords) {
    records = newRecords;
    localStorage.setItem('lightman_cloud_records', JSON.stringify(records));
}

export function updateSyncQueue(queue) {
    syncQueue = queue;
    localStorage.setItem('lightman_sync_queue', JSON.stringify(syncQueue));
}

export function addToSyncQueue(record) {
    syncQueue.push(record);
    localStorage.setItem('lightman_sync_queue', JSON.stringify(syncQueue));
}

export function addRecordLocally(record) {
    const localRecord = { ...record, date: record.fecha };
    records.push(localRecord);
    localStorage.setItem('lightman_local_records', JSON.stringify(records));
}

export function getHistory() {
    return JSON.parse(localStorage.getItem('lightman_history')) || [];
}

export function setHistory(history) {
    localStorage.setItem('lightman_history', JSON.stringify(history));
}

export function addToHistory(record) {
    let history = getHistory();
    history.unshift(record);
    if (history.length > 50) history.pop(); // Mantener solo los últimos 50
    setHistory(history);
}

export function deleteRecordLocally(uuid) {
    // Eliminar de los registros en memoria principal
    records = records.filter(r => r.uuid !== uuid);
    localStorage.setItem('lightman_cloud_records', JSON.stringify(records));

    // Eliminar de la cola de sincronización
    syncQueue = syncQueue.filter(r => r.uuid !== uuid);
    localStorage.setItem('lightman_sync_queue', JSON.stringify(syncQueue));

    // Eliminar del historial
    let history = getHistory();
    history = history.filter(r => r.uuid !== uuid);
    setHistory(history);
}
