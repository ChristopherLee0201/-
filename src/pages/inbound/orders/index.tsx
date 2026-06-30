import { useState } from 'react'
import Taro, { useDidShow } from '@tarojs/taro'
import { Button, Text, View } from '@tarojs/components'
import { ActionPill } from '@/components/ActionPill'
import { LabShell } from '@/components/LabShell'
import { ProgressBar } from '@/components/ProgressBar'
import { StatusBadge, BadgeTone } from '@/components/StatusBadge'
import { InboundOrderSummary, purchaseOrderStatusText } from '@/types/models'
import { formatDate } from '@/utils/format'
import { getInboundOrders } from '@/services/inboundService'
import './index.scss'

function orderTone(status: InboundOrderSummary['status']): BadgeTone {
  if (status === 'received' || status === 'stocked') return 'green'
  if (status === 'partially_received') return 'blue'
  if (status === 'cancelled') return 'red'
  return 'yellow'
}

export default function InboundOrdersPage() {
  const [orders, setOrders] = useState<InboundOrderSummary[]>([])

  useDidShow(async () => {
    setOrders(await getInboundOrders())
  })

  return (
    <LabShell title="入库" showBack active="inbound">
      <ActionPill icon="⌕" title="扫码入库" subtitle="scan inbound" />

      <View className="page-title">待入库订单</View>
      <View className="page-subtitle">从订单明细进入扫码，二维码会绑定到具体物理库存单元。</View>

      <View className="inbound-order-list">
        {orders.map(order => (
          <View className="lab-card" key={order.id}>
            <View className="lab-card__head">
              <Text className="lab-card__title">{order.orderNo}</Text>
              <StatusBadge text={purchaseOrderStatusText[order.status]} tone={orderTone(order.status)} />
            </View>
            <View className="lab-card__body">
              <View className="lab-row">
                <Text className="lab-label">供应商</Text>
                <Text className="lab-value">{order.supplier || '-'}</Text>
              </View>
              <View className="lab-row">
                <Text className="lab-label">创建时间</Text>
                <Text className="lab-value">{formatDate(order.createdAt)}</Text>
              </View>
              <View className="inbound-progress">
                <ProgressBar current={order.receivedQuantity} total={order.totalQuantity} />
              </View>
              {order.pendingLocationCount > 0 && (
                <View className="inbound-warning">
                  <Text>还有 {order.pendingLocationCount} 个物资待设置位置</Text>
                </View>
              )}
              <View className="lab-button-row">
                <Button
                  className="lab-button lab-button--primary"
                  onClick={() => Taro.navigateTo({ url: `/pages/inbound/order-detail/index?orderId=${order.id}` })}
                >
                  进入订单
                </Button>
                <Button
                  className="lab-button lab-button--ghost"
                  onClick={() => Taro.navigateTo({ url: `/pages/inbound/location/index?orderId=${order.id}` })}
                >
                  批量设置位置
                </Button>
              </View>
            </View>
          </View>
        ))}
      </View>
    </LabShell>
  )
}
