import { useState } from 'react'
import Taro from '@tarojs/taro'
import { Button, Text, View } from '@tarojs/components'
import { LabShell } from '@/components/LabShell'
import './index.scss'

const topTabs = ['试剂', '耗材', '抗体', '动物房']
const sideTabs = ['细胞', '培养基', '血清', '药物', '蛋白组学', '转录组学', '切片']

const inventoryCards = [
  {
    id: 'dmem',
    name: 'DMEM培养基（500mL）',
    detailId: 'unit_dmem_1',
    unopened: 14,
    opened: 6,
    orderCount: 10,
    low: false,
    rows: []
  },
  {
    id: 'f12',
    name: 'F12培养基（500mL）',
    detailId: 'unit_dmem_3',
    unopened: 2,
    opened: 6,
    orderCount: 0,
    low: true,
    rows: [
      ['批次', '2026-06-27-001'],
      ['入库时间', '2026-06-29'],
      ['供应商', 'XX生物'],
      ['下单者', '赵建林'],
      ['订购员', '李相君'],
      ['入库员', '朱元隆'],
      ['数量', '10 瓶'],
      ['剩余', '8 瓶（2/6）'],
      ['存放位置', '4℃冰箱 A-2、4℃冰箱 A-3、4℃冰箱 A-4'],
      ['已开封', 'ab437b89-李相君-2026-06-29']
    ]
  },
  {
    id: 'dmem-next',
    name: 'DMEM培养基',
    detailId: 'unit_dmem_2',
    unopened: 8,
    opened: 2,
    orderCount: 0,
    low: false,
    rows: []
  }
]

export default function InventoryIndexPage() {
  const [activeTop, setActiveTop] = useState('试剂')
  const [activeSide, setActiveSide] = useState('培养基')
  const [cartCount, setCartCount] = useState(2)

  return (
    <LabShell title="库存情况" showBack active="inventory" noPadding>
      <View className="inventory-page">
        <View className="inventory-tabs">
          {topTabs.map(tab => (
            <Button
              key={tab}
              className={`inventory-tab ${activeTop === tab ? 'inventory-tab--active' : ''}`}
              onClick={() => setActiveTop(tab)}
            >
              {tab}
            </Button>
          ))}
        </View>

        <View className="inventory-body">
          <View className="inventory-sidebar">
            {sideTabs.map(tab => (
              <Button
                key={tab}
                className={`inventory-side-tab ${activeSide === tab ? 'inventory-side-tab--active' : ''}`}
                onClick={() => setActiveSide(tab)}
              >
                {tab}
              </Button>
            ))}
          </View>

          <View className="inventory-list">
            {inventoryCards.map(card => (
              <View className={`inventory-card ${card.low ? 'inventory-card--low' : ''}`} key={card.id}>
                <View className="inventory-card__head">
                  <View className="inventory-card__thumb" />
                  <View className="inventory-card__name-wrap">
                    <Text className="inventory-card__name">{card.name}</Text>
                    <Button
                      className="inventory-card__link"
                      onClick={() => Taro.navigateTo({ url: `/pages/inventory/unit-detail/index?id=${card.detailId}` })}
                    >
                      详情
                    </Button>
                  </View>
                </View>

                {card.rows.length > 0 && (
                  <View className="inventory-card__details">
                    {card.rows.map(row => (
                      <View className="inventory-card__detail-row" key={row[0]}>
                        <Text className="inventory-card__detail-label">{row[0]}：</Text>
                        <Text className="inventory-card__detail-value">{row[1]}</Text>
                      </View>
                    ))}
                  </View>
                )}

                <View className="inventory-card__line" />
                <View className="inventory-stock-row">
                  <Text className="inventory-stock-row__text">
                    库存：{card.unopened}（未开封）/ {card.opened}（已开封）
                  </Text>
                  {card.low && <Text className="inventory-low-badge">库存不足！</Text>}
                </View>

                <View className="inventory-order-row">
                  <Button className="inventory-stepper" onClick={() => setCartCount(Math.max(0, cartCount - 1))}>
                    -
                  </Button>
                  <Text className="inventory-order-count">{card.orderCount}</Text>
                  <Button className="inventory-stepper" onClick={() => setCartCount(cartCount + 1)}>
                    +
                  </Button>
                  <Button className="inventory-order-button" onClick={() => setCartCount(cartCount + 1)}>
                    订购
                  </Button>
                  <Button className="inventory-custom-button">定制</Button>
                </View>

                <Text className="inventory-card__note">
                  *订购员会订购课题组常用厂家，如有特殊需求，请填写定制需求，并联系订购员
                </Text>
              </View>
            ))}
          </View>
        </View>

        <View className="inventory-bottom-bar">
          <Button className="inventory-scan-entry" onClick={() => Taro.navigateTo({ url: '/pages/outbound/scan/index' })}>
            <View className="inventory-scan-entry__icon">
              <View className="inventory-scan-entry__corner inventory-scan-entry__corner--tl" />
              <View className="inventory-scan-entry__corner inventory-scan-entry__corner--tr" />
              <View className="inventory-scan-entry__corner inventory-scan-entry__corner--bl" />
              <View className="inventory-scan-entry__corner inventory-scan-entry__corner--br" />
            </View>
            <View className="inventory-scan-entry__line" />
            <Text>扫码查看</Text>
            <Text>入库/出库/开封</Text>
          </Button>
          <View className="inventory-cart-area">
            <View className="inventory-cart-icon">
              <View className="inventory-cart-icon__handle" />
              <View className="inventory-cart-icon__basket" />
              <View className="inventory-cart-icon__wheel inventory-cart-icon__wheel--left" />
              <View className="inventory-cart-icon__wheel inventory-cart-icon__wheel--right" />
              <Text className="inventory-cart-count">{cartCount}</Text>
            </View>
            <Button className="inventory-confirm-button">确认下单</Button>
          </View>
        </View>
      </View>
    </LabShell>
  )
}
