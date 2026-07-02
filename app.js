// app.js
import * as store from './js/store.js';
import * as ui from './js/ui.js';
import * as charts from './js/charts.js';
import * as api from './js/api.js';
import { generateUUID } from './js/utils.js';

document.addEventListener('DOMContentLoaded', () => {
    ThemeManager.init();
    if (typeof ChartDataLabels !== 'undefined') {
        Chart.register(ChartDataLabels);
    }
    
    if (ui.elements.dateInput) {
        ui.elements.dateInput.valueAsDate = new Date();
        ui.updateDateDisplay();
    }

    if (store.apiUrl) {
        if (ui.elements.configInput) ui.elements.configInput.value = store.apiUrl;
        if (ui.elements.connStatus) {
            ui.elements.connStatus.textContent = "Connecté à Google Sheets";
            ui.elements.connStatus.className = "status-badge success";
        }
        
        const cachedOptions = localStorage.getItem('lightman_app_options');
        const cachedRecords = localStorage.getItem('lightman_cloud_records');
        
        if (cachedOptions && cachedRecords) {
            store.setAppOptions(JSON.parse(cachedOptions));
            store.setRecords(JSON.parse(cachedRecords));
            
            ui.populateAllSelects();
            charts.populateFilters();
            charts.updateDashboard();
            api.fetchDataFromCloud(false); // Background sync
        } else {
            api.fetchDataFromCloud(true); // Blocking sync
        }
    } else {
        store.setAppOptions(store.mockOptions);
        ui.populateAllSelects();
        
        const localRecs = JSON.parse(localStorage.getItem('lightman_local_records')) || [];
        store.setRecords(localRecs);
        
        charts.populateFilters();
        charts.updateDashboard();
    }

    ui.updateSyncBadge();
    ui.renderHistory();
    ui.renderNotes();
    window.addEventListener('online', api.syncOfflineQueue);

    setupEventListeners();
});

function setupEventListeners() {
    if (ui.elements.dateInput) {
        ui.elements.dateInput.addEventListener('input', ui.updateDateDisplay);
        ui.elements.dateInput.addEventListener('change', ui.updateDateDisplay);
        ui.elements.dateInput.addEventListener('click', () => {
            try { ui.elements.dateInput.showPicker(); } catch (e) {}
        });
    }

    if (ui.elements.navItems) {
        ui.elements.navItems.forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const targetId = item.getAttribute('data-target');
                
                ui.elements.navItems.forEach(n => n.classList.remove('active'));
                ui.elements.views.forEach(v => v.classList.remove('active'));
                
                item.classList.add('active');
                const targetEl = document.getElementById(targetId);
                if (targetEl) targetEl.classList.add('active');

                if (targetId === 'view-stats') {
                    charts.updateDashboard();
                }
            });
        });
    }

    if (ui.elements.filterMonth) {
        ui.elements.filterMonth.addEventListener('change', charts.updateDashboard);
        ui.elements.filterEtage.addEventListener('change', charts.updateDashboard);
        ui.elements.filterTache.addEventListener('change', charts.updateDashboard);
        ui.elements.clearFiltersBtn.addEventListener('click', () => {
            ui.elements.filterMonth.value = 'all';
            ui.elements.filterEtage.value = 'all';
            ui.elements.filterTache.value = 'all';
            charts.updateDashboard();
        });
    }

    if (ui.elements.filterHistoryMonth) {
        ui.elements.filterHistoryMonth.addEventListener('change', ui.renderHistory);
        ui.elements.filterHistoryEtage.addEventListener('change', ui.renderHistory);
        ui.elements.filterHistoryTache.addEventListener('change', ui.renderHistory);
        if (ui.elements.filterHistoryCategorie) ui.elements.filterHistoryCategorie.addEventListener('change', ui.renderHistory);
        ui.elements.clearHistoryFiltersBtn.addEventListener('click', () => {
            ui.elements.filterHistoryMonth.value = 'all';
            ui.elements.filterHistoryEtage.value = 'all';
            ui.elements.filterHistoryTache.value = 'all';
            if (ui.elements.filterHistoryCategorie) ui.elements.filterHistoryCategorie.value = 'all';
            if (ui.elements.searchHistory) ui.elements.searchHistory.value = '';
            ui.renderHistory();
        });
    }

    if (ui.elements.tacheSelect) {
        ui.elements.tacheSelect.addEventListener('change', (e) => {
            const val = e.target.value.trim().toLowerCase();
            
            ui.elements.groupBon.classList.add('hidden-field');
            ui.elements.groupSoumission.classList.add('hidden-field');
            ui.elements.groupTacheNum.classList.add('hidden-field');
            ui.elements.numBonInput.required = false;
            ui.elements.numSoumissionInput.required = false;
            ui.elements.numTacheInput.required = false;
            ui.elements.numBonInput.value = "";
            ui.elements.numSoumissionInput.value = "";
            ui.elements.numTacheInput.value = "";

            if (val === 'bon de travail') {
                ui.elements.groupBon.classList.remove('hidden-field');
                ui.elements.numBonInput.required = true;
            } else if (val === 'soumission') {
                ui.elements.groupSoumission.classList.remove('hidden-field');
                ui.elements.numSoumissionInput.required = true;
            } else if (val === 'tournée' || val === 'tournee') {
                ui.elements.groupTacheNum.classList.remove('hidden-field');
                ui.elements.numTacheInput.required = true;
            }
        });
    }

    if (ui.elements.catSelect) {
        ui.elements.catSelect.addEventListener('change', (e) => {
            const selectedCat = e.target.value;
            const currentDesc = ui.elements.descSelect.value;
            
            let filteredOpts = store.appOptions.opciones;
            if (selectedCat !== "") {
                filteredOpts = store.appOptions.opciones.filter(opt => opt.categorie === selectedCat);
            }
            
            const filteredDesc = filteredOpts.map(opt => opt.description).filter(Boolean);
            ui.populateSelect('description', filteredDesc);
            
            if (filteredDesc.includes(currentDesc)) {
                ui.elements.descSelect.value = currentDesc;
            } else {
                ui.elements.descSelect.value = "";
                ui.elements.idInput.value = "";
            }
        });
    }

    if (ui.elements.descSelect) {
        ui.elements.descSelect.addEventListener('change', (e) => {
            const selectedDesc = e.target.value;
            const foundOpt = store.appOptions.opciones.find(opt => opt.description === selectedDesc);
            
            if (foundOpt) {
                if (foundOpt.categorie && ui.elements.catSelect.value !== foundOpt.categorie) {
                    ui.elements.catSelect.value = foundOpt.categorie;
                    const filteredOpts = store.appOptions.opciones.filter(opt => opt.categorie === foundOpt.categorie);
                    const filteredDesc = filteredOpts.map(opt => opt.description).filter(Boolean);
                    ui.populateSelect('description', filteredDesc);
                }
                ui.elements.descSelect.value = selectedDesc;
                ui.elements.idInput.value = foundOpt.id || "";
            } else {
                ui.elements.idInput.value = "";
            }
        });
    }

    let isSubmitting = false;
    if (ui.elements.form) {
        ui.elements.form.addEventListener('submit', async (e) => {
            e.preventDefault();
            if (isSubmitting) return;
            
            const formData = new FormData(ui.elements.form);
            const record = {
                uuid: generateUUID(),
                fecha: formData.get('date'),
                id_item: formData.get('id_item') || "", 
                description: formData.get('description'),
                categorie: formData.get('categorie'),
                quantite: parseInt(formData.get('quantite')),
                etage: formData.get('etage'),
                tache: formData.get('tache'),
                num_bon: formData.get('num_bon') || "",
                num_soumission: formData.get('num_soumission') || "",
                num_tache: formData.get('num_tache') || "",
                note: formData.get('note') || ""
            };

            const historyData = store.getHistory();
            if (historyData.length > 0 && !store.editingRecordUuid) {
                const lastRecord = historyData[0];
                if (
                    lastRecord.id_item === record.id_item &&
                    lastRecord.etage === record.etage &&
                    lastRecord.tache === record.tache &&
                    lastRecord.quantite === record.quantite &&
                    lastRecord.num_bon === record.num_bon &&
                    lastRecord.num_tache === record.num_tache
                ) {
                    const isConfirmed = await ui.showConfirm("⚠️ Attention : Ce registre semble être identique au précédent. Voulez-vous vraiment l'enregistrer à nouveau ?");
                    if (!isConfirmed) {
                        return;
                    }
                }
            }
            
            isSubmitting = true;
            const submitBtn = ui.elements.form.querySelector('button[type="submit"]');
            if (submitBtn) submitBtn.disabled = true;

            try {
                if (store.apiUrl) {
                    if (store.editingRecordUuid) {
                        await api.editRecord(store.editingRecordUuid, record);
                    } else {
                        await api.saveRecordToCloud(record);
                    }
                } else {
                    store.addRecordLocally(record);
                    if (navigator.vibrate) navigator.vibrate([200]);
                    ui.showToast("Enregistré localement (Mode test). Configurez Google Sheets pour enregistrer dans le cloud.", "info");
                    store.addToHistory(record);
                    ui.resetFormAndRefresh();
                    ui.renderHistory();
                    charts.updateDashboard();
                }
            } finally {
                isSubmitting = false;
                if (submitBtn) submitBtn.disabled = false;
            }
        });
    }

    if (ui.elements.saveConfigBtn) {
        ui.elements.saveConfigBtn.addEventListener('click', () => {
            const newUrl = ui.elements.configInput.value.trim();
            if (newUrl) {
                store.setApiUrl(newUrl);
                ui.elements.connStatus.textContent = "Configuré. Connexion...";
                ui.elements.connStatus.className = "status-badge success";
                api.fetchDataFromCloud();
            } else {
                store.setApiUrl("");
                ui.elements.connStatus.textContent = "Non configuré";
                ui.elements.connStatus.className = "status-badge error";
            }
        });
    }

    if (ui.elements.syncBtn) {
        ui.elements.syncBtn.addEventListener('click', () => {
            if (store.apiUrl) {
                if (store.syncQueue.length > 0) {
                    api.syncOfflineQueue();
                } else {
                    api.fetchDataFromCloud();
                }
            } else {
                ui.showToast("Vous devez d'abord configurer l'URL de Google Sheets.", "warning");
            }
        });
    }

    if (ui.elements.reloadAppBtn) {
        ui.elements.reloadAppBtn.addEventListener('click', async () => {
            const isConfirmed = await ui.showConfirm("Voulez-vous vider le cache et recharger l'application pour appliquer les mises à jour ?");
            if (isConfirmed) {
                if ('serviceWorker' in navigator) {
                    const registrations = await navigator.serviceWorker.getRegistrations();
                    for (let registration of registrations) {
                        await registration.unregister();
                    }
                }
                if (window.caches) {
                    const keys = await caches.keys();
                    for (let key of keys) {
                        await caches.delete(key);
                    }
                }
                window.location.reload(true);
            }
        });
    }

    const stepperMinus = document.getElementById('stepper-minus');
    const stepperPlus = document.getElementById('stepper-plus');
    const quantiteInput = document.getElementById('quantite');

    if (stepperMinus && stepperPlus && quantiteInput) {
        stepperMinus.addEventListener('click', () => {
            let val = parseInt(quantiteInput.value) || 1;
            if (val > 1) quantiteInput.value = val - 1;
        });
        stepperPlus.addEventListener('click', () => {
            let val = parseInt(quantiteInput.value) || 0;
            quantiteInput.value = val + 1;
        });
    }

    if (ui.elements.searchHistory) {
        ui.elements.searchHistory.addEventListener('input', ui.renderHistory);
    }

    if (ui.elements.saveNoteBtn && ui.elements.noteTextInput) {
        ui.elements.saveNoteBtn.addEventListener('click', () => {
            const text = ui.elements.noteTextInput.value.trim();
            if (text) {
                store.addNote(text);
                ui.elements.noteTextInput.value = '';
                ui.renderNotes();
                ui.showToast('Note enregistrée !', 'success');
            } else {
                ui.showToast('La note ne peut pas être vide.', 'error');
            }
        });
    }
}

const ThemeManager = {
    init() {
        const savedTheme = localStorage.getItem('lightman_theme');
        const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        
        const activeTheme = savedTheme || (systemPrefersDark ? 'dark' : 'light');
        document.documentElement.setAttribute('data-theme', activeTheme);
        this.updateIcon(activeTheme === 'dark');
        
        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', e => {
            if (!localStorage.getItem('lightman_theme')) {
                const newSystemTheme = e.matches ? 'dark' : 'light';
                document.documentElement.setAttribute('data-theme', newSystemTheme);
                this.updateIcon(e.matches);
            }
        });
        
        const themeToggle = document.getElementById('theme-toggle');
        if (themeToggle) {
            themeToggle.addEventListener('click', () => {
                const currentTheme = document.documentElement.getAttribute('data-theme');
                const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
                
                document.documentElement.setAttribute('data-theme', newTheme);
                localStorage.setItem('lightman_theme', newTheme);
                this.updateIcon(newTheme === 'dark');
                
                setTimeout(() => {
                    charts.updateDashboard();
                }, 0);
            });
        }
    },
    
    updateIcon(isDark) {
        const themeToggle = document.getElementById('theme-toggle');
        if (!themeToggle) return;
        
        if (isDark) {
            themeToggle.style.color = '#fbbf24';
            themeToggle.style.filter = 'drop-shadow(0 0 10px rgba(251, 191, 36, 0.95))';
            themeToggle.className = 'fa-solid fa-lightbulb';
        } else {
            themeToggle.style.color = '';
            themeToggle.style.filter = '';
            themeToggle.className = 'fa-regular fa-lightbulb';
        }
    }
};
