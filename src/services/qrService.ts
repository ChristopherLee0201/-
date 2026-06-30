import {
  QrCode,
  QrPrintBatch,
  QrPrintBatchDetail,
  qrCodeStatusText
} from '@/types/models'
import { makeId, todayCodePart } from '@/utils/format'
import { canGenerateQrCode, canPrintQrCode, canVoidQrCode } from '@/utils/permission'
import { addOperationLog, getCurrentUser, readDb, withDb } from './mockDb'

function randomQrCode(existingCodes: Set<string>): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  const today = todayCodePart()

  for (let attempt = 0; attempt < 100; attempt += 1) {
    const random = Array.from({ length: 8 }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join('')
    const code = `QRC_${today}_${random}`
    if (!existingCodes.has(code)) return code
  }

  throw new Error('二维码编码生成失败，请重试')
}

function enrichBatch(batch: QrPrintBatch, qrCodes: QrCode[]): QrPrintBatchDetail {
  const batchCodes = qrCodes.filter(item => item.batchId === batch.id)
  const printedCount = batchCodes.filter(item => item.status !== 'generated').length
  const boundCount = batchCodes.filter(item =>
    ['bound', 'in_stock', 'out_used', 'discarded'].includes(item.status)
  ).length
  const blankCount = batchCodes.filter(item => ['generated', 'printed'].includes(item.status)).length
  const voidedCount = batchCodes.filter(item => item.status === 'voided').length

  return {
    ...batch,
    qrCodes: batchCodes,
    printedCount,
    boundCount,
    blankCount,
    voidedCount
  }
}

export async function createQrPrintBatch(params: {
  quantity: number
  labelSize?: string
  printNow?: boolean
}): Promise<QrPrintBatchDetail> {
  return withDb(db => {
    const operator = getCurrentUser(db)
    if (!canGenerateQrCode(operator)) throw new Error('当前用户无权生成二维码')
    if (!Number.isFinite(params.quantity) || params.quantity <= 0) throw new Error('生成数量必须大于 0')
    if (params.quantity > 500) throw new Error('单次最多生成 500 个二维码')

    const now = new Date().toISOString()
    const batchIndex = db.qrPrintBatches.length + 1
    const batch: QrPrintBatch = {
      id: makeId('batch'),
      batchNo: `QRB${todayCodePart()}-${String(batchIndex).padStart(3, '0')}`,
      quantity: params.quantity,
      status: params.printNow ? 'printed' : 'created',
      labelSize: params.labelSize || '30mm × 20mm',
      printerName: params.printNow ? 'MVP 标签 PDF' : undefined,
      createdBy: operator.id,
      createdByName: operator.name,
      createdAt: now,
      printedAt: params.printNow ? now : undefined
    }

    const existingCodes = new Set(db.qrCodes.map(item => item.code))
    const codes: QrCode[] = Array.from({ length: params.quantity }, () => {
      const code = randomQrCode(existingCodes)
      existingCodes.add(code)
      return {
        id: makeId('qr'),
        code,
        status: params.printNow ? 'printed' : 'generated',
        batchId: batch.id,
        printedAt: params.printNow ? now : undefined,
        printedBy: params.printNow ? operator.id : undefined,
        createdAt: now,
        updatedAt: now
      }
    })

    db.qrPrintBatches.unshift(batch)
    db.qrCodes.unshift(...codes)

    addOperationLog(db, {
      operatorId: operator.id,
      operatorName: operator.name,
      action: 'qr_generated',
      targetType: 'qr_code',
      targetId: batch.id,
      detail: `生成空白二维码 ${params.quantity} 个`
    })

    if (params.printNow) {
      addOperationLog(db, {
        operatorId: operator.id,
        operatorName: operator.name,
        action: 'qr_printed',
        targetType: 'qr_code',
        targetId: batch.id,
        detail: `批次 ${batch.batchNo} 已标记打印`
      })
    }

    return enrichBatch(batch, db.qrCodes)
  })
}

export async function getQrPrintBatches(): Promise<QrPrintBatchDetail[]> {
  const db = readDb()
  return db.qrPrintBatches.map(batch => enrichBatch(batch, db.qrCodes))
}

export async function getQrPrintBatchDetail(batchId: string): Promise<QrPrintBatchDetail> {
  const db = readDb()
  const batch = db.qrPrintBatches.find(item => item.id === batchId)
  if (!batch) throw new Error('二维码批次不存在')
  return enrichBatch(batch, db.qrCodes)
}

export async function markQrBatchPrinted(batchId: string): Promise<QrPrintBatchDetail> {
  return withDb(db => {
    const operator = getCurrentUser(db)
    if (!canPrintQrCode(operator)) throw new Error('当前用户无权打印二维码')

    const batch = db.qrPrintBatches.find(item => item.id === batchId)
    if (!batch) throw new Error('二维码批次不存在')

    const now = new Date().toISOString()
    batch.status = 'printed'
    batch.printedAt = now

    db.qrCodes.forEach(item => {
      if (item.batchId === batchId && item.status === 'generated') {
        item.status = 'printed'
        item.printedAt = now
        item.printedBy = operator.id
        item.updatedAt = now
      }
    })

    addOperationLog(db, {
      operatorId: operator.id,
      operatorName: operator.name,
      action: 'qr_printed',
      targetType: 'qr_code',
      targetId: batch.id,
      detail: `批次 ${batch.batchNo} 已标记打印`
    })

    return enrichBatch(batch, db.qrCodes)
  })
}

export async function voidQrCode(code: string): Promise<QrCode> {
  return withDb(db => {
    const operator = getCurrentUser(db)
    if (!canVoidQrCode(operator)) throw new Error('当前用户无权作废二维码')

    const qr = db.qrCodes.find(item => item.code === code)
    if (!qr) throw new Error('二维码不存在')
    if (!['generated', 'printed'].includes(qr.status)) {
      throw new Error(`该二维码当前为“${qrCodeStatusText[qr.status]}”，不能作废`)
    }

    qr.status = 'voided'
    qr.updatedAt = new Date().toISOString()

    addOperationLog(db, {
      operatorId: operator.id,
      operatorName: operator.name,
      action: 'qr_voided',
      targetType: 'qr_code',
      targetId: qr.id,
      detail: `二维码 ${qr.code} 已作废`
    })

    return qr
  })
}

export async function getQrCode(code: string): Promise<QrCode | undefined> {
  return readDb().qrCodes.find(item => item.code === code)
}

export async function getAvailableQrCodes(limit = 5): Promise<QrCode[]> {
  return readDb()
    .qrCodes.filter(item => ['generated', 'printed'].includes(item.status))
    .slice(0, limit)
}
