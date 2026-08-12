/**
 * CDK 上传限额（前端提示用，后端为最终防线）
 * 与后端 src/config/cdkQuota.js 默认值保持一致
 */
export const CDK_UPLOAD_LIMITS = {
  perBatch: 2000,       // 单次最多上传条数
  totalUnsold: 5000,    // 单个商品未售出（available+locked）累计上限
}
