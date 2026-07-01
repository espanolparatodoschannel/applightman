// js/ui.js
import { getCategoryColor } from './utils.js';
import * as store from './store.js';
import { deleteRecord } from './api.js';

export const elements = {
    navItems: document.querySelectorAll('.nav-item'),
    views: document.querySelectorAll('.view'),
    form: document.getElementById('record-form'),
    loader: document.getElementById('loader'),
    loaderText: document.getElementById('loader-text'),
    configInput: document.getElementById('api-url'),
    saveConfigBtn: document.getElementById('save-config-btn'),
    connStatus: document.getElementById('connection-status'),
    syncBtn: document.getElementById('sync-btn'),
    dateInput: document.getElementById('date'),
    dateDisplay: document.getElementById('date-display'),
    catSelect: document.getElementById('categorie'),
    idInput: document.getElementById('id_item'),
    descSelect: document.getElementById('description'),
    tacheSelect: document.getElementById('tache'),
    groupBon: document.getElementById('group-bon'),
    groupSoumission: document.getElementById('group-soumission'),
    groupTacheNum: document.getElementById('group-tache-num'),
    numBonInput: document.getElementById('num_bon'),
    numSoumissionInput: document.getElementById('num_soumission'),
    numTacheInput: document.getElementById('num_tache'),
    etageSelect: document.getElementById('etage'),
    historyContainer: document.getElementById('history-container'),
    syncBadge: document.getElementById('sync-badge'),
    filterMonth: document.getElementById('filter-month'),
    filterEtage: document.getElementById('filter-etage'),
    filterTache: document.getElementById('filter-tache'),
    clearFiltersBtn: document.getElementById('clear-filters-btn'),
    searchHistory: document.getElementById('search-history'),
    historySummary: document.getElementById('history-summary'),
    reloadAppBtn: document.getElementById('reload-app-btn'),
    
    statAvg: document.getElementById('stat-avg'),
    statTopEtage: document.getElementById('stat-top-etage'),
    statTopProduct: document.getElementById('stat-top-product'),
    statTotal: document.getElementById('stat-total'),
    
    filterHistoryMonth: document.getElementById('filter-history-month'),
    filterHistoryEtage: document.getElementById('filter-history-etage'),
    filterHistoryTache: document.getElementById('filter-history-tache'),
    clearHistoryFiltersBtn: document.getElementById('clear-history-filters-btn')
};

export function showToast(message, type = 'success') {
    const existing = document.getElementById('custom-toast');
    if (existing) existing.remove();

    const iconMap = {
        'success': 'fa-circle-check',
        'error': 'fa-circle-xmark',
        'warning': 'fa-triangle-exclamation',
        'info': 'fa-circle-info'
    };

    const toast = document.createElement('div');
    toast.id = 'custom-toast';
    toast.className = 'toast-container';
    toast.innerHTML = `
        <i class="fa-solid ${iconMap[type] || iconMap.info} toast-icon ${type}"></i>
        <span style="font-weight: 500; font-size: 0.95rem;">${message}</span>
    `;
    
    document.body.appendChild(toast);
    setTimeout(() => toast.classList.add('show'), 10);
    
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 400);
    }, 3500);
}

export function showConfirm(message) {
    return new Promise((resolve) => {
        const existing = document.getElementById('custom-confirm');
        if (existing) existing.remove();

        const overlay = document.createElement('div');
        overlay.id = 'custom-confirm';
        overlay.className = 'confirm-overlay';
        
        overlay.innerHTML = `
            <div class="confirm-box">
                <div class="confirm-content">
                    <i class="fa-solid fa-triangle-exclamation confirm-icon"></i>
                    <p>${message}</p>
                </div>
                <div class="confirm-actions">
                    <button class="btn-cancel">Annuler</button>
                    <button class="btn-confirm">Confirmer</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(overlay);
        
        setTimeout(() => overlay.classList.add('show'), 10);
        
        const close = (result) => {
            overlay.classList.remove('show');
            setTimeout(() => {
                overlay.remove();
                resolve(result);
            }, 300);
        };
        
        overlay.querySelector('.btn-cancel').addEventListener('click', () => close(false));
        overlay.querySelector('.btn-confirm').addEventListener('click', () => close(true));
    });
}


export function showLoader(msg = "Chargement...") {
    if (!elements.loader) return;
    elements.loaderText.textContent = msg;
    elements.loader.classList.remove('hidden');
}

export function hideLoader() {
    if (!elements.loader) return;
    elements.loader.classList.add('hidden');
}

export function populateSelect(id, values) {
    const selectElement = document.getElementById(id);
    if (!selectElement) return;
    
    const placeholder = selectElement.options[0];
    selectElement.innerHTML = '';
    if (placeholder) selectElement.appendChild(placeholder);
    
    const uniqueValues = [...new Set(values)];
    uniqueValues.forEach(val => {
        if(val) {
            const opt = document.createElement('option');
            opt.value = val;
            opt.textContent = val;
            selectElement.appendChild(opt);
        }
    });
}

export function populateAllSelects() {
    const allDescriptions = store.appOptions.opciones.map(opt => opt.description).filter(Boolean);
    const allCategories = [...new Set(store.appOptions.opciones.map(opt => opt.categorie).filter(Boolean))];
    
    populateSelect('description', allDescriptions);
    populateSelect('categorie', allCategories);
    populateSelect('etage', store.appOptions.etage || []);
    populateSelect('tache', store.appOptions.tache || []);
    if (elements.idInput) elements.idInput.value = "";
}

export function updateDateDisplay() {
    if (!elements.dateDisplay || !elements.dateInput) return;
    const val = elements.dateInput.value;
    if (val) {
        const parts = val.split('-');
        if (parts.length === 3) {
            const year = parts[0];
            const monthIndex = parseInt(parts[1], 10) - 1;
            const day = parseInt(parts[2], 10);
            
            const months = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
            
            elements.dateDisplay.textContent = `${day}-${months[monthIndex]}-${year}`;
            elements.dateDisplay.classList.remove('placeholder-active');
            return;
        }
    }
    elements.dateDisplay.textContent = "Sélectionnez la date";
    elements.dateDisplay.classList.add('placeholder-active');
}

export function updateSyncBadge() {
    if (elements.syncBadge) {
        if (store.syncQueue.length > 0) {
            elements.syncBadge.textContent = store.syncQueue.length;
            elements.syncBadge.classList.remove('hidden');
        } else {
            elements.syncBadge.classList.add('hidden');
        }
    }
}

export function resetFormAndRefresh() {
    if (elements.form) elements.form.reset();
    if (elements.dateInput) {
        elements.dateInput.valueAsDate = new Date();
        updateDateDisplay();
    }
    if (elements.groupBon) elements.groupBon.classList.add('hidden-field');
    if (elements.groupSoumission) elements.groupSoumission.classList.add('hidden-field');
    if (elements.groupTacheNum) elements.groupTacheNum.classList.add('hidden-field');
    if (elements.numBonInput) elements.numBonInput.required = false;
    if (elements.numSoumissionInput) elements.numSoumissionInput.required = false;
    if (elements.numTacheInput) elements.numTacheInput.required = false;
    populateAllSelects();
    
    // Reset edit state
    store.setEditingRecordUuid(null);
    if (elements.form) {
        const submitBtn = elements.form.querySelector('button[type="submit"]');
        if (submitBtn) {
            submitBtn.innerHTML = '<i class="fa-solid fa-save"></i> Enregistrer';
        }
        const cancelBtn = document.getElementById('cancel-edit-btn');
        if (cancelBtn) {
            cancelBtn.style.display = 'none';
        }
    }
}

export function renderHistory() {
    if (!elements.historyContainer) return;
    
    const pending = store.syncQueue.map(r => ({...r, isPending: true}));
    let history = [...pending, ...store.records];
    
    history.sort((a, b) => {
        const dateA = new Date(a.fecha || a.date || 0).getTime();
        const dateB = new Date(b.fecha || b.date || 0).getTime();
        return dateB - dateA;
    });
    
    if (elements.filterHistoryMonth) {
        const hmVal = elements.filterHistoryMonth.value;
        const heVal = elements.filterHistoryEtage.value;
        const htVal = elements.filterHistoryTache.value;
        
        if (hmVal !== 'all') {
            history = history.filter(r => {
                const d = new Date(r.date || r.fecha);
                if (isNaN(d)) return false;
                const y = d.getFullYear();
                const m = String(d.getMonth() + 1).padStart(2, '0');
                return `${y}-${m}` === hmVal;
            });
        }
        if (heVal !== 'all') {
            history = history.filter(r => String(r.etage).trim() === heVal);
        }
        if (htVal !== 'all') {
            history = history.filter(r => r.tache === htVal);
        }
    }
    
    const searchVal = elements.searchHistory ? elements.searchHistory.value.trim().toLowerCase() : "";
    if (searchVal !== "") {
        const searchTerms = searchVal.split(/\s+/);
        
        history = history.filter(r => {
            const foundOpt = store.appOptions.opciones.find(opt => opt.id === r.id_item);
            const resolvedDesc = (foundOpt && foundOpt.description) ? foundOpt.description : (r.description || "");
            
            const desc = resolvedDesc.toLowerCase();
            const id = String(r.id_item || "").toLowerCase();
            const etage = String(r.etage || "").trim().toLowerCase();
            const numTache = String(r.num_tache || "").toLowerCase();
            const numBon = String(r.num_bon || "").toLowerCase();
            const numSoumission = String(r.num_soumission || "").toLowerCase();
            
            return searchTerms.every(term => {
                const isNumeric = !isNaN(term) && term.trim() !== "";
                const matchEtage = isNumeric ? (etage === term) : etage.includes(term);
                
                return desc.includes(term) || 
                       id.includes(term) || 
                       matchEtage || 
                       numTache.includes(term) ||
                       numBon.includes(term) ||
                       numSoumission.includes(term);
            });
        });
    }
    
    if (elements.historySummary) {
        elements.historySummary.textContent = `Total: ${history.length} remplacement${history.length !== 1 ? 's' : ''}`;
    }
    
    if (history.length === 0) {
        elements.historyContainer.innerHTML = `
            <div class="empty-state-container">
                <i class="fa-solid fa-magnifying-glass empty-icon"></i>
                <p class="empty-text">Aucun enregistrement correspondant.</p>
            </div>
        `;
        return;
    }
    
    elements.historyContainer.innerHTML = history.map((r, index) => {
        let dateStr = "";
        try {
            const d = new Date(r.fecha || r.date);
            if (!isNaN(d)) {
                const months = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
                dateStr = `${d.getDate()}-${months[d.getMonth()]}-${d.getFullYear()}`;
            } else {
                dateStr = r.fecha || r.date || "-";
            }
        } catch(e) {
            dateStr = r.fecha || r.date || "-";
        }

        let detailsVal = "";
        if (r.tache) {
            const num = r.num_tache || r.num_bon || r.num_soumission;
            detailsVal = num ? ` #${num}` : "";
        }

        const foundOpt = store.appOptions.opciones.find(opt => opt.id === r.id_item);
        const displayDesc = (foundOpt && foundOpt.description) ? foundOpt.description : (r.description || r.id_item || 'N/A');

        const syncBadgeHtml = r.isPending 
            ? `<span class="pro-sync-badge pending" title="En attente de synchronisation"><i class="fa-solid fa-cloud-arrow-up"></i></span>`
            : `<span class="pro-sync-badge synced" title="Synchronisé"><i class="fa-solid fa-check"></i></span>`;

        const catColor = getCategoryColor(r.categorie);

        return `
            <div class="pro-history-card history-item-animate" style="animation-delay: ${Math.min(index * 0.05, 0.5)}s; border-left: 4px solid ${catColor}; position: relative;">
                <div class="pro-card-header">
                    <div class="pro-desc-group">
                        <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.35rem;">
                            <span class="pro-id-badge"><i class="fa-solid fa-tag"></i> ${r.id_item || '-'}</span>
                            ${syncBadgeHtml}
                        </div>
                        <h4 class="pro-desc">${displayDesc}</h4>
                    </div>
                    <div style="display: flex; flex-direction: column; align-items: flex-end; gap: 0.5rem;">
                        <div class="pro-qty-badge">
                            <span class="qty-val">${r.quantite}</span>
                        </div>
                        ${r.uuid && !r.isPending ? `
                        <div style="display: flex; gap: 0.35rem;">
                            <button class="icon-btn edit-btn" data-uuid="${r.uuid}" style="width: 32px; height: 32px; background: rgba(59, 130, 246, 0.1); border-color: rgba(59, 130, 246, 0.2); color: var(--primary);" title="Modifier">
                                <i class="fa-solid fa-pencil"></i>
                            </button>
                            <button class="icon-btn delete-btn" data-uuid="${r.uuid}" style="width: 32px; height: 32px; background: rgba(239, 68, 68, 0.1); border-color: rgba(239, 68, 68, 0.2); color: var(--error);" title="Supprimer">
                                <i class="fa-solid fa-trash-can"></i>
                            </button>
                        </div>` : ''}
                    </div>
                </div>
                
                <div class="pro-card-body">
                    <div class="pro-meta-grid">
                        <div class="pro-meta-item">
                            <i class="fa-solid fa-layer-group"></i>
                            <div>
                                <span class="meta-label">Étage</span>
                                <span class="meta-value">${r.etage !== undefined && r.etage !== null && r.etage !== "" ? r.etage : '-'}</span>
                            </div>
                        </div>
                        <div class="pro-meta-item">
                            <i class="fa-solid fa-clipboard-list"></i>
                            <div>
                                <span class="meta-label">Tâche</span>
                                <span class="meta-value">${r.tache || '-'}${detailsVal}</span>
                            </div>
                        </div>
                        <div class="pro-meta-item">
                            <i class="fa-solid fa-lightbulb"></i>
                            <div>
                                <span class="meta-label">Catégorie</span>
                                <span class="meta-value">${r.categorie || '-'}</span>
                            </div>
                        </div>
                        <div class="pro-meta-item">
                            <i class="fa-regular fa-calendar"></i>
                            <div>
                                <span class="meta-label">Date</span>
                                <span class="meta-value">${dateStr}</span>
                            </div>
                        </div>
                    </div>
                </div>
                
                ${r.note ? `
                <div class="pro-card-footer">
                    <div class="pro-note">
                        <i class="fa-solid fa-quote-left"></i>
                        <p>${r.note}</p>
                    </div>
                </div>` : ''}
            </div>
        `;
    }).join('');

    // Agregar eventos a botones de eliminar
    const deleteBtns = elements.historyContainer.querySelectorAll('.delete-btn');
    deleteBtns.forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const uuid = btn.getAttribute('data-uuid');
            const confirmed = await showConfirm("Voulez-vous vraiment supprimer cet enregistrement ?");
            if (confirmed) {
                await deleteRecord(uuid);
            }
        });
    });

    // Agregar eventos a botones de editar
    const editBtns = elements.historyContainer.querySelectorAll('.edit-btn');
    editBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const uuid = btn.getAttribute('data-uuid');
            const pendingRecord = store.syncQueue.find(r => r.uuid === uuid);
            const cloudRecord = store.records.find(r => r.uuid === uuid);
            const record = pendingRecord || cloudRecord;
            
            if (record) {
                store.setEditingRecordUuid(uuid);
                // Switch view to saisie (registro)
                document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
                const saisieBtn = document.querySelector('.nav-item[data-target="view-registro"]');
                if (saisieBtn) saisieBtn.classList.add('active');
                
                document.querySelectorAll('.view').forEach(sec => sec.classList.remove('active'));
                const saisieView = document.getElementById('view-registro');
                if (saisieView) saisieView.classList.add('active');
                
                // Populate form
                const targetDate = record.fecha || record.date;
                if (elements.dateInput && targetDate) {
                    elements.dateInput.value = targetDate.substring(0, 10);
                    updateDateDisplay();
                }
                if (elements.etageSelect) elements.etageSelect.value = record.etage;
                if (elements.tacheSelect) {
                    elements.tacheSelect.value = record.tache;
                    elements.tacheSelect.dispatchEvent(new Event('change'));
                }
                if (elements.numTacheInput) elements.numTacheInput.value = record.num_tache || "";
                if (elements.numBonInput) elements.numBonInput.value = record.num_bon || "";
                if (elements.numSoumissionInput) elements.numSoumissionInput.value = record.num_soumission || "";
                if (elements.idSelect) {
                    elements.idSelect.value = record.id_item;
                    elements.idSelect.dispatchEvent(new Event('change'));
                }
                if (elements.quantiteInput) elements.quantiteInput.value = record.quantite;
                if (elements.noteInput) elements.noteInput.value = record.note || "";
                
                // Change submit button text
                const submitBtn = elements.form.querySelector('button[type="submit"]');
                if (submitBtn) {
                    submitBtn.innerHTML = '<i class="fa-solid fa-save"></i> Modifier';
                }
                
                // Show cancel button
                let cancelBtn = document.getElementById('cancel-edit-btn');
                if (!cancelBtn) {
                    cancelBtn = document.createElement('button');
                    cancelBtn.id = 'cancel-edit-btn';
                    cancelBtn.type = 'button';
                    cancelBtn.className = 'btn-secondary';
                    cancelBtn.style.marginTop = '10px';
                    cancelBtn.style.width = '100%';
                    cancelBtn.innerHTML = '<i class="fa-solid fa-times"></i> Annuler la modification';
                    cancelBtn.addEventListener('click', () => {
                        resetFormAndRefresh();
                    });
                    if (submitBtn && submitBtn.parentNode) {
                        submitBtn.parentNode.insertBefore(cancelBtn, submitBtn.nextSibling);
                    }
                }
                if (cancelBtn) cancelBtn.style.display = 'block';
                
                window.scrollTo({ top: 0, behavior: 'smooth' });
            }
        });
    });
}
