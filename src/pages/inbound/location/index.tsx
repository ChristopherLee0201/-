import { useState } from 'react'
import Taro, { useDidShow, useRouter } from '@tarojs/taro'
import { Button, Input, Text, View } from '@tarojs/components'
import { ActionPill } from '@/components/ActionPill'
import { LabShell } from '@/components/LabShell'
import { StatusBadge } from '@/components/StatusBadge'
import { InventoryUnit, StorageLocation } from '@/types/models'
import { batchUpdateLocation, createStorageLocation, getStorageLocations, updateInventoryUnitLocation } from '@/services/locationService'
import { getInventoryUnitDetail, getInventoryUnitsByOrder } from '@/services/inventoryUnitService'
import { buildLocationFullPath } from '@/utils/location'
import './index.scss'

export default function InboundLocationPage() {
  const router = useRouter()
  const inventoryUnitId = String(router.params.inventoryUnitId || '')
  const orderId = String(router.params.orderId || '')
  const orderItemId = String(router.params.orderItemId || '')
  const [locations, setLocations] = useState<StorageLocation[]>([])
  const [targets, setTargets] = useState<InventoryUnit[]>([])
  const [selectedLocationId, setSelectedLocationId] = useState('')
  const [form, setForm] = useState({
    area: '',
    temperature: '',
    equipment: '',
    shelf: '',
    box: '',
    detail: ''
  })

  const load = async () => {
    const nextLocations = await getStorageLocations()
    setLocations(nextLocations)
    if (!selectedLocationId && nextLocations[0]) setSelectedLocationId(nextLocations[0].id)

    if (inventoryUnitId) {
      const detail = await getInventoryUnitDetail(inventoryUnitId)
      setTargets([detail.unit])
      return
    }

    if (orderId) {
      setTargets(await getInventoryUnitsByOrder({ orderId, orderItemId: orderItemId || undefined, onlyPendingLocation: true }))
    }
  }

  useDidShow(load)

  const customPath = buildLocationFullPath(form)
  const selectedLocation = locations.find(item => item.id === selectedLocationId)

  const handleConfirm = async () => {
    if (!targets.length) {
      Taro.showToast({ title: '没有需要设置位置的物资', icon: 'none' })
      return
    }

    try {
      let locationId = selectedLocationId
      if (form.area.trim()) {
        const location = await createStorageLocation(form)
        locationId = location.id
      }

      if (inventoryUnitId) {
        await updateInventoryUnitLocation({ inventoryUnitId, locationId })
      } else {
        await batchUpdateLocation({
          orderId,
          orderItemId: orderItemId || undefined,
          inventoryUnitIds: targets.map(item => item.id),
          locationId
        })
      }

      Taro.showToast({ title: '位置已更新', icon: 'success' })
      Taro.navigateBack()
    } catch (error) {
      Taro.showToast({ title: (error as Error).message, icon: 'none' })
    }
  }

  return (
    <LabShell title="设置位置" showBack active="inbound">
      <ActionPill icon="⌖" title="位置管理" subtitle="storage place" />

      <View className="page-title">{inventoryUnitId ? '设置单个位置' : '批量设置位置'}</View>
      <View className="page-subtitle">pending_location 状态下不允许正常出库，设置位置后转为库存中。</View>

      <View className="lab-card location-impact-card">
        <View className="lab-card__head">
          <Text className="lab-card__title">影响范围</Text>
          <StatusBadge text={`${targets.length} 个物资`} tone="blue" />
        </View>
        <View className="lab-card__body">
          {targets.length ? (
            targets.slice(0, 4).map(unit => (
              <View className="location-target" key={unit.id}>
                <Text className="location-target__name">{unit.itemName}</Text>
                <Text className="location-target__code">{unit.qrCode}</Text>
              </View>
            ))
          ) : (
            <View className="lab-empty">当前范围没有待设置位置的物资</View>
          )}
        </View>
      </View>

      <View className="lab-card">
        <View className="lab-card__head">
          <Text className="lab-card__title">选择已有位置</Text>
          <StatusBadge text="结构化位置" tone="yellow" />
        </View>
        <View className="lab-card__body">
          {locations.map(location => (
            <Button
              key={location.id}
              className={`location-option ${selectedLocationId === location.id ? 'location-option--active' : ''}`}
              onClick={() => setSelectedLocationId(location.id)}
            >
              {location.fullPath}
            </Button>
          ))}
        </View>
      </View>

      <View className="lab-card">
        <View className="lab-card__head">
          <Text className="lab-card__title">新建位置</Text>
          <Text className="location-card-subtitle">填写区域后会优先生效</Text>
        </View>
        <View className="lab-card__body">
          {(['area', 'temperature', 'equipment', 'shelf', 'box', 'detail'] as const).map(key => (
            <View className="lab-field" key={key}>
              <Text className="lab-field__label">
                {{
                  area: '区域',
                  temperature: '温度',
                  equipment: '设备',
                  shelf: '层数',
                  box: '盒号',
                  detail: '补充说明'
                }[key]}
              </Text>
              <Input
                className="lab-input"
                value={form[key]}
                onInput={event => setForm(prev => ({ ...prev, [key]: String(event.detail.value) }))}
              />
            </View>
          ))}
          <View className="location-preview">
            <Text>将设置为：</Text>
            <Text>{customPath || selectedLocation?.fullPath || '-'}</Text>
          </View>
        </View>
      </View>

      <View className="lab-button-row">
        <Button className="lab-button lab-button--primary location-submit" onClick={handleConfirm}>
          确认设置位置
        </Button>
      </View>
    </LabShell>
  )
}
