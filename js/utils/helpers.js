/**
 * 工具函数集 — 御龙批发CRM
 */

// 国家代码映射
export const COUNTRY_CODES = {
  '尼日利亚': 'NG', '刚果(金)': 'CD', '刚果(布)': 'CG',
  '埃塞俄比亚': 'ET', '坦桑尼亚': 'TZ', '肯尼亚': 'KE',
  '加纳': 'GH', '南非': 'ZA', '喀麦隆': 'CM', '塞内加尔': 'SN',
  '乌干达': 'UG', '卢旺达': 'RW', '其他': 'XX'
};

export const COUNTRY_FLAGS = {
  '尼日利亚': '🇳🇬', '刚果(金)': '🇨🇩', '刚果(布)': '🇨🇬',
  '埃塞俄比亚': '🇪🇹', '坦桑尼亚': '🇹🇿', '肯尼亚': '🇰🇪',
  '加纳': '🇬🇭', '南非': '🇿🇦', '喀麦隆': '🇨🇲', '塞内加尔': '🇸🇳',
  '乌干达': '🇺🇬', '卢旺达': '🇷🇼', '其他': '🌍'
};

export const COUNTRIES = Object.keys(COUNTRY_CODES);

export const CUSTOMER_TYPES = ['批发商', '零售商进货', '品牌代理', '市场摊贩', '电商卖家', '其他'];
export const CUSTOMER_STATUSES = ['活跃', '潜在', '沉默', '流失', '黑名单'];
export const CREDIT_LEVELS = ['A-优质', 'B-良好', 'C-一般', 'D-谨慎', 'F-黑名单'];
export const SIZE_RANGES = ['S-XL', 'M-XXL', 'L-4XL', '均码', '全尺码', '其他'];

export const ORDER_STATUSES = ['待确认', '生产中', '待收款', '待出货', '已出货', '运输中', '已到港', '已签收', '已完结', '已取消'];
export const BALANCE_STATUSES = ['未付', '部分付款', '已付清'];
export const SHIPPING_METHODS = ['海运整柜', '海运拼柜', '空运', '空海联运', '客户自提'];
export const CONTAINER_SPECS = ['20GP', '40GP', '40HQ', '拼柜', '散货', 'N/A'];
export const DEPOSIT_RATES = ['30%', '50%', '100%', '其他'];

export const PAYMENT_TYPES = ['定金', '尾款', '全款', '补款', '退款'];
export const PAYMENT_METHODS = ['T/T电汇', 'Western Union', 'PayPal', 'Payoneer', 'M-Pesa', '现金', 'L/C信用证', '其他'];
export const ARRIVAL_STATUSES = ['已到账', '处理中', '待确认', '异常'];

export const CUSTOMS_STATUSES = ['未开始', '报关中', '已放行', '清关中', '已清关', '异常'];
export const LOGISTICS_STATUSES = ['待装柜', '已装柜', '运输中', '已到港', '已提货', '已完成', '异常'];

export const FOLLOWUP_METHODS = ['WhatsApp', '电话', '邮件', '微信', '面谈', '视频通话', '其他'];
export const URGENCY_LEVELS = ['🔴 紧急', '🟡 重要', '🟢 一般', '⚪ 低'];

export const PRODUCT_CATEGORIES = ['连衣裙', '套装', '衬衫/上衣', '半裙', '裤子', '蕾丝面料', '印花面料', '礼服', '长袍', '其他'];
export const TARGET_MARKETS = ['全部市场', '西非(尼日利亚等)', '中非(刚果等)', '东非(埃塞/坦桑)', '南非市场'];

// 品类编号映射
export const CATEGORY_CODES = {
  '连衣裙': 'D', '套装': 'S', '衬衫/上衣': 'T', '半裙': 'K',
  '裤子': 'P', '蕾丝面料': 'F', '印花面料': 'F', '礼服': 'G',
  '长袍': 'R', '其他': 'X'
};

/**
 * 格式化日期
 */
export function formatDate(dateStr) {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/**
 * 格式化货币
 */
export function formatCurrency(amount, currency = '$') {
  if (amount == null || amount === '') return '-';
  const num = Number(amount);
  if (isNaN(num)) return amount;
  return `${currency}${num.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

/**
 * 格式化人民币
 */
export function formatCNY(amount) {
  return formatCurrency(amount, '¥');
}

/**
 * 获取状态颜色类名
 */
export function getStatusClass(status) {
  const greenStatuses = ['活跃', '已付清', '已到账', 'A-优质', '已完结', '已清关', '已完成', '已提货', '已签收'];
  const yellowStatuses = ['潜在', '部分付款', '处理中', 'B-良好', 'C-一般', '生产中', '待确认', '报关中', '清关中', '🟡 重要'];
  const redStatuses = ['流失', '黑名单', '未付', '异常', 'D-谨慎', 'F-黑名单', '已取消', '🔴 紧急'];
  const blueStatuses = ['运输中', '已出货', '待出货', '待收款', '已装柜'];

  if (greenStatuses.includes(status)) return 'status-green';
  if (yellowStatuses.includes(status)) return 'status-yellow';
  if (redStatuses.includes(status)) return 'status-red';
  if (blueStatuses.includes(status)) return 'status-blue';
  return 'status-gray';
}

/**
 * 创建状态徽章HTML
 */
export function statusBadge(status) {
  if (!status) return '';
  return `<span class="badge ${getStatusClass(status)}">${status}</span>`;
}

/**
 * 创建下拉选项HTML
 */
export function createOptions(options, selected = '') {
  return options.map(opt =>
    `<option value="${opt}" ${opt === selected ? 'selected' : ''}>${opt}</option>`
  ).join('');
}

/**
 * 获取今天的日期字符串
 */
export function today() {
  return new Date().toISOString().split('T')[0];
}

/**
 * 判断日期是否已过期
 */
export function isOverdue(dateStr) {
  if (!dateStr) return false;
  return new Date(dateStr) < new Date(today());
}

/**
 * 判断日期是否在本周内
 */
export function isThisWeek(dateStr) {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  const now = new Date();
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay());
  startOfWeek.setHours(0, 0, 0, 0);
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 7);
  return d >= startOfWeek && d < endOfWeek;
}

/**
 * 简单搜索过滤
 */
export function matchesSearch(record, query, fields) {
  if (!query) return true;
  const q = query.toLowerCase();
  return fields.some(field => {
    const val = record[field];
    return val && String(val).toLowerCase().includes(q);
  });
}

/**
 * 显示 Toast 消息
 */
export function showToast(message, type = 'success') {
  const container = document.getElementById('toast-container');
  if (!container) return;
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  const icons = { success: '✓', error: '✗', info: 'ℹ', warning: '⚠' };
  toast.innerHTML = `<span class="toast-icon">${icons[type] || ''}</span><span>${message}</span>`;
  container.appendChild(toast);
  requestAnimationFrame(() => toast.classList.add('show'));
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, 2500);
}

/**
 * 显示确认对话框
 */
export function showConfirm(message) {
  return new Promise((resolve) => {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay active';
    overlay.innerHTML = `
      <div class="confirm-dialog">
        <div class="confirm-icon">⚠️</div>
        <p class="confirm-message">${message}</p>
        <div class="confirm-actions">
          <button class="btn btn-secondary" id="confirm-cancel">取消</button>
          <button class="btn btn-danger" id="confirm-ok">确认</button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);
    overlay.querySelector('#confirm-ok').onclick = () => { overlay.remove(); resolve(true); };
    overlay.querySelector('#confirm-cancel').onclick = () => { overlay.remove(); resolve(false); };
  });
}

/**
 * 防抖函数
 */
export function debounce(fn, delay = 300) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}
