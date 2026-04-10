/**
 * 💰 收款记录页面
 */
import { getAllRecords, addRecord, updateRecord, deleteRecord, getNextCounter, STORES } from '../db.js';
import {
  PAYMENT_TYPES, PAYMENT_METHODS, ARRIVAL_STATUSES,
  createOptions, formatCurrency, formatCNY, formatDate, statusBadge,
  matchesSearch, showToast, showConfirm, debounce, today
} from '../utils/helpers.js';

export async function renderPayments(container) {
  const [payments, orders] = await Promise.all([
    getAllRecords(STORES.payments),
    getAllRecords(STORES.orders),
  ]);
  const sorted = [...payments].sort((a, b) => (b.paymentDate || '').localeCompare(a.paymentDate || ''));

  const totalReceived = payments.filter(p => p.arrivalStatus === '已到账').reduce((s, p) => s + (Number(p.amount) || 0), 0);
  const pendingCount = payments.filter(p => p.arrivalStatus !== '已到账').length;

  container.innerHTML = `
    <div class="page-header">
      <h1 class="page-title"><span class="title-icon">💰</span>收款记录</h1>
      <div class="page-actions">
        <button class="btn btn-primary btn-sm" id="btn-add-payment">+ 新增收款</button>
      </div>
    </div>
    <div class="page-content">
      <div class="kpi-grid" style="grid-template-columns:1fr 1fr">
        <div class="kpi-card kpi-green">
          <div class="kpi-label">已到账总额</div>
          <div class="kpi-value">${formatCurrency(totalReceived)}</div>
          <div class="kpi-icon">✅</div>
        </div>
        <div class="kpi-card kpi-red">
          <div class="kpi-label">待确认</div>
          <div class="kpi-value">${pendingCount}<span class="kpi-unit">笔</span></div>
          <div class="kpi-icon">⏳</div>
        </div>
      </div>
      <div class="card">
        <div class="card-body no-padding">
          ${sorted.length === 0 ? '<div class="empty-state"><div class="empty-icon">💰</div><div class="empty-title">暂无收款记录</div></div>' :
          `<ul class="data-list">${sorted.map(p => `
            <li class="data-item" data-payment-id="${p.id}">
              <div class="data-item-avatar ${p.type === '定金' ? 'avatar-gold' : p.type === '尾款' ? 'avatar-green' : 'avatar-blue'}">
                ${p.type === '定金' ? '💎' : p.type === '尾款' ? '💵' : '💰'}
              </div>
              <div class="data-item-info">
                <div class="data-item-title">${p.customerName}</div>
                <div class="data-item-subtitle">${p.code} · ${p.type} · ${p.method}</div>
              </div>
              <div class="data-item-right">
                <div class="data-item-amount">${formatCurrency(p.amount)}</div>
                <div style="margin-top:4px">${statusBadge(p.arrivalStatus)}</div>
              </div>
            </li>
          `).join('')}</ul>`}
        </div>
      </div>
    </div>
    <button class="btn btn-accent btn-fab" id="btn-fab-payment">+</button>
  `;

  const openForm = () => openPaymentModal(null, orders);
  container.querySelector('#btn-add-payment')?.addEventListener('click', openForm);
  container.querySelector('#btn-fab-payment')?.addEventListener('click', openForm);

  container.querySelectorAll('[data-payment-id]').forEach(el => {
    el.addEventListener('click', () => {
      const p = sorted.find(pp => pp.id === Number(el.dataset.paymentId));
      if (p) openPaymentDetailModal(p, orders);
    });
  });
}

function openPaymentModal(payment, orders) {
  const isEdit = !!payment;
  const p = payment || {};
  const orderOpts = orders.map(o => `<option value="${o.id}" ${o.id === p.orderId ? 'selected' : ''}>${o.code} - ${o.customerName} (${formatCurrency(o.totalAmount)})</option>`).join('');

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay active';
  overlay.innerHTML = `
    <div class="modal-sheet">
      <div class="modal-handle"></div>
      <div class="modal-header">
        <h3 class="modal-title">${isEdit ? '编辑收款' : '新增收款'}</h3>
        <button class="modal-close" id="modal-close">✕</button>
      </div>
      <div class="modal-body">
        <div class="form-group">
          <label class="form-label">关联订单 <span class="required">*</span></label>
          <select class="form-select" id="form-order"><option value="">选择订单</option>${orderOpts}</select>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">收款日期</label>
            <input class="form-input" id="form-date" type="date" value="${p.paymentDate || today()}">
          </div>
          <div class="form-group">
            <label class="form-label">收款类型</label>
            <select class="form-select" id="form-type">${createOptions(PAYMENT_TYPES, p.type || '定金')}</select>
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">收款金额 ($) <span class="required">*</span></label>
            <input class="form-input" id="form-amount" type="number" value="${p.amount || ''}" min="0" step="0.01">
          </div>
          <div class="form-group">
            <label class="form-label">收款方式</label>
            <select class="form-select" id="form-method">${createOptions(PAYMENT_METHODS, p.method || 'T/T电汇')}</select>
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">汇率 (参考)</label>
            <input class="form-input" id="form-rate" type="number" value="${p.exchangeRate || '7.25'}" step="0.01">
          </div>
          <div class="form-group">
            <label class="form-label">实收人民币 (¥)</label>
            <input class="form-input" id="form-cny" type="number" value="${p.cnyAmount || ''}" step="0.01">
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">流水号</label>
            <input class="form-input" id="form-ref" value="${p.referenceNo || ''}">
          </div>
          <div class="form-group">
            <label class="form-label">到账状态</label>
            <select class="form-select" id="form-arrival">${createOptions(ARRIVAL_STATUSES, p.arrivalStatus || '待确认')}</select>
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">备注</label>
          <textarea class="form-textarea" id="form-notes">${p.notes || ''}</textarea>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" id="modal-cancel">取消</button>
        <button class="btn btn-primary" id="modal-save">${isEdit ? '保存' : '添加'}</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);

  // Auto-calculate CNY
  const amountInput = overlay.querySelector('#form-amount');
  const rateInput = overlay.querySelector('#form-rate');
  const cnyInput = overlay.querySelector('#form-cny');
  const calcCNY = () => {
    const a = Number(amountInput.value) || 0;
    const r = Number(rateInput.value) || 0;
    if (a && r) cnyInput.value = Math.round(a * r);
  };
  amountInput.addEventListener('input', calcCNY);
  rateInput.addEventListener('input', calcCNY);

  const close = () => overlay.remove();
  overlay.querySelector('#modal-close').addEventListener('click', close);
  overlay.querySelector('#modal-cancel').addEventListener('click', close);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });

  overlay.querySelector('#modal-save').addEventListener('click', async () => {
    const orderId = Number(overlay.querySelector('#form-order').value);
    const amount = Number(overlay.querySelector('#form-amount').value);
    if (!orderId || !amount) { showToast('请选择订单并填写金额', 'warning'); return; }

    const order = orders.find(o => o.id === orderId);
    const data = {
      orderId, orderCode: order?.code || '',
      customerId: order?.customerId || 0, customerName: order?.customerName || '',
      paymentDate: overlay.querySelector('#form-date').value,
      type: overlay.querySelector('#form-type').value,
      amount,
      method: overlay.querySelector('#form-method').value,
      exchangeRate: Number(overlay.querySelector('#form-rate').value) || 0,
      cnyAmount: Number(overlay.querySelector('#form-cny').value) || 0,
      referenceNo: overlay.querySelector('#form-ref').value.trim(),
      arrivalStatus: overlay.querySelector('#form-arrival').value,
      confirmedBy: '林经理',
      notes: overlay.querySelector('#form-notes').value.trim(),
    };

    if (isEdit) {
      Object.assign(payment, data);
      await updateRecord(STORES.payments, payment);
      showToast('收款记录已更新');
    } else {
      const year = new Date().getFullYear();
      const num = await getNextCounter('payment');
      data.code = `PAY-${year}-${String(num).padStart(3, '0')}`;
      await addRecord(STORES.payments, data);
      showToast('收款记录已添加');
    }

    close();
    const mainEl = document.getElementById('page-container');
    if (mainEl) renderPayments(mainEl);
  });
}

function openPaymentDetailModal(payment, orders) {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay active';
  overlay.innerHTML = `
    <div class="modal-sheet">
      <div class="modal-handle"></div>
      <div class="modal-header">
        <h3 class="modal-title">收款详情</h3>
        <button class="modal-close" id="modal-close">✕</button>
      </div>
      <div class="modal-body no-padding" style="padding:0">
        <div class="detail-header" style="background:linear-gradient(135deg,#27AE60,#2ECC71)">
          <div class="detail-avatar">💰</div>
          <div>
            <div class="detail-name">${payment.code}</div>
            <div class="detail-code">${payment.customerName}</div>
          </div>
        </div>
        <div class="detail-section">
          <div class="detail-row"><span class="detail-label">关联订单</span><span class="detail-value">${payment.orderCode}</span></div>
          <div class="detail-row"><span class="detail-label">收款日期</span><span class="detail-value">${formatDate(payment.paymentDate)}</span></div>
          <div class="detail-row"><span class="detail-label">收款类型</span><span class="detail-value">${payment.type}</span></div>
          <div class="detail-row"><span class="detail-label">收款金额</span><span class="detail-value fw-bold">${formatCurrency(payment.amount)}</span></div>
          <div class="detail-row"><span class="detail-label">收款方式</span><span class="detail-value">${payment.method}</span></div>
          <div class="detail-row"><span class="detail-label">汇率</span><span class="detail-value">${payment.exchangeRate || '-'}</span></div>
          <div class="detail-row"><span class="detail-label">实收人民币</span><span class="detail-value fw-bold">${formatCNY(payment.cnyAmount)}</span></div>
          <div class="detail-row"><span class="detail-label">流水号</span><span class="detail-value">${payment.referenceNo || '-'}</span></div>
          <div class="detail-row"><span class="detail-label">到账状态</span><span class="detail-value">${statusBadge(payment.arrivalStatus)}</span></div>
        </div>
        ${payment.notes ? `<div class="detail-section"><div class="detail-section-title">备注</div><p style="font-size:13px">${payment.notes}</p></div>` : ''}
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
  overlay.querySelector('#modal-edit').addEventListener('click', () => { close(); openPaymentModal(payment, orders); });
  overlay.querySelector('#modal-delete').addEventListener('click', async () => {
    if (await showConfirm(`确定删除收款记录 "${payment.code}" 吗？`)) {
      await deleteRecord(STORES.payments, payment.id);
      showToast('已删除', 'info');
      close();
      const mainEl = document.getElementById('page-container');
      if (mainEl) renderPayments(mainEl);
    }
  });
}
