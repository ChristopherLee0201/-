import { ReactNode } from 'react'
import Taro from '@tarojs/taro'
import { Button, ScrollView, Text, View } from '@tarojs/components'
import './index.scss'

type NavKey = 'qr' | 'inbound' | 'outbound' | 'inventory'

interface LabShellProps {
  active?: NavKey
  title?: string
  showBack?: boolean
  noPadding?: boolean
  contentClassName?: string
  children?: ReactNode
}

export function LabShell({
  active = 'qr',
  title = 'xxx课题组实验室管理系统',
  showBack = false,
  noPadding = false,
  contentClassName = '',
  children
}: LabShellProps) {
  const handleBack = () => {
    const pages = Taro.getCurrentPages()
    if (pages.length > 1) {
      Taro.navigateBack()
      return
    }

    Taro.reLaunch({ url: '/pages/qr/index/index' })
  }

  return (
    <View className={`lab-shell lab-shell--${active}`}>
      <View className="lab-shell__safe" />
      <View className="lab-shell__header">
        {showBack ? (
          <Button className="lab-shell__back" onClick={handleBack}>
            ‹
          </Button>
        ) : (
          <View className="lab-shell__back-spacer" />
        )}
        <Text className="lab-shell__title">{title}</Text>
        <View className="lab-shell__back-spacer" />
      </View>

      <ScrollView className="lab-shell__content" scrollY enhanced showScrollbar={false}>
        <View className={`lab-shell__inner ${noPadding ? 'lab-shell__inner--no-padding' : ''} ${contentClassName}`}>
          {children}
        </View>
      </ScrollView>
    </View>
  )
}
