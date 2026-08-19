<template>
  <div class="doc-content">
    <h2 id="purpose">物品管理覆盖哪些任务</h2>
    <p class="lead">在一个列表中按状态、类型和库存筛选物品，进入编辑页更新资料，并分别管理普通库存、独立卡密和共享内容。</p>

    <HelpPath :items="[{ label: '卖家后台', to: '/seller' }, { label: '我的物品', to: '/seller/products' }]" />

    <h2 id="filters">先用筛选定位物品</h2>
    <ul>
      <li>按关键词搜索标题或物品信息。</li>
      <li>按普通物品、自动发卡等类型缩小范围。</li>
      <li>按页面显示的中文状态查看在售、审核中、暂停、售罄或其他结果。</li>
      <li>用低库存或售罄条件优先找到需要补货的物品。</li>
    </ul>

    <h2 id="inventory-actions">编辑资料与补充库存</h2>
    <HelpTable :columns="inventoryColumns" :rows="inventoryRows" caption="不同模式的库存操作不同" />
    <p>独立卡密可以按页面提供的方式追加、查看或导出；共享卡密只维护当前重复发放的内容。批量数量限制和可执行操作以管理页实时提示为准。</p>

    <HelpCallout title="导出的卡密也属于敏感信息" tone="warning">
      只在可信设备保存，使用后及时清理。不要把卡密清单粘贴到公开工单、评论或群聊。
    </HelpCallout>

    <h2 id="switch-cdk-mode">切换独立卡密与共享卡密</h2>
    <p>切换前先停止补货并确认当前订单已处理。模式切换会改变库存的解释方式，同时触发重新审核。</p>
    <HelpTable :columns="switchColumns" :rows="switchRows" caption="切换时的库存处理规则" />
    <ul>
      <li><strong>独立 → 共享：</strong>现有独立卡密会被暂停，不再参与发放；填写并启用一份共享内容。</li>
      <li><strong>共享 → 独立：</strong>当前共享内容会迁移为一条可用的独立卡密，之后需要继续补充独立库存。</li>
      <li><strong>切回独立：</strong>此前因切换而暂停的独立卡密会恢复，页面会同时展示迁移结果，以实际库存列表为准。</li>
      <li><strong>重新审核：</strong>切换后物品进入新的审核流程；审核期间或未通过时不会保证继续正常销售。</li>
    </ul>

    <HelpSteps :steps="switchSteps" />

    <h2 id="result">操作后确认</h2>
    <ol>
      <li>查看物品当前卡密模式和用户可见审核状态。</li>
      <li>独立模式核对可用、已用和暂停的卡密数量；共享模式核对共享内容是否正确。</li>
      <li>审核通过后打开商城详情：共享库存应显示 9999，独立库存应对应可用卡密。</li>
      <li>销量始终按实际成交累计，不因切换模式而当作库存数字。</li>
    </ol>

    <h2 id="troubleshooting">异常处理</h2>
    <ul>
      <li>库存突然变成 9999：检查是否切到了共享卡密，这是商城展示规则。</li>
      <li>独立卡密不再发放：检查它们是否因切到共享模式而处于暂停。</li>
      <li>切到独立后只有一条库存：共享内容只会迁移为一条独立卡密，需要继续补货。</li>
      <li>编辑后物品不可售：先查看是否正在重新审核，而不是重复切换模式。</li>
    </ul>

    <div class="help-actions">
      <router-link to="/seller/products">管理我的物品</router-link>
      <router-link to="/docs/seller-orders" class="secondary">处理订单</router-link>
    </div>
  </div>
</template>

<script setup>
import HelpCallout from './HelpCallout.vue'
import HelpPath from './HelpPath.vue'
import HelpSteps from './HelpSteps.vue'
import HelpTable from './HelpTable.vue'

const inventoryColumns = [
  { key: 'mode', label: '模式' },
  { key: 'stock', label: '库存含义' },
  { key: 'action', label: '常用操作' }
]
const inventoryRows = [
  { mode: '普通物品', stock: '卖家设置的可售数量', action: '编辑数量与履约说明' },
  { mode: '独立卡密', stock: '当前可用的逐条卡密', action: '追加、查看、导出并处理低库存' },
  { mode: '共享卡密', stock: '一份可重复发放的共享内容', action: '编辑共享内容，商城显示 9999' }
]
const switchColumns = [
  { key: 'direction', label: '切换方向' },
  { key: 'existing', label: '原库存' },
  { key: 'newMode', label: '新模式库存' },
  { key: 'review', label: '物品状态' }
]
const switchRows = [
  { direction: '独立 → 共享', existing: '独立卡密暂停并保留', newMode: '使用一份共享内容', review: '重新审核' },
  { direction: '共享 → 独立', existing: '共享内容迁移', newMode: '生成一条可用独立卡密', review: '重新审核' },
  { direction: '再次切回独立', existing: '恢复此前暂停的独立卡密', newMode: '与迁移库存一并核对', review: '重新审核' }
]
const switchSteps = [
  { title: '处理在途订单', description: '先完成待发货和异常自动发卡订单，避免交付方式中途变化。' },
  { title: '备份并核对内容', description: '独立模式按需导出库存；共享模式安全保存当前共享内容。' },
  { title: '在编辑页切换模式', description: '阅读确认提示，填写新模式所需内容后提交。' },
  { title: '等待审核并复核库存', description: '根据页面中文状态跟进，审核通过后检查详情和库存。' }
]
</script>
