import { useState } from 'react'
import Taro from '@tarojs/taro'
import { Button, Input, Text, View } from '@tarojs/components'
import { ActionPill } from '@/components/ActionPill'
import { LabShell } from '@/components/LabShell'
import { StatusBadge } from '@/components/StatusBadge'
import { inventoryUnitStatusText } from '@/types/models'
import { getInventoryUnitByQrCode } from '@/services/outboundService'
import { parseQrCode } from '@/utils/qr'
import './index.scss'

const sampleCodes = [
  'labqr://v1/QRC_20260629_A8K39D2P',
  'labqr://v1/QRC_20260629_K9L3W8BZ'
]

export default function OutboundScanPage() {
  const [rawCode, setRawCode] = useState('')

  const handleCameraScan = async () => {
    try {
      const result = await Taro.scanCode({
        onlyFromCamera: true,
        scanType: ['qrCode']
      })
      setRawCode(result.result)
    } catch (error) {
      Taro.showToast({ title: '当前环境无法调用扫码，可使用模拟码', icon: 'none' })
    }
  }

  const handleScan = async () => {
    const qrCode = parseQrCode(rawCode.trim())
    if (!qrCode) {
      Taro.showToast({ title: '二维码格式不正确', icon: 'none' })
      return
    }

    try {
      const unit = await getInventoryUnitByQrCode(qrCode)
      if (unit.status === 'pending_location') {
        const result = await Taro.showModal({
          title: '需先设置位置',
          content: '该物资仍为待设置位置状态，不能出库。',
          confirmText: '设置位置',
          cancelText: '取消'
        })
        if (result.confirm) {
          Taro.navigateTo({ url: `/pages/inbound/location/index?inventoryUnitId=${unit.id}` })
        }
        return
      }

      if (!['in_stock', 'partially_used'].includes(unit.status)) {
        Taro.showToast({ title: '当前物资不可出库', icon: 'none' })
        return
      }

      Taro.navigateTo({ url: `/pages/outbound/submit/index?inventoryUnitId=${unit.id}` })
    } catch (error) {
      Taro.showToast({ title: (error as Error).message, icon: 'none' })
    }
  }

  return (
    <LabShell title="扫码出库" showBack active="outbound">
      <ActionPill icon="◎" title="扫码出库" subtitle="stock out" />

      <View className="page-title">扫码出库</View>
      <View className="page-subtitle">只允许库存中或部分领用的物资出库，待设置位置的物资会被拦截。</View>

      <View className="lab-card outbound-scan-card">
        <View className="lab-card__head">
          <Text className="lab-card__title">二维码</Text>
          <StatusBadge text={inventoryUnitStatusText.in_stock} tone="green" />
        </View>
        <View className="lab-card__body">
          <View className="lab-field">
            <Text className="lab-field__label">扫码结果或模拟码</Text>
            <Input
              className="lab-input outbound-input"
              value={rawCode}
              placeholder="labqr://v1/QRC_..."
              onInput={event => setRawCode(String(event.detail.value))}
            />
          </View>
          <View className="outbound-samples">
            {sampleCodes.map(code => (
              <Button className="outbound-sample" key={code} onClick={() => setRawCode(code)}>
                {code.replace('labqr://v1/', '')}
              </Button>
            ))}
          </View>
          <View className="lab-button-row">
            <Button className="lab-button lab-button--ghost" onClick={handleCameraScan}>
              打开相机扫码
            </Button>
            <Button className="lab-button lab-button--primary" onClick={handleScan}>
              查询物资
            </Button>
          </View>
        </View>
      </View>
    </LabShell>
  )
}
