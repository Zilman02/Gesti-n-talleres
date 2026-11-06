// Clave de almacenamiento local en el dispositivo
const STORAGE_KEY = 'ruiz_automotores_orders';

// Cargar órdenes guardadas o iniciar lista vacía
let orders = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];

// Inicializar aplicación al abrir
document.addEventListener('DOMContentLoaded', () => {
    renderOrders();
    updateStats();
    setupNetworkStatus();
    registerServiceWorker();

    // Evento para guardar nueva orden
    const form = document.getElementById('orderForm');
    form.addEventListener('submit', (e) => {
        e.preventDefault();
        saveNewOrder();
    });
});

// Guardar orden en el teléfono
function saveNewOrder() {
    const newOrder = {
        id: Date.now(),
        date: new Date().toLocaleDateString('es-AR'),
        clientName: document.getElementById('clientName').value.trim(),
        clientPhone: document.getElementById('clientPhone').value.trim(),
        carModel: document.getElementById('carModel').value.trim(),
        carPlate: document.getElementById('carPlate').value.trim().toUpperCase(),
        serviceDetails: document.getElementById('serviceDetails').value.trim(),
        serviceCost: parseFloat(document.getElementById('serviceCost').value) || 0,
        status: document.getElementById('serviceStatus').value
    };

    orders.unshift(newOrder);
    syncStorage();
    document.getElementById('orderForm').reset();
    renderOrders();
    updateStats();
}

// Sincronizar con la memoria del celular (LocalStorage)
function syncStorage() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(orders));
}

// Mostrar lista de órdenes y aplicar filtro de búsqueda
function renderOrders() {
    const listContainer = document.getElementById('ordersList');
    const query = document.getElementById('searchInput').value.trim().toLowerCase();

    const filtered = orders.filter(o =>
        o.carPlate.toLowerCase().includes(query) ||
        o.clientName.toLowerCase().includes(query) ||
        o.carModel.toLowerCase().includes(query)
    );

    if (filtered.length === 0) {
        listContainer.innerHTML = '<p style="color: #94a3b8; text-align: center; padding: 20px;">No hay órdenes registradas.</p>';
        return;
    }

    listContainer.innerHTML = filtered.map(order => {
        const statusClass = 'status-' + order.status.replace(/\s+/g, '-');
        return `
            <div class="order-item">
                <div class="order-top">
                    <span class="plate-tag">${order.carPlate}</span>
                    <span class="status-badge ${statusClass}">${order.status}</span>
                </div>
                <div class="order-details">
                    <p><strong>Vehículo:</strong> ${order.carModel} | <strong>Fecha:</strong> ${order.date}</p>
                    <p><strong>Cliente:</strong> ${order.clientName} (${order.clientPhone})</p>
                    <p><strong>Trabajo:</strong> ${order.serviceDetails}</p>
                    <p><strong>Presupuesto:</strong> $${order.serviceCost.toLocaleString('es-AR')}</p>
                </div>
                <div class="order-actions">
                    <select onchange="updateOrderStatus(${order.id}, this.value)">
                        <option value="Pendiente" ${order.status === 'Pendiente' ? 'selected' : ''}>Pendiente</option>
                        <option value="En Taller" ${order.status === 'En Taller' ? 'selected' : ''}>En Taller</option>
                        <option value="Listo para Entregar" ${order.status === 'Listo para Entregar' ? 'selected' : ''}>Listo para Entregar</option>
                        <option value="Entregado" ${order.status === 'Entregado' ? 'selected' : ''}>Entregado</option>
                    </select>
                    <button type="button" class="btn-delete" onclick="deleteOrder(${order.id})">Eliminar</button>
                </div>
            </div>
        `;
    }).join('');
}

// Cambiar estado de reparación rápidamente
function updateOrderStatus(id, newStatus) {
    const item = orders.find(o => o.id === id);
    if (item) {
        item.status = newStatus;
        syncStorage();
        renderOrders();
        updateStats();
    }
}

// Borrar una orden
function deleteOrder(id) {
    if (confirm('¿Seguro que deseas eliminar esta orden?')) {
        orders = orders.filter(o => o.id !== id);
        syncStorage();
        renderOrders();
        updateStats();
    }
}

// Actualizar contadores superiores
function updateStats() {
    document.getElementById('statTotalOrders').textContent = orders.length;
    
    const inProgress = orders.filter(o => o.status === 'Pendiente' || o.status === 'En Taller').length;
    document.getElementById('statPendingOrders').textContent = inProgress;

    const totalRevenue = orders.reduce((acc, o) => acc + (Number(o.serviceCost) || 0), 0);
    document.getElementById('statTotalRevenue').textContent = '$' + totalRevenue.toLocaleString('es-AR');
}

// Alternar entre Panel Taller y Vista Cliente
function switchView(role) {
    const adminView = document.getElementById('adminView');
    const clientView = document.getElementById('clientView');
    const btnAdmin = document.getElementById('btnAdminView');
    const btnClient = document.getElementById('btnClientView');

    if (role === 'admin') {
        adminView.style.display = 'block';
        clientView.style.display = 'none';
        btnAdmin.classList.add('active');
        btnClient.classList.remove('active');
    } else {
        adminView.style.display = 'none';
        clientView.style.display = 'block';
        btnAdmin.classList.remove('active');
        btnClient.classList.add('active');
    }
}

// Buscador por patente para el cliente
function searchClientOrder() {
    const plate = document.getElementById('clientSearchPlate').value.trim().toUpperCase();
    const resultBox = document.getElementById('clientResult');

    if (!plate) {
        resultBox.innerHTML = '<p style="color: #ef4444;">Por favor ingresa una patente.</p>';
        return;
    }

    const found = orders.filter(o => o.carPlate === plate);

    if (found.length === 0) {
        resultBox.innerHTML = '<p style="color: #94a3b8;">No se encontraron registros para esa patente.</p>';
        return;
    }

    resultBox.innerHTML = found.map(order => {
        const statusClass = 'status-' + order.status.replace(/\s+/g, '-');
        return `
            <div class="order-item">
                <div class="order-top">
                    <span class="plate-tag">${order.carPlate}</span>
                    <span class="status-badge ${statusClass}">${order.status}</span>
                </div>
                <div class="order-details">
                    <p><strong>Vehículo:</strong> ${order.carModel}</p>
                    <p><strong>Ingreso:</strong> ${order.date}</p>
                    <p><strong>Detalle:</strong> ${order.serviceDetails}</p>
                    <p><strong>Total estimado:</strong> $${order.serviceCost.toLocaleString('es-AR')}</p>
                </div>
            </div>
        `;
    }).join('');
}

// Exportar tabla compatible con Excel (CSV con punto y coma)
function exportToExcel() {
    if (orders.length === 0) {
        alert('No hay órdenes cargadas para exportar.');
        return;
    }

    const headers = ['Fecha', 'Patente', 'Vehiculo', 'Cliente', 'Telefono', 'Trabajo', 'Presupuesto', 'Estado'];
    const rows = orders.map(o => [
        o.date,
        o.carPlate,
        `"${o.carModel.replace(/"/g, '""')}"`,
        `"${o.clientName.replace(/"/g, '""')}"`,
        `"${o.clientPhone}"`,
        `"${o.serviceDetails.replace(/"/g, '""')}"`,
        o.serviceCost,
        o.status
    ]);

    const csvContent = '\uFEFF' + [headers.join(';'), ...rows.map(r => r.join(';'))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = `Reporte_Ruiz_Automotores_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// Indicador visual de conexión
function setupNetworkStatus() {
    const badge = document.getElementById('connectionStatus');
    const updateStatus = () => {
        if (navigator.onLine) {
            badge.textContent = 'Online (Guardado Local)';
        } else {
            badge.textContent = 'Modo Offline Activo';
        }
    };
    window.addEventListener('online', updateStatus);
    window.addEventListener('offline', updateStatus);
    updateStatus();
}

// Registrar Service Worker para modo sin internet
function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('sw.js').catch(() => {});
    }
}