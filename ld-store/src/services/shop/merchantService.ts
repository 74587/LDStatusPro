import { api, type JsonValue } from '@/utils/api'
import {
  CommerceActionResponseSchema,
  MerchantConfigMutationSchema,
  MerchantConfigSchema,
  MerchantEnforcementResponseSchema
} from '@/contracts/commerce'
import { validateServiceResult, withServiceFailure } from '@/services/serviceContract'

export async function fetchMerchantConfigRequest() {
  return withServiceFailure(async () => validateServiceResult(
    await api.get('/api/shop/merchant/config', { auth: 'required' }),
    MerchantConfigSchema,
    '/api/shop/merchant/config',
    'MerchantConfig'
  ), '加载商户配置失败，请稍后重试')
}

export async function createMerchantConfigRequest(config: Record<string, JsonValue>) {
  return withServiceFailure(async () => validateServiceResult(
    await api.post('/api/shop/merchant/config', config, { auth: 'required' }),
    MerchantConfigMutationSchema,
    '/api/shop/merchant/config',
    'MerchantConfigMutation'
  ), '保存商户配置失败，请稍后重试')
}

export async function updateMerchantConfigRequest(config: Record<string, JsonValue>) {
  return withServiceFailure(async () => validateServiceResult(
    await api.put('/api/shop/merchant/config', config, { auth: 'required' }),
    MerchantConfigMutationSchema,
    '/api/shop/merchant/config',
    'MerchantConfigMutation'
  ), '更新商户配置失败，请稍后重试')
}

export async function deleteMerchantConfigRequest() {
  return withServiceFailure(async () => validateServiceResult(
    await api.delete('/api/shop/merchant/config', { auth: 'required' }),
    CommerceActionResponseSchema,
    '/api/shop/merchant/config',
    'CommerceActionResponse'
  ), '删除商户配置失败，请稍后重试')
}

export async function testMerchantCallbackRequest() {
  return withServiceFailure(async () => validateServiceResult(
    await api.post('/api/shop/merchant/test-callback', undefined, { auth: 'required' }),
    MerchantConfigMutationSchema,
    '/api/shop/merchant/test-callback',
    'MerchantCallbackResponse'
  ), '测试回调失败，请稍后重试')
}

export async function fetchMerchantEnforcementRequest() {
  return withServiceFailure(async () => validateServiceResult(
    await api.get('/api/shop/merchant/enforcement', { auth: 'required' }),
    MerchantEnforcementResponseSchema,
    '/api/shop/merchant/enforcement',
    'MerchantEnforcementResponse'
  ), '卖家权限状态加载失败')
}
