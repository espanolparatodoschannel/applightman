// js/api.js
import * as store from './store.js';
import * as ui from './ui.js';
import * as charts from './charts.js';

export async function fetchDataFromCloud(showBlockingLoader = true) {
    if (showBlockingLoader) {
        ui.showLoader("Synchronisation des données...");
    } else {
        if (ui.elements.syncBtn) {
            const icon = ui.elements.syncBtn.querySelector('i');
            if (icon) icon.classList.add('fa-spin');
        }
    }

    try {
        const response = await fetch(store.apiUrl + "?action=getData");
        const data = await response.json();
        
        if (data.status === 'success') {
            store.setAppOptions(data.options);
            store.setRecords(data.records || []);

            ui.populateAllSelects();
            charts.populateFilters();
            charts.updateDashboard();
            ui.renderHistory();
        } else {
            throw new Error(data.message || "Error desconocido");
        }
    } catch (error) {
        console.error("Fetch Error:", error);
        if (showBlockingLoader) {
            ui.showToast("Erreur de connexion à Google Sheets. Utilisation de données locales temporaires.", "error");
            store.setAppOptions(store.mockOptions);
            ui.populateAllSelects();
        }
    } finally {
        if (showBlockingLoader) {
            ui.hideLoader();
        } else {
            if (ui.elements.syncBtn) {
                const icon = ui.elements.syncBtn.querySelector('i');
                if (icon) icon.classList.remove('fa-spin');
            }
        }
    }
}

export async function saveRecordToCloud(record) {
    if (!navigator.onLine) {
        addToOfflineQueue(record);
        return;
    }

    ui.showLoader("Enregistrement...");
    try {
        const response = await fetch(store.apiUrl, {
            method: 'POST',
            body: JSON.stringify({ action: 'addRecordsBatch', records: [record] })
        });
        
        const data = await response.json();
        if (data.status === 'success') {
            if (navigator.vibrate) navigator.vibrate([200]);
            ui.showToast("Enregistrement réussi !", "success");
            store.addToHistory(record);
            store.setRecords([record, ...store.records]);
            ui.resetFormAndRefresh();
            charts.updateDashboard();
            ui.renderHistory();
        } else {
            throw new Error("Error al guardar");
        }
    } catch (error) {
        console.error("Save Error:", error);
        addToOfflineQueue(record);
    } finally {
        ui.hideLoader();
    }
}

function addToOfflineQueue(record) {
    store.addToSyncQueue(record);
    ui.updateSyncBadge();
    store.addToHistory(record);
    store.addRecordLocally(record);
    ui.resetFormAndRefresh();
    ui.renderHistory();
    charts.updateDashboard();
    
    if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
    ui.showToast("Hors ligne : Enregistrement sauvegardé localement. Il sera synchronisé dès que la connexion sera rétablie.", "warning");
}

export async function syncOfflineQueue() {
    if (store.syncQueue.length === 0 || !store.apiUrl || !navigator.onLine) return;
    
    ui.showLoader(`Synchronisation de ${store.syncQueue.length} éléments...`);
    
    const queueToProcess = [...store.syncQueue];
    
    try {
        const response = await fetch(store.apiUrl, {
            method: 'POST',
            body: JSON.stringify({ action: 'addRecordsBatch', records: queueToProcess })
        });
        const data = await response.json();
        
        if (data.status === 'success') {
            store.updateSyncQueue([]);
            ui.updateSyncBadge();
            if (navigator.vibrate) navigator.vibrate([200]);
            ui.showToast(`${queueToProcess.length} enregistrements synchronisés avec succès !`, "success");
            await fetchDataFromCloud(false);
        } else {
            throw new Error("Batch error");
        }
    } catch (e) {
        console.error("Sync batch error:", e);
        if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
        ui.showToast("Erreur lors de la synchronisation par lots. Les enregistrements restent dans la file d'attente.", "error");
    } finally {
        ui.hideLoader();
    }
}

export async function deleteRecord(uuid) {
    if (!navigator.onLine) {
        ui.showToast("Vous devez être en ligne pour supprimer un enregistrement de la base de données.", "warning");
        return;
    }

    ui.showLoader("Suppression...");
    try {
        const response = await fetch(store.apiUrl, {
            method: 'POST',
            body: JSON.stringify({ action: 'deleteRecord', uuid: uuid })
        });
        
        const data = await response.json();
        if (data.status === 'success') {
            if (navigator.vibrate) navigator.vibrate([200]);
            ui.showToast("Enregistrement supprimé !", "success");
            store.deleteRecordLocally(uuid);
            charts.populateFilters();
            charts.updateDashboard();
            ui.renderHistory();
        } else {
            throw new Error("Error al eliminar");
        }
    } catch (error) {
        console.error("Delete Error:", error);
        if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
        ui.showToast("Erreur lors de la suppression.", "error");
    } finally {
        ui.hideLoader();
    }
}
