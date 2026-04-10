/**
 * Excel 导出功能
 * 使用 SheetJS (xlsx) 库
 */
import { exportAllData } from '../db.js';

/**
 * 导出所有数据为 Excel
 */
export async function exportToExcel() {
  // 动态加载 SheetJS
  if (!window.XLSX) {
    const script = document.createElement('script');
    script.src = 'https://cdn.sheetjs.com/xlsx-0.20.3/package/dist/xlsx.full.min.js';
    document.head.appendChild(script);
    await new Promise((resolve, reject) => {
      script.onload = resolve;
      script.onerror = reject;
    });
  }

  const data = await exportAllData();
  const wb = XLSX.utils.book_new();

  // 客户表
  if (data.customers?.length) {
    const ws = XLSX.utils.json_to_sheet(data.customers.map(c => ({
      '客户编号': c.code, '客户名称': c.name, '国家': c.country, '城市': c.city,
      'WhatsApp': c.whatsapp, 'Email': c.email, '联系人': c.contact,
      '客户类型': c.type, '合作状态': c.status, '信用等级': c.creditLevel,
      '账期(天)': c.creditDays, '累计采购额($)': c.totalPurchase,
      '最近下单日期': c.lastOrderDate, '品类偏好': c.categoryPreference,
      '尺码范围': c.sizeRange, '价位区间': c.priceRange, '备注': c.notes,
    })));
    XLSX.utils.book_append_sheet(wb, ws, '客户总表');
  }

  // 订单表
  if (data.orders?.length) {
    const ws = XLSX.utils.json_to_sheet(data.orders.map(o => ({
      '订单编号': o.code, '客户名称': o.customerName, '国家': o.country,
      '下单日期': o.orderDate, '货品描述': o.description,
      '款号数量': o.styleCount, '总件数': o.totalPieces,
      '单价区间($)': o.priceRange, '订单总额($)': o.totalAmount,
      '定金比例': o.depositRate, '已收定金($)': o.depositPaid,
      '尾款($)': o.balance, '尾款状态': o.balanceStatus,
      '出货方式': o.shippingMethod, '货柜规格': o.containerSpec,
      '预计出货日': o.estimatedShipDate, '实际出货日': o.actualShipDate,
      '订单状态': o.status, '备注': o.notes,
    })));
    XLSX.utils.book_append_sheet(wb, ws, '订单记录');
  }

  // 收款表
  if (data.payments?.length) {
    const ws = XLSX.utils.json_to_sheet(data.payments.map(p => ({
      '收款编号': p.code, '订单编号': p.orderCode, '客户名称': p.customerName,
      '收款日期': p.paymentDate, '收款类型': p.type, '收款金额($)': p.amount,
      '收款方式': p.method, '汇率': p.exchangeRate, '实收人民币(¥)': p.cnyAmount,
      '流水号': p.referenceNo, '到账状态': p.arrivalStatus, '备注': p.notes,
    })));
    XLSX.utils.book_append_sheet(wb, ws, '收款记录');
  }

  // 物流表
  if (data.logistics?.length) {
    const ws = XLSX.utils.json_to_sheet(data.logistics.map(l => ({
      '物流编号': l.code, '订单编号': l.orderCode, '客户名称': l.customerName,
      '目的国': l.country, '目的港': l.destinationPort,
      '出货方式': l.shippingMethod, '货柜号': l.containerNo,
      '船名': l.vesselName, '装柜日期': l.loadingDate,
      '开船日期': l.departureDate, '预计到港': l.estimatedArrival,
      '实际到港': l.actualArrival, '提单号': l.blNumber,
      '清关状态': l.customsStatus, '物流状态': l.logisticsStatus, '备注': l.notes,
    })));
    XLSX.utils.book_append_sheet(wb, ws, '物流跟踪');
  }

  // 跟进表
  if (data.followups?.length) {
    const ws = XLSX.utils.json_to_sheet(data.followups.map(f => ({
      '跟进日期': f.date, '客户名称': f.customerName, '跟进方式': f.method,
      '沟通内容': f.summary, '客户反馈': f.feedback,
      '下次跟进日期': f.nextFollowDate, '跟进事项': f.nextAction,
      '紧急程度': f.urgency, '跟进人': f.followedBy,
    })));
    XLSX.utils.book_append_sheet(wb, ws, '跟进记录');
  }

  // 产品表
  if (data.products?.length) {
    const ws = XLSX.utils.json_to_sheet(data.products.map(p => ({
      '款号': p.code, '品类': p.category, '品名': p.name,
      '面料': p.material, '颜色': p.colors, '尺码': p.sizes,
      'MOQ(件)': p.moq, '出厂价(¥)': p.factoryPrice,
      '批发价($)': p.wholesalePrice, '零售价($)': p.retailPrice,
      '生产周期(天)': p.productionDays, '适合市场': p.targetMarket,
      '当前库存': p.stockQty || 0, '预警线': p.stockAlert || 0,
      '关联工厂': p.factoryName || '', '备注': p.notes,
    })));
    XLSX.utils.book_append_sheet(wb, ws, '产品款号');
  }

  // 🏬 库存流水表
  if (data.inventory?.length) {
    const ws = XLSX.utils.json_to_sheet(data.inventory.map(r => ({
      '单据号': r.code, '类型': r.type, '产品款号': r.productCode,
      '产品名称': r.productName, '数量': r.quantity, '原因': r.reason,
      '关联订单': r.orderCode || '', '日期': r.date,
      '仓库': r.warehouse, '操作人': r.operator, '备注': r.notes,
    })));
    XLSX.utils.book_append_sheet(wb, ws, '库存流水');
  }

  // 🏭 工厂档案表
  if (data.factories?.length) {
    const ws = XLSX.utils.json_to_sheet(data.factories.map(f => ({
      '编号': f.code, '工厂名称': f.name, '联系人': f.contact,
      '电话/微信': f.phone, '地址': f.address, '主营品类': f.specialty,
      '评级': f.rating, '结算方式': f.paymentTerms, '备注': f.notes,
    })));
    XLSX.utils.book_append_sheet(wb, ws, '工厂档案');
  }

  // 🏭 生产工单表
  if (data.productionOrders?.length) {
    const ws = XLSX.utils.json_to_sheet(data.productionOrders.map(po => ({
      '工单号': po.code, '工厂': po.factoryName, '关联订单': po.orderCode || '',
      '产品款号': po.productCode || '', '产品名称': po.productName || '',
      '数量(件)': po.quantity, '单价(¥)': po.unitCost, '总费用(¥)': po.totalCost,
      '下单日期': po.orderDate, '要求交货日': po.requiredDate,
      '实际交货日': po.actualDeliveryDate || '', '状态': po.status,
      '质量备注': po.qualityNotes || '', '备注': po.notes,
    })));
    XLSX.utils.book_append_sheet(wb, ws, '生产工单');
  }

  // 下载
  const dateStr = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(wb, `御龙CRM_数据备份_${dateStr}.xlsx`);
}

/**
 * 导出所有数据为 JSON（完整备份）
 */
export async function exportToJSON() {
  const data = await exportAllData();
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `御龙CRM_备份_${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * 从 JSON 文件导入数据
 */
export async function importFromJSON() {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) { resolve(false); return; }
      try {
        const text = await file.text();
        const data = JSON.parse(text);
        const { importAllData } = await import('../db.js');
        await importAllData(data);
        resolve(true);
      } catch (err) {
        console.error('Import error:', err);
        resolve(false);
      }
    };
    input.click();
  });
}
