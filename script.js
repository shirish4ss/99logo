// ================= CONFIGURATION =================
const UPI_ID = "yourname@okaxis"; 
const ADMIN_EMAIL = "admin@99logo.com"; // FIXED: Updated to match DB
const ADMIN_PASS = "admin123";
const WORK_START_HOUR = 10; // 10 AM
const WORK_END_HOUR = 18;   // 6 PM
const TAT_HOURS = 48;       // 48 Working Hours

// ================= HELPER FUNCTIONS =================
function generateId(orders) {
    if (!orders || orders.length === 0) return '#101';
    // Robust ID generation to prevent duplicates
    const lastIdStr = orders[orders.length-1].id.replace('#','');
    const lastId = parseInt(lastIdStr) || 100;
    return '#' + (lastId + 1);
}

// ================= LOGIN LOGIC =================
const loginForm = document.getElementById('loginForm');
if (loginForm) {
    loginForm.addEventListener('submit', function(e) {
        // Note: login.html often handles this via inline script for Supabase
        // This is a fallback for local testing
        const email = document.getElementById('email').value.trim(); 
        const pass = document.getElementById('password').value.trim();

        // 1. Check Admin
        if (email === ADMIN_EMAIL && pass === ADMIN_PASS) {
            e.preventDefault(); // Stop form if Admin match
            localStorage.setItem('currentUser', JSON.stringify({ role: 'admin', email: email, name: 'Admin' }));
            window.location.href = 'dashboard.html';
            return;
        } 
        // Client login is handled by Supabase in login.html usually
    });
}

// ================= ORDER FORM LOGIC =================
const orderForm = document.getElementById('orderForm');
if (orderForm) {
    orderForm.addEventListener('submit', (e) => {
        // We prevent default here to handle logic, then allow payment modal
        e.preventDefault();
        
        const fd = new FormData(orderForm);
        const data = Object.fromEntries(fd.entries());
        
        // --- FIX START: Logic changed from Dropdown to Radio Buttons ---
        const pkgSelect = document.querySelector('input[name="packageType"]:checked');
        
        // Safety check to prevent crash if nothing selected
        if (!pkgSelect) {
            alert("Please select a package");
            return;
        }

        data.packageType = pkgSelect.value;
        const basePrice = parseInt(pkgSelect.getAttribute('data-price')) || 0;
        
        // Add-on Calculation
        let addonPrice = 0;
        document.querySelectorAll('input[name="addon"]:checked').forEach(addon => {
            addonPrice += parseInt(addon.value) || 0;
        });

        data.totalPrice = basePrice + addonPrice;
        // --- FIX END ---

        data.dateOfInquiry = new Date().toISOString();
        data.status = 'Pending';
        data.paymentStatus = 'Unpaid'; 
        data.revisionsLeft = 2; 

        // Save to Session for Payment Modal
        sessionStorage.setItem('tempOrder', JSON.stringify(data));
        
        // Show Payment Modal
        const payAmt = document.getElementById('payAmount');
        const qrImg = document.getElementById('qrImage');
        const modal = document.getElementById('paymentModal');

        if(payAmt) payAmt.innerText = `₹${data.totalPrice}`;
        if(qrImg) qrImg.src = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=upi://pay?pa=${UPI_ID}&pn=PixelPerfect&am=${data.totalPrice}`;
        if(modal) modal.classList.add('active');
    });
}

function closeModal() {
    const modal = document.getElementById('paymentModal');
    if(modal) modal.classList.remove('active');
}

function confirmOrder() {
    const txInput = document.getElementById('userTxId');
    const tx = txInput ? txInput.value : '';
    
    if(!tx) return alert("Please enter Transaction ID");
    
    const data = JSON.parse(sessionStorage.getItem('tempOrder'));
    if(!data) return alert("Session expired. Please fill form again.");

    const orders = JSON.parse(localStorage.getItem('pixelOrders')) || [];
    
    data.id = generateId(orders);
    data.transactionId = tx;
    data.paymentStatus = 'Paid'; 
    
    orders.push(data);
    localStorage.setItem('pixelOrders', JSON.stringify(orders));
    sessionStorage.removeItem('tempOrder');
    
    alert("Order Placed Successfully! Login to track.");
    window.location.href = 'login.html';
}

// ================= DASHBOARD LOGIC =================

function loadDashboard() {
    const user = JSON.parse(localStorage.getItem('currentUser'));
    if(!user) {
        window.location.href = 'login.html';
        return;
    }
    
    // Safety check for elements
    const userDisplay = document.getElementById('userDisplay');
    if(userDisplay) userDisplay.innerText = user.email;
    
    const orders = JSON.parse(localStorage.getItem('pixelOrders')) || [];
    
    if(user.role === 'admin') {
        const adminView = document.getElementById('adminView');
        if(adminView) {
            adminView.classList.remove('hidden');
            renderAdmin(orders);
        }
    } else {
        const clientView = document.getElementById('clientView');
        if(clientView) {
            clientView.classList.remove('hidden');
            renderClient(orders, user.email);
        }
    }
}

// --- WORKING HOURS ALGORITHM (Strict) ---
function getDeadline(startDateStr) {
    let current = new Date(startDateStr);
    let minutesToAdd = TAT_HOURS * 60; // 2880 mins
    
    // Recursive function to advance time within working hours
    function advanceTime() {
        // 1. Handle Sunday
        if (current.getDay() === 0) { // Sunday
            current.setDate(current.getDate() + 1);
            current.setHours(WORK_START_HOUR, 0, 0, 0);
        }

        // 2. Handle Before Work Hours
        if (current.getHours() < WORK_START_HOUR) {
            current.setHours(WORK_START_HOUR, 0, 0, 0);
        }

        // 3. Handle After Work Hours
        if (current.getHours() >= WORK_END_HOUR) {
            current.setDate(current.getDate() + 1);
            current.setHours(WORK_START_HOUR, 0, 0, 0);
            if(current.getDay() === 0) { // Check Sunday again
                current.setDate(current.getDate() + 1);
                current.setHours(WORK_START_HOUR, 0, 0, 0);
            }
        }
    }

    advanceTime(); // Initial adjustment

    while (minutesToAdd > 0) {
        let endOfDay = new Date(current);
        endOfDay.setHours(WORK_END_HOUR, 0, 0, 0);
        
        let minsLeftToday = (endOfDay - current) / 60000;
        
        if (minsLeftToday > minutesToAdd) {
            current = new Date(current.getTime() + minutesToAdd * 60000);
            minutesToAdd = 0;
        } else {
            minutesToAdd -= minsLeftToday;
            // Jump to next day start
            current.setDate(current.getDate() + 1);
            current.setHours(WORK_START_HOUR, 0, 0, 0);
            advanceTime(); // Ensure we didn't land on Sunday
        }
    }
    return current;
}

function getTimeData(isoDate) {
    const deadline = getDeadline(isoDate);
    const now = new Date();
    const msLeft = deadline - now;
    
    const hours = Math.floor(msLeft / (1000 * 60 * 60));
    const mins = Math.floor((msLeft % (1000 * 60 * 60)) / (1000 * 60));
    
    let percent = 100;
    if (msLeft > 0) {
        percent = 100 - ((msLeft / (48 * 3600 * 1000)) * 100); 
    }

    return {
        deadlineObj: deadline,
        text: msLeft < 0 ? "Overdue" : `${hours}h ${mins}m left`,
        percent: Math.max(0, Math.min(100, percent)),
        isUrgent: msLeft > 0 && hours < 4,
        isOverdue: msLeft < 0
    };
}

// --- ADMIN RENDER ---
function renderAdmin(orders) {
    const earnings = orders.filter(o => o.paymentStatus === 'Paid').reduce((sum, o) => sum + parseInt(o.totalPrice || 0), 0);
    
    const elEarnings = document.getElementById('totalEarnings');
    const elTotal = document.getElementById('stat-total');
    const elUnpaid = document.getElementById('stat-unpaid');
    const elPending = document.getElementById('stat-pending');

    if(elEarnings) elEarnings.innerText = `₹${earnings}`;
    if(elTotal) elTotal.innerText = orders.length;
    if(elUnpaid) elUnpaid.innerText = orders.filter(o => o.paymentStatus === 'Unpaid').length;
    if(elPending) elPending.innerText = orders.filter(o => o.status === 'In Progress').length;

    const activeOrders = orders.filter(o => o.status !== 'Completed');
    activeOrders.sort((a, b) => getDeadline(a.dateOfInquiry) - getDeadline(b.dateOfInquiry));

    const pList = document.getElementById('priorityList');
    if(pList) {
        pList.innerHTML = activeOrders.map(o => {
            const t = getTimeData(o.dateOfInquiry);
            const urgentClass = t.isUrgent ? 'border-red-500 bg-red-900/10' : 'border-indigo-500';
            return `
            <div class="glass p-3 rounded-lg border-l-4 ${urgentClass} mb-2 cursor-pointer hover:bg-white/5" onclick="viewOrder('${o.id}')">
                <div class="flex justify-between items-center">
                    <span class="font-bold text-sm">${o.id}</span>
                    <span class="text-xs text-gray-400">${t.text}</span>
                </div>
                <div class="text-xs text-gray-300 mt-1">${o.brandName}</div>
            </div>`;
        }).join('');
    }

    const tBody = document.getElementById('ordersTableBody');
    if(tBody) {
        tBody.innerHTML = orders.slice().reverse().map(o => `
            <tr class="border-b border-gray-800 hover:bg-white/5 cursor-pointer" onclick="viewOrder('${o.id}')">
                <td class="px-4 py-3 text-indigo-400 font-bold">${o.id}</td>
                <td class="px-4 py-3 text-white">${o.clientName}</td>
                <td class="px-4 py-3 text-xs text-gray-400">${getTimeData(o.dateOfInquiry).deadlineObj.toLocaleDateString()}</td>
                <td class="px-4 py-3"><span class="px-2 py-1 bg-gray-700 rounded text-xs">${o.status}</span></td>
                <td class="px-4 py-3 text-xs text-indigo-400 hover:underline">View</td>
            </tr>
        `).join('');
    }
}

// --- VIEW ORDER MODAL ---
function viewOrder(id) {
    const orders = JSON.parse(localStorage.getItem('pixelOrders'));
    const index = orders.findIndex(o => o.id === id);
    const o = orders[index];

    document.getElementById('vID').innerText = o.id;
    document.getElementById('vClient').innerText = o.clientName;
    document.getElementById('vStatus').innerText = o.status;
    document.getElementById('vBrand').innerText = o.brandName;
    document.getElementById('vNiche').innerText = o.niche;
    document.getElementById('vColors').innerText = o.colors;
    document.getElementById('vVibe').innerText = o.vibe;
    document.getElementById('vNotes').innerText = o.designNotes || o.ideas || '';
    document.getElementById('vPayStatus').innerText = o.paymentStatus;
    document.getElementById('vTx').innerText = o.transactionId;
    
    const vRef = document.getElementById('vRefLink');
    if(vRef) vRef.href = o.refLink || '#';
    
    const vWa = document.getElementById('vWa');
    if(vWa) vWa.href = `https://wa.me/${o.contact}?text=Hello ${o.clientName}, regarding your Order ${o.id}...`;

    document.getElementById('updateStatusSelect').value = o.status;
    document.getElementById('checkPng').checked = o.pngSent || false;
    document.getElementById('checkSource').checked = o.sourceSent || false;
    document.getElementById('vIndex').value = index;

    document.getElementById('viewModal').classList.add('active');
}

function saveAdminChanges() {
    const idx = document.getElementById('vIndex').value;
    const orders = JSON.parse(localStorage.getItem('pixelOrders'));
    
    orders[idx].status = document.getElementById('updateStatusSelect').value;
    orders[idx].pngSent = document.getElementById('checkPng').checked;
    orders[idx].sourceSent = document.getElementById('checkSource').checked;
    
    if(orders[idx].pngSent && orders[idx].sourceSent) {
        orders[idx].status = 'Completed';
    }

    localStorage.setItem('pixelOrders', JSON.stringify(orders));
    document.getElementById('viewModal').classList.remove('active');
    loadDashboard();
}

function deleteOrder() {
    if(confirm("Permanently delete this order?")) {
        const idx = document.getElementById('vIndex').value;
        const orders = JSON.parse(localStorage.getItem('pixelOrders'));
        orders.splice(idx, 1);
        localStorage.setItem('pixelOrders', JSON.stringify(orders));
        document.getElementById('viewModal').classList.remove('active');
        loadDashboard();
    }
}

// --- CLIENT RENDER ---
function renderClient(orders, email) {
    const myOrders = orders.filter(o => o.userEmail === email);
    const container = document.getElementById('clientOrdersContainer');
    
    if(container) {
        container.innerHTML = myOrders.map((o, idx) => {
            const t = getTimeData(o.dateOfInquiry);
            const globalIdx = orders.findIndex(x => x.id === o.id);

            let btn = '';
            if(o.status === 'Pending') {
                btn = `<button onclick="clientEdit(${globalIdx})" class="w-full mt-2 bg-gray-700 py-2 rounded text-sm hover:bg-gray-600">Edit Brief (Resets Timer)</button>`;
            } else if(o.status === 'Completed' && o.revisionsLeft > 0) {
                btn = `<button onclick="requestRev(${globalIdx})" class="w-full mt-2 bg-yellow-600 py-2 rounded text-sm font-bold">Request Revision (${o.revisionsLeft} Left)</button>`;
            } else if(o.status === 'Completed') {
                btn = `<button class="w-full mt-2 bg-green-600 py-2 rounded text-sm font-bold">Download Files</button>`;
            } else {
                btn = `<button class="w-full mt-2 bg-gray-800 py-2 rounded text-sm text-gray-500 cursor-not-allowed">Design in Progress...</button>`;
            }

            return `
            <div class="glass p-6 rounded-xl border border-gray-700">
                <div class="flex justify-between mb-4">
                    <h3 class="text-xl font-bold">${o.brandName}</h3>
                    <span class="px-2 py-1 bg-indigo-900 rounded text-xs">${o.status}</span>
                </div>
                <div class="bg-black/40 p-4 rounded-lg mb-4">
                    <div class="flex justify-between text-xs text-gray-400 mb-1">
                        <span>Deadline: ${t.deadlineObj.toLocaleString()}</span>
                        <span>${t.text}</span>
                    </div>
                    <div class="w-full bg-gray-700 h-2 rounded-full overflow-hidden">
                        <div class="bg-indigo-500 h-2" style="width: ${o.status==='Completed'?100:t.percent}%"></div>
                    </div>
                </div>
                ${btn}
            </div>`;
        }).join('');
    }
}

function clientEdit(index) {
    const orders = JSON.parse(localStorage.getItem('pixelOrders'));
    document.getElementById('cEditIndex').value = index;
    document.getElementById('cEditNotes').value = orders[index].designNotes || '';
    document.getElementById('clientEditModal').classList.add('active');
}

function submitClientEdit() {
    const idx = document.getElementById('cEditIndex').value;
    const val = document.getElementById('cEditNotes').value;
    const orders = JSON.parse(localStorage.getItem('pixelOrders'));
    
    orders[idx].designNotes = val;
    orders[idx].dateOfInquiry = new Date().toISOString(); // Reset Timer
    localStorage.setItem('pixelOrders', JSON.stringify(orders));
    document.getElementById('clientEditModal').classList.remove('active');
    loadDashboard();
}

function requestRev(index) {
    const reason = prompt("What changes do you need? (Color/Font only)");
    if(!reason) return;
    
    const orders = JSON.parse(localStorage.getItem('pixelOrders'));
    orders[index].status = 'Revisions';
    orders[index].revisionsLeft--;
    orders[index].designNotes += `\n[REV]: ${reason}`;
    
    localStorage.setItem('pixelOrders', JSON.stringify(orders));
    loadDashboard();
}

// --- UTILS ---
function closeViewModal() { document.getElementById('viewModal').classList.remove('active'); }
function exportData() {
    const data = localStorage.getItem('pixelOrders');
    const blob = new Blob([data], {type:'application/json'});
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'backup.json';
    a.click();
}
function addPortfolioItem() {
    const url = document.getElementById('portfolioUrl').value;
    if(url) {
        const p = JSON.parse(localStorage.getItem('pixelPortfolio'))||[];
        p.push(url);
        localStorage.setItem('pixelPortfolio',JSON.stringify(p));
        alert("Added!");
    }
}
function printInvoice() { window.print(); }
function logout() { localStorage.removeItem('currentUser'); window.location.href = 'index.html'; }
