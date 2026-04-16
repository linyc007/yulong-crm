/**
 * 👗 产品款号页面
 */
import { getAllRecords, addRecord, updateRecord, deleteRecord, getNextCounter, STORES } from '../db.js';
import {
  PRODUCT_CATEGORIES, TARGET_MARKETS, CATEGORY_CODES,
  createOptions, formatCurrency, formatCNY, statusBadge,
  showToast, showConfirm, matchesSearch, debounce
} from '../utils/helpers.js';

let searchQuery = '';

function getStockStatus(p) {
  const qty = p.stockQty || 0;
  const alert = p.stockAlert || 0;
  if (qty === 0) return { text: '缺货', class: 'status-red' };
  if (alert > 0 && qty <= alert) return { text: '低库存', class: 'status-yellow' };
  return { text: '充足', class: 'status-green' };
}

export async function renderProducts(container) {
  const products = await getAllRecords(STORES.products);
  const filtered = products.filter(p => {
    if (searchQuery && !matchesSearch(p, searchQuery, ['code', 'name', 'category', 'material'])) return false;
    return true;
  });

  container.innerHTML = `
    <div class="page-header">
      <h1 class="page-title"><span class="title-icon">👗</span>产品款号</h1>
      <div class="page-actions">
        <button class="btn btn-primary btn-sm" id="btn-add-product">+ 新增产品</button>
      </div>
    </div>
    <div class="page-content">
      <div class="search-bar mb-16">
        <span class="search-icon">🔍</span>
        <input class="form-input" id="product-search" placeholder="搜索款号、品名、面料..." value="${searchQuery}">
      </div>
      <div class="card">
        <div class="card-body no-padding">
          ${filtered.length === 0 ? '<div class="empty-state"><div class="empty-icon">👗</div><div class="empty-title">暂无产品</div></div>' :
          `<ul class="data-list">${filtered.map(p => {
            const stock = getStockStatus(p);
            return `
            <li class="data-item" data-product-id="${p.id}">
              <div class="data-item-avatar avatar-purple">👗</div>
              <div class="data-item-info">
                <div class="data-item-title">${p.name}</div>
                <div class="data-item-subtitle">${p.code} · ${p.category} · MOQ ${p.moq}件${p.factoryName ? ' · ' + p.factoryName : ''}</div>
              </div>
              <div class="data-item-right">
                <div class="data-item-amount">${formatCurrency(p.wholesalePrice)}</div>
                <div style="display:flex;gap:4px;align-items:center;justify-content:flex-end;margin-top:2px">
                  <span style="font-size:12px;color:var(--text-secondary)">库存 ${(p.stockQty || 0)}</span>
                  <span class="badge ${stock.class}" style="font-size:10px">${stock.text}</span>
                </div>
              </div>
            </li>
          `}).join('')}</ul>`}
        </div>
      </div>
    </div>
    <button class="btn btn-accent btn-fab" id="btn-fab-product">+</button>
  `;

  container.querySelector('#product-search')?.addEventListener('input', debounce((e) => {
    searchQuery = e.target.value;
    const mainEl = document.getElementById('page-container');
    if (mainEl) renderProducts(mainEl);
  }));

  const openForm = () => openProductModal();
  container.querySelector('#btn-add-product')?.addEventListener('click', openForm);
  container.querySelector('#btn-fab-product')?.addEventListener('click', openForm);

  container.querySelectorAll('[data-product-id]').forEach(el => {
    el.addEventListener('click', async () => {
      const prods = await getAllRecords(STORES.products);
      const p = prods.find(pp => pp.id === Number(el.dataset.productId));
      if (p) openProductDetailModal(p);
    });
  });
}

function openProductModal(product = null) {
  const isEdit = !!product;
  const p = product || {};

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay active';
  overlay.innerHTML = `
    <div class="modal-sheet">
      <div class="modal-handle"></div>
      <div class="modal-header">
        <h3 class="modal-title">${isEdit ? '编辑产品' : '新增产品'}</h3>
        <button class="modal-close" id="modal-close">✕</button>
      </div>
      <div class="modal-body">
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">品类 <span class="required">*</span></label>
            <select class="form-select" id="form-category">${createOptions(['', ...PRODUCT_CATEGORIES], p.category)}</select>
          </div>
          <div class="form-group">
            <label class="form-label">品名描述 <span class="required">*</span></label>
            <input class="form-input" id="form-name" value="${p.name || ''}" placeholder="如 蕾丝V领连衣裙（膝下款）">
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">面料成分</label>
            <input class="form-input" id="form-material" value="${p.material || ''}" placeholder="如 聚酯纤维+蕾丝">
          </div>
          <div class="form-group">
            <label class="form-label">可选颜色</label>
            <input class="form-input" id="form-colors" value="${p.colors || ''}" placeholder="如 红/金/蓝/白/紫">
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">可选尺码</label>
            <input class="form-input" id="form-sizes" value="${p.sizes || ''}" placeholder="如 L-4XL">
          </div>
          <div class="form-group">
            <label class="form-label">MOQ (件)</label>
            <input class="form-input" id="form-moq" type="number" value="${p.moq || ''}" min="1">
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">出厂价 (¥)</label>
            <input class="form-input" id="form-factory" type="number" value="${p.factoryPrice || ''}" step="0.01">
          </div>
          <div class="form-group">
            <label class="form-label">批发报价 ($)</label>
            <input class="form-input" id="form-wholesale" type="number" value="${p.wholesalePrice || ''}" step="0.01">
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">参考零售价 ($)</label>
            <input class="form-input" id="form-retail" type="number" value="${p.retailPrice || ''}" step="0.01">
          </div>
          <div class="form-group">
            <label class="form-label">生产周期 (天)</label>
            <input class="form-input" id="form-days" type="number" value="${p.productionDays || ''}" min="1">
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">适合市场</label>
          <select class="form-select" id="form-market">${createOptions(['', ...TARGET_MARKETS], p.targetMarket)}</select>
        </div>
        <div class="form-row">
          <div class="form-group"><label class="form-label">库存预警线 (件)</label><input class="form-input" id="form-alert" type="number" value="${p.stockAlert || ''}" min="0" placeholder="低于此数提醒"></div>
          <div class="form-group"><label class="form-label">关联工厂</label><input class="form-input" id="form-factory" value="${p.factoryName || ''}" placeholder="如 广州锦绣蕾丝厂"></div>
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

  const close = () => overlay.remove();
  overlay.querySelector('#modal-close').addEventListener('click', close);
  overlay.querySelector('#modal-cancel').addEventListener('click', close);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });

  overlay.querySelector('#modal-save').addEventListener('click', async () => {
    const category = overlay.querySelector('#form-category').value;
    const name = overlay.querySelector('#form-name').value.trim();
    if (!category || !name) { showToast('请填写品类和品名', 'warning'); return; }

    const data = {
      category, name,
      material: overlay.querySelector('#form-material').value.trim(),
      colors: overlay.querySelector('#form-colors').value.trim(),
      sizes: overlay.querySelector('#form-sizes').value.trim(),
      moq: Number(overlay.querySelector('#form-moq').value) || 0,
      factoryPrice: Number(overlay.querySelector('#form-factory').value) || 0,
      wholesalePrice: Number(overlay.querySelector('#form-wholesale').value) || 0,
      retailPrice: Number(overlay.querySelector('#form-retail').value) || 0,
      productionDays: Number(overlay.querySelector('#form-days').value) || 0,
      targetMarket: overlay.querySelector('#form-market').value,
      stockAlert: Number(overlay.querySelector('#form-alert').value) || 0,
      factoryName: overlay.querySelector('#form-factory').value.trim(),
      notes: overlay.querySelector('#form-notes').value.trim(),
      imageUrl: '',
    };

    if (isEdit) {
      Object.assign(product, data);
      await updateRecord(STORES.products, product);
      showToast('产品已更新');
    } else {
      const catCode = CATEGORY_CODES[category] || 'X';
      const num = await getNextCounter('product');
      data.code = `YL-${catCode}-${String(num).padStart(3, '0')}`;
      await addRecord(STORES.products, data);
      showToast('产品已添加');
    }
    close();
    const mainEl = document.getElementById('page-container');
    if (mainEl) renderProducts(mainEl);
  });
}

function openProductDetailModal(p) {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay active';
  overlay.innerHTML = `
    <div class="modal-sheet">
      <div class="modal-handle"></div>
      <div class="modal-header"><h3 class="modal-title">产品详情</h3><button class="modal-close" id="modal-close">✕</button></div>
      <div class="modal-body no-padding" style="padding:0">
        <div class="detail-header" style="background:linear-gradient(135deg,#8E44AD,#9B59B6)">
          <div class="detail-avatar">👗</div>
          <div><div class="detail-name">${p.name}</div><div class="detail-code">${p.code} · ${p.category}</div></div>
        </div>
        <div class="detail-section">
          <div class="detail-row"><span class="detail-label">面料</span><span class="detail-value">${p.material || '-'}</span></div>
          <div class="detail-row"><span class="detail-label">可选颜色</span><span class="detail-value">${p.colors || '-'}</span></div>
          <div class="detail-row"><span class="detail-label">可选尺码</span><span class="detail-value">${p.sizes || '-'}</span></div>
          <div class="detail-row"><span class="detail-label">MOQ</span><span class="detail-value">${p.moq || '-'} 件</span></div>
        </div>
        <div class="detail-section">
          <div class="detail-section-title">定价</div>
          <div class="detail-row"><span class="detail-label">出厂价</span><span class="detail-value">${formatCNY(p.factoryPrice)}</span></div>
          <div class="detail-row"><span class="detail-label">批发报价</span><span class="detail-value fw-bold">${formatCurrency(p.wholesalePrice)}</span></div>
          <div class="detail-row"><span class="detail-label">参考零售价</span><span class="detail-value">${formatCurrency(p.retailPrice)}</span></div>
          <div class="detail-row"><span class="detail-label">生产周期</span><span class="detail-value">${p.productionDays || '-'} 天</span></div>
        </div>
        <div class="detail-section">
          <div class="detail-section-title">库存信息</div>
          <div class="detail-row"><span class="detail-label">当前库存</span><span class="detail-value fw-bold">${(p.stockQty || 0)} 件 ${statusBadge(getStockStatus(p).text)}</span></div>
          <div class="detail-row"><span class="detail-label">预警线</span><span class="detail-value">${p.stockAlert || '-'} 件</span></div>
          <div class="detail-row"><span class="detail-label">关联工厂</span><span class="detail-value">${p.factoryName || '-'}</span></div>
        </div>
        <div class="detail-section">
          <div class="detail-row"><span class="detail-label">适合市场</span><span class="detail-value">${p.targetMarket || '-'}</span></div>
        </div>
        ${p.notes ? `<div class="detail-section"><div class="detail-section-title">备注</div><p style="font-size:13px">${p.notes}</p></div>` : ''}
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
  overlay.querySelector('#modal-edit').addEventListener('click', () => { close(); openProductModal(p); });
  overlay.querySelector('#modal-delete').addEventListener('click', async () => {
    if (await showConfirm(`确定删除产品 "${p.name}" 吗？`)) {
      await deleteRecord(STORES.products, p.id);
      showToast('已删除', 'info'); close();
      const mainEl = document.getElementById('page-container');
      if (mainEl) renderProducts(mainEl);
    }
  });
}
