/**
 * 📦 订单管理页面
 */
import { getAllRecords, addRecord, updateRecord, deleteRecord, getNextCounter, STORES } from '../db.js';
import {
  ORDER_STATUSES, BALANCE_STATUSES, SHIPPING_METHODS, CONTAINER_SPECS, DEPOSIT_RATES,
  COUNTRY_FLAGS, createOptions, formatCurrency, formatDate, statusBadge, matchesSearch,
  showToast, showConfirm, debounce, today
} from '../utils/helpers.js';
import { exportSharePackage } from '../utils/export.js';

let allOrders = [];
let allCustomers = [];
let filterStatus = '';
let searchQuery = '';

export async function renderOrders(container) {
  [allOrders, allCustomers] = await Promise.all([
    getAllRecords(STORES.orders),
    getAllRecords(STORES.customers),
  ]);

  const filtered = allOrders.filter(o => {
    if (filterStatus && o.status !== filterStatus) return false;
    if (searchQuery && !matchesSearch(o, searchQuery, ['code', 'customerName', 'description', 'country'])) return false;
    return true;
  }).sort((a, b) => (b.orderDate || '').localeCompare(a.orderDate || ''));

  container.innerHTML = `
    <div class="page-header">
      <h1 class="page-title"><span class="title-icon">📦</span>订单管理</h1>
      <div class="page-actions">
        <button class="btn btn-primary btn-sm" id="btn-add-order">+ 新建订单</button>
      </div>
    </div>
    <div class="page-content">
      <div class="search-bar mb-16">
        <span class="search-icon">🔍</span>
        <input class="form-input" id="order-search" placeholder="搜索订单号、客户、货品..." value="${searchQuery}">
      </div>
      <div class="filter-bar" id="order-filters">
        <button class="filter-chip ${!filterStatus ? 'active' : ''}" data-status="">全部 (${allOrders.length})</button>
        ${['生产中', '待收款', '运输中', '已出货', '已完结'].map(s => {
          const c = allOrders.filter(o => o.status === s).length;
          return `<button class="filter-chip ${filterStatus === s ? 'active' : ''}" data-status="${s}">${s} (${c})</button>`;
        }).join('')}
      </div>
      <div class="card">
        <div class="card-body no-padding" id="order-list-container">
          ${renderOrderList(filtered)}
        </div>
      </div>
    </div>
    <button class="btn btn-accent btn-fab" id="btn-fab-order">+</button>
  `;

  // Events
  container.querySelector('#order-search')?.addEventListener('input', debounce((e) => {
    searchQuery = e.target.value;
    const mainEl = document.getElementById('page-container');
    if (mainEl) renderOrders(mainEl);
  }));

  container.querySelector('#order-filters')?.addEventListener('click', (e) => {
    const chip = e.target.closest('.filter-chip');
    if (!chip) return;
    filterStatus = chip.dataset.status || '';
    const mainEl = document.getElementById('page-container');
    if (mainEl) renderOrders(mainEl);
  });

  const openForm = () => openOrderModal();
  container.querySelector('#btn-add-order')?.addEventListener('click', openForm);
  container.querySelector('#btn-fab-order')?.addEventListener('click', openForm);

  container.querySelectorAll('[data-order-id]').forEach(el => {
    el.addEventListener('click', () => openOrderDetailModal(Number(el.dataset.orderId)));
  });
}

function renderOrderList(orders) {
  if (orders.length === 0) {
    return `<div class="empty-state"><div class="empty-icon">📦</div><div class="empty-title">暂无订单</div><div class="empty-desc">点击"新建订单"创建第一笔订单</div></div>`;
  }
  return `<ul class="data-list">${orders.map(o => `
    <li class="data-item" data-order-id="${o.id}">
      <div class="data-item-avatar avatar-gold">${COUNTRY_FLAGS[o.country] || '📦'}</div>
      <div class="data-item-info">
        <div class="data-item-title">${o.customerName}</div>
        <div class="data-item-subtitle">${o.code} · ${o.description?.substring(0, 30) || ''}</div>
      </div>
      <div class="data-item-right">
        <div class="data-item-amount">${formatCurrency(o.totalAmount)}</div>
        <div style="margin-top:4px">${statusBadge(o.status)} ${statusBadge(o.balanceStatus)}</div>
      </div>
    </li>
  `).join('')}</ul>`;
}

function renderOrderForm(order = null) {
  const o = order || {};
  const customerOpts = allCustomers.map(c => `<option value="${c.id}" ${c.id === o.customerId ? 'selected' : ''}>${c.code} - ${c.name}</option>`).join('');

  return `
    <div class="form-group">
      <label class="form-label">选择客户 <span class="required">*</span></label>
      <select class="form-select" id="form-customer"><option value="">请选择客户</option>${customerOpts}</select>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label class="form-label">下单日期</label>
        <input class="form-input" id="form-order-date" type="date" value="${o.orderDate || today()}">
      </div>
      <div class="form-group">
        <label class="form-label">订单状态</label>
        <select class="form-select" id="form-status">${createOptions(ORDER_STATUSES, o.status || '待确认')}</select>
      </div>
    </div>
    <div class="form-group">
      <label class="form-label">货品描述 <span class="required">*</span></label>
      <textarea class="form-textarea" id="form-desc" placeholder="如：蕾丝连衣裙5款 + Ankara风格3款">${o.description || ''}</textarea>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label class="form-label">款号数量</label>
        <input class="form-input" id="form-styles" type="number" value="${o.styleCount || ''}" min="1">
      </div>
      <div class="form-group">
        <label class="form-label">总件数</label>
        <input class="form-input" id="form-pieces" type="number" value="${o.totalPieces || ''}" min="1">
      </div>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label class="form-label">单价区间 ($)</label>
        <input class="form-input" id="form-price-range" value="${o.priceRange || ''}" placeholder="如 7-14">
      </div>
      <div class="form-group">
        <label class="form-label">订单总额 ($) <span class="required">*</span></label>
        <input class="form-input" id="form-total" type="number" value="${o.totalAmount || ''}" min="0" step="0.01">
      </div>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label class="form-label">定金比例</label>
        <select class="form-select" id="form-deposit-rate">${createOptions(['', ...DEPOSIT_RATES], o.depositRate)}</select>
      </div>
      <div class="form-group">
        <label class="form-label">已收定金 ($)</label>
        <input class="form-input" id="form-deposit" type="number" value="${o.depositPaid || ''}" min="0" step="0.01">
      </div>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label class="form-label">尾款 ($)</label>
        <input class="form-input" id="form-balance" type="number" value="${o.balance || ''}" min="0" step="0.01">
      </div>
      <div class="form-group">
        <label class="form-label">尾款状态</label>
        <select class="form-select" id="form-balance-status">${createOptions(BALANCE_STATUSES, o.balanceStatus || '未付')}</select>
      </div>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label class="form-label">出货方式</label>
        <select class="form-select" id="form-shipping">${createOptions(['', ...SHIPPING_METHODS], o.shippingMethod)}</select>
      </div>
      <div class="form-group">
        <label class="form-label">货柜规格</label>
        <select class="form-select" id="form-container">${createOptions(['', ...CONTAINER_SPECS], o.containerSpec)}</select>
      </div>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label class="form-label">预计出货日</label>
        <input class="form-input" id="form-est-ship" type="date" value="${o.estimatedShipDate || ''}">
      </div>
      <div class="form-group">
        <label class="form-label">实际出货日</label>
        <input class="form-input" id="form-act-ship" type="date" value="${o.actualShipDate || ''}">
      </div>
    </div>
    <div class="form-group">
      <label class="form-label">备注</label>
      <textarea class="form-textarea" id="form-notes">${o.notes || ''}</textarea>
    </div>
  `;
}

function openOrderModal(order = null) {
  const isEdit = !!order;
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay active';
  overlay.innerHTML = `
    <div class="modal-sheet">
      <div class="modal-handle"></div>
      <div class="modal-header">
        <h3 class="modal-title">${isEdit ? '编辑订单' : '新建订单'}</h3>
        <button class="modal-close" id="modal-close">✕</button>
      </div>
      <div class="modal-body">${renderOrderForm(order)}</div>
      <div class="modal-footer">
        <button class="btn btn-secondary" id="modal-cancel">取消</button>
        <button class="btn btn-primary" id="modal-save">${isEdit ? '保存' : '创建订单'}</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);

  const close = () => overlay.remove();
  overlay.querySelector('#modal-close').addEventListener('click', close);
  overlay.querySelector('#modal-cancel').addEventListener('click', close);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });

  overlay.querySelector('#modal-save').addEventListener('click', async () => {
    const customerId = Number(overlay.querySelector('#form-customer').value);
    const description = overlay.querySelector('#form-desc').value.trim();
    const totalAmount = Number(overlay.querySelector('#form-total').value);

    if (!customerId || !description || !totalAmount) {
      showToast('请填写客户、货品描述和总额', 'warning');
      return;
    }

    const customer = allCustomers.find(c => c.id === customerId);
    const data = {
      customerId,
      customerName: customer?.name || '',
      country: customer?.country || '',
      orderDate: overlay.querySelector('#form-order-date').value,
      description,
      styleCount: Number(overlay.querySelector('#form-styles').value) || 0,
      totalPieces: Number(overlay.querySelector('#form-pieces').value) || 0,
      priceRange: overlay.querySelector('#form-price-range').value.trim(),
      totalAmount,
      depositRate: overlay.querySelector('#form-deposit-rate').value,
      depositPaid: Number(overlay.querySelector('#form-deposit').value) || 0,
      balance: Number(overlay.querySelector('#form-balance').value) || 0,
      balanceStatus: overlay.querySelector('#form-balance-status').value || '未付',
      shippingMethod: overlay.querySelector('#form-shipping').value,
      containerSpec: overlay.querySelector('#form-container').value,
      estimatedShipDate: overlay.querySelector('#form-est-ship').value,
      actualShipDate: overlay.querySelector('#form-act-ship').value,
      status: overlay.querySelector('#form-status').value,
      notes: overlay.querySelector('#form-notes').value.trim(),
    };

    if (isEdit) {
      Object.assign(order, data);
      await updateRecord(STORES.orders, order);
      showToast('订单已更新');
    } else {
      const year = new Date().getFullYear();
      const num = await getNextCounter('order');
      data.code = `ORD-${year}-${String(num).padStart(3, '0')}`;
      await addRecord(STORES.orders, data);
      showToast('订单创建成功');
    }

    close();
    const mainEl = document.getElementById('page-container');
    if (mainEl) renderOrders(mainEl);
  });
}

function openOrderDetailModal(orderId) {
  const order = allOrders.find(o => o.id === orderId);
  if (!order) return;

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay active';
  overlay.innerHTML = `
    <div class="modal-sheet">
      <div class="modal-handle"></div>
      <div class="modal-header">
        <h3 class="modal-title">订单详情</h3>
        <button class="modal-close" id="modal-close">✕</button>
      </div>
      <div class="modal-body no-padding" style="padding:0">
        <div class="detail-header">
          <div class="detail-avatar">📦</div>
          <div>
            <div class="detail-name">${order.code}</div>
            <div class="detail-code">${order.customerName} · ${order.country}</div>
          </div>
        </div>
        <div class="detail-section">
          <div class="detail-section-title">订单信息</div>
          <div class="detail-row"><span class="detail-label">下单日期</span><span class="detail-value">${formatDate(order.orderDate)}</span></div>
          <div class="detail-row"><span class="detail-label">货品描述</span><span class="detail-value">${order.description || '-'}</span></div>
          <div class="detail-row"><span class="detail-label">款号数/总件数</span><span class="detail-value">${order.styleCount || 0} 款 / ${order.totalPieces || 0} 件</span></div>
          <div class="detail-row"><span class="detail-label">单价区间</span><span class="detail-value">$${order.priceRange || '-'}</span></div>
          <div class="detail-row"><span class="detail-label">订单总额</span><span class="detail-value fw-bold">${formatCurrency(order.totalAmount)}</span></div>
          <div class="detail-row"><span class="detail-label">订单状态</span><span class="detail-value">${statusBadge(order.status)}</span></div>
        </div>
        <div class="detail-section">
          <div class="detail-section-title">收款信息</div>
          <div class="detail-row"><span class="detail-label">定金比例</span><span class="detail-value">${order.depositRate || '-'}</span></div>
          <div class="detail-row"><span class="detail-label">已收定金</span><span class="detail-value">${formatCurrency(order.depositPaid)}</span></div>
          <div class="detail-row"><span class="detail-label">尾款</span><span class="detail-value fw-bold">${formatCurrency(order.balance)}</span></div>
          <div class="detail-row"><span class="detail-label">尾款状态</span><span class="detail-value">${statusBadge(order.balanceStatus)}</span></div>
        </div>
        <div class="detail-section">
          <div class="detail-section-title">物流信息</div>
          <div class="detail-row"><span class="detail-label">出货方式</span><span class="detail-value">${order.shippingMethod || '-'}</span></div>
          <div class="detail-row"><span class="detail-label">货柜规格</span><span class="detail-value">${order.containerSpec || '-'}</span></div>
          <div class="detail-row"><span class="detail-label">预计出货</span><span class="detail-value">${formatDate(order.estimatedShipDate)}</span></div>
          <div class="detail-row"><span class="detail-label">实际出货</span><span class="detail-value">${formatDate(order.actualShipDate)}</span></div>
        </div>
        ${order.notes ? `<div class="detail-section"><div class="detail-section-title">备注</div><p style="font-size:13px">${order.notes}</p></div>` : ''}
      </div>
      <div class="modal-footer" style="flex-wrap:wrap;gap:8px">
        <button class="btn btn-danger btn-sm" id="modal-delete">删除</button>
        <button class="btn btn-secondary" id="modal-close2" style="flex:1">关闭</button>
        <button class="btn btn-primary" id="modal-edit" style="flex:1">编辑</button>
        <button class="btn btn-accent" id="modal-share" style="width:100%;margin-top:4px"><span style="margin-right:4px">📤</span>发送分享包给客户/合伙人</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);

  const close = () => overlay.remove();
  overlay.querySelector('#modal-close').addEventListener('click', close);
  overlay.querySelector('#modal-close2').addEventListener('click', close);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
  overlay.querySelector('#modal-edit').addEventListener('click', () => { close(); openOrderModal(order); });
  overlay.querySelector('#modal-share').addEventListener('click', async () => {
    const btn = overlay.querySelector('#modal-share');
    btn.innerHTML = '打包中...';
    btn.style.opacity = '0.7';
    try {
      await exportSharePackage(order.id);
      showToast('分享包已生成');
    } catch (e) {
      showToast('打包失败', 'error');
      console.error(e);
    } finally {
      btn.innerHTML = '<span style="margin-right:4px">📤</span>发送分享包给客户/合伙人';
      btn.style.opacity = '1';
    }
  });
  overlay.querySelector('#modal-delete').addEventListener('click', async () => {
    const ok = await showConfirm(`确定删除订单 "${order.code}" 吗？`);
    if (ok) {
      await deleteRecord(STORES.orders, order.id);
      showToast('订单已删除', 'info');
      close();
      const mainEl = document.getElementById('page-container');
      if (mainEl) renderOrders(mainEl);
    }
  });
}
