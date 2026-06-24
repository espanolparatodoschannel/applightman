// app.js

const CONFIG_KEY = "lightman_api_url";
let apiUrl = localStorage.getItem(CONFIG_KEY) || "https://script.google.com/macros/s/AKfycbwI3o54GHtgvGu7pafOkRiDL8jWoLw2sHSw2TfAGD2k_KCRtZO6f-ma2RQYx_gZD5OHvQ/exec";

// Mock Data actualizado
const mockOptions = {
    opciones: [
        { id: "FC-01", description: "801014 TCP CF14/27K SPIRAL", categorie: "Flux Compact" },
        { id: "FC-02", description: "CF11/T2/27K/SPIRAL/E26", categorie: "Flux Compact" },
        { id: "LED-01", description: "Foco LED 10W", categorie: "Éclairage Général" }
    ],
    etage: ["25", "24", "23", "22", "21", "20", "19", "18", "17", "16A", "16", "15", "14", "12", "11", "10", "9", "8", "7A", "7", "6", "5", "4", "3", "2", "1", "RDC", "SS1", "SS2", "SS3"],
    tache: ["Bon de trabajo", "Tournée"]
};

let appOptions = {
    opciones: [],
    etage: [],
    tache: []
};

let records = [];
let charts = {};
let syncQueue = JSON.parse(localStorage.getItem('lightman_sync_queue')) || [];

// DOM Elements
const elements = {
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
    exportPdfBtn: document.getElementById('export-pdf-btn'),
    historyContainer: document.getElementById('history-container'),
    syncBadge: document.getElementById('sync-badge'),
    filterMonth: document.getElementById('filter-month'),
    filterEtage: document.getElementById('filter-etage'),
    filterTache: document.getElementById('filter-tache'),
    clearFiltersBtn: document.getElementById('clear-filters-btn')
};

// Initialize App
document.addEventListener('DOMContentLoaded', () => {
    if (typeof ChartDataLabels !== 'undefined') {
        Chart.register(ChartDataLabels);
    }
    // Set default date to today
    elements.dateInput.valueAsDate = new Date();
    updateDateDisplay();
    
    // Load config
    if (apiUrl) {
        elements.configInput.value = apiUrl;
        elements.connStatus.textContent = "Connecté à Google Sheets";
        elements.connStatus.className = "status-badge success";
        fetchDataFromCloud();
    } else {
        // Load mocks
        appOptions = mockOptions;
        populateAllSelects();
        records = JSON.parse(localStorage.getItem('lightman_local_records')) || [];
        populateFilters();
        updateDashboard();
    }

    updateSyncBadge();
    renderHistory();
    window.addEventListener('online', syncOfflineQueue);

    setupEventListeners();
});

function setupEventListeners() {
    // Eventos para el input de fecha y su visualización personalizada
    elements.dateInput.addEventListener('input', updateDateDisplay);
    elements.dateInput.addEventListener('change', updateDateDisplay);
    elements.dateInput.addEventListener('click', () => {
        try {
            elements.dateInput.showPicker();
        } catch (e) {}
    });

    // Navigation
    elements.navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const targetId = item.getAttribute('data-target');
            
            elements.navItems.forEach(n => n.classList.remove('active'));
            elements.views.forEach(v => v.classList.remove('active'));
            
            item.classList.add('active');
            document.getElementById(targetId).classList.add('active');

            if (targetId === 'view-stats') {
                updateDashboard();
            }
        });
    });

    if (elements.filterMonth) {
        elements.filterMonth.addEventListener('change', updateDashboard);
        elements.filterEtage.addEventListener('change', updateDashboard);
        elements.filterTache.addEventListener('change', updateDashboard);
        elements.clearFiltersBtn.addEventListener('click', () => {
            elements.filterMonth.value = 'all';
            elements.filterEtage.value = 'all';
            elements.filterTache.value = 'all';
            updateDashboard();
        });
    }

    // Mostrar/ocultar campos de tarea
    elements.tacheSelect.addEventListener('change', (e) => {
        const val = e.target.value.trim().toLowerCase();
        
        elements.groupBon.classList.add('hidden-field');
        elements.groupSoumission.classList.add('hidden-field');
        elements.groupTacheNum.classList.add('hidden-field');
        elements.numBonInput.required = false;
        elements.numSoumissionInput.required = false;
        elements.numTacheInput.required = false;
        elements.numBonInput.value = "";
        elements.numSoumissionInput.value = "";
        elements.numTacheInput.value = "";

        if (val === 'bon de travail') {
            elements.groupBon.classList.remove('hidden-field');
            elements.numBonInput.required = true;
        } else if (val === 'soumission') {
            elements.groupSoumission.classList.remove('hidden-field');
            elements.numSoumissionInput.required = true;
        } else if (val === 'tournée' || val === 'tournee') {
            elements.groupTacheNum.classList.remove('hidden-field');
            elements.numTacheInput.required = true;
        }
    });



    elements.catSelect.addEventListener('change', (e) => {
        const selectedCat = e.target.value;
        const currentDesc = elements.descSelect.value;
        
        let filteredOpts = appOptions.opciones;
        if (selectedCat !== "") {
            filteredOpts = appOptions.opciones.filter(opt => opt.categorie === selectedCat);
        }
        
        const filteredDesc = filteredOpts.map(opt => opt.description).filter(Boolean);
        populateSelect('description', filteredDesc);
        
        if (filteredDesc.includes(currentDesc)) {
            elements.descSelect.value = currentDesc;
        } else {
            elements.descSelect.value = "";
            elements.idInput.value = "";
        }
    });

    elements.descSelect.addEventListener('change', (e) => {
        const selectedDesc = e.target.value;
        const foundOpt = appOptions.opciones.find(opt => opt.description === selectedDesc);
        
        if (foundOpt) {
            if (foundOpt.categorie && elements.catSelect.value !== foundOpt.categorie) {
                elements.catSelect.value = foundOpt.categorie;
                // Actualizar opciones de descripción para esta categoría
                const filteredOpts = appOptions.opciones.filter(opt => opt.categorie === foundOpt.categorie);
                const filteredDesc = filteredOpts.map(opt => opt.description).filter(Boolean);
                populateSelect('description', filteredDesc);
            }
            elements.descSelect.value = selectedDesc;
            elements.idInput.value = foundOpt.id || "";
        } else {
            elements.idInput.value = "";
        }
    });

    // Form Submit
    elements.form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const formData = new FormData(elements.form);
        const record = {
            fecha: formData.get('date'),
            id_item: formData.get('id_item') || "", // Enviamos el Id opcionalmente
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

        if (apiUrl) {
            await saveRecordToCloud(record);
        } else {
            const localRecord = { ...record, date: record.fecha };
            records.push(localRecord);
            localStorage.setItem('lightman_local_records', JSON.stringify(records));
            alert("Enregistré localement (Mode test). Configurez Google Sheets pour enregistrer dans le cloud.");
            addToHistory(record);
            resetFormAndRefresh();
        }
    });

    // Save Config
    elements.saveConfigBtn.addEventListener('click', () => {
        const newUrl = elements.configInput.value.trim();
        if (newUrl) {
            localStorage.setItem(CONFIG_KEY, newUrl);
            apiUrl = newUrl;
            elements.connStatus.textContent = "Configuré. Connexion...";
            elements.connStatus.className = "status-badge success";
            fetchDataFromCloud();
        } else {
            localStorage.removeItem(CONFIG_KEY);
            apiUrl = "";
            elements.connStatus.textContent = "Non configuré";
            elements.connStatus.className = "status-badge error";
        }
    });

    // Sync Button
    elements.syncBtn.addEventListener('click', () => {
        if (apiUrl) {
            if (syncQueue.length > 0) {
                syncOfflineQueue();
            } else {
                fetchDataFromCloud();
            }
        } else {
            alert("Vous devez d'abord configurer l'URL de Google Sheets.");
        }
    });

    // PDF Export
    if (elements.exportPdfBtn) {
        elements.exportPdfBtn.addEventListener('click', () => {
            const statsElement = document.getElementById('view-stats');
            const opt = {
                margin:       10,
                filename:     `Lightman_Stats_${new Date().toISOString().split('T')[0]}.pdf`,
                image:        { type: 'jpeg', quality: 0.98 },
                html2canvas:  { scale: 2, useCORS: true },
                jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
            };
            elements.exportPdfBtn.style.display = 'none';
            showLoader("Génération du PDF...");
            html2pdf().set(opt).from(statsElement).save().then(() => {
                elements.exportPdfBtn.style.display = 'block';
                hideLoader();
            }).catch(err => {
                console.error("PDF Error:", err);
                elements.exportPdfBtn.style.display = 'block';
                hideLoader();
            });
        });
    }
}

function showLoader(msg = "Chargement...") {
    elements.loaderText.textContent = msg;
    elements.loader.classList.remove('hidden');
}

function hideLoader() {
    elements.loader.classList.add('hidden');
}

function populateSelect(id, values) {
    const selectElement = document.getElementById(id);
    const placeholder = selectElement.options[0];
    selectElement.innerHTML = '';
    selectElement.appendChild(placeholder);
    
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

function populateAllSelects() {
    const allDescriptions = appOptions.opciones.map(opt => opt.description).filter(Boolean);
    const allCategories = [...new Set(appOptions.opciones.map(opt => opt.categorie).filter(Boolean))];
    
    populateSelect('description', allDescriptions);
    populateSelect('categorie', allCategories);
    populateSelect('etage', appOptions.etage || []);
    populateSelect('tache', appOptions.tache || []);
    elements.idInput.value = "";
}

async function fetchDataFromCloud() {
    showLoader("Synchronisation des données...");
    try {
        const response = await fetch(apiUrl + "?action=getData");
        const data = await response.json();
        
        if (data.status === 'success') {
            appOptions = data.options;
            populateAllSelects();
            records = data.records || [];
            populateFilters();
            updateDashboard();
            renderHistory();
        } else {
            throw new Error(data.message || "Error desconocido");
        }
    } catch (error) {
        console.error("Fetch Error:", error);
        alert("Erreur de connexion à Google Sheets. Utilisation de données locales temporaires.");
        appOptions = mockOptions;
        populateAllSelects();
    } finally {
        hideLoader();
    }
}

async function saveRecordToCloud(record) {
    if (!navigator.onLine) {
        addToOfflineQueue(record);
        return;
    }

    showLoader("Enregistrement...");
    try {
        const response = await fetch(apiUrl, {
            method: 'POST',
            body: JSON.stringify({ action: 'addRecord', record: record })
        });
        
        const data = await response.json();
        if (data.status === 'success') {
            alert("Enregistrement réussi !");
            addToHistory(record);
            resetFormAndRefresh();
        } else {
            throw new Error("Error al guardar");
        }
    } catch (error) {
        console.error("Save Error:", error);
        addToOfflineQueue(record);
    } finally {
        hideLoader();
    }
}

// Queue & History Helpers
function addToOfflineQueue(record) {
    syncQueue.push(record);
    localStorage.setItem('lightman_sync_queue', JSON.stringify(syncQueue));
    updateSyncBadge();
    addToHistory(record);
    resetFormAndRefresh(false);
    alert("Hors ligne : Enregistrement sauvegardé localement. Il sera synchronisé dès que la connexion sera rétablie.");
}

async function syncOfflineQueue() {
    if (syncQueue.length === 0 || !apiUrl || !navigator.onLine) return;
    
    showLoader(`Synchronisation de ${syncQueue.length} éléments...`);
    let syncSuccessCount = 0;
    
    const queueToProcess = [...syncQueue];
    syncQueue = [];
    localStorage.setItem('lightman_sync_queue', JSON.stringify(syncQueue));
    updateSyncBadge();

    for (const record of queueToProcess) {
        try {
            const response = await fetch(apiUrl, {
                method: 'POST',
                body: JSON.stringify({ action: 'addRecord', record: record })
            });
            const data = await response.json();
            if (data.status === 'success') {
                syncSuccessCount++;
            } else {
                syncQueue.push(record);
            }
        } catch (e) {
            syncQueue.push(record);
        }
    }
    
    localStorage.setItem('lightman_sync_queue', JSON.stringify(syncQueue));
    updateSyncBadge();
    hideLoader();
    
    if (syncSuccessCount > 0) {
        fetchDataFromCloud();
        alert(`${syncSuccessCount} enregistrements synchronisés avec succès !`);
    } else if (syncQueue.length > 0) {
        alert("Certains enregistrements n'ont pas pu être synchronisés. Ils restent dans la file d'attente.");
    }
}

function updateSyncBadge() {
    if (elements.syncBadge) {
        if (syncQueue.length > 0) {
            elements.syncBadge.textContent = syncQueue.length;
            elements.syncBadge.classList.remove('hidden');
        } else {
            elements.syncBadge.classList.add('hidden');
        }
    }
}

function resetFormAndRefresh(doFetch = true) {
    elements.form.reset();
    elements.dateInput.valueAsDate = new Date();
    updateDateDisplay();
    elements.groupBon.classList.add('hidden-field');
    elements.groupSoumission.classList.add('hidden-field');
    elements.groupTacheNum.classList.add('hidden-field');
    elements.numBonInput.required = false;
    elements.numSoumissionInput.required = false;
    elements.numTacheInput.required = false;
    populateAllSelects();
    if (doFetch && navigator.onLine && apiUrl) {
        fetchDataFromCloud();
    }
}

function updateDateDisplay() {
    if (!elements.dateDisplay) return;
    const val = elements.dateInput.value;
    if (val) {
        const parts = val.split('-');
        if (parts.length === 3) {
            const year = parts[0];
            const monthIndex = parseInt(parts[1], 10) - 1;
            const day = parseInt(parts[2], 10);
            
            // Usamos abreviaciones en español según tu ejemplo ("16-jun-2026")
            const months = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
            
            // Nota: Si en el futuro prefieres abreviaciones en francés ("16-juin-2026"), 
            // puedes reemplazar la línea de arriba por:
            // const months = ["janv", "févr", "mars", "avr", "mai", "juin", "juil", "août", "sept", "oct", "nov", "déc"];
            
            elements.dateDisplay.textContent = `${day}-${months[monthIndex]}-${year}`;
            return;
        }
    }
    elements.dateDisplay.textContent = "Sélectionnez la date";
}

function addToHistory(record) {
    let history = JSON.parse(localStorage.getItem('lightman_history')) || [];
    history.unshift(record);
    if (history.length > 20) history.pop(); // Mantener solo los últimos 20
    localStorage.setItem('lightman_history', JSON.stringify(history));
    renderHistory();
}

function renderHistory() {
    if (!elements.historyContainer) return;
    
    // Obtenemos los últimos 5 registros guardados en Google Sheets
    const history = records.slice(-5).reverse();
    
    if (history.length === 0) {
        elements.historyContainer.innerHTML = '<p class="help-text">Aucun enregistrement récent.</p>';
        return;
    }
    
    elements.historyContainer.innerHTML = history.map(r => `
        <div class="history-card">
            <div class="history-info">
                <span class="history-desc">${r.description || r.id_item || 'N/A'}</span>
                <span class="history-date">Étage: ${r.etage || '-'} • Type: ${r.tache || '-'} • ${new Date(r.fecha || r.date).toLocaleDateString()}</span>
            </div>
            <span class="history-qty">${r.quantite}x</span>
        </div>
    `).join('');
}

function populateFilters() {
    if (!elements.filterMonth) return;

    // Month Filter
    const months = new Set();
    records.forEach(r => {
        if (!r.date && !r.fecha) return;
        const d = new Date(r.date || r.fecha);
        if (!isNaN(d)) {
            const y = d.getFullYear();
            const m = String(d.getMonth() + 1).padStart(2, '0');
            months.add(`${y}-${m}`);
        }
    });
    const sortedMonths = Array.from(months).sort().reverse();
    const monthNames = ["Janv", "Févr", "Mars", "Avr", "Mai", "Juin", "Juil", "Août", "Sept", "Oct", "Nov", "Déc"];
    elements.filterMonth.innerHTML = '<option value="all">Tous les mois</option>';
    sortedMonths.forEach(key => {
        const [y, m] = key.split('-');
        const label = `${monthNames[parseInt(m, 10) - 1]} ${y}`;
        elements.filterMonth.innerHTML += `<option value="${key}">${label}</option>`;
    });

    // Etage Filter
    const etages = new Set();
    records.forEach(r => {
        if (r.etage !== undefined && r.etage !== null && r.etage !== "") {
            etages.add(String(r.etage).trim());
        }
    });
    const sortedEtages = Array.from(etages).sort();
    elements.filterEtage.innerHTML = '<option value="all">Tous les étages</option>';
    sortedEtages.forEach(e => {
        elements.filterEtage.innerHTML += `<option value="${e}">${e}</option>`;
    });

    // Tache Filter
    const taches = new Set();
    records.forEach(r => {
        if (r.tache) taches.add(r.tache);
    });
    elements.filterTache.innerHTML = '<option value="all">Toutes les tâches</option>';
    Array.from(taches).sort().forEach(t => {
        elements.filterTache.innerHTML += `<option value="${t}">${t}</option>`;
    });
}

function getFilteredRecords() {
    let filtered = records;
    if (!elements.filterMonth) return filtered;

    const mVal = elements.filterMonth.value;
    const eVal = elements.filterEtage.value;
    const tVal = elements.filterTache.value;

    if (mVal !== 'all') {
        filtered = filtered.filter(r => {
            const d = new Date(r.date || r.fecha);
            if (isNaN(d)) return false;
            const y = d.getFullYear();
            const m = String(d.getMonth() + 1).padStart(2, '0');
            return `${y}-${m}` === mVal;
        });
    }

    if (eVal !== 'all') {
        filtered = filtered.filter(r => String(r.etage).trim() === eVal);
    }

    if (tVal !== 'all') {
        filtered = filtered.filter(r => r.tache === tVal);
    }

    return filtered;
}

// Charts & Stats Logic
function updateDashboard() {
    const dashboardRecords = getFilteredRecords();

    // Calcular totales de bombillas (ampoules)
    const totalBulbs = dashboardRecords.reduce((sum, r) => sum + Number(r.quantite || 0), 0);
    
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    const monthBulbs = dashboardRecords.filter(r => {
        const d = new Date(r.date || r.fecha);
        return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    }).reduce((sum, r) => sum + Number(r.quantite || 0), 0);

    document.getElementById('stat-total').textContent = totalBulbs;
    document.getElementById('stat-month').textContent = monthBulbs;


    // 1.5 Ampoules changées par mois
    const monthlyData = {};
    dashboardRecords.forEach(r => {
        if (!r.date && !r.fecha) return;
        const d = new Date(r.date || r.fecha);
        if (!isNaN(d)) {
            const y = d.getFullYear();
            const m = String(d.getMonth() + 1).padStart(2, '0');
            const key = `${y}-${m}`;
            monthlyData[key] = (monthlyData[key] || 0) + Number(r.quantite || 0);
        }
    });
    const sortedMonths = Object.keys(monthlyData).sort();
    const monthNames = ["Janv", "Févr", "Mars", "Avr", "Mai", "Juin", "Juil", "Août", "Sept", "Oct", "Nov", "Déc"];
    const monthlyLabels = sortedMonths.map(key => {
        const [y, m] = key.split('-');
        return `${monthNames[parseInt(m, 10) - 1]} ${y}`;
    });
    const monthlyValues = sortedMonths.map(key => monthlyData[key]);

    // 2. Top 5 Productos
    const productData = {};
    const productCategoryMap = {};
    const productDescMap = {};
    dashboardRecords.forEach(r => {
        const idKey = r.id_item || "Inconnu";
        const desc = r.description || idKey;
        if (idKey) {
            productData[idKey] = (productData[idKey] || 0) + Number(r.quantite || 0);
            if (r.categorie && !productCategoryMap[idKey]) {
                productCategoryMap[idKey] = r.categorie;
            }
            if (!productDescMap[idKey]) {
                productDescMap[idKey] = desc;
            }
        }
    });
    const sortedProducts = Object.keys(productData).sort((a, b) => productData[b] - productData[a]).slice(0, 5);
    const sortedProductQuantities = sortedProducts.map(p => productData[p]);
    const topProductsFullDesc = sortedProducts.map(p => productDescMap[p]);

    // 3. Distribución por tipo de tarea
    const taskTypeData = {};
    dashboardRecords.forEach(r => {
        if (r.tache) {
            taskTypeData[r.tache] = (taskTypeData[r.tache] || 0) + Number(r.quantite || 0);
        }
    });

    // 4 & 5. Intervenciones y bombillas por planta (étage)
    const etageInterventions = {};
    const etageBulbsByCategory = {};
    dashboardRecords.forEach(r => {
        if (r.etage !== undefined && r.etage !== null) {
            const etageStr = String(r.etage).trim();
            const cat = r.categorie || 'Inconnu';
            if (etageStr) {
                etageInterventions[etageStr] = (etageInterventions[etageStr] || 0) + 1;
                if (!etageBulbsByCategory[etageStr]) etageBulbsByCategory[etageStr] = {};
                etageBulbsByCategory[etageStr][cat] = (etageBulbsByCategory[etageStr][cat] || 0) + Number(r.quantite || 0);
            }
        }
    });

    let sortedEtages = [];
    if (appOptions.etage && appOptions.etage.length > 0) {
        const appEtages = appOptions.etage.map(et => String(et).trim()).filter(Boolean);
        sortedEtages = appEtages.filter(et => etageInterventions[et] !== undefined || etageBulbsByCategory[et] !== undefined);
        const otherEtages = Object.keys(etageInterventions).filter(et => !sortedEtages.includes(et));
        sortedEtages = sortedEtages.concat(otherEtages);
        sortedEtages = [...new Set(sortedEtages)];
    } else {
        sortedEtages = Object.keys(etageInterventions);
    }

    const etageInterventionsValues = sortedEtages.map(et => etageInterventions[et] || 0);

    // 6. Categorías
    const catCounts = {};
    dashboardRecords.forEach(r => {
        if (r.categorie) {
            catCounts[r.categorie] = (catCounts[r.categorie] || 0) + Number(r.quantite || 0);
        }
    });

    const catLabels = Object.keys(catCounts);
    const catPalette = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316', '#6366f1', '#84cc16'];
    const catColorMap = {};
    catLabels.forEach((cat, index) => {
        catColorMap[cat] = catPalette[index % catPalette.length];
    });

    // Crear datasets apilados para etageBulbsChart
    const etageCategories = new Set();
    Object.values(etageBulbsByCategory).forEach(etageData => {
        Object.keys(etageData).forEach(cat => etageCategories.add(cat));
    });
    
    const datasetsForEtage = Array.from(etageCategories).map(cat => {
        const catData = sortedEtages.map(et => etageBulbsByCategory[et]?.[cat] || 0);
        return {
            label: cat,
            data: catData,
            backgroundColor: catColorMap[cat] || '#cbd5e1',
            borderColor: window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? '#0f172a' : '#ffffff',
            borderWidth: 2
        };
    });

    const isDarkMode = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    const textColor = isDarkMode ? '#94a3b8' : '#475569';

    datasetsForEtage.push({
        label: 'Total',
        data: sortedEtages.map(() => 0),
        backgroundColor: 'transparent',
        borderColor: 'transparent',
        borderWidth: 0,
        datalabels: {
            display: true,
            anchor: 'end',
            align: 'right',
            color: textColor,
            font: { weight: 'bold', family: 'Inter', size: 13 },
            formatter: (value, context) => {
                let sum = 0;
                context.chart.data.datasets.forEach(ds => {
                    if (ds.label !== 'Total' && ds.data[context.dataIndex]) {
                        sum += ds.data[context.dataIndex];
                    }
                });
                return sum > 0 ? sum : '';
            }
        }
    });

    const topProductsColors = sortedProducts.map(p => {
        const cat = productCategoryMap[p];
        return cat ? (catColorMap[cat] || '#cbd5e1') : '#cbd5e1';
    });

    // Renderizar todos los gráficos
    renderChart('monthlyBulbsChart', 'bar', monthlyLabels, monthlyValues, '#10b981', {
        datasetLabel: 'Ampoules'
    });

    renderChart('topProductsChart', 'bar', sortedProducts, sortedProductQuantities, topProductsColors, {
        indexAxis: 'y',
        datasetLabel: 'Ampoules',
        fullDescriptions: topProductsFullDesc,
        plugins: {
            tooltip: {
                callbacks: {
                    title: function(context) {
                        return context[0].chart.options.fullDescriptions[context[0].dataIndex] || context[0].label;
                    }
                }
            }
        }
    });

    renderChart('taskTypeChart', 'doughnut', Object.keys(taskTypeData), Object.values(taskTypeData), ['#3b82f6', '#10b981', '#ef4444', '#f59e0b'], {
        datasetLabel: 'Ampoules'
    });

    const etageChartHeight = Math.max(320, sortedEtages.length * 64);
    const interContainer = document.getElementById('etageInterventionsChart')?.parentElement;
    if (interContainer) interContainer.style.height = `${etageChartHeight}px`;
    const bulbsContainer = document.getElementById('etageBulbsChart')?.parentElement;
    if (bulbsContainer) bulbsContainer.style.height = `${etageChartHeight}px`;

    renderChart('etageInterventionsChart', 'bar', sortedEtages, [], null, {
        indexAxis: 'y',
        datasets: [{
            label: 'Interventions',
            data: etageInterventionsValues,
            backgroundColor: '#60a5fa',
            borderColor: isDarkMode ? '#0f172a' : '#ffffff',
            borderWidth: 2
        }]
    });

    renderChart('etageBulbsChart', 'bar', sortedEtages, [], null, {
        indexAxis: 'y',
        datasets: datasetsForEtage,
        scales: {
            x: { stacked: true },
            y: { stacked: true }
        }
    });

    renderChart('categoryChart', 'pie', catLabels, Object.values(catCounts), catLabels.map(cat => catColorMap[cat]), {
        datasetLabel: 'Ampoules'
    });
}

function renderChart(canvasId, type, labels, data, colors, customOptions = {}) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    
    if (charts[canvasId]) {
        charts[canvasId].destroy();
    }

    const isDarkMode = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    const textColor = isDarkMode ? '#94a3b8' : '#475569';
    const gridColor = isDarkMode ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)';

    const defaultOptions = {
        responsive: true,
        maintainAspectRatio: false,
        color: textColor,
        plugins: {
            legend: {
                display: (['pie', 'doughnut'].includes(type) || customOptions.datasets !== undefined),
                position: ['pie', 'doughnut'].includes(type) ? 'right' : 'bottom',
                labels: { 
                    color: textColor, 
                    padding: 20, 
                    font: { family: 'Inter', size: 12 },
                    filter: (item) => item.text !== 'Total'
                }
            },
            datalabels: {
                display: true,
                anchor: (['pie', 'doughnut'].includes(type) || customOptions.datasets) ? 'center' : 'end',
                align: (['pie', 'doughnut'].includes(type) || customOptions.datasets) ? 'center' : (customOptions.indexAxis === 'y' ? 'right' : 'top'),
                color: (['pie', 'doughnut'].includes(type) || customOptions.datasets) ? '#fff' : textColor,
                offset: customOptions.datasets ? 0 : 4,
                font: { weight: 'bold', family: 'Inter' },
                formatter: (value) => {
                    return value > 0 ? value : '';
                }
            }
        },
        scales: ['pie', 'doughnut'].includes(type) ? {} : {
            x: {
                ticks: { precision: 0, color: textColor, font: { family: 'Inter' } },
                grid: { color: gridColor, drawBorder: false }
            },
            y: {
                ticks: { precision: 0, color: textColor, font: { family: 'Inter' } },
                grid: { color: gridColor, drawBorder: false }
            }
        },
        elements: {
            bar: { borderRadius: 6, borderSkipped: false },
            line: { tension: 0.4, borderWidth: 3 } // Smooth premium curves
        }
    };

    const options = { ...defaultOptions, ...customOptions };
    if (customOptions.fullDescriptions) {
        options.fullDescriptions = customOptions.fullDescriptions;
    }
    if (customOptions.scales) {
        options.scales = { ...defaultOptions.scales, ...customOptions.scales };
        if (customOptions.scales.x) options.scales.x = { ...defaultOptions.scales.x, ...customOptions.scales.x };
        if (customOptions.scales.y) options.scales.y = { ...defaultOptions.scales.y, ...customOptions.scales.y };
    }
    if (customOptions.plugins) {
        options.plugins = { ...defaultOptions.plugins, ...customOptions.plugins };
    }

    charts[canvasId] = new Chart(ctx, {
        type: type,
        data: {
            labels: labels,
            datasets: customOptions.datasets || [{
                label: customOptions.datasetLabel || 'Quantité',
                data: data,
                backgroundColor: colors,
                borderColor: type === 'line' ? (Array.isArray(colors) ? colors[0] : colors) : (isDarkMode ? '#0f172a' : '#ffffff'),
                borderWidth: type === 'line' ? 3 : 2,
                fill: type === 'line' ? false : undefined
            }]
        },
        options: options
    });
}
