// js/charts.js
import { getCategoryColor } from './utils.js';
import * as store from './store.js';
import * as ui from './ui.js';

let charts = {};

// Plugin de Chart.js para dibujar líneas señaladoras en gráficos circulares (pie)
export const pieLinesPlugin = {
    id: 'pieLinesPlugin',
    afterDraw: (chart) => {
        const ctx = chart.ctx;
        chart.data.datasets.forEach((dataset, datasetIndex) => {
            const meta = chart.getDatasetMeta(datasetIndex);
            if (chart.config.type !== 'pie') return;
            
            meta.data.forEach((element, index) => {
                const { x, y, startAngle, endAngle, outerRadius } = element;
                const midAngle = startAngle + (endAngle - startAngle) / 2;
                
                const startX = x + Math.cos(midAngle) * outerRadius;
                const startY = y + Math.sin(midAngle) * outerRadius;
                
                const endX = x + Math.cos(midAngle) * (outerRadius + 14);
                const endY = y + Math.sin(midAngle) * (outerRadius + 14);
                
                ctx.save();
                ctx.beginPath();
                ctx.moveTo(startX, startY);
                ctx.lineTo(endX, endY);
                
                const bgColors = dataset.backgroundColor;
                const color = Array.isArray(bgColors) ? bgColors[index] : bgColors;
                
                ctx.strokeStyle = color || '#cbd5e1';
                ctx.lineWidth = 2;
                ctx.stroke();
                ctx.restore();
            });
        });
    }
};

export function getFilteredRecords() {
    let filtered = store.records;
    if (!ui.elements.filterMonth) return filtered;

    const mVal = ui.elements.filterMonth.value;
    const eVal = ui.elements.filterEtage.value;
    const tVal = ui.elements.filterTache.value;

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

export function updateDashboard() {
    const dashboardRecords = getFilteredRecords();

    // Calcular totales de bombillas
    const totalBulbs = dashboardRecords.reduce((sum, r) => sum + Number(r.quantite || 0), 0);
    
    if (ui.elements.statTotal) {
        ui.elements.statTotal.textContent = totalBulbs;
    }
    
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
    const monthlyColors = sortedMonths.map(key => {
        const [y, m] = key.split('-');
        return parseInt(m, 10) === 7 ? '#3b82f6' : '#10b981'; // Blue for July, Green for others
    });

    // 2. Top 5 Productos
    const productData = {};
    const productCategoryMap = {};
    const productDescMap = {};
    dashboardRecords.forEach(r => {
        const idKey = r.id_item || "Inconnu";
        const foundOpt = store.appOptions.opciones.find(opt => opt.id === idKey);
        const desc = (foundOpt && foundOpt.description) ? foundOpt.description : (r.description || idKey);
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

    // 4 & 5. Intervenciones y bombillas por planta
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

    let sortedEtages = Object.keys(etageBulbsByCategory);
    sortedEtages.sort((a, b) => {
        const totalA = Object.values(etageBulbsByCategory[a]).reduce((sum, v) => sum + v, 0);
        const totalB = Object.values(etageBulbsByCategory[b]).reduce((sum, v) => sum + v, 0);
        return totalB - totalA;
    });

    // Actualizar KPIs
    if (ui.elements.statAvg) {
        const avg = sortedMonths.length > 0 ? (totalBulbs / sortedMonths.length).toFixed(1) : 0;
        ui.elements.statAvg.textContent = avg;
    }
    if (ui.elements.statTopEtage) {
        ui.elements.statTopEtage.textContent = sortedEtages.length > 0 ? sortedEtages[0] : "-";
    }
    if (ui.elements.statTopProduct) {
        ui.elements.statTopProduct.textContent = sortedProducts.length > 0 ? sortedProducts[0] : "-";
    }

    // 6. Categorías
    const catCounts = {};
    dashboardRecords.forEach(r => {
        if (r.categorie) {
            catCounts[r.categorie] = (catCounts[r.categorie] || 0) + Number(r.quantite || 0);
        }
    });
    const catLabels = Object.keys(catCounts).sort((a, b) => catCounts[b] - catCounts[a]);

    const etageCategories = new Set();
    Object.values(etageBulbsByCategory).forEach(etageData => {
        Object.keys(etageData).forEach(cat => etageCategories.add(cat));
    });
    
    const datasetsForEtage = Array.from(etageCategories).map(cat => {
        const catData = sortedEtages.map(et => etageBulbsByCategory[et]?.[cat] || 0);
        return {
            label: cat,
            data: catData,
            backgroundColor: getCategoryColor(cat),
            borderWidth: 0
        };
    });

    const isDarkMode = document.documentElement.getAttribute('data-theme') === 'dark';
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
        return cat ? getCategoryColor(cat) : '#cbd5e1';
    });

    const handleChartClick = (e, activeEls) => {
        if (!activeEls.length) return;
        const chart = activeEls[0].element.$context.chart;
        const index = activeEls[0].index;
        const label = chart.data.labels[index];
        const canvasId = chart.canvas.id;
        
        ui.elements.navItems.forEach(n => n.classList.remove('active'));
        ui.elements.views.forEach(v => v.classList.remove('active'));
        const histNav = Array.from(ui.elements.navItems).find(n => n.getAttribute('data-target') === 'view-historique');
        if (histNav) histNav.classList.add('active');
        document.getElementById('view-historique').classList.add('active');
        
        if (ui.elements.filterHistoryMonth) ui.elements.filterHistoryMonth.value = 'all';
        if (ui.elements.filterHistoryEtage) ui.elements.filterHistoryEtage.value = 'all';
        if (ui.elements.filterHistoryTache) ui.elements.filterHistoryTache.value = 'all';
        if (ui.elements.searchHistory) ui.elements.searchHistory.value = '';

        if ((canvasId === 'monthlyBulbsChart' || canvasId === 'cumulativeTrendChart' || canvasId === 'taskTypeEvolutionChart') && ui.elements.filterHistoryMonth) {
            ui.elements.filterHistoryMonth.value = sortedMonths[index] || 'all';
        } else if (canvasId === 'topEtagesChart' && ui.elements.filterHistoryEtage) {
            ui.elements.filterHistoryEtage.value = label || 'all';
        } else if (canvasId === 'taskTypeChart' && ui.elements.filterHistoryTache) {
            ui.elements.filterHistoryTache.value = label || 'all';
        } else if (ui.elements.searchHistory) {
            ui.elements.searchHistory.value = label;
        }
        
        ui.renderHistory();
    };

    renderChart('monthlyBulbsChart', 'bar', monthlyLabels, monthlyValues, monthlyColors, {
        datasetLabel: 'Ampoules',
        onClick: handleChartClick,
        plugins: {
            datalabels: { anchor: 'center', align: 'center', color: '#ffffff' }
        }
    });

    renderChart('topProductsChart', 'bar', sortedProducts, sortedProductQuantities, topProductsColors, {
        indexAxis: 'y',
        datasetLabel: 'Ampoules',
        onClick: handleChartClick,
        fullDescriptions: topProductsFullDesc,
        plugins: {
            legend: {
                display: true,
                position: 'bottom',
                onClick: () => {}, 
                labels: {
                    generateLabels: function(chart) {
                        const uniqueCats = new Set();
                        sortedProducts.forEach(p => {
                            if (productCategoryMap[p]) uniqueCats.add(productCategoryMap[p]);
                        });
                        return Array.from(uniqueCats).map((cat, i) => ({
                            text: cat,
                            fillStyle: getCategoryColor(cat),
                            strokeStyle: getCategoryColor(cat),
                            lineWidth: 0,
                            hidden: false,
                            index: i,
                            fontColor: document.documentElement.getAttribute('data-theme') === 'dark' ? '#94a3b8' : '#475569'
                        }));
                    }
                }
            },
            tooltip: {
                callbacks: {
                    title: function(context) {
                        return context[0].chart.options.fullDescriptions[context[0].dataIndex] || context[0].label;
                    }
                }
            }
        }
    });

    // Ordenar los datos del gráfico de tipo de tarea de mayor a menor para que los colores se asignen según el tamaño
    const taskTypeKeys = Object.keys(taskTypeData).sort((a, b) => taskTypeData[b] - taskTypeData[a]);
    const taskTypeVals = taskTypeKeys.map(k => taskTypeData[k]);

    renderChart('taskTypeChart', 'doughnut', taskTypeKeys, taskTypeVals, ['#64748b', '#0ea5e9', '#d946ef', '#f43f5e'], {
        datasetLabel: 'Ampoules',
        onClick: handleChartClick,
        cutout: '45%', 
        layout: { padding: { top: 20, bottom: 20, left: 40, right: 40 } },
        plugins: {
            datalabels: {
                display: 'auto', 
                formatter: (value, context) => {
                    let sum = 0;
                    const dataArr = context.chart.data.datasets[0].data;
                    dataArr.forEach(data => sum += Number(data));
                    if (sum === 0) return '';
                    const percentageValue = (value * 100 / sum);
                    const threshold = window.innerWidth < 480 ? 12 : 6;
                    if (percentageValue < threshold) return '';
                    return `${value}`;
                },
                color: '#ffffff',
                font: { weight: 'bold', family: 'Inter', size: window.innerWidth < 480 ? 12 : 14 }
            }
        }
    });

    const monthlyTaskTypeData = {};
    sortedMonths.forEach(m => monthlyTaskTypeData[m] = {});

    dashboardRecords.forEach(r => {
        if (!r.date && !r.fecha) return;
        const d = new Date(r.date || r.fecha);
        if (!isNaN(d) && r.tache) {
            const y = d.getFullYear();
            const m = String(d.getMonth() + 1).padStart(2, '0');
            const key = `${y}-${m}`;
            if (monthlyTaskTypeData[key]) {
                monthlyTaskTypeData[key][r.tache] = (monthlyTaskTypeData[key][r.tache] || 0) + Number(r.quantite || 0);
            }
        }
    });

    const taskTypeColorsArr = ['#0ea5e9', '#f43f5e', '#d946ef', '#84cc16', '#64748b'];
    const taskTypeEvolutionDatasets = taskTypeKeys.map((tache, index) => {
        const color = taskTypeColorsArr[index % taskTypeColorsArr.length];
        return {
            label: tache,
            data: sortedMonths.map(month => monthlyTaskTypeData[month][tache] || 0),
            borderColor: color,
            backgroundColor: color + '33', // 33 for some transparency in area fill
            fill: true,
            tension: 0.4 // Smooth lines
        };
    });

    renderChart('taskTypeEvolutionChart', 'line', monthlyLabels, [], null, {
        datasets: taskTypeEvolutionDatasets,
        onClick: handleChartClick,
        scales: {
            y: { grace: '15%' }
        },
        layout: {
            padding: { top: 20 }
        },
        plugins: {
            legend: { display: true },
            datalabels: {
                display: 'auto',
                align: 'top',
                anchor: 'center',
                color: textColor,
                font: { weight: 'bold', family: 'Inter', size: 11 },
                formatter: (value) => value > 0 ? value : ''
            }
        }
    });

    const topProductsHeight = Math.max(250, sortedProducts.length * 48);
    const topProductsCard = document.getElementById('topProductsChart')?.closest('.chart-card');
    if (topProductsCard) topProductsCard.style.height = `${topProductsHeight + 80}px`;

    const catChartHeight = Math.max(250, catLabels.length * 48);
    const catCard = document.getElementById('categoryChart')?.closest('.chart-card');
    if (catCard) catCard.style.height = `${catChartHeight + 80}px`;

    const catValues = catLabels.map(cat => catCounts[cat]);
    renderChart('categoryChart', 'bar', catLabels, catValues, catLabels.map(cat => getCategoryColor(cat)), {
        datasetLabel: 'Ampoules',
        indexAxis: 'y',
        onClick: handleChartClick,
        plugins: { legend: { display: false } }
    });

    const top5Etages = sortedEtages.slice(0, 5);
    const top5EtagesValues = top5Etages.map(et => {
        return Object.values(etageBulbsByCategory[et]).reduce((sum, v) => sum + v, 0);
    });
    const topEtagesColors = ['#ef4444', '#f97316', '#f59e0b', '#84cc16', '#10b981'];
    
    renderChart('topEtagesChart', 'bar', top5Etages, top5EtagesValues, topEtagesColors, {
        indexAxis: 'y',
        datasetLabel: 'Ampoules',
        onClick: handleChartClick,
        plugins: {
            datalabels: { anchor: 'end', align: 'left', color: '#ffffff' }
        }
    });

    let cumulativeSum = 0;
    const cumulativeValues = monthlyValues.map(val => {
        cumulativeSum += val;
        return cumulativeSum;
    });

    renderChart('cumulativeTrendChart', 'line', monthlyLabels, cumulativeValues, '#8b5cf6', {
        datasetLabel: 'Total Cumulé',
        fill: true,
        plugins: {
            datalabels: { anchor: 'end', align: 'top', color: textColor, font: { weight: 'bold' } }
        }
    });
}

function renderChart(canvasId, type, labels, data, colors, customOptions = {}) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    
    if (charts[canvasId]) {
        charts[canvasId].destroy();
    }

    const isDarkMode = document.documentElement.getAttribute('data-theme') === 'dark';
    const textColor = isDarkMode ? '#94a3b8' : '#475569';
    const gridColor = isDarkMode ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)';

    const defaultOptions = {
        responsive: true,
        maintainAspectRatio: false,
        color: textColor,
        layout: {
            padding: { right: customOptions.indexAxis === 'y' ? 35 : 0 }
        },
        plugins: {
            legend: {
                display: (['pie', 'doughnut'].includes(type) || customOptions.datasets !== undefined),
                position: 'bottom',
                labels: { 
                    color: textColor, 
                    padding: 20, 
                    font: { family: 'Inter', size: 12 },
                    filter: (item) => item.text !== 'Total',
                    generateLabels: (chart) => {
                        if (['pie', 'doughnut'].includes(type)) {
                            const data = chart.data;
                            if (data.labels.length && data.datasets.length) {
                                const dataset = data.datasets[0];
                                const total = dataset.data.reduce((sum, val) => sum + Number(val || 0), 0);
                                return data.labels.map((label, i) => {
                                    const value = Number(dataset.data[i] || 0);
                                    const percentage = total > 0 ? ((value / total) * 100).toFixed(1) + '%' : '0%';
                                    
                                    const meta = chart.getDatasetMeta(0);
                                    const style = meta.controller.getStyle(i);
                                    
                                    return {
                                        text: `${label} (${percentage})`,
                                        fillStyle: style.backgroundColor,
                                        strokeStyle: style.borderColor,
                                        lineWidth: style.borderWidth,
                                        hidden: isNaN(dataset.data[i]) || (meta.data[i] && meta.data[i].hidden),
                                        index: i,
                                        fontColor: textColor
                                    };
                                });
                            }
                            return [];
                        } else {
                            return Chart.defaults.plugins.legend.labels.generateLabels(chart);
                        }
                    }
                }
            },
            datalabels: {
                display: true,
                anchor: (['pie', 'doughnut'].includes(type) || customOptions.datasets) ? 'center' : 'end',
                align: (['pie', 'doughnut'].includes(type) || customOptions.datasets) ? 'center' : (customOptions.indexAxis === 'y' ? 'right' : 'top'),
                color: (['pie', 'doughnut'].includes(type) || customOptions.datasets) ? '#fff' : textColor,
                offset: customOptions.datasets ? 0 : 4,
                font: { weight: 'bold', family: 'Inter' },
                formatter: (value) => value > 0 ? value : ''
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
            line: { tension: 0.4, borderWidth: 3 }
        },
        onClick: (e, activeEls) => {
            if (activeEls.length > 0 && customOptions.onClick) {
                customOptions.onClick(e, activeEls);
            }
        }
    };

    const options = { ...defaultOptions, ...customOptions };
    if (customOptions.layout) {
        options.layout = { ...defaultOptions.layout, ...customOptions.layout };
        if (customOptions.layout.padding) options.layout.padding = { ...defaultOptions.layout.padding, ...customOptions.layout.padding };
    }
    if (customOptions.fullDescriptions) options.fullDescriptions = customOptions.fullDescriptions;
    if (customOptions.scales) {
        options.scales = { ...defaultOptions.scales, ...customOptions.scales };
        if (customOptions.scales.x) options.scales.x = { ...defaultOptions.scales.x, ...customOptions.scales.x };
        if (customOptions.scales.y) options.scales.y = { ...defaultOptions.scales.y, ...customOptions.scales.y };
    }
    if (customOptions.plugins) {
        options.plugins = { ...defaultOptions.plugins, ...customOptions.plugins };
        if (customOptions.plugins.datalabels) options.plugins.datalabels = { ...defaultOptions.plugins.datalabels, ...customOptions.plugins.datalabels };
        if (customOptions.plugins.legend) {
            options.plugins.legend = { ...defaultOptions.plugins.legend, ...customOptions.plugins.legend };
            if (customOptions.plugins.legend.labels) options.plugins.legend.labels = { ...defaultOptions.plugins.legend.labels, ...customOptions.plugins.legend.labels };
        }
    }

    let finalDatasets = customOptions.datasets || [{
        label: customOptions.datasetLabel || 'Quantité',
        data: data,
        backgroundColor: colors,
        borderColor: type === 'line' ? (Array.isArray(colors) ? colors[0] : colors) : (isDarkMode ? '#0f172a' : '#ffffff'),
        borderWidth: type === 'line' ? 3 : 2,
        fill: type === 'line' ? false : undefined
    }];

    if (type === 'bar' && customOptions.indexAxis === 'y') {
        if (!options.datasets) options.datasets = {};
        if (!options.datasets.bar) options.datasets.bar = {};
        options.datasets.bar.barThickness = 26;
    }

    const chartPlugins = [];
    if (customOptions.extraPlugins) {
        chartPlugins.push(...customOptions.extraPlugins);
    }

    charts[canvasId] = new Chart(ctx, {
        type: type,
        data: { labels: labels, datasets: finalDatasets },
        options: options,
        plugins: chartPlugins
    });
}

export function populateFilters() {
    if (!ui.elements.filterMonth) return;

    const months = new Set();
    store.records.forEach(r => {
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
    
    ui.elements.filterMonth.innerHTML = '<option value="all">Tous les mois</option>';
    if (ui.elements.filterHistoryMonth) ui.elements.filterHistoryMonth.innerHTML = '<option value="all">Tous les mois</option>';
    
    sortedMonths.forEach(key => {
        const [y, m] = key.split('-');
        const label = `${monthNames[parseInt(m, 10) - 1]} ${y}`;
        ui.elements.filterMonth.innerHTML += `<option value="${key}">${label}</option>`;
        if (ui.elements.filterHistoryMonth) {
            ui.elements.filterHistoryMonth.innerHTML += `<option value="${key}">${label}</option>`;
        }
    });

    const etages = new Set();
    store.records.forEach(r => {
        if (r.etage !== undefined && r.etage !== null && r.etage !== "") {
            etages.add(String(r.etage).trim());
        }
    });
    const sortedEtages = Array.from(etages).sort();
    
    ui.elements.filterEtage.innerHTML = '<option value="all">Tous les étages</option>';
    if (ui.elements.filterHistoryEtage) ui.elements.filterHistoryEtage.innerHTML = '<option value="all">Tous les étages</option>';
    
    sortedEtages.forEach(e => {
        ui.elements.filterEtage.innerHTML += `<option value="${e}">${e}</option>`;
        if (ui.elements.filterHistoryEtage) {
            ui.elements.filterHistoryEtage.innerHTML += `<option value="${e}">${e}</option>`;
        }
    });

    const taches = new Set();
    store.records.forEach(r => {
        if (r.tache) taches.add(r.tache);
    });
    
    ui.elements.filterTache.innerHTML = '<option value="all">Toutes les tâches</option>';
    if (ui.elements.filterHistoryTache) ui.elements.filterHistoryTache.innerHTML = '<option value="all">Toutes les tâches</option>';
    
    Array.from(taches).sort().forEach(t => {
        ui.elements.filterTache.innerHTML += `<option value="${t}">${t}</option>`;
        if (ui.elements.filterHistoryTache) {
            ui.elements.filterHistoryTache.innerHTML += `<option value="${t}">${t}</option>`;
        }
    });

    const categories = new Set();
    store.records.forEach(r => {
        if (r.categorie) categories.add(r.categorie);
    });

    if (ui.elements.filterHistoryCategorie) {
        ui.elements.filterHistoryCategorie.innerHTML = '<option value="all">Toutes les catégories</option>';
        Array.from(categories).sort().forEach(c => {
            ui.elements.filterHistoryCategorie.innerHTML += `<option value="${c}">${c}</option>`;
        });
    }
}
