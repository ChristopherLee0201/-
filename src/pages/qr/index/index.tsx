import Taro from '@tarojs/taro'
import { Button, Text, View } from '@tarojs/components'
import { LabShell } from '@/components/LabShell'
import './index.scss'

type HomeIcon = 'home' | 'cart' | 'download' | 'upload' | 'printer' | 'scan'

const menuItems: Array<{
  title: string
  subtitle: string
  icon: HomeIcon
  url: string
}> = [
  {
    title: '库存情况',
    subtitle: 'Inventory status',
    icon: 'home',
    url: '/pages/inventory/index/index'
  },
  {
    title: '订购审批',
    subtitle: 'Order view',
    icon: 'cart',
    url: '/pages/inbound/order-detail/index?orderId=order_1'
  },
  {
    title: '入库',
    subtitle: 'Warehouse',
    icon: 'download',
    url: '/pages/inbound/orders/index'
  },
  {
    title: '开封/出库',
    subtitle: 'Outbound',
    icon: 'upload',
    url: '/pages/outbound/scan/index'
  },
  {
    title: '标签打印',
    subtitle: 'Label printing',
    icon: 'printer',
    url: '/pages/qr/print/index'
  },
  {
    title: '扫码查看',
    subtitle: 'Scan',
    icon: 'scan',
    url: '/pages/outbound/scan/index'
  }
]

function HomeMenuIcon({ icon }: { icon: HomeIcon }) {
  if (icon === 'home') {
    return (
      <View className="home-menu-icon home-menu-icon--home">
        <View className="home-icon-home__roof" />
        <View className="home-icon-home__body" />
        <View className="home-icon-home__door" />
      </View>
    )
  }

  if (icon === 'cart') {
    return (
      <View className="home-menu-icon home-menu-icon--cart">
        <View className="home-icon-cart__handle" />
        <View className="home-icon-cart__support" />
        <View className="home-icon-cart__basket" />
        <View className="home-icon-cart__wheel home-icon-cart__wheel--left" />
        <View className="home-icon-cart__wheel home-icon-cart__wheel--right" />
      </View>
    )
  }

  if (icon === 'download' || icon === 'upload') {
    return (
      <View className={`home-menu-icon home-menu-icon--${icon}`}>
        <View className="home-icon-arrow__shaft" />
        <View className="home-icon-arrow__head">
          <View className="home-icon-arrow__head-line home-icon-arrow__head-line--left" />
          <View className="home-icon-arrow__head-line home-icon-arrow__head-line--right" />
        </View>
        <View className="home-icon-arrow__tray" />
      </View>
    )
  }

  if (icon === 'printer') {
    return (
      <View className="home-menu-icon home-menu-icon--printer">
        <View className="home-icon-printer__paper home-icon-printer__paper--top" />
        <View className="home-icon-printer__body" />
        <View className="home-icon-printer__paper home-icon-printer__paper--bottom" />
      </View>
    )
  }

  if (icon === 'scan') {
    return (
      <View className="home-menu-icon home-menu-icon--scan">
        <View className="home-icon-scan__corner home-icon-scan__corner--tl" />
        <View className="home-icon-scan__corner home-icon-scan__corner--tr" />
        <View className="home-icon-scan__line" />
        <View className="home-icon-scan__corner home-icon-scan__corner--bl" />
        <View className="home-icon-scan__corner home-icon-scan__corner--br" />
      </View>
    )
  }

  return (
    <View className={`home-menu-icon home-menu-icon--${icon}`}>
      <View className="home-menu-icon__shape" />
    </View>
  )
}

export default function QrIndexPage() {
  return (
    <LabShell title="xxx课题组实验室管理系统" active="qr" contentClassName="home-page">
      <View className="home-menu-grid">
        {menuItems.map(item => (
          <Button
            key={item.title}
            className="home-menu-card"
            onClick={() => Taro.navigateTo({ url: item.url })}
          >
            <HomeMenuIcon icon={item.icon} />
            <View className="home-menu-card__divider" />
            <Text className="home-menu-card__title">{item.title}</Text>
            <Text className="home-menu-card__subtitle">{item.subtitle}</Text>
          </Button>
        ))}
      </View>
    </LabShell>
  )
}
