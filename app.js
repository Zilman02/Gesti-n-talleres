// Clave de almacenamiento local en el dispositivo
const STORAGE_KEY = 'ruiz_automotores_orders';
let orders = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];

document.addEventListener('DOMContentLoaded', () => {
  renderOrders();
  updateStats();
  setupForm();
  setupSearch();
});

function setupForm() {
  const form = document.getElementById('orderForm') || document.querySelector('form');
  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      saveNewOrder(form);
    });
  } else {
    const buttons = document.querySelectorAll('button');
    buttons.forEach(btn => {
      if (btn.textContent.includes('Guardar Orden')) {
        btn.addEventListener('click', (e) => {
          e.preventDefault();
          saveNewOrder(document);
        });
      }
    });
  }
}

function saveNewOrder(container) {
  const textInputs = Array.from(document.querySelectorAll('input:not([placeholder*="Buscar"])'));
  const textarea = document.querySelector('textarea');
  const select = document.querySelector('select');

  const client = document.getElementById('clientName')?.value || textInputs[0]?.value || 'Sin nombre';
  const phone = document.getElementById('clientPhone')?.value || textInputs[1]?.value || '';
  const vehicle = document.getElementById('vehicleModel')?.value || textInputs[2]?.value || '';
  const plate = (document.getElementById('vehiclePlate')?.value || textInputs[3]?.value || '').toUpperCase();
  const description = document.getElementById('serviceDesc')?.value || textarea?.value || '';
  const budgetVal = document.getElementById('serviceBudget')?.value || textInputs[4]?.value || 0;
  const status = document.getElementById('orderStatus')?.value || select?.value || 'Pendiente';

  const newOrder = {
    id: Date.now(),
    date: new Date().toLocaleDateString('es-AR'),
    client: client.trim(),
    phone: phone.trim(),
    vehicle: vehicle.trim(),
    plate: plate.trim(),
    description: description.trim(),
    budget: Number(budgetVal) || 0,
    status: status
  };

  orders.unshift(newOrder);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(orders));

  const form = document.querySelector('form');
  if (form) {
    form.reset();
  } else {
    textInputs.forEach(i => i.value = '');
    if (textarea) textarea.value = '';
  }

  renderOrders();
  updateStats();
}

function renderOrders(filterText = '') {
  const container = document.getElementById('ordersList') || document.querySelector('.orders-list') || document.querySelector('#ordersContainer');
  if (!container) return;

  container.innerHTML = '';
  const query = filterText.toLowerCase();

  const filtered = orders.filter(o =>
    (o.plate && o.plate.toLowerCase().includes(query)) ||
    (o.client && o.client.toLowerCase().includes(query)) ||
    (o.vehicle && o.vehicle.toLowerCase().includes(query))
  );

  filtered.forEach((order) => {
    const card = document.createElement('div');
    card.className = 'order-card';
    card.style.cssText = 'background:#1e293b; padding:15px; border-radius:10px; margin-top:12px; border:1px solid #334155; color:#f8fafc;';
    card.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
        <span style="background:#0f172a; padding:4px 10px; border-radius:6px; font-weight:bold; letter-spacing:1px;">${order.plate || 'S/P'}</span>
        <span style="background:#0284c7; color:#fff; padding:4px 10px; border-radius:12px; font-size:12px;">${order.status}</span>
      </div>
      <p style="margin:4px 0;"><strong>Vehículo:</strong> ${order.vehicle} | <strong>Fecha:</strong> ${order.date}</p>
      <p style="margin:4px 0;"><strong>Cliente:</strong> ${order.client} (${order.phone})</p>
      <p style="margin:4px 0;"><strong>Trabajo:</strong> ${order.description}</p>
      <p style="margin:4px 0;"><strong>Presupuesto:</strong> $${Number(order.budget).toLocaleString('es-AR')}</p>
      <div style="display:flex; justify-content:space-between; align-items:center; margin-top:12px; gap:10px;">
        <select onchange="updateOrderStatus(${order.id}, this.value)" style="flex:1; padding:8px; border-radius:6px; background:#0f172a; color:#fff; border:1px solid #334155;">
          <option value="Pendiente" ${order.status === 'Pendiente' ? 'selected' : ''}>Pendiente</option>
          <option value="En Taller" ${order.status === 'En Taller' ? 'selected' : ''}>En Taller</option>
          <option value="Listo para Entregar" ${order.status === 'Listo para Entregar' ? 'selected' : ''}>Listo para Entregar</option>
          <option value="Entregado" ${order.status === 'Entregado' ? 'selected' : ''}>Entregado</option>
        </select>
        <button onclick="deleteOrder(${order.id})" style="background:#7f1d1d; color:#fca5a5; border:none; padding:8px 14px; border-radius:6px; cursor:pointer;">Eliminar</button>
      </div>
    `;
    container.appendChild(card);
  });
}

function updateOrderStatus(id, newStatus) {
  const order = orders.find(o => o.id === id);
  if (order) {
    order.status = newStatus;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(orders));
    renderOrders();
    updateStats();
  }
}

function setupSearch() {
  const searchInput = document.querySelector('input[placeholder*="Buscar"]');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      renderOrders(e.target.value);
    });
  }
}

function updateStats() {
  const totalOrdersEl = document.getElementById('statTotalOrders') || document.getElementById('totalOrders');
  const inRepairEl = document.getElementById('statInRepair') || document.getElementById('inRepairOrders');
  const totalRevenueEl = document.getElementById('statRevenue') || document.getElementById('monthlyRevenue');

  const inRepair = orders.filter(o => o.status === 'En Taller' || o.status === 'Pendiente').length;
  const revenue = orders.reduce((sum, o) => sum + (Number(o.budget) || 0), 0);

  if (totalOrdersEl) totalOrdersEl.textContent = orders.length;
  if (inRepairEl) inRepairEl.textContent = inRepair;
  if (totalRevenueEl) totalRevenueEl.textContent = '$' + revenue.toLocaleString('es-AR');
}

function deleteOrder(id) {
  if (!confirm('¿Desea eliminar esta orden?')) return;
  orders = orders.filter(o => o.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(orders));
  renderOrders();
  updateStats();
}

function exportToExcel() {
  if (!orders || orders.length === 0) {
    alert('No hay órdenes registradas para exportar.');
    return;
  }

  let tableHTML = `
    <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
    <head>
      <meta charset="UTF-8">
      <style>
        table { border-collapse: collapse; width: 100%; font-family: Arial, sans-serif; }
        th { background-color: #1e3a8a; color: #ffffff; font-weight: bold; padding: 10px; border: 1px solid #94a3b8; text-align: center; }
        td { padding: 8px; border: 1px solid #cbd5e1; text-align: left; }
        .num { text-align: right; font-weight: bold; }
        .center { text-align: center; }
        .total-row { background-color: #e2e8f0; font-weight: bold; }
      </style>
    </head>
    <body>
      <table>
        <thead>
          <tr>
            <th>Fecha</th>
            <th>Patente</th>
            <th>Vehículo</th>
            <th>Cliente</th>
            <th>Teléfono</th>
            <th>Trabajo Realizado</th>
            <th>Presupuesto</th>
            <th>Estado</th>
          </tr>
        </thead>
        <tbody>
  `;

  let totalFacturado = 0;
  orders.forEach(order => {
    totalFacturado += Number(order.budget) || 0;
    tableHTML += `
      <tr>
        <td class="center">${order.date || ''}</td>
        <td class="center"><strong>${order.plate || ''}</strong></td>
        <td>${order.vehicle || ''}</td>
        <td>${order.client || ''}</td>
        <td>${order.phone || ''}</td>
        <td>${order.description || ''}</td>
        <td class="num">$${(Number(order.budget) || 0).toLocaleString('es-AR')}</td>
        <td class="center">${order.status || ''}</td>
      </tr>
    `;
  });

  tableHTML += `
          <tr class="total-row">
            <td colspan="6" style="text-align: right;">TOTAL ACUMULADO:</td>
            <td class="num">$${totalFacturado.toLocaleString('es-AR')}</td>
            <td></td>
          </tr>
        </tbody>
      </table>
    </body>
    </html>
  `;

  const blob = new Blob(['\uFEFF' + tableHTML], { type: 'application/vnd.ms-excel;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  const today = new Date().toISOString().slice(0, 10);
  link.setAttribute('href', url);
  link.setAttribute('download', `Reporte_Ruiz_Automotores_${today}.xls`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function exportCSV() {
  exportToExcel();
}
