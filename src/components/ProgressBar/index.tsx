import { Text, View } from '@tarojs/components'
import './index.scss'

interface ProgressBarProps {
  current: number
  total: number
}

export function ProgressBar({ current, total }: ProgressBarProps) {
  const percent = total > 0 ? Math.min(100, Math.round((current / total) * 100)) : 0

  return (
    <View className="progress-bar">
      <View className="progress-bar__track">
        <View className="progress-bar__fill" style={{ width: `${percent}%` }} />
      </View>
      <Text className="progress-bar__text">
        {current} / {total}
      </Text>
    </View>
  )
}
