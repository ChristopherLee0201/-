import { OperationLog } from '@/types/models'
import { readDb } from './mockDb'

export async function getOperationLogs(params?: {
  targetId?: string
  limit?: number
}): Promise<OperationLog[]> {
  const logs = params?.targetId
    ? readDb().operationLogs.filter(item => item.targetId === params.targetId)
    : readDb().operationLogs

  return logs.slice(0, params?.limit || 50)
}
