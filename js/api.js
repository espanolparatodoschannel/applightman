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
        await fetch(store.apiUrl, {
            method: 'POST',
            mode: 'no-cors',
            body: JSON.stringify({ action: 'addRecordsBatch', records: [record] })
        });
        
        // As mode is no-cors, the response is opaque. We assume success.
        if (navigator.vibrate) navigator.vibrate([200]);
        ui.showToast("Enregistrement réussi !", "success");
        store.addToHistory(record);
        store.setRecords([record, ...store.records]);
        ui.resetFormAndRefresh();
        charts.updateDashboard();
        ui.renderHistory();
        
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
    
    try {
        await fetch(store.apiUrl, {
            method: 'POST',
            mode: 'no-cors',
            body: JSON.stringify({ action: 'addRecordsBatch', records: store.syncQueue })
        });
        
        // Assume success
        store.updateSyncQueue([]);
        ui.updateSyncBadge();
        if (navigator.vibrate) navigator.vibrate([200]);
        ui.showToast("Synchronisation réussie !", "success");
        
        setTimeout(() => fetchDataFromCloud(false), 1000);
        
    } catch (error) {
        console.error("Sync Error:", error);
        if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
        ui.showToast("Erreur lors de la synchronisation. Veuillez réessayer plus tard.", "error");
    } finally {
        ui.hideLoader();
    }
}

export async function deleteRecord(uuid) {
    if (!navigator.onLine) {
        ui.showToast("Vous devez être en ligne pour supprimer un enregistrement.", "warning");
        return;
    }

    ui.showLoader("Suppression...");
    try {
        await fetch(store.apiUrl, {
            method: 'POST',
            mode: 'no-cors',
            body: JSON.stringify({ action: 'deleteRecord', uuid: uuid })
        });
        
        if (navigator.vibrate) navigator.vibrate([200]);
        ui.showToast("Suppression réussie !", "success");
        
        store.deleteRecordLocally(uuid);
        
        charts.updateDashboard();
        ui.renderHistory();
        
    } catch (error) {
        console.error("Delete Error:", error);
        if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
        ui.showToast("Erreur lors de la suppression.", "error");
    } finally {
        ui.hideLoader();
    }
}

export async function editRecord(uuid, updatedRecord) {
    if (!navigator.onLine) {
        ui.showToast("Vous devez être en ligne pour modifier un enregistrement.", "warning");
        return;
    }

    ui.showLoader("Modification...");
    try {
        await fetch(store.apiUrl, {
            method: 'POST',
            mode: 'no-cors',
            body: JSON.stringify({ action: 'editRecord', uuid: uuid, record: updatedRecord })
        });
        
        if (navigator.vibrate) navigator.vibrate([200]);
        ui.showToast("Modification réussie !", "success");
        
        store.editRecordLocally(uuid, updatedRecord);
        
        store.setEditingRecordUuid(null);
        ui.resetFormAndRefresh();
        charts.updateDashboard();
        ui.renderHistory();
        
    } catch (error) {
        console.error("Edit Error:", error);
        if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
        ui.showToast("Erreur lors de la modification.", "error");
    } finally {
        ui.hideLoader();
    }
}
