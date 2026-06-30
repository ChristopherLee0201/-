import Taro from '@tarojs/taro'
import {
  InventoryUnit,
  OperationAction,
  OperationLog,
  OperationTargetType,
  PurchaseOrder,
  PurchaseOrderItem,
  QrCode,
  QrPrintBatch,
  StockOutRecord,
  StorageLocation,
  User
} from '@/types/models'
import { makeId } from '@/utils/format'

const STORAGE_KEY = 'lab_qr_demo_db_v1'

export interface MockDb {
  users: User[]
  currentUserId: string
  qrCodes: QrCode[]
  qrPrintBatches: QrPrintBatch[]
  purchaseOrders: PurchaseOrder[]
  purchaseOrderItems: PurchaseOrderItem[]
  inventoryUnits: InventoryUnit[]
  stockOutRecords: StockOutRecord[]
  storageLocations: StorageLocation[]
  operationLogs: OperationLog[]
}

const ts = (hour: number, minute: number) =>
  `2026-06-29T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00+08:00`

function makeQr(
  id: string,
  code: string,
  status: QrCode['status'],
  boundInventoryUnitId?: string
): QrCode {
  return {
    id,
    code,
    status,
    batchId: 'batch_1',
    printedAt: ts(9, 30),
    printedBy: 'user_purchase',
    boundAt: boundInventoryUnitId ? ts(11, 30) : undefined,
    boundBy: boundInventoryUnitId ? 'user_purchase' : undefined,
    boundInventoryUnitId,
    createdAt: ts(9, 0),
    updatedAt: ts(11, 30)
  }
}

function makeUnit(
  id: string,
  qrCodeId: string,
  qrCode: string,
  orderItemId: string,
  itemName: string,
  fields: Partial<InventoryUnit>
): InventoryUnit {
  return {
    id,
    qrCodeId,
    qrCode,
    orderId: 'order_1',
    orderItemId,
    itemName,
    quantity: 1,
    remainingQuantity: 1,
    unit: '瓶',
    status: 'in_stock',
    inboundBy: 'user_purchase',
    inboundByName: '张三',
    inboundSignatureId: 'sig_zhangsan',
    inboundAt: ts(11, 30),
    createdAt: ts(11, 30),
    updatedAt: ts(12, 10),
    ...fields
  }
}

export function createSeedDb(): MockDb {
  const locationCold4: StorageLocation = {
    id: 'loc_4c_b_2',
    area: '冰箱间',
    temperature: '4℃',
    equipment: '4℃冰箱 B',
    shelf: '第二层',
    box: 'Box 2',
    detail: '右前角',
    fullPath: '冰箱间 / 4℃冰箱 B / 第二层 / Box 2 / 右前角',
    isActive: true,
    createdAt: ts(8, 50),
    updatedAt: ts(8, 50)
  }

  const locationCold20: StorageLocation = {
    id: 'loc_20c_a_1',
    area: '冰箱间',
    temperature: '-20℃',
    equipment: '-20℃冰箱 A',
    shelf: '第一层',
    box: 'Box 3',
    detail: '左后角',
    fullPath: '冰箱间 / -20℃冰箱 A / 第一层 / Box 3 / 左后角',
    isActive: true,
    createdAt: ts(8, 50),
    updatedAt: ts(8, 50)
  }

  const units: InventoryUnit[] = [
    makeUnit('unit_dmem_1', 'qr_1', 'QRC_20260629_A8K39D2P', 'item_dmem', 'DMEM 高糖培养基', {
      brand: 'Gibco',
      catalogNo: '11965092',
      specification: '500mL',
      batchNo: 'B20260629',
      expiryDate: '2026-12-31',
      locationId: locationCold4.id,
      locationText: locationCold4.fullPath
    }),
    makeUnit('unit_dmem_2', 'qr_2', 'QRC_20260629_F7P2X1QA', 'item_dmem', 'DMEM 高糖培养基', {
      brand: 'Gibco',
      catalogNo: '11965092',
      specification: '500mL',
      batchNo: 'B20260629',
      expiryDate: '2026-12-31',
      locationId: locationCold4.id,
      locationText: locationCold4.fullPath
    }),
    makeUnit('unit_dmem_3', 'qr_3', 'QRC_20260629_K9L3W8BZ', 'item_dmem', 'DMEM 高糖培养基', {
      brand: 'Gibco',
      catalogNo: '11965092',
      specification: '500mL',
      batchNo: 'B20260629',
      expiryDate: '2026-12-31',
      status: 'pending_location'
    }),
    makeUnit('unit_pbs_1', 'qr_7', 'QRC_20260629_P7D3R4WE', 'item_pbs', 'PBS 缓冲液', {
      specification: '500mL',
      unit: '瓶',
      locationId: locationCold4.id,
      locationText: locationCold4.fullPath
    }),
    makeUnit('unit_pbs_2', 'qr_8', 'QRC_20260629_R8E4S5TY', 'item_pbs', 'PBS 缓冲液', {
      specification: '500mL',
      unit: '瓶',
      locationId: locationCold4.id,
      locationText: locationCold4.fullPath
    }),
    makeUnit('unit_pbs_3', 'qr_9', 'QRC_20260629_S9F5U6IO', 'item_pbs', 'PBS 缓冲液', {
      specification: '500mL',
      unit: '瓶',
      locationId: locationCold4.id,
      locationText: locationCold4.fullPath
    }),
    makeUnit('unit_fbs_1', 'qr_10', 'QRC_20260629_T1G6V7PA', 'item_fbs', 'FBS 胎牛血清', {
      brand: 'Gibco',
      specification: '50mL',
      unit: '支',
      locationId: locationCold20.id,
      locationText: locationCold20.fullPath
    }),
    makeUnit('unit_fbs_2', 'qr_11', 'QRC_20260629_U2H7W8SD', 'item_fbs', 'FBS 胎牛血清', {
      brand: 'Gibco',
      specification: '50mL',
      unit: '支',
      locationId: locationCold20.id,
      locationText: locationCold20.fullPath
    })
  ]

  return {
    users: [
      { id: 'user_admin', name: '李老师', role: 'admin', signatureId: 'sig_lilaoshi' },
      { id: 'user_purchase', name: '张三', role: 'purchaser', signatureId: 'sig_zhangsan' },
      { id: 'user_member', name: '李四', role: 'member' }
    ],
    currentUserId: 'user_purchase',
    qrPrintBatches: [
      {
        id: 'batch_1',
        batchNo: 'QRB20260629-001',
        quantity: 12,
        status: 'printed',
        labelSize: '30mm × 20mm',
        printerName: 'MVP 标签 PDF',
        createdBy: 'user_purchase',
        createdByName: '张三',
        createdAt: ts(9, 0),
        printedAt: ts(9, 30)
      }
    ],
    qrCodes: [
      makeQr('qr_1', 'QRC_20260629_A8K39D2P', 'in_stock', 'unit_dmem_1'),
      makeQr('qr_2', 'QRC_20260629_F7P2X1QA', 'in_stock', 'unit_dmem_2'),
      makeQr('qr_3', 'QRC_20260629_K9L3W8BZ', 'bound', 'unit_dmem_3'),
      makeQr('qr_4', 'QRC_20260629_L4P8V2NA', 'printed'),
      makeQr('qr_5', 'QRC_20260629_M5Q1T8XB', 'printed'),
      makeQr('qr_6', 'QRC_20260629_N6C2Y9ZA', 'printed'),
      makeQr('qr_7', 'QRC_20260629_P7D3R4WE', 'in_stock', 'unit_pbs_1'),
      makeQr('qr_8', 'QRC_20260629_R8E4S5TY', 'in_stock', 'unit_pbs_2'),
      makeQr('qr_9', 'QRC_20260629_S9F5U6IO', 'in_stock', 'unit_pbs_3'),
      makeQr('qr_10', 'QRC_20260629_T1G6V7PA', 'in_stock', 'unit_fbs_1'),
      makeQr('qr_11', 'QRC_20260629_U2H7W8SD', 'in_stock', 'unit_fbs_2'),
      makeQr('qr_12', 'QRC_20260629_V3J8X9DF', 'voided')
    ],
    purchaseOrders: [
      {
        id: 'order_1',
        orderNo: 'PO20260629-001',
        supplier: 'XX 生物',
        status: 'partially_received',
        createdBy: 'user_purchase',
        createdByName: '张三',
        createdAt: ts(10, 0),
        updatedAt: ts(12, 10)
      },
      {
        id: 'order_2',
        orderNo: 'PO20260629-002',
        supplier: '华东试剂',
        status: 'pending_arrival',
        createdBy: 'user_purchase',
        createdByName: '张三',
        createdAt: ts(14, 0),
        updatedAt: ts(14, 0)
      }
    ],
    purchaseOrderItems: [
      {
        id: 'item_dmem',
        orderId: 'order_1',
        itemName: 'DMEM 高糖培养基',
        chineseName: 'DMEM 高糖培养基',
        englishName: 'DMEM High Glucose',
        brand: 'Gibco',
        catalogNo: '11965092',
        specification: '500mL',
        orderedQuantity: 5,
        receivedQuantity: 3,
        unit: '瓶',
        batchNo: 'B20260629',
        expiryDate: '2026-12-31',
        status: 'partially_received',
        createdAt: ts(10, 5),
        updatedAt: ts(12, 10)
      },
      {
        id: 'item_pbs',
        orderId: 'order_1',
        itemName: 'PBS 缓冲液',
        specification: '500mL',
        orderedQuantity: 3,
        receivedQuantity: 3,
        unit: '瓶',
        batchNo: 'PBS20260629',
        expiryDate: '2027-01-31',
        status: 'received',
        createdAt: ts(10, 5),
        updatedAt: ts(12, 10)
      },
      {
        id: 'item_fbs',
        orderId: 'order_1',
        itemName: 'FBS 胎牛血清',
        brand: 'Gibco',
        specification: '50mL',
        orderedQuantity: 2,
        receivedQuantity: 2,
        unit: '支',
        batchNo: 'FBS20260629',
        expiryDate: '2026-11-30',
        status: 'received',
        createdAt: ts(10, 5),
        updatedAt: ts(12, 10)
      },
      {
        id: 'item_antibody',
        orderId: 'order_2',
        itemName: 'β-actin 抗体',
        brand: 'CST',
        catalogNo: '4970',
        specification: '100μL',
        orderedQuantity: 2,
        receivedQuantity: 0,
        unit: '支',
        status: 'pending',
        createdAt: ts(14, 5),
        updatedAt: ts(14, 5)
      }
    ],
    inventoryUnits: units,
    stockOutRecords: [
      {
        id: 'out_1',
        inventoryUnitId: 'unit_dmem_1',
        qrCode: 'QRC_20260629_A8K39D2P',
        userId: 'user_member',
        userName: '李四',
        quantity: 0.2,
        unit: '瓶',
        purpose: '细胞培养',
        project: '肿瘤细胞系维护',
        beforeRemainingQuantity: 1,
        afterRemainingQuantity: 0.8,
        createdAt: '2026-06-30T09:20:00+08:00'
      }
    ],
    storageLocations: [locationCold4, locationCold20],
    operationLogs: [
      {
        id: 'log_1',
        operatorId: 'user_purchase',
        operatorName: '张三',
        action: 'qr_printed',
        targetType: 'qr_code',
        targetId: 'batch_1',
        detail: '批次 QRB20260629-001 已导出标签 PDF',
        createdAt: ts(9, 30)
      },
      {
        id: 'log_2',
        operatorId: 'user_purchase',
        operatorName: '张三',
        action: 'qr_bound',
        targetType: 'qr_code',
        targetId: 'qr_1',
        detail: '二维码 QRC_20260629_A8K39D2P 绑定到 DMEM 高糖培养基',
        createdAt: ts(11, 30)
      },
      {
        id: 'log_3',
        operatorId: 'user_purchase',
        operatorName: '张三',
        action: 'location_updated',
        targetType: 'inventory_unit',
        targetId: 'unit_dmem_1',
        detail: `位置更新为 ${locationCold4.fullPath}`,
        createdAt: ts(12, 10)
      }
    ]
  }
}

let memoryDb: MockDb | null = null

function safeClone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}

export function readDb(): MockDb {
  try {
    const stored = Taro.getStorageSync<MockDb>(STORAGE_KEY)
    if (stored?.users?.length) return stored

    const seed = createSeedDb()
    Taro.setStorageSync(STORAGE_KEY, seed)
    return seed
  } catch (error) {
    if (!memoryDb) memoryDb = createSeedDb()
    return safeClone(memoryDb)
  }
}

export function writeDb(db: MockDb) {
  try {
    Taro.setStorageSync(STORAGE_KEY, db)
  } catch (error) {
    memoryDb = safeClone(db)
  }
}

export function withDb<T>(mutator: (db: MockDb) => T): T {
  const db = readDb()
  const workingCopy = safeClone(db)
  const result = mutator(workingCopy)
  writeDb(workingCopy)
  return result
}

export function getCurrentUser(db = readDb()): User {
  const user = db.users.find(item => item.id === db.currentUserId)
  if (!user) throw new Error('当前用户不存在')
  return user
}

export function addOperationLog(
  db: MockDb,
  params: {
    operatorId: string
    operatorName: string
    action: OperationAction
    targetType: OperationTargetType
    targetId: string
    detail?: string
  }
) {
  db.operationLogs.unshift({
    id: makeId('log'),
    createdAt: new Date().toISOString(),
    ...params
  })
}

export function resetMockDb() {
  const db = createSeedDb()
  writeDb(db)
  return db
}
