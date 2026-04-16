/**
 * 🏭 工厂管理页面
 * 工厂档案 + 生产工单
 */
import { getAllRecords, addRecord, updateRecord, deleteRecord, getNextCounter, STORES } from '../db.js';
import {
  FACTORY_RATINGS, FACTORY_PAYMENT_TERMS, FACTORY_SPECIALTIES, PRODUCTION_STATUSES,
  createOptions, formatCurrency, formatCNY, formatDate, statusBadge, matchesSearch,
  showToast, showConfirm, debounce, today, isOverdue
} from '../utils/helpers.js';

let activeTab = 'orders'; // 'factories' | 'orders'

export async function renderFactory(container) {
  const [factories, productionOrders, orders, products] = await Promise.all([
    getAllRecords(STORES.factories),
    getAllRecords(STORES.productionOrders),
    getAllRecords(STORES.orders),
    getAllRecords(STORES.products),
  ]);

  const prodCount = productionOrders.filter(p => p.status === '生产中').length;
  const qcCount = productionOrders.filter(p => p.status === '质检中').length;
  const overdueCount = productionOrders.filter(p => ['生产中', '质检中', '待排产'].includes(p.status) && isOverdue(p.requiredDate)).length;

  container.innerHTML = `
    <div class="page-header">
      <h1 class="page-title"><span class="title-icon">🏭</span>工厂管理</h1>
      <div class="page-actions">
        <button class="btn btn-primary btn-sm" id="btn-add-main">+ ${activeTab === 'factories' ? '新增工厂' : '新建工单'}</button>
      </div>
    </div>
    <div class="page-content">
      <div class="kpi-grid" style="grid-template-columns:1fr 1fr 1fr">
        <div class="kpi-card kpi-blue">
          <div class="kpi-label">生产中</div>
          <div class="kpi-value">${prodCount}<span class="kpi-unit">单</span></div>
          <div class="kpi-icon">🔧</div>
        </div>
        <div class="kpi-card kpi-gold">
          <div class="kpi-label">质检中</div>
          <div class="kpi-value">${qcCount}<span class="kpi-unit">单</span></div>
          <div class="kpi-icon">🔍</div>
        </div>
        <div class="kpi-card ${overdueCount > 0 ? 'kpi-red' : 'kpi-green'}">
          <div class="kpi-label">逾期交货</div>
          <div class="kpi-value">${overdueCount}<span class="kpi-unit">单</span></div>
          <div class="kpi-icon">${overdueCount > 0 ? '⚠️' : '✅'}</div>
        </div>
      </div>

      <!-- Tab Switch -->
      <div class="filter-bar mb-16">
        <button class="filter-chip ${activeTab === 'orders' ? 'active' : ''}" data-tab="orders">📋 生产工单 (${productionOrders.length})</button>
        <button class="filter-chip ${activeTab === 'factories' ? 'active' : ''}" data-tab="factories">🏭 工厂档案 (${factories.length})</button>
      </div>

      <div class="card">
        <div class="card-body no-padding" id="factory-content">
          ${activeTab === 'factories' ? renderFactoryList(factories, productionOrders) : renderPOList(productionOrders, factories)}
        </div>
      </div>
    </div>
    <button class="btn btn-accent btn-fab" id="btn-fab-factory">+</button>
  `;

  // Tab switching
  container.querySelectorAll('[data-tab]').forEach(btn => {
    btn.addEventListener('click', () => {
      activeTab = btn.dataset.tab;
      const mainEl = document.getElementById('page-container');
      if (mainEl) renderFactory(mainEl);
    });
  });

  // Add button
  const openForm = () => {
    if (activeTab === 'factories') openFactoryModal(null);
    else openPOModal(null, factories, orders, products);
  };
  container.querySelector('#btn-add-main')?.addEventListener('click', openForm);
  container.querySelector('#btn-fab-factory')?.addEventListener('click', openForm);

  // List click events
  container.querySelectorAll('[data-factory-id]').forEach(el => {
    el.addEventListener('click', () => {
      const f = factories.find(ff => ff.id === Number(el.dataset.factoryId));
      if (f) openFactoryDetailModal(f, productionOrders);
    });
  });
  container.querySelectorAll('[data-po-id]').forEach(el => {
    el.addEventListener('click', () => {
      const po = productionOrders.find(p => p.id === Number(el.dataset.poId));
      if (po) openPODetailModal(po, factories, orders, products);
    });
  });
}

// === 工厂列表 ===
function renderFactoryList(factories, pos) {
  if (factories.length === 0) {
    return '<div class="empty-state"><div class="empty-icon">🏭</div><div class="empty-title">暂无工厂</div></div>';
  }
  return `<ul class="data-list">${factories.map(f => {
    const activeOrders = pos.filter(p => p.factoryId === f.id && !['已交货', '已取消'].includes(p.status)).length;
    return `
      <li class="data-item" data-factory-id="${f.id}">
        <div class="data-item-avatar avatar-blue">🏭</div>
        <div class="data-item-info">
          <div class="data-item-title">${f.name}</div>
          <div class="data-item-subtitle">${f.code} · ${f.specialty} · ${f.contact}</div>
        </div>
        <div class="data-item-right">
          ${statusBadge(f.rating)}
          ${activeOrders > 0 ? `<div class="data-item-meta mt-4">${activeOrders}单进行中</div>` : ''}
        </div>
      </li>
    `;
  }).join('')}</ul>`;
}

// === 生产工单列表 ===
function renderPOList(pos, factories) {
  if (pos.length === 0) {
    return '<div class="empty-state"><div class="empty-icon">📋</div><div class="empty-title">暂无生产工单</div></div>';
  }
  const sorted = [...pos].sort((a, b) => (b.orderDate || '').localeCompare(a.orderDate || ''));
  return `<ul class="data-list">${sorted.map(po => {
    const overdue = ['生产中', '质检中', '待排产'].includes(po.status) && isOverdue(po.requiredDate);
    return `
      <li class="data-item" data-po-id="${po.id}" ${overdue ? 'style="border-left:3px solid var(--danger)"' : ''}>
        <div class="data-item-avatar ${po.status === '已交货' ? 'avatar-green' : po.status === '生产中' ? 'avatar-gold' : 'avatar-blue'}">
          ${po.status === '已交货' ? '✅' : po.status === '质检中' ? '🔍' : '🔧'}
        </div>
        <div class="data-item-info">
          <div class="data-item-title">${po.factoryName} · ${po.productName || ''}</div>
          <div class="data-item-subtitle">${po.code} · ${po.quantity}件 · 交期 ${po.requiredDate || '-'}</div>
        </div>
        <div class="data-item-right">
          <div class="data-item-amount">${formatCNY(po.totalCost)}</div>
          ${statusBadge(po.status)}
          ${overdue ? '<div class="data-item-meta" style="color:var(--danger);font-weight:600">逾期!</div>' : ''}
        </div>
      </li>
    `;
  }).join('')}</ul>`;
}

// === 工厂表单 ===
function openFactoryModal(factory) {
  const isEdit = !!factory;
  const f = factory || {};
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay active';
  overlay.innerHTML = `
    <div class="modal-sheet">
      <div class="modal-handle"></div>
      <div class="modal-header"><h3 class="modal-title">${isEdit ? '编辑工厂' : '新增工厂'}</h3><button class="modal-close" id="modal-close">✕</button></div>
      <div class="modal-body">
        <div class="form-row">
          <div class="form-group"><label class="form-label">工厂名称 <span class="required">*</span></label><input class="form-input" id="form-name" value="${f.name || ''}" placeholder="如 广州锦绣蕾丝厂"></div>
          <div class="form-group"><label class="form-label">联系人</label><input class="form-input" id="form-contact" value="${f.contact || ''}"></div>
        </div>
        <div class="form-row">
          <div class="form-group"><label class="form-label">电话/微信</label><input class="form-input" id="form-phone" value="${f.phone || ''}"></div>
          <div class="form-group"><label class="form-label">主营品类</label><select class="form-select" id="form-specialty">${createOptions(['', ...FACTORY_SPECIALTIES], f.specialty)}</select></div>
        </div>
        <div class="form-group"><label class="form-label">地址</label><input class="form-input" id="form-address" value="${f.address || ''}"></div>
        <div class="form-row">
          <div class="form-group"><label class="form-label">评级</label><select class="form-select" id="form-rating">${createOptions(['', ...FACTORY_RATINGS], f.rating)}</select></div>
          <div class="form-group"><label class="form-label">结算方式</label><select class="form-select" id="form-terms">${createOptions(['', ...FACTORY_PAYMENT_TERMS], f.paymentTerms)}</select></div>
        </div>
        <div class="form-group"><label class="form-label">备注</label><textarea class="form-textarea" id="form-notes">${f.notes || ''}</textarea></div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" id="modal-cancel">取消</button>
        <button class="btn btn-primary" id="modal-save">${isEdit ? '保存' : '添加'}</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);
  const close = () => overlay.remove();
  overlay.querySelector('#modal-close').addEventListener('click', close);
  overlay.querySelector('#modal-cancel').addEventListener('click', close);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });

  overlay.querySelector('#modal-save').addEventListener('click', async () => {
    const name = overlay.querySelector('#form-name').value.trim();
    if (!name) { showToast('请填写工厂名称', 'warning'); return; }
    const data = {
      name, contact: overlay.querySelector('#form-contact').value.trim(),
      phone: overlay.querySelector('#form-phone').value.trim(),
      address: overlay.querySelector('#form-address').value.trim(),
      specialty: overlay.querySelector('#form-specialty').value,
      rating: overlay.querySelector('#form-rating').value,
      paymentTerms: overlay.querySelector('#form-terms').value,
      notes: overlay.querySelector('#form-notes').value.trim(),
    };
    if (isEdit) {
      Object.assign(factory, data);
      await updateRecord(STORES.factories, factory);
      showToast('工厂信息已更新');
    } else {
      const num = await getNextCounter('factory');
      data.code = `FAC-${String(num).padStart(3, '0')}`;
      await addRecord(STORES.factories, data);
      showToast('工厂已添加');
    }
    close();
    const mainEl = document.getElementById('page-container');
    if (mainEl) renderFactory(mainEl);
  });
}

// === 工厂详情 ===
function openFactoryDetailModal(f, pos) {
  const factoryPOs = pos.filter(p => p.factoryId === f.id);
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay active';
  overlay.innerHTML = `
    <div class="modal-sheet">
      <div class="modal-handle"></div>
      <div class="modal-header"><h3 class="modal-title">工厂详情</h3><button class="modal-close" id="modal-close">✕</button></div>
      <div class="modal-body no-padding" style="padding:0">
        <div class="detail-header" style="background:linear-gradient(135deg,#2C3E50,#34495E)">
          <div class="detail-avatar">🏭</div>
          <div><div class="detail-name">${f.name}</div><div class="detail-code">${f.code} · ${f.specialty || ''}</div></div>
        </div>
        <div class="detail-section">
          <div class="detail-row"><span class="detail-label">联系人</span><span class="detail-value">${f.contact || '-'}</span></div>
          <div class="detail-row"><span class="detail-label">电话/微信</span><span class="detail-value">${f.phone || '-'}</span></div>
          <div class="detail-row"><span class="detail-label">地址</span><span class="detail-value">${f.address || '-'}</span></div>
          <div class="detail-row"><span class="detail-label">评级</span><span class="detail-value">${statusBadge(f.rating)}</span></div>
          <div class="detail-row"><span class="detail-label">结算方式</span><span class="detail-value">${f.paymentTerms || '-'}</span></div>
        </div>
        ${factoryPOs.length > 0 ? `
          <div class="detail-section">
            <div class="detail-section-title">生产记录 (${factoryPOs.length}单)</div>
            ${factoryPOs.slice(0, 5).map(po => `
              <div class="detail-row">
                <span class="detail-label">${po.code}</span>
                <span class="detail-value">${po.productName?.substring(0, 15) || ''} · ${po.quantity}件 ${statusBadge(po.status)}</span>
              </div>
            `).join('')}
          </div>
        ` : ''}
        ${f.notes ? `<div class="detail-section"><div class="detail-section-title">备注</div><p style="font-size:13px">${f.notes}</p></div>` : ''}
      </div>
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
  overlay.querySelector('#modal-edit').addEventListener('click', () => { close(); openFactoryModal(f); });
  overlay.querySelector('#modal-delete').addEventListener('click', async () => {
    if (await showConfirm(`确定删除 "${f.name}" 吗？`)) {
      await deleteRecord(STORES.factories, f.id); showToast('已删除', 'info'); close();
      const mainEl = document.getElementById('page-container');
      if (mainEl) renderFactory(mainEl);
    }
  });
}

// === 生产工单表单 ===
function openPOModal(po, factories, orders, products) {
  const isEdit = !!po;
  const p = po || {};
  const factoryOpts = factories.map(f => `<option value="${f.id}" ${f.id === p.factoryId ? 'selected' : ''}>${f.code} - ${f.name}</option>`).join('');
  const orderOpts = orders.map(o => `<option value="${o.id}" ${o.id === p.orderId ? 'selected' : ''}>${o.code} - ${o.customerName}</option>`).join('');
  const productOpts = products.map(pr => `<option value="${pr.id}" ${pr.id === p.productId ? 'selected' : ''}>${pr.code} - ${pr.name}</option>`).join('');

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay active';
  overlay.innerHTML = `
    <div class="modal-sheet">
      <div class="modal-handle"></div>
      <div class="modal-header"><h3 class="modal-title">${isEdit ? '编辑工单' : '新建生产工单'}</h3><button class="modal-close" id="modal-close">✕</button></div>
      <div class="modal-body">
        <div class="form-group"><label class="form-label">选择工厂 <span class="required">*</span></label><select class="form-select" id="form-factory"><option value="">请选择</option>${factoryOpts}</select></div>
        <div class="form-group"><label class="form-label">关联客户订单 (可选)</label><select class="form-select" id="form-order"><option value="">无关联订单</option>${orderOpts}</select></div>
        <div class="form-group"><label class="form-label">关联产品 (可选)</label><select class="form-select" id="form-product"><option value="">无关联产品</option>${productOpts}</select></div>
        <div class="form-group"><label class="form-label">产品描述</label><input class="form-input" id="form-desc" value="${p.productName || ''}" placeholder="如 蕾丝连衣裙5色"></div>
        <div class="form-row">
          <div class="form-group"><label class="form-label">数量 (件) <span class="required">*</span></label><input class="form-input" id="form-qty" type="number" value="${p.quantity || ''}" min="1"></div>
          <div class="form-group"><label class="form-label">单价 (¥)</label><input class="form-input" id="form-cost" type="number" value="${p.unitCost || ''}" step="0.01"></div>
        </div>
        <div class="form-row">
          <div class="form-group"><label class="form-label">总费用 (¥)</label><input class="form-input" id="form-total" type="number" value="${p.totalCost || ''}" step="0.01"></div>
          <div class="form-group"><label class="form-label">状态</label><select class="form-select" id="form-status">${createOptions(PRODUCTION_STATUSES, p.status || '待排产')}</select></div>
        </div>
        <div class="form-row">
          <div class="form-group"><label class="form-label">下单日期</label><input class="form-input" id="form-date" type="date" value="${p.orderDate || today()}"></div>
          <div class="form-group"><label class="form-label">要求交货日</label><input class="form-input" id="form-required" type="date" value="${p.requiredDate || ''}"></div>
        </div>
        <div class="form-group"><label class="form-label">实际交货日</label><input class="form-input" id="form-delivery" type="date" value="${p.actualDeliveryDate || ''}"></div>
        <div class="form-group"><label class="form-label">质量备注</label><textarea class="form-textarea" id="form-quality">${p.qualityNotes || ''}</textarea></div>
        <div class="form-group"><label class="form-label">备注</label><textarea class="form-textarea" id="form-notes">${p.notes || ''}</textarea></div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" id="modal-cancel">取消</button>
        <button class="btn btn-primary" id="modal-save">${isEdit ? '保存' : '创建工单'}</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);

  // Auto-calculate total
  const qtyInput = overlay.querySelector('#form-qty');
  const costInput = overlay.querySelector('#form-cost');
  const totalInput = overlay.querySelector('#form-total');
  const calcTotal = () => {
    const q = Number(qtyInput.value) || 0;
    const c = Number(costInput.value) || 0;
    if (q && c) totalInput.value = Math.round(q * c);
  };
  qtyInput.addEventListener('input', calcTotal);
  costInput.addEventListener('input', calcTotal);

  // Auto-fill product name
  overlay.querySelector('#form-product').addEventListener('change', (e) => {
    const prod = products.find(pr => pr.id === Number(e.target.value));
    if (prod) {
      overlay.querySelector('#form-desc').value = prod.name;
      if (!costInput.value) costInput.value = prod.factoryPrice || '';
      calcTotal();
    }
  });

  const close = () => overlay.remove();
  overlay.querySelector('#modal-close').addEventListener('click', close);
  overlay.querySelector('#modal-cancel').addEventListener('click', close);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });

  overlay.querySelector('#modal-save').addEventListener('click', async () => {
    const factoryId = Number(overlay.querySelector('#form-factory').value);
    const quantity = Number(overlay.querySelector('#form-qty').value);
    if (!factoryId || !quantity) { showToast('请选择工厂并填写数量', 'warning'); return; }

    const factory = factories.find(f => f.id === factoryId);
    const orderId = Number(overlay.querySelector('#form-order').value) || 0;
    const order = orders.find(o => o.id === orderId);
    const productId = Number(overlay.querySelector('#form-product').value) || 0;
    const product = products.find(pr => pr.id === productId);

    const data = {
      factoryId, factoryName: factory?.name || '',
      orderId, orderCode: order?.code || '',
      productId, productCode: product?.code || '',
      productName: overlay.querySelector('#form-desc').value.trim() || product?.name || '',
      quantity,
      unitCost: Number(overlay.querySelector('#form-cost').value) || 0,
      totalCost: Number(overlay.querySelector('#form-total').value) || 0,
      orderDate: overlay.querySelector('#form-date').value,
      requiredDate: overlay.querySelector('#form-required').value,
      actualDeliveryDate: overlay.querySelector('#form-delivery').value,
      status: overlay.querySelector('#form-status').value,
      qualityNotes: overlay.querySelector('#form-quality').value.trim(),
      notes: overlay.querySelector('#form-notes').value.trim(),
    };

    if (isEdit) {
      Object.assign(po, data);
      await updateRecord(STORES.productionOrders, po);
      showToast('工单已更新');
    } else {
      const year = new Date().getFullYear();
      const num = await getNextCounter('po');
      data.code = `PO-${year}-${String(num).padStart(3, '0')}`;
      await addRecord(STORES.productionOrders, data);
      showToast('生产工单已创建');
    }

    // 如果状态改为"已交货"，提示是否入库
    if (data.status === '已交货' && data.productId) {
      const doInbound = await showConfirm(`工单已交货，是否自动创建入库记录？\n${data.productName} × ${data.quantity}件`);
      if (doInbound) {
        const invNum = await getNextCounter('inv');
        const year = new Date().getFullYear();
        await addRecord(STORES.inventory, {
          code: `INV-${year}-${String(invNum).padStart(3, '0')}`,
          type: '入库', productId: data.productId, productCode: data.productCode,
          productName: data.productName, quantity: data.quantity,
          reason: '工厂到货', orderId: 0, orderCode: '', productionOrderId: po?.id || 0,
          date: today(), warehouse: '主仓', operator: '林经理', notes: `工单 ${data.code} 交货入库`,
        });
        // 更新产品库存
        const prod = await getAllRecords(STORES.products).then(ps => ps.find(pp => pp.id === data.productId));
        if (prod) {
          prod.stockQty = (prod.stockQty || 0) + data.quantity;
          await updateRecord(STORES.products, prod);
        }
        showToast(`${data.quantity}件已入库`);
      }
    }

    close();
    const mainEl = document.getElementById('page-container');
    if (mainEl) renderFactory(mainEl);
  });
}

// === 工单详情 ===
function openPODetailModal(po, factories, orders, products) {
  const overdue = ['生产中', '质检中', '待排产'].includes(po.status) && isOverdue(po.requiredDate);
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay active';
  overlay.innerHTML = `
    <div class="modal-sheet">
      <div class="modal-handle"></div>
      <div class="modal-header"><h3 class="modal-title">工单详情</h3><button class="modal-close" id="modal-close">✕</button></div>
      <div class="modal-body no-padding" style="padding:0">
        <div class="detail-header" style="background:linear-gradient(135deg,${overdue ? '#C0392B,#E74C3C' : '#2C3E50,#34495E'})">
          <div class="detail-avatar">${po.status === '已交货' ? '✅' : '🔧'}</div>
          <div><div class="detail-name">${po.code}</div><div class="detail-code">${po.factoryName}${overdue ? ' · ⚠️ 已逾期!' : ''}</div></div>
        </div>
        <div class="detail-section">
          <div class="detail-section-title">生产信息</div>
          <div class="detail-row"><span class="detail-label">产品</span><span class="detail-value">${po.productName || '-'}</span></div>
          <div class="detail-row"><span class="detail-label">款号</span><span class="detail-value">${po.productCode || '-'}</span></div>
          <div class="detail-row"><span class="detail-label">数量</span><span class="detail-value fw-bold">${po.quantity || 0} 件</span></div>
          <div class="detail-row"><span class="detail-label">单价</span><span class="detail-value">${formatCNY(po.unitCost)}</span></div>
          <div class="detail-row"><span class="detail-label">总费用</span><span class="detail-value fw-bold">${formatCNY(po.totalCost)}</span></div>
          <div class="detail-row"><span class="detail-label">状态</span><span class="detail-value">${statusBadge(po.status)}</span></div>
        </div>
        <div class="detail-section">
          <div class="detail-section-title">时间</div>
          <div class="detail-row"><span class="detail-label">下单日期</span><span class="detail-value">${formatDate(po.orderDate)}</span></div>
          <div class="detail-row"><span class="detail-label">要求交货</span><span class="detail-value" ${overdue ? 'style="color:var(--danger);font-weight:700"' : ''}>${formatDate(po.requiredDate)} ${overdue ? '(已逾期!)' : ''}</span></div>
          <div class="detail-row"><span class="detail-label">实际交货</span><span class="detail-value">${formatDate(po.actualDeliveryDate)}</span></div>
        </div>
        ${po.orderCode ? `<div class="detail-section"><div class="detail-row"><span class="detail-label">关联订单</span><span class="detail-value">${po.orderCode}</span></div></div>` : ''}
        ${po.qualityNotes ? `<div class="detail-section"><div class="detail-section-title">质量备注</div><p style="font-size:13px">${po.qualityNotes}</p></div>` : ''}
        ${po.notes ? `<div class="detail-section"><div class="detail-section-title">备注</div><p style="font-size:13px">${po.notes}</p></div>` : ''}
      </div>
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
  overlay.querySelector('#modal-edit').addEventListener('click', () => { close(); openPOModal(po, factories, orders, products); });
  overlay.querySelector('#modal-delete').addEventListener('click', async () => {
    if (await showConfirm(`确定删除工单 "${po.code}" 吗？`)) {
      await deleteRecord(STORES.productionOrders, po.id); showToast('已删除', 'info'); close();
      const mainEl = document.getElementById('page-container');
      if (mainEl) renderFactory(mainEl);
    }
  });
}
