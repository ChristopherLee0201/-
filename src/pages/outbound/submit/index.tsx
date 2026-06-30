import { useState } from 'react'
import Taro, { useDidShow, useRouter } from '@tarojs/taro'
import { Button, Input, Text, View } from '@tarojs/components'
import { ActionPill } from '@/components/ActionPill'
import { LabShell } from '@/components/LabShell'
import { StatusBadge } from '@/components/StatusBadge'
import { InventoryUnit, inventoryUnitStatusText } from '@/types/models'
import { getInventoryUnitDetail } from '@/services/inventoryUnitService'
import { submitStockOut } from '@/services/outboundService'
import './index.scss'

export default function OutboundSubmitPage() {
  const router = useRouter()
  const inventoryUnitId = String(router.params.inventoryUnitId || '')
  const [unit, setUnit] = useState<InventoryUnit | null>(null)
  const [quantity, setQuantity] = useState('1')
  const [purpose, setPurpose] = useState('细胞培养')
  const [project, setProject] = useState('')
  const [note, setNote] = useState('')

  useDidShow(async () => {
    if (!inventoryUnitId) return
    const detail = await getInventoryUnitDetail(inventoryUnitId)
    setUnit(detail.unit)
    setQuantity(String(detail.unit.remainingQuantity ?? detail.unit.quantity))
  })

  const handleSubmit = async () => {
    if (!unit) return
    try {
      await submitStockOut({
        inventoryUnitId: unit.id,
        quantity: Number(quantity),
        purpose,
        project,
        note
      })
      Taro.showToast({ title: '出库已记录', icon: 'success' })
      Taro.navigateTo({ url: `/pages/inventory/unit-detail/index?id=${unit.id}` })
    } catch (error) {
      Taro.showToast({ title: (error as Error).message, icon: 'none' })
    }
  }

  if (!unit) {
    return (
      <LabShell title="出库提交" showBack active="outbound">
        <View className="lab-empty">正在读取库存单元</View>
      </LabShell>
    )
  }

  return (
    <LabShell title="出库提交" showBack active="outbound">
      <ActionPill icon="−" title="领用登记" subtitle="submit stock out" />

      <View className="page-title">{unit.itemName}</View>
      <View className="page-subtitle">二维码 {unit.qrCode}</View>

      <View className="lab-card outbound-unit-card">
        <View className="lab-card__head">
          <Text className="lab-card__title">物资信息</Text>
          <StatusBadge text={inventoryUnitStatusText[unit.status]} tone="green" />
        </View>
        <View className="lab-card__body">
          <View className="lab-row">
            <Text className="lab-label">品牌/货号</Text>
            <Text className="lab-value">{unit.brand || '-'} / {unit.catalogNo || '-'}</Text>
          </View>
          <View className="lab-row">
            <Text className="lab-label">规格</Text>
            <Text className="lab-value">{unit.specification || '-'}</Text>
          </View>
          <View className="lab-row">
            <Text className="lab-label">当前位置</Text>
            <Text className="lab-value">{unit.locationText || '-'}</Text>
          </View>
          <View className="lab-row">
            <Text className="lab-label">当前剩余</Text>
            <Text className="lab-value">{unit.remainingQuantity ?? unit.quantity}{unit.unit}</Text>
          </View>
        </View>
      </View>

      <View className="lab-card">
        <View className="lab-card__head">
          <Text className="lab-card__title">出库信息</Text>
          <Text className="outbound-form-hint">自动记录领用人和时间</Text>
        </View>
        <View className="lab-card__body">
          <View className="lab-field">
            <Text className="lab-field__label">领用数量</Text>
            <Input className="lab-input" type="digit" value={quantity} onInput={event => setQuantity(String(event.detail.value))} />
          </View>
          <View className="lab-field">
            <Text className="lab-field__label">用途</Text>
            <Input className="lab-input" value={purpose} onInput={event => setPurpose(String(event.detail.value))} />
          </View>
          <View className="lab-field">
            <Text className="lab-field__label">所属项目</Text>
            <Input className="lab-input" value={project} onInput={event => setProject(String(event.detail.value))} />
          </View>
          <View className="lab-field">
            <Text className="lab-field__label">备注</Text>
            <Input className="lab-input" value={note} onInput={event => setNote(String(event.detail.value))} />
          </View>
        </View>
      </View>

      <View className="lab-button-row">
        <Button className="lab-button lab-button--primary outbound-submit-button" onClick={handleSubmit}>
          提交出库
        </Button>
      </View>
    </LabShell>
  )
}
