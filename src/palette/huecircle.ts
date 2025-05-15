import type { AlpineComponent } from 'alpinejs'
import type { AlpineThis } from '../types'

interface HueCircle {
  hue: number
}

export default function (
  this: AlpineThis<HueCircle>,
  thickness = 12
): AlpineComponent<HueCircle> {
  const canvas = this.$el.querySelector<HTMLCanvasElement>('canvas[x-canvas]')
  if (!canvas) {
    throw new Error(
      "HueCircle component requires a canvas element with 'x-canvas' attribute"
    )
  }
  const handle = this.$el.querySelector<HTMLElement>('[x-handle]')!
  if (!handle) {
    throw new Error(
      "HueCircle component requires a handle element with 'x-handle' attribute"
    )
  }

  this.$el.style.position = 'relative'
  canvas.style.position = 'absolute'
  handle.style.position = 'absolute'
  handle.style.cursor = 'grab'

  const canvasSize = Math.min(this.$el.clientWidth, this.$el.clientHeight)

  if (canvasSize < 20) {
    throw new Error('HueCircle too small, minimum size is 20px x 20px')
  }

  canvas.style.width = canvas.style.height = canvasSize + 'px'

  const radius = canvasSize / 2
  const handleCircleRadius = radius - thickness / 2

  // ******************
  // variables prefixed with c are in the canvas coordinate space and
  // shouldn't be used outside of the canvas context
  // ******************

  let cSize = canvasSize
  while (cSize < 400) {
    cSize *= 2
  }
  canvas.width = canvas.height = cSize
  const cScale = cSize / canvasSize

  const cRadius = cSize / 2
  const cThickness = cScale * thickness
  const cMaskRadius = cRadius - cThickness

  function updateHandlePosition(hue: number) {
    hue = hue - 90
    const centerX = Math.cos((hue * Math.PI) / 180) * handleCircleRadius
    const centerY = Math.sin((hue * Math.PI) / 180) * handleCircleRadius
    handle.style.transform = `translate(${
      centerX + radius - handle.offsetWidth / 2
    }px, ${centerY + radius - handle.offsetHeight / 2}px)`
  }

  const ctx = canvas.getContext('2d')!
  if (!ctx) {
    throw new Error('Failed to get canvas context')
  }

  let offsetX = 0
  let offsetY = 0
  let boundStart: (ev: MouseEvent) => void
  let boundMove: (ev: MouseEvent) => void
  let boundEnd: (ev: MouseEvent) => void

  const onStart = (ctx: AlpineThis<HueCircle>, ev: MouseEvent) => {
    ev.preventDefault()
    const handleBox = handle.getBoundingClientRect()
    offsetX = ev.clientX - handleBox.left
    offsetY = ev.clientY - handleBox.top
    handle.style.cursor = 'grabbing'
    document.documentElement.style.cursor = 'grabbing'
    document.addEventListener('mousemove', boundMove)
    document.addEventListener('mouseup', boundEnd)
  }

  const onMove = (ctx: AlpineThis<HueCircle>, ev: MouseEvent) => {
    ev.preventDefault()

    const canvasBox = canvas.getBoundingClientRect()
    let centerX = canvasBox.left + canvasBox.width / 2
    let centerY = canvasBox.top + canvasBox.height / 2

    const handleCenterAX = ev.clientX - offsetX + handle.clientWidth / 2
    const handleCenterAY = ev.clientY - offsetY + handle.clientHeight / 2
    const x = handleCenterAX - centerX
    const y = handleCenterAY - centerY

    const angle = Math.atan2(y, x)
    const hue = (angle * 180) / Math.PI + 90
    ctx.hue = hue < 0 ? hue + 360 : hue
  }

  const onEnd = (ctx: AlpineThis<HueCircle>, ev: MouseEvent) => {
    ev.preventDefault()
    handle.style.cursor = 'grab'
    document.documentElement.style.cursor = 'default'
    document.removeEventListener('mousemove', boundMove)
    document.removeEventListener('mouseup', boundEnd)
  }

  function draw() {
    ctx.clearRect(0, 0, cSize, cSize)
    for (let absX = 0; absX < cSize; absX++) {
      for (let absY = 0; absY < cSize; absY++) {
        const circleX = absX - cRadius
        const circleY = absY - cRadius
        const rad = Math.sqrt(circleX * circleX + circleY * circleY)
        if (rad < cMaskRadius || rad > cRadius) {
          continue
        }

        const hue = Math.atan2(circleY, circleX) * (180 / Math.PI) + 90

        const color = `oklch(0.8123 0.1709 ${hue}deg)`
        ctx.fillStyle = color
        ctx.fillRect(absX, absY, 1, 1)
      }
    }
  }

  return {
    hue: 0,
    init() {
      boundStart = (ev) => onStart(this, ev)
      boundMove = (ev) => onMove(this, ev)
      boundEnd = (ev) => onEnd(this, ev)

      draw()

      updateHandlePosition(this.hue)
      this.$watch('hue', updateHandlePosition)
      handle.addEventListener('mousedown', boundStart)
    },

    destroy() {
      handle.removeEventListener('mousedown', boundStart)
      document.removeEventListener('mousemove', boundMove)
      document.removeEventListener('mouseup', boundEnd)
    },
  }
}
