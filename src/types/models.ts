export type UserRole = 'member' | 'purchaser' | 'admin'

export interface User {
  id: string
  name: string
  role: UserRole
  signatureId?: string
  signatureImageUrl?: string
}

export type QrCodeStatus =
  | 'generated'
  | 'printed'
  | 'bound'
  | 'in_stock'
  | 'out_used'
  | 'discarded'
  | 'voided'

export const qrCodeStatusText: Record<QrCodeStatus, string> = {
  generated: '已生成',
  printed: '已打印',
  bound: '已绑定',
  in_stock: '库存中',
  out_used: '已出库/已用尽',
  discarded: '已报废',
  voided: '已作废'
}

export interface QrCode {
  id: string
  code: string
  status: QrCodeStatus
  batchId?: string
  printedAt?: string
  printedBy?: string
  boundAt?: string
  boundBy?: string
  boundInventoryUnitId?: string
  createdAt: string
  updatedAt: string
}

export type QrPrintBatchStatus = 'created' | 'printing' | 'printed' | 'failed' | 'partially_printed'

export const qrPrintBatchStatusText: Record<QrPrintBatchStatus, string> = {
  created: '已创建',
  printing: '打印中',
  printed: '已打印',
  failed: '打印失败',
  partially_printed: '部分打印'
}

export interface QrPrintBatch {
  id: string
  batchNo: string
  quantity: number
  status: QrPrintBatchStatus
  labelSize?: string
  printerName?: string
  createdBy: string
  createdByName: string
  createdAt: string
  printedAt?: string
}

export type PurchaseOrderStatus =
  | 'pending_arrival'
  | 'partially_received'
  | 'received'
  | 'stocked'
  | 'completed'
  | 'cancelled'

export const purchaseOrderStatusText: Record<PurchaseOrderStatus, string> = {
  pending_arrival: '待到货',
  partially_received: '部分入库',
  received: '已到货',
  stocked: '已上架',
  completed: '已完成',
  cancelled: '已取消'
}

export interface PurchaseOrder {
  id: string
  orderNo: string
  supplier?: string
  status: PurchaseOrderStatus
  createdBy: string
  createdByName: string
  createdAt: string
  updatedAt: string
}

export type PurchaseOrderItemStatus = 'pending' | 'partially_received' | 'received' | 'stocked'

export const purchaseOrderItemStatusText: Record<PurchaseOrderItemStatus, string> = {
  pending: '待入库',
  partially_received: '部分入库',
  received: '已入库',
  stocked: '已上架'
}

export interface PurchaseOrderItem {
  id: string
  orderId: string
  itemName: string
  chineseName?: string
  englishName?: string
  brand?: string
  catalogNo?: string
  specification?: string
  orderedQuantity: number
  receivedQuantity: number
  unit: string
  batchNo?: string
  expiryDate?: string
  status: PurchaseOrderItemStatus
  createdAt: string
  updatedAt: string
}

export type InventoryUnitStatus =
  | 'pending_location'
  | 'in_stock'
  | 'partially_used'
  | 'used_up'
  | 'expired'
  | 'discarded'

export const inventoryUnitStatusText: Record<InventoryUnitStatus, string> = {
  pending_location: '待设置位置',
  in_stock: '库存中',
  partially_used: '部分领用',
  used_up: '已用尽',
  expired: '已过期',
  discarded: '已报废'
}

export interface InventoryUnit {
  id: string
  qrCodeId: string
  qrCode: string
  orderId?: string
  orderItemId?: string
  inventoryItemId?: string
  itemName: string
  chineseName?: string
  englishName?: string
  brand?: string
  catalogNo?: string
  specification?: string
  batchNo?: string
  expiryDate?: string
  quantity: number
  remainingQuantity?: number
  unit: string
  locationId?: string
  locationText?: string
  status: InventoryUnitStatus
  inboundBy: string
  inboundByName: string
  inboundSignatureId?: string
  inboundAt: string
  lastOutboundAt?: string
  createdAt: string
  updatedAt: string
}

export interface StockOutRecord {
  id: string
  inventoryUnitId: string
  qrCode: string
  userId: string
  userName: string
  quantity: number
  unit: string
  purpose?: string
  project?: string
  beforeRemainingQuantity?: number
  afterRemainingQuantity?: number
  note?: string
  createdAt: string
}

export interface StorageLocation {
  id: string
  area: string
  temperature?: string
  equipment?: string
  shelf?: string
  box?: string
  detail?: string
  fullPath: string
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export type OperationAction =
  | 'qr_generated'
  | 'qr_printed'
  | 'qr_bound'
  | 'qr_voided'
  | 'inbound_created'
  | 'location_updated'
  | 'stock_out'
  | 'unit_discarded'
  | 'unit_unbound'
  | 'unit_rebound'

export const operationActionText: Record<OperationAction, string> = {
  qr_generated: '二维码生成',
  qr_printed: '二维码打印',
  qr_bound: '二维码绑定',
  qr_voided: '二维码作废',
  inbound_created: '入库记录',
  location_updated: '位置更新',
  stock_out: '扫码出库',
  unit_discarded: '物资报废',
  unit_unbound: '二维码解绑',
  unit_rebound: '二维码换绑'
}

export type OperationTargetType =
  | 'qr_code'
  | 'inventory_unit'
  | 'purchase_order'
  | 'purchase_order_item'
  | 'stock_out_record'
  | 'storage_location'

export interface OperationLog {
  id: string
  operatorId: string
  operatorName: string
  action: OperationAction
  targetType: OperationTargetType
  targetId: string
  detail?: string
  createdAt: string
}

export interface QrPrintBatchDetail extends QrPrintBatch {
  qrCodes: QrCode[]
  printedCount: number
  boundCount: number
  blankCount: number
  voidedCount: number
}

export interface InboundOrderSummary extends PurchaseOrder {
  totalQuantity: number
  receivedQuantity: number
  pendingLocationCount: number
}

export interface InboundOrderDetail extends InboundOrderSummary {
  items: Array<PurchaseOrderItem & { units: InventoryUnit[] }>
}
