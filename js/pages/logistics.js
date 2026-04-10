/**
 * 🚢 物流跟踪页面
 */
import { getAllRecords, addRecord, updateRecord, deleteRecord, getNextCounter, STORES } from '../db.js';
import {
  CUSTOMS_STATUSES, LOGISTICS_STATUSES, SHIPPING_METHODS, CONTAINER_SPECS,
  createOptions, formatDate, statusBadge, showToast, showConfirm, today
} from '../utils/helpers.js';

export async function renderLogistics(container) {
  const [logisticsData, orders] = await Promise.all([
    getAllRecords(STORES.logistics),
    getAllRecords(STORES.orders),
  ]);
  const sorted = [...logisticsData].sort((a, b) => (b.departureDate || '').localeCompare(a.departureDate || ''));

  container.innerHTML = `
    <div class="page-header">
      <h1 class="page-title"><span class="title-icon">🚢</span>物流跟踪</h1>
      <div class="page-actions">
        <button class="btn btn-primary btn-sm" id="btn-add-logistics">+ 新增物流</button>
      </div>
    </div>
    <div class="page-content">
      <div class="card">
        <div class="card-body no-padding">
          ${sorted.length === 0 ? '<div class="empty-state"><div class="empty-icon">🚢</div><div class="empty-title">暂无物流记录</div></div>' :
          `<ul class="data-list">${sorted.map(l => `
            <li class="data-item" data-logistics-id="${l.id}">
              <div class="data-item-avatar avatar-blue">🚢</div>
              <div class="data-item-info">
                <div class="data-item-title">${l.customerName} → ${l.destinationPort || l.country}</div>
                <div class="data-item-subtitle">${l.code} · ${l.containerNo || ''} · ${l.vesselName || ''}</div>
              </div>
              <div class="data-item-right">
                ${statusBadge(l.logisticsStatus)}
                <div class="data-item-meta mt-8">${statusBadge(l.customsStatus)}</div>
              </div>
            </li>
          `).join('')}</ul>`}
        </div>
      </div>
    </div>
    <button class="btn btn-accent btn-fab" id="btn-fab-logistics">+</button>
  `;

  const openForm = () => openLogisticsModal(null, orders);
  container.querySelector('#btn-add-logistics')?.addEventListener('click', openForm);
  container.querySelector('#btn-fab-logistics')?.addEventListener('click', openForm);

  container.querySelectorAll('[data-logistics-id]').forEach(el => {
    el.addEventListener('click', () => {
      const l = sorted.find(ll => ll.id === Number(el.dataset.logisticsId));
      if (l) openLogisticsDetailModal(l, orders);
    });
  });
}

function openLogisticsModal(logistics, orders) {
  const isEdit = !!logistics;
  const l = logistics || {};
  const orderOpts = orders.map(o => `<option value="${o.id}" ${o.id === l.orderId ? 'selected' : ''}>${o.code} - ${o.customerName}</option>`).join('');

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay active';
  overlay.innerHTML = `
    <div class="modal-sheet">
      <div class="modal-handle"></div>
      <div class="modal-header">
        <h3 class="modal-title">${isEdit ? '编辑物流' : '新增物流'}</h3>
        <button class="modal-close" id="modal-close">✕</button>
      </div>
      <div class="modal-body">
        <div class="form-group">
          <label class="form-label">关联订单 <span class="required">*</span></label>
          <select class="form-select" id="form-order"><option value="">选择订单</option>${orderOpts}</select>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">目的国</label>
            <input class="form-input" id="form-country" value="${l.country || ''}">
          </div>
          <div class="form-group">
            <label class="form-label">目的港</label>
            <input class="form-input" id="form-port" value="${l.destinationPort || ''}" placeholder="如 拉各斯-阿帕帕港">
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">出货方式</label>
            <select class="form-select" id="form-method">${createOptions(['', ...SHIPPING_METHODS], l.shippingMethod)}</select>
          </div>
          <div class="form-group">
            <label class="form-label">货柜号/运单号</label>
            <input class="form-input" id="form-container" value="${l.containerNo || ''}">
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">船名/航班</label>
            <input class="form-input" id="form-vessel" value="${l.vesselName || ''}">
          </div>
          <div class="form-group">
            <label class="form-label">提单号 (B/L)</label>
            <input class="form-input" id="form-bl" value="${l.blNumber || ''}">
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">装柜日期</label>
            <input class="form-input" id="form-loading" type="date" value="${l.loadingDate || ''}">
          </div>
          <div class="form-group">
            <label class="form-label">开船/起飞日</label>
            <input class="form-input" id="form-departure" type="date" value="${l.departureDate || ''}">
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">预计到港</label>
            <input class="form-input" id="form-eta" type="date" value="${l.estimatedArrival || ''}">
          </div>
          <div class="form-group">
            <label class="form-label">实际到港</label>
            <input class="form-input" id="form-ata" type="date" value="${l.actualArrival || ''}">
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">清关状态</label>
            <select class="form-select" id="form-customs">${createOptions(CUSTOMS_STATUSES, l.customsStatus || '未开始')}</select>
          </div>
          <div class="form-group">
            <label class="form-label">物流状态</label>
            <select class="form-select" id="form-status">${createOptions(LOGISTICS_STATUSES, l.logisticsStatus || '待装柜')}</select>
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">备注</label>
          <textarea class="form-textarea" id="form-notes">${l.notes || ''}</textarea>
        </div>
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
    const orderId = Number(overlay.querySelector('#form-order').value);
    if (!orderId) { showToast('请选择关联订单', 'warning'); return; }
    const order = orders.find(o => o.id === orderId);

    const data = {
      orderId, orderCode: order?.code || '',
      customerName: order?.customerName || '',
      country: overlay.querySelector('#form-country').value.trim() || order?.country || '',
      destinationPort: overlay.querySelector('#form-port').value.trim(),
      shippingMethod: overlay.querySelector('#form-method').value,
      containerNo: overlay.querySelector('#form-container').value.trim(),
      vesselName: overlay.querySelector('#form-vessel').value.trim(),
      blNumber: overlay.querySelector('#form-bl').value.trim(),
      loadingDate: overlay.querySelector('#form-loading').value,
      departureDate: overlay.querySelector('#form-departure').value,
      estimatedArrival: overlay.querySelector('#form-eta').value,
      actualArrival: overlay.querySelector('#form-ata').value,
      customsStatus: overlay.querySelector('#form-customs').value,
      logisticsStatus: overlay.querySelector('#form-status').value,
      notes: overlay.querySelector('#form-notes').value.trim(),
    };

    if (isEdit) {
      Object.assign(logistics, data);
      await updateRecord(STORES.logistics, logistics);
      showToast('物流记录已更新');
    } else {
      const year = new Date().getFullYear();
      const num = await getNextCounter('logistics');
      data.code = `LOG-${year}-${String(num).padStart(3, '0')}`;
      await addRecord(STORES.logistics, data);
      showToast('物流记录已添加');
    }
    close();
    const mainEl = document.getElementById('page-container');
    if (mainEl) renderLogistics(mainEl);
  });
}

function openLogisticsDetailModal(l, orders) {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay active';
  overlay.innerHTML = `
    <div class="modal-sheet">
      <div class="modal-handle"></div>
      <div class="modal-header"><h3 class="modal-title">物流详情</h3><button class="modal-close" id="modal-close">✕</button></div>
      <div class="modal-body no-padding" style="padding:0">
        <div class="detail-header" style="background:linear-gradient(135deg,#2980B9,#3498DB)">
          <div class="detail-avatar">🚢</div>
          <div><div class="detail-name">${l.code}</div><div class="detail-code">${l.customerName} → ${l.destinationPort || l.country}</div></div>
        </div>
        <div class="detail-section">
          <div class="detail-row"><span class="detail-label">关联订单</span><span class="detail-value">${l.orderCode}</span></div>
          <div class="detail-row"><span class="detail-label">出货方式</span><span class="detail-value">${l.shippingMethod || '-'}</span></div>
          <div class="detail-row"><span class="detail-label">货柜号</span><span class="detail-value">${l.containerNo || '-'}</span></div>
          <div class="detail-row"><span class="detail-label">船名/航班</span><span class="detail-value">${l.vesselName || '-'}</span></div>
          <div class="detail-row"><span class="detail-label">提单号</span><span class="detail-value">${l.blNumber || '-'}</span></div>
        </div>
        <div class="detail-section">
          <div class="detail-section-title">时间节点</div>
          <div class="detail-row"><span class="detail-label">装柜日期</span><span class="detail-value">${formatDate(l.loadingDate)}</span></div>
          <div class="detail-row"><span class="detail-label">开船日期</span><span class="detail-value">${formatDate(l.departureDate)}</span></div>
          <div class="detail-row"><span class="detail-label">预计到港</span><span class="detail-value">${formatDate(l.estimatedArrival)}</span></div>
          <div class="detail-row"><span class="detail-label">实际到港</span><span class="detail-value">${formatDate(l.actualArrival)}</span></div>
        </div>
        <div class="detail-section">
          <div class="detail-row"><span class="detail-label">清关状态</span><span class="detail-value">${statusBadge(l.customsStatus)}</span></div>
          <div class="detail-row"><span class="detail-label">物流状态</span><span class="detail-value">${statusBadge(l.logisticsStatus)}</span></div>
        </div>
        ${l.notes ? `<div class="detail-section"><div class="detail-section-title">备注</div><p style="font-size:13px">${l.notes}</p></div>` : ''}
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
  overlay.querySelector('#modal-edit').addEventListener('click', () => { close(); openLogisticsModal(l, orders); });
  overlay.querySelector('#modal-delete').addEventListener('click', async () => {
    if (await showConfirm(`确定删除物流记录 "${l.code}" 吗？`)) {
      await deleteRecord(STORES.logistics, l.id);
      showToast('已删除', 'info'); close();
      const mainEl = document.getElementById('page-container');
      if (mainEl) renderLogistics(mainEl);
    }
  });
}
