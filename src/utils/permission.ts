import { User } from '@/types/models'

export function canGenerateQrCode(user?: User | null): boolean {
  return user?.role === 'purchaser' || user?.role === 'admin'
}

export function canPrintQrCode(user?: User | null): boolean {
  return user?.role === 'purchaser' || user?.role === 'admin'
}

export function canInbound(user?: User | null): boolean {
  return user?.role === 'purchaser' || user?.role === 'admin'
}

export function canOutbound(user?: User | null): boolean {
  return !!user
}

export function canVoidQrCode(user?: User | null): boolean {
  return user?.role === 'admin'
}

export function canCorrectQrBinding(user?: User | null): boolean {
  return user?.role === 'admin'
}
