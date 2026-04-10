/**
 * 🏬 仓库库存页面
 * 库存总览 + 出入库流水
 */
import { getAllRecords, addRecord, updateRecord, deleteRecord, getNextCounter, STORES } from '../db.js';
import {
  INVENTORY_TYPES, INVENTORY_REASONS, WAREHOUSES,
  createOptions, formatCurrency, formatCNY, formatDate, statusBadge,
  showToast, showConfirm, debounce, today
} from '../utils/helpers.js';

let activeTab = 'overview'; // 'overview' | 'records'

export async function renderInventory(container) {
  const [products, inventoryRecords] = await Promise.all([
    getAllRecords(STORES.products),
    getAllRecords(STORES.inventory),
  ]);

  const totalStock = products.reduce((s, p) => s + (p.stockQty || 0), 0);
  const lowStockCount = products.filter(p => (p.stockQty || 0) <= (p.stockAlert || 0) && (p.stockAlert || 0) > 0).length;
  const outOfStockCount = products.filter(p => (p.stockQty || 0) === 0).length;
  const totalValue = products.reduce((s, p) => s + (p.stockQty || 0) * (p.factoryPrice || 0), 0);

  container.innerHTML = `
    <div class="page-header">
      <h1 class="page-title"><span class="title-icon">🏬</span>仓库库存</h1>
      <div class="page-actions">
        <button class="btn btn-primary btn-sm" id="btn-add-inv">+ 出入库</button>
      </div>
    </div>
    <div class="page-content">
      <div class="kpi-grid">
        <div class="kpi-card kpi-blue">
          <div class="kpi-label">库存总量</div>
          <div class="kpi-value">${totalStock.toLocaleString()}<span class="kpi-unit">件</span></div>
          <div class="kpi-icon">📦</div>
        </div>
        <div class="kpi-card kpi-gold">
          <div class="kpi-label">库存货值</div>
          <div class="kpi-value">${formatCNY(totalValue)}</div>
          <div class="kpi-icon">💰</div>
        </div>
        <div class="kpi-card ${lowStockCount > 0 ? 'kpi-red' : 'kpi-green'}">
          <div class="kpi-label">低库存预警</div>
          <div class="kpi-value">${lowStockCount}<span class="kpi-unit">款</span></div>
          <div class="kpi-icon">${lowStockCount > 0 ? '⚠️' : '✅'}</div>
        </div>
        <div class="kpi-card ${outOfStockCount > 0 ? 'kpi-red' : 'kpi-green'}">
          <div class="kpi-label">缺货</div>
          <div class="kpi-value">${outOfStockCount}<span class="kpi-unit">款</span></div>
          <div class="kpi-icon">${outOfStockCount > 0 ? '🚫' : '✅'}</div>
        </div>
      </div>

      <div class="filter-bar mb-16">
        <button class="filter-chip ${activeTab === 'overview' ? 'active' : ''}" data-tab="overview">📊 库存总览</button>
        <button class="filter-chip ${activeTab === 'records' ? 'active' : ''}" data-tab="records">📋 出入库流水 (${inventoryRecords.length})</button>
      </div>

      <div class="card">
        <div class="card-body no-padding">
          ${activeTab === 'overview' ? renderStockOverview(products) : renderInvRecords(inventoryRecords)}
        </div>
      </div>
    </div>
    <button class="btn btn-accent btn-fab" id="btn-fab-inv">+</button>
  `;

  container.querySelectorAll('[data-tab]').forEach(btn => {
    btn.addEventListener('click', () => {
      activeTab = btn.dataset.tab;
      const mainEl = document.getElementById('page-container');
      if (mainEl) renderInventory(mainEl);
    });
  });

  const openForm = () => openInvModal(products);
  container.querySelector('#btn-add-inv')?.addEventListener('click', openForm);
  container.querySelector('#btn-fab-inv')?.addEventListener('click', openForm);

  container.querySelectorAll('[data-inv-id]').forEach(el => {
    el.addEventListener('click', () => {
      const inv = inventoryRecords.find(r => r.id === Number(el.dataset.invId));
      if (inv) openInvDetailModal(inv);
    });
  });
}

function getStockStatus(product) {
  const qty = product.stockQty || 0;
  const alert = product.stockAlert || 0;
  if (qty === 0) return { text: '缺货', class: 'status-red' };
  if (alert > 0 && qty <= alert) return { text: '低库存', class: 'status-yellow' };
  return { text: '充足', class: 'status-green' };
}

function renderStockOverview(products) {
  if (products.length === 0) return '<div class="empty-state"><div class="empty-icon">📦</div><div class="empty-title">暂无产品</div></div>';

  // Sort: out of stock first, then low stock, then normal
  const sorted = [...products].sort((a, b) => {
    const sa = getStockStatus(a), sb = getStockStatus(b);
    const order = { '缺货': 0, '低库存': 1, '充足': 2 };
    return (order[sa.text] ?? 3) - (order[sb.text] ?? 3);
  });

  return `<ul class="data-list">${sorted.map(p => {
    const status = getStockStatus(p);
    return `
      <li class="data-item" style="cursor:default">
        <div class="data-item-avatar ${status.text === '缺货' ? 'avatar-red' : status.text === '低库存' ? 'avatar-gold' : 'avatar-green'}">
          ${status.text === '缺货' ? '🚫' : status.text === '低库存' ? '⚠️' : '✅'}
        </div>
        <div class="data-item-info">
          <div class="data-item-title">${p.name}</div>
          <div class="data-item-subtitle">${p.code} · ${p.category} · 预警线 ${p.stockAlert || 0}件</div>
        </div>
        <div class="data-item-right">
          <div class="data-item-amount" style="font-size:18px">${(p.stockQty || 0).toLocaleString()} 件</div>
          <span class="badge ${status.class}">${status.text}</span>
        </div>
      </li>
    `;
  }).join('')}</ul>`;
}

function renderInvRecords(records) {
  if (records.length === 0) return '<div class="empty-state"><div class="empty-icon">📋</div><div class="empty-title">暂无出入库记录</div></div>';

  const sorted = [...records].sort((a, b) => (b.date || '').localeCompare(a.date || '') || b.id - a.id);
  return `<ul class="data-list">${sorted.map(r => `
    <li class="data-item" data-inv-id="${r.id}">
      <div class="data-item-avatar ${r.type === '入库' ? 'avatar-green' : 'avatar-red'}">
        ${r.type === '入库' ? '📥' : '📤'}
      </div>
      <div class="data-item-info">
        <div class="data-item-title">${r.productName}</div>
        <div class="data-item-subtitle">${r.code} · ${r.reason} · ${r.warehouse || ''}</div>
      </div>
      <div class="data-item-right">
        <div class="data-item-amount" style="color:${r.type === '入库' ? 'var(--success)' : 'var(--danger)'}">
          ${r.type === '入库' ? '+' : '-'}${r.quantity} 件
        </div>
        <div class="data-item-meta">${r.date}</div>
      </div>
    </li>
  `).join('')}</ul>`;
}

function openInvModal(products) {
  const productOpts = products.map(p => `<option value="${p.id}">${p.code} - ${p.name} (库存: ${p.stockQty || 0})</option>`).join('');

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay active';
  overlay.innerHTML = `
    <div class="modal-sheet">
      <div class="modal-handle"></div>
      <div class="modal-header"><h3 class="modal-title">出入库操作</h3><button class="modal-close" id="modal-close">✕</button></div>
      <div class="modal-body">
        <div class="form-row">
          <div class="form-group"><label class="form-label">操作类型 <span class="required">*</span></label><select class="form-select" id="form-type">${createOptions(INVENTORY_TYPES, '入库')}</select></div>
          <div class="form-group"><label class="form-label">原因</label><select class="form-select" id="form-reason">${createOptions(INVENTORY_REASONS, '工厂到货')}</select></div>
        </div>
        <div class="form-group"><label class="form-label">选择产品 <span class="required">*</span></label><select class="form-select" id="form-product"><option value="">请选择</option>${productOpts}</select></div>
        <div class="form-row">
          <div class="form-group"><label class="form-label">数量 (件) <span class="required">*</span></label><input class="form-input" id="form-qty" type="number" min="1"></div>
          <div class="form-group"><label class="form-label">仓库</label><select class="form-select" id="form-warehouse">${createOptions(WAREHOUSES, '主仓')}</select></div>
        </div>
        <div class="form-group"><label class="form-label">日期</label><input class="form-input" id="form-date" type="date" value="${today()}"></div>
        <div class="form-group"><label class="form-label">备注</label><textarea class="form-textarea" id="form-notes"></textarea></div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" id="modal-cancel">取消</button>
        <button class="btn btn-primary" id="modal-save">确认操作</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);

  // Reason auto-switch
  overlay.querySelector('#form-type').addEventListener('change', (e) => {
    const reasonSelect = overlay.querySelector('#form-reason');
    reasonSelect.value = e.target.value === '入库' ? '工厂到货' : '订单出货';
  });

  const close = () => overlay.remove();
  overlay.querySelector('#modal-close').addEventListener('click', close);
  overlay.querySelector('#modal-cancel').addEventListener('click', close);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });

  overlay.querySelector('#modal-save').addEventListener('click', async () => {
    const productId = Number(overlay.querySelector('#form-product').value);
    const quantity = Number(overlay.querySelector('#form-qty').value);
    const type = overlay.querySelector('#form-type').value;
    if (!productId || !quantity) { showToast('请选择产品并填写数量', 'warning'); return; }

    const product = products.find(p => p.id === productId);
    if (type === '出库' && (product.stockQty || 0) < quantity) {
      const ok = await showConfirm(`当前库存仅 ${product.stockQty || 0} 件，确定出库 ${quantity} 件吗？`);
      if (!ok) return;
    }

    const year = new Date().getFullYear();
    const num = await getNextCounter('inv');
    const data = {
      code: `INV-${year}-${String(num).padStart(3, '0')}`,
      type, productId, productCode: product.code, productName: product.name,
      quantity, reason: overlay.querySelector('#form-reason').value,
      orderId: 0, orderCode: '', productionOrderId: 0,
      date: overlay.querySelector('#form-date').value,
      warehouse: overlay.querySelector('#form-warehouse').value,
      operator: '林经理',
      notes: overlay.querySelector('#form-notes').value.trim(),
    };

    await addRecord(STORES.inventory, data);

    // Update product stock
    if (type === '入库') {
      product.stockQty = (product.stockQty || 0) + quantity;
    } else {
      product.stockQty = Math.max(0, (product.stockQty || 0) - quantity);
    }
    await updateRecord(STORES.products, product);

    showToast(`${type}成功：${product.name} ${type === '入库' ? '+' : '-'}${quantity}件`);
    close();
    const mainEl = document.getElementById('page-container');
    if (mainEl) renderInventory(mainEl);
  });
}

function openInvDetailModal(inv) {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay active';
  overlay.innerHTML = `
    <div class="modal-sheet">
      <div class="modal-handle"></div>
      <div class="modal-header"><h3 class="modal-title">出入库详情</h3><button class="modal-close" id="modal-close">✕</button></div>
      <div class="modal-body no-padding" style="padding:0">
        <div class="detail-header" style="background:linear-gradient(135deg,${inv.type === '入库' ? '#27AE60,#2ECC71' : '#E67E22,#F39C12'})">
          <div class="detail-avatar">${inv.type === '入库' ? '📥' : '📤'}</div>
          <div><div class="detail-name">${inv.code}</div><div class="detail-code">${inv.type} · ${inv.reason}</div></div>
        </div>
        <div class="detail-section">
          <div class="detail-row"><span class="detail-label">产品</span><span class="detail-value">${inv.productName}</span></div>
          <div class="detail-row"><span class="detail-label">款号</span><span class="detail-value">${inv.productCode}</span></div>
          <div class="detail-row"><span class="detail-label">数量</span><span class="detail-value fw-bold" style="color:${inv.type === '入库' ? 'var(--success)' : 'var(--danger)'}">${inv.type === '入库' ? '+' : '-'}${inv.quantity} 件</span></div>
          <div class="detail-row"><span class="detail-label">日期</span><span class="detail-value">${formatDate(inv.date)}</span></div>
          <div class="detail-row"><span class="detail-label">仓库</span><span class="detail-value">${inv.warehouse || '-'}</span></div>
          <div class="detail-row"><span class="detail-label">操作人</span><span class="detail-value">${inv.operator || '-'}</span></div>
          ${inv.orderCode ? `<div class="detail-row"><span class="detail-label">关联订单</span><span class="detail-value">${inv.orderCode}</span></div>` : ''}
        </div>
        ${inv.notes ? `<div class="detail-section"><div class="detail-section-title">备注</div><p style="font-size:13px">${inv.notes}</p></div>` : ''}
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" id="modal-close2">关闭</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);
  const close = () => overlay.remove();
  overlay.querySelector('#modal-close').addEventListener('click', close);
  overlay.querySelector('#modal-close2').addEventListener('click', close);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
}
