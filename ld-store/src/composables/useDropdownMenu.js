import { nextTick, ref } from 'vue'

// Navigation disclosure: retain native link/Tab behavior, with optional arrow navigation.
export function useDropdownMenu() {
  const isOpen = ref(false)
  const rootRef = ref(null)
  const triggerRef = ref(null)
  const menuRef = ref(null)

  function close({ restoreFocus = false } = {}) {
    if (restoreFocus) triggerRef.value?.focus({ preventScroll: true })
    isOpen.value = false
  }

  function toggle() {
    isOpen.value = !isOpen.value
  }

  function handleFocusOut(event) {
    if (!rootRef.value?.contains(event.relatedTarget)) close()
  }

  async function handleKeydown(event) {
    if (event.altKey || event.ctrlKey || event.metaKey) return
    if (event.key === 'Escape' && isOpen.value) {
      event.preventDefault()
      event.stopPropagation()
      close({ restoreFocus: true })
      return
    }

    const isArrow = event.key === 'ArrowDown' || event.key === 'ArrowUp'
    const isEdge = event.key === 'Home' || event.key === 'End'
    if (!isArrow && !(isEdge && isOpen.value)) return

    event.preventDefault()
    isOpen.value = true
    await nextTick()
    // A route change / second click may have closed it while Vue was updating.
    if (!isOpen.value) return

    const items = Array.from(menuRef.value?.querySelectorAll('a[href], button:not([disabled])') || [])
    if (!items.length) return
    const current = items.indexOf(event.target)
    let index
    if (event.key === 'Home') index = 0
    else if (event.key === 'End') index = items.length - 1
    else if (current === -1) index = event.key === 'ArrowUp' ? items.length - 1 : 0
    else index = (current + (event.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length
    items[index].focus()
  }

  return { isOpen, rootRef, triggerRef, menuRef, close, toggle, handleFocusOut, handleKeydown }
}
