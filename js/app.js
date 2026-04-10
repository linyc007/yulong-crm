/**
 * 主应用逻辑 — 御龙批发CRM
 * 路由 + 导航 + 应用初始化
 */
import { initDB, seedSampleData } from './db.js';
import { renderDashboard } from './pages/dashboard.js';
import { renderCustomers } from './pages/customers.js';
import { renderOrders } from './pages/orders.js';
import { renderPayments } from './pages/payments.js';
import { renderLogistics } from './pages/logistics.js';
import { renderFollowups } from './pages/followups.js';
import { renderProducts } from './pages/products.js';
import { renderInventory } from './pages/inventory.js';
import { renderFactory } from './pages/factory.js';
import { exportToExcel, exportToJSON, importFromJSON, importSharePackage } from './utils/export.js';
import { showToast, showConfirm } from './utils/helpers.js';

// 路由配置
const ROUTES = {
  dashboard:  { title: '业务看板', icon: '📊', render: renderDashboard, tab: true },
  customers:  { title: '客户管理', icon: '👥', render: renderCustomers, tab: true },
  orders:     { title: '订单管理', icon: '📦', render: renderOrders, tab: true },
  followups:  { title: '跟进记录', icon: '📞', render: renderFollowups, tab: true },
  inventory:  { title: '仓库库存', icon: '🏬', render: renderInventory, more: true },
  factory:    { title: '工厂管理', icon: '🏭', render: renderFactory, more: true },
  payments:   { title: '收款记录', icon: '💰', render: renderPayments, more: true },
  logistics:  { title: '物流跟踪', icon: '🚢', render: renderLogistics, more: true },
  products:   { title: '产品款号', icon: '👗', render: renderProducts, more: true },
  settings:   { title: '设置', icon: '⚙️', render: renderSettings, more: true },
};

let currentRoute = 'dashboard';

/**
 * 应用初始化
 */
async function initApp() {
  try {
    await initDB();
    await seedSampleData();
    buildLayout();
    handleRoute();
    window.addEventListener('hashchange', handleRoute);
    console.log('✅ 御龙批发CRM 已启动');
  } catch (err) {
    console.error('Failed to init app:', err);
    document.body.innerHTML = `<div style="padding:40px;text-align:center"><h2>应用加载失败</h2><p>${err.message}</p></div>`;
  }
}

/**
 * 构建应用布局
 */
function buildLayout() {
  const app = document.getElementById('app');
  app.innerHTML = `
    <!-- Sidebar (Desktop/iPad) -->
    <aside class="sidebar" id="sidebar">
      <div class="sidebar-header">
        <img src="icons/icon-512.png" alt="Logo" class="sidebar-logo">
        <div class="sidebar-title">御龙批发CRM</div>
        <div class="sidebar-subtitle">非洲服装贸易管理</div>
      </div>
      <nav class="sidebar-nav" id="sidebar-nav">
        ${Object.entries(ROUTES).map(([key, route]) =>
          key === 'settings' ? '' :
          `<button class="nav-item ${key === currentRoute ? 'active' : ''}" data-route="${key}">
            <span class="nav-icon">${route.icon}</span>
            <span>${route.title}</span>
          </button>`
        ).join('')}
        <div class="nav-divider"></div>
        <button class="nav-item" data-route="settings">
          <span class="nav-icon">⚙️</span>
          <span>设置</span>
        </button>
      </nav>
      <div class="sidebar-footer">
        御龙服装城 · v1.0
      </div>
    </aside>
    <div class="sidebar-backdrop" id="sidebar-backdrop"></div>

    <!-- Main Content -->
    <main class="main-content">
      <!-- Mobile Header -->
      <div class="mobile-header">
        <button class="mobile-menu-btn" id="mobile-menu-btn">☰</button>
        <span class="mobile-header-title">御龙批发CRM</span>
        <div style="width:40px"></div>
      </div>

      <!-- Page Container -->
      <div id="page-container"></div>
    </main>

    <!-- Tab Bar (Mobile) -->
    <nav class="tab-bar" id="tab-bar">
      <button class="tab-item ${currentRoute === 'dashboard' ? 'active' : ''}" data-route="dashboard">
        <span class="tab-icon">📊</span>
        <span>看板</span>
      </button>
      <button class="tab-item ${currentRoute === 'customers' ? 'active' : ''}" data-route="customers">
        <span class="tab-icon">👥</span>
        <span>客户</span>
      </button>
      <button class="tab-item ${currentRoute === 'orders' ? 'active' : ''}" data-route="orders">
        <span class="tab-icon">📦</span>
        <span>订单</span>
      </button>
      <button class="tab-item ${currentRoute === 'followups' ? 'active' : ''}" data-route="followups">
        <span class="tab-icon">📞</span>
        <span>跟进</span>
      </button>
      <button class="tab-item ${currentRoute === 'more' ? 'active' : ''}" data-route="more">
        <span class="tab-icon">☰</span>
        <span>更多</span>
      </button>
    </nav>

    <!-- Toast Container -->
    <div id="toast-container"></div>
  `;

  // Sidebar navigation events
  document.getElementById('sidebar-nav').addEventListener('click', (e) => {
    const item = e.target.closest('.nav-item');
    if (!item) return;
    const route = item.dataset.route;
    navigateTo(route);
    closeSidebar();
  });

  // Tab bar events
  document.getElementById('tab-bar').addEventListener('click', (e) => {
    const item = e.target.closest('.tab-item');
    if (!item) return;
    const route = item.dataset.route;
    if (route === 'more') {
      openMoreMenu();
    } else {
      navigateTo(route);
    }
  });

  // Mobile menu button
  document.getElementById('mobile-menu-btn').addEventListener('click', toggleSidebar);
  document.getElementById('sidebar-backdrop').addEventListener('click', closeSidebar);
}

/**
 * 路由处理
 */
function handleRoute() {
  const hash = window.location.hash.replace('#/', '') || 'dashboard';
  const route = ROUTES[hash];
  if (route) {
    currentRoute = hash;
    renderPage(hash);
  } else {
    navigateTo('dashboard');
  }
}

/**
 * 导航到指定页面
 */
function navigateTo(route) {
  if (route === 'more') {
    openMoreMenu();
    return;
  }
  window.location.hash = `#/${route}`;
}

/**
 * 渲染页面
 */
async function renderPage(routeName) {
  const route = ROUTES[routeName];
  if (!route) return;

  const container = document.getElementById('page-container');
  container.innerHTML = '<div style="padding:60px;text-align:center;color:var(--text-secondary)"><div style="font-size:32px;animation:pulse 1.5s infinite">⏳</div><p style="margin-top:12px">加载中...</p></div>';

  updateActiveNav(routeName);

  try {
    await route.render(container);
  } catch (err) {
    console.error('Page render error:', err);
    container.innerHTML = `<div style="padding:40px;text-align:center"><h3>页面加载出错</h3><p style="color:var(--text-secondary)">${err.message}</p></div>`;
  }
}

/**
 * 更新导航Active状态
 */
function updateActiveNav(routeName) {
  // Sidebar
  document.querySelectorAll('#sidebar-nav .nav-item').forEach(item => {
    item.classList.toggle('active', item.dataset.route === routeName);
  });

  // Tab bar
  document.querySelectorAll('#tab-bar .tab-item').forEach(item => {
    const isMore = ['payments', 'logistics', 'products', 'settings', 'inventory', 'factory'].includes(routeName);
    if (item.dataset.route === 'more') {
      item.classList.toggle('active', isMore);
    } else {
      item.classList.toggle('active', item.dataset.route === routeName);
    }
  });
}

/**
 * 更多菜单（移动端）
 */
function openMoreMenu() {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay active';
  const moreRoutes = Object.entries(ROUTES).filter(([_, r]) => r.more);

  overlay.innerHTML = `
    <div class="modal-sheet">
      <div class="modal-handle"></div>
      <div class="modal-header">
        <h3 class="modal-title">更多功能</h3>
        <button class="modal-close" id="modal-close">✕</button>
      </div>
      <div class="modal-body no-padding" style="padding:0">
        <ul class="data-list">
          ${moreRoutes.map(([key, route]) => `
            <li class="data-item" data-route="${key}">
              <div class="data-item-avatar avatar-blue">${route.icon}</div>
              <div class="data-item-info">
                <div class="data-item-title">${route.title}</div>
              </div>
              <span style="color:var(--text-secondary);font-size:18px">›</span>
            </li>
          `).join('')}
          <li class="data-item" id="btn-export-excel">
            <div class="data-item-avatar avatar-green">📥</div>
            <div class="data-item-info">
              <div class="data-item-title">导出 Excel</div>
              <div class="data-item-subtitle">导出所有数据为 Excel 文件</div>
            </div>
          </li>
          <li class="data-item" id="btn-export-json">
            <div class="data-item-avatar avatar-gold">💾</div>
            <div class="data-item-info">
              <div class="data-item-title">备份数据 (JSON)</div>
              <div class="data-item-subtitle">完整数据备份</div>
            </div>
          </li>
          <li class="data-item" id="btn-import-json">
            <div class="data-item-avatar avatar-blue">📤</div>
            <div class="data-item-info">
              <div class="data-item-title">恢复数据 (JSON)</div>
              <div class="data-item-subtitle">从备份文件恢复</div>
            </div>
          </li>
          <li class="data-item" id="btn-import-share">
            <div class="data-item-avatar avatar-purple">🤝</div>
            <div class="data-item-info">
              <div class="data-item-title">导入合作分享包</div>
              <div class="data-item-subtitle">合并订单或物流进度 (.ylcrm)</div>
            </div>
          </li>
        </ul>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);

  const close = () => overlay.remove();
  overlay.querySelector('#modal-close').addEventListener('click', close);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });

  overlay.querySelectorAll('[data-route]').forEach(el => {
    el.addEventListener('click', () => {
      close();
      navigateTo(el.dataset.route);
    });
  });

  overlay.querySelector('#btn-export-excel')?.addEventListener('click', async () => {
    close();
    showToast('正在导出...', 'info');
    try { await exportToExcel(); showToast('Excel 导出成功！'); }
    catch (e) { showToast('导出失败: ' + e.message, 'error'); }
  });

  overlay.querySelector('#btn-export-json')?.addEventListener('click', async () => {
    close();
    try { await exportToJSON(); showToast('备份成功！'); }
    catch (e) { showToast('备份失败', 'error'); }
  });

  overlay.querySelector('#btn-import-json')?.addEventListener('click', async () => {
    const ok = await showConfirm('导入将覆盖现有数据，确定继续吗？');
    if (ok) {
      const success = await importFromJSON();
      close();
      if (success) {
        showToast('数据恢复成功！');
        navigateTo('dashboard');
      } else {
        showToast('导入失败，请检查文件格式', 'error');
      }
    }
  });

  overlay.querySelector('#btn-import-share')?.addEventListener('click', async () => {
    const updatedCount = await importSharePackage();
    close();
    if (updatedCount > 0) {
      showToast(`成功导入/合并 ${updatedCount} 条记录！`);
      // 重新加载当前页面以显示新数据
      const currentRoute = window.location.hash.slice(2) || 'dashboard';
      navigateTo(currentRoute);
    }
  });
}

/**
 * 设置页面
 */
async function renderSettings(container) {
  container.innerHTML = `
    <div class="page-header">
      <h1 class="page-title"><span class="title-icon">⚙️</span>设置</h1>
    </div>
    <div class="page-content">
      <div class="card mb-16">
        <div class="card-header"><div class="card-title">📥 数据管理</div></div>
        <div class="card-body">
          <div style="display:flex;flex-direction:column;gap:10px">
            <button class="btn btn-primary" id="settings-export-excel" style="justify-content:flex-start;gap:10px">
              📊 导出 Excel（数据备份）
            </button>
            <button class="btn btn-secondary" id="settings-export-json" style="justify-content:flex-start;gap:10px">
              💾 导出 JSON（完整备份）
            </button>
            <button class="btn btn-secondary" id="settings-import-json" style="justify-content:flex-start;gap:10px">
              📤 从 JSON 恢复数据
            </button>
          </div>
          <p class="form-hint mt-16">💡 建议每周导出一次 Excel 备份，防止数据丢失。</p>
        </div>
      </div>
      <div class="card mb-16">
        <div class="card-header"><div class="card-title">ℹ️ 关于</div></div>
        <div class="card-body">
          <div class="detail-row"><span class="detail-label">应用名称</span><span class="detail-value">御龙批发CRM</span></div>
          <div class="detail-row"><span class="detail-label">版本</span><span class="detail-value">1.0.0</span></div>
          <div class="detail-row"><span class="detail-label">适用</span><span class="detail-value">iPhone / iPad / Mac</span></div>
          <div class="detail-row"><span class="detail-label">数据存储</span><span class="detail-value">浏览器本地 (IndexedDB)</span></div>
          <p class="form-hint mt-16">📱 在 Safari 中点击"分享" → "添加到主屏幕"可以像原生 App 一样使用。</p>
        </div>
      </div>
    </div>
  `;

  container.querySelector('#settings-export-excel')?.addEventListener('click', async () => {
    showToast('正在导出...', 'info');
    try { await exportToExcel(); showToast('Excel 导出成功！'); }
    catch (e) { showToast('导出失败: ' + e.message, 'error'); }
  });

  container.querySelector('#settings-export-json')?.addEventListener('click', async () => {
    try { await exportToJSON(); showToast('备份成功！'); }
    catch (e) { showToast('备份失败', 'error'); }
  });

  container.querySelector('#settings-import-json')?.addEventListener('click', async () => {
    const ok = await showConfirm('导入将覆盖现有数据，确定继续吗？');
    if (ok) {
      const success = await importFromJSON();
      if (success) {
        showToast('数据恢复成功！');
        navigateTo('dashboard');
      } else {
        showToast('导入失败', 'error');
      }
    }
  });
}

/**
 * 侧边栏控制
 */
function toggleSidebar() {
  document.getElementById('sidebar').classList.toggle('open');
  document.getElementById('sidebar-backdrop').classList.toggle('active');
}

function closeSidebar() {
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('sidebar-backdrop').classList.remove('active');
}

// 启动应用
document.addEventListener('DOMContentLoaded', initApp);
