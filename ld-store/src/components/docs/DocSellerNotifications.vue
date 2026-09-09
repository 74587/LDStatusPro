<template>
  <div class="doc-content">
    <h2 id="overview">使用 Telegram 卖家工作台</h2>
    <p class="lead">连接 LD 士多官方 Telegram 机器人后，可以在手机上查看经营待办和经营概览、处理退款、查看与下架自己的商品，同时接收待发货、退款等重要提醒。</p>
    <HelpPath :items="[{ label: '卖家后台', to: '/seller' }, { label: '通知设置', to: '/seller/notifications' }]" />

    <h2 id="connect-telegram">连接卖家工作台</h2>
    <HelpSteps :steps="bindingSteps" />
    <p>电脑端可以用手机扫描页面中的二维码；手机端直接打开 Telegram。无法自动唤起时，可复制绑定链接，或展开备用链接。链接有效期为 10 分钟，请勿转发给他人；过期后回到通知设置重新生成。</p>
    <HelpCallout title="绑定在 Telegram 内完成" tone="info">核对机器人显示的平台账号后，点击「确认绑定并开启」即可，无需切回网站再次确认，也无需填写 Chat ID、手机号或网站密码。绑定完成后，发送 /menu 可随时打开卖家工作台。</HelpCallout>

    <h2 id="workspace">工作台可以做什么</h2>
    <ul>
      <li><strong>我的待办：</strong>按业务截止时间查看待处理退款、待发货订单和零库存预警。</li>
      <li><strong>退款处理：</strong>查看申请摘要，核对订单和金额后二次确认同意退款，或填写 5–500 个字的拒绝理由。拒绝理由会同步给买家。</li>
      <li><strong>经营概览：</strong>查看今日、近 7 天、近 30 天的订单量和销售额，以及当前待办和上架商品数量。销售额不是利润或可提现余额。</li>
      <li><strong>我的商品：</strong>查看自己已上架商品的价格、库存和状态，按名称或 ID 搜索，并在二次确认后单件下架。</li>
    </ul>
    <p>发货、完整争议材料、商品编辑、重新上架、改价和库存编辑仍在官网处理。机器人不会展示商品卡密，也不会要求提供网站密码或支付密钥。</p>
    <HelpCallout title="操作结果以最新业务状态为准" tone="warning">退款与商品下架会在执行前重新核验归属和状态。网站与 Telegram 同时操作时，以服务端最终结果为准；退款结果待核对时，请勿重复退款。</HelpCallout>

    <h2 id="notification-scope">会收到哪些主动通知</h2>
    <ul>
      <li><strong>待发货订单：</strong>普通物品支付后的首次提醒，以及 24、48、70 小时精选节点。</li>
      <li><strong>退款处理：</strong>新申请、截止前 3 小时，以及重要退款结果。待处理通知可直接打开申请、同意或拒绝。</li>
      <li><strong>库存与经营状态：</strong>零库存下架预警、实际下架，以及履约交易限制生效或解除。</li>
    </ul>
    <p>机器人交互回复和主动通知共用发送队列，通常会在几秒内到达。短暂等待不代表绑定或操作失败，请不要反复点击危险操作。</p>
    <HelpCallout title="仍需按订单期限处理" tone="warning">站内通知继续保留。通知延迟或未读，不会延长发货或退款处理期限，请以订单详情显示的截止时间为准。</HelpCallout>

    <h2 id="not-received">机器人没有响应时怎么检查</h2>
    <ol>
      <li>确认网站显示「已开启」，接收账号与你正在使用的 Telegram 账号一致。如果显示「等待确认」，先在机器人内完成绑定确认。</li>
      <li>打开与机器人的私聊并发送 /menu。按钮操作和主动通知可能有几秒延迟，请先等待，不要连续点击。</li>
      <li>如果曾屏蔽机器人，先在 Telegram 取消屏蔽。工作台会恢复可用；主动通知仍需回网站点击「恢复通知」。</li>
      <li>拒绝退款理由和商品搜索必须回复机器人指定的提示消息；普通文字不会自动关联订单或商品。需要退出时发送 /cancel。</li>
      <li>持续无法使用时，可向平台反馈大致操作时间和页面状态，无需提供绑定链接、账号密码、卡密或支付密钥。</li>
    </ol>

    <h2 id="manage-channel">暂停、恢复与解除绑定</h2>
    <dl class="definition-list">
      <div><dt>暂停通知</dt><dd>临时停止主动提醒，保留绑定；工作台查询、退款处理、商品下架和操作回执仍可使用。也可在机器人私聊中发送 /stop。</dd></div>
      <div><dt>恢复通知</dt><dd>回到网站通知设置点击「恢复通知」。如果此前屏蔽过机器人，需要先在 Telegram 取消屏蔽。</dd></div>
      <div><dt>解除绑定</dt><dd>停止主动通知，并撤销该 Telegram 账号的全部工作台能力。旧确认按钮和未执行操作会失效；再次使用需要重新连接。</dd></div>
    </dl>
    <div class="help-actions">
      <router-link to="/seller/notifications">打开通知设置</router-link>
      <router-link to="/seller/orders" class="secondary">处理卖家订单</router-link>
    </div>
  </div>
</template>
<script setup>
import HelpCallout from './HelpCallout.vue'
import HelpPath from './HelpPath.vue'
import HelpSteps from './HelpSteps.vue'
const bindingSteps = [
  { title: '登录网站并发起连接', description: '使用需要接收通知的卖家账号登录，进入「卖家后台 → 通知设置」，点击「连接 Telegram」。' },
  { title: '打开官方机器人', description: '通过页面链接或二维码进入 Telegram；首次使用请点击 Start。' },
  { title: '核对账号并确认', description: '确认机器人显示的是自己的平台账号，再点击「确认绑定并开启」。' },
  { title: '打开卖家工作台', description: '绑定成功后点击机器人中的「打开卖家工作台」，或发送 /menu。已有绑定会自动获得工作台能力。' }
]
</script>
