const GAS_URL = 'https://script.google.com/macros/s/AKfycbwHyEk6dmWlbm_YObxknK_C8NgUDSa1l9nbFDCRwuGQd-EpCtBnZiul6DZHapy_z3lqCg/exec';

let drugDatabase = [];
let reportData = [];
let currentPage = 1;
const itemsPerPage = 10;
let filteredDataCache = [];
let isReportLoaded = false;
let currentManageMaxQty = 0;
let currentManageDrugName = '';
let currentViewMode = 'items';
let currentFilteredItems = [];
let currentRenderedRows = [];
const historyCache = {};
const alertThresholds = [30, 60, 90];
const dailyAlertWindow = 30;
let currentDashboardFilter = 'all';
const stockExclusionActions = ['ReturnWH', 'Transfer', 'Destroy', 'UsedUp'];
const OTHER_STOCK_OUT_TOKEN = '__ROOM_OUT__';

// --- SweetAlert2 Theme Configuration (For Modals) ---
const swalTheme = {
    popup: 'rounded-[2.5rem] p-8 border border-slate-100 shadow-2xl bg-white/95 backdrop-blur-xl',
    title: 'text-slate-800 text-2xl font-bold mb-1',
    htmlContainer: 'text-slate-500 text-base',
    confirmButton: 'btn-donate min-w-[130px] justify-center shadow-lg border-0 text-white',
    cancelButton: 'px-6 py-3 rounded-2xl border-2 border-slate-200 text-slate-500 font-bold hover:bg-slate-50 hover:text-slate-700 transition-all bg-white',
    actions: 'flex gap-4 justify-center w-full items-center mt-4',
    input: 'w-full p-3 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all text-base text-slate-600'
};

const MySwal = Swal.mixin({
    customClass: swalTheme,
    buttonsStyling: false,
    confirmButtonText: 'OK'
});

// --- Toast Configuration (Updated: Reverted to Standard Small Size) ---
const Toast = Swal.mixin({
    toast: true,
    position: 'top-end',
    showConfirmButton: false,
    timer: 2000,
    timerProgressBar: true,
    didOpen: (toast) => {
        toast.addEventListener('mouseenter', Swal.stopTimer);
        toast.addEventListener('mouseleave', Swal.resumeTimer);
    }
});

// Action Styles Configuration
const actionStyles = {
    'Sticker': { bg: 'bg-orange-50', text: 'text-orange-600', border: 'border-orange-200', label: 'Sticker', icon: 'fa-tags' },
    'Transfer': { bg: 'bg-blue-50', text: 'text-blue-600', border: 'border-blue-200', label: 'ส่งต่อ', icon: 'fa-share-from-square' },
    'Separate': { bg: 'bg-red-50', text: 'text-red-600', border: 'border-red-200', label: 'แยกเก็บ', icon: 'fa-box-open' },
    'ContactWH': { bg: 'bg-teal-50', text: 'text-teal-600', border: 'border-teal-200', label: 'ติดต่อคลัง', icon: 'fa-phone-volume' },
    'ReturnWH': { bg: 'bg-green-50', text: 'text-green-600', border: 'border-green-200', label: 'คืนคลัง', icon: 'fa-truck-ramp-box' },
    'UsedUp': { bg: 'bg-lime-50', text: 'text-lime-700', border: 'border-lime-200', label: 'ใช้หมดแล้ว', icon: 'fa-check-double' },
    'Destroy': { bg: 'bg-slate-700', text: 'text-white', border: 'border-slate-600', label: 'ทำลาย', icon: 'fa-fire' },
    'Other': { bg: 'bg-gray-50', text: 'text-gray-600', border: 'border-gray-200', label: 'อื่นๆ', icon: 'fa-ellipsis' }
};

async function callAPI(action, payload = null) {
    try {
        if (!payload) {
            const response = await fetch(`${GAS_URL}?action=${action}`, { method: 'GET', redirect: "follow" });
            const data = await response.json();
            if (data.error) throw new Error(data.error);
            return data;
        } else {
            const response = await fetch(GAS_URL, {
                method: 'POST', redirect: "follow",
                body: JSON.stringify({ action: action, payload: payload }),
                headers: { "Content-Type": "text/plain;charset=utf-8" }
            });
            const data = await response.json();
            if (!data.success && data.message) throw new Error(data.message);
            return data;
        }
    } catch (error) { throw new Error(error.toString()); }
}

function initApp() {
    const today = new Date();
    document.getElementById('entryDate').value = today.toISOString().split('T')[0];
    document.getElementById('expiryDateInput').min = today.toISOString().split('T')[0];
    updateViewModeButtons();
    updateNotificationButtonState();

    refreshData();

    const mainContainer = document.getElementById('mainContainer');
    const backBtn = document.getElementById('backToTop');
    mainContainer.addEventListener('scroll', () => {
        if (mainContainer.scrollTop > 300) { backBtn.classList.add('show'); } else { backBtn.classList.remove('show'); }
    });
    document.addEventListener('click', (event) => {
        if (!drugInput.contains(event.target) && !drugListEl.contains(event.target)) {
            drugListEl.classList.add('hidden');
        }
    });
}

window.addEventListener('DOMContentLoaded', initApp);

function onFail(err) {
    document.getElementById('overlay').classList.add('hidden');
    MySwal.fire({ 
        title: 'Connection Failed', 
        text: err.message || 'Something went wrong', 
        icon: 'error',
        confirmButtonColor: '#ef4444' 
    });
}

function scrollToTop() { document.getElementById('mainContainer').scrollTo({ top: 0, behavior: 'smooth' }); }

function switchTab(tab) {
    const btnEntry = document.getElementById('tab-entry');
    const btnReport = document.getElementById('tab-report');
    const viewEntry = document.getElementById('view-entry');
    const viewReport = document.getElementById('view-report');

    btnEntry.classList.remove('active');
    btnReport.classList.remove('active');

    if (tab === 'entry') {
        btnEntry.classList.add('active');
        viewEntry.classList.remove('hidden'); viewReport.classList.add('hidden');
    } else {
        btnReport.classList.add('active');
        viewEntry.classList.add('hidden'); viewReport.classList.remove('hidden');

        if (!isReportLoaded) {
            loadReport();
        }
    }
    scrollToTop();
}

function setViewMode(mode) {
    currentViewMode = mode;
    currentPage = 1;
    updateViewModeButtons();
    renderReport();
}

function updateViewModeButtons() {
    const itemBtn = document.getElementById('viewMode-items');
    const groupedBtn = document.getElementById('viewMode-grouped');
    if (!itemBtn || !groupedBtn) return;

    const activeClasses = ['bg-white', 'text-slate-700', 'shadow-sm'];
    const inactiveClasses = ['text-slate-500'];

    [itemBtn, groupedBtn].forEach((btn) => {
        btn.classList.remove(...activeClasses);
        btn.classList.add(...inactiveClasses);
    });

    const activeButton = modeToButton(currentViewMode);
    activeButton.classList.add(...activeClasses);
    activeButton.classList.remove(...inactiveClasses);
}

function modeToButton(mode) {
    return document.getElementById(mode === 'grouped' ? 'viewMode-grouped' : 'viewMode-items');
}

function setDashboardFilter(filterKey) {
    currentDashboardFilter = filterKey;
    const filterTimeEl = document.getElementById('filterTime');
    if (filterTimeEl && filterKey !== 'all') {
        filterTimeEl.value = 'all';
        document.getElementById('customDateContainer').classList.add('hidden');
    }
    currentPage = 1;
    renderReport();
}

function adjustQty(amount) {
    const input = document.getElementById('qtyInput');
    let val = parseInt(input.value) || 0; val += amount; if(val < 0) val = 0; input.value = val;
}

function adjustManageQty(amount) {
    const input = document.getElementById('manageQty');
    let val = parseInt(input.value, 10) || 0;
    val += amount;
    if (val < 0) val = 0;
    if (val > currentManageMaxQty) val = currentManageMaxQty;
    input.value = val;
}

const drugInput = document.getElementById('drugSearch');
const drugListEl = document.getElementById('drugList');

function refreshData() {
    const btn = document.getElementById('btnRefresh');
    const icon = document.getElementById('iconRefresh');
    const searchInput = document.getElementById('drugSearch');

    icon.classList.add('fa-spin');
    searchInput.placeholder = "Downloading database...";
    searchInput.disabled = true; 
    
    callAPI('getDrugList').then(data => { 
        drugDatabase = data; 
        
        icon.classList.remove('fa-spin');
        searchInput.disabled = false;
        searchInput.value = "";
        searchInput.classList.remove('bg-white/80');
        searchInput.classList.add('bg-white');
        searchInput.placeholder = "🔍 Search Drug...";
        
    }).catch(err => {
        onFail(err);
        icon.classList.remove('fa-spin');
        searchInput.placeholder = "❌ Error. Try again.";
    });
}

function renderDrugDropdown(query) {
    drugListEl.innerHTML = '';
    const val = query ? query.toLowerCase().trim() : "";

    if (!val) {
        drugListEl.classList.add('hidden');
        return;
    }

    const matches = drugDatabase.filter(d => d.displayName.toLowerCase().includes(val)).slice(0, 10);

    if (matches.length > 0) {
        drugListEl.classList.remove('hidden');
        matches.forEach(item => {
            const li = document.createElement('li');
            li.className = "p-4 hover:bg-blue-50 cursor-pointer border-b border-slate-100 last:border-0 text-lg text-slate-700 transition-colors flex items-center gap-2";
            li.innerHTML = `<i class="fa-solid fa-pills text-blue-300"></i> ${item.displayName}`;
            li.onclick = () => selectDrug(item);
            drugListEl.appendChild(li);
        });
    } else { 
        drugListEl.classList.add('hidden');
    }
}

drugInput.addEventListener('input', function() {
    const val = this.value;
    if (val) { document.getElementById('clearSearchBtn').classList.remove('hidden'); } 
    else { document.getElementById('clearSearchBtn').classList.add('hidden'); }
    renderDrugDropdown(val);
});

function selectDrug(item) {
    drugInput.value = item.drugName;
    document.getElementById('generic').value = item.generic;
    document.getElementById('unit').value = item.unit;
    document.getElementById('strength').value = item.strength;
    document.getElementById('unitDisplay').textContent = item.unit || "Unit";
    drugListEl.classList.add('hidden');
}

function clearDrugSearch() {
    const input = document.getElementById('drugSearch');
    input.value = ''; input.focus();
    renderDrugDropdown(""); 
    document.getElementById('clearSearchBtn').classList.add('hidden');
    document.getElementById('generic').value = '';
    document.getElementById('unit').value = '';
    document.getElementById('strength').value = '';
    document.getElementById('unitDisplay').textContent = 'Unit';
}

function toggleSubDetails(action) {
    const container = document.getElementById('dynamicArea');
    const inputTransfer = document.getElementById('inputTransfer');
    const subNote = document.getElementById('subNote');
    const otherStockOutWrap = document.getElementById('otherStockOutWrap');
    const otherStockOut = document.getElementById('otherStockOut');
    container.classList.remove('hidden'); 
    if (action === 'Transfer') { inputTransfer.classList.remove('hidden'); inputTransfer.required = true; } else { inputTransfer.classList.add('hidden'); inputTransfer.required = false; }
    if (action === 'Other') { otherStockOutWrap.classList.remove('hidden'); } else { otherStockOutWrap.classList.add('hidden'); otherStockOut.checked = false; }
    
    if (['Other', 'ContactWH', 'ReturnWH', 'Destroy'].includes(action)) { 
        subNote.required = true; 
        subNote.placeholder = "Note (Required)..."; 
        subNote.classList.add('border-blue-300', 'ring-1', 'ring-blue-200'); 
    } else { 
        subNote.required = false; 
        subNote.placeholder = "Note (Optional)..."; 
        subNote.classList.remove('border-blue-300', 'ring-1', 'ring-blue-200'); 
    }
}

function modalToggleSubDetails(action) {
    const container = document.getElementById('modalDynamicArea');
    const inputTransfer = document.getElementById('modalTransfer');
    const subNote = document.getElementById('modalSubNote');
    const otherStockOutWrap = document.getElementById('modalOtherStockOutWrap');
    const otherStockOut = document.getElementById('modalOtherStockOut');
    container.classList.remove('hidden');
    if (action === 'Transfer') { inputTransfer.classList.remove('hidden'); inputTransfer.required = true; } else { inputTransfer.classList.add('hidden'); inputTransfer.required = false; }
    if (action === 'Other') { otherStockOutWrap.classList.remove('hidden'); } else { otherStockOutWrap.classList.add('hidden'); otherStockOut.checked = false; }
    
    if (['Other', 'ContactWH', 'ReturnWH', 'Destroy'].includes(action)) { 
        subNote.required = true; 
        subNote.placeholder = "Note (Required)..."; 
        subNote.classList.add('border-blue-300', 'ring-1', 'ring-blue-200'); 
    } else { 
        subNote.required = false; 
        subNote.placeholder = "Note (Optional)..."; 
        subNote.classList.remove('border-blue-300', 'ring-1', 'ring-blue-200'); 
    }
}

function toggleCustomDate() {
    const val = document.getElementById('filterTime').value;
    const container = document.getElementById('customDateContainer');
    if (val === 'custom') { container.classList.remove('hidden'); } else { container.classList.add('hidden'); renderReport(); }
}

function handleFormSubmit(e) {
    e.preventDefault();
    const actionEl = document.querySelector('input[name="actionType"]:checked');
    const action = actionEl ? actionEl.value : "";
    const note = document.getElementById('subNote').value.trim();
    const drugName = document.getElementById('drugSearch').value.trim();
    const qty = parseInt(document.getElementById('qtyInput').value, 10);
    const expiryDate = document.getElementById('expiryDateInput').value;
    const transferValue = document.getElementById('inputTransfer').value;

    if (!drugName) {
        MySwal.fire({ icon: 'warning', title: 'Missing Drug', text: 'Please select a drug from the list.' });
        return;
    }
    if (!qty || qty <= 0) {
        MySwal.fire({ icon: 'warning', title: 'Invalid Quantity', text: 'Quantity must be greater than 0.' });
        return;
    }
    if (!expiryDate) {
        MySwal.fire({ icon: 'warning', title: 'Missing Expiry Date', text: 'Please select an expiry date.' });
        return;
    }
    if (!action) {
        MySwal.fire({ icon: 'warning', title: 'Missing Action', text: 'Please select a management action.' });
        return;
    }
    if (action === 'Transfer' && !transferValue) {
        MySwal.fire({ icon: 'warning', title: 'Missing Destination', text: 'Please select a transfer destination.' });
        return;
    }
    if (['Other', 'ContactWH', 'ReturnWH', 'Destroy'].includes(action) && !note) { 
        MySwal.fire({ icon: 'warning', title: 'Missing Info', text: 'Please provide a note.' }); 
        return; 
    }
    MySwal.fire({ 
        title: 'Save Entry?', 
        text: "Please check details", 
        icon: 'question', 
        showCancelButton: true, 
        confirmButtonText: 'Yes, Save' 
    }).then((result) => { if (result.isConfirmed) { submitDataToServer(); } });
}

function submitDataToServer() {
    const action = document.querySelector('input[name="actionType"]:checked').value;
    let subVal = action === 'Transfer' ? document.getElementById('inputTransfer').value : "";
    if (action === 'Other') subVal = document.getElementById('otherStockOut').checked ? OTHER_STOCK_OUT_TOKEN : "";
    const noteVal = document.getElementById('subNote').value.trim();
    const formData = { entryDate: document.getElementById('entryDate').value, drugName: document.getElementById('drugSearch').value, generic: document.getElementById('generic').value, strength: document.getElementById('strength').value, unit: document.getElementById('unit').value, qty: document.getElementById('qtyInput').value, expiryDate: document.getElementById('expiryDateInput').value, actionType: action, subDetails: subVal, notes: noteVal };
    document.getElementById('overlay').classList.remove('hidden');
    
    callAPI('saveData', formData).then(res => { 
        document.getElementById('overlay').classList.add('hidden'); 
        if(res.success) { 
            MySwal.fire({ icon: 'success', title: 'Saved!', timer: 1500, showConfirmButton: false }); 
            document.getElementById('expiryForm').reset(); 
            document.getElementById('entryDate').value = new Date().toISOString().split('T')[0];
            document.getElementById('expiryDateInput').min = new Date().toISOString().split('T')[0];
            document.getElementById('qtyInput').value = ""; 
            document.getElementById('dynamicArea').classList.add('hidden'); 
            document.querySelectorAll('.action-card').forEach(el => el.style = ""); 
            document.getElementById('inputTransfer').value = "";
            document.getElementById('subNote').value = "";
            document.getElementById('otherStockOut').checked = false;
            document.getElementById('otherStockOutWrap').classList.add('hidden');
            clearDrugSearch(); 
            scrollToTop();
            isReportLoaded = false; 
        } else { 
            MySwal.fire('Error', res.message, 'error'); 
        } 
    }).catch(err => onFail(err));
}

function forceRefreshReport() {
    const btn = document.getElementById('btnReportRefresh');
    const icon = btn.querySelector('i');
    
    icon.classList.add('fa-spin');
    btn.disabled = true;
    btn.classList.add('opacity-75');

    loadReport().then(() => {
        icon.classList.remove('fa-spin');
        btn.disabled = false;
        btn.classList.remove('opacity-75');
        Toast.fire({ icon: 'success', title: 'List Updated' });
    }).catch(() => {
        icon.classList.remove('fa-spin');
        btn.disabled = false;
        btn.classList.remove('opacity-75');
    });
}

function loadReport() {
    currentPage = 1;
    document.getElementById('reportList').innerHTML = '<div class="col-span-full flex flex-col items-center justify-center text-slate-400 min-h-[60vh]"><div class="custom-loader mb-4"></div>Loading Data...</div>';
    
    return callAPI('getReportData').then(data => { 
        reportData = data; 
        isReportLoaded = true; 
        renderReport(); 
    }).catch(err => onFail(err));
}

function renderReport() {
    const container = document.getElementById('reportList');
    const paginationControls = document.getElementById('paginationControls');
    const filterTime = document.getElementById('filterTime').value;
    const filterAction = document.getElementById('filterAction').value;
    const sortMode = document.getElementById('sortMode') ? document.getElementById('sortMode').value : 'expiry';
    let customMaxDays = null;
    if (filterTime === 'custom') {
        const num = parseInt(document.getElementById('customNumber').value) || 0;
        const unit = document.getElementById('customUnit').value;
        if (num > 0) customMaxDays = unit === 'months' ? num * 30 : num;
    }
    container.innerHTML = '';
    if (!reportData || reportData.length === 0) {
        renderDashboard([]);
        updateReportInsight([]);
        currentFilteredItems = [];
        currentRenderedRows = [];
        container.innerHTML = '<div class="col-span-full text-center text-slate-400 mt-10 font-light text-lg">No data found.</div>';
        paginationControls.classList.add('hidden');
        return;
    }
    const today = new Date();
    const processedBase = reportData.map(item => {
        const exp = new Date(item.expiryDate);
        const diffTime = exp - today;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return {
            ...item,
            diffDays,
            expObj: exp,
            stockKey: getDrugKey(item),
            isStockExcluded: isStockExcludedAction(item.action, item)
        };
    });

    const remainingQtyMap = processedBase.reduce((acc, item) => {
        if (item.diffDays < 0 || item.isStockExcluded) return acc;
        acc[item.stockKey] = (acc[item.stockKey] || 0) + (parseInt(item.qty, 10) || 0);
        return acc;
    }, {});

    const processed = processedBase.map((item) => ({
        ...item,
        remainingQty: remainingQtyMap[item.stockKey] || 0
    }));

    const activeItems = processed.filter(item => item.diffDays >= 0);
    const actionFilteredItems = activeItems.filter(item => {
        const matchAction = filterAction === 'all'
            ? !item.isStockExcluded
            : item.action === filterAction;
        return matchAction;
    });
    let filtered = actionFilteredItems.filter(item => {
        if (filterTime === 'all') return true;
        if (filterTime === 'custom') return customMaxDays !== null ? item.diffDays <= customMaxDays : true;
        return item.diffDays <= parseInt(filterTime, 10);
    });

    filtered = applyDashboardFilter(filtered);

    currentFilteredItems = applySort(filtered, sortMode);
    renderDashboard(actionFilteredItems);
    updateReportInsight(actionFilteredItems);
    maybeSendExpiryNotification(activeItems.filter((item) => !item.isStockExcluded));

    if (currentViewMode === 'grouped') {
        currentRenderedRows = applySort(buildGroupedRows(currentFilteredItems), sortMode);
    } else {
        currentRenderedRows = currentFilteredItems;
    }

    if (currentRenderedRows.length === 0) {
        container.innerHTML = '<div class="col-span-full text-center text-slate-400 mt-10 font-light text-lg">No items match filter.</div>';
        paginationControls.classList.add('hidden');
        return;
    }

    filteredDataCache = currentRenderedRows;
    currentPage = 1;
    renderPage(currentPage);
}

function renderPage(page) {
    const container = document.getElementById('reportList');
    container.innerHTML = '';
    const start = (page - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    const pagedItems = filteredDataCache.slice(start, end);
    const totalPages = Math.ceil(filteredDataCache.length / itemsPerPage);

    pagedItems.forEach(item => {
        container.innerHTML += currentViewMode === 'grouped' ? createGroupedCard(item) : createItemCard(item);
    });
    document.getElementById('paginationControls').classList.remove('hidden');
    document.getElementById('pageIndicator').textContent = `Page ${currentPage} of ${totalPages}`;
    document.getElementById('btnPrev').disabled = (currentPage === 1);
    document.getElementById('btnNext').disabled = (currentPage === totalPages);
}

function createItemCard(item) {
    const status = getExpiryStyles(item.diffDays);
    let dateStr = item.expiryDate;
    try { dateStr = item.expObj.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' }); } catch(e) {}
    const style = actionStyles[item.action] || actionStyles['Other'];
    let actionLabel = `<i class="fa-solid ${style.icon} mr-1"></i> ${style.label}`;
    if (item.action === 'Transfer' && item.subDetails) {
        actionLabel += ` <i class="fa-solid fa-arrow-right text-sm mx-1 text-slate-400"></i> ${item.subDetails}`;
    }

    const itemStr = encodeURIComponent(JSON.stringify(item));
    const noteText = item.notes && item.notes.trim() !== "" ? item.notes : "-";

    return `<div onclick="openManageModal('${itemStr}')" class="relative cursor-pointer bg-white p-4 rounded-2xl shadow-sm border border-slate-100 border-l-[4px] ${status.borderStatus} hover:shadow-lg hover:shadow-blue-100 hover:-translate-y-1 transition-all duration-300 group fade-in">
        <div class="absolute top-3 right-3">
            <span class="px-3 py-1.5 text-sm font-bold rounded-lg ${style.bg} ${style.text} border ${style.border} shadow-sm flex items-center">${actionLabel}</span>
        </div>
        <div class="pr-32">
            <h3 class="font-bold text-slate-800 text-xl truncate mb-1 group-hover:text-blue-600 transition-colors">${item.drugName}</h3>
            <p class="text-base text-slate-400 mb-2 font-medium pl-0.5">${item.strength || '-'}</p>
            <div class="flex flex-wrap items-center gap-2 mb-3">
                <div class="bg-slate-50 px-3 py-1 rounded-md border border-slate-200 text-base shadow-sm">Qty: <b class="text-slate-800">${item.remainingQty}</b> <span class="text-slate-400 text-sm">${item.unit}</span></div>
                <div class="px-3 py-1 rounded-md border text-base font-bold shadow-sm flex items-center gap-1 ${status.expBg} ${status.textExp}"><i class="fa-regular fa-calendar-xmark text-sm opacity-70"></i> ${dateStr} <span class="font-normal opacity-80 text-sm">(${item.diffDays}d)</span></div>
            </div>
            <div class="pt-2 border-t border-slate-100 text-xs text-slate-500 truncate flex items-center">
               <i class="fa-solid fa-note-sticky text-amber-400 mr-1.5 text-sm"></i> Note: <span class="ml-1 font-medium text-slate-600">${noteText}</span>
            </div>
        </div>
    </div>`;
}

function createGroupedCard(group) {
    const status = getExpiryStyles(group.nearestDiffDays);
    const lotHtml = group.items.slice(0, 4).map((item) => {
        const itemStr = encodeURIComponent(JSON.stringify(item));
        return `<button type="button" onclick="event.stopPropagation(); openManageModal('${itemStr}')" class="px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-left hover:bg-blue-50 hover:border-blue-200 transition-colors">
            <div class="text-sm font-bold text-slate-700">${item.qty} ${item.unit || ''}</div>
            <div class="text-xs text-slate-500">${item.expiryDate} (${item.diffDays}d)</div>
        </button>`;
    }).join('');
    const remainingLots = group.items.length > 4 ? `<div class="px-3 py-2 rounded-xl border border-dashed border-slate-200 text-xs font-bold text-slate-400 flex items-center justify-center">+${group.items.length - 4} more lots</div>` : '';

    return `<div class="bg-white rounded-3xl border border-slate-100 border-l-[4px] ${status.borderStatus} shadow-sm p-5 hover:shadow-lg transition-all duration-300 fade-in">
        <div class="flex items-start justify-between gap-4">
            <div>
                <p class="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">Grouped Drug View</p>
                <h3 class="text-xl font-bold text-slate-800">${group.drugName}</h3>
                <p class="text-sm text-slate-500">${group.strength || '-'} • ${group.inRoomLots} lots in room • Qty ${group.remainingQty} ${group.unit || ''}</p>
            </div>
            <div class="flex flex-col items-end gap-2">
                <button type="button" onclick="openHistoryModal('${encodeURIComponent(group.drugName)}')"
                    class="px-3 py-1.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-700 text-xs font-bold hover:bg-amber-100 transition-colors">
                    <i class="fa-solid fa-clock-rotate-left mr-1"></i>History
                </button>
            </div>
        </div>
        <div class="mt-4 grid grid-cols-2 gap-3">
            <div class="rounded-2xl border ${status.expBg} ${status.textExp} px-4 py-3">
                <p class="text-[11px] uppercase font-bold opacity-70">Nearest Expiry</p>
                <p class="text-lg font-extrabold">${group.nearestExpiryDate}</p>
                <p class="text-xs opacity-80">${group.nearestDiffDays} days remaining</p>
            </div>
            <div class="rounded-2xl border bg-slate-50 border-slate-200 px-4 py-3 text-slate-700">
                <p class="text-[11px] uppercase font-bold text-slate-400">Action Mix</p>
                <p class="text-sm font-bold">${group.actionsSummary}</p>
                <p class="text-xs text-slate-500">${group.recommendation}</p>
            </div>
        </div>
        <div class="mt-4">
            <p class="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Lots</p>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
                ${lotHtml}
                ${remainingLots}
            </div>
        </div>
    </div>`;
}

function getExpiryStyles(diffDays) {
    let borderStatus = "border-l-green-500";
    let textExp = "text-green-600";
    let expBg = "bg-green-50 border-green-100";

    if (diffDays <= 30) {
        borderStatus = "border-l-red-500";
        textExp = "text-red-600";
        expBg = "bg-red-50 border-red-100";
    } else if (diffDays <= 90) {
        borderStatus = "border-l-orange-400";
        textExp = "text-orange-600";
        expBg = "bg-orange-50 border-orange-100";
    }

    return { borderStatus, textExp, expBg };
}

function applySort(items, sortMode) {
    const copy = [...items];
    copy.sort((a, b) => {
        if (sortMode === 'name') return String(a.drugName || '').localeCompare(String(b.drugName || ''));
        if (sortMode === 'qty') return (parseInt(b.remainingQty || b.totalQty || b.qty, 10) || 0) - (parseInt(a.remainingQty || a.totalQty || a.qty, 10) || 0);
        if (sortMode === 'expiry') return (a.nearestDiffDays ?? a.diffDays) - (b.nearestDiffDays ?? b.diffDays);
        return (a.nearestDiffDays ?? a.diffDays) - (b.nearestDiffDays ?? b.diffDays);
    });
    return copy;
}

function buildGroupedRows(items) {
    const grouped = {};
    items.forEach((item) => {
        const key = [item.drugName, item.strength, item.unit].join('||');
        if (!grouped[key]) {
            grouped[key] = {
                key,
                drugName: item.drugName,
                strength: item.strength,
                unit: item.unit,
                totalQty: 0,
                remainingQty: item.remainingQty || 0,
                nearestDiffDays: item.diffDays,
                nearestExpiryDate: item.expiryDate,
                items: [],
                actionMap: {},
                inRoomLots: 0
            };
        }
        grouped[key].items.push(item);
        grouped[key].totalQty += parseInt(item.qty, 10) || 0;
        if (!item.isStockExcluded) grouped[key].inRoomLots += 1;
        grouped[key].actionMap[item.action] = (grouped[key].actionMap[item.action] || 0) + 1;
        if (item.diffDays < grouped[key].nearestDiffDays) {
            grouped[key].nearestDiffDays = item.diffDays;
            grouped[key].nearestExpiryDate = item.expiryDate;
        }
    });

    return Object.values(grouped).map((group) => {
        group.items = applySort(group.items, 'expiry');
        group.actionsSummary = Object.entries(group.actionMap).map(([action, count]) => `${actionStyles[action]?.label || action}: ${count}`).join(' • ');
        group.recommendation = group.nearestDiffDays <= 30 ? 'Action this batch first' : (group.nearestDiffDays <= 60 ? 'Prepare transfer / sticker plan' : 'Monitor and review regularly');
        return group;
    });
}

function applyDashboardFilter(items) {
    if (currentDashboardFilter === 'all') return items;
    return items.filter((item) => matchesDashboardFilter(item, currentDashboardFilter));
}

function matchesDashboardFilter(item, filterKey) {
    if (filterKey === 'urgent') return item.diffDays >= 0 && item.diffDays <= 30;
    if (filterKey === 'soon') return item.diffDays >= 31 && item.diffDays <= 60;
    if (filterKey === 'watch') return item.diffDays >= 61 && item.diffDays <= 90;
    if (filterKey === 'later') return item.diffDays > 90;
    return true;
}

function countUniqueDrugs(items) {
    return new Set(items.map((item) => `${item.drugName}||${item.strength || ''}`)).size;
}

function getDrugKey(item) {
    return `${item.drugName || ''}||${item.strength || ''}||${item.unit || ''}`;
}

function isStockExcludedAction(action, item = null) {
    return stockExclusionActions.includes(action) || (action === 'Other' && hasOtherStockOut(item?.subDetails));
}

function hasOtherStockOut(subDetails) {
    return String(subDetails || '').includes(OTHER_STOCK_OUT_TOKEN);
}

function sanitizeSubDetails(subDetails) {
    return String(subDetails || '').replace(OTHER_STOCK_OUT_TOKEN, '').trim();
}

function renderDashboard(items) {
    const dashboard = document.getElementById('reportDashboard');
    if (!dashboard) return;

    const cards = [
        { key: 'urgent', label: '0-30 Days', tone: 'from-red-500 to-rose-500', icon: 'fa-triangle-exclamation', detail: 'Urgent batch' },
        { key: 'soon', label: '31-60 Days', tone: 'from-orange-400 to-amber-400', icon: 'fa-hourglass-half', detail: 'Prepare action' },
        { key: 'watch', label: '61-90 Days', tone: 'from-blue-500 to-cyan-500', icon: 'fa-bell', detail: 'Watch list' },
        { key: 'all', label: 'All Active', tone: 'from-slate-700 to-slate-500', icon: 'fa-capsules', detail: 'All non-expired lots' }
    ];

    dashboard.innerHTML = cards.map((card) => {
        const scopedItems = card.key === 'all' ? items : items.filter((item) => matchesDashboardFilter(item, card.key));
        const activeRing = currentDashboardFilter === card.key ? 'ring-4 ring-offset-2 ring-blue-200 scale-[1.02]' : 'hover:scale-[1.01]';
        return `<button type="button" onclick="setDashboardFilter('${card.key}')" class="w-full text-left rounded-3xl bg-gradient-to-br ${card.tone} text-white p-5 shadow-lg shadow-slate-200/60 transition-all duration-300 ${activeRing}">
        <div class="flex items-start justify-between gap-4">
            <div class="min-w-0">
                <p class="text-xs font-bold uppercase tracking-wider text-white/75">${card.label}</p>
                <div class="mt-3 grid grid-cols-2 gap-3">
                    <div class="rounded-2xl bg-white/12 px-3 py-2">
                        <p class="text-[11px] font-bold uppercase tracking-wider text-white/70">Items</p>
                        <p class="text-2xl sm:text-3xl font-extrabold mt-1">${scopedItems.length}</p>
                    </div>
                    <div class="rounded-2xl bg-white/12 px-3 py-2">
                        <p class="text-[11px] font-bold uppercase tracking-wider text-white/70">Drugs</p>
                        <p class="text-2xl sm:text-3xl font-extrabold mt-1">${countUniqueDrugs(scopedItems)}</p>
                    </div>
                </div>
                <p class="text-sm text-white/80 mt-3">${card.detail}</p>
            </div>
            <div class="w-12 h-12 rounded-2xl bg-white/15 flex items-center justify-center shrink-0">
                <i class="fa-solid ${card.icon} text-xl"></i>
            </div>
        </div>
    </button>`;
    }).join('');
}

function updateReportInsight(items) {
    const insightText = document.getElementById('reportInsightText');
    if (!insightText) return;
    if (!items.length) {
        insightText.textContent = 'No active items match this filter.';
        return;
    }

    const visibleItems = applyDashboardFilter(items);
    if (!visibleItems.length) {
        insightText.textContent = 'No items match the selected dashboard category.';
        return;
    }

    const top = applySort(visibleItems, 'expiry')[0];
    const groupedCount = buildGroupedRows(visibleItems).length;
    const uniqueDrugCount = countUniqueDrugs(visibleItems);
    insightText.textContent = `${top.drugName} expires soonest in ${top.diffDays} days. ${visibleItems.length} items across ${uniqueDrugCount} drugs (${groupedCount} grouped views) are in this category.`;
}

function requestNotificationPermission() {
    if (!('Notification' in window)) {
        MySwal.fire({ icon: 'info', title: 'Notifications Unavailable', text: 'This browser does not support notifications.' });
        return;
    }

    Notification.requestPermission().then(() => {
        updateNotificationButtonState();
        maybeSendExpiryNotification(currentFilteredItems);
    });
}

function updateNotificationButtonState() {
    const button = document.getElementById('btnEnableAlerts');
    if (!button) return;
    if (!('Notification' in window)) {
        button.disabled = true;
        button.classList.add('opacity-50');
        button.innerHTML = '<i class="fa-regular fa-bell-slash"></i> Alerts Unsupported';
        return;
    }

    if (Notification.permission === 'granted') {
        button.innerHTML = '<i class="fa-solid fa-bell"></i> Alerts Enabled';
    } else if (Notification.permission === 'denied') {
        button.innerHTML = '<i class="fa-regular fa-bell-slash"></i> Alerts Blocked';
    } else {
        button.innerHTML = '<i class="fa-regular fa-bell"></i> Enable Alerts';
    }
}

function maybeSendExpiryNotification(items) {
    if (!('Notification' in window) || Notification.permission !== 'granted') return;
    const urgentCount = items.filter((item) => item.diffDays <= dailyAlertWindow).length;
    if (!urgentCount) return;

    const todayKey = new Date().toISOString().split('T')[0];
    const storageKey = `exp-alert-${todayKey}`;
    const previousValue = localStorage.getItem(storageKey);
    const payload = String(urgentCount);
    if (previousValue === payload) return;

    localStorage.setItem(storageKey, payload);
    const topItem = applySort(items.filter((item) => item.diffDays <= dailyAlertWindow), 'expiry')[0];
    new Notification('Expiry Alert', {
        body: `${urgentCount} lot(s) expire within ${dailyAlertWindow} days. Top priority: ${topItem.drugName}.`,
        icon: 'icons/icon-192.png'
    });
}

function exportCurrentView() {
    if (!currentRenderedRows.length) {
        MySwal.fire({ icon: 'info', title: 'Nothing to Export', text: 'There is no visible data to export right now.' });
        return;
    }

    const rows = currentViewMode === 'grouped'
        ? currentRenderedRows.map((row) => ({
            drugName: row.drugName,
            strength: row.strength,
            unit: row.unit,
            totalQty: row.totalQty,
            nearestExpiryDate: row.nearestExpiryDate,
            nearestDiffDays: row.nearestDiffDays,
            lots: row.items.length,
            actions: row.actionsSummary
        }))
        : currentRenderedRows.map((row) => ({
            drugName: row.drugName,
            strength: row.strength,
            qty: row.qty,
            unit: row.unit,
            expiryDate: row.expiryDate,
            diffDays: row.diffDays,
            action: row.action,
            subDetails: row.subDetails,
            notes: row.notes
        }));

    const headers = Object.keys(rows[0]);
    const csvLines = [
        headers.join(','),
        ...rows.map((row) => headers.map((header) => csvEscape(row[header])).join(','))
    ];
    const blob = new Blob([csvLines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `expiry-report-${currentViewMode}-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
}

function csvEscape(value) {
    const stringValue = value === undefined || value === null ? '' : String(value);
    return `"${stringValue.replace(/"/g, '""')}"`;
}

function prevPage() { if (currentPage > 1) { currentPage--; renderPage(currentPage); scrollToTop(); } }
function nextPage() { const totalPages = Math.ceil(filteredDataCache.length / itemsPerPage); if (currentPage < totalPages) { currentPage++; renderPage(currentPage); scrollToTop(); } }

function openManageModal(itemEncoded) {
    const item = JSON.parse(decodeURIComponent(itemEncoded));
    document.getElementById('manageRowIndex').value = item.rowIndex;
    document.getElementById('manageDrugName').textContent = item.drugName;
    document.getElementById('manageMaxQty').value = item.qty;
    document.getElementById('displayMaxQty').textContent = item.qty;
    document.getElementById('manageUnit').textContent = item.unit || 'Unit';
    currentManageMaxQty = parseInt(item.qty, 10) || 0;
    currentManageDrugName = item.drugName;
    
    if(document.getElementById('modalUnitTop')) {
        document.getElementById('modalUnitTop').textContent = item.unit || 'UNIT';
    }
    
    document.getElementById('manageOriginalAction').value = item.action;

    // --- Note Logic (Case Insensitive Check) ---
    const noteBox = document.getElementById('displayCurrentNoteBox');
    const noteText = document.getElementById('displayCurrentNote');
    
    const getVal = (obj, key) => obj[key] || obj[key.toLowerCase()] || obj[key.charAt(0).toUpperCase() + key.slice(1)] || "";
    
    const rawSub = getVal(item, 'subDetails');
    const rawNote = getVal(item, 'notes'); 
    const stockOutByOther = hasOtherStockOut(rawSub);

    let detailsToShow = [];
    if (stockOutByOther) { detailsToShow.push('[ตัด stock ออกจากห้องแล้ว]'); }
    const cleanSub = sanitizeSubDetails(rawSub);
    if (cleanSub && cleanSub.trim() !== "") { detailsToShow.push(`[${cleanSub}]`); }
    if (rawNote && rawNote.trim() !== "") { detailsToShow.push(rawNote); }
    
    const finalNote = detailsToShow.join(" ");

    noteText.textContent = finalNote || "No note saved for this lot.";
    noteBox.classList.remove('hidden');

    document.getElementById('manageQty').value = ''; 
    document.querySelectorAll('input[name="manageAction"]').forEach(el => el.checked = false);
    document.getElementById('modalDynamicArea').classList.add('hidden');
    document.querySelectorAll('.action-card').forEach(el => el.style = "");
    document.getElementById('modalTransfer').value = item.action === 'Transfer' ? cleanSub : "";
    document.getElementById('modalSubNote').value = rawNote || "";
    document.getElementById('modalOtherStockOut').checked = stockOutByOther;
    document.getElementById('modalOtherStockOutWrap').classList.toggle('hidden', item.action !== 'Other');
    document.getElementById('manageModal').classList.remove('hidden');
}

function closeManageModal() { document.getElementById('manageModal').classList.add('hidden'); }
function setAllQty() { document.getElementById('manageQty').value = document.getElementById('manageMaxQty').value; }

function editStockQty() {
   const currentQty = document.getElementById('displayMaxQty').textContent;
   const rowIndex = document.getElementById('manageRowIndex').value;
   
   MySwal.fire({
       title: '<span class="text-slate-800">Adjust Stock</span>',
       html: `
         <div class="mb-4">
            <p class="text-slate-400 text-sm font-bold uppercase tracking-wider mb-1">Current Amount</p>
            <p class="text-slate-600 text-xl font-semibold">${currentQty} <span class="text-xs text-slate-400">UNIT</span></p>
         </div>
       `,
       input: 'number',
       inputPlaceholder: 'New Qty',
       inputValue: currentQty,
       showCancelButton: true,
       confirmButtonText: 'Update Stock',
       cancelButtonText: 'Cancel',
       customClass: {
           ...swalTheme,
           input: 'w-1/2 mx-auto text-center text-4xl font-bold text-blue-600 bg-slate-50 border-2 border-slate-200 rounded-2xl focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none py-4 transition-all mb-6'
       },
       preConfirm: (newQty) => {
           if (newQty === '' || newQty === null || Number(newQty) < 0) Swal.showValidationMessage('Invalid quantity');
           return Number(newQty);
       }
   }).then((result) => {
       if (result.isConfirmed) {
           document.getElementById('overlay').classList.remove('hidden');
           callAPI('updateStockQuantity', { rowIndex: rowIndex, newQty: result.value }).then(res => {
               document.getElementById('overlay').classList.add('hidden');
               if(res.success) { MySwal.fire({ icon: 'success', title: 'Stock Updated', timer: 1000, showConfirmButton: false }); loadReport().then(() => isReportLoaded=true); }
               else { MySwal.fire('Error', res.message, 'error'); }
           }).catch(err => onFail(err));
       }
   });
}

function submitManagement() {
    const manageQty = document.getElementById('manageQty').value;
    const actionEl = document.querySelector('input[name="manageAction"]:checked');
    const originalAction = document.getElementById('manageOriginalAction').value;
    const selectedAction = actionEl ? actionEl.value : originalAction;
    const transferValue = document.getElementById('modalTransfer').value;

    if(!manageQty || parseInt(manageQty) <= 0) { MySwal.fire('Warning', 'Invalid Quantity', 'warning'); return; }
    if(parseInt(manageQty) > parseInt(document.getElementById('manageMaxQty').value)) { MySwal.fire('Warning', 'Exceed Stock', 'warning'); return; }
    if (actionEl && selectedAction === 'Transfer' && !transferValue) {
        MySwal.fire({ icon: 'warning', title: 'Missing Destination', text: 'Please select a transfer destination.' });
        return;
    }
    
    let actionToSubmit = originalAction;
    if (actionEl) {
        actionToSubmit = actionEl.value;
        const note = document.getElementById('modalSubNote').value.trim();
        
        if (['Other', 'ContactWH', 'ReturnWH', 'Destroy'].includes(actionToSubmit) && !note) {
            MySwal.fire({ icon: 'warning', title: 'Missing Info', text: 'Please provide a note.' });
            return;
        }
    }

    MySwal.fire({
        title: 'Confirm Update?', text: `Updating ${manageQty} items`, icon: 'warning',
        showCancelButton: true, confirmButtonText: 'Yes, Confirm',
    }).then((result) => { if (result.isConfirmed) { processManagement(manageQty, actionToSubmit, !!actionEl); } });
}

function processManagement(manageQty, action, actionSelected) {
    const rowIndex = document.getElementById('manageRowIndex').value;
    let subVal;
    if (!actionSelected) {
        subVal = undefined;
    } else if (action === 'Transfer') {
        subVal = document.getElementById('modalTransfer').value;
    } else if (action === 'Other') {
        subVal = document.getElementById('modalOtherStockOut').checked ? OTHER_STOCK_OUT_TOKEN : "";
    } else {
        subVal = "";
    }
    const noteVal = document.getElementById('modalSubNote').value.trim();

    closeManageModal();
    document.getElementById('overlay').classList.remove('hidden');
    
    callAPI('manageItem', { rowIndex: rowIndex, manageQty: manageQty, newAction: action, newDetails: subVal, newNotes: noteVal })
        .then(res => {
            document.getElementById('overlay').classList.add('hidden');
            if (res.success) { 
                MySwal.fire({ icon: 'success', title: 'Success', text: res.message, timer: 1500, showConfirmButton: false }); 
                loadReport().then(() => isReportLoaded=true); 
            }
            else { MySwal.fire('Error', res.message, 'error'); }
        })
        .catch(err => onFail(err));
}

function confirmDelete() {
    const rowIndex = document.getElementById('manageRowIndex').value;
    
    MySwal.fire({
        title: 'Delete Item?',
        html: `
            <p class="text-slate-500 text-sm mb-3">This action cannot be undone.</p>
            <div class="mb-3">
                <input type="password" id="deletePin" class="w-full p-3 rounded-xl border border-slate-200 outline-none text-center text-lg tracking-widest font-bold focus:border-red-400 focus:ring-2 focus:ring-red-100 transition-all" placeholder="Enter PIN" maxlength="4">
            </div>
            <textarea id="deleteNote" class="w-full p-3 rounded-xl border border-slate-200 focus:border-red-400 focus:ring-2 focus:ring-red-100 outline-none transition-all text-base text-slate-600" rows="2" placeholder="Reason for deletion (Optional)..."></textarea>
        `,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#ef4444',
        confirmButtonText: 'Verify & Delete',
        cancelButtonText: 'Cancel',
        didOpen: () => {
            const pinInput = document.getElementById('deletePin');
            if(pinInput) pinInput.focus();
        },
        preConfirm: () => {
            const pin = document.getElementById('deletePin').value;
            const note = document.getElementById('deleteNote').value;
            
            if (!pin) {
                Swal.showValidationMessage('Please enter PIN');
                return false;
            }
            
            if (pin !== '1234') {
                Swal.showValidationMessage('Incorrect PIN Code');
                return false;
            }
            
            return note;
        }
    }).then((result) => {
        if (result.isConfirmed) {
            const userNote = result.value || ""; 
            
            closeManageModal();
            document.getElementById('overlay').classList.remove('hidden');
            
            callAPI('deleteItem', { rowIndex: rowIndex, note: userNote }).then(res => {
                document.getElementById('overlay').classList.add('hidden');
                if(res.success) { 
                    MySwal.fire({ icon: 'success', title: 'Deleted', text: 'Item removed successfully', timer: 1500, showConfirmButton: false }); 
                    loadReport().then(() => isReportLoaded=true); 
                }
                else { MySwal.fire('Error', res.message, 'error'); }
            }).catch(err => onFail(err));
        }
    });
}

async function fetchActionHistory(drugName, limit = 20) {
    const normalizedName = (drugName || '').trim();
    if (!normalizedName) return [];
    const cacheKey = `${normalizedName}::${limit}`;
    if (historyCache[cacheKey]) return historyCache[cacheKey];

    const response = await fetch(`${GAS_URL}?action=getActionHistory&drugName=${encodeURIComponent(normalizedName)}&limit=${limit}`, { method: 'GET', redirect: 'follow' });
    const data = await response.json();
    if (data.error) throw new Error(data.error);
    historyCache[cacheKey] = data;
    return data;
}

async function openHistoryModal(drugName = null) {
    const targetDrugName = drugName ? decodeURIComponent(drugName) : currentManageDrugName;
    if (!targetDrugName) {
        MySwal.fire({ icon: 'info', title: 'No Drug Selected', text: 'Please open a drug item first.' });
        return;
    }

    document.getElementById('overlay').classList.remove('hidden');
    try {
        const history = await fetchActionHistory(targetDrugName, 30);
        document.getElementById('overlay').classList.add('hidden');

        const html = history.length
            ? `<div class="space-y-3 max-h-[50vh] overflow-y-auto pr-1 text-left">${history.map((entry) => `
                <div class="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div class="flex items-start justify-between gap-4">
                        <div>
                            <p class="text-sm font-bold text-slate-800">${entry.action}</p>
                            <p class="text-xs text-slate-400">${entry.timestamp}</p>
                        </div>
                        <span class="px-2.5 py-1 rounded-full bg-white border border-slate-200 text-xs font-bold text-slate-600">${entry.qty}</span>
                    </div>
                    <p class="mt-2 text-sm text-slate-600 break-words">${entry.details || '-'}</p>
                </div>`).join('')}</div>`
            : '<div class="text-slate-400 text-center py-6">No history found for this drug.</div>';

        MySwal.fire({
            title: `History: ${targetDrugName}`,
            html,
            width: 720,
            confirmButtonText: 'Close'
        });
    } catch (error) {
        onFail(error);
    }
}
