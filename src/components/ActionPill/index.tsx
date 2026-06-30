import { Text, View } from '@tarojs/components'
import './index.scss'

interface ActionPillProps {
  icon: string
  title: string
  subtitle: string
}

export function ActionPill({ icon, title, subtitle }: ActionPillProps) {
  return (
    <View className="action-pill">
      <View className="action-pill__icon">
        <Text>{icon}</Text>
      </View>
      <View className="action-pill__line" />
      <View className="action-pill__text">
        <Text className="action-pill__title">{title}</Text>
        <Text className="action-pill__subtitle">{subtitle}</Text>
      </View>
    </View>
  )
}
