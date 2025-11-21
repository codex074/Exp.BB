const GAS_URL = 'https://script.google.com/macros/s/AKfycbwHyEk6dmWlbm_YObxknK_C8NgUDSa1l9nbFDCRwuGQd-EpCtBnZiul6DZHapy_z3lqCg/exec';

let drugDatabase = [];
let reportData = [];
let currentPage = 1;
const itemsPerPage = 10;
let filteredDataCache = [];

const actionStyles = {
    'Sticker': { bg: 'bg-orange-50', text: 'text-orange-600', border: 'border-orange-200', label: 'Sticker', icon: 'fa-tags' },
    'Transfer': { bg: 'bg-blue-50', text: 'text-blue-600', border: 'border-blue-200', label: 'ส่งต่อ', icon: 'fa-share-from-square' },
    'Separate': { bg: 'bg-red-50', text: 'text-red-600', border: 'border-red-200', label: 'แยกเก็บ', icon: 'fa-box-open' },
    'ContactWH': { bg: 'bg-teal-50', text: 'text-teal-600', border: 'border-teal-200', label: 'ติดต่อคลัง', icon: 'fa-phone-volume' },
    'ReturnWH': { bg: 'bg-green-50', text: 'text-green-600', border: 'border-green-200', label: 'คืนคลัง', icon: 'fa-truck-ramp-box' },
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

window.onload = function() {
    const today = new Date();
    document.getElementById('entryDate').value = today.toISOString().split('T')[0];
    
    const searchInput = document.getElementById('drugSearch');
    searchInput.placeholder = "🔄 Downloading database..."; 
    searchInput.disabled = true; 

    callAPI('getDrugList').then(data => { 
        drugDatabase = data; 
        searchInput.placeholder = "🔍 Search Drug...";
        searchInput.disabled = false;
    }).catch(err => {
        onFail(err);
        searchInput.placeholder = "❌ Error loading data";
    });
    
    const mainContainer = document.getElementById('mainContainer');
    const backBtn = document.getElementById('backToTop');
    mainContainer.addEventListener('scroll', () => {
        if (mainContainer.scrollTop > 300) { backBtn.classList.add('show'); } else { backBtn.classList.remove('show'); }
    });
};

function onFail(err) {
    document.getElementById('overlay').classList.add('hidden');
    Swal.fire({ title: 'Error', text: err.message || 'Connection Failed', icon: 'error', confirmButtonColor: '#3b82f6', borderRadius: '1rem' });
}

function scrollToTop() { document.getElementById('mainContainer').scrollTo({ top: 0, behavior: 'smooth' }); }

function switchTab(tab) {
    const btnEntry = document.getElementById('tab-entry');
    const btnReport = document.getElementById('tab-report');
    const viewEntry = document.getElementById('view-entry');
    const viewReport = document.getElementById('view-report');
    if (tab === 'entry') {
        btnEntry.className = "flex-1 py-3 px-4 rounded-2xl font-bold text-lg transition-all duration-300 bg-blue-600 text-white shadow-lg shadow-blue-200 transform scale-100";
        btnReport.className = "flex-1 py-3 px-4 rounded-2xl font-bold text-lg transition-all duration-300 bg-white text-slate-500 hover:bg-slate-50 border border-slate-200";
        viewEntry.classList.remove('hidden'); viewReport.classList.add('hidden');
    } else {
        btnReport.className = "flex-1 py-3 px-4 rounded-2xl font-bold text-lg transition-all duration-300 bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg transform scale-100";
        btnEntry.className = "flex-1 py-3 px-4 rounded-2xl font-bold text-lg transition-all duration-300 bg-white text-slate-500 hover:bg-slate-50 border border-slate-200";
        viewEntry.classList.add('hidden'); viewReport.classList.remove('hidden');
        loadReport();
    }
    scrollToTop();
}

function adjustQty(amount) {
    const input = document.getElementById('qtyInput');
    let val = parseInt(input.value) || 0; val += amount; if(val < 0) val = 0; input.value = val;
}

function adjustManageQty(amount) {
    const input = document.getElementById('manageQty');
    let val = parseInt(input.value) || 0; val += amount; if(val < 0) val = 0; input.value = val;
}

const drugInput = document.getElementById('drugSearch');
const drugList = document.getElementById('drugList');

// --- แก้ไข: แสดง Dropdown เฉพาะเมื่อมีคำค้นหา (val ไม่ว่าง) ---
function renderDrugDropdown(query) {
    drugList.innerHTML = '';
    const val = query ? query.toLowerCase().trim() : "";
    
    // ถ้าไม่มีคำค้นหา ให้ซ่อน Dropdown ทันที (ไม่แสดง 10 รายการแรกแล้ว)
    if (!val) {
        drugList.classList.add('hidden');
        return;
    }

    const matches = drugDatabase.filter(d => d.displayName.toLowerCase().includes(val)).slice(0, 10);

    if (matches.length > 0) {
        drugList.classList.remove('hidden');
        matches.forEach(item => {
            const li = document.createElement('li');
            li.className = "p-4 hover:bg-blue-50 cursor-pointer border-b border-slate-100 last:border-0 text-lg text-slate-700 transition-colors flex items-center gap-2";
            li.innerHTML = `<i class="fa-solid fa-pills text-blue-300"></i> ${item.displayName}`;
            li.onclick = () => selectDrug(item);
            drugList.appendChild(li);
        });
    } else { 
        drugList.classList.add('hidden'); 
    }
}

drugInput.addEventListener('input', function() {
    const val = this.value;
    if (val) { document.getElementById('clearSearchBtn').classList.remove('hidden'); } 
    else { document.getElementById('clearSearchBtn').classList.add('hidden'); }
    renderDrugDropdown(val);
});

// ลบ Event 'focus' ออก เพื่อไม่ให้เด้งตอนคลิก
// drugInput.addEventListener('focus', ...); <--- ลบส่วนนี้ออก

function selectDrug(item) {
    drugInput.value = item.displayName;
    document.getElementById('generic').value = item.generic;
    document.getElementById('unit').value = item.unit;
    document.getElementById('strength').value = item.strength;
    document.getElementById('unitDisplay').textContent = item.unit || "Unit";
    drugList.classList.add('hidden');
}

function clearDrugSearch() {
    const input = document.getElementById('drugSearch');
    input.value = ''; input.focus();
    renderDrugDropdown(""); // ส่งค่าว่างไปเพื่อซ่อน list
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
    container.classList.remove('hidden'); 
    if (action === 'Transfer') { inputTransfer.classList.remove('hidden'); inputTransfer.required = true; } else { inputTransfer.classList.add('hidden'); inputTransfer.required = false; }
    if (['Other', 'ContactWH', 'ReturnWH'].includes(action)) { subNote.required = true; subNote.placeholder = "Note (Required)..."; subNote.classList.add('border-blue-300', 'ring-1', 'ring-blue-200'); } else { subNote.required = false; subNote.placeholder = "Note (Optional)..."; subNote.classList.remove('border-blue-300', 'ring-1', 'ring-blue-200'); }
}

function modalToggleSubDetails(action) {
    const container = document.getElementById('modalDynamicArea');
    const inputTransfer = document.getElementById('modalTransfer');
    const subNote = document.getElementById('modalSubNote');
    container.classList.remove('hidden');
    if (action === 'Transfer') { inputTransfer.classList.remove('hidden'); inputTransfer.required = true; } else { inputTransfer.classList.add('hidden'); inputTransfer.required = false; }
    if (['Other', 'ContactWH', 'ReturnWH'].includes(action)) { subNote.required = true; subNote.placeholder = "Note (Required)..."; subNote.classList.add('border-blue-300', 'ring-1', 'ring-blue-200'); } else { subNote.required = false; subNote.placeholder = "Note (Optional)..."; subNote.classList.remove('border-blue-300', 'ring-1', 'ring-blue-200'); }
}

function toggleCustomDate() {
    const val = document.getElementById('filterTime').value;
    const container = document.getElementById('customDateContainer');
    if (val === 'custom') { container.classList.remove('hidden'); } else { container.classList.add('hidden'); renderReport(); }
}

function handleFormSubmit(e) {
    e.preventDefault();
    const action = document.querySelector('input[name="actionType"]:checked').value;
    const note = document.getElementById('subNote').value.trim();
    if (['Other', 'ContactWH', 'ReturnWH'].includes(action) && !note) { Swal.fire({ icon: 'warning', title: 'Missing Info', text: 'Please provide a note.', confirmButtonColor: '#f59e0b', borderRadius: '1rem' }); return; }
    Swal.fire({ title: 'Save Entry?', text: "Please check details", icon: 'question', showCancelButton: true, confirmButtonColor: '#3b82f6', cancelButtonColor: '#cbd5e1', confirmButtonText: 'Yes, Save' }).then((result) => { if (result.isConfirmed) { submitDataToServer(); } });
}

function submitDataToServer() {
    const action = document.querySelector('input[name="actionType"]:checked').value;
    let subVal = action === 'Transfer' ? document.getElementById('inputTransfer').value : "";
    const noteVal = document.getElementById('subNote').value;
    const formData = { entryDate: document.getElementById('entryDate').value, drugName: document.getElementById('drugSearch').value, generic: document.getElementById('generic').value, strength: document.getElementById('strength').value, unit: document.getElementById('unit').value, qty: document.getElementById('qtyInput').value, expiryDate: document.getElementById('expiryDateInput').value, actionType: action, subDetails: subVal, notes: noteVal };
    document.getElementById('overlay').classList.remove('hidden');
    
    callAPI('saveData', formData).then(res => { 
        document.getElementById('overlay').classList.add('hidden'); 
        if(res.success) { 
            Swal.fire({ icon: 'success', title: 'Saved!', timer: 1500, showConfirmButton: false }); 
            document.getElementById('expiryForm').reset(); 
            document.getElementById('entryDate').value = new Date().toISOString().split('T')[0];
            document.getElementById('qtyInput').value = ""; 
            document.getElementById('dynamicArea').classList.add('hidden'); 
            document.querySelectorAll('.action-card').forEach(el => el.style = ""); 
            clearDrugSearch(); 
            scrollToTop(); 
        } else { 
            Swal.fire('Error', res.message, 'error'); 
        } 
    }).catch(err => onFail(err));
}

function loadReport() {
    currentPage = 1;
    document.getElementById('reportList').innerHTML = '<div class="col-span-full flex flex-col items-center justify-center text-slate-400 min-h-[60vh]"><div class="custom-loader mb-4"></div>Loading Data...</div>';
    callAPI('getReportData').then(data => { reportData = data; renderReport(); }).catch(err => onFail(err));
}

function renderReport() {
    const container = document.getElementById('reportList');
    const paginationControls = document.getElementById('paginationControls');
    const filterTime = document.getElementById('filterTime').value;
    const filterAction = document.getElementById('filterAction').value; 
    let customMaxDays = null;
    if (filterTime === 'custom') {
        const num = parseInt(document.getElementById('customNumber').value) || 0;
        const unit = document.getElementById('customUnit').value;
        if (num > 0) customMaxDays = unit === 'months' ? num * 30 : num;
    }
    container.innerHTML = '';
    if (!reportData || reportData.length === 0) { container.innerHTML = '<div class="col-span-full text-center text-slate-400 mt-10 font-light text-lg">No data found.</div>'; paginationControls.classList.add('hidden'); return; }
    const today = new Date();
    const processed = reportData.map(item => { const exp = new Date(item.expiryDate); const diffTime = exp - today; const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); return { ...item, diffDays, expObj: exp }; }).sort((a, b) => a.diffDays - b.diffDays);
    const filtered = processed.filter(item => {
        let matchTime = filterTime === 'all' ? true : (filterTime === 'custom' ? (customMaxDays !== null ? (item.diffDays <= customMaxDays && item.diffDays >= -3650) : true) : (item.diffDays <= parseInt(filterTime) && item.diffDays >= -365));
        const matchAction = filterAction === 'all' || item.action === filterAction;
        return matchTime && matchAction;
    });
    if (filtered.length === 0) { container.innerHTML = '<div class="col-span-full text-center text-slate-400 mt-10 font-light text-lg">No items match filter.</div>'; paginationControls.classList.add('hidden'); return; }
    filteredDataCache = filtered;
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
        let borderStatus = "border-l-green-500", textExp = "text-green-600", expBg = "bg-green-50 border-green-100";
        if (item.diffDays < 0) { borderStatus = "border-l-slate-400"; textExp = "text-slate-500"; expBg = "bg-slate-100 border-slate-200"; } 
        else if (item.diffDays <= 30) { borderStatus = "border-l-red-500"; textExp = "text-red-600"; expBg = "bg-red-50 border-red-100"; } 
        else if (item.diffDays <= 90) { borderStatus = "border-l-orange-400"; textExp = "text-orange-600"; expBg = "bg-orange-50 border-orange-100"; } 
        let dateStr = item.expiryDate; try { dateStr = item.expObj.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' }); } catch(e){}
        const style = actionStyles[item.action] || actionStyles['Other'];
        let actionLabel = `<i class="fa-solid ${style.icon} mr-1"></i> ${style.label}`;
        if(item.action === 'Transfer' && item.subDetails) { actionLabel += ` <i class="fa-solid fa-arrow-right text-sm mx-1 text-slate-400"></i> ${item.subDetails}`; }
        const itemStr = encodeURIComponent(JSON.stringify(item));
        const card = `<div onclick="openManageModal('${itemStr}')" class="relative cursor-pointer bg-white p-4 rounded-2xl shadow-sm border border-slate-100 border-l-[4px] ${borderStatus} hover:shadow-lg hover:shadow-blue-100 hover:-translate-y-1 transition-all duration-300 group fade-in">
            <div class="absolute top-3 right-3"><span class="px-3 py-1.5 text-sm font-bold rounded-lg ${style.bg} ${style.text} border ${style.border} shadow-sm flex items-center">${actionLabel}</span></div>
            <div class="pr-28"><h3 class="font-bold text-slate-800 text-xl truncate mb-1 group-hover:text-blue-600 transition-colors">${item.drugName}</h3><p class="text-base text-slate-400 mb-2 font-medium pl-0.5">${item.strength || '-'}</p>
            <div class="flex flex-wrap items-center gap-2"><div class="bg-slate-50 px-3 py-1 rounded-md border border-slate-200 text-base shadow-sm">Qty: <b class="text-slate-800">${item.qty}</b> <span class="text-slate-400 text-sm">${item.unit}</span></div><div class="px-3 py-1 rounded-md border text-base font-bold shadow-sm flex items-center gap-1 ${expBg} ${textExp}"><i class="fa-regular fa-calendar-xmark text-sm opacity-70"></i> ${dateStr} <span class="font-normal opacity-80 text-sm">(${item.diffDays}d)</span></div></div></div></div>`;
        container.innerHTML += card;
    });
    document.getElementById('paginationControls').classList.remove('hidden');
    document.getElementById('pageIndicator').textContent = `Page ${currentPage} of ${totalPages}`;
    document.getElementById('btnPrev').disabled = (currentPage === 1);
    document.getElementById('btnNext').disabled = (currentPage === totalPages);
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
    
    // Store Original Action
    document.getElementById('manageOriginalAction').value = item.action;

    document.getElementById('manageQty').value = ''; 
    document.querySelectorAll('input[name="manageAction"]').forEach(el => el.checked = false);
    document.getElementById('modalDynamicArea').classList.add('hidden');
    document.querySelectorAll('.action-card').forEach(el => el.style = "");
    document.getElementById('manageModal').classList.remove('hidden');
}

function closeManageModal() { document.getElementById('manageModal').classList.add('hidden'); }
function setAllQty() { document.getElementById('manageQty').value = document.getElementById('manageMaxQty').value; }

function editStockQty() {
   const currentQty = document.getElementById('displayMaxQty').textContent;
   const rowIndex = document.getElementById('manageRowIndex').value;
   Swal.fire({
       title: 'Adjust Stock', text: `Current: ${currentQty}`, input: 'number', inputLabel: 'Enter Actual Quantity', inputValue: currentQty,
       showCancelButton: true, confirmButtonText: 'Update',
       preConfirm: (newQty) => { if (!newQty || newQty < 0) Swal.showValidationMessage('Invalid quantity'); return newQty; }
   }).then((result) => {
       if (result.isConfirmed) {
           document.getElementById('overlay').classList.remove('hidden');
           callAPI('updateStockQuantity', { rowIndex: rowIndex, newQty: result.value }).then(res => {
               document.getElementById('overlay').classList.add('hidden');
               if(res.success) { Swal.fire({ icon: 'success', title: 'Stock Updated', timer: 1000, showConfirmButton: false }); loadReport(); }
               else { Swal.fire('Error', res.message, 'error'); }
           }).catch(err => onFail(err));
       }
   });
}

function submitManagement() {
    const manageQty = document.getElementById('manageQty').value;
    const actionEl = document.querySelector('input[name="manageAction"]:checked');
    const originalAction = document.getElementById('manageOriginalAction').value;

    if(!manageQty || parseInt(manageQty) <= 0) { Swal.fire('Warning', 'Invalid Quantity', 'warning'); return; }
    if(parseInt(manageQty) > parseInt(document.getElementById('manageMaxQty').value)) { Swal.fire('Warning', 'Exceed Stock', 'warning'); return; }
    
    // Logic: If no action selected, use original action. If action selected, validate note.
    let actionToSubmit = originalAction;
    if (actionEl) {
        actionToSubmit = actionEl.value;
        const note = document.getElementById('modalSubNote').value.trim();
        if (['Other', 'ContactWH', 'ReturnWH'].includes(actionToSubmit) && !note) {
            Swal.fire({ icon: 'warning', title: 'Missing Info', text: 'Please provide a note.', confirmButtonColor: '#f59e0b' });
            return;
        }
    }

    Swal.fire({
        title: 'Confirm Update?', text: `Updating ${manageQty} items`, icon: 'warning',
        showCancelButton: true, confirmButtonText: 'Yes, Confirm',
    }).then((result) => { if (result.isConfirmed) { processManagement(manageQty, actionToSubmit); } });
}

function processManagement(manageQty, action) {
    const rowIndex = document.getElementById('manageRowIndex').value;
    let subVal = action === 'Transfer' ? document.getElementById('modalTransfer').value : "";
    const noteVal = document.getElementById('modalSubNote').value;

    closeManageModal();
    document.getElementById('overlay').classList.remove('hidden');
    
    callAPI('manageItem', { rowIndex: rowIndex, manageQty: manageQty, newAction: action, newDetails: subVal, newNotes: noteVal })
        .then(res => {
            document.getElementById('overlay').classList.add('hidden');
            if (res.success) { Swal.fire({ icon: 'success', title: 'Success', text: res.message, timer: 1500, showConfirmButton: false }); loadReport(); }
            else { Swal.fire('Error', res.message, 'error'); }
        })
        .catch(err => onFail(err));
}

function confirmDelete() {
    const rowIndex = document.getElementById('manageRowIndex').value;
    Swal.fire({ title: 'Delete Item?', text: "Cannot be undone", icon: 'warning', showCancelButton: true, confirmButtonColor: '#ef4444', confirmButtonText: 'Delete' }).then((result) => {
        if (result.isConfirmed) {
            closeManageModal();
            document.getElementById('overlay').classList.remove('hidden');
            callAPI('deleteItem', { rowIndex: rowIndex }).then(res => {
                document.getElementById('overlay').classList.add('hidden');
                if(res.success) { Swal.fire({ icon: 'success', title: 'Deleted', timer: 1000, showConfirmButton: false }); loadReport(); }
                else { Swal.fire('Error', res.message, 'error'); }
            }).catch(err => onFail(err));
        }
    });
}
