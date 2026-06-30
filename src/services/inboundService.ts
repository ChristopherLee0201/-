import {
  InboundOrderDetail,
  InboundOrderSummary,
  InventoryUnit,
  PurchaseOrder,
  PurchaseOrderItem
} from '@/types/models'
import { makeId } from '@/utils/format'
import { canInbound } from '@/utils/permission'
import { addOperationLog, getCurrentUser, readDb, withDb } from './mockDb'

function calculateOrderProgress(order: PurchaseOrder, items: PurchaseOrderItem[], units: InventoryUnit[]): InboundOrderSummary {
  const orderItems = items.filter(item => item.orderId === order.id)
  const totalQuantity = orderItems.reduce((sum, item) => sum + item.orderedQuantity, 0)
  const receivedQuantity = orderItems.reduce((sum, item) => sum + item.receivedQuantity, 0)
  const pendingLocationCount = units.filter(
    item => item.orderId === order.id && item.status === 'pending_location'
  ).length

  return {
    ...order,
    totalQuantity,
    receivedQuantity,
    pendingLocationCount
  }
}

function refreshOrderStatus(order: PurchaseOrder, items: PurchaseOrderItem[]) {
  const orderItems = items.filter(item => item.orderId === order.id)
  const total = orderItems.reduce((sum, item) => sum + item.orderedQuantity, 0)
  const received = orderItems.reduce((sum, item) => sum + item.receivedQuantity, 0)

  if (received <= 0) {
    order.status = 'pending_arrival'
  } else if (received < total) {
    order.status = 'partially_received'
  } else {
    order.status = 'received'
  }

  order.updatedAt = new Date().toISOString()
}

export async function getInboundOrders(): Promise<InboundOrderSummary[]> {
  const db = readDb()
  return db.purchaseOrders
    .filter(order => order.status !== 'cancelled' && order.status !== 'completed')
    .map(order => calculateOrderProgress(order, db.purchaseOrderItems, db.inventoryUnits))
}

export async function getInboundOrderDetail(orderId: string): Promise<InboundOrderDetail> {
  const db = readDb()
  const order = db.purchaseOrders.find(item => item.id === orderId)
  if (!order) throw new Error('订单不存在')

  const summary = calculateOrderProgress(order, db.purchaseOrderItems, db.inventoryUnits)
  return {
    ...summary,
    items: db.purchaseOrderItems
      .filter(item => item.orderId === orderId)
      .map(item => ({
        ...item,
        units: db.inventoryUnits.filter(unit => unit.orderItemId === item.id)
      }))
  }
}

export async function bindQrCodeToOrderItem(params: {
  qrCode: string
  orderId: string
  orderItemId: string
}): Promise<InventoryUnit> {
  return withDb(db => {
    const operator = getCurrentUser(db)
    if (!canInbound(operator)) throw new Error('当前用户无权扫码入库')

    const qr = db.qrCodes.find(item => item.code === params.qrCode)
    if (!qr) throw new Error('二维码不存在')

    if (!['generated', 'printed'].includes(qr.status)) {
      throw new Error('该二维码已被占用，不能重复入库。')
    }

    const order = db.purchaseOrders.find(item => item.id === params.orderId)
    if (!order) throw new Error('订单不存在')

    const orderItem = db.purchaseOrderItems.find(item => item.id === params.orderItemId)
    if (!orderItem) throw new Error('订单明细不存在')

    if (orderItem.orderId !== params.orderId) throw new Error('订单明细与订单不匹配')

    if (orderItem.receivedQuantity >= orderItem.orderedQuantity) {
      throw new Error('该物品已全部入库')
    }

    const now = new Date().toISOString()
    const unit: InventoryUnit = {
      id: makeId('unit'),
      qrCodeId: qr.id,
      qrCode: qr.code,
      orderId: params.orderId,
      orderItemId: params.orderItemId,
      itemName: orderItem.itemName,
      chineseName: orderItem.chineseName,
      englishName: orderItem.englishName,
      brand: orderItem.brand,
      catalogNo: orderItem.catalogNo,
      specification: orderItem.specification,
      batchNo: orderItem.batchNo,
      expiryDate: orderItem.expiryDate,
      quantity: 1,
      remainingQuantity: 1,
      unit: orderItem.unit,
      status: 'pending_location',
      inboundBy: operator.id,
      inboundByName: operator.name,
      inboundSignatureId: operator.signatureId,
      inboundAt: now,
      createdAt: now,
      updatedAt: now
    }

    db.inventoryUnits.unshift(unit)

    qr.status = 'bound'
    qr.boundAt = now
    qr.boundBy = operator.id
    qr.boundInventoryUnitId = unit.id
    qr.updatedAt = now

    const newReceivedQuantity = orderItem.receivedQuantity + 1
    orderItem.receivedQuantity = newReceivedQuantity
    orderItem.status =
      newReceivedQuantity >= orderItem.orderedQuantity ? 'received' : 'partially_received'
    orderItem.updatedAt = now

    refreshOrderStatus(order, db.purchaseOrderItems)

    addOperationLog(db, {
      operatorId: operator.id,
      operatorName: operator.name,
      action: 'qr_bound',
      targetType: 'qr_code',
      targetId: qr.id,
      detail: `二维码 ${qr.code} 绑定到 ${orderItem.itemName}`
    })

    addOperationLog(db, {
      operatorId: operator.id,
      operatorName: operator.name,
      action: 'inbound_created',
      targetType: 'inventory_unit',
      targetId: unit.id,
      detail: `入库 ${orderItem.itemName}，订单 ${order.orderNo}`
    })

    return unit
  })
}

export async function completeInboundOrder(orderId: string): Promise<InboundOrderDetail> {
  return withDb(db => {
    const operator = getCurrentUser(db)
    if (!canInbound(operator)) throw new Error('当前用户无权完成入库')

    const order = db.purchaseOrders.find(item => item.id === orderId)
    if (!order) throw new Error('订单不存在')

    const items = db.purchaseOrderItems.filter(item => item.orderId === orderId)
    const allReceived = items.every(item => item.receivedQuantity >= item.orderedQuantity)
    if (!allReceived) throw new Error('订单仍有未入库物资')

    order.status = 'stocked'
    order.updatedAt = new Date().toISOString()

    addOperationLog(db, {
      operatorId: operator.id,
      operatorName: operator.name,
      action: 'inbound_created',
      targetType: 'purchase_order',
      targetId: order.id,
      detail: `完成订单 ${order.orderNo} 本次入库`
    })

    return {
      ...calculateOrderProgress(order, db.purchaseOrderItems, db.inventoryUnits),
      items: items.map(item => ({
        ...item,
        units: db.inventoryUnits.filter(unit => unit.orderItemId === item.id)
      }))
    }
  })
}
