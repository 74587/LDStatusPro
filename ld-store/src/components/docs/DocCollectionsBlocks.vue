<template>
  <div class="doc-content">
    <h2 id="purpose">收藏与不感兴趣的区别</h2>
    <p class="lead">“收藏”用于留下想稍后查看的物品；“不感兴趣”用于隐藏不想再看到的物品。两种状态互斥，同一件物品不会同时出现在两个列表中。</p>

    <HelpPath :items="[{ label: '右上角头像' }, { label: '收藏与拉黑', to: '/user/favorites' }]" />

    <HelpTable :columns="comparisonColumns" :rows="comparisonRows" caption="两种状态的用途和结果" />

    <h2 id="manage-lists">查看和管理列表</h2>
    <ul>
      <li>打开“收藏与拉黑”，切换“我的收藏”或“不感兴趣”页签。</li>
      <li>页签上的数字是当前列表总数；可以在每个页签中按物品名称搜索。</li>
      <li>收藏列表支持查看详情、移除收藏，或直接标记为不感兴趣。</li>
      <li>不感兴趣列表保留恢复入口，避免误操作后无法找回。</li>
    </ul>

    <h2 id="block-product">将物品标记为不感兴趣</h2>
    <HelpSteps :steps="blockSteps" />
    <HelpCallout title="确认前会告知影响" tone="danger">
      不感兴趣是个人化隐藏操作。平台会在执行前再次确认，并提示该物品将从公开浏览位置中隐藏；如已收藏，也会同时移出收藏。
    </HelpCallout>

    <h2 id="hidden-scope">隐藏范围与保留的记录</h2>
    <p>登录后，已标记的物品会从平台的公开商品浏览请求中筛除，包括物品广场、搜索与分类、商家主页、热榜、物品详情和外链跳转。这项设置只影响你的账号，不会下架物品，也不会影响其他用户。</p>
    <p>已产生的订单、评论、举报等交易与安全记录仍会保留；卖家也仍可在经营后台管理自己的物品。这样可以保存履约和争议处理所需的证据。</p>

    <h2 id="restore-product">恢复已隐藏的物品</h2>
    <HelpSteps :steps="restoreSteps" />
    <HelpCallout title="恢复不等于收藏" tone="info">
      恢复展示后，如果物品仍符合上架条件，它可能重新出现在公开列表中；系统不会自动把它加回收藏。
    </HelpCallout>

    <div class="help-actions">
      <router-link to="/user/favorites">打开收藏与拉黑</router-link>
      <router-link to="/" class="secondary">返回物品广场</router-link>
    </div>
  </div>
</template>

<script setup>
import HelpCallout from './HelpCallout.vue'
import HelpPath from './HelpPath.vue'
import HelpSteps from './HelpSteps.vue'
import HelpTable from './HelpTable.vue'

const comparisonColumns = [
  { key: 'state', label: '状态' },
  { key: 'use', label: '适合场景' },
  { key: 'result', label: '结果' }
]

const comparisonRows = [
  { state: '我的收藏', use: '想稍后对比或购买', result: '保存到收藏页签，不改变公开列表的展示' },
  { state: '不感兴趣', use: '不想再看到某件物品', result: '从个人账号的公开商品浏览中隐藏' }
]

const blockSteps = [
  { title: '找到操作入口', description: '在物品详情页点击“不感兴趣”，或在收藏列表中选择同名操作。' },
  { title: '阅读二次确认', description: '确认隐藏范围，以及已收藏状态会被取消。' },
  { title: '确认不感兴趣', description: '处理成功后页面会给出提示，并立即从当前的公开列表或收藏中移除。', result: '可随时到“不感兴趣”页签查看。' }
]

const restoreSteps = [
  { title: '打开不感兴趣页签', description: '从右上角头像菜单进入“收藏与拉黑”。' },
  { title: '查找物品', description: '翻页或按名称搜索目标物品。' },
  { title: '点击恢复展示', description: '恢复是低风险操作，无需再次确认。', result: '成功后该物品从不感兴趣列表移除。' }
]
</script>
