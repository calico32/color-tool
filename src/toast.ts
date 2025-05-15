import type { ToastOptions } from './toaster'

export function toast(
  message: string,
  options: Omit<Partial<ToastOptions>, 'message'> = {}
) {
  const toast: ToastOptions = {
    message: message,
    type: options.type ?? 'info',
    description: options.description ?? '',
    position: options.position ?? 'top-center',
    html: options.html ?? '',
  }

  window.dispatchEvent(
    new CustomEvent('toast-show', {
      detail: toast,
    })
  )
}
