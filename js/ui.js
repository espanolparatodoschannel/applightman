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
    quantiteInput: document.getElementById('quantite'),
    noteInput: document.getElementById('note'),
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
    filterHistoryCategorie: document.getElementById('filter-history-categorie'),
    clearHistoryFiltersBtn: document.getElementById('clear-history-filters-btn'),
    
    noteTextInput: document.getElementById('note-text'),
    saveNoteBtn: document.getElementById('save-note-btn'),
    notesListContainer: document.getElementById('notes-list-container')
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
        const num = r.num_tache || r.num_bon || r.num_soumission;
        detailsVal = num ? `#${num}` : "-";

        const foundOpt = store.appOptions.opciones.find(opt => opt.id === r.id_item);
        const displayDesc = (foundOpt && foundOpt.description) ? foundOpt.description : (r.description || r.id_item || 'N/A');

        const catColor = getCategoryColor(r.categorie);

        return `
            <div class="pro-history-card history-item-animate" style="animation-delay: ${Math.min(index * 0.05, 0.5)}s; border-left: 4px solid ${catColor}; position: relative;">
                <div class="pro-card-header" style="display: flex; flex-direction: column; gap: 0.5rem;">
                    <div style="display: flex; align-items: flex-start;">
                        <h4 class="pro-desc" style="margin: 0; line-height: 1.3;"><i class="fa-solid fa-lightbulb" style="color: var(--text-secondary); margin-right: 0.35rem; font-size: 0.95rem;"></i>${displayDesc}</h4>
                    </div>
                    
                    <div style="font-size: 0.85rem; color: var(--text-secondary); font-weight: 500;">
                        <i class="fa-solid fa-briefcase" style="margin-right: 0.25rem;"></i> ${r.tache || 'N/A'}
                    </div>
                    
                    <div style="display: flex; gap: 0.5rem; align-items: center; margin-top: 0.25rem; flex-wrap: wrap;">
                        <span class="pro-id-badge" style="height: 32px; padding: 0 0.75rem; border-radius: 16px; display: inline-flex; justify-content: center; align-items: center; white-space: nowrap;"><i class="fa-solid fa-tag"></i> ${r.id_item || '-'}</span>
                        
                        <div style="width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; border-radius: 50%; ${r.isPending ? 'background: rgba(245, 158, 11, 0.1); color: var(--warning); border: 1px solid rgba(245, 158, 11, 0.2);' : 'background: rgba(16, 185, 129, 0.1); color: var(--success); border: 1px solid rgba(16, 185, 129, 0.2);'}" title="${r.isPending ? 'En attente de synchronisation' : 'Synchronisé'}">
                            <i class="${r.isPending ? 'fa-solid fa-cloud-arrow-up' : 'fa-solid fa-check'}"></i>
                        </div>
                        ${r.uuid && !r.isPending ? `
                        <button class="icon-btn edit-btn" data-uuid="${r.uuid}" style="width: 32px; height: 32px; border-radius: 50%; background: rgba(59, 130, 246, 0.1); border-color: rgba(59, 130, 246, 0.2); color: var(--primary); padding: 0; display: flex; align-items: center; justify-content: center;" title="Modifier">
                            <i class="fa-solid fa-pencil"></i>
                        </button>
                        <button class="icon-btn delete-btn" data-uuid="${r.uuid}" style="width: 32px; height: 32px; border-radius: 50%; background: rgba(239, 68, 68, 0.1); border-color: rgba(239, 68, 68, 0.2); color: var(--error); padding: 0; display: flex; align-items: center; justify-content: center;" title="Supprimer">
                            <i class="fa-solid fa-trash-can"></i>
                        </button>
                        ` : ''}
                        
                        <div class="pro-qty-badge" style="width: 32px; height: 32px; box-shadow: none;">
                            <span class="qty-val" style="font-size: 1rem; font-weight: 700;">${r.quantite}</span>
                        </div>
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
                            <i class="fa-solid fa-hashtag"></i>
                            <div>
                                <span class="meta-label">Num. Tâche</span>
                                <span class="meta-value">${detailsVal}</span>
                            </div>
                        </div>
                        <div class="pro-meta-item">
                            <i class="fa-solid fa-cubes"></i>
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
                
                let recordCat = record.categorie || "";
                let recordDesc = record.description || "";
                
                if (record.id_item) {
                    const foundOpt = store.appOptions.opciones.find(opt => opt.id === record.id_item);
                    if (foundOpt) {
                        recordCat = foundOpt.categorie || recordCat;
                        recordDesc = foundOpt.description || recordDesc;
                    }
                }

                if (elements.catSelect) {
                    elements.catSelect.value = recordCat;
                    elements.catSelect.dispatchEvent(new Event('change'));
                }
                if (elements.descSelect) {
                    setTimeout(() => {
                        elements.descSelect.value = recordDesc;
                        elements.descSelect.dispatchEvent(new Event('change'));
                        
                        // Set ID explicitly after description triggers
                        if (elements.idInput) {
                            elements.idInput.value = record.id_item || "";
                        }
                    }, 50);
                } else if (elements.idInput) {
                    elements.idInput.value = record.id_item || "";
                }

                if (elements.quantiteInput) elements.quantiteInput.value = record.quantite || 1;
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
                        // Volver a historique
                        document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
                        const historyNavBtn = document.querySelector('.nav-item[data-target="view-historique"]');
                        if (historyNavBtn) historyNavBtn.classList.add('active');
                        
                        document.querySelectorAll('.view').forEach(sec => sec.classList.remove('active'));
                        const historyView = document.getElementById('view-historique');
                        if (historyView) historyView.classList.add('active');
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

export function renderNotes() {
    if (!elements.notesListContainer) return;
    
    const notes = store.getNotes();
    
    if (notes.length === 0) {
        elements.notesListContainer.innerHTML = '<p class="help-text">Aucune note pour le moment.</p>';
        return;
    }
    
    elements.notesListContainer.innerHTML = notes.map(note => {
        const dateObj = new Date(note.timestamp);
        const dateStr = dateObj.toLocaleDateString('fr-CA', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
        
        return `
            <div class="card" style="margin-bottom: 0.75rem; padding: 1rem; border-left: 4px solid var(--primary);">
                <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.5rem;">
                    <span style="font-size: 0.75rem; color: var(--text-secondary);"><i class="fa-regular fa-clock"></i> ${dateStr}</span>
                    <button class="icon-btn delete-note-btn" data-id="${note.id}" style="width: 28px; height: 28px; background: rgba(239, 68, 68, 0.1); border-color: rgba(239, 68, 68, 0.2); color: var(--error); padding: 0; display: flex; align-items: center; justify-content: center; border-radius: 50%;" title="Supprimer">
                        <i class="fa-solid fa-trash-can" style="font-size: 0.8rem;"></i>
                    </button>
                </div>
                <p style="margin: 0; font-size: 0.95rem; line-height: 1.4; color: var(--text-primary); white-space: pre-wrap;">${note.text}</p>
            </div>
        `;
    }).join('');
    
    // Add delete event listeners
    const deleteBtns = elements.notesListContainer.querySelectorAll('.delete-note-btn');
    deleteBtns.forEach(btn => {
        btn.addEventListener('click', async () => {
            const id = btn.getAttribute('data-id');
            const confirmed = await showConfirm("Voulez-vous vraiment supprimer cette note ?");
            if (confirmed) {
                store.deleteNote(id);
                renderNotes();
                showToast("Note supprimée", "success");
            }
        });
    });
}
