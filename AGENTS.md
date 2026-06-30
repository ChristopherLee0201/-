# 二维码系统与扫码入库模块设计

## 一、模块定位

本模块用于实现课题组耗材试剂管理系统中的二维码生命周期管理、贴纸打印、扫码入库、扫码出库、入库签名、位置管理和操作追踪。

核心目标是：

1. 系统提前随机生成一批空白二维码；
2. 空白二维码可以发送给贴纸打印机或导出为标签文件；
3. 来货后，入库员将空白二维码贴到具体物资上；
4. 入库员在订单明细下点击“扫码入库”，扫描该二维码；
5. 系统将二维码与具体物理库存单元绑定；
6. 二维码绑定后被占用，不能重复用于其他物资；
7. 系统自动记录入库员、入库时间和入库签名；
8. 后续出库、领用、报废、位置变更均通过扫码追踪；
9. 一批订单全部入库后，可以统一补充位置，也可以单个物资逐个填写位置。

本模块的设计原则是：

```text
二维码不是物资信息本身，而是一个空白唯一身份标签。
入库扫码后，二维码才与具体物资绑定。
```

---

## 二、核心业务概念

### 1. 空白二维码

系统可以提前生成一批二维码。  
这些二维码在生成时不绑定任何物资，只代表一个唯一标签。

二维码内容示例：

```text
labqr://v1/QRC_20260629_A8K39D2P
```

或：

```text
pages/qr/scan/index?code=QRC_20260629_A8K39D2P
```

二维码里的核心字段是：

```text
QRC_20260629_A8K39D2P
```

该字段必须全局唯一。

### 2. 物理库存单元

不要只把二维码绑定到库存总表。

错误做法：

```text
二维码 → DMEM 库存总表
```

正确做法：

```text
二维码 → 某一个具体物理库存单元 inventory_unit
```

例如：

```text
库存总表：DMEM 高糖培养基，当前共 5 瓶

物理库存单元：
- 第 1 瓶 DMEM，二维码 QRC_001
- 第 2 瓶 DMEM，二维码 QRC_002
- 第 3 瓶 DMEM，二维码 QRC_003
- 第 4 瓶 DMEM，二维码 QRC_004
- 第 5 瓶 DMEM，二维码 QRC_005
```

这样后续可以追踪：

1. 哪一瓶是谁入库的；
2. 哪一瓶放在哪里；
3. 哪一瓶什么时候过期；
4. 哪一瓶被谁领用；
5. 哪一瓶已经用尽或报废。

---

## 三、二维码生命周期状态机

每个二维码都需要独立状态。

```text
generated → printed → bound → in_stock → out_used
     ↓          ↓         ↓          ↓
   voided     voided    voided    discarded
```

### 状态定义

```ts
export type QrCodeStatus =
  | 'generated'
  | 'printed'
  | 'bound'
  | 'in_stock'
  | 'out_used'
  | 'discarded'
  | 'voided'
```

中文展示：

```ts
export const qrCodeStatusText: Record<QrCodeStatus, string> = {
  generated: '已生成',
  printed: '已打印',
  bound: '已绑定',
  in_stock: '库存中',
  out_used: '已出库/已用尽',
  discarded: '已报废',
  voided: '已作废'
}
```

### 状态含义

| 状态 | 含义 |
|---|---|
| `generated` | 系统已生成二维码，但未确认打印 |
| `printed` | 已发送给贴纸打印机或已导出打印 |
| `bound` | 已被某次入库扫码绑定到物资 |
| `in_stock` | 已完成入库，可用于出库/领用 |
| `out_used` | 已出库、领用或用尽 |
| `discarded` | 已报废 |
| `voided` | 作废，不再使用 |

### 绑定限制

扫码入库时，只允许绑定以下状态的二维码：

```ts
['generated', 'printed']
```

如果二维码状态已经是：

```ts
['bound', 'in_stock', 'out_used', 'discarded', 'voided']
```

则必须阻止绑定，并提示：

```text
该二维码已被占用，不能重复入库。
```

---

## 四、核心数据模型

### 1. 二维码表：`qr_codes`

```ts
export interface QrCode {
  id: string
  code: string
  status: QrCodeStatus

  batchId?: string

  printedAt?: string
  printedBy?: string

  boundAt?: string
  boundBy?: string
  boundInventoryUnitId?: string

  createdAt: string
  updatedAt: string
}
```

字段说明：

| 字段 | 说明 |
|---|---|
| `id` | 数据库主键 |
| `code` | 二维码唯一编码 |
| `status` | 二维码状态 |
| `batchId` | 所属打印批次 |
| `printedAt` | 打印时间 |
| `printedBy` | 打印操作人 |
| `boundAt` | 绑定时间 |
| `boundBy` | 绑定操作人 |
| `boundInventoryUnitId` | 绑定的物理库存单元 ID |

---

### 2. 打印批次表：`qr_print_batches`

```ts
export type QrPrintBatchStatus =
  | 'created'
  | 'printing'
  | 'printed'
  | 'failed'
  | 'partially_printed'

export interface QrPrintBatch {
  id: string
  batchNo: string
  quantity: number
  status: QrPrintBatchStatus

  printerName?: string

  createdBy: string
  createdByName: string
  createdAt: string

  printedAt?: string
}
```

用途：

```text
一次生成 100 个空白二维码 → 形成一个打印批次 → 发送打印 → 标记为已打印
```

---

### 3. 采购订单表：`purchase_orders`

```ts
export type PurchaseOrderStatus =
  | 'pending_arrival'
  | 'partially_received'
  | 'received'
  | 'stocked'
  | 'completed'
  | 'cancelled'

export interface PurchaseOrder {
  id: string
  orderNo: string
  supplier?: string

  status: PurchaseOrderStatus

  createdBy: string
  createdByName: string

  createdAt: string
  updatedAt: string
}
```

---

### 4. 采购订单明细表：`purchase_order_items`

一张订单里可以包含多个具体物品。

```ts
export type PurchaseOrderItemStatus =
  | 'pending'
  | 'partially_received'
  | 'received'
  | 'stocked'

export interface PurchaseOrderItem {
  id: string
  orderId: string

  itemName: string
  chineseName?: string
  englishName?: string
  brand?: string
  catalogNo?: string
  specification?: string

  orderedQuantity: number
  receivedQuantity: number
  unit: string

  batchNo?: string
  expiryDate?: string

  status: PurchaseOrderItemStatus

  createdAt: string
  updatedAt: string
}
```

示例：

```text
订单 PO20260629-001

1. DMEM 高糖培养基 500mL × 5
2. PBS 缓冲液 500mL × 3
3. FBS 50mL × 2
```

每个订单明细下都需要提供：

```text
扫码入库
```

按钮。

---

### 5. 物理库存单元表：`inventory_units`

这是二维码系统的核心表。

```ts
export type InventoryUnitStatus =
  | 'pending_location'
  | 'in_stock'
  | 'partially_used'
  | 'used_up'
  | 'expired'
  | 'discarded'

export interface InventoryUnit {
  id: string

  qrCodeId: string
  qrCode: string

  orderId?: string
  orderItemId?: string

  inventoryItemId?: string

  itemName: string
  chineseName?: string
  englishName?: string
  brand?: string
  catalogNo?: string
  specification?: string

  batchNo?: string
  expiryDate?: string

  quantity: number
  remainingQuantity?: number
  unit: string

  locationId?: string
  locationText?: string

  status: InventoryUnitStatus

  inboundBy: string
  inboundByName: string
  inboundSignatureId?: string
  inboundAt: string

  lastOutboundAt?: string

  createdAt: string
  updatedAt: string
}
```

说明：

```text
一瓶试剂、一盒耗材、一盒抗体，都应该对应一个 inventory_unit。
每个 inventory_unit 对应一个唯一二维码。
```

---

### 6. 出库记录表：`stock_out_records`

```ts
export interface StockOutRecord {
  id: string

  inventoryUnitId: string
  qrCode: string

  userId: string
  userName: string

  quantity: number
  unit: string

  purpose?: string
  project?: string

  beforeRemainingQuantity?: number
  afterRemainingQuantity?: number

  note?: string

  createdAt: string
}
```

出库扫码后需要记录：

1. 谁领用了；
2. 什么时候领用；
3. 领用了多少；
4. 用于什么项目；
5. 出库前剩余多少；
6. 出库后剩余多少。

---

### 7. 存放位置表：`storage_locations`

位置不要长期只用纯文本保存。  
建议建立结构化位置表。

```ts
export interface StorageLocation {
  id: string

  area: string
  temperature?: string
  equipment?: string
  shelf?: string
  box?: string
  detail?: string

  fullPath: string

  isActive: boolean

  createdAt: string
  updatedAt: string
}
```

示例：

```text
area: 冰箱间
temperature: -20℃
equipment: -20℃冰箱 A
shelf: 第二层
box: Box 3
detail: 左后角

fullPath: 冰箱间 / -20℃冰箱 A / 第二层 / Box 3 / 左后角
```

---

### 8. 操作日志表：`operation_logs`

所有关键操作必须记录日志。

```ts
export type OperationAction =
  | 'qr_generated'
  | 'qr_printed'
  | 'qr_bound'
  | 'qr_voided'
  | 'inbound_created'
  | 'location_updated'
  | 'stock_out'
  | 'unit_discarded'
  | 'unit_unbound'
  | 'unit_rebound'

export type OperationTargetType =
  | 'qr_code'
  | 'inventory_unit'
  | 'purchase_order'
  | 'purchase_order_item'
  | 'stock_out_record'
  | 'storage_location'

export interface OperationLog {
  id: string

  operatorId: string
  operatorName: string

  action: OperationAction

  targetType: OperationTargetType
  targetId: string

  detail?: string

  createdAt: string
}
```

---

## 五、二维码生成与打印流程

### 1. 生成空白二维码

管理员或采购员进入：

```text
二维码管理 → 生成空白二维码
```

填写：

```text
生成数量：100
标签尺寸：30mm × 20mm
是否立即打印：是 / 否
```

系统需要：

1. 创建一个 `qr_print_batch`；
2. 批量生成对应数量的 `qr_codes`；
3. 每个 `qr_code.code` 全局唯一；
4. 初始状态为 `generated`；
5. 记录操作日志 `qr_generated`。

二维码编码格式建议：

```text
QRC_YYYYMMDD_RANDOM
```

示例：

```text
QRC_20260629_A8K39D2P
QRC_20260629_F7P2X1QA
QRC_20260629_K9L3W8BZ
```

---

### 2. 发送给贴纸打印机

在二维码批次详情页提供按钮：

```text
发送给贴纸打印机
```

MVP 阶段可以先做：

```text
导出二维码标签 PDF / 图片
```

正式阶段再接入：

```text
蓝牙标签打印机
```

打印成功后，需要批量更新：

```ts
qrCode.status = 'printed'
qrCode.printedAt = now
qrCode.printedBy = currentUser.id
```

并更新打印批次：

```ts
batch.status = 'printed'
batch.printedAt = now
```

同时记录操作日志：

```text
qr_printed
```

---

## 六、贴纸打印实现方案

### 方案 A：MVP 推荐方案，导出 PDF / 图片

流程：

```text
生成二维码 → 标签排版 → 导出 PDF / 图片 → 人工打印
```

优点：

1. 开发简单；
2. 稳定；
3. 不依赖具体打印机型号；
4. 适合早期验证系统流程。

缺点：

1. 不能直接从小程序自动打印；
2. 需要人工转发或下载打印文件。

MVP 阶段优先实现该方案。

---

### 方案 B：微信小程序蓝牙直连打印机

流程：

```text
初始化蓝牙 → 搜索设备 → 连接打印机 → 写入打印指令 → 打印
```

注意：

不同标签打印机使用不同协议，例如：

```text
ESC/POS
CPCL
TSPL
ZPL
厂商私有协议
```

如果要走这个方案，必须先确定打印机型号，并确认：

1. 是否支持 BLE；
2. 是否提供微信小程序 SDK；
3. 是否支持标准标签打印协议；
4. 是否能打印二维码；
5. 是否能设置标签尺寸。

该方案适合正式版，不建议 MVP 第一阶段实现。

---

### 方案 C：局域网打印服务

流程：

```text
小程序 → 后端创建打印任务 → 实验室电脑/树莓派 print-agent 接收任务 → 调用打印机
```

优点：

1. 适合固定实验室环境；
2. 稳定性较好；
3. 不受微信小程序蓝牙限制；
4. 可接入普通 USB 标签打印机。

缺点：

1. 需要额外部署一个打印代理程序；
2. 系统复杂度更高。

---

## 七、订单扫码入库流程

### 1. 入库员选择订单

入库员进入：

```text
入库管理 → 待入库订单 → 订单详情
```

订单详情展示：

```text
订单：PO20260629-001
供应商：XX 生物
状态：部分入库
总进度：8 / 10
```

订单明细展示：

```text
1. DMEM 高糖培养基
规格：500mL
货号：11965092
进度：3 / 5
[扫码入库] [查看已入库]

2. PBS 缓冲液
规格：500mL
进度：3 / 3
[已全部入库] [查看已入库]

3. FBS
规格：50mL
进度：2 / 2
[已全部入库] [查看已入库]
```

### 2. 扫码入库

入库员操作：

```text
拿到新来的物品 → 贴一个空白二维码 → 点击该订单明细下的“扫码入库” → 扫描刚贴的二维码
```

系统需要校验：

1. 二维码是否存在；
2. 二维码是否未被绑定；
3. 当前订单明细是否存在；
4. 当前订单明细是否还有未入库数量；
5. 当前用户是否有入库权限。

校验通过后，系统创建 `inventory_unit`，并更新：

1. `qr_codes.status = bound`；
2. `qr_codes.boundInventoryUnitId = inventoryUnit.id`；
3. `purchase_order_items.receivedQuantity += 1`；
4. 如果该明细全部入库，则 `purchase_order_items.status = received`；
5. 如果订单部分入库，则 `purchase_orders.status = partially_received`；
6. 如果订单全部入库，则 `purchase_orders.status = received`。

---

## 八、扫码入库核心逻辑

前端伪代码：

```ts
import Taro from '@tarojs/taro'
import { bindQrCodeToOrderItem } from '@/services/inboundService'
import { parseQrCode } from '@/utils/qr'

export async function handleScanInbound(orderId: string, orderItemId: string) {
  try {
    const scanResult = await Taro.scanCode({
      onlyFromCamera: true,
      scanType: ['qrCode']
    })

    const qrCode = parseQrCode(scanResult.result)

    if (!qrCode) {
      Taro.showToast({
        title: '二维码格式不正确',
        icon: 'none'
      })
      return
    }

    await bindQrCodeToOrderItem({
      qrCode,
      orderId,
      orderItemId
    })

    Taro.showToast({
      title: '入库成功',
      icon: 'success'
    })
  } catch (error) {
    Taro.showToast({
      title: '扫码入库失败',
      icon: 'none'
    })
  }
}
```

二维码解析工具：

```ts
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
```

---

## 九、后端绑定逻辑要求

扫码绑定必须在服务端进行事务处理。

伪代码：

```ts
async function bindQrCodeToOrderItem(params: {
  qrCode: string
  orderId: string
  orderItemId: string
  operatorId: string
}) {
  return db.transaction(async tx => {
    const qr = await tx.qrCodes.findUnique({
      where: { code: params.qrCode },
      lock: true
    })

    if (!qr) {
      throw new Error('二维码不存在')
    }

    if (!['generated', 'printed'].includes(qr.status)) {
      throw new Error('二维码已被占用')
    }

    const orderItem = await tx.purchaseOrderItems.findUnique({
      where: { id: params.orderItemId },
      lock: true
    })

    if (!orderItem) {
      throw new Error('订单明细不存在')
    }

    if (orderItem.orderId !== params.orderId) {
      throw new Error('订单明细与订单不匹配')
    }

    if (orderItem.receivedQuantity >= orderItem.orderedQuantity) {
      throw new Error('该物品已全部入库')
    }

    const operator = await tx.users.findUnique({
      where: { id: params.operatorId }
    })

    if (!operator) {
      throw new Error('入库员不存在')
    }

    const unit = await tx.inventoryUnits.create({
      data: {
        qrCodeId: qr.id,
        qrCode: qr.code,

        orderId: params.orderId,
        orderItemId: params.orderItemId,

        itemName: orderItem.itemName,
        chineseName: orderItem.chineseName,
        englishName: orderItem.englishName,
        brand: orderItem.brand,
        catalogNo: orderItem.catalogNo,
        specification: orderItem.specification,
        batchNo: orderItem.batchNo,
        expiryDate: orderItem.expiryDate,

        quantity: 1,
        remainingQuantity: 1,
        unit: orderItem.unit,

        status: 'pending_location',

        inboundBy: operator.id,
        inboundByName: operator.name,
        inboundSignatureId: operator.signatureId,
        inboundAt: new Date()
      }
    })

    await tx.qrCodes.update({
      where: { id: qr.id },
      data: {
        status: 'bound',
        boundAt: new Date(),
        boundBy: operator.id,
        boundInventoryUnitId: unit.id
      }
    })

    const newReceivedQuantity = orderItem.receivedQuantity + 1

    await tx.purchaseOrderItems.update({
      where: { id: orderItem.id },
      data: {
        receivedQuantity: newReceivedQuantity,
        status:
          newReceivedQuantity >= orderItem.orderedQuantity
            ? 'received'
            : 'partially_received'
      }
    })

    await tx.operationLogs.create({
      data: {
        operatorId: operator.id,
        operatorName: operator.name,
        action: 'qr_bound',
        targetType: 'qr_code',
        targetId: qr.id,
        detail: `二维码 ${qr.code} 绑定到 ${orderItem.itemName}`
      }
    })

    await tx.operationLogs.create({
      data: {
        operatorId: operator.id,
        operatorName: operator.name,
        action: 'inbound_created',
        targetType: 'inventory_unit',
        targetId: unit.id,
        detail: `入库 ${orderItem.itemName}，订单 ${params.orderId}`
      }
    })

    return unit
  })
}
```

关键要求：

```text
必须使用数据库事务。
必须锁定二维码记录。
必须锁定订单明细记录。
必须防止同一个二维码被多人重复绑定。
必须防止同一个订单明细超量入库。
```

---

## 十、自动签名逻辑

入库扫码成功后，系统自动记录入库员信息。

### 基础版签名

直接记录：

```text
入库员 ID
入库员姓名
入库时间
```

对应字段：

```ts
inboundBy: string
inboundByName: string
inboundAt: string
```

### 增强版签名

如果用户有签名图片，则自动绑定：

```ts
inboundSignatureId?: string
```

用户表中可增加：

```ts
signatureImageUrl?: string
signatureId?: string
```

展示时显示：

```text
入库员：张三
入库时间：2026-06-29 11:30
签名：张三签名图
```

MVP 阶段可以先只记录用户姓名和时间，不必强制实现手写签名。

---

## 十一、位置填写设计

入库位置支持两种模式：

1. 单个物品入库时立即填写；
2. 订单全部或部分入库后批量填写。

---

### 模式 A：扫码时立即填写位置

适合不同物品放不同位置。

流程：

```text
扫码入库 → 填写位置 → 完成
```

位置字段建议使用选项制：

```text
区域：细胞房 / 分子实验室 / 冰箱间 / 试剂柜
温度：常温 / 4℃ / -20℃ / -80℃
设备：4℃冰箱 A / 4℃冰箱 B / -20℃冰箱 A
层数：第一层 / 第二层 / 第三层
盒号：Box 1 / Box 2 / Box 3
补充说明：左后角 / 右前角 / 自定义
```

保存后生成：

```text
冰箱间 / -20℃冰箱 A / 第二层 / Box 3 / 左后角
```

---

### 模式 B：订单入库后批量填写位置

适合同一批物资放到同一个位置。

流程：

```text
连续扫码入库 → 订单全部入库 → 批量设置位置
```

当订单全部扫码完成，系统提示：

```text
本次订单已全部入库。是否为本次入库物资统一设置存放位置？
```

按钮：

```text
统一设置位置
稍后逐个设置
```

批量设置位置时，提供作用范围：

```text
本订单全部未设置位置物资
当前订单明细下的物资
手动选择物资
```

示例：

```text
将本订单所有 DMEM 设置为：4℃冰箱 B / 第二层
将本订单所有 FBS 设置为：-20℃冰箱 A / 第一层
```

---

## 十二、位置设置接口逻辑

### 单个设置位置

```ts
async function updateInventoryUnitLocation(params: {
  inventoryUnitId: string
  locationId: string
  operatorId: string
}) {
  // 更新单个 inventory_unit 的位置
}
```

更新字段：

```ts
locationId
locationText
status = 'in_stock'
updatedAt
```

同时记录操作日志：

```text
location_updated
```

---

### 批量设置位置

```ts
async function batchUpdateLocation(params: {
  orderId: string
  orderItemId?: string
  inventoryUnitIds?: string[]
  locationId: string
  operatorId: string
}) {
  // 根据范围批量更新位置
}
```

支持三种范围：

```text
1. orderId：本订单全部未设置位置物资
2. orderId + orderItemId：当前订单明细下未设置位置物资
3. inventoryUnitIds：手动选择的物资
```

更新后，相关 `inventory_units.status` 从：

```text
pending_location
```

变为：

```text
in_stock
```

---

## 十三、扫码出库流程

成员进入：

```text
扫码出库 / 领用登记
```

扫描二维码后，系统查询对应 `inventory_unit`。

如果状态是：

```text
in_stock
partially_used
```

允许出库。

如果状态是：

```text
pending_location
used_up
expired
discarded
```

不允许出库，并提示原因。

出库页面展示：

```text
物品名称：DMEM 高糖培养基
品牌：Gibco
货号：11965092
规格：500mL
当前位置：4℃冰箱 B / 第二层
当前剩余：1 瓶
有效期：2026-12-31
```

用户填写：

```text
领用数量
用途
所属项目
备注
```

提交后：

1. 创建 `stock_out_records`；
2. 更新 `inventory_units.remainingQuantity`；
3. 如果剩余量大于 0，则状态设为 `partially_used`；
4. 如果剩余量等于 0，则状态设为 `used_up`；
5. 更新 `lastOutboundAt`；
6. 记录操作日志 `stock_out`。

---

## 十四、出库提交伪代码

```ts
async function submitStockOut(params: {
  inventoryUnitId: string
  userId: string
  quantity: number
  purpose?: string
  project?: string
  note?: string
}) {
  return db.transaction(async tx => {
    const unit = await tx.inventoryUnits.findUnique({
      where: { id: params.inventoryUnitId },
      lock: true
    })

    if (!unit) {
      throw new Error('库存单元不存在')
    }

    if (!['in_stock', 'partially_used'].includes(unit.status)) {
      throw new Error('当前物资不可出库')
    }

    const beforeRemainingQuantity = unit.remainingQuantity ?? unit.quantity
    const afterRemainingQuantity = beforeRemainingQuantity - params.quantity

    if (afterRemainingQuantity < 0) {
      throw new Error('出库数量不能超过剩余数量')
    }

    const user = await tx.users.findUnique({
      where: { id: params.userId }
    })

    const record = await tx.stockOutRecords.create({
      data: {
        inventoryUnitId: unit.id,
        qrCode: unit.qrCode,
        userId: user.id,
        userName: user.name,
        quantity: params.quantity,
        unit: unit.unit,
        purpose: params.purpose,
        project: params.project,
        beforeRemainingQuantity,
        afterRemainingQuantity,
        note: params.note,
        createdAt: new Date()
      }
    })

    await tx.inventoryUnits.update({
      where: { id: unit.id },
      data: {
        remainingQuantity: afterRemainingQuantity,
        status: afterRemainingQuantity === 0 ? 'used_up' : 'partially_used',
        lastOutboundAt: new Date(),
        updatedAt: new Date()
      }
    })

    await tx.operationLogs.create({
      data: {
        operatorId: user.id,
        operatorName: user.name,
        action: 'stock_out',
        targetType: 'inventory_unit',
        targetId: unit.id,
        detail: `${user.name} 领用 ${unit.itemName} ${params.quantity}${unit.unit}`
      }
    })

    return record
  })
}
```

---

## 十五、页面结构新增

在 Taro 小程序中新增以下页面。

```text
src/pages/qr/index/index.tsx
src/pages/qr/print/index.tsx
src/pages/qr/batch-detail/index.tsx

src/pages/inbound/orders/index.tsx
src/pages/inbound/order-detail/index.tsx
src/pages/inbound/scan/index.tsx
src/pages/inbound/location/index.tsx

src/pages/outbound/scan/index.tsx
src/pages/outbound/submit/index.tsx

src/pages/inventory/unit-detail/index.tsx
```

### 页面说明

| 页面 | 功能 |
|---|---|
| `qr/index` | 二维码管理首页 |
| `qr/print` | 生成空白二维码与打印 |
| `qr/batch-detail` | 查看某个二维码批次 |
| `inbound/orders` | 待入库订单列表 |
| `inbound/order-detail` | 某个订单的入库详情 |
| `inbound/scan` | 扫码绑定入库 |
| `inbound/location` | 单个或批量设置位置 |
| `outbound/scan` | 扫码出库 |
| `outbound/submit` | 出库信息填写 |
| `inventory/unit-detail` | 单个贴码物品详情 |

---

## 十六、页面交互设计

### 1. 二维码管理首页

展示：

```text
生成空白二维码
二维码批次
未使用二维码
已绑定二维码
作废二维码
```

批次卡片：

```text
批次：QRB20260629-001
数量：100
已打印：100
已绑定：37
剩余空白：63
创建人：张三
创建时间：2026-06-29
[查看] [重新打印] [作废未使用码]
```

---

### 2. 订单入库详情页

页面结构：

```text
订单 PO20260629-001

供应商：XX 生物
状态：部分入库
总进度：8 / 10

[批量设置位置]
[完成本次入库]

订单明细：

DMEM 高糖培养基
规格：500mL
货号：11965092
入库进度：3 / 5
[扫码入库]
[查看已入库 3]

PBS 缓冲液
规格：500mL
入库进度：3 / 3
[已全部入库]
[查看已入库 3]
```

规则：

```text
用户点击 DMEM 下的“扫码入库”，扫码结果只能绑定到 DMEM。
用户点击 PBS 下的“扫码入库”，扫码结果只能绑定到 PBS。
```

不要设计成扫完二维码后再让用户选择物品，否则容易选错。

---

### 3. 批量设置位置页

先选择作用范围：

```text
设置范围：
○ 本订单全部未设置位置物资
○ 按订单明细设置
○ 手动选择物资
```

再选择位置：

```text
区域
温度
设备
层数
盒号
补充说明
```

确认前展示影响范围：

```text
将为 8 个物资设置位置：
冰箱间 / -20℃冰箱 A / 第二层 / Box 3
```

确认按钮：

```text
确认设置位置
```

---

### 4. 单个贴码物品详情页

展示：

```text
二维码：QRC_20260629_A8K39D2P

物品名称：DMEM 高糖培养基
品牌：Gibco
货号：11965092
规格：500mL
批号：B20260629
有效期：2026-12-31

当前位置：4℃冰箱 B / 第二层
当前状态：库存中
当前剩余：1 瓶

入库信息：
入库员：张三
入库时间：2026-06-29 11:30
来源订单：PO20260629-001

最近出库记录：
- 李四，2026-06-30，领用 0.2 瓶，用于细胞培养
```

操作按钮：

```text
扫码出库
修改位置
标记用尽
标记报废
查看操作日志
```

---

## 十七、Service 层新增

新增以下 service 文件。

```text
src/services/qrService.ts
src/services/inboundService.ts
src/services/outboundService.ts
src/services/locationService.ts
src/services/inventoryUnitService.ts
src/services/operationLogService.ts
```

### `qrService.ts`

```ts
export async function createQrPrintBatch(params: {
  quantity: number
  labelSize?: string
}) {}

export async function getQrPrintBatches() {}

export async function getQrPrintBatchDetail(batchId: string) {}

export async function markQrBatchPrinted(batchId: string) {}

export async function voidQrCode(code: string) {}
```

### `inboundService.ts`

```ts
export async function getInboundOrders() {}

export async function getInboundOrderDetail(orderId: string) {}

export async function bindQrCodeToOrderItem(params: {
  qrCode: string
  orderId: string
  orderItemId: string
}) {}

export async function completeInboundOrder(orderId: string) {}
```

### `outboundService.ts`

```ts
export async function getInventoryUnitByQrCode(qrCode: string) {}

export async function submitStockOut(params: {
  inventoryUnitId: string
  quantity: number
  purpose?: string
  project?: string
  note?: string
}) {}
```

### `locationService.ts`

```ts
export async function getStorageLocations() {}

export async function createStorageLocation(params: {
  area: string
  temperature?: string
  equipment?: string
  shelf?: string
  box?: string
  detail?: string
}) {}

export async function updateInventoryUnitLocation(params: {
  inventoryUnitId: string
  locationId: string
}) {}

export async function batchUpdateLocation(params: {
  orderId: string
  orderItemId?: string
  inventoryUnitIds?: string[]
  locationId: string
}) {}
```

---

## 十八、工具函数新增

### `src/utils/qr.ts`

```ts
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
```

### `src/utils/location.ts`

```ts
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
```

---

## 十九、权限要求

在 `src/utils/permission.ts` 中增加：

```ts
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
```

权限规则：

| 功能 | 普通成员 | 采购员 | 管理员 |
|---|---:|---:|---:|
| 生成二维码 | 否 | 是 | 是 |
| 打印二维码 | 否 | 是 | 是 |
| 扫码入库 | 否 | 是 | 是 |
| 扫码出库 | 是 | 是 | 是 |
| 修改位置 | 否 | 是 | 是 |
| 批量设置位置 | 否 | 是 | 是 |
| 作废二维码 | 否 | 否 | 是 |
| 纠正绑定 | 否 | 否 | 是 |

---

## 二十、防错逻辑

### 1. 防止二维码重复绑定

绑定时后端必须校验：

```ts
qr.status === 'generated' || qr.status === 'printed'
```

否则拒绝绑定。

---

### 2. 防止超量入库

绑定时后端必须校验：

```ts
orderItem.receivedQuantity < orderItem.orderedQuantity
```

否则拒绝继续入库。

---

### 3. 防止扫错订单明细

扫码入库接口必须同时传入：

```text
orderId
orderItemId
qrCode
```

不能只传二维码。

---

### 4. 防止位置遗漏

物品扫码入库后，如果尚未设置位置，状态为：

```text
pending_location
```

`pending_location` 状态下不允许正常出库，必须先设置位置。

---

### 5. 支持管理员纠错

现实中一定会出现贴错码、扫错码、贴纸丢失等情况。

需要预留管理员纠错功能：

```text
解绑二维码
更换二维码
作废二维码
修改绑定物资
修改入库位置
```

所有纠错操作必须写入 `operation_logs`。

---

## 二十一、API 设计建议

### 二维码接口

```text
POST   /api/qr/batches
GET    /api/qr/batches
GET    /api/qr/batches/:id
POST   /api/qr/batches/:id/mark-printed
POST   /api/qr/:code/void
GET    /api/qr/:code
```

### 入库接口

```text
GET    /api/inbound/orders
GET    /api/inbound/orders/:orderId
POST   /api/inbound/orders/:orderId/items/:orderItemId/scan-bind
POST   /api/inbound/orders/:orderId/batch-location
POST   /api/inbound/orders/:orderId/complete
```

### 出库接口

```text
POST   /api/outbound/scan
POST   /api/outbound/submit
```

### 物理库存单元接口

```text
GET    /api/inventory-units/:id
GET    /api/inventory-units/by-qr/:code
PATCH  /api/inventory-units/:id/location
PATCH  /api/inventory-units/:id/status
```

### 位置接口

```text
GET    /api/storage-locations
POST   /api/storage-locations
PATCH  /api/storage-locations/:id
DELETE /api/storage-locations/:id
```

---

## 二十二、开发阶段规划

### Phase 1：二维码池

完成：

```text
qr_codes 表
qr_print_batches 表
生成随机二维码
二维码批次列表
二维码批次详情
二维码状态展示
作废二维码
```

### Phase 2：标签导出

完成：

```text
生成二维码图片
生成标签排版
导出 PDF 或图片
标记为已打印
```

MVP 阶段不强制接蓝牙打印机。

### Phase 3：订单扫码入库

完成：

```text
待入库订单列表
订单详情页
订单明细扫码入库按钮
扫码绑定二维码
创建 inventory_unit
自动记录入库员
自动记录入库时间
自动关联入库员签名
更新订单明细入库数量
```

### Phase 4：位置管理

完成：

```text
位置表
单个物品设置位置
本订单批量设置位置
按订单明细设置位置
手动选择物资设置位置
pending_location 状态提醒
```

### Phase 5：扫码出库

完成：

```text
扫码识别库存单元
展示物品详情
填写领用数量
填写用途
填写项目
生成出库记录
更新剩余量
记录出库人员
```

### Phase 6：蓝牙打印机适配

完成：

```text
蓝牙搜索
连接打印机
选择打印机
保存默认打印机
根据打印机协议发送标签命令
打印失败重试
```

该阶段必须在确定打印机品牌和型号后再实施。

---

## 二十三、MVP 验收标准

### 场景 1：生成空白二维码

1. 管理员进入二维码管理；
2. 输入生成数量 100；
3. 系统创建二维码批次；
4. 系统生成 100 个唯一二维码；
5. 二维码状态为 `generated`；
6. 可以查看批次详情。

### 场景 2：打印二维码

1. 管理员进入二维码批次；
2. 点击导出标签；
3. 系统生成二维码标签文件；
4. 管理员确认已打印；
5. 二维码状态更新为 `printed`。

### 场景 3：扫码入库

1. 入库员进入待入库订单；
2. 选择某个订单；
3. 在某个订单明细下点击“扫码入库”；
4. 将空白二维码贴到新物资上；
5. 扫描该二维码；
6. 系统创建 `inventory_unit`；
7. 系统自动记录入库员、入库时间和签名；
8. 订单明细入库数量 +1；
9. 该二维码状态变为 `bound`；
10. 同一个二维码再次扫码时提示已被占用。

### 场景 4：批量设置位置

1. 某订单完成入库；
2. 入库员点击“批量设置位置”；
3. 选择本订单全部未设置位置物资；
4. 选择存放位置；
5. 系统批量更新位置；
6. 相关物资状态从 `pending_location` 变为 `in_stock`。

### 场景 5：扫码出库

1. 成员点击“扫码出库”；
2. 扫描某个库存二维码；
3. 系统展示物品信息；
4. 成员填写领用数量、用途、项目；
5. 系统生成出库记录；
6. 系统自动记录出库人员；
7. 系统更新剩余数量和物资状态。

---

## 二十四、不要做的事情

MVP 阶段不要做：

1. 不要一开始强行接蓝牙打印机；
2. 不要把二维码直接绑定到库存总表；
3. 不要把物资信息直接写死进二维码；
4. 不要允许二维码重复绑定；
5. 不要允许订单明细超量入库；
6. 不要让用户扫完码后再手动选择物品；
7. 不要让位置完全依赖自由文本；
8. 不要省略操作日志；
9. 不要跳过服务端校验；
10. 不要只在前端判断二维码是否可用。

---

## 二十五、给 Codex 的实现要求

请在现有 Taro + React + TypeScript 小程序项目中，新增“二维码系统与扫码入库模块”。

优先实现 MVP，不要立即实现复杂蓝牙打印机适配。

请按以下顺序开发：

1. 新增二维码、打印批次、订单、订单明细、物理库存单元、位置、操作日志相关 type；
2. 新增 mock 数据；
3. 新增 service 层；
4. 新增二维码管理页面；
5. 新增二维码批次详情页面；
6. 新增二维码标签导出或打印预留页面；
7. 新增待入库订单列表页面；
8. 新增订单入库详情页面；
9. 在订单明细下实现“扫码入库”按钮；
10. 实现扫码后绑定二维码到具体物理库存单元；
11. 实现二维码重复绑定拦截；
12. 实现订单明细入库进度更新；
13. 实现入库员自动签名；
14. 实现单个物资位置填写；
15. 实现订单批量位置填写；
16. 实现扫码出库；
17. 实现出库人员记录；
18. 实现操作日志记录；
19. 保证所有关键操作通过 service 层；
20. 保证页面不直接操作 mock 数据。

完成后请输出：

1. 新增文件列表；
2. 新增页面说明；
3. 新增数据模型说明；
4. 当前已实现功能；
5. 当前未实现但已预留功能；
6. 下一步建议。
