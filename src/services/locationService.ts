import { InventoryUnit, StorageLocation } from '@/types/models'
import { makeId } from '@/utils/format'
import { buildLocationFullPath } from '@/utils/location'
import { canInbound } from '@/utils/permission'
import { addOperationLog, getCurrentUser, readDb, withDb } from './mockDb'

export async function getStorageLocations(): Promise<StorageLocation[]> {
  return readDb().storageLocations.filter(item => item.isActive)
}

export async function createStorageLocation(params: {
  area: string
  temperature?: string
  equipment?: string
  shelf?: string
  box?: string
  detail?: string
}): Promise<StorageLocation> {
  return withDb(db => {
    const operator = getCurrentUser(db)
    if (!canInbound(operator)) throw new Error('当前用户无权创建位置')
    if (!params.area?.trim()) throw new Error('区域不能为空')

    const now = new Date().toISOString()
    const location: StorageLocation = {
      id: makeId('loc'),
      area: params.area.trim(),
      temperature: params.temperature?.trim(),
      equipment: params.equipment?.trim(),
      shelf: params.shelf?.trim(),
      box: params.box?.trim(),
      detail: params.detail?.trim(),
      fullPath: buildLocationFullPath(params),
      isActive: true,
      createdAt: now,
      updatedAt: now
    }

    db.storageLocations.unshift(location)
    addOperationLog(db, {
      operatorId: operator.id,
      operatorName: operator.name,
      action: 'location_updated',
      targetType: 'storage_location',
      targetId: location.id,
      detail: `新增位置 ${location.fullPath}`
    })
    return location
  })
}

function applyLocationToUnit(
  db: ReturnType<typeof readDb>,
  unit: InventoryUnit,
  location: StorageLocation,
  operator: { id: string; name: string }
) {
  const now = new Date().toISOString()
  unit.locationId = location.id
  unit.locationText = location.fullPath
  unit.status = 'in_stock'
  unit.updatedAt = now

  const qr = db.qrCodes.find(item => item.id === unit.qrCodeId)
  if (qr && qr.status === 'bound') {
    qr.status = 'in_stock'
    qr.updatedAt = now
  }

  addOperationLog(db, {
    operatorId: operator.id,
    operatorName: operator.name,
    action: 'location_updated',
    targetType: 'inventory_unit',
    targetId: unit.id,
    detail: `位置更新为 ${location.fullPath}`
  })
}

export async function updateInventoryUnitLocation(params: {
  inventoryUnitId: string
  locationId: string
}): Promise<InventoryUnit> {
  return withDb(db => {
    const operator = getCurrentUser(db)
    if (!canInbound(operator)) throw new Error('当前用户无权修改位置')

    const unit = db.inventoryUnits.find(item => item.id === params.inventoryUnitId)
    if (!unit) throw new Error('库存单元不存在')

    const location = db.storageLocations.find(item => item.id === params.locationId && item.isActive)
    if (!location) throw new Error('存放位置不存在')

    applyLocationToUnit(db, unit, location, operator)
    return unit
  })
}

export async function batchUpdateLocation(params: {
  orderId: string
  orderItemId?: string
  inventoryUnitIds?: string[]
  locationId: string
}): Promise<InventoryUnit[]> {
  return withDb(db => {
    const operator = getCurrentUser(db)
    if (!canInbound(operator)) throw new Error('当前用户无权批量设置位置')

    const location = db.storageLocations.find(item => item.id === params.locationId && item.isActive)
    if (!location) throw new Error('存放位置不存在')

    const explicitIds = new Set(params.inventoryUnitIds || [])
    const targetUnits = db.inventoryUnits.filter(unit => {
      if (explicitIds.size > 0) return explicitIds.has(unit.id)
      if (unit.orderId !== params.orderId) return false
      if (params.orderItemId && unit.orderItemId !== params.orderItemId) return false
      return unit.status === 'pending_location' || !unit.locationId
    })

    if (!targetUnits.length) throw new Error('没有需要设置位置的物资')

    targetUnits.forEach(unit => applyLocationToUnit(db, unit, location, operator))
    return targetUnits
  })
}
