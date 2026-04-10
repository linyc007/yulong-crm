/**
 * 📞 跟进记录页面
 */
import { getAllRecords, addRecord, updateRecord, deleteRecord, STORES } from '../db.js';
import {
  FOLLOWUP_METHODS, URGENCY_LEVELS,
  createOptions, formatDate, statusBadge, isOverdue,
  showToast, showConfirm, today
} from '../utils/helpers.js';

export async function renderFollowups(container) {
  const [followups, customers] = await Promise.all([
    getAllRecords(STORES.followups),
    getAllRecords(STORES.customers),
  ]);
  const sorted = [...followups].sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  const overdueCount = followups.filter(f => isOverdue(f.nextFollowDate)).length;

  container.innerHTML = `
    <div class="page-header">
      <h1 class="page-title"><span class="title-icon">📞</span>跟进记录</h1>
      <div class="page-actions">
        <button class="btn btn-primary btn-sm" id="btn-add-followup">+ 新增跟进</button>
      </div>
    </div>
    <div class="page-content">
      ${overdueCount > 0 ? `<div class="card mb-16" style="border-left:4px solid var(--danger)"><div class="card-body"><div class="flex-between"><span style="font-weight:600;color:var(--danger)">⚠️ ${overdueCount} 项跟进已逾期</span></div></div></div>` : ''}
      <div class="card">
        <div class="card-body no-padding">
          ${sorted.length === 0 ? '<div class="empty-state"><div class="empty-icon">📞</div><div class="empty-title">暂无跟进记录</div><div class="empty-desc">每次与客户沟通后记录下来，设置提醒</div></div>' :
          `<ul class="data-list">${sorted.map(f => {
            const overdue = isOverdue(f.nextFollowDate);
            return `
              <li class="data-item" data-followup-id="${f.id}" ${overdue ? 'style="border-left:3px solid var(--danger)"' : ''}>
                <div class="data-item-avatar ${f.method === 'WhatsApp' ? 'avatar-green' : f.method === '电话' ? 'avatar-blue' : 'avatar-gold'}">
                  ${f.method === 'WhatsApp' ? '💬' : f.method === '电话' ? '📞' : f.method === '邮件' ? '✉️' : f.method === '微信' ? '💚' : '🤝'}
                </div>
                <div class="data-item-info">
                  <div class="data-item-title">${f.customerName}</div>
                  <div class="data-item-subtitle">${f.summary?.substring(0, 35) || ''}${f.summary?.length > 35 ? '...' : ''}</div>
                </div>
                <div class="data-item-right">
                  <div class="data-item-meta">${f.date}</div>
                  ${statusBadge(f.urgency)}
                  ${overdue ? '<div class="data-item-meta" style="color:var(--danger);font-weight:600">逾期!</div>' : ''}
                </div>
              </li>
            `;
          }).join('')}</ul>`}
        </div>
      </div>
    </div>
    <button class="btn btn-accent btn-fab" id="btn-fab-followup">+</button>
  `;

  const openForm = () => openFollowupModal(null, customers);
  container.querySelector('#btn-add-followup')?.addEventListener('click', openForm);
  container.querySelector('#btn-fab-followup')?.addEventListener('click', openForm);

  container.querySelectorAll('[data-followup-id]').forEach(el => {
    el.addEventListener('click', () => {
      const f = sorted.find(ff => ff.id === Number(el.dataset.followupId));
      if (f) openFollowupDetailModal(f, customers);
    });
  });
}

function openFollowupModal(followup, customers) {
  const isEdit = !!followup;
  const f = followup || {};
  const custOpts = customers.map(c => `<option value="${c.id}" ${c.id === f.customerId ? 'selected' : ''}>${c.code} - ${c.name}</option>`).join('');

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay active';
  overlay.innerHTML = `
    <div class="modal-sheet">
      <div class="modal-handle"></div>
      <div class="modal-header">
        <h3 class="modal-title">${isEdit ? '编辑跟进' : '新增跟进'}</h3>
        <button class="modal-close" id="modal-close">✕</button>
      </div>
      <div class="modal-body">
        <div class="form-group">
          <label class="form-label">客户 <span class="required">*</span></label>
          <select class="form-select" id="form-customer"><option value="">选择客户</option>${custOpts}</select>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">跟进日期</label>
            <input class="form-input" id="form-date" type="date" value="${f.date || today()}">
          </div>
          <div class="form-group">
            <label class="form-label">跟进方式</label>
            <select class="form-select" id="form-method">${createOptions(FOLLOWUP_METHODS, f.method || 'WhatsApp')}</select>
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">沟通内容摘要 <span class="required">*</span></label>
          <textarea class="form-textarea" id="form-summary" placeholder="本次沟通的关键内容...">${f.summary || ''}</textarea>
        </div>
        <div class="form-group">
          <label class="form-label">客户反馈/需求</label>
          <textarea class="form-textarea" id="form-feedback" placeholder="客户表达了什么需求、反馈...">${f.feedback || ''}</textarea>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">下次跟进日期</label>
            <input class="form-input" id="form-next-date" type="date" value="${f.nextFollowDate || ''}">
          </div>
          <div class="form-group">
            <label class="form-label">紧急程度</label>
            <select class="form-select" id="form-urgency">${createOptions(URGENCY_LEVELS, f.urgency || '🟢 一般')}</select>
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">下次跟进事项</label>
          <input class="form-input" id="form-action" value="${f.nextAction || ''}" placeholder="下次要做什么...">
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
    const customerId = Number(overlay.querySelector('#form-customer').value);
    const summary = overlay.querySelector('#form-summary').value.trim();
    if (!customerId || !summary) { showToast('请选择客户并填写沟通内容', 'warning'); return; }

    const customer = customers.find(c => c.id === customerId);
    const data = {
      customerId, customerName: customer?.name || '',
      date: overlay.querySelector('#form-date').value,
      method: overlay.querySelector('#form-method').value,
      summary,
      feedback: overlay.querySelector('#form-feedback').value.trim(),
      nextFollowDate: overlay.querySelector('#form-next-date').value,
      nextAction: overlay.querySelector('#form-action').value.trim(),
      urgency: overlay.querySelector('#form-urgency').value,
      followedBy: '林经理',
    };

    if (isEdit) {
      Object.assign(followup, data);
      await updateRecord(STORES.followups, followup);
      showToast('跟进记录已更新');
    } else {
      await addRecord(STORES.followups, data);
      showToast('跟进记录已添加');
    }
    close();
    const mainEl = document.getElementById('page-container');
    if (mainEl) renderFollowups(mainEl);
  });
}

function openFollowupDetailModal(f, customers) {
  const overdue = isOverdue(f.nextFollowDate);
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay active';
  overlay.innerHTML = `
    <div class="modal-sheet">
      <div class="modal-handle"></div>
      <div class="modal-header"><h3 class="modal-title">跟进详情</h3><button class="modal-close" id="modal-close">✕</button></div>
      <div class="modal-body no-padding" style="padding:0">
        <div class="detail-header" style="background:linear-gradient(135deg,#E67E22,#F39C12)">
          <div class="detail-avatar">${f.method === 'WhatsApp' ? '💬' : f.method === '电话' ? '📞' : '✉️'}</div>
          <div><div class="detail-name">${f.customerName}</div><div class="detail-code">${f.date} · via ${f.method}</div></div>
        </div>
        <div class="detail-section">
          <div class="detail-section-title">沟通内容</div>
          <p style="font-size:13px;line-height:1.6">${f.summary}</p>
        </div>
        ${f.feedback ? `<div class="detail-section"><div class="detail-section-title">客户反馈</div><p style="font-size:13px;line-height:1.6">${f.feedback}</p></div>` : ''}
        <div class="detail-section">
          <div class="detail-row"><span class="detail-label">紧急程度</span><span class="detail-value">${statusBadge(f.urgency)}</span></div>
          <div class="detail-row"><span class="detail-label">下次跟进</span><span class="detail-value" ${overdue ? 'style="color:var(--danger);font-weight:700"' : ''}>${formatDate(f.nextFollowDate)} ${overdue ? '(已逾期!)' : ''}</span></div>
          <div class="detail-row"><span class="detail-label">跟进事项</span><span class="detail-value">${f.nextAction || '-'}</span></div>
          <div class="detail-row"><span class="detail-label">跟进人</span><span class="detail-value">${f.followedBy || '-'}</span></div>
        </div>
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
  overlay.querySelector('#modal-edit').addEventListener('click', () => { close(); openFollowupModal(f, customers); });
  overlay.querySelector('#modal-delete').addEventListener('click', async () => {
    if (await showConfirm('确定删除此跟进记录吗？')) {
      await deleteRecord(STORES.followups, f.id);
      showToast('已删除', 'info'); close();
      const mainEl = document.getElementById('page-container');
      if (mainEl) renderFollowups(mainEl);
    }
  });
}
