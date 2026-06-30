import { useState } from 'react'
import Taro, { useDidShow, useRouter } from '@tarojs/taro'
import { Button, Text, View } from '@tarojs/components'
import { ActionPill } from '@/components/ActionPill'
import { LabShell } from '@/components/LabShell'
import { ProgressBar } from '@/components/ProgressBar'
import { StatusBadge, BadgeTone } from '@/components/StatusBadge'
import { QrCodeStatus, QrPrintBatchDetail, qrCodeStatusText, qrPrintBatchStatusText } from '@/types/models'
import { formatDateTime } from '@/utils/format'
import { generateQrCodeValue } from '@/utils/qr'
import { getQrPrintBatchDetail, markQrBatchPrinted } from '@/services/qrService'
import './index.scss'

function qrTone(status: QrCodeStatus): BadgeTone {
  if (status === 'printed' || status === 'generated') return 'yellow'
  if (status === 'bound') return 'blue'
  if (status === 'in_stock') return 'green'
  if (status === 'voided' || status === 'discarded') return 'red'
  return 'gray'
}

export default function QrBatchDetailPage() {
  const router = useRouter()
  const [detail, setDetail] = useState<QrPrintBatchDetail | null>(null)

  const load = async () => {
    const id = String(router.params.id || '')
    if (!id) return
    setDetail(await getQrPrintBatchDetail(id))
  }

  useDidShow(load)

  const handlePrinted = async () => {
    if (!detail) return
    try {
      setDetail(await markQrBatchPrinted(detail.id))
      Taro.showToast({ title: '已标记打印', icon: 'success' })
    } catch (error) {
      Taro.showToast({ title: (error as Error).message, icon: 'none' })
    }
  }

  if (!detail) {
    return (
      <LabShell title="二维码批次" showBack active="qr">
        <View className="lab-empty">正在读取批次</View>
      </LabShell>
    )
  }

  return (
    <LabShell title="二维码批次" showBack active="qr">
      <ActionPill icon="□" title="批次详情" subtitle="label batch" />

      <View className="page-title">{detail.batchNo}</View>
      <View className="page-subtitle">每个二维码都是空白唯一标签，只允许绑定一次。</View>

      <View className="lab-card batch-summary">
        <View className="lab-card__head">
          <Text className="lab-card__title">批次状态</Text>
          <StatusBadge text={qrPrintBatchStatusText[detail.status]} tone={detail.status === 'printed' ? 'green' : 'yellow'} />
        </View>
        <View className="lab-card__body">
          <View className="lab-grid">
            <View className="metric-card">
              <Text className="metric-card__value">{detail.quantity}</Text>
              <Text className="metric-card__label">总数量</Text>
            </View>
            <View className="metric-card">
              <Text className="metric-card__value">{detail.blankCount}</Text>
              <Text className="metric-card__label">剩余空白</Text>
            </View>
            <View className="metric-card">
              <Text className="metric-card__value">{detail.boundCount}</Text>
              <Text className="metric-card__label">已绑定</Text>
            </View>
            <View className="metric-card">
              <Text className="metric-card__value">{detail.voidedCount}</Text>
              <Text className="metric-card__label">已作废</Text>
            </View>
          </View>
          <View className="batch-progress">
            <ProgressBar current={detail.boundCount} total={detail.quantity} />
          </View>
          <View className="lab-row">
            <Text className="lab-label">创建人</Text>
            <Text className="lab-value">{detail.createdByName}</Text>
          </View>
          <View className="lab-row">
            <Text className="lab-label">打印时间</Text>
            <Text className="lab-value">{formatDateTime(detail.printedAt)}</Text>
          </View>
          <View className="lab-button-row">
            <Button className="lab-button lab-button--primary" onClick={handlePrinted}>
              标记已打印
            </Button>
            <Button className="lab-button lab-button--ghost" onClick={() => Taro.navigateTo({ url: '/pages/inbound/orders/index' })}>
              去扫码入库
            </Button>
          </View>
        </View>
      </View>

      <View className="batch-code-list">
        {detail.qrCodes.map(qr => (
          <View className="batch-code" key={qr.id}>
            <View className="batch-code__meta">
              <Text className="batch-code__code">{qr.code}</Text>
              <Text className="batch-code__value">{generateQrCodeValue(qr.code)}</Text>
            </View>
            <StatusBadge text={qrCodeStatusText[qr.status]} tone={qrTone(qr.status)} />
          </View>
        ))}
      </View>
    </LabShell>
  )
}
