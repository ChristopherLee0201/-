import { useState } from 'react'
import Taro, { useDidShow, useRouter } from '@tarojs/taro'
import { Button, Text, View } from '@tarojs/components'
import { ActionPill } from '@/components/ActionPill'
import { LabShell } from '@/components/LabShell'
import { StatusBadge, BadgeTone } from '@/components/StatusBadge'
import { InventoryUnit, OperationLog, StockOutRecord, inventoryUnitStatusText, operationActionText } from '@/types/models'
import { getInventoryUnitDetail } from '@/services/inventoryUnitService'
import { formatDateTime } from '@/utils/format'
import './index.scss'

function unitTone(status: InventoryUnit['status']): BadgeTone {
  if (status === 'in_stock') return 'green'
  if (status === 'pending_location') return 'yellow'
  if (status === 'discarded' || status === 'expired') return 'red'
  if (status === 'partially_used') return 'blue'
  return 'gray'
}

export default function InventoryUnitDetailPage() {
  const router = useRouter()
  const id = String(router.params.id || '')
  const [unit, setUnit] = useState<InventoryUnit | null>(null)
  const [logs, setLogs] = useState<OperationLog[]>([])
  const [records, setRecords] = useState<StockOutRecord[]>([])

  useDidShow(async () => {
    if (!id) return
    const detail = await getInventoryUnitDetail(id)
    setUnit(detail.unit)
    setLogs(detail.logs)
    setRecords(detail.stockOutRecords)
  })

  if (!unit) {
    return (
      <LabShell title="贴码物品详情" showBack active="outbound">
        <View className="lab-empty">正在读取贴码物品</View>
      </LabShell>
    )
  }

  return (
    <LabShell title="贴码物品详情" showBack active="outbound">
      <ActionPill icon="□" title="贴码物品" subtitle="unit detail" />

      <View className="page-title">{unit.itemName}</View>
      <View className="page-subtitle">二维码：{unit.qrCode}</View>

      <View className="lab-card unit-main-card">
        <View className="lab-card__head">
          <Text className="lab-card__title">当前状态</Text>
          <StatusBadge text={inventoryUnitStatusText[unit.status]} tone={unitTone(unit.status)} />
        </View>
        <View className="lab-card__body">
          <View className="lab-row">
            <Text className="lab-label">品牌</Text>
            <Text className="lab-value">{unit.brand || '-'}</Text>
          </View>
          <View className="lab-row">
            <Text className="lab-label">货号</Text>
            <Text className="lab-value">{unit.catalogNo || '-'}</Text>
          </View>
          <View className="lab-row">
            <Text className="lab-label">规格</Text>
            <Text className="lab-value">{unit.specification || '-'}</Text>
          </View>
          <View className="lab-row">
            <Text className="lab-label">批号</Text>
            <Text className="lab-value">{unit.batchNo || '-'}</Text>
          </View>
          <View className="lab-row">
            <Text className="lab-label">有效期</Text>
            <Text className="lab-value">{unit.expiryDate || '-'}</Text>
          </View>
          <View className="lab-row">
            <Text className="lab-label">当前位置</Text>
            <Text className="lab-value">{unit.locationText || '未设置'}</Text>
          </View>
          <View className="lab-row">
            <Text className="lab-label">当前剩余</Text>
            <Text className="lab-value">{unit.remainingQuantity ?? unit.quantity}{unit.unit}</Text>
          </View>
        </View>
      </View>

      <View className="lab-card">
        <View className="lab-card__head">
          <Text className="lab-card__title">入库信息</Text>
        </View>
        <View className="lab-card__body">
          <View className="lab-row">
            <Text className="lab-label">入库员</Text>
            <Text className="lab-value">{unit.inboundByName}</Text>
          </View>
          <View className="lab-row">
            <Text className="lab-label">入库时间</Text>
            <Text className="lab-value">{formatDateTime(unit.inboundAt)}</Text>
          </View>
          <View className="lab-row">
            <Text className="lab-label">签名</Text>
            <Text className="lab-value">{unit.inboundSignatureId || '基础签名'}</Text>
          </View>
        </View>
      </View>

      <View className="unit-actions">
        <Button
          className="lab-button lab-button--primary"
          onClick={() => Taro.navigateTo({ url: `/pages/outbound/submit/index?inventoryUnitId=${unit.id}` })}
        >
          扫码出库
        </Button>
        <Button
          className="lab-button lab-button--ghost"
          onClick={() => Taro.navigateTo({ url: `/pages/inbound/location/index?inventoryUnitId=${unit.id}` })}
        >
          修改位置
        </Button>
        <Button className="lab-button" onClick={() => Taro.showToast({ title: '管理员纠错功能已预留', icon: 'none' })}>
          查看操作日志
        </Button>
      </View>

      <View className="unit-section-title">最近出库记录</View>
      {records.length ? (
        records.map(record => (
          <View className="unit-record" key={record.id}>
            <Text>{record.userName}，{formatDateTime(record.createdAt)}</Text>
            <Text>领用 {record.quantity}{record.unit}，用于{record.purpose || '-'}</Text>
          </View>
        ))
      ) : (
        <View className="lab-empty">暂无出库记录</View>
      )}

      <View className="unit-section-title">操作日志</View>
      {logs.slice(0, 5).map(log => (
        <View className="unit-log" key={log.id}>
          <Text className="unit-log__action">{operationActionText[log.action]}</Text>
          <Text className="unit-log__detail">{log.detail || '-'}</Text>
          <Text className="unit-log__time">{formatDateTime(log.createdAt)}</Text>
        </View>
      ))}
    </LabShell>
  )
}
