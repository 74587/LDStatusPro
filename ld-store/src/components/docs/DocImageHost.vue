<template>
  <div class="doc-content">
    <h2 id="purpose">士多图床适合什么图片</h2>
    <p class="lead">用于上传 LD 士多物品展示所需的合规图片，并复制可访问链接填入发布或编辑页面。</p>

    <HelpPath :items="[{ label: '士多图床', to: '/ld-image' }]" />

    <h2 id="prepare">上传前准备</h2>
    <ul>
      <li>移除身份证、手机号、邮箱、卡密、密钥、二维码凭证等敏感内容。</li>
      <li>使用自己有权展示的图片，不上传侵权、违法或与物品无关的内容。</li>
      <li>按上传页当前提示检查格式、大小、数量和可能需要的 LDC；这些限制可能动态调整。</li>
      <li>优先压缩不必要的超大图片，保证文字在手机上仍清晰可读。</li>
    </ul>

    <h2 id="upload-image">上传物品图片并复制链接</h2>
    <HelpSteps :steps="uploadSteps" />
    <HelpCallout title="复制的是图片链接，不是本地文件路径" tone="info">
      发布物品时需要浏览器可访问的 HTTPS 图片地址。上传完成后使用页面提供的复制按钮，避免手动截断链接。
    </HelpCallout>

    <h2 id="history">查看上传历史</h2>
    <p>登录后可在图床页面查看自己的上传记录，重新复制链接或按页面提供的方式管理图片。删除前先确认没有正在展示的物品引用该链接。</p>

    <h2 id="result">在物品页验证结果</h2>
    <ol>
      <li>把复制的 HTTPS 链接粘贴到物品图片字段。</li>
      <li>使用发布或编辑页的预览确认图片可以加载。</li>
      <li>提交后从物品详情再次检查桌面和手机显示。</li>
      <li>图片变化后同步更新相关物品，避免留下失效链接。</li>
    </ol>

    <h2 id="troubleshooting">图片上传或显示异常</h2>
    <HelpTable :columns="issueColumns" :rows="issueRows" />

    <div class="help-actions">
      <router-link to="/ld-image">打开士多图床</router-link>
      <router-link to="/seller/products/new" class="secondary">发布物品</router-link>
    </div>
  </div>
</template>

<script setup>
import HelpCallout from './HelpCallout.vue'
import HelpPath from './HelpPath.vue'
import HelpSteps from './HelpSteps.vue'
import HelpTable from './HelpTable.vue'

const uploadSteps = [
  { title: '选择合规图片', description: '按当前页面提示选择格式、大小和数量符合要求的文件。' },
  { title: '核对上传信息', description: '确认图片内容和页面显示的费用或限制后提交。' },
  { title: '等待上传完成', description: '保持页面打开，直到看到成功结果和可复制链接。' },
  { title: '复制并预览', description: '使用复制按钮获取 HTTPS 地址，粘贴到物品图片字段。', result: '物品预览中应能正常显示该图片。' }
]
const issueColumns = [
  { key: 'symptom', label: '现象' },
  { key: 'check', label: '检查' },
  { key: 'next', label: '下一步' }
]
const issueRows = [
  { symptom: '文件无法选择或上传', check: '格式、大小、数量与登录状态', next: '按页面实时提示调整后重试' },
  { symptom: '链接复制后打不开', check: '是否完整 HTTPS 地址、上传是否成功', next: '从上传历史重新复制' },
  { symptom: '物品预览不显示', check: '字段是否多了空格、链接是否公开可访问', next: '新标签页验证链接后重新保存' },
  { symptom: '删除后物品图片失效', check: '原图片是否仍被物品引用', next: '上传替代图片并更新物品' }
]
</script>
