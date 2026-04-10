/**
 * 📊 业务看板页面
 */
import { getAllRecords, STORES } from '../db.js';
import { formatCurrency, isOverdue, isThisWeek, statusBadge, COUNTRY_FLAGS } from '../utils/helpers.js';

export async function renderDashboard(container) {
  const [customers, orders, payments, logistics, followups] = await Promise.all([
    getAllRecords(STORES.customers),
    getAllRecords(STORES.orders),
    getAllRecords(STORES.payments),
    getAllRecords(STORES.logistics),
    getAllRecords(STORES.followups),
  ]);

  const activeCustomers = customers.filter(c => c.status === '活跃').length;
  const activeOrders = orders.filter(o => !['已完结', '已取消'].includes(o.status)).length;
  const inTransit = logistics.filter(l => ['运输中', '已到港'].includes(l.logisticsStatus)).length;

  // 计算应收款
  const receivable = orders
    .filter(o => o.balanceStatus !== '已付清' && o.status !== '已取消')
    .reduce((sum, o) => sum + (Number(o.balance) || 0), 0);

  // 逾期跟进
  const overdueFollowups = followups.filter(f => isOverdue(f.nextFollowDate));
  const thisWeekFollowups = followups.filter(f => isThisWeek(f.nextFollowDate));

  // 国家统计
  const countryStats = {};
  customers.forEach(c => {
    if (!countryStats[c.country]) {
      countryStats[c.country] = { count: 0, active: 0, total: 0 };
    }
    countryStats[c.country].count++;
    if (c.status === '活跃') countryStats[c.country].active++;
    countryStats[c.country].total += Number(c.totalPurchase) || 0;
  });

  container.innerHTML = `
    <div class="page-header">
      <h1 class="page-title"><span class="title-icon">📊</span>业务看板</h1>
    </div>
    <div class="page-content">
      <!-- KPI Cards -->
      <div class="kpi-grid animate-in">
        <div class="kpi-card kpi-blue">
          <div class="kpi-label">活跃客户</div>
          <div class="kpi-value">${activeCustomers}<span class="kpi-unit">家</span></div>
          <div class="kpi-icon">👥</div>
        </div>
        <div class="kpi-card kpi-gold">
          <div class="kpi-label">进行中订单</div>
          <div class="kpi-value">${activeOrders}<span class="kpi-unit">笔</span></div>
          <div class="kpi-icon">📦</div>
        </div>
        <div class="kpi-card kpi-red">
          <div class="kpi-label">待收金额</div>
          <div class="kpi-value">${formatCurrency(receivable)}</div>
          <div class="kpi-icon">💰</div>
        </div>
        <div class="kpi-card kpi-green">
          <div class="kpi-label">运输中货物</div>
          <div class="kpi-value">${inTransit}<span class="kpi-unit">批</span></div>
          <div class="kpi-icon">🚢</div>
        </div>
      </div>

      <div class="grid-2">
        <!-- 紧急待办 -->
        <div class="card animate-in">
          <div class="card-header">
            <div class="card-title">⚡ 紧急待办</div>
            ${overdueFollowups.length > 0 ? `<span class="badge status-red">${overdueFollowups.length}项逾期</span>` : '<span class="badge status-green">暂无</span>'}
          </div>
          <div class="card-body no-padding">
            ${renderTodoList(orders, followups)}
          </div>
        </div>

        <!-- 最近跟进 -->
        <div class="card animate-in">
          <div class="card-header">
            <div class="card-title">📞 最近跟进</div>
          </div>
          <div class="card-body no-padding">
            ${renderRecentFollowups(followups)}
          </div>
        </div>
      </div>

      <!-- 国家客户统计 -->
      <div class="card animate-in" style="margin-top:16px">
        <div class="card-header">
          <div class="card-title">🌍 各国客户概况</div>
        </div>
        <div class="card-body no-padding">
          ${renderCountryStats(countryStats)}
        </div>
      </div>

      <!-- 最近订单 -->
      <div class="card animate-in" style="margin-top:16px">
        <div class="card-header">
          <div class="card-title">📦 最近订单</div>
        </div>
        <div class="card-body no-padding">
          ${renderRecentOrders(orders)}
        </div>
      </div>
    </div>
  `;
}

function renderTodoList(orders, followups) {
  const todos = [];

  // 未付清的尾款
  orders.filter(o => o.balanceStatus !== '已付清' && o.status !== '已取消' && o.balance > 0)
    .forEach(o => {
      todos.push({
        urgency: '🔴',
        text: `催 ${o.customerName} 尾款 ${formatCurrency(o.balance)}`,
        meta: o.code,
      });
    });

  // 逾期跟进
  followups.filter(f => isOverdue(f.nextFollowDate))
    .forEach(f => {
      todos.push({
        urgency: '🟡',
        text: `${f.customerName}: ${f.nextAction}`,
        meta: `逾期 ${f.nextFollowDate}`,
      });
    });

  if (todos.length === 0) {
    return '<div class="empty-state"><div class="empty-icon">✅</div><p>暂无待办事项</p></div>';
  }

  return `<ul class="data-list">${todos.slice(0, 6).map(t => `
    <li class="data-item" style="cursor:default">
      <span style="font-size:20px">${t.urgency}</span>
      <div class="data-item-info">
        <div class="data-item-title">${t.text}</div>
        <div class="data-item-subtitle">${t.meta}</div>
      </div>
    </li>
  `).join('')}</ul>`;
}

function renderRecentFollowups(followups) {
  const sorted = [...followups].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5);
  if (sorted.length === 0) {
    return '<div class="empty-state"><div class="empty-icon">📞</div><p>暂无跟进记录</p></div>';
  }
  return `<ul class="data-list">${sorted.map(f => `
    <li class="data-item" style="cursor:default">
      <div class="data-item-avatar avatar-blue">${f.method === 'WhatsApp' ? '💬' : f.method === '电话' ? '📞' : '✉️'}</div>
      <div class="data-item-info">
        <div class="data-item-title">${f.customerName}</div>
        <div class="data-item-subtitle">${f.summary.substring(0, 40)}...</div>
      </div>
      <div class="data-item-right">
        <div class="data-item-meta">${f.date}</div>
        ${statusBadge(f.urgency)}
      </div>
    </li>
  `).join('')}</ul>`;
}

function renderCountryStats(stats) {
  const entries = Object.entries(stats);
  if (entries.length === 0) {
    return '<div class="empty-state"><p>暂无客户数据</p></div>';
  }
  return `<div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse;font-size:13px">
    <thead><tr style="background:var(--bg);color:var(--text-secondary);text-align:center">
      <th style="padding:10px 16px;text-align:left">国家</th>
      <th style="padding:10px">客户数</th>
      <th style="padding:10px">活跃</th>
      <th style="padding:10px;text-align:right">累计采购额</th>
    </tr></thead>
    <tbody>${entries.map(([country, s]) => `
      <tr style="border-bottom:1px solid var(--border-light)">
        <td style="padding:10px 16px;font-weight:600">${COUNTRY_FLAGS[country] || '🌍'} ${country}</td>
        <td style="padding:10px;text-align:center">${s.count}</td>
        <td style="padding:10px;text-align:center">${s.active}</td>
        <td style="padding:10px;text-align:right;font-weight:600">${formatCurrency(s.total)}</td>
      </tr>
    `).join('')}</tbody>
  </table></div>`;
}

function renderRecentOrders(orders) {
  const sorted = [...orders].sort((a, b) => (b.orderDate || '').localeCompare(a.orderDate || '')).slice(0, 5);
  if (sorted.length === 0) {
    return '<div class="empty-state"><div class="empty-icon">📦</div><p>暂无订单</p></div>';
  }
  return `<ul class="data-list">${sorted.map(o => `
    <li class="data-item" data-navigate="orders" data-id="${o.id}">
      <div class="data-item-avatar avatar-gold">📦</div>
      <div class="data-item-info">
        <div class="data-item-title">${o.customerName}</div>
        <div class="data-item-subtitle">${o.code} · ${o.description?.substring(0, 25) || ''}...</div>
      </div>
      <div class="data-item-right">
        <div class="data-item-amount">${formatCurrency(o.totalAmount)}</div>
        ${statusBadge(o.status)}
      </div>
    </li>
  `).join('')}</ul>`;
}
