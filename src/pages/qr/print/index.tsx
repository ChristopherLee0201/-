import { useState } from 'react'
import Taro from '@tarojs/taro'
import { Button, Text, View } from '@tarojs/components'
import { LabShell } from '@/components/LabShell'
import { createQrPrintBatch } from '@/services/qrService'
import './index.scss'

function Counter({
  value,
  onChange
}: {
  value: number
  onChange: (value: number) => void
}) {
  return (
    <View className="label-counter">
      <Button className="label-counter__step" onClick={() => onChange(Math.max(0, value - 1))}>
        -
      </Button>
      <Text className="label-counter__value">{value}</Text>
      <Button className="label-counter__step" onClick={() => onChange(value + 1)}>
        +
      </Button>
    </View>
  )
}

export default function QrPrintPage() {
  const [qrQuantity, setQrQuantity] = useState(0)
  const [barcodeQuantity, setBarcodeQuantity] = useState(0)

  const handlePrintQr = async () => {
    if (qrQuantity <= 0) {
      Taro.showToast({ title: '请先设置打印数量', icon: 'none' })
      return
    }

    try {
      const batch = await createQrPrintBatch({
        quantity: qrQuantity,
        labelSize: '30mm × 20mm',
        printNow: true
      })
      Taro.showToast({ title: '二维码批次已打印', icon: 'success' })
      Taro.navigateTo({ url: `/pages/qr/batch-detail/index?id=${batch.id}` })
    } catch (error) {
      Taro.showToast({ title: (error as Error).message, icon: 'none' })
    }
  }

  const handlePrintBarcode = () => {
    if (barcodeQuantity <= 0) {
      Taro.showToast({ title: '请先设置打印数量', icon: 'none' })
      return
    }

    Taro.showToast({ title: '条形码打印任务已发送', icon: 'success' })
  }

  return (
    <LabShell title="标签打印" showBack active="qr" contentClassName="label-print-page">
      <View className="printer-status">
        <Button className="printer-connect-button">
          <Text className="printer-connect-button__icon">⌁</Text>
          <Text>连接打印机</Text>
        </Button>
        <View className="printer-success">
          <Text className="printer-success__icon">✓</Text>
          <Text>链接成功</Text>
        </View>
      </View>

      <Text className="printer-name">打印机：DCS-10086</Text>

      <View className="label-section label-section--qr">
        <View className="label-section__icon label-section__icon--qr">
          {Array.from({ length: 25 }).map((_, index) => (
            <View
              key={index}
              className={`qr-pixel qr-pixel--${index}`}
            />
          ))}
        </View>
        <View className="label-section__content">
          <Text className="label-section__title">二维码打印</Text>
          <Text className="label-section__current">当前编号：ab437b94</Text>
        </View>
        <View className="label-print-row">
          <Text className="label-print-row__label">打印数量</Text>
          <Counter value={qrQuantity} onChange={setQrQuantity} />
          <Button className="label-print-row__button" onClick={handlePrintQr}>
            打印
          </Button>
        </View>
      </View>

      <View className="label-section">
        <View className="label-section__icon label-section__icon--barcode">
          {[0, 1, 2, 3, 4].map(index => (
            <View key={index} className={`barcode-line barcode-line--${index}`} />
          ))}
        </View>
        <View className="label-section__content">
          <Text className="label-section__title">抗体用条形码打印</Text>
          <Text className="label-section__current">当前编号：atb-00001</Text>
        </View>
        <View className="label-print-row">
          <Text className="label-print-row__label">打印数量</Text>
          <Counter value={barcodeQuantity} onChange={setBarcodeQuantity} />
          <Button className="label-print-row__button" onClick={handlePrintBarcode}>
            打印
          </Button>
        </View>
      </View>
    </LabShell>
  )
}
