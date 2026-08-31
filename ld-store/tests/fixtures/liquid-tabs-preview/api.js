import { reactive } from 'vue'
import { previewResponse } from '../liquid-tabs-data.js'

export const previewRequests = reactive([])
function rejectWrite() { throw new Error('Writes are disabled in the isolated Tab preview') }
export const api = {
  async get(url) { previewRequests.push(url); return previewResponse(url) },
  post: rejectWrite, put: rejectWrite, patch: rejectWrite, delete: rejectWrite, request: rejectWrite
}
