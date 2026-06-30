export default defineAppConfig({
  pages: [
    'pages/qr/index/index',
    'pages/inventory/index/index',
    'pages/qr/print/index',
    'pages/qr/batch-detail/index',
    'pages/inbound/orders/index',
    'pages/inbound/order-detail/index',
    'pages/inbound/scan/index',
    'pages/inbound/location/index',
    'pages/outbound/scan/index',
    'pages/outbound/submit/index',
    'pages/inventory/unit-detail/index'
  ],
  window: {
    backgroundTextStyle: 'light',
    navigationBarBackgroundColor: '#ffffff',
    navigationBarTitleText: 'LabNow',
    navigationBarTextStyle: 'black',
    navigationStyle: 'custom'
  }
})
