import { Text } from '@tarojs/components'
import './index.scss'

export type BadgeTone = 'blue' | 'green' | 'red' | 'gray' | 'yellow'

interface StatusBadgeProps {
  text: string
  tone?: BadgeTone
}

export function StatusBadge({ text, tone = 'gray' }: StatusBadgeProps) {
  return <Text className={`status-badge status-badge--${tone}`}>{text}</Text>
}
