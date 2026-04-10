/**
 * IndexedDB 数据层 — 御龙批发CRM
 * 管理所有业务数据的本地存储
 */

const DB_NAME = 'YulongCRM';
const DB_VERSION = 1;

const STORES = {
  customers: 'customers',
  orders: 'orders',
  payments: 'payments',
  logistics: 'logistics',
  followups: 'followups',
  products: 'products',
  counters: 'counters',  // 用于自动编号
};

let dbInstance = null;

/**
 * 初始化数据库
 */
export function initDB() {
  return new Promise((resolve, reject) => {
    if (dbInstance) {
      resolve(dbInstance);
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;

      // 客户表
      if (!db.objectStoreNames.contains(STORES.customers)) {
        const store = db.createObjectStore(STORES.customers, { keyPath: 'id', autoIncrement: true });
        store.createIndex('code', 'code', { unique: true });
        store.createIndex('country', 'country', { unique: false });
        store.createIndex('status', 'status', { unique: false });
        store.createIndex('creditLevel', 'creditLevel', { unique: false });
      }

      // 订单表
      if (!db.objectStoreNames.contains(STORES.orders)) {
        const store = db.createObjectStore(STORES.orders, { keyPath: 'id', autoIncrement: true });
        store.createIndex('code', 'code', { unique: true });
        store.createIndex('customerId', 'customerId', { unique: false });
        store.createIndex('status', 'status', { unique: false });
        store.createIndex('balanceStatus', 'balanceStatus', { unique: false });
      }

      // 收款表
      if (!db.objectStoreNames.contains(STORES.payments)) {
        const store = db.createObjectStore(STORES.payments, { keyPath: 'id', autoIncrement: true });
        store.createIndex('code', 'code', { unique: true });
        store.createIndex('orderId', 'orderId', { unique: false });
        store.createIndex('customerId', 'customerId', { unique: false });
      }

      // 物流表
      if (!db.objectStoreNames.contains(STORES.logistics)) {
        const store = db.createObjectStore(STORES.logistics, { keyPath: 'id', autoIncrement: true });
        store.createIndex('code', 'code', { unique: true });
        store.createIndex('orderId', 'orderId', { unique: false });
        store.createIndex('logisticsStatus', 'logisticsStatus', { unique: false });
      }

      // 跟进记录表
      if (!db.objectStoreNames.contains(STORES.followups)) {
        const store = db.createObjectStore(STORES.followups, { keyPath: 'id', autoIncrement: true });
        store.createIndex('customerId', 'customerId', { unique: false });
        store.createIndex('date', 'date', { unique: false });
        store.createIndex('nextFollowDate', 'nextFollowDate', { unique: false });
      }

      // 产品表
      if (!db.objectStoreNames.contains(STORES.products)) {
        const store = db.createObjectStore(STORES.products, { keyPath: 'id', autoIncrement: true });
        store.createIndex('code', 'code', { unique: true });
        store.createIndex('category', 'category', { unique: false });
      }

      // 计数器表（用于自动生成编号）
      if (!db.objectStoreNames.contains(STORES.counters)) {
        db.createObjectStore(STORES.counters, { keyPath: 'name' });
      }
    };

    request.onsuccess = (event) => {
      dbInstance = event.target.result;
      resolve(dbInstance);
    };

    request.onerror = (event) => {
      reject(event.target.error);
    };
  });
}

/**
 * 获取下一个自增编号
 */
export async function getNextCounter(counterName) {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.counters, 'readwrite');
    const store = tx.objectStore(STORES.counters);
    const getReq = store.get(counterName);

    getReq.onsuccess = () => {
      const counter = getReq.result || { name: counterName, value: 0 };
      counter.value += 1;
      store.put(counter);
      resolve(counter.value);
    };
    getReq.onerror = () => reject(getReq.error);
  });
}

/**
 * 通用 CRUD 操作
 */

// 新增
export async function addRecord(storeName, data) {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    data.createdAt = new Date().toISOString();
    data.updatedAt = new Date().toISOString();
    const request = store.add(data);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// 更新
export async function updateRecord(storeName, data) {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    data.updatedAt = new Date().toISOString();
    const request = store.put(data);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// 删除
export async function deleteRecord(storeName, id) {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    const request = store.delete(id);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

// 获取单条
export async function getRecord(storeName, id) {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    const request = store.get(id);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// 获取所有
export async function getAllRecords(storeName) {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
}

// 按索引查询
export async function getByIndex(storeName, indexName, value) {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    const index = store.index(indexName);
    const request = index.getAll(value);
    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
}

// 获取记录总数
export async function getCount(storeName) {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    const request = store.count();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// 清空一个表
export async function clearStore(storeName) {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    const request = store.clear();
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

/**
 * 导出所有数据（用于备份）
 */
export async function exportAllData() {
  const data = {};
  for (const storeName of Object.values(STORES)) {
    data[storeName] = await getAllRecords(storeName);
  }
  return data;
}

/**
 * 导入数据（从备份恢复）
 */
export async function importAllData(data) {
  for (const [storeName, records] of Object.entries(data)) {
    if (STORES[storeName] || Object.values(STORES).includes(storeName)) {
      await clearStore(storeName);
      for (const record of records) {
        await addRecord(storeName, record);
      }
    }
  }
}

/**
 * 预填充示例数据（首次使用时）
 */
export async function seedSampleData() {
  const customerCount = await getCount(STORES.customers);
  if (customerCount > 0) return; // 已有数据，跳过

  // --- 客户示例数据 ---
  const customers = [
    {
      code: 'NG-001', name: 'Afolabi Fashion Ltd', country: '尼日利亚', city: '拉各斯',
      whatsapp: '+234 801 234 5678', email: 'afolabi@fashion.ng', contact: 'Mr. Afolabi',
      type: '批发商', status: '活跃', creditLevel: 'A-优质', creditDays: 30,
      totalPurchase: 45000, lastOrderDate: '2026-03-15',
      categoryPreference: '蕾丝连衣裙, Ankara风格', sizeRange: 'L-4XL', priceRange: '8-15',
      notes: '大客户，每月稳定下单'
    },
    {
      code: 'CD-001', name: 'Mama Congo SARL', country: '刚果(金)', city: '金沙萨',
      whatsapp: '+243 81 234 5678', email: 'mamacongo@gmail.com', contact: 'Mme. Kabila',
      type: '批发商', status: '活跃', creditLevel: 'B-良好', creditDays: 0,
      totalPurchase: 28000, lastOrderDate: '2026-02-20',
      categoryPreference: '印花连衣裙, 套装', sizeRange: 'M-XXL', priceRange: '6-12',
      notes: '偏好鲜艳颜色，需法语沟通'
    },
    {
      code: 'ET-001', name: 'Addis Style PLC', country: '埃塞俄比亚', city: '亚的斯亚贝巴',
      whatsapp: '+251 91 234 5678', email: 'addisstyle@gmail.com', contact: 'Mr. Tadesse',
      type: '品牌代理', status: '活跃', creditLevel: 'A-优质', creditDays: 15,
      totalPurchase: 52000, lastOrderDate: '2026-03-28',
      categoryPreference: '都市女装, 轻薄面料', sizeRange: 'S-XL', priceRange: '10-20',
      notes: '高端客户，注重质量'
    },
    {
      code: 'TZ-001', name: 'Dar Fashion House', country: '坦桑尼亚', city: '达累斯萨拉姆',
      whatsapp: '+255 71 234 5678', email: 'darfashion@gmail.com', contact: 'Ms. Amina',
      type: '市场摊贩', status: '潜在', creditLevel: 'C-一般', creditDays: 0,
      totalPurchase: 5000, lastOrderDate: '2026-01-10',
      categoryPreference: 'Kitenge印花, 穆斯林长袍', sizeRange: 'M-XXL', priceRange: '4-8',
      notes: '新客户，需要培养'
    },
    {
      code: 'NG-002', name: 'Lagos Queen Textiles', country: '尼日利亚', city: '阿布贾',
      whatsapp: '+234 802 345 6789', email: 'lagosqueen@yahoo.com', contact: 'Mrs. Okafor',
      type: '电商卖家', status: '活跃', creditLevel: 'B-良好', creditDays: 0,
      totalPurchase: 18000, lastOrderDate: '2026-03-05',
      categoryPreference: '蕾丝面料, 派对礼服', sizeRange: 'L-4XL', priceRange: '12-25',
      notes: '线上销售，需要高质量产品图'
    }
  ];

  for (const c of customers) {
    await addRecord(STORES.customers, c);
  }

  // 设置计数器
  const db = await initDB();
  const tx = db.transaction(STORES.counters, 'readwrite');
  const counterStore = tx.objectStore(STORES.counters);
  counterStore.put({ name: 'NG', value: 2 });
  counterStore.put({ name: 'CD', value: 1 });
  counterStore.put({ name: 'ET', value: 1 });
  counterStore.put({ name: 'TZ', value: 1 });
  counterStore.put({ name: 'order', value: 4 });
  counterStore.put({ name: 'payment', value: 5 });
  counterStore.put({ name: 'logistics', value: 2 });
  counterStore.put({ name: 'product', value: 5 });

  // --- 订单示例数据 ---
  const orders = [
    {
      code: 'ORD-2026-001', customerId: 1, customerName: 'Afolabi Fashion Ltd', country: '尼日利亚',
      orderDate: '2026-03-15', description: '蕾丝连衣裙5款 + Ankara风格3款',
      styleCount: 8, totalPieces: 2400, priceRange: '7-14', totalAmount: 26800,
      depositRate: '50%', depositPaid: 13400, balance: 13400, balanceStatus: '未付',
      shippingMethod: '海运整柜', containerSpec: '40HQ',
      estimatedShipDate: '2026-04-20', actualShipDate: '',
      status: '生产中', notes: '客户要求4月底前到港'
    },
    {
      code: 'ORD-2026-002', customerId: 3, customerName: 'Addis Style PLC', country: '埃塞俄比亚',
      orderDate: '2026-03-28', description: '都市女装6款 + 轻薄衬衫4款',
      styleCount: 10, totalPieces: 1800, priceRange: '10-18', totalAmount: 25200,
      depositRate: '30%', depositPaid: 7560, balance: 17640, balanceStatus: '未付',
      shippingMethod: '空海联运', containerSpec: '拼柜',
      estimatedShipDate: '2026-04-15', actualShipDate: '',
      status: '待收款', notes: '等待尾款确认后出货'
    },
    {
      code: 'ORD-2026-003', customerId: 2, customerName: 'Mama Congo SARL', country: '刚果(金)',
      orderDate: '2026-02-20', description: '印花连衣裙4款 + 套装3款',
      styleCount: 7, totalPieces: 1500, priceRange: '6-10', totalAmount: 12000,
      depositRate: '50%', depositPaid: 6000, balance: 6000, balanceStatus: '已付清',
      shippingMethod: '海运拼柜', containerSpec: '拼柜',
      estimatedShipDate: '2026-03-10', actualShipDate: '2026-03-12',
      status: '运输中', notes: '预计4月中到达金沙萨'
    },
    {
      code: 'ORD-2026-004', customerId: 5, customerName: 'Lagos Queen Textiles', country: '尼日利亚',
      orderDate: '2026-03-05', description: '蕾丝面料10款 + 派对礼服5款',
      styleCount: 15, totalPieces: 3000, priceRange: '12-22', totalAmount: 51000,
      depositRate: '50%', depositPaid: 25500, balance: 25500, balanceStatus: '部分付款',
      shippingMethod: '海运整柜', containerSpec: '40HQ',
      estimatedShipDate: '2026-04-05', actualShipDate: '2026-04-06',
      status: '已出货', notes: '已发提单副本给客户'
    }
  ];

  for (const o of orders) {
    await addRecord(STORES.orders, o);
  }

  // --- 收款示例数据 ---
  const payments = [
    {
      code: 'PAY-2026-001', orderId: 1, orderCode: 'ORD-2026-001',
      customerId: 1, customerName: 'Afolabi Fashion Ltd',
      paymentDate: '2026-03-16', type: '定金', amount: 13400,
      method: 'T/T电汇', exchangeRate: 7.25, cnyAmount: 97150,
      referenceNo: 'TT20260316-001', arrivalStatus: '已到账', confirmedBy: '林经理', notes: ''
    },
    {
      code: 'PAY-2026-002', orderId: 2, orderCode: 'ORD-2026-002',
      customerId: 3, customerName: 'Addis Style PLC',
      paymentDate: '2026-03-29', type: '定金', amount: 7560,
      method: 'T/T电汇', exchangeRate: 7.24, cnyAmount: 54734,
      referenceNo: 'TT20260329-001', arrivalStatus: '已到账', confirmedBy: '林经理', notes: ''
    },
    {
      code: 'PAY-2026-003', orderId: 3, orderCode: 'ORD-2026-003',
      customerId: 2, customerName: 'Mama Congo SARL',
      paymentDate: '2026-02-21', type: '定金', amount: 6000,
      method: 'Western Union', exchangeRate: 7.26, cnyAmount: 43560,
      referenceNo: 'WU-938271645', arrivalStatus: '已到账', confirmedBy: '林经理', notes: ''
    },
    {
      code: 'PAY-2026-004', orderId: 3, orderCode: 'ORD-2026-003',
      customerId: 2, customerName: 'Mama Congo SARL',
      paymentDate: '2026-03-08', type: '尾款', amount: 6000,
      method: 'Western Union', exchangeRate: 7.25, cnyAmount: 43500,
      referenceNo: 'WU-847362519', arrivalStatus: '已到账', confirmedBy: '林经理', notes: ''
    },
    {
      code: 'PAY-2026-005', orderId: 4, orderCode: 'ORD-2026-004',
      customerId: 5, customerName: 'Lagos Queen Textiles',
      paymentDate: '2026-03-06', type: '定金', amount: 25500,
      method: 'PayPal', exchangeRate: 7.23, cnyAmount: 184365,
      referenceNo: 'PP-TX-20260306', arrivalStatus: '已到账', confirmedBy: '林经理', notes: 'PayPal手续费$1020'
    }
  ];

  for (const p of payments) {
    await addRecord(STORES.payments, p);
  }

  // --- 物流示例数据 ---
  const logisticsData = [
    {
      code: 'LOG-2026-001', orderId: 3, orderCode: 'ORD-2026-003',
      customerName: 'Mama Congo SARL', country: '刚果(金)', destinationPort: '马塔迪港',
      shippingMethod: '海运拼柜', containerNo: 'MSKU1234567', vesselName: 'MSC MAYA V.123',
      loadingDate: '2026-03-12', departureDate: '2026-03-15',
      estimatedArrival: '2026-04-18', actualArrival: '',
      blNumber: 'CNSHA2026031500123', customsStatus: '已放行',
      logisticsStatus: '运输中', notes: '拼柜，与其他货一起走'
    },
    {
      code: 'LOG-2026-002', orderId: 4, orderCode: 'ORD-2026-004',
      customerName: 'Lagos Queen Textiles', country: '尼日利亚', destinationPort: '拉各斯-阿帕帕港',
      shippingMethod: '海运整柜', containerNo: 'TGHU7654321', vesselName: 'COSCO STAR V.456',
      loadingDate: '2026-04-06', departureDate: '2026-04-08',
      estimatedArrival: '2026-05-10', actualArrival: '',
      blNumber: 'CNGZ2026040800456', customsStatus: '报关中',
      logisticsStatus: '运输中', notes: '40HQ整柜'
    }
  ];

  for (const l of logisticsData) {
    await addRecord(STORES.logistics, l);
  }

  // --- 跟进记录示例数据 ---
  const followups = [
    {
      date: '2026-04-08', customerId: 1, customerName: 'Afolabi Fashion Ltd',
      method: 'WhatsApp', summary: '发送了新款蕾丝连衣裙图片和报价，5款新花色',
      feedback: '客户对3款感兴趣，要求寄样确认',
      nextFollowDate: '2026-04-12', nextAction: '准备3款色卡寄出',
      urgency: '🟡 重要', followedBy: '林经理'
    },
    {
      date: '2026-04-07', customerId: 3, customerName: 'Addis Style PLC',
      method: '电话', summary: '催促尾款，客户说本周内安排付款',
      feedback: '承诺周五前付清尾款',
      nextFollowDate: '2026-04-11', nextAction: '确认尾款到账后安排出货',
      urgency: '🔴 紧急', followedBy: '林经理'
    },
    {
      date: '2026-04-05', customerId: 4, customerName: 'Dar Fashion House',
      method: 'WhatsApp', summary: '发送了Kitenge印花新款目录，共12个花色',
      feedback: '客户询问MOQ和价格，看了5个花色',
      nextFollowDate: '2026-04-10', nextAction: '发送详细报价单，MOQ 200件/款',
      urgency: '🟡 重要', followedBy: '林经理'
    },
    {
      date: '2026-04-03', customerId: 2, customerName: 'Mama Congo SARL',
      method: 'WhatsApp', summary: '通知客户货物已到马塔迪港附近，预计一周到港',
      feedback: '客户已安排清关代理准备接货',
      nextFollowDate: '2026-04-18', nextAction: '确认到港提货情况',
      urgency: '🟢 一般', followedBy: '林经理'
    },
    {
      date: '2026-04-01', customerId: 5, customerName: 'Lagos Queen Textiles',
      method: '邮件', summary: '发送了提单副本和装箱单',
      feedback: '客户确认收到，已安排清关',
      nextFollowDate: '2026-04-15', nextAction: '跟进清关进度和尾款',
      urgency: '🟡 重要', followedBy: '林经理'
    }
  ];

  for (const f of followups) {
    await addRecord(STORES.followups, f);
  }

  // --- 产品示例数据 ---
  const products = [
    {
      code: 'YL-D-001', category: '连衣裙', name: '蕾丝V领连衣裙（膝下款）',
      material: '聚酯纤维+蕾丝', colors: '红/金/蓝/白/紫', sizes: 'L-4XL',
      moq: 200, factoryPrice: 65, wholesalePrice: 12, retailPrice: 25,
      productionDays: 15, imageUrl: '', targetMarket: '西非(尼日利亚等)',
      notes: '爆款，常年畅销'
    },
    {
      code: 'YL-D-002', category: '连衣裙', name: 'Ankara印花A字裙',
      material: '全棉印花', colors: '多花色(12色)', sizes: 'M-XXL',
      moq: 300, factoryPrice: 45, wholesalePrice: 8, retailPrice: 18,
      productionDays: 10, imageUrl: '', targetMarket: '全部市场',
      notes: '色号见色卡'
    },
    {
      code: 'YL-S-001', category: '套装', name: '印花上衣+半裙套装',
      material: '涤棉混纺', colors: '6个花色', sizes: 'M-XXL',
      moq: 150, factoryPrice: 85, wholesalePrice: 15, retailPrice: 30,
      productionDays: 15, imageUrl: '', targetMarket: '中非(刚果等)',
      notes: '新款推荐'
    },
    {
      code: 'YL-F-001', category: '蕾丝面料', name: '法式重工蕾丝（5码/片）',
      material: '100%聚酯', colors: '金/银/白/红/蓝/绿/紫', sizes: 'N/A',
      moq: 100, factoryPrice: 120, wholesalePrice: 22, retailPrice: 45,
      productionDays: 7, imageUrl: '', targetMarket: '西非(尼日利亚等)',
      notes: 'Aso Ebi热门'
    },
    {
      code: 'YL-R-001', category: '长袍', name: '穆斯林刺绣长袍',
      material: '雪纺', colors: '黑/白/驼色/藏蓝', sizes: '均码',
      moq: 200, factoryPrice: 75, wholesalePrice: 14, retailPrice: 28,
      productionDays: 12, imageUrl: '', targetMarket: '东非(埃塞/坦桑)',
      notes: '斋月旺季款'
    }
  ];

  for (const prod of products) {
    await addRecord(STORES.products, prod);
  }

  console.log('✅ 示例数据已填充完成');
}

export { STORES };
