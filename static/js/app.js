// Marisquería El Tío Perro POS - Lógica del Cliente Unificada

// Estado Global de la Aplicación
let currentUser = null;
let currentTab = 'waiter';
let tables = [];
let menuItems = [];
let ingredients = [];
let activeOrders = [];
let customers = [];
let staffList = [];

// Estados del Mesero
let selectedTable = null;
let activeMenuCategory = 'Todos';
let orderDraft = {}; // { menuItemId: { quantity, notes } }

// Estados de Cocina
let prevItemsCount = 0;
let kitchenTableFilterVal = 'all';

// Estados de Caja
let selectedGroup = null;
let splitCount = 1;
let splitBase = 'remaining';
let cashierPaymentMethod = 'efectivo';
let selectedCustomerId = '';
let isRegisteringCustomer = false;

// Estados de Admin Sub-pestañas
let adminSubTab = 'metrics';

// --- FUNCIONES DE INCIO Y AUTENTICACIÓN ---

function checkAuth() {
    const token = localStorage.getItem('token');
    const userStr = localStorage.getItem('user');
    
    if (!token || !userStr) {
        handleLogout();
        return false;
    }
    
    currentUser = JSON.parse(userStr);
    document.getElementById('userInfo').textContent = `${currentUser.name} (${currentUser.role})`;
    
    // Configurar pestañas según el rol
    setupTabsByRole();
    return true;
}

function setupTabsByRole() {
    const role = currentUser.role;
    const tabWaiter = document.getElementById('tabBtn-waiter');
    const tabKitchen = document.getElementById('tabBtn-kitchen');
    const tabCashier = document.getElementById('tabBtn-cashier');
    const tabAdmin = document.getElementById('tabBtn-admin');
    
    // Ocultar todas por defecto
    tabWaiter.classList.add('hidden');
    tabKitchen.classList.add('hidden');
    tabCashier.classList.add('hidden');
    tabAdmin.classList.add('hidden');
    
    let defaultTab = 'waiter';
    
    // Elementos de sub-navegación interna de administración
    const subBtnMetrics = document.getElementById('adminSubBtn-metrics');
    const subBtnStaff = document.getElementById('adminSubBtn-staff');
    
    if (role === 'Admin') {
        tabWaiter.classList.remove('hidden');
        tabKitchen.classList.remove('hidden');
        tabCashier.classList.remove('hidden');
        tabAdmin.classList.remove('hidden');
        if (subBtnMetrics) subBtnMetrics.classList.remove('hidden');
        if (subBtnStaff) subBtnStaff.classList.remove('hidden');
        adminSubTab = 'metrics'; // El administrador entra a Métricas por defecto
        defaultTab = 'waiter';
    } else if (role === 'Gerente') {
        tabWaiter.classList.remove('hidden');
        tabKitchen.classList.remove('hidden');
        tabCashier.classList.remove('hidden');
        tabAdmin.classList.remove('hidden');
        if (subBtnMetrics) subBtnMetrics.classList.add('hidden'); // Ocultar Métricas al Gerente
        if (subBtnStaff) subBtnStaff.classList.add('hidden');     // Ocultar Personal al Gerente
        adminSubTab = 'inventory'; // El gerente entra a Inventario por defecto
        defaultTab = 'waiter';
    } else if (role === 'Cajero') {
        tabWaiter.classList.remove('hidden');
        tabCashier.classList.remove('hidden');
        defaultTab = 'cashier';
    } else if (role === 'Mesero') {
        tabWaiter.classList.remove('hidden');
        defaultTab = 'waiter';
    } else if (role === 'Cocina') {
        tabKitchen.classList.remove('hidden');
        defaultTab = 'kitchen';
    }
    
    switchTab(defaultTab);
}

function handleLogout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/login';
}

// --- UTILERÍAS ---

function getHeaders() {
    return {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
    };
}

function showToast(text, type = 'success') {
    const toast = document.getElementById('toastBox');
    const icon = document.getElementById('toastIcon');
    const txt = document.getElementById('toastText');
    
    toast.className = `fixed bottom-6 right-6 z-50 p-4 rounded-2xl border text-sm font-semibold flex items-center gap-2 shadow-2xl transition duration-300 ${
        type === 'success' 
            ? 'bg-emerald-50 border-emerald-250 text-emerald-700' 
            : 'bg-rose-50 border-rose-250 text-rose-700'
    }`;
    
    icon.setAttribute('data-lucide', type === 'success' ? 'check-circle' : 'alert-circle');
    txt.textContent = text;
    lucide.createIcons();
    
    toast.classList.remove('translate-y-12', 'opacity-0');
    toast.classList.add('translate-y-0', 'opacity-100');
    
    // Haptic feedback (Vibración física de respuesta para los meseros)
    try {
        if (navigator.vibrate) {
            if (type === 'success') {
                navigator.vibrate(80); // Vibración corta de confirmación
            } else {
                navigator.vibrate([120, 80, 120]); // Doble vibración de advertencia/error
            }
        }
    } catch (e) {
        console.warn('Vibration API not supported or blocked:', e);
    }
    
    setTimeout(() => {
        toast.classList.remove('translate-y-0', 'opacity-100');
        toast.classList.add('translate-y-12', 'opacity-0');
    }, 3000);
}

// --- NAVEGACIÓN Y CONTROL DE VISTAS ---

function switchTab(tabId) {
    currentTab = tabId;
    
    // Ocultar todas las secciones
    document.querySelectorAll('.app-view').forEach(view => view.classList.add('hidden'));
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('bg-white/20', 'text-white', 'shadow-inner');
        btn.classList.add('text-white/80');
    });
    
    // Mostrar pestaña activa
    const activeView = document.getElementById(`view-${tabId}`);
    if (activeView) activeView.classList.remove('hidden');
    
    const activeBtn = document.getElementById(`tabBtn-${tabId}`);
    if (activeBtn) {
        activeBtn.classList.add('bg-white/20', 'text-white', 'shadow-inner');
        activeBtn.classList.remove('text-white/80');
    }
    
    // Cargar datos respectivos
    if (tabId === 'waiter') loadWaiterData();
    else if (tabId === 'kitchen') {
        loadKitchenData();
        // Desbloquear e inicializar AudioContext en interacción del usuario con la pestaña Cocina
        try {
            const AudioContextClass = window.AudioContext || window.webkitAudioContext;
            if (AudioContextClass) {
                const ctx = new AudioContextClass();
                if (ctx.state === 'suspended') {
                    ctx.resume();
                }
            }
        } catch (e) {}
    }
    else if (tabId === 'cashier') loadCashierData();
    else if (tabId === 'admin') loadAdminData();
}

// --- MÓDULO: MESERO ---

async function loadWaiterData() {
    try {
        const [tablesRes, menuRes, ordersRes] = await Promise.all([
            fetch('/api/tables'),
            fetch('/api/menu-items'),
            fetch('/api/orders', { headers: getHeaders() })
        ]);
        
        tables = await tablesRes.json();
        menuItems = await menuRes.json();
        activeOrders = await ordersRes.json();
        
        renderTables();
    } catch (err) {
        console.error(err);
        showToast('Error al cargar datos del salón.', 'error');
    }
}

function renderSeats(capacity) {
    let seatsHtml = '';
    const radius = 48;
    for (let i = 0; i < capacity; i++) {
        const angle = (i * 360) / capacity;
        const x = Math.cos((angle * Math.PI) / 180) * radius;
        const y = Math.sin((angle * Math.PI) / 180) * radius;
        seatsHtml += `
            <div 
                class="absolute w-3.5 h-3.5 rounded-full bg-[#E8912E]/35 border border-[#E8912E]/55 shadow-sm"
                style="transform: translate(${x}px, ${y}px); top: calc(50% - 7px); left: calc(50% - 7px);"
            ></div>
        `;
    }
    return seatsHtml;
}

function renderTables() {
    const grid = document.getElementById('tablesGrid');
    grid.innerHTML = '';
    
    tables.forEach(table => {
        // Encontrar comandas asociadas
        const tableOrders = activeOrders.filter(o => o.table && (o.table.number === table.number || o.table._id === table._id));
        const totalConsumo = tableOrders.reduce((sum, o) => sum + o.total, 0);
        
        const card = document.createElement('div');
        const isOcupada = table.status === 'ocupada';
        
        card.className = `glass-panel rounded-3xl p-6 transition-all duration-300 relative group flex flex-col justify-between shadow-md hover:shadow-xl hover:-translate-y-1 ${
            isOcupada 
                ? 'border-rose-300 hover:border-rose-450 bg-white/50' 
                : 'border-emerald-300 hover:border-emerald-450 bg-white/50'
        }`;
        
        card.innerHTML = `
            <div class="flex items-center justify-between mb-2">
                <div>
                    <h3 class="text-lg font-black text-brand-header flex items-center gap-1.5">
                        <span class="w-2.5 h-2.5 rounded-full ${isOcupada ? 'bg-rose-500 animate-pulse' : 'bg-emerald-500'}"></span>
                        <span>Mesa ${table.number}</span>
                    </h3>
                    <div class="flex items-center gap-1.5 text-xs text-slate-500 mt-1 font-bold">
                        <i data-lucide="users" style="width: 14px; height: 14px; display: inline-block; vertical-align: middle;"></i>
                        <span>Capacidad: ${table.capacity} pax</span>
                    </div>
                    ${isOcupada 
                        ? `<div class="mt-1 text-xs font-black text-[#E8912E] flex items-center gap-0.5">
                             <i data-lucide="dollar-sign" style="width: 14px; height: 14px; display: inline-block; vertical-align: middle;"></i>
                             <span>Consumo: $${totalConsumo.toFixed(2)}</span>
                           </div>`
                        : ''
                    }
                </div>
                
                <span class="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border shadow-sm flex items-center gap-1.5 ${
                    isOcupada ? 'bg-rose-100 text-rose-700 border-rose-200' : 'bg-emerald-100 text-emerald-700 border-emerald-200'
                }">
                    <i data-lucide="${isOcupada ? 'alert-circle' : 'check'}" style="width: 12px; height: 12px; display: inline-block; vertical-align: middle;"></i>
                    <span>${table.status}</span>
                </span>
            </div>
            
            <!-- Mesa circular interactiva -->
            <div class="relative h-44 flex items-center justify-center my-4">
                ${renderSeats(table.capacity)}
                <div 
                    onclick="event.stopPropagation(); ${isOcupada ? `openWaiterOrderModal(${table.number})` : `occupyTable(${table.number})`}"
                    class="w-24 h-24 rounded-full flex flex-col items-center justify-center cursor-pointer shadow-lg transition-all duration-300 transform active:scale-95 z-10 select-none relative ${
                        isOcupada 
                            ? 'bg-rose-55 border-2 border-rose-500 text-rose-800 shadow-rose-900/10 hover:bg-rose-100'
                            : 'bg-emerald-55 border-2 border-emerald-500 text-emerald-800 shadow-emerald-900/10 hover:bg-emerald-100'
                    }"
                >
                    <div class="absolute inset-0 rounded-full border-2 border-[#E8912E]/10"></div>
                    <i data-lucide="fish" class="w-6 h-6 mb-1 z-10 text-[#0B525B]"></i>
                    <span class="text-2xl font-black z-10 text-brand-header">${table.number}</span>
                </div>
            </div>
            
            <!-- Acciones del Mesero -->
            <div class="grid grid-cols-2 gap-2 mt-2 font-bold text-xs">
                <button onclick="openWaiterOrderModal(${table.number}); event.stopPropagation();" class="py-2.5 px-3 rounded-xl bg-slate-100 hover:bg-[#E8912E] hover:text-white text-brand-header hover:border-[#E8912E] transition duration-200 border border-slate-200 cursor-pointer flex items-center justify-center gap-1">
                    <i data-lucide="clipboard-list" class="w-3.5 h-3.5"></i>
                    <span>Comanda</span>
                </button>
                ${isOcupada 
                    ? `<button onclick="releaseTable(${table.number}); event.stopPropagation();" class="py-2.5 px-3 rounded-xl bg-rose-50 hover:bg-rose-500 text-rose-700 hover:text-white border border-rose-250 transition duration-200 cursor-pointer flex items-center justify-center gap-1">
                        <i data-lucide="user-minus" class="w-3.5 h-3.5"></i>
                        <span>Liberar</span>
                       </button>`
                    : `<button onclick="occupyTable(${table.number}); event.stopPropagation();" class="py-2.5 px-3 rounded-xl bg-emerald-50 hover:bg-emerald-500 text-emerald-700 hover:text-white border border-emerald-250 transition duration-200 cursor-pointer flex items-center justify-center gap-1">
                        <i data-lucide="user-plus" class="w-3.5 h-3.5"></i>
                        <span>Ocupar</span>
                       </button>`
                }
            </div>
        `;
        
        grid.appendChild(card);
    });
    
    lucide.createIcons();
}

async function occupyTable(num) {
    try {
        const res = await fetch(`/api/tables/${num}/status`, {
            method: 'PATCH',
            headers: getHeaders(),
            body: JSON.stringify({ status: 'ocupada' })
        });
        if (res.ok) {
            showToast(`Mesa ${num} marcada como ocupada.`);
            loadWaiterData();
        } else {
            const err = await res.json();
            showToast(err.message, 'error');
        }
    } catch (err) {
        showToast('Error de conexión.', 'error');
    }
}

async function releaseTable(num) {
    if (!confirm(`¿Estás seguro de liberar la Mesa ${num}? Se creará automáticamente un pago en efectivo por el saldo restante.`)) return;
    try {
        const res = await fetch(`/api/tables/${num}/status`, {
            method: 'PATCH',
            headers: getHeaders(),
            body: JSON.stringify({ status: 'libre' })
        });
        if (res.ok) {
            showToast(`Mesa ${num} liberada de forma limpia.`);
            loadWaiterData();
        } else {
            const err = await res.json();
            showToast(err.message, 'error');
        }
    } catch (err) {
        showToast('Error de conexión.', 'error');
    }
}

function openWaiterOrderModal(tableNum) {
    selectedTable = tables.find(t => t.number === tableNum);
    orderDraft = {};
    activeMenuCategory = 'Todos';
    
    document.getElementById('orderModalTitle').innerHTML = `<i data-lucide="clipboard-list" class="w-5 h-5 text-[#0B525B]"></i> Comanda - Mesa ${tableNum}`;
    
    // Mostrar consumido antes si la mesa está ocupada
    const tableOrders = activeOrders.filter(o => o.table && o.table.number === tableNum);
    const beforeGroup = document.getElementById('consumidoAntesGroup');
    const beforeList = document.getElementById('consumidoAntesList');
    
    if (tableOrders.length > 0) {
        beforeGroup.classList.remove('hidden');
        beforeList.innerHTML = '';
        tableOrders.forEach(order => {
            order.items.forEach(item => {
                const statusColor = item.status === 'entregado' ? 'text-emerald-600 bg-emerald-50' : item.status === 'en preparación' ? 'text-amber-600 bg-amber-50' : item.status === 'cancelado' ? 'text-rose-600 bg-rose-50' : 'text-slate-500 bg-slate-150';
                
                // Mostrar botón de cancelar si es Admin/Gerente y el plato no está cancelado ni entregado
                const canCancel = (currentUser.role === 'Admin' || currentUser.role === 'Gerente') && item.status !== 'cancelado' && item.status !== 'entregado';
                const cancelBtn = canCancel 
                    ? `<button onclick="cancelComandaItem('${order._id}', '${item._id}', '${item.menuItem?.name || 'Platillo'}')" class="p-1 rounded bg-rose-50 hover:bg-rose-100 text-rose-600 cursor-pointer ml-2 transition flex items-center justify-center" title="Cancelar platillo">
                        <i data-lucide="minus-circle" style="width: 12px; height: 12px; display: inline-block;"></i>
                       </button>`
                    : '';
                
                beforeList.innerHTML += `
                    <div class="flex justify-between items-center py-1.5 border-b border-slate-100 last:border-0 text-xs">
                        <span class="${item.status === 'cancelado' ? 'line-through text-slate-400 font-normal' : ''}">${item.quantity}x ${item.menuItem?.name}</span>
                        <div class="flex items-center gap-1.5">
                            <span class="px-1.5 py-0.5 rounded text-[8px] font-black uppercase ${statusColor}">${item.status}</span>
                            ${cancelBtn}
                        </div>
                    </div>
                `;
            });
        });
    } else {
        beforeGroup.classList.add('hidden');
    }
    
    renderMenuForWaiter();
    renderWaiterDraft();
    
    document.getElementById('waiterOrderModal').classList.remove('hidden');
    lucide.createIcons();
}

function closeWaiterOrderModal() {
    document.getElementById('waiterOrderModal').classList.add('hidden');
}

async function cancelComandaItem(orderId, itemId, itemName) {
    if (!confirm(`¿Estás seguro de cancelar 1x ${itemName} de esta comanda?\nSe descontará su precio del total e reintegrará el inventario.`)) return;
    
    try {
        const response = await fetch(`/api/orders/${orderId}/items/${itemId}/status`, {
            method: 'PATCH',
            headers: getHeaders(),
            body: JSON.stringify({ status: 'cancelado' })
        });
        
        if (response.ok) {
            showToast(`Platillo "${itemName}" cancelado con éxito.`);
            const currentTableNum = selectedTable.number;
            await loadWaiterData(); // Recarga las comandas activas
            openWaiterOrderModal(currentTableNum); // Refresca la modal
        } else {
            const err = await response.json();
            showToast(err.message, 'error');
        }
    } catch (err) {
        showToast('Error de conexión al cancelar platillo.', 'error');
    }
}

function setMenuCategoryFilter(cat) {
    activeMenuCategory = cat;
    ['all', 'ent', 'esp', 'bev'].forEach(id => {
        document.getElementById(`catBtn-${id}`).className = "flex-1 py-1 rounded transition text-center";
    });
    
    const activeId = cat === 'Todos' ? 'all' : cat === 'Entradas' ? 'ent' : cat === 'Especialidades' ? 'esp' : 'bev';
    document.getElementById(`catBtn-${activeId}`).className = "flex-1 py-1 rounded transition text-center bg-white shadow-sm text-slate-800 font-black";
    
    renderMenuForWaiter();
}

function renderMenuForWaiter() {
    const grid = document.getElementById('menuItemsGrid');
    grid.innerHTML = '';
    
    const filtered = menuItems.filter(item => activeMenuCategory === 'Todos' || item.category === activeMenuCategory);
    
    filtered.forEach(item => {
        const draftItem = orderDraft[item._id] || { quantity: 0 };
        
        const card = document.createElement('div');
        card.className = "flex justify-between items-center bg-slate-50 p-2.5 rounded-xl border border-slate-100 hover:border-slate-200 transition text-xs font-semibold text-slate-800";
        card.innerHTML = `
            <div>
                <p class="font-bold text-slate-900">${item.name}</p>
                <p class="text-[10px] text-[#0B525B] font-extrabold">$${item.price.toFixed(2)} • <span class="text-slate-400 font-medium">${item.category}</span></p>
            </div>
            <div class="flex items-center gap-2">
                ${draftItem.quantity > 0 
                    ? `<button onclick="changeDraftQty('${item._id}', -1)" class="w-6 h-6 rounded bg-slate-200 hover:bg-slate-350 flex items-center justify-center cursor-pointer text-brand-header font-black"><i data-lucide="minus" class="w-3 h-3"></i></button>
                       <span class="font-black text-sm w-4 text-center">${draftItem.quantity}</span>`
                    : ''
                }
                <button onclick="changeDraftQty('${item._id}', 1)" class="w-6 h-6 rounded bg-[#0B525B] text-white hover:bg-[#0B525B]/90 flex items-center justify-center cursor-pointer"><i data-lucide="plus" class="w-3 h-3"></i></button>
            </div>
        `;
        grid.appendChild(card);
    });
    lucide.createIcons();
}

function changeDraftQty(itemId, amount) {
    if (!orderDraft[itemId]) {
        orderDraft[itemId] = { quantity: 0, notes: '' };
    }
    
    orderDraft[itemId].quantity += amount;
    
    if (orderDraft[itemId].quantity <= 0) {
        delete orderDraft[itemId];
    }
    
    renderMenuForWaiter();
    renderWaiterDraft();
}

function renderWaiterDraft() {
    const list = document.getElementById('orderDraftList');
    list.innerHTML = '';
    
    let total = 0.0;
    const keys = Object.keys(orderDraft);
    
    if (keys.length === 0) {
        list.innerHTML = '<p class="text-slate-400 text-center py-6">El borrador está vacío.</p>';
        document.getElementById('draftTotalText').textContent = '$0.00';
        return;
    }
    
    keys.forEach(id => {
        const item = menuItems.find(m => m._id === id);
        if (!item) return;
        
        const draft = orderDraft[id];
        total += item.price * draft.quantity;
        
        const row = document.createElement('div');
        row.className = "flex flex-col bg-white border border-slate-100 rounded-xl p-2.5 gap-1.5 shadow-sm";
        row.innerHTML = `
            <div class="flex justify-between items-center font-bold">
                <span>${draft.quantity}x ${item.name}</span>
                <span class="text-[#0B525B] font-black">$${(item.price * draft.quantity).toFixed(2)}</span>
            </div>
            <input 
                type="text" 
                placeholder="Ej. Sin cebolla..." 
                value="${draft.notes}" 
                onchange="updateDraftNotes('${id}', this.value)"
                class="w-full px-2 py-1 border border-slate-200 rounded-lg text-[10px] outline-none"
            >
        `;
        list.appendChild(row);
    });
    
    document.getElementById('draftTotalText').textContent = `$${total.toFixed(2)}`;
}

function updateDraftNotes(itemId, val) {
    if (orderDraft[itemId]) {
        orderDraft[itemId].notes = val;
    }
}

// Intentar guardar comanda localmente (IndexedDB) si falla la red, o enviar a servidor
async function submitWaiterOrder() {
    const keys = Object.keys(orderDraft);
    if (keys.length === 0) {
        showToast('El borrador está vacío.', 'error');
        return;
    }
    
    const items = keys.map(id => ({
        menuItem: id,
        quantity: orderDraft[id].quantity,
        notes: orderDraft[id].notes
    }));
    
    const payload = {
        tableNumber: selectedTable.number,
        items
    };
    
    try {
        const response = await fetch('/api/orders', {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify(payload)
        });
        
        if (response.ok) {
            showToast('¡Comanda enviada a cocina!');
            closeWaiterOrderModal();
            loadWaiterData();
        } else {
            const err = await response.json();
            showToast(err.message, 'error');
        }
    } catch (error) {
        console.warn('Fallo de red detectado en comanda. Intentando guardado offline en IndexedDB.');
        
        // Intentar guardar en IndexedDB (PWA Offline)
        try {
            if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
                // Abrir IndexedDB e insertar
                const request = indexedDB.open('TioPerroPOS', 1);
                request.onsuccess = (event) => {
                    const db = event.target.result;
                    const transaction = db.transaction('offline-orders', 'readwrite');
                    const store = transaction.objectStore('offline-orders');
                    store.add({
                        data: payload,
                        authHeader: `Bearer ${localStorage.getItem('token')}`,
                        timestamp: Date.now()
                    });
                    
                    showToast('Comanda guardada localmente (Modo Offline). Se enviará al volver la red.', 'success');
                    closeWaiterOrderModal();
                    
                    // Modificar estado en local
                    const tbl = tables.find(t => t.number === selectedTable.number);
                    if (tbl) {
                        tbl.status = 'ocupada';
                        renderTables();
                    }
                };
            } else {
                showToast('Error de conexión y la app offline no está activa.', 'error');
            }
        } catch (dbErr) {
            showToast('Error al procesar comanda sin conexión.', 'error');
        }
    }
}

// --- MÓDULO: MONITOR DE COCINA ---

function setKitchenArea(area) {
    // Ya no se requiere filtrar por pestañas. Se muestra todo unificado.
}

function filterKitchenByTable(val) {
    kitchenTableFilterVal = val;
    renderKitchenOrders();
}

async function loadKitchenData() {
    try {
        const response = await fetch('/api/orders', { headers: getHeaders() });
        if (response.ok) {
            const data = await response.json();
            // Filtrar solo las que están abiertas (en preparación/pendientes)
            activeOrders = data.filter(o => o.status === 'abierta');
            renderKitchenOrders();
        }
    } catch (err) {
        console.error(err);
    }
}

// Reproducción timbre cocina ("ding-ding")
const playKitchenBell = () => {
    try {
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        if (!AudioContextClass) return;
        const ctx = new AudioContextClass();
        
        const playTone = (freq, startTime, duration, vol) => {
            const osc = ctx.createOscillator();
            const gainNode = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, startTime);
            gainNode.gain.setValueAtTime(vol, startTime);
            gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
            osc.connect(gainNode);
            gainNode.connect(ctx.destination);
            osc.start(startTime);
            osc.stop(startTime + duration);
        };

        const now = ctx.currentTime;
        playTone(880, now, 0.4, 0.2);
        playTone(1760, now, 0.4, 0.08);
        playTone(880, now + 0.15, 0.5, 0.2);
        playTone(1760, now + 0.15, 0.5, 0.08);
    } catch (err) {
        console.warn('Fallo en reproducción de audio de cocina:', err);
    }
};

function renderKitchenOrders() {
    const container = document.getElementById('kitchenOrdersList');
    container.innerHTML = '';
    
    // Agrupar items de todas las estaciones
    let itemsInArea = [];
    
    activeOrders.forEach(order => {
        order.items.forEach(item => {
            if (item.status !== 'entregado' && item.status !== 'cancelado') {
                itemsInArea.push({
                    orderId: order._id,
                    tableNumber: order.table?.number || 'S/N',
                    itemId: item._id,
                    name: item.menuItem?.name || 'Platillo',
                    quantity: item.quantity,
                    notes: item.notes,
                    status: item.status,
                    area: item.area || 'Cocina Caliente',
                    createdAt: order.createdAt
                });
            }
        });
    });
    
    // Ordenar por fecha de creación (FIFO: más viejos primero)
    itemsInArea.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    
    // Obtener mesas únicas activas para el filtro
    const activeTables = [...new Set(itemsInArea.map(item => String(item.tableNumber)))].sort((a, b) => {
        const na = parseInt(a), nb = parseInt(b);
        if (isNaN(na) || isNaN(nb)) return a.localeCompare(b);
        return na - nb;
    });
    
    // Poblar selector de mesas en cocina
    const selectEl = document.getElementById('kitchenTableFilter');
    if (selectEl) {
        const prevVal = kitchenTableFilterVal;
        selectEl.innerHTML = '<option value="all">Todas</option>';
        activeTables.forEach(tNum => {
            const opt = document.createElement('option');
            opt.value = tNum;
            opt.textContent = `Mesa ${tNum}`;
            selectEl.appendChild(opt);
        });
        if (activeTables.includes(prevVal)) {
            kitchenTableFilterVal = prevVal;
            selectEl.value = prevVal;
        } else {
            kitchenTableFilterVal = 'all';
            selectEl.value = 'all';
        }
    }
    
    // Aplicar filtro si corresponde
    if (kitchenTableFilterVal !== 'all') {
        itemsInArea = itemsInArea.filter(item => String(item.tableNumber) === kitchenTableFilterVal);
    }
    
    // Timbre si entran platillos nuevos
    if (itemsInArea.length > prevItemsCount) {
        if (prevItemsCount > 0) {
            playKitchenBell();
        }
    }
    prevItemsCount = itemsInArea.length;
    
    if (itemsInArea.length === 0) {
        container.innerHTML = `
            <div class="col-span-full py-16 text-center border border-dashed border-slate-200 rounded-3xl bg-white/20">
                <p class="text-slate-400 text-sm font-semibold">No hay órdenes pendientes en ninguna estación.</p>
            </div>
        `;
        return;
    }
    
    // Renderizar tarjetas por comanda individual
    itemsInArea.forEach(item => {
        const card = document.createElement('div');
        const isPreparing = item.status === 'en preparación';
        
        card.className = `glass-panel rounded-3xl p-5 border shadow-md flex flex-col justify-between min-h-36 transition duration-200 ${
            isPreparing 
                ? 'border-amber-300 hover:border-amber-450 bg-amber-50/15 shadow-amber-900/5' 
                : 'border-rose-300 hover:border-rose-450 bg-rose-50/15 shadow-rose-900/5'
        }`;
        
        // Calcular tiempo transcurrido
        const elapsedMin = Math.round((new Date() - new Date(item.createdAt)) / 60000);
        
        // Icono y estilo de área de preparación
        let areaIcon = 'flame';
        let areaStyle = 'bg-orange-50 text-orange-700 border-orange-200';
        
        if (item.area === 'Barra Fría') {
            areaIcon = 'snowflake';
            areaStyle = 'bg-sky-50 text-sky-700 border-sky-200';
        } else if (item.area === 'Bebidas') {
            areaIcon = 'cup-soda';
            areaStyle = 'bg-indigo-50 text-indigo-700 border-indigo-200';
        }
        
        card.innerHTML = `
            <div>
                <div class="flex justify-between items-center mb-3">
                    <div class="flex flex-wrap items-center gap-1.5">
                        <span class="text-lg font-black text-[#002B30] flex items-center gap-1.5">
                            <span>Mesa ${item.tableNumber}</span>
                        </span>
                        <span class="text-[10px] text-slate-500 font-bold flex items-center gap-0.5 bg-slate-100/80 px-2 py-0.5 rounded-full border border-slate-200">
                            <i data-lucide="clock" style="width: 12px; height: 12px; display: inline-block; vertical-align: middle;"></i> ${elapsedMin} min
                        </span>
                        <span class="text-[10px] font-bold flex items-center gap-0.5 px-2 py-0.5 rounded-full border ${areaStyle}">
                            <i data-lucide="${areaIcon}" style="width: 12px; height: 12px; display: inline-block; vertical-align: middle;"></i> ${item.area}
                        </span>
                    </div>
                    
                    ${isPreparing 
                        ? `<span class="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-100 text-amber-700 border border-amber-250 flex items-center gap-1 shadow-sm">
                             <span class="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                             <span>Preparando</span>
                           </span>`
                        : `<span class="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-rose-100 text-rose-700 border border-rose-250 flex items-center gap-1 shadow-sm">
                             <span class="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse"></span>
                             <span>Pendiente</span>
                           </span>`
                    }
                </div>
                <div class="my-2 text-sm text-[#002B30]">
                    <p class="font-extrabold text-base flex items-baseline gap-1">
                        <span class="text-brand-secondary">${item.quantity}x</span> ${item.name}
                    </p>
                    ${item.notes ? `<p class="text-xs text-rose-600 font-bold mt-1 bg-rose-50 border border-rose-100 rounded-lg p-1.5"><span class="uppercase text-[9px] text-rose-500 font-black block">Nota:</span>${item.notes}</p>` : ''}
                </div>
            </div>
            
            <div class="border-t border-slate-100 pt-3 mt-3 flex justify-end">
                ${isPreparing 
                    ? `<button onclick="updateKitchenItemStatus('${item.orderId}', '${item.itemId}', 'entregado')" class="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl shadow-md hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0 cursor-pointer transition flex items-center justify-center gap-1.5">
                        <i data-lucide="check-circle" class="w-4 h-4"></i> Marcar como Listo / Entregado
                       </button>`
                    : `<button onclick="updateKitchenItemStatus('${item.orderId}', '${item.itemId}', 'en preparación')" class="w-full py-2.5 bg-[#0B525B] hover:bg-[#0B525B]/90 text-white font-extrabold text-xs rounded-xl shadow-md hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0 cursor-pointer transition flex items-center justify-center gap-1.5">
                        <i data-lucide="play" class="w-4 h-4"></i> Empezar Preparación
                       </button>`
                }
            </div>
        `;
        
        container.appendChild(card);
    });
    lucide.createIcons();
}

async function updateKitchenItemStatus(orderId, itemId, newStatus) {
    try {
        const response = await fetch(`/api/orders/${orderId}/items/${itemId}/status`, {
            method: 'PATCH',
            headers: getHeaders(),
            body: JSON.stringify({ status: newStatus })
        });
        if (response.ok) {
            showToast(newStatus === 'entregado' ? 'Platillo entregado con éxito.' : 'Platillo en preparación.');
            loadKitchenData();
        } else {
            const err = await response.json();
            showToast(err.message, 'error');
        }
    } catch (err) {
        showToast('Error al conectar con la API de cocina.', 'error');
    }
}

// --- MÓDULO: CAJA TERMINAL ---

async function loadCashierData() {
    try {
        const [ordersRes, customersRes] = await Promise.all([
            fetch('/api/orders', { headers: getHeaders() }),
            fetch('/api/customers', { headers: getHeaders() })
        ]);
        
        activeOrders = await ordersRes.json();
        customers = await customersRes.json();
        
        renderCashierAccounts();
        if (selectedGroup) {
            // Recargar datos del grupo seleccionado
            const freshGroup = getGroupedOrders().find(g => g.tableNumber === selectedGroup.tableNumber);
            if (freshGroup) {
                selectGroup(freshGroup);
            } else {
                closeCashierDetails();
            }
        }
    } catch (err) {
        showToast('Error al obtener comandas para caja.', 'error');
    }
}

function getGroupedOrders() {
    const groups = {};
    const openOrders = activeOrders.filter(o => o.status === 'abierta');
    
    openOrders.forEach(order => {
        const tableNum = order.table?.number || 'S/N';
        if (!groups[tableNum]) {
            groups[tableNum] = {
                tableNumber: tableNum,
                tableId: order.table?._id,
                orders: [],
                items: [],
                total: 0,
                totalPaid: 0,
                remaining: 0,
                paymentStatus: 'pending'
            };
        }
        
        groups[tableNum].orders.push(order);
        groups[tableNum].total += order.total;
        groups[tableNum].totalPaid += order.totalPaid || 0;
        groups[tableNum].remaining += order.remaining !== undefined ? order.remaining : order.total;
        
        // Consolidar platillos
        order.items.forEach(item => {
            const menuItemId = item.menuItem?._id;
            const existing = groups[tableNum].items.find(i => i.menuItem?._id === menuItemId && i.notes === item.notes);
            if (existing) {
                existing.quantity += item.quantity;
            } else {
                groups[tableNum].items.push({ ...item });
            }
        });
        
        if (order.paymentStatus === 'partial') {
            groups[tableNum].paymentStatus = 'partial';
        }
    });
    
    return Object.values(groups).sort((a, b) => {
        if (typeof a.tableNumber === 'number' && typeof b.tableNumber === 'number') {
            return a.tableNumber - b.tableNumber;
        }
        return String(a.tableNumber).localeCompare(String(b.tableNumber));
    });
}

function renderCashierAccounts() {
    const container = document.getElementById('cashierAccountsList');
    container.innerHTML = '';
    
    const groups = getGroupedOrders();
    if (groups.length === 0) {
        container.innerHTML = `
            <div class="col-span-full py-16 text-center border border-dashed border-slate-200 rounded-3xl bg-white/20">
                <p class="text-slate-400 text-sm font-semibold">No hay mesas activas con comanda en este momento.</p>
            </div>
        `;
        return;
    }
    
    groups.forEach(group => {
        const isSelected = selectedGroup && selectedGroup.tableNumber === group.tableNumber;
        const card = document.createElement('div');
        card.className = `glass-panel rounded-3xl p-5 border cursor-pointer hover:shadow-md transition flex flex-col justify-between h-48 border-slate-200 bg-white/50 ${
            isSelected ? 'ring-2 ring-[#0B525B] border-[#0B525B]' : 'hover:border-slate-350'
        }`;
        
        const isPartial = group.paymentStatus === 'partial';
        
        card.innerHTML = `
            <div>
                <div class="flex justify-between items-center mb-3">
                    <span class="font-black text-brand-header text-lg flex items-center gap-1.5">
                        <span class="w-2.5 h-2.5 rounded-full ${isPartial ? 'bg-amber-500' : 'bg-[#0B525B]'}"></span>
                        <span>Mesa ${group.tableNumber}</span>
                    </span>
                    <span class="px-2 py-0.5 rounded text-[10px] font-black uppercase flex items-center gap-1 border ${
                        isPartial ? 'bg-amber-100 text-amber-700 border-amber-250' : 'bg-slate-100 text-slate-600 border-slate-200'
                    }">
                        ${isPartial ? 'Abono Parcial' : 'Sin Pagar'}
                    </span>
                </div>
                
                <div class="border-t border-slate-150/10 pt-3 my-2 text-xs text-slate-600 max-h-20 overflow-y-auto pr-1">
                    ${group.items.map(item => `
                        <div class="flex justify-between py-0.5">
                            <span>${item.quantity}x ${item.menuItem?.name}</span>
                            <span class="font-bold text-slate-800">$${((item.menuItem?.price || 0) * item.quantity).toFixed(2)}</span>
                        </div>
                    `).join('')}
                </div>
            </div>
            
            <div class="border-t border-slate-150/10 pt-3 mt-3 flex justify-between items-baseline font-black text-slate-700">
                <span class="text-xs text-slate-400 font-semibold">Saldo Restante:</span>
                <span class="text-xl text-[#0B525B] flex items-baseline font-bold">
                    <i data-lucide="dollar-sign" class="w-4 h-4"></i>${group.remaining.toFixed(2)}
                </span>
            </div>
        `;
        
        card.onclick = () => selectGroup(group);
        container.appendChild(card);
    });
    lucide.createIcons();
}

async function selectGroup(group) {
    selectedGroup = group;
    
    // Volver a renderizar lista para aplicar anillo de selección
    renderCashierAccounts();
    
    // Obtener abonos
    let groupPayments = [];
    try {
        for (const order of group.orders) {
            const res = await fetch(`/api/payments/order/${order._id}`, { headers: getHeaders() });
            if (res.ok) {
                const data = await res.json();
                groupPayments.push(...data);
            }
        }
    } catch (err) {
        console.error(err);
    }
    
    // Calcular cuenta dividida
    const col = document.getElementById('cashierDetailsCol');
    col.innerHTML = `
        <form onsubmit="handleCashierPaymentSubmit(event)" class="flex flex-col gap-4">
            <div class="bg-brand-header/5 rounded-2xl p-4 border border-[#0B525B]/10 flex flex-col gap-1.5">
                <span class="text-xs text-slate-400 font-bold uppercase tracking-wider block mb-1">Mesa Seleccionada</span>
                <div class="flex justify-between items-center">
                    <span class="text-2xl font-black text-brand-header flex items-center gap-1.5">
                        <span class="w-2.5 h-2.5 rounded-full bg-brand-primary"></span>
                        <span>Mesa ${group.tableNumber}</span>
                    </span>
                    <span class="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-slate-100 text-slate-600 border border-slate-200">
                        ${group.paymentStatus === 'partial' ? 'Abono Parcial' : 'Sin Pagar'}
                    </span>
                </div>
                
                <div class="border-t border-slate-200 mt-3 pt-3 flex flex-col gap-1.5 text-xs text-slate-600">
                    <div class="flex justify-between">
                        <span>Total comanda:</span>
                        <span class="font-bold text-slate-800">$${group.total.toFixed(2)}</span>
                    </div>
                    ${group.totalPaid > 0 ? `
                    <div class="flex justify-between text-emerald-600">
                        <span>Total abonado:</span>
                        <span class="font-bold">$${group.totalPaid.toFixed(2)}</span>
                    </div>` : ''}
                    <div class="flex justify-between items-baseline border-t border-slate-200 pt-2 mt-1 font-black text-sm text-[#0B525B]">
                        <span>Restante por pagar:</span>
                        <span class="text-xl font-extrabold flex items-center gap-0.5">$${group.remaining.toFixed(2)}</span>
                    </div>
                </div>
            </div>

            <!-- Historial de Abonos -->
            ${groupPayments.length > 0 ? `
            <div class="bg-[#0B525B]/5 border border-[#0B525B]/10 rounded-2xl p-4 flex flex-col gap-2 text-xs">
                <h4 class="font-black text-brand-header uppercase tracking-wider mb-1 flex items-center gap-1">
                    <i data-lucide="coins" class="w-4 h-4 text-[#0B525B]"></i> Historial de Abonos
                </h4>
                <div class="flex flex-col gap-1.5 max-h-24 overflow-y-auto pr-1">
                    ${groupPayments.map(p => `
                        <div class="flex justify-between items-center py-1 border-b border-slate-100 last:border-0 text-slate-600">
                            <span class="capitalize flex items-center gap-1.5">
                                ${p.method === 'tarjeta' ? '💳 Tarjeta' : '💵 Efectivo'}
                                • ${new Date(p.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                            </span>
                            <span class="font-bold text-slate-800">$${p.amount.toFixed(2)}</span>
                        </div>
                    `).join('')}
                </div>
            </div>` : ''}

            <!-- Calculadora Cuenta Dividida -->
            <div class="bg-[#0B525B]/5 border border-[#0B525B]/10 rounded-2xl p-4 flex flex-col gap-3">
                <div class="flex justify-between items-center">
                    <span class="text-xs font-bold text-brand-header uppercase tracking-wider">Dividir Cuenta</span>
                    <span class="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-[#5CA8B5]/20 text-[#0B525B]">Calculadora</span>
                </div>
                
                <div class="grid grid-cols-2 gap-2 text-[10px] font-bold">
                    <button type="button" onclick="setCashierSplitBase('remaining')" id="splitBaseBtn-rem" class="py-1.5 px-2 rounded-lg border transition">Dividir Restante</button>
                    <button type="button" onclick="setCashierSplitBase('total')" id="splitBaseBtn-tot" class="py-1.5 px-2 rounded-lg border transition">Dividir Total</button>
                </div>
                
                <div class="flex items-center justify-between bg-white rounded-xl p-2 border border-[#0B525B]/10">
                    <span class="text-xs font-bold text-slate-600 flex items-center gap-1">👥 Personas (Pax):</span>
                    <div class="flex items-center gap-3">
                        <button type="button" onclick="changeSplitCount(-1)" class="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 text-brand-header font-black flex items-center justify-center cursor-pointer select-none">-</button>
                        <span id="splitCountText" class="font-black text-brand-header text-sm w-4 text-center">1</span>
                        <button type="button" onclick="changeSplitCount(1)" class="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 text-brand-header font-black flex items-center justify-center cursor-pointer select-none">+</button>
                    </div>
                </div>
                
                <div id="splitCalculatorResult" class="border-t border-[#0B525B]/10 pt-3 flex flex-col gap-2">
                    <!-- Detalle Calculadora -->
                </div>
            </div>

            <!-- Cliente Lealtad -->
            <div class="bg-[#0B525B]/5 border border-[#0B525B]/10 rounded-2xl p-4 flex flex-col gap-3">
                <div class="flex justify-between items-center">
                    <label class="text-xs font-bold text-brand-header uppercase tracking-wider flex items-center gap-1">🎁 Cliente Lealtad</label>
                    <button type="button" onclick="toggleCashierRegisterCustomer()" id="toggleCustRegisterBtn" class="text-[10px] font-black text-[#E8912E] hover:underline cursor-pointer flex items-center gap-0.5">+ Registrar</button>
                </div>
                <div id="cashierCustomerArea">
                    <select id="cashierCustomerIdSelect" class="w-full py-2.5 px-3 rounded-xl border border-slate-200 focus:outline-none bg-white text-slate-700 font-bold text-xs">
                        <option value="">-- Sin Cliente Asociado --</option>
                        ${customers.map(c => `<option value="${c._id}">${c.name} (${c.phone}) - ${c.loyaltyPoints} pts</option>`).join('')}
                    </select>
                </div>
            </div>

            <!-- Método de Pago -->
            <div class="flex flex-col gap-1.5">
                <label class="text-xs font-bold text-slate-600 uppercase">Método de Pago</label>
                <div class="grid grid-cols-2 gap-2 font-bold">
                    <button type="button" onclick="setCashierPaymentMethod('efectivo')" id="payMethodBtn-cash" class="py-2.5 rounded-xl text-xs border cursor-pointer transition">💵 Efectivo</button>
                    <button type="button" onclick="setCashierPaymentMethod('tarjeta')" id="payMethodBtn-card" class="py-2.5 rounded-xl text-xs border cursor-pointer transition">💳 Tarjeta</button>
                </div>
            </div>

            <!-- Monto a Recibir -->
            <div>
                <label class="block text-xs font-bold text-slate-600 uppercase mb-1">Monto a Cobrar ($)</label>
                <input type="number" step="any" id="cashierAmountInput" placeholder="0.00" class="w-full px-4 py-3 border border-slate-200 rounded-xl focus:border-[#0B525B] focus:ring-1 focus:ring-[#0B525B]/20 outline-none text-base font-extrabold text-slate-800" required>
            </div>

            <button type="submit" class="w-full mt-2 py-3 bg-[#0B525B] hover:bg-[#0B525B]/90 text-white font-extrabold text-sm rounded-2xl shadow-md cursor-pointer transition flex items-center justify-center gap-1.5">
                <i data-lucide="check-circle" class="w-4.5 h-4.5"></i> Registrar Cobro
            </button>
        </form>
    `;
    
    // Inicializar estados visuales de la calculadora y pago
    splitCount = 1;
    splitBase = 'remaining';
    cashierPaymentMethod = 'efectivo';
    isRegisteringCustomer = false;
    
    updateSplitCalculator();
    updateCashierPaymentMethodUI();
    
    lucide.createIcons();
}

function closeCashierDetails() {
    selectedGroup = null;
    document.getElementById('cashierDetailsCol').innerHTML = `
        <div class="text-center py-12 border border-dashed border-slate-200 rounded-3xl bg-white/20">
            <p class="text-slate-400 text-sm font-semibold">Selecciona una mesa con comanda para cobrar.</p>
        </div>
    `;
}

function setCashierSplitBase(base) {
    splitBase = base;
    updateSplitCalculator();
}

function changeSplitCount(amount) {
    splitCount = Math.max(1, Math.min(12, splitCount + amount));
    document.getElementById('splitCountText').textContent = splitCount;
    updateSplitCalculator();
}

function updateSplitCalculator() {
    const btnRem = document.getElementById('splitBaseBtn-rem');
    const btnTot = document.getElementById('splitBaseBtn-tot');
    
    if (splitBase === 'remaining') {
        btnRem.className = "py-1.5 px-2 rounded-lg border transition bg-[#5CA8B5] border-[#5CA8B5] text-white font-black";
        btnTot.className = "py-1.5 px-2 rounded-lg border transition bg-white border-slate-250 text-slate-700 hover:bg-slate-50";
    } else {
        btnTot.className = "py-1.5 px-2 rounded-lg border transition bg-[#5CA8B5] border-[#5CA8B5] text-white font-black";
        btnRem.className = "py-1.5 px-2 rounded-lg border transition bg-white border-slate-250 text-slate-700 hover:bg-slate-50";
    }
    
    const baseAmount = splitBase === 'total' ? selectedGroup.total : selectedGroup.remaining;
    const share = baseAmount / splitCount;
    
    const resultBox = document.getElementById('splitCalculatorResult');
    resultBox.innerHTML = `
        <div class="flex justify-between items-baseline text-xs">
            <span class="text-slate-500 font-semibold">Cuota por persona:</span>
            <span class="text-lg font-black text-[#0B525B]">$${share.toFixed(2)}</span>
        </div>
        ${splitCount > 1 ? `
        <button type="button" onclick="loadSplitShareToInput(${share.toFixed(2)})" class="w-full py-1.5 bg-[#5CA8B5]/10 hover:bg-[#5CA8B5]/25 text-[#0B525B] font-bold text-[10px] rounded-lg transition flex items-center justify-center gap-1">
            Cargar $${share.toFixed(2)} a Cobrar
        </button>` : ''}
    `;
    
    // Cargar automáticamente en el input principal si es 1 persona
    if (splitCount === 1) {
        document.getElementById('cashierAmountInput').value = selectedGroup.remaining.toFixed(2);
    }
}

function loadSplitShareToInput(val) {
    document.getElementById('cashierAmountInput').value = val;
}

function setCashierPaymentMethod(method) {
    cashierPaymentMethod = method;
    updateCashierPaymentMethodUI();
}

function updateCashierPaymentMethodUI() {
    const btnCash = document.getElementById('payMethodBtn-cash');
    const btnCard = document.getElementById('payMethodBtn-card');
    
    if (cashierPaymentMethod === 'efectivo') {
        btnCash.className = "py-2.5 rounded-xl text-xs border cursor-pointer bg-[#0B525B] border-[#0B525B] text-white font-black";
        btnCard.className = "py-2.5 rounded-xl text-xs border cursor-pointer bg-white border-slate-200 text-slate-700 hover:bg-slate-50";
    } else {
        btnCard.className = "py-2.5 rounded-xl text-xs border cursor-pointer bg-[#0B525B] border-[#0B525B] text-white font-black";
        btnCash.className = "py-2.5 rounded-xl text-xs border cursor-pointer bg-white border-slate-200 text-slate-700 hover:bg-slate-50";
    }
}

function toggleCashierRegisterCustomer() {
    isRegisteringCustomer = !isRegisteringCustomer;
    const btn = document.getElementById('toggleCustRegisterBtn');
    const area = document.getElementById('cashierCustomerArea');
    
    if (isRegisteringCustomer) {
        btn.textContent = 'Cancelar';
        area.innerHTML = `
            <div class="flex flex-col gap-2 bg-white rounded-xl p-3 border border-slate-200 text-xs">
                <input type="text" id="newCustName" placeholder="Nombre completo" class="w-full p-2 border border-slate-200 rounded-lg outline-none font-semibold" required>
                <input type="tel" id="newCustPhone" placeholder="Teléfono (10 dígitos)" class="w-full p-2 border border-slate-200 rounded-lg outline-none font-semibold" required>
                <input type="email" id="newCustEmail" placeholder="Email (opcional)" class="w-full p-2 border border-slate-200 rounded-lg outline-none font-semibold">
                <button type="button" onclick="submitNewCustomerInCashier()" class="w-full py-1.5 bg-[#5CA8B5] hover:bg-[#5CA8B5]/95 text-white font-bold rounded-lg transition text-[10px]">
                    Guardar Cliente
                </button>
            </div>
        `;
    } else {
        btn.textContent = '+ Registrar';
        area.innerHTML = `
            <select id="cashierCustomerIdSelect" class="w-full py-2.5 px-3 rounded-xl border border-slate-200 focus:outline-none bg-white text-slate-700 font-bold text-xs">
                <option value="">-- Sin Cliente Asociado --</option>
                ${customers.map(c => `<option value="${c._id}">${c.name} (${c.phone}) - {c.loyaltyPoints} pts</option>`).join('')}
            </select>
        `;
    }
}

async function submitNewCustomerInCashier() {
    const name = document.getElementById('newCustName').value;
    const phone = document.getElementById('newCustPhone').value;
    const email = document.getElementById('newCustEmail').value;
    
    if (!name || !phone) {
        showToast('Nombre y teléfono son obligatorios.', 'error');
        return;
    }
    
    try {
        const response = await fetch('/api/customers', {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify({ name, phone, email })
        });
        const data = await response.json();
        if (response.ok) {
            showToast('Cliente registrado con éxito.');
            // Recargar lista y seleccionar el creado
            await loadCashierData();
            isRegisteringCustomer = false;
            document.getElementById('toggleCustRegisterBtn').textContent = '+ Registrar';
            const area = document.getElementById('cashierCustomerArea');
            area.innerHTML = `
                <select id="cashierCustomerIdSelect" class="w-full py-2.5 px-3 rounded-xl border border-slate-200 focus:outline-none bg-white text-slate-700 font-bold text-xs">
                    <option value="">-- Sin Cliente Asociado --</option>
                    ${customers.map(c => `<option value="${c._id}" ${c._id === data._id ? 'selected' : ''}>${c.name} (${c.phone}) - ${c.loyaltyPoints} pts</option>`).join('')}
                </select>
            `;
        } else {
            showToast(data.message, 'error');
        }
    } catch (err) {
        showToast('Error de conexión.', 'error');
    }
}

async function handleCashierPaymentSubmit(e) {
    e.preventDefault();
    if (!selectedGroup) return;
    
    const amountVal = Number(document.getElementById('cashierAmountInput').value);
    if (!amountVal || amountVal <= 0) {
        showToast('Monto inválido para cobro.', 'error');
        return;
    }
    
    const customerIdSelect = document.getElementById('cashierCustomerIdSelect');
    const customerId = customerIdSelect ? customerIdSelect.value : '';
    
    let paymentLeft = amountVal;
    let lastChange = 0;
    let success = false;
    let errorMsg = null;
    
    // Ordenar comanda de la más antigua a la más nueva
    const sortedOrders = [...selectedGroup.orders].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    
    for (const order of sortedOrders) {
        if (paymentLeft <= 0) break;
        
        const orderRemaining = order.remaining !== undefined ? order.remaining : order.total;
        if (orderRemaining <= 0) continue;
        
        const amountToPay = Math.min(paymentLeft, orderRemaining);
        
        try {
            const response = await fetch('/api/payments', {
                method: 'POST',
                headers: getHeaders(),
                body: JSON.stringify({
                    orderId: order._id,
                    amount: amountToPay,
                    method: cashierPaymentMethod,
                    customerId: customerId || undefined
                })
            });
            const data = await response.json();
            
            if (response.ok) {
                success = true;
                paymentLeft -= amountToPay;
                lastChange = data.change || 0;
            } else {
                errorMsg = data.message || 'Error al registrar el pago.';
                break;
            }
        } catch (err) {
            console.error(err);
            errorMsg = 'Error al conectar con la API de cobros.';
            break;
        }
    }
    
    if (success) {
        const totalChange = lastChange + (paymentLeft > 0 ? paymentLeft : 0);
        const newRemaining = Math.max(0, selectedGroup.remaining - amountVal);
        
        if (newRemaining > 0) {
            showToast(`Abono registrado. Cambio: $${totalChange.toFixed(2)}. Restan: $${newRemaining.toFixed(2)}`);
            loadCashierData();
        } else {
            showToast(`Comanda liquidada por completo. Cambio entregado: $${totalChange.toFixed(2)}`);
            closeCashierDetails();
            loadCashierData();
        }
    } else {
        showToast(errorMsg || 'Fallo al procesar cobro.', 'error');
    }
}

// --- MÓDULO: ADMINISTRACIÓN ---

async function loadAdminData() {
    // Redirigir al gerente si intenta acceder a subpestañas restringidas
    if (currentUser.role === 'Gerente' && (adminSubTab === 'metrics' || adminSubTab === 'staff')) {
        switchAdminSubTab('inventory');
        return;
    }
    
    if (adminSubTab === 'metrics') loadAdminMetrics();
    else if (adminSubTab === 'inventory') loadAdminInventory();
    else if (adminSubTab === 'menu') loadAdminMenu();
    else if (adminSubTab === 'staff') loadAdminStaff();
}

function switchAdminSubTab(subTabId) {
    adminSubTab = subTabId;
    
    document.querySelectorAll('.admin-sub-panel').forEach(panel => panel.classList.add('hidden'));
    document.querySelectorAll('.admin-sub-btn').forEach(btn => {
        btn.classList.remove('bg-white', 'shadow-sm', 'text-slate-900', 'font-black');
    });
    
    document.getElementById(`adminPanel-${subTabId}`).classList.remove('hidden');
    document.getElementById(`adminSubBtn-${subTabId}`).classList.add('bg-white', 'shadow-sm', 'text-slate-900', 'font-black');
    
    loadAdminData();
}

async function loadAdminMetrics() {
    try {
        const response = await fetch('/api/dashboard/stats', { headers: getHeaders() });
        if (response.ok) {
            const data = await response.json();
            
            document.getElementById('adminStatsRevenue').textContent = `$${data.today.totalSales.toFixed(2)}`;
            document.getElementById('adminStatsCount').textContent = data.today.transactionsCount;
            
            // Renderizar platillos Top
            const list = document.getElementById('adminTopDishesList');
            list.innerHTML = '';
            
            if (data.weeklyTopDishes.length === 0) {
                list.innerHTML = '<p class="text-slate-400 text-center py-6 text-sm">Sin ventas registradas en la última semana.</p>';
                return;
            }
            
            data.weeklyTopDishes.forEach((dish, idx) => {
                list.innerHTML += `
                    <div class="flex justify-between items-center py-2 border-b border-slate-100 last:border-0 text-sm">
                        <span class="font-semibold text-slate-700 flex items-center gap-2">
                            <span class="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-xs font-black text-slate-500">${idx+1}</span>
                            ${dish.name} (${dish.category})
                        </span>
                        <span class="font-extrabold text-[#0B525B]">${dish.quantitySold} vendida(s)</span>
                    </div>
                `;
            });
        }
    } catch (err) {
        showToast('Error al cargar métricas de ventas.', 'error');
    }
}

async function loadAdminInventory() {
    try {
        const response = await fetch('/api/ingredients', { headers: getHeaders() });
        if (response.ok) {
            ingredients = await response.json();
            
            const tbody = document.getElementById('inventoryTableBody');
            tbody.innerHTML = '';
            
            ingredients.forEach(ing => {
                const tr = document.createElement('tr');
                tr.className = "border-b border-slate-100 hover:bg-slate-50 text-slate-700";
                
                const isBajo = ing.stock <= ing.minStock;
                const stockColor = isBajo ? 'text-rose-600 font-extrabold' : 'font-semibold text-slate-800';
                
                tr.innerHTML = `
                    <td class="py-3 font-bold">${ing.name}</td>
                    <td class="py-3 ${stockColor}">${ing.stock.toFixed(2)} ${ing.unit}</td>
                    <td class="py-3 font-semibold text-slate-400">${ing.minStock} ${ing.unit}</td>
                    <td class="py-3 text-center">
                        <div class="flex justify-center items-center gap-1.5 text-xs font-extrabold">
                            <button onclick="adjustInventoryStock('${ing._id}', -5)" class="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 text-brand-header flex items-center justify-center cursor-pointer select-none">-5</button>
                            <button onclick="adjustInventoryStock('${ing._id}', -1)" class="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 text-brand-header flex items-center justify-center cursor-pointer select-none">-1</button>
                            <button onclick="adjustInventoryStock('${ing._id}', 1)" class="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 text-brand-header flex items-center justify-center cursor-pointer select-none">+1</button>
                            <button onclick="adjustInventoryStock('${ing._id}', 5)" class="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 text-brand-header flex items-center justify-center cursor-pointer select-none">+5</button>
                        </div>
                    </td>
                `;
                tbody.appendChild(tr);
            });
        }
    } catch (err) {
        showToast('Error al cargar inventario.', 'error');
    }
}

async function adjustInventoryStock(id, amount) {
    try {
        const response = await fetch(`/api/ingredients/${id}/stock`, {
            method: 'PATCH',
            headers: getHeaders(),
            body: JSON.stringify({ quantity: amount })
        });
        if (response.ok) {
            showToast('Stock ajustado con éxito.');
            loadAdminInventory();
        } else {
            const err = await response.json();
            showToast(err.message, 'error');
        }
    } catch (err) {
        showToast('Error al conectar con la API de inventario.', 'error');
    }
}

// Registro nuevo insumo
const newIngForm = document.getElementById('newIngredientForm');
if (newIngForm) {
    newIngForm.onsubmit = async (e) => {
        e.preventDefault();
        const name = document.getElementById('ingName').value;
        const stock = Number(document.getElementById('ingStock').value);
        const unit = document.getElementById('ingUnit').value;
        const minStock = Number(document.getElementById('ingMinStock').value);
        
        try {
            const response = await fetch('/api/ingredients', {
                method: 'POST',
                headers: getHeaders(),
                body: JSON.stringify({ name, stock, unit, minStock })
            });
            if (response.ok) {
                showToast('Insumo registrado con éxito.');
                newIngForm.reset();
                loadAdminInventory();
            } else {
                const err = await response.json();
                showToast(err.message, 'error');
            }
        } catch (err) {
            showToast('Error de conexión.', 'error');
        }
    };
}

async function loadAdminMenu() {
    try {
        // Cargar insumos y menú en paralelo
        const [ingRes, menuRes] = await Promise.all([
            fetch('/api/ingredients', { headers: getHeaders() }),
            fetch('/api/menu-items')
        ]);
        
        ingredients = await ingRes.json();
        menuItems = await menuRes.json();
        
        // 1. Renderizar platillos
        const list = document.getElementById('adminMenuList');
        list.innerHTML = '';
        
        menuItems.forEach(item => {
            const card = document.createElement('div');
            card.className = "glass-panel rounded-3xl p-4 border border-slate-200 bg-white/50 flex flex-col justify-between text-xs";
            card.innerHTML = `
                <div>
                    <h4 class="font-extrabold text-sm text-slate-800">${item.name}</h4>
                    <p class="text-slate-400 mt-0.5">${item.description}</p>
                    <p class="text-[#0B525B] font-extrabold text-sm mt-2">$${item.price.toFixed(2)} • <span class="text-slate-500 font-semibold">${item.category}</span></p>
                </div>
                
                <div class="border-t border-slate-100 pt-3 mt-3">
                    <span class="font-bold text-slate-500 uppercase tracking-wider text-[9px] block mb-1">Receta:</span>
                    <div class="flex flex-col gap-0.5 text-slate-600 font-medium">
                        ${item.ingredients.map(ri => {
                            const ingName = ri.ingredient?.name || 'Insumo Eliminado';
                            return `<div>- ${ri.quantity} ${ri.ingredient?.unit || ''} de ${ingName}</div>`;
                        }).join('')}
                    </div>
                </div>
            `;
            list.appendChild(card);
        });
        
        // 2. Renderizar Constructor de Recetas en el Formulario
        const builder = document.getElementById('recipeBuilderList');
        builder.innerHTML = '';
        
        if (ingredients.length === 0) {
            builder.innerHTML = '<p class="text-slate-400 text-center py-2">Registra insumos primero en Inventario.</p>';
            return;
        }
        
        ingredients.forEach(ing => {
            const row = document.createElement('div');
            row.className = "flex items-center justify-between text-slate-700 bg-slate-100 p-2 rounded-xl text-[10px] font-bold";
            row.innerHTML = `
                <label class="flex items-center gap-1.5 cursor-pointer">
                    <input type="checkbox" id="chkRecipe-${ing._id}" onchange="toggleRecipeQtyInput('${ing._id}')" class="rounded border-slate-300 text-[#0B525B] focus:ring-[#0B525B]">
                    <span>${ing.name} (${ing.unit})</span>
                </label>
                <input type="number" step="any" id="qtyRecipe-${ing._id}" placeholder="Cant." disabled class="w-16 p-1 border border-slate-200 rounded text-center outline-none bg-slate-50">
            `;
            builder.appendChild(row);
        });
    } catch (err) {
        showToast('Error al cargar el menú.', 'error');
    }
}

function toggleRecipeQtyInput(ingId) {
    const chk = document.getElementById(`chkRecipe-${ingId}`);
    const input = document.getElementById(`qtyRecipe-${ingId}`);
    
    if (chk.checked) {
        input.disabled = false;
        input.className = "w-16 p-1 border border-slate-200 rounded text-center outline-none bg-white font-semibold";
        input.focus();
    } else {
        input.disabled = true;
        input.value = '';
        input.className = "w-16 p-1 border border-slate-200 rounded text-center outline-none bg-slate-50";
    }
}

// Registro nuevo platillo en menú
const newDishF = document.getElementById('newDishForm');
if (newDishF) {
    newDishF.onsubmit = async (e) => {
        e.preventDefault();
        const name = document.getElementById('dishName').value;
        const description = document.getElementById('dishDesc').value;
        const price = Number(document.getElementById('dishPrice').value);
        const category = document.getElementById('dishCat').value;
        
        // Recopilar ingredientes seleccionados de la receta
        const recipeItems = [];
        ingredients.forEach(ing => {
            const chk = document.getElementById(`chkRecipe-${ing._id}`);
            const qtyInput = document.getElementById(`qtyRecipe-${ing._id}`);
            
            if (chk && chk.checked) {
                const qty = Number(qtyInput.value);
                if (qty > 0) {
                    recipeItems.push({
                        ingredient: ing._id,
                        quantity: qty
                    });
                }
            }
        });
        
        try {
            const response = await fetch('/api/menu-items', {
                method: 'POST',
                headers: getHeaders(),
                body: JSON.stringify({ name, description, price, category, ingredients: recipeItems })
            });
            if (response.ok) {
                showToast('Platillo añadido con éxito.');
                newDishF.reset();
                loadAdminMenu();
            } else {
                const err = await response.json();
                showToast(err.message, 'error');
            }
        } catch (err) {
            showToast('Error de conexión.', 'error');
        }
    };
}

async function loadAdminStaff() {
    try {
        const [staffRes, tablesRes] = await Promise.all([
            fetch('/api/auth/users', { headers: getHeaders() }),
            fetch('/api/tables')
        ]);
        
        staffList = await staffRes.json();
        tables = await tablesRes.json();
        
        // 1. Renderizar personal
        const staffGroup = document.getElementById('staffListGroup');
        staffGroup.innerHTML = '';
        
        staffList.forEach(u => {
            staffGroup.innerHTML += `
                <div class="flex justify-between items-center bg-slate-50 p-2.5 rounded-xl border border-slate-100 text-xs font-semibold text-slate-700">
                    <div>
                        <p class="font-bold text-slate-800">${u.name}</p>
                        <p class="text-[10px] text-slate-400 mt-0.5">Usuario: <span class="font-bold">${u.username}</span></p>
                    </div>
                    <span class="px-2 py-0.5 rounded text-[9px] font-black uppercase bg-[#0B525B]/10 text-[#0B525B]">
                        ${u.role}
                    </span>
                </div>
            `;
        });
        
        // 2. Renderizar mesas
        const tablesGroup = document.getElementById('tablesListGroup');
        tablesGroup.innerHTML = '';
        
        tables.forEach(t => {
            tablesGroup.innerHTML += `
                <div class="flex justify-between items-center bg-slate-50 p-2.5 rounded-xl border border-slate-100 text-xs font-semibold text-slate-700">
                    <span class="font-bold text-slate-800">Mesa ${t.number}</span>
                    <span class="text-slate-400 font-semibold">Cap: ${t.capacity} comensales</span>
                </div>
            `;
        });
    } catch (err) {
        showToast('Error al obtener personal o mesas.', 'error');
    }
}

// Registro nuevo personal
const staffForm = document.getElementById('newStaffForm');
if (staffForm) {
    staffForm.onsubmit = async (e) => {
        e.preventDefault();
        const name = document.getElementById('staffName').value;
        const username = document.getElementById('staffUsername').value;
        const password = document.getElementById('staffPassword').value;
        const role = document.getElementById('staffRole').value;
        
        try {
            const response = await fetch('/api/auth/register', {
                method: 'POST',
                headers: getHeaders(),
                body: JSON.stringify({ name, username, password, role })
            });
            if (response.ok) {
                showToast('Empleado registrado con éxito.');
                staffForm.reset();
                loadAdminStaff();
            } else {
                const err = await response.json();
                showToast(err.message, 'error');
            }
        } catch (err) {
            showToast('Error de conexión.', 'error');
        }
    };
}

// Registro nueva mesa
const tableForm = document.getElementById('newTableForm');
if (tableForm) {
    tableForm.onsubmit = async (e) => {
        e.preventDefault();
        const number = Number(document.getElementById('tableNum').value);
        const capacity = Number(document.getElementById('tableCapacity').value);
        
        try {
            const response = await fetch('/api/tables', {
                method: 'POST',
                headers: getHeaders(),
                body: JSON.stringify({ number, capacity })
            });
            if (response.ok) {
                showToast('Mesa agregada con éxito.');
                tableForm.reset();
                loadAdminStaff();
            } else {
                const err = await response.json();
                showToast(err.message, 'error');
            }
        } catch (err) {
            showToast('Error de conexión.', 'error');
        }
    };
}

// --- ARRANQUE DE LA APLICACIÓN ---

document.addEventListener('DOMContentLoaded', () => {
    if (checkAuth()) {
        // Ejecutar bucle periódico de actualización de comisiones/órdenes en cocina (cada 15 seg)
        setInterval(() => {
            if (currentTab === 'kitchen') loadKitchenData();
        }, 15000);
    }
});

// Registrar Service Worker para PWA
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        const apiUrl = `${window.location.origin}/api`;
        navigator.serviceWorker.register(`/sw.js?apiUrl=${encodeURIComponent(apiUrl)}`)
            .then(reg => {
                console.log('PWA Service Worker registrado en el ámbito:', reg.scope);
                
                // Intentar disparar sincronización al recuperar conexión en navegador
                window.addEventListener('online', () => {
                    console.log('Navegador en línea. Forzando sincronización de comandas offline.');
                    if (reg.active) {
                        reg.active.postMessage({ type: 'FORCE_SYNC' });
                    }
                });
            })
            .catch(err => {
                console.error('Fallo al registrar Service Worker:', err);
            });
    });
}
