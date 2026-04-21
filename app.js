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
    confirmButtonText: 'ตกลง'
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
    'Sticker': { bg: 'bg-orange-50', text: 'text-orange-600', border: 'border-orange-200', label: 'ติด Sticker', icon: 'fa-tags' },
    'Transfer': { bg: 'bg-blue-50', text: 'text-blue-600', border: 'border-blue-200', label: 'ส่งต่อ', icon: 'fa-share-from-square' },
    'Separate': { bg: 'bg-red-50', text: 'text-red-600', border: 'border-red-200', label: 'แยกเก็บ', icon: 'fa-box-open' },
    'ContactWH': { bg: 'bg-teal-50', text: 'text-teal-600', border: 'border-teal-200', label: 'ติดต่อคลัง', icon: 'fa-phone-volume' },
    'ReturnWH': { bg: 'bg-green-50', text: 'text-green-600', border: 'border-green-200', label: 'คืนคลัง', icon: 'fa-truck-ramp-box' },
    'UsedUp': { bg: 'bg-lime-50', text: 'text-lime-700', border: 'border-lime-200', label: 'ใช้หมดแล้ว', icon: 'fa-check-double' },
    'Destroy': { bg: 'bg-slate-700', text: 'text-white', border: 'border-slate-600', label: 'ทำลาย', icon: 'fa-fire' },
    'Other': { bg: 'bg-gray-50', text: 'text-gray-600', border: 'border-gray-200', label: 'อื่นๆ', icon: 'fa-ellipsis' }
};

function renderStateCard({ icon, title, description, tone = 'slate' }) {
    const tones = {
        slate: {
            iconWrap: 'bg-slate-100 text-slate-600',
            border: 'border-slate-200',
            title: 'text-slate-800',
            description: 'text-slate-500'
        },
        brand: {
            iconWrap: 'bg-teal-50 text-teal-700',
            border: 'border-teal-100',
            title: 'text-slate-800',
            description: 'text-slate-500'
        },
        amber: {
            iconWrap: 'bg-amber-50 text-amber-700',
            border: 'border-amber-100',
            title: 'text-slate-800',
            description: 'text-slate-500'
        }
    };

    const palette = tones[tone] || tones.slate;
    return `<div class="col-span-full flex items-center justify-center py-6">
        <div class="section-card ${palette.border} w-full max-w-2xl px-8 py-10 text-center">
            <div class="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl ${palette.iconWrap}">
                <i class="fa-solid ${icon} text-2xl"></i>
            </div>
            <h3 class="mt-5 text-xl font-bold ${palette.title}">${title}</h3>
            <p class="mt-2 text-sm leading-relaxed ${palette.description}">${description}</p>
        </div>
    </div>`;
}

function formatDisplayDate(dateObj, fallback) {
    try {
        return dateObj.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' });
    } catch (error) {
        return fallback;
    }
}

function handleCardKeyActivate(event, callback) {
    if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        callback();
    }
}

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

    const backBtn = document.getElementById('backToTop');
    window.addEventListener('scroll', () => {
        if (window.scrollY > 300) { backBtn.classList.add('show'); } else { backBtn.classList.remove('show'); }
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
        title: 'เชื่อมต่อไม่สำเร็จ', 
        text: err.message || 'เกิดข้อผิดพลาดบางอย่าง', 
        icon: 'error',
        confirmButtonColor: '#ef4444' 
    });
}

function scrollToTop() { window.scrollTo({ top: 0, behavior: 'smooth' }); }

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

    const activeClasses = ['bg-white', 'text-slate-800', 'shadow-sm'];
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

    btn.disabled = true;
    icon.classList.add('fa-spin');
    searchInput.placeholder = "กำลังโหลดฐานข้อมูลยา...";
    searchInput.disabled = true; 
    
    callAPI('getDrugList').then(data => { 
        drugDatabase = data; 
        
        btn.disabled = false;
        icon.classList.remove('fa-spin');
        searchInput.disabled = false;
        searchInput.value = "";
        searchInput.placeholder = "ค้นหายา...";
        
    }).catch(err => {
        onFail(err);
        btn.disabled = false;
        icon.classList.remove('fa-spin');
        searchInput.placeholder = "โหลดฐานข้อมูลไม่สำเร็จ ลองอีกครั้ง";
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
            li.className = "flex cursor-pointer items-center gap-3 border-b border-slate-100 px-4 py-3 text-sm font-semibold text-slate-700 transition-colors hover:bg-teal-50 last:border-0";
            li.innerHTML = `<span class="flex h-9 w-9 items-center justify-center rounded-2xl bg-teal-50 text-teal-700"><i class="fa-solid fa-pills"></i></span><span class="min-w-0 flex-1 truncate">${item.displayName}</span>`;
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
    document.getElementById('unitDisplay').textContent = item.unit || "หน่วย";
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
    document.getElementById('unitDisplay').textContent = 'หน่วย';
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
        subNote.placeholder = "หมายเหตุ (จำเป็น)..."; 
        subNote.classList.add('border-blue-300', 'ring-1', 'ring-blue-200'); 
    } else { 
        subNote.required = false; 
        subNote.placeholder = "หมายเหตุ (ไม่บังคับ)..."; 
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
        subNote.placeholder = "หมายเหตุ (จำเป็น)..."; 
        subNote.classList.add('border-blue-300', 'ring-1', 'ring-blue-200'); 
    } else { 
        subNote.required = false; 
        subNote.placeholder = "หมายเหตุ (ไม่บังคับ)..."; 
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
        MySwal.fire({ icon: 'warning', title: 'ยังไม่ได้เลือกยา', text: 'กรุณาเลือกยาจากรายการค้นหา' });
        return;
    }
    if (!qty || qty <= 0) {
        MySwal.fire({ icon: 'warning', title: 'จำนวนไม่ถูกต้อง', text: 'จำนวนต้องมากกว่า 0' });
        return;
    }
    if (!expiryDate) {
        MySwal.fire({ icon: 'warning', title: 'ยังไม่ได้เลือกวันหมดอายุ', text: 'กรุณาเลือกวันหมดอายุ' });
        return;
    }
    if (!action) {
        MySwal.fire({ icon: 'warning', title: 'ยังไม่ได้เลือกวิธีจัดการ', text: 'กรุณาเลือกวิธีจัดการรายการ' });
        return;
    }
    if (action === 'Transfer' && !transferValue) {
        MySwal.fire({ icon: 'warning', title: 'ยังไม่ได้เลือกปลายทาง', text: 'กรุณาเลือกปลายทางสำหรับการส่งต่อ' });
        return;
    }
    if (['Other', 'ContactWH', 'ReturnWH', 'Destroy'].includes(action) && !note) { 
        MySwal.fire({ icon: 'warning', title: 'ข้อมูลไม่ครบ', text: 'กรุณากรอกหมายเหตุ' }); 
        return; 
    }
    MySwal.fire({ 
        title: 'บันทึกรายการนี้หรือไม่?', 
        text: "กรุณาตรวจสอบข้อมูลให้เรียบร้อย", 
        icon: 'question', 
        showCancelButton: true, 
        confirmButtonText: 'ยืนยันการบันทึก' 
    }).then((result) => { if (result.isConfirmed) { submitDataToServer(); } });
}

function submitDataToServer() {
    const action = document.querySelector('input[name="actionType"]:checked').value;
    let subVal = action === 'Transfer' ? document.getElementById('inputTransfer').value : "";
    if (action === 'Other') subVal = document.getElementById('otherStockOut').checked ? OTHER_STOCK_OUT_TOKEN : "";
    const noteVal = document.getElementById('subNote').value.trim();
    const formData = { entryDate: document.getElementById('entryDate').value, drugName: document.getElementById('drugSearch').value, generic: document.getElementById('generic').value, strength: document.getElementById('strength').value, unit: document.getElementById('unit').value, lotNo: document.getElementById('lotNoInput').value.trim(), qty: document.getElementById('qtyInput').value, expiryDate: document.getElementById('expiryDateInput').value, actionType: action, subDetails: subVal, notes: noteVal };
    document.getElementById('overlay').classList.remove('hidden');
    
    callAPI('saveData', formData).then(res => { 
        document.getElementById('overlay').classList.add('hidden'); 
        if(res.success) { 
            MySwal.fire({ icon: 'success', title: 'บันทึกสำเร็จ', timer: 1500, showConfirmButton: false }); 
            document.getElementById('expiryForm').reset(); 
            document.getElementById('entryDate').value = new Date().toISOString().split('T')[0];
            document.getElementById('expiryDateInput').min = new Date().toISOString().split('T')[0];
            document.getElementById('lotNoInput').value = "";
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
            MySwal.fire('ผิดพลาด', res.message, 'error'); 
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
        Toast.fire({ icon: 'success', title: 'อัปเดตรายการแล้ว' });
    }).catch(() => {
        icon.classList.remove('fa-spin');
        btn.disabled = false;
        btn.classList.remove('opacity-75');
    });
}

function loadReport() {
    currentPage = 1;
    document.getElementById('reportList').innerHTML = `<div class="col-span-full flex min-h-[320px] items-center justify-center">
        <div class="section-card flex w-full max-w-xl flex-col items-center px-8 py-10 text-center">
            <div class="custom-loader"></div>
            <h3 class="mt-5 text-xl font-bold text-slate-800">กำลังโหลดข้อมูล</h3>
            <p class="mt-2 text-sm text-slate-500">กำลังดึงข้อมูลล่าสุดจากแหล่งข้อมูลเดิม</p>
        </div>
    </div>`;
    
    return callAPI('getReportData').then(data => { 
        reportData = data; 
        isReportLoaded = true; 
        renderReport(); 
    }).catch(err => onFail(err));
}

function renderReport() {
    const container = document.getElementById('reportList');
    const paginationControls = document.getElementById('paginationControls');
    updateReportListLayout();
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
        container.innerHTML = renderStateCard({
            icon: 'fa-box-open',
            title: 'ไม่พบข้อมูล',
            description: 'ขณะนี้ยังไม่มีข้อมูลรายงานจากแหล่งข้อมูลที่เชื่อมต่ออยู่',
            tone: 'slate'
        });
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
        container.innerHTML = renderStateCard({
            icon: 'fa-filter',
            title: 'ไม่พบรายการที่ตรงกับตัวกรอง',
            description: 'ลองเปลี่ยนหมวดบน dashboard ช่วงเวลา หรือประเภทการจัดการ เพื่อดูรายการเพิ่มเติม',
            tone: 'amber'
        });
        paginationControls.classList.add('hidden');
        return;
    }

    filteredDataCache = currentRenderedRows;
    currentPage = 1;
    renderPage(currentPage);
}

function updateReportListLayout() {
    const container = document.getElementById('reportList');
    if (!container) return;

    if (currentViewMode === 'grouped') {
        container.className = 'grid min-h-[300px] grid-cols-1 gap-4 pb-8 md:grid-cols-2 2xl:grid-cols-3';
    } else {
        container.className = 'flex min-h-[300px] flex-col gap-3 pb-8';
    }
}

function renderPage(page) {
    const container = document.getElementById('reportList');
    updateReportListLayout();
    container.innerHTML = '';
    const start = (page - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    const pagedItems = filteredDataCache.slice(start, end);
    const totalPages = Math.ceil(filteredDataCache.length / itemsPerPage);

    pagedItems.forEach(item => {
        container.innerHTML += currentViewMode === 'grouped' ? createGroupedCard(item) : createItemCard(item);
    });
    document.getElementById('paginationControls').classList.remove('hidden');
    document.getElementById('pageIndicator').textContent = `หน้า ${currentPage} จาก ${totalPages}`;
    document.getElementById('btnPrev').disabled = (currentPage === 1);
    document.getElementById('btnNext').disabled = (currentPage === totalPages);
}

function createItemCard(item) {
    const status = getExpiryStyles(item.diffDays);
    const dateStr = formatDisplayDate(item.expObj, item.expiryDate);
    const style = actionStyles[item.action] || actionStyles['Other'];
    const lotNo = (item.lotNo || '').trim();
    const noteText = item.notes && item.notes.trim() !== "" ? item.notes : "ไม่มีหมายเหตุ";
    let actionLabel = `<i class="fa-solid ${style.icon} mr-1"></i> ${style.label}`;
    if (item.action === 'Transfer' && item.subDetails) {
        actionLabel += ` <i class="fa-solid fa-arrow-right text-sm mx-1 text-slate-400"></i> ${item.subDetails}`;
    }

    const itemStr = encodeURIComponent(JSON.stringify(item));

    return `<div role="button" tabindex="0" onclick="openManageModal('${itemStr}')" onkeydown="handleCardKeyActivate(event, () => openManageModal('${itemStr}'))"
        class="section-card gesture-scrollable group relative w-full cursor-pointer overflow-hidden border-l-4 ${status.borderStatus} px-4 py-4 text-left transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl focus-visible:outline-none fade-in sm:px-5">
        <div class="flex flex-col gap-4 xl:flex-row xl:items-center xl:gap-5">
            <div class="min-w-0 flex-1">
                <div class="flex flex-wrap items-center gap-2">
                    <p class="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">รายละเอียดล็อต</p>
                    ${lotNo ? `<span class="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.14em] text-slate-600">Lot No. <span class="ml-1.5 normal-case tracking-normal text-slate-700">${lotNo}</span></span>` : ''}
                </div>
                <h3 class="mt-2 truncate text-lg font-bold text-slate-800 transition-colors group-hover:text-teal-700 sm:text-xl">${item.drugName}</h3>
                <p class="mt-1 text-sm font-medium text-slate-500">${item.strength || '-'}</p>
                <p class="mt-3 break-words text-sm text-slate-600"><span class="font-semibold text-slate-500">หมายเหตุ:</span> ${noteText}</p>
            </div>

            <div class="grid gap-3 sm:grid-cols-3 xl:min-w-[620px] xl:max-w-[620px]">
                <div class="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                    <p class="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">จำนวนคงเหลือ</p>
                    <p class="mt-2 text-xl font-bold text-slate-800 sm:text-2xl">${item.remainingQty} <span class="text-sm font-semibold text-slate-500">${item.unit || ''}</span></p>
                </div>
                <div class="rounded-2xl border px-4 py-3 ${status.expBg} ${status.textExp}">
                    <p class="text-[11px] font-bold uppercase tracking-[0.18em] opacity-75">วันหมดอายุ</p>
                    <p class="mt-2 text-base font-bold sm:text-lg">${dateStr}</p>
                    <p class="text-sm opacity-80">เหลืออีก ${item.diffDays} วัน</p>
                </div>
                <div class="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-700 shadow-sm">
                    <p class="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">การจัดการ</p>
                    <div class="mt-2 inline-flex items-center rounded-2xl border px-3 py-2 text-sm font-bold shadow-sm ${style.bg} ${style.text} ${style.border}">${actionLabel}</div>
                </div>
            </div>
        </div>
    </div>`;
}

function createGroupedCard(group) {
    const status = getExpiryStyles(group.nearestDiffDays);
    const lotHtml = group.items.slice(0, 4).map((item) => {
        const itemStr = encodeURIComponent(JSON.stringify(item));
        const lotNo = (item.lotNo || '').trim();
        return `<div role="button" tabindex="0" onclick="event.stopPropagation(); openManageModal('${itemStr}')" onkeydown="handleCardKeyActivate(event, () => openManageModal('${itemStr}'))" class="gesture-scrollable rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-left transition-colors hover:border-teal-200 hover:bg-teal-50">
            <div class="text-sm font-bold text-slate-700">${item.qty} ${item.unit || ''}</div>
            ${lotNo ? `<div class="mt-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Lot No. <span class="normal-case tracking-normal text-slate-600">${lotNo}</span></div>` : ''}
            <div class="mt-1 text-xs text-slate-500">${item.expiryDate} (${item.diffDays}d)</div>
        </div>`;
    }).join('');
    const remainingLots = group.items.length > 4 ? `<div class="flex items-center justify-center rounded-2xl border border-dashed border-slate-200 px-4 py-3 text-xs font-bold text-slate-400">+ อีก ${group.items.length - 4} ล็อต</div>` : '';

    return `<div class="section-card border-l-4 ${status.borderStatus} p-5 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl fade-in">
        <div class="flex items-start justify-between gap-4">
            <div>
                <p class="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">มุมมองจัดกลุ่มยา</p>
                <h3 class="text-xl font-bold text-slate-800">${group.drugName}</h3>
                <p class="text-sm text-slate-500">${group.strength || '-'} • ${group.inRoomLots} ล็อตในห้องยา • จำนวน ${group.remainingQty} ${group.unit || ''}</p>
            </div>
            <div class="flex flex-col items-end gap-2">
                <button type="button" onclick="openHistoryModal('${encodeURIComponent(group.drugName)}')"
                    class="gesture-scrollable rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-bold text-amber-700 transition-colors hover:bg-amber-100">
                    <i class="fa-solid fa-clock-rotate-left mr-1"></i>ประวัติ
                </button>
            </div>
        </div>
        <div class="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div class="rounded-2xl border px-4 py-3 ${status.expBg} ${status.textExp}">
                <p class="text-[11px] uppercase font-bold opacity-70">หมดอายุใกล้ที่สุด</p>
                <p class="text-lg font-extrabold">${group.nearestExpiryDate}</p>
                <p class="text-xs opacity-80">เหลืออีก ${group.nearestDiffDays} วัน</p>
            </div>
            <div class="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-700">
                <p class="text-[11px] uppercase font-bold text-slate-400">ภาพรวมการจัดการ</p>
                <p class="text-sm font-bold">${group.actionsSummary}</p>
                <p class="text-xs text-slate-500">${group.recommendation}</p>
            </div>
        </div>
        <div class="mt-4">
            <p class="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">ล็อต</p>
            <div class="grid grid-cols-1 gap-2 sm:grid-cols-2">
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
        group.recommendation = group.nearestDiffDays <= 30 ? 'ควรดำเนินการล็อตนี้ก่อน' : (group.nearestDiffDays <= 60 ? 'เตรียมแผนส่งต่อ / ติด Sticker' : 'ติดตามและตรวจสอบอย่างสม่ำเสมอ');
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
        { key: 'urgent', label: '0-30 วัน', tone: 'from-rose-500 to-red-500', icon: 'fa-triangle-exclamation', detail: 'เร่งด่วน' },
        { key: 'soon', label: '31-60 วัน', tone: 'from-amber-400 to-orange-400', icon: 'fa-hourglass-half', detail: 'เตรียมจัดการ' },
        { key: 'watch', label: '61-90 วัน', tone: 'from-sky-500 to-cyan-500', icon: 'fa-bell', detail: 'ติดตามต่อเนื่อง' },
        { key: 'all', label: 'ทั้งหมดที่ยังใช้งาน', tone: 'from-slate-700 to-slate-500', icon: 'fa-capsules', detail: 'ล็อตที่ยังไม่หมดอายุทั้งหมด' }
    ];

    dashboard.innerHTML = cards.map((card) => {
        const scopedItems = card.key === 'all' ? items : items.filter((item) => matchesDashboardFilter(item, card.key));
        const activeRing = currentDashboardFilter === card.key ? 'ring-4 ring-offset-2 ring-teal-100 scale-[1.01]' : 'hover:-translate-y-1';
        return `<div role="button" tabindex="0" onclick="setDashboardFilter('${card.key}')" onkeydown="handleCardKeyActivate(event, () => setDashboardFilter('${card.key}'))" class="gesture-scrollable w-full cursor-pointer rounded-[1.75rem] bg-gradient-to-br ${card.tone} p-5 text-left text-white shadow-lg shadow-slate-200/60 transition-all duration-300 ${activeRing}">
        <div class="flex items-start justify-between gap-4">
            <div class="min-w-0">
                <p class="text-xs font-bold uppercase tracking-wider text-white/75">${card.label}</p>
                <div class="mt-3 grid grid-cols-2 gap-3">
                    <div class="rounded-2xl bg-white/12 px-3 py-2">
                        <p class="text-[11px] font-bold uppercase tracking-wider text-white/70">จำนวนรายการ</p>
                        <p class="text-2xl sm:text-3xl font-extrabold mt-1">${scopedItems.length}</p>
                    </div>
                    <div class="rounded-2xl bg-white/12 px-3 py-2">
                        <p class="text-[11px] font-bold uppercase tracking-wider text-white/70">จำนวนยาคงเหลือ</p>
                        <p class="text-2xl sm:text-3xl font-extrabold mt-1">${countUniqueDrugs(scopedItems)}</p>
                    </div>
                </div>
                <p class="text-sm text-white/80 mt-3">${card.detail}</p>
            </div>
            <div class="w-12 h-12 rounded-2xl bg-white/15 flex items-center justify-center shrink-0">
                <i class="fa-solid ${card.icon} text-xl"></i>
            </div>
        </div>
    </div>`;
    }).join('');
}

function updateReportInsight(items) {
    const insightText = document.getElementById('reportInsightText');
    if (!insightText) return;
    if (!items.length) {
        insightText.textContent = 'ไม่พบรายการที่ยังใช้งานตรงกับตัวกรองนี้';
        return;
    }

    const visibleItems = applyDashboardFilter(items);
    if (!visibleItems.length) {
        insightText.textContent = 'ไม่พบรายการที่ตรงกับหมวดบน dashboard ที่เลือก';
        return;
    }

    const top = applySort(visibleItems, 'expiry')[0];
    const groupedCount = buildGroupedRows(visibleItems).length;
    const uniqueDrugCount = countUniqueDrugs(visibleItems);
    insightText.textContent = `${top.drugName} จะหมดอายุเร็วที่สุดในอีก ${top.diffDays} วัน ขณะนี้มี ${visibleItems.length} รายการ จากยา ${uniqueDrugCount} ชนิด (${groupedCount} มุมมองจัดกลุ่ม) ในหมวดนี้`;
}

function requestNotificationPermission() {
    if (!('Notification' in window)) {
        MySwal.fire({ icon: 'info', title: 'ไม่รองรับการแจ้งเตือน', text: 'เบราว์เซอร์นี้ไม่รองรับการแจ้งเตือน' });
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
        button.innerHTML = '<i class="fa-regular fa-bell-slash"></i> ไม่รองรับการแจ้งเตือน';
        return;
    }

    button.classList.remove('opacity-50', 'border-rose-200', 'bg-rose-50', 'text-rose-700', 'border-emerald-200', 'bg-emerald-50', 'text-emerald-700');
    if (Notification.permission === 'granted') {
        button.classList.add('border-emerald-200', 'bg-emerald-50', 'text-emerald-700');
        button.innerHTML = '<i class="fa-solid fa-bell"></i> เปิดการแจ้งเตือนแล้ว';
    } else if (Notification.permission === 'denied') {
        button.classList.add('border-rose-200', 'bg-rose-50', 'text-rose-700');
        button.innerHTML = '<i class="fa-regular fa-bell-slash"></i> บล็อกการแจ้งเตือน';
    } else {
        button.innerHTML = '<i class="fa-regular fa-bell"></i> เปิดการแจ้งเตือน';
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
    new Notification('แจ้งเตือนวันหมดอายุ', {
        body: `มี ${urgentCount} ล็อตที่จะหมดอายุภายใน ${dailyAlertWindow} วัน รายการสำคัญที่สุดคือ ${topItem.drugName}`,
        icon: 'icons/icon-192.png'
    });
}

function exportCurrentView() {
    if (!currentRenderedRows.length) {
        MySwal.fire({ icon: 'info', title: 'ไม่มีข้อมูลให้ส่งออก', text: 'ขณะนี้ไม่มีข้อมูลที่แสดงอยู่สำหรับส่งออก' });
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
            lotNo: row.lotNo,
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
    link.download = `รายงานยาใกล้หมดอายุ-${currentViewMode}-${new Date().toISOString().slice(0, 10)}.csv`;
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
    document.getElementById('manageUnit').textContent = item.unit || 'หน่วย';
    currentManageMaxQty = parseInt(item.qty, 10) || 0;
    currentManageDrugName = item.drugName;
    
    if(document.getElementById('modalUnitTop')) {
        document.getElementById('modalUnitTop').textContent = item.unit || 'หน่วย';
    }
    
    document.getElementById('manageOriginalAction').value = item.action;

    // --- Note Logic (Case Insensitive Check) ---
    const noteBox = document.getElementById('displayCurrentNoteBox');
    const noteText = document.getElementById('displayCurrentNote');
    const noteEditor = document.getElementById('manageNoteEditor');
    
    const getVal = (obj, key) => obj[key] || obj[key.toLowerCase()] || obj[key.charAt(0).toUpperCase() + key.slice(1)] || "";
    
    const rawLotNo = getVal(item, 'lotNo').trim();
    const rawSub = getVal(item, 'subDetails');
    const rawNote = getVal(item, 'notes'); 
    const stockOutByOther = hasOtherStockOut(rawSub);
    const lotWrap = document.getElementById('manageLotNoWrap');
    const lotText = document.getElementById('manageLotNo');

    if (lotWrap && lotText) {
        lotText.textContent = rawLotNo || '-';
        lotWrap.classList.toggle('hidden', !rawLotNo);
    }

    let detailsToShow = [];
    if (stockOutByOther) { detailsToShow.push('[ตัด stock ออกจากห้องแล้ว]'); }
    const cleanSub = sanitizeSubDetails(rawSub);
    if (cleanSub && cleanSub.trim() !== "") { detailsToShow.push(`[${cleanSub}]`); }
    if (rawNote && rawNote.trim() !== "") { detailsToShow.push(rawNote); }
    
    const finalNote = detailsToShow.join(" ");

    noteText.textContent = finalNote || "ไม่มีหมายเหตุสำหรับล็อตนี้";
    if (noteEditor) {
        noteEditor.value = rawNote || "";
    }
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

function saveCurrentNote() {
    const rowIndex = document.getElementById('manageRowIndex').value;
    const originalAction = document.getElementById('manageOriginalAction').value;
    const noteEditor = document.getElementById('manageNoteEditor');
    const noteValue = noteEditor ? noteEditor.value.trim() : '';

    if (!rowIndex) {
        MySwal.fire({ icon: 'warning', title: 'ไม่พบรายการ', text: 'กรุณาเปิดรายการที่ต้องการแก้ไขอีกครั้ง' });
        return;
    }

    if (['Other', 'ContactWH', 'ReturnWH', 'Destroy'].includes(originalAction) && !noteValue) {
        MySwal.fire({ icon: 'warning', title: 'ข้อมูลไม่ครบ', text: 'รายการประเภทนี้จำเป็นต้องมีหมายเหตุ' });
        return;
    }

    document.getElementById('overlay').classList.remove('hidden');

    callAPI('updateItemNote', { rowIndex: rowIndex, newNote: noteValue })
        .then((res) => {
            document.getElementById('overlay').classList.add('hidden');
            if (res.success) {
                closeManageModal();
                MySwal.fire({ icon: 'success', title: 'บันทึกหมายเหตุแล้ว', timer: 1200, showConfirmButton: false });
                loadReport().then(() => isReportLoaded = true);
            } else {
                MySwal.fire('ผิดพลาด', res.message, 'error');
            }
        })
        .catch(err => onFail(err));
}

function editStockQty() {
   const currentQty = document.getElementById('displayMaxQty').textContent;
   const rowIndex = document.getElementById('manageRowIndex').value;
   
   MySwal.fire({
       title: '<span class="text-slate-800">ปรับจำนวนคงเหลือ</span>',
       html: `
         <div class="mb-4">
            <p class="text-slate-400 text-sm font-bold uppercase tracking-wider mb-1">จำนวนปัจจุบัน</p>
            <p class="text-slate-600 text-xl font-semibold">${currentQty} <span class="text-xs text-slate-400">หน่วย</span></p>
         </div>
       `,
       input: 'number',
       inputPlaceholder: 'จำนวนใหม่',
       inputValue: currentQty,
       showCancelButton: true,
       confirmButtonText: 'อัปเดตจำนวน',
       cancelButtonText: 'ยกเลิก',
       customClass: {
           ...swalTheme,
           input: 'w-1/2 mx-auto text-center text-4xl font-bold text-blue-600 bg-slate-50 border-2 border-slate-200 rounded-2xl focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none py-4 transition-all mb-6'
       },
       preConfirm: (newQty) => {
           if (newQty === '' || newQty === null || Number(newQty) < 0) Swal.showValidationMessage('จำนวนไม่ถูกต้อง');
           return Number(newQty);
       }
   }).then((result) => {
       if (result.isConfirmed) {
           document.getElementById('overlay').classList.remove('hidden');
           callAPI('updateStockQuantity', { rowIndex: rowIndex, newQty: result.value }).then(res => {
               document.getElementById('overlay').classList.add('hidden');
               if(res.success) { MySwal.fire({ icon: 'success', title: 'อัปเดตจำนวนแล้ว', timer: 1000, showConfirmButton: false }); loadReport().then(() => isReportLoaded=true); }
               else { MySwal.fire('ผิดพลาด', res.message, 'error'); }
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

    if(!manageQty || parseInt(manageQty) <= 0) { MySwal.fire('คำเตือน', 'จำนวนไม่ถูกต้อง', 'warning'); return; }
    if(parseInt(manageQty) > parseInt(document.getElementById('manageMaxQty').value)) { MySwal.fire('คำเตือน', 'จำนวนเกินคงเหลือ', 'warning'); return; }
    if (actionEl && selectedAction === 'Transfer' && !transferValue) {
        MySwal.fire({ icon: 'warning', title: 'ยังไม่ได้เลือกปลายทาง', text: 'กรุณาเลือกปลายทางสำหรับการส่งต่อ' });
        return;
    }
    
    let actionToSubmit = originalAction;
    if (actionEl) {
        actionToSubmit = actionEl.value;
        const note = document.getElementById('modalSubNote').value.trim();
        
        if (['Other', 'ContactWH', 'ReturnWH', 'Destroy'].includes(actionToSubmit) && !note) {
            MySwal.fire({ icon: 'warning', title: 'ข้อมูลไม่ครบ', text: 'กรุณากรอกหมายเหตุ' });
            return;
        }
    }

    MySwal.fire({
        title: 'ยืนยันการอัปเดตหรือไม่?', text: `กำลังอัปเดตจำนวน ${manageQty} รายการ`, icon: 'warning',
        showCancelButton: true, confirmButtonText: 'ยืนยันการอัปเดต',
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
                MySwal.fire({ icon: 'success', title: 'สำเร็จ', text: res.message, timer: 1500, showConfirmButton: false }); 
                loadReport().then(() => isReportLoaded=true); 
            }
            else { MySwal.fire('ผิดพลาด', res.message, 'error'); }
        })
        .catch(err => onFail(err));
}

function confirmDelete() {
    const rowIndex = document.getElementById('manageRowIndex').value;
    
    MySwal.fire({
        title: 'ลบรายการนี้หรือไม่?',
        html: `
            <p class="text-slate-500 text-sm mb-3">การดำเนินการนี้ไม่สามารถย้อนกลับได้</p>
            <div class="mb-3">
                <input type="password" id="deletePin" class="w-full p-3 rounded-xl border border-slate-200 outline-none text-center text-lg tracking-widest font-bold focus:border-red-400 focus:ring-2 focus:ring-red-100 transition-all" placeholder="กรอก PIN" maxlength="4">
            </div>
            <textarea id="deleteNote" class="w-full p-3 rounded-xl border border-slate-200 focus:border-red-400 focus:ring-2 focus:ring-red-100 outline-none transition-all text-base text-slate-600" rows="2" placeholder="เหตุผลในการลบ (ไม่บังคับ)..."></textarea>
        `,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#ef4444',
        confirmButtonText: 'ยืนยันและลบ',
        cancelButtonText: 'ยกเลิก',
        didOpen: () => {
            const pinInput = document.getElementById('deletePin');
            if(pinInput) pinInput.focus();
        },
        preConfirm: () => {
            const pin = document.getElementById('deletePin').value;
            const note = document.getElementById('deleteNote').value;
            
            if (!pin) {
                Swal.showValidationMessage('กรุณากรอก PIN');
                return false;
            }
            
            if (pin !== '1234') {
                Swal.showValidationMessage('PIN ไม่ถูกต้อง');
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
                    MySwal.fire({ icon: 'success', title: 'ลบแล้ว', text: 'ลบรายการเรียบร้อยแล้ว', timer: 1500, showConfirmButton: false }); 
                    loadReport().then(() => isReportLoaded=true); 
                }
                else { MySwal.fire('ผิดพลาด', res.message, 'error'); }
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
        MySwal.fire({ icon: 'info', title: 'ยังไม่ได้เลือกยา', text: 'กรุณาเปิดรายละเอียดรายการยาก่อน' });
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
            : '<div class="rounded-2xl border border-slate-200 bg-slate-50 px-5 py-8 text-center text-slate-500">ไม่พบประวัติสำหรับยานี้</div>';

        MySwal.fire({
            title: `ประวัติ: ${targetDrugName}`,
            html,
            width: 720,
            confirmButtonText: 'ปิด'
        });
    } catch (error) {
        onFail(error);
    }
}
