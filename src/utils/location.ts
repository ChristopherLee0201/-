export function buildLocationFullPath(params: {
  area: string
  temperature?: string
  equipment?: string
  shelf?: string
  box?: string
  detail?: string
}): string {
  return [
    params.area,
    params.temperature,
    params.equipment,
    params.shelf,
    params.box,
    params.detail
  ]
    .filter(Boolean)
    .join(' / ')
}
