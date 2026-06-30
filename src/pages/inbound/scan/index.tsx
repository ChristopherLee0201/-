import { useState } from 'react'
import Taro, { useDidShow, useRouter } from '@tarojs/taro'
import { Button, Input, Text, View } from '@tarojs/components'
import { ActionPill } from '@/components/ActionPill'
import { LabShell } from '@/components/LabShell'
import { StatusBadge } from '@/components/StatusBadge'
import { InboundOrderDetail, QrCode } from '@/types/models'
import { bindQrCodeToOrderItem, getInboundOrderDetail } from '@/services/inboundService'
import { getAvailableQrCodes } from '@/services/qrService'
import { parseQrCode } from '@/utils/qr'
import './index.scss'

export default function InboundScanPage() {
  const router = useRouter()
  const orderId = String(router.params.orderId || '')
  const orderItemId = String(router.params.orderItemId || '')
  const [detail, setDetail] = useState<InboundOrderDetail | null>(null)
  const [availableCodes, setAvailableCodes] = useState<QrCode[]>([])
  const [rawCode, setRawCode] = useState('')

  const item = detail?.items.find(entry => entry.id === orderItemId)

  const load = async () => {
    if (orderId) setDetail(await getInboundOrderDetail(orderId))
    setAvailableCodes(await getAvailableQrCodes(3))
  }

  useDidShow(load)

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

  const handleBind = async () => {
    const qrCode = parseQrCode(rawCode.trim())
    if (!qrCode) {
      Taro.showToast({ title: '二维码格式不正确', icon: 'none' })
      return
    }

    try {
      const unit = await bindQrCodeToOrderItem({ qrCode, orderId, orderItemId })
      await load()
      const result = await Taro.showModal({
        title: '入库成功',
        content: '是否立即为该物资设置存放位置？',
        confirmText: '设置位置',
        cancelText: '稍后'
      })
      if (result.confirm) {
        Taro.navigateTo({ url: `/pages/inbound/location/index?inventoryUnitId=${unit.id}` })
      } else {
        Taro.navigateBack()
      }
    } catch (error) {
      Taro.showToast({ title: (error as Error).message, icon: 'none' })
    }
  }

  return (
    <LabShell title="扫码绑定入库" showBack active="inbound">
      <ActionPill icon="⌗" title="扫码绑定" subtitle="bind qr code" />

      <View className="page-title">扫码入库</View>
      <View className="page-subtitle">当前扫码结果只会绑定到下方订单明细，避免扫完后选错物品。</View>

      <View className="lab-card scan-target-card">
        <View className="lab-card__head">
          <Text className="lab-card__title">{item?.itemName || '订单明细'}</Text>
          <StatusBadge text={`${item?.receivedQuantity || 0} / ${item?.orderedQuantity || 0}`} tone="blue" />
        </View>
        <View className="lab-card__body">
          <View className="lab-row">
            <Text className="lab-label">订单</Text>
            <Text className="lab-value">{detail?.orderNo || '-'}</Text>
          </View>
          <View className="lab-row">
            <Text className="lab-label">规格</Text>
            <Text className="lab-value">{item?.specification || '-'}</Text>
          </View>
          <View className="lab-row">
            <Text className="lab-label">批号</Text>
            <Text className="lab-value">{item?.batchNo || '-'}</Text>
          </View>
        </View>
      </View>

      <View className="lab-card">
        <View className="lab-card__head">
          <Text className="lab-card__title">二维码</Text>
          <StatusBadge text="仅空白码可绑定" tone="yellow" />
        </View>
        <View className="lab-card__body">
          <View className="lab-field">
            <Text className="lab-field__label">扫码结果或模拟码</Text>
            <Input
              className="lab-input scan-input"
              value={rawCode}
              placeholder="labqr://v1/QRC_..."
              onInput={event => setRawCode(String(event.detail.value))}
            />
          </View>
          {availableCodes.length > 0 && (
            <View className="scan-sample-list">
              {availableCodes.map(code => (
                <Button
                  key={code.id}
                  className="scan-sample"
                  onClick={() => setRawCode(`labqr://v1/${code.code}`)}
                >
                  {code.code}
                </Button>
              ))}
            </View>
          )}
          <View className="lab-button-row">
            <Button className="lab-button lab-button--ghost" onClick={handleCameraScan}>
              打开相机扫码
            </Button>
            <Button className="lab-button lab-button--primary" onClick={handleBind}>
              确认绑定入库
            </Button>
          </View>
        </View>
      </View>
    </LabShell>
  )
}
