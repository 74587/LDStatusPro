<template>
  <div class="doc-content">
    <h2 id="purpose">求购适合什么任务</h2>
    <p class="lead">当物品广场没有现成方案时，可以发布预算、期限和交付要求，让服务方先在站内洽谈，再创建求购订单支付。</p>

    <HelpPath :items="[{ label: '首页', to: '/' }, { label: '求购广场' }, { label: '发布求购', to: '/buy-requests/new' }]" />

    <h2 id="prepare">发布前准备</h2>
    <ul>
      <li>把需求拆成可验证的交付结果，写清预算、截止时间和验收方式。</li>
      <li>不要在公开描述中放手机号、邮箱、账号密码或其他敏感信息。</li>
      <li>确认不属于平台禁止发布的内容；不确定时先阅读 <router-link to="/docs/terms">服务条款</router-link>。</li>
    </ul>

    <h2 id="publish-and-chat">发布与洽谈步骤</h2>
    <HelpSteps :steps="requestSteps" />

    <HelpCallout title="先在站内确认方案，再支付" tone="warning">
      为保留完整记录，请不要在私信中绕过订单直接交换联系方式。双方确认积分、范围和交付后，通过求购订单支付，页面才会开放后续联系入口。
    </HelpCallout>

    <h2 id="buy-request-order">求购订单支付与联系方式解锁</h2>
    <p>选定服务方后，按页面流程创建求购订单。核对服务方、需求标题、约定 LDC 和交付说明，再发起支付。支付成功后回到求购订单详情刷新状态，按页面提示查看双方联系入口。</p>
    <dl class="status-list">
      <div><dt>等待确认或洽谈</dt><dd>继续使用站内消息沟通范围、价格和期限，暂时不要交付敏感凭证。</dd></div>
      <div><dt>等待支付 / 支付中</dt><dd>核对订单后完成 LDC 支付；正在同步时不要重复创建订单。</dd></div>
      <div><dt>已支付 / 进行中</dt><dd>按约定开始交付，重要变更继续在站内留下文字记录。</dd></div>
      <div><dt>已完成或已关闭</dt><dd>交易结束；如有争议，整理订单、消息和交付证据后反馈。</dd></div>
    </dl>

    <h2 id="for-providers">服务方如何处理</h2>
    <p>服务方从求购详情发起洽谈，在卖家后台的订单管理中切换到“求购服务”查看相关订单。商品销售和求购服务分开筛选，避免把普通物品待发货与求购履约混在一起。</p>

    <h2 id="troubleshooting">异常处理</h2>
    <ul>
      <li>找不到求购：到个人中心的“我的求购”确认审核状态和当前可见性。</li>
      <li>支付后未解锁入口：刷新求购订单详情，确认订单不是仍停留在等待支付。</li>
      <li>对方要求站外先交易：暂停操作，继续使用平台订单和消息；必要时举报。</li>
      <li>履约争议：保留需求原文、调价或承诺记录、订单号和交付证据。</li>
    </ul>

    <div class="help-actions">
      <router-link to="/buy-requests/new">发布求购</router-link>
      <router-link to="/user/messages" class="secondary">查看消息</router-link>
      <router-link to="/user/buy-requests" class="secondary">我的求购</router-link>
    </div>
  </div>
</template>

<script setup>
import HelpCallout from './HelpCallout.vue'
import HelpPath from './HelpPath.vue'
import HelpSteps from './HelpSteps.vue'

const requestSteps = [
  { title: '写清需求', description: '填写标题、分类、预算、期限、交付标准和必要背景。' },
  { title: '提交并等待可见状态', description: '发布后到“我的求购”查看页面显示的中文审核状态。' },
  { title: '在站内洽谈', description: '比较服务方方案，确认范围、LDC、期限和交付方式。' },
  { title: '创建订单并支付', description: '选定服务方后通过求购订单完成 LDC 支付。', result: '支付确认后按订单页提示获取后续联系入口。' }
]
</script>
