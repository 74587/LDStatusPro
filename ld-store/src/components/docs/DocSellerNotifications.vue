<template>
  <div class="doc-content">
    <h2 id="overview">用 Telegram 接收重要通知</h2>
    <p class="lead">不常打开网站，也可以通过 LD 士多官方 Telegram 机器人接收待发货、退款待处理等重要经营提醒。目前支持 Telegram 私聊通知，消息类型由系统固定。</p>
    <HelpPath :items="[{ label: '卖家后台', to: '/seller' }, { label: '通知设置', to: '/seller/notifications' }]" />

    <h2 id="connect-telegram">连接并开启通知</h2>
    <HelpSteps :steps="bindingSteps" />
    <p>电脑端可以用手机扫描页面中的二维码；手机端直接打开 Telegram。无法自动唤起时，可复制绑定链接，或展开备用链接。链接有效期为 10 分钟，请勿转发给他人；过期后回到通知设置重新生成。</p>
    <HelpCallout title="绑定在 Telegram 内完成" tone="info">核对机器人显示的平台账号后，点击「确认绑定并开启」即可，无需切回网站再次确认，也无需填写 Chat ID、手机号或网站密码。直接搜索机器人后点击 Start，只会显示使用说明；绑定请从网站通知设置发起。</HelpCallout>

    <h2 id="test-message">发送测试消息</h2>
    <p>通知设置显示「已开启」后，点击「发送测试通知」，再到已绑定账号与机器人的私聊中查看消息。</p>
    <HelpCallout title="测试消息可能延迟几秒，请稍候" tone="info">
      出现「测试通知已排队」提示后，消息可能需要几秒才到达 Telegram。短暂未收到不代表绑定失败，不用立即解绑或反复点击测试。网络状况或发送排队也可能让等待时间更长。
    </HelpCallout>
    <ul>
      <li><strong>已开启：</strong>说明账号已绑定并开启通知，可结合接收账号确认是否绑定正确。</li>
      <li><strong>等待发送 / 正在发送：</strong>消息仍在处理，页面会自动更新发送结果。</li>
      <li><strong>Telegram 已接受：</strong>Telegram 已接收消息，不代表你已阅读，也不保证手机立即弹出提醒。</li>
    </ul>
    <p>每分钟最多发送一次测试通知。如果等待约 1 分钟仍未收到，请按下方步骤检查。</p>

    <h2 id="not-received">没有收到消息时怎么检查</h2>
    <ol>
      <li>确认网站显示「已开启」，接收账号与你正在使用的 Telegram 账号一致。如果显示「等待确认」，先在机器人内完成绑定确认。</li>
      <li>直接打开与机器人的私聊查看，不要只等待手机弹窗；同时检查 Telegram 网络连接、会话静音和系统通知权限。</li>
      <li>如果显示「已暂停」，先开启通知；如果曾屏蔽机器人，先在 Telegram 取消屏蔽，再回网站显式开启通知。仅取消屏蔽不会自动恢复接收。</li>
      <li>查看「最近发送」结果。显示失败时，按渠道状态处理后稍后重试；显示「发送结果待核对」时，先确认私聊中是否已经收到，避免重复操作。</li>
      <li>持续无法接收时，可向平台反馈大致操作时间和页面显示的状态，无需提供绑定链接或账号密码。</li>
    </ol>

    <h2 id="notification-scope">会收到哪些通知</h2>
    <ul>
      <li><strong>待发货订单：</strong>普通物品支付后的首次提醒，以及 24、48、70 小时精选节点。</li>
      <li><strong>退款处理：</strong>新申请、截止前 3 小时，以及重要退款结果。</li>
      <li><strong>库存与经营状态：</strong>零库存下架预警、实际下架，以及履约交易限制生效或解除。</li>
    </ul>
    <p>只接收开启后的新事件和之后到达的提醒节点，不批量补发历史站内消息。请通过通知中的官网按钮处理订单；机器人内不直接办理发货或退款。</p>
    <HelpCallout title="仍需按订单期限处理" tone="warning">站内通知继续保留。通知延迟或未读，不会延长发货或退款处理期限，请以订单详情显示的截止时间为准。</HelpCallout>

    <h2 id="manage-channel">暂停、恢复与更换账号</h2>
    <dl class="definition-list">
      <div><dt>暂停通知</dt><dd>临时停止接收，保留账号绑定；需要时点击「开启通知」恢复。也可在机器人私聊中发送 /stop 暂停。</dd></div>
      <div><dt>更换账号</dt><dd>从「账号管理」发起新的绑定，在目标 Telegram 账号中确认。新账号确认前，当前绑定和通知状态保持不变。</dd></div>
      <div><dt>解除绑定</dt><dd>确认后停止向该账号发送通知，再次接收需要重新连接。若只是暂时停收，使用「暂停通知」即可。</dd></div>
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
  { title: '查看绑定结果', description: '机器人回复成功后，回到通知设置查看「已开启」状态，并发送一条测试通知。' }
]
</script>
