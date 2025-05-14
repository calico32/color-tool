import type { AlpineComponent } from 'alpinejs'
import type { AlpineThis, Persist } from '../types'

export interface Draggable {
  x: Persist<number>
  y: Persist<number>
}

export default function (
  this: AlpineThis<Draggable>,
  name: string
): AlpineComponent<Draggable> {
  if (typeof name !== 'string') {
    throw new Error('Draggable component requires a name.')
  }
  if (name.length === 0) {
    throw new Error('Draggable component requires a name.')
  }

  const header = this.$el.querySelector<HTMLElement>('[x-draggable-header]')
  if (!header) {
    throw new Error(
      "Draggable component requires a header element with 'x-draggable-header' attribute"
    )
  }

  let offsetX = 0
  let offsetY = 0

  let boundStart: (ev: MouseEvent) => void
  let boundMove: (ev: MouseEvent) => void
  let boundEnd: (ev: MouseEvent) => void

  const onStart = (ctx: AlpineThis<Draggable>, ev: MouseEvent) => {
    ev.preventDefault()
    const box = ctx.$el.getBoundingClientRect()
    offsetX = ev.clientX - box.left
    offsetY = ev.clientY - box.top
    header.style.cursor = 'grabbing'
    document.addEventListener('mousemove', boundMove)
    document.addEventListener('mouseup', boundEnd)
  }

  const onMove = (ctx: AlpineThis<Draggable>, ev: MouseEvent) => {
    ev.preventDefault()
    const x = ev.clientX - offsetX
    const y = ev.clientY - offsetY
    ctx.$el.style.left = `${x}px`
    ctx.$el.style.top = `${y}px`
  }

  const onEnd = (ctx: AlpineThis<Draggable>, ev: MouseEvent) => {
    ev.preventDefault()
    header.style.cursor = 'grab'
    document.removeEventListener('mousemove', boundMove)
    document.removeEventListener('mouseup', boundEnd)
    const style = window.getComputedStyle(ctx.$el)
    const left = parseInt(style.left, 10)
    const top = parseInt(style.top, 10)
    ctx.x = isNaN(left) ? 0 : left
    ctx.y = isNaN(top) ? 0 : top
  }

  return {
    x: this.$persist(0).as(`_x_draggable-${name}-x`),
    y: this.$persist(0).as(`_x_draggable-${name}-y`),

    init() {
      this.$el.style.left = `${this.x}px`
      this.$el.style.top = `${this.y}px`
      boundStart = (ev) => onStart(this, ev)
      boundMove = (ev) => onMove(this, ev)
      boundEnd = (ev) => onEnd(this, ev)
      header.addEventListener('mousedown', boundStart)
    },

    destroy() {
      header.style.cursor = 'grab'
      header.removeEventListener('mousedown', boundStart)
      document.removeEventListener('mousemove', boundMove)
      document.removeEventListener('mouseup', boundEnd)
    },
  }
}
