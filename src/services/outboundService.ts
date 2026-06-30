import { InventoryUnit, StockOutRecord } from '@/types/models'
import { makeId } from '@/utils/format'
import { canOutbound } from '@/utils/permission'
import { addOperationLog, getCurrentUser, readDb, withDb } from './mockDb'

export async function getInventoryUnitByQrCode(qrCode: string): Promise<InventoryUnit> {
  const db = readDb()
  const unit = db.inventoryUnits.find(item => item.qrCode === qrCode)
  if (!unit) throw new Error('未找到该二维码绑定的库存单元')
  return unit
}

export async function submitStockOut(params: {
  inventoryUnitId: string
  quantity: number
  purpose?: string
  project?: string
  note?: string
}): Promise<StockOutRecord> {
  return withDb(db => {
    const user = getCurrentUser(db)
    if (!canOutbound(user)) throw new Error('当前用户无权扫码出库')

    const unit = db.inventoryUnits.find(item => item.id === params.inventoryUnitId)
    if (!unit) throw new Error('库存单元不存在')

    if (!['in_stock', 'partially_used'].includes(unit.status)) {
      throw new Error(unit.status === 'pending_location' ? '该物资需先设置存放位置' : '当前物资不可出库')
    }

    if (!Number.isFinite(params.quantity) || params.quantity <= 0) {
      throw new Error('出库数量必须大于 0')
    }

    const beforeRemainingQuantity = unit.remainingQuantity ?? unit.quantity
    const afterRemainingQuantity = Number((beforeRemainingQuantity - params.quantity).toFixed(4))

    if (afterRemainingQuantity < 0) throw new Error('出库数量不能超过剩余数量')

    const now = new Date().toISOString()
    const record: StockOutRecord = {
      id: makeId('out'),
      inventoryUnitId: unit.id,
      qrCode: unit.qrCode,
      userId: user.id,
      userName: user.name,
      quantity: params.quantity,
      unit: unit.unit,
      purpose: params.purpose,
      project: params.project,
      beforeRemainingQuantity,
      afterRemainingQuantity,
      note: params.note,
      createdAt: now
    }

    db.stockOutRecords.unshift(record)
    unit.remainingQuantity = afterRemainingQuantity
    unit.status = afterRemainingQuantity === 0 ? 'used_up' : 'partially_used'
    unit.lastOutboundAt = now
    unit.updatedAt = now

    const qr = db.qrCodes.find(item => item.id === unit.qrCodeId)
    if (qr && afterRemainingQuantity === 0) {
      qr.status = 'out_used'
      qr.updatedAt = now
    }

    addOperationLog(db, {
      operatorId: user.id,
      operatorName: user.name,
      action: 'stock_out',
      targetType: 'inventory_unit',
      targetId: unit.id,
      detail: `${user.name} 领用 ${unit.itemName} ${params.quantity}${unit.unit}`
    })

    return record
  })
}
