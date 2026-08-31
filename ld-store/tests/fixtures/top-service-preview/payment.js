// Force the blocked-popup path: never navigate to a real payment provider.
export function preparePaymentPopup() { return null }
export function cleanupPreparedTab() {}
export function openPaymentPopup() { throw new Error('Real payment is disabled in preview') }
export function watchPaymentPopup() { return () => {} }
