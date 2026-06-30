export function parseQrCode(raw: string): string | null {
  if (!raw) return null

  if (raw.startsWith('labqr://v1/')) {
    return raw.replace('labqr://v1/', '')
  }

  const matched = raw.match(/code=([^&]+)/)
  if (matched?.[1]) {
    return decodeURIComponent(matched[1])
  }

  if (raw.startsWith('QRC_')) {
    return raw
  }

  return null
}

export function generateQrCodeValue(code: string): string {
  return `labqr://v1/${code}`
}

export function isValidQrCode(code: string): boolean {
  return /^QRC_\d{8}_[A-Z0-9]{8,12}$/.test(code)
}
