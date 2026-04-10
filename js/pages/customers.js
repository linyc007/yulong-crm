/**
 * 📋 客户管理页面
 */
import { getAllRecords, addRecord, updateRecord, deleteRecord, getNextCounter, getByIndex, STORES } from '../db.js';
import {
  COUNTRIES, CUSTOMER_TYPES, CUSTOMER_STATUSES, CREDIT_LEVELS, SIZE_RANGES,
  COUNTRY_CODES, COUNTRY_FLAGS, createOptions, formatCurrency, formatDate,
  statusBadge, matchesSearch, showToast, showConfirm, debounce
} from '../utils/helpers.js';

let allCustomers = [];
let filteredCustomers = [];
let filterCountry = '';
let filterStatus = '';
let searchQuery = '';

export async function renderCustomers(container) {
  allCustomers = await getAllRecords(STORES.customers);
  applyFilters();

  container.innerHTML = `
    <div class="page-header">
      <h1 class="page-title"><span class="title-icon">👥</span>客户管理</h1>
      <div class="page-actions">
        <button class="btn btn-primary btn-sm" id="btn-add-customer">+ 新增客户</button>
      </div>
    </div>
    <div class="page-content">
      <div class="search-bar mb-16">
        <span class="search-icon">🔍</span>
        <input class="form-input" id="customer-search" placeholder="搜索客户名称、编号、联系人..." value="${searchQuery}">
      </div>
      <div class="filter-bar" id="customer-filters">
        <button class="filter-chip ${!filterStatus ? 'active' : ''}" data-filter-status="">全部</button>
        ${CUSTOMER_STATUSES.map(s => `<button class="filter-chip ${filterStatus === s ? 'active' : ''}" data-filter-status="${s}">${s}</button>`).join('')}
      </div>
      <div class="card">
        <div class="card-body no-padding" id="customer-list-container">
          ${renderCustomerList()}
        </div>
      </div>
    </div>
    <button class="btn btn-accent btn-fab" id="btn-fab-customer">+</button>
  `;

  bindEvents(container);
}

function applyFilters() {
  filteredCustomers = allCustomers.filter(c => {
    if (filterCountry && c.country !== filterCountry) return false;
    if (filterStatus && c.status !== filterStatus) return false;
    if (searchQuery && !matchesSearch(c, searchQuery, ['name', 'code', 'contact', 'city', 'whatsapp', 'email'])) return false;
    return true;
  });
}

function renderCustomerList() {
  if (filteredCustomers.length === 0) {
    return `<div class="empty-state"><div class="empty-icon">👥</div><div class="empty-title">暂无客户</div><div class="empty-desc">点击"新增客户"添加您的第一个批发客户</div></div>`;
  }
  return `<ul class="data-list">${filteredCustomers.map(c => `
    <li class="data-item" data-customer-id="${c.id}">
      <div class="data-item-avatar avatar-blue">${COUNTRY_FLAGS[c.country] || '🌍'}</div>
      <div class="data-item-info">
        <div class="data-item-title">${c.name}</div>
        <div class="data-item-subtitle">${c.code} · ${c.city} · ${c.contact || ''}</div>
      </div>
      <div class="data-item-right">
        <div class="data-item-amount">${formatCurrency(c.totalPurchase)}</div>
        ${statusBadge(c.status)}
      </div>
    </li>
  `).join('')}</ul>`;
}

function renderCustomerDetail(customer) {
  return `
    <div class="detail-header">
      <div class="detail-avatar">${COUNTRY_FLAGS[customer.country] || '🌍'}</div>
      <div>
        <div class="detail-name">${customer.name}</div>
        <div class="detail-code">${customer.code} · ${customer.country} · ${customer.city}</div>
      </div>
    </div>
    <div class="detail-section">
      <div class="detail-section-title">基本信息</div>
      <div class="detail-row"><span class="detail-label">联系人</span><span class="detail-value">${customer.contact || '-'}</span></div>
      <div class="detail-row"><span class="detail-label">WhatsApp</span><span class="detail-value">${customer.whatsapp || '-'}</span></div>
      <div class="detail-row"><span class="detail-label">Email</span><span class="detail-value">${customer.email || '-'}</span></div>
      <div class="detail-row"><span class="detail-label">客户类型</span><span class="detail-value">${customer.type || '-'}</span></div>
      <div class="detail-row"><span class="detail-label">合作状态</span><span class="detail-value">${statusBadge(customer.status)}</span></div>
      <div class="detail-row"><span class="detail-label">信用等级</span><span class="detail-value">${statusBadge(customer.creditLevel)}</span></div>
      <div class="detail-row"><span class="detail-label">账期</span><span class="detail-value">${customer.creditDays || 0} 天</span></div>
    </div>
    <div class="detail-section">
      <div class="detail-section-title">采购信息</div>
      <div class="detail-row"><span class="detail-label">累计采购额</span><span class="detail-value fw-bold">${formatCurrency(customer.totalPurchase)}</span></div>
      <div class="detail-row"><span class="detail-label">最近下单</span><span class="detail-value">${formatDate(customer.lastOrderDate)}</span></div>
      <div class="detail-row"><span class="detail-label">品类偏好</span><span class="detail-value">${customer.categoryPreference || '-'}</span></div>
      <div class="detail-row"><span class="detail-label">尺码范围</span><span class="detail-value">${customer.sizeRange || '-'}</span></div>
      <div class="detail-row"><span class="detail-label">价位区间</span><span class="detail-value">${customer.priceRange ? '$' + customer.priceRange : '-'}</span></div>
    </div>
    ${customer.notes ? `<div class="detail-section"><div class="detail-section-title">备注</div><p style="font-size:13px;color:var(--text)">${customer.notes}</p></div>` : ''}
  `;
}

function renderCustomerForm(customer = null) {
  const c = customer || {};
  return `
    <div class="form-row">
      <div class="form-group">
        <label class="form-label">国家 <span class="required">*</span></label>
        <select class="form-select" id="form-country">${createOptions(['', ...COUNTRIES], c.country)}</select>
      </div>
      <div class="form-group">
        <label class="form-label">公司/客户名称 <span class="required">*</span></label>
        <input class="form-input" id="form-name" value="${c.name || ''}" placeholder="如 Afolabi Fashion Ltd">
      </div>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label class="form-label">城市</label>
        <input class="form-input" id="form-city" value="${c.city || ''}" placeholder="如 拉各斯">
      </div>
      <div class="form-group">
        <label class="form-label">联系人</label>
        <input class="form-input" id="form-contact" value="${c.contact || ''}" placeholder="如 Mr. Afolabi">
      </div>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label class="form-label">WhatsApp</label>
        <input class="form-input" id="form-whatsapp" value="${c.whatsapp || ''}" placeholder="+234 xxx">
      </div>
      <div class="form-group">
        <label class="form-label">Email</label>
        <input class="form-input" id="form-email" type="email" value="${c.email || ''}" placeholder="email@example.com">
      </div>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label class="form-label">客户类型</label>
        <select class="form-select" id="form-type">${createOptions(['', ...CUSTOMER_TYPES], c.type)}</select>
      </div>
      <div class="form-group">
        <label class="form-label">合作状态</label>
        <select class="form-select" id="form-status">${createOptions(['', ...CUSTOMER_STATUSES], c.status || '潜在')}</select>
      </div>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label class="form-label">信用等级</label>
        <select class="form-select" id="form-credit">${createOptions(['', ...CREDIT_LEVELS], c.creditLevel)}</select>
      </div>
      <div class="form-group">
        <label class="form-label">账期 (天)</label>
        <input class="form-input" id="form-credit-days" type="number" value="${c.creditDays || 0}" min="0">
      </div>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label class="form-label">品类偏好</label>
        <input class="form-input" id="form-category" value="${c.categoryPreference || ''}" placeholder="如 蕾丝连衣裙, Ankara风格">
      </div>
      <div class="form-group">
        <label class="form-label">尺码范围</label>
        <select class="form-select" id="form-size">${createOptions(['', ...SIZE_RANGES], c.sizeRange)}</select>
      </div>
    </div>
    <div class="form-group">
      <label class="form-label">价位区间 ($)</label>
      <input class="form-input" id="form-price-range" value="${c.priceRange || ''}" placeholder="如 8-15">
    </div>
    <div class="form-group">
      <label class="form-label">备注</label>
      <textarea class="form-textarea" id="form-notes" placeholder="其他备注信息...">${c.notes || ''}</textarea>
    </div>
  `;
}

function bindEvents(container) {
  // Search
  const searchInput = container.querySelector('#customer-search');
  if (searchInput) {
    searchInput.addEventListener('input', debounce((e) => {
      searchQuery = e.target.value;
      applyFilters();
      container.querySelector('#customer-list-container').innerHTML = renderCustomerList();
      bindListEvents(container);
    }));
  }

  // Filter chips
  container.querySelector('#customer-filters')?.addEventListener('click', (e) => {
    const chip = e.target.closest('.filter-chip');
    if (!chip) return;
    filterStatus = chip.dataset.filterStatus || '';
    container.querySelectorAll('#customer-filters .filter-chip').forEach(c => c.classList.remove('active'));
    chip.classList.add('active');
    applyFilters();
    container.querySelector('#customer-list-container').innerHTML = renderCustomerList();
    bindListEvents(container);
  });

  // Add buttons
  const addBtn = container.querySelector('#btn-add-customer');
  const fabBtn = container.querySelector('#btn-fab-customer');
  const openForm = () => openCustomerModal();
  addBtn?.addEventListener('click', openForm);
  fabBtn?.addEventListener('click', openForm);

  bindListEvents(container);
}

function bindListEvents(container) {
  container.querySelectorAll('[data-customer-id]').forEach(el => {
    el.addEventListener('click', () => openCustomerDetailModal(Number(el.dataset.customerId)));
  });
}

function openCustomerModal(customer = null) {
  const isEdit = !!customer;
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay active';
  overlay.innerHTML = `
    <div class="modal-sheet">
      <div class="modal-handle"></div>
      <div class="modal-header">
        <h3 class="modal-title">${isEdit ? '编辑客户' : '新增客户'}</h3>
        <button class="modal-close" id="modal-close">✕</button>
      </div>
      <div class="modal-body">${renderCustomerForm(customer)}</div>
      <div class="modal-footer">
        <button class="btn btn-secondary" id="modal-cancel">取消</button>
        <button class="btn btn-primary" id="modal-save">${isEdit ? '保存修改' : '添加客户'}</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);

  const close = () => overlay.remove();
  overlay.querySelector('#modal-close').addEventListener('click', close);
  overlay.querySelector('#modal-cancel').addEventListener('click', close);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });

  overlay.querySelector('#modal-save').addEventListener('click', async () => {
    const country = overlay.querySelector('#form-country').value;
    const name = overlay.querySelector('#form-name').value.trim();
    if (!country || !name) {
      showToast('请填写国家和客户名称', 'warning');
      return;
    }

    const data = {
      country,
      name,
      city: overlay.querySelector('#form-city').value.trim(),
      contact: overlay.querySelector('#form-contact').value.trim(),
      whatsapp: overlay.querySelector('#form-whatsapp').value.trim(),
      email: overlay.querySelector('#form-email').value.trim(),
      type: overlay.querySelector('#form-type').value,
      status: overlay.querySelector('#form-status').value || '潜在',
      creditLevel: overlay.querySelector('#form-credit').value,
      creditDays: Number(overlay.querySelector('#form-credit-days').value) || 0,
      categoryPreference: overlay.querySelector('#form-category').value.trim(),
      sizeRange: overlay.querySelector('#form-size').value,
      priceRange: overlay.querySelector('#form-price-range').value.trim(),
      notes: overlay.querySelector('#form-notes').value.trim(),
    };

    if (isEdit) {
      Object.assign(customer, data);
      await updateRecord(STORES.customers, customer);
      showToast('客户信息已更新');
    } else {
      const countryCode = COUNTRY_CODES[country] || 'XX';
      const num = await getNextCounter(countryCode);
      data.code = `${countryCode}-${String(num).padStart(3, '0')}`;
      data.totalPurchase = 0;
      data.lastOrderDate = '';
      await addRecord(STORES.customers, data);
      showToast('客户添加成功');
    }

    close();
    const mainEl = document.getElementById('page-container');
    if (mainEl) renderCustomers(mainEl);
  });
}

async function openCustomerDetailModal(customerId) {
  const customer = allCustomers.find(c => c.id === customerId);
  if (!customer) return;

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay active';
  overlay.innerHTML = `
    <div class="modal-sheet">
      <div class="modal-handle"></div>
      <div class="modal-header">
        <h3 class="modal-title">客户详情</h3>
        <button class="modal-close" id="modal-close">✕</button>
      </div>
      <div class="modal-body no-padding" style="padding:0">${renderCustomerDetail(customer)}</div>
      <div class="modal-footer">
        <button class="btn btn-danger btn-sm" id="modal-delete">删除</button>
        <button class="btn btn-secondary" id="modal-close2">关闭</button>
        <button class="btn btn-primary" id="modal-edit">编辑</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);

  const close = () => overlay.remove();
  overlay.querySelector('#modal-close').addEventListener('click', close);
  overlay.querySelector('#modal-close2').addEventListener('click', close);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });

  overlay.querySelector('#modal-edit').addEventListener('click', () => {
    close();
    openCustomerModal(customer);
  });

  overlay.querySelector('#modal-delete').addEventListener('click', async () => {
    const ok = await showConfirm(`确定删除客户 "${customer.name}" 吗？此操作不可撤销。`);
    if (ok) {
      await deleteRecord(STORES.customers, customer.id);
      showToast('客户已删除', 'info');
      close();
      const mainEl = document.getElementById('page-container');
      if (mainEl) renderCustomers(mainEl);
    }
  });
}
