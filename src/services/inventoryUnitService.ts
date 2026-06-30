import { InventoryUnit, OperationLog, StockOutRecord } from '@/types/models'
import { readDb } from './mockDb'

export async function getInventoryUnitDetail(id: string): Promise<{
  unit: InventoryUnit
  logs: OperationLog[]
  stockOutRecords: StockOutRecord[]
}> {
  const db = readDb()
  const unit = db.inventoryUnits.find(item => item.id === id)
  if (!unit) throw new Error('库存单元不存在')

  return {
    unit,
    logs: db.operationLogs.filter(
      item =>
        item.targetId === unit.id ||
        item.targetId === unit.qrCodeId ||
        (unit.orderId ? item.targetId === unit.orderId : false)
    ),
    stockOutRecords: db.stockOutRecords.filter(item => item.inventoryUnitId === unit.id)
  }
}

export async function getInventoryUnitsByOrder(params: {
  orderId: string
  orderItemId?: string
  onlyPendingLocation?: boolean
}): Promise<InventoryUnit[]> {
  const db = readDb()
  return db.inventoryUnits.filter(unit => {
    if (unit.orderId !== params.orderId) return false
    if (params.orderItemId && unit.orderItemId !== params.orderItemId) return false
    if (params.onlyPendingLocation && unit.status !== 'pending_location') return false
    return true
  })
}
