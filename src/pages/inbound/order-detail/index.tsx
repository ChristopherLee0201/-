import { useState } from 'react'
import Taro, { useDidShow, useRouter } from '@tarojs/taro'
import { Button, Text, View } from '@tarojs/components'
import { LabShell } from '@/components/LabShell'
import { ProgressBar } from '@/components/ProgressBar'
import { InboundOrderDetail } from '@/types/models'
import { completeInboundOrder, getInboundOrderDetail } from '@/services/inboundService'
import './index.scss'

const timelinePeople = ['张福建', '李相君', '武岳-乐乐', '']

export default function InboundOrderDetailPage() {
  const router = useRouter()
  const orderId = String(router.params.orderId || '')
  const [detail, setDetail] = useState<InboundOrderDetail | null>(null)

  const load = async () => {
    if (!orderId) return
    setDetail(await getInboundOrderDetail(orderId))
  }

  useDidShow(load)

  const handleComplete = async () => {
    if (!detail) return
    try {
      await completeInboundOrder(detail.id)
      await load()
      Taro.showToast({ title: '订单已完成入库', icon: 'success' })
    } catch (error) {
      Taro.showToast({ title: (error as Error).message, icon: 'none' })
    }
  }

  if (!detail) {
    return (
      <LabShell title="订购审批" showBack active="inbound">
        <View className="lab-empty">正在读取订单</View>
      </LabShell>
    )
  }

  const timeline = [
    {
      title: '订单发起',
      date: '2026-06-23',
      person: timelinePeople[0],
      status: 'done',
      children: detail.items.map(item => ({
        name: item.itemName,
        spec: item.specification || '-',
        quantity: `×${item.orderedQuantity}`
      }))
    },
    {
      title: '采购员确认',
      date: '',
      person: timelinePeople[1],
      status: 'done',
      meta: '批次：2026-06-27-001'
    },
    {
      title: '商家确认',
      date: '',
      person: timelinePeople[2],
      status: 'done'
    },
    {
      title: '等待入库',
      date: '',
      person: '',
      status: detail.receivedQuantity >= detail.totalQuantity ? 'done' : 'waiting'
    }
  ]

  return (
    <LabShell title="订购审批" showBack active="inbound" contentClassName="approval-page">
      <View className="approval-timeline">
        {timeline.map((step, index) => (
          <View className="approval-step" key={step.title}>
            <View className="approval-step__rail">
              <View className={`approval-step__dot approval-step__dot--${step.status}`}>
                <Text>{step.status === 'waiting' ? '⌛' : '✓'}</Text>
              </View>
              {index < timeline.length - 1 && <View className="approval-step__line" />}
            </View>

            <View className="approval-step__content">
              <View className="approval-step__head">
                <Text className="approval-step__title">{step.title}</Text>
                {step.date && <Text className="approval-step__date">{step.date}</Text>}
              </View>
              <View className="approval-step__divider" />
              {step.person && <Text className="approval-step__person">{step.person}</Text>}
              {step.meta && <Text className="approval-step__meta">{step.meta}</Text>}
              {step.children && (
                <View className="approval-order-lines">
                  {step.children.map(item => (
                    <View className="approval-order-line" key={`${item.name}-${item.spec}`}>
                      <Text className="approval-order-line__name">· {item.name}</Text>
                      <Text className="approval-order-line__spec">{item.spec}</Text>
                      <Text className="approval-order-line__qty">{item.quantity}</Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          </View>
        ))}
      </View>

      <View className="approval-progress-panel">
        <View className="approval-progress-panel__head">
          <Text>{detail.orderNo}</Text>
          <Text>{detail.receivedQuantity} / {detail.totalQuantity}</Text>
        </View>
        <ProgressBar current={detail.receivedQuantity} total={detail.totalQuantity} />
        <View className="approval-progress-panel__actions">
          <Button
            className="approval-action approval-action--primary"
            onClick={() => Taro.navigateTo({ url: `/pages/inbound/location/index?orderId=${detail.id}` })}
          >
            批量设置位置
          </Button>
          <Button className="approval-action" onClick={handleComplete}>
            完成本次入库
          </Button>
        </View>
      </View>

      <View className="approval-items-title">待入库明细</View>
      {detail.items.map(item => {
        const finished = item.receivedQuantity >= item.orderedQuantity
        return (
          <View className="approval-item" key={item.id}>
            <View className="approval-item__main">
              <Text className="approval-item__name">{item.itemName}</Text>
              <Text className="approval-item__meta">
                {item.specification || '-'} · {item.batchNo || '未填批号'}
              </Text>
              <Text className="approval-item__progress">
                入库：{item.receivedQuantity} / {item.orderedQuantity}
              </Text>
            </View>
            <Button
              className={`approval-item__button ${finished ? 'approval-item__button--disabled' : ''}`}
              disabled={finished}
              onClick={() =>
                Taro.navigateTo({
                  url: `/pages/inbound/scan/index?orderId=${detail.id}&orderItemId=${item.id}`
                })
              }
            >
              {finished ? '已入库' : '扫码入库'}
            </Button>
          </View>
        )
      })}
    </LabShell>
  )
}
