import { type AlpineComponent } from 'alpinejs'
import { lerp, unlerp } from 'culori/fn'
import { timedRaf } from '../common/timing'
import type { AlpineThis } from '../types'
import type { PaletteGenerator } from './palettegenerator'

interface PaletteFunction extends PaletteGenerator {}

export default function (
  this: AlpineThis<PaletteFunction>
): AlpineComponent<PaletteFunction> {
  const canvas = this.$el.querySelector<HTMLCanvasElement>('canvas[x-canvas]')!
  if (!canvas) {
    throw new Error(
      "PaletteFunction component requires a canvas element with 'x-canvas' attribute"
    )
  }
  const minHandle = this.$el.querySelector<HTMLElement>('[x-handle-min]')!
  if (!minHandle) {
    throw new Error(
      "PaletteFunction component requires a handle element with 'x-handle-min' attribute"
    )
  }

  const maxHandle = this.$el.querySelector<HTMLElement>('[x-handle-max]')!
  if (!maxHandle) {
    throw new Error(
      "PaletteFunction component requires a handle element with 'x-handle-max' attribute"
    )
  }

  const saturationRange = [0, 1] as const
  const lightnessRange = [0, 1] as const

  this.$el.style.position = 'relative'
  canvas.style.position = 'absolute'
  minHandle.style.position = maxHandle.style.position = 'absolute'
  minHandle.style.cursor = maxHandle.style.cursor = 'grab'

  const ctx = canvas.getContext('2d')!
  if (!ctx) {
    throw new Error('Failed to get canvas context')
  }

  let offsetX = 0
  let offsetY = 0
  let currentHandle: HTMLElement | null = null
  let boundStart: (ev: MouseEvent) => void
  let boundMove: (ev: MouseEvent) => void
  let boundEnd: (ev: MouseEvent) => void

  const onStart = (ctx: AlpineThis<PaletteFunction>, ev: MouseEvent) => {
    ev.preventDefault()
    const handle = ev.target as HTMLElement
    if (handle !== minHandle && handle !== maxHandle) {
      return
    }

    currentHandle = handle

    const handleBox = handle.getBoundingClientRect()
    offsetX = ev.clientX - handleBox.left
    offsetY = ev.clientY - handleBox.top
    handle.style.cursor = 'grabbing'
    document.documentElement.style.cursor = 'grabbing'
    document.addEventListener('mousemove', boundMove)
    document.addEventListener('mouseup', boundEnd)
  }

  const onMove = (ctx: AlpineThis<PaletteFunction>, ev: MouseEvent) => {
    ev.preventDefault()
    if (!currentHandle) return

    const canvasBox = canvas.getBoundingClientRect()
    const x = ev.clientX - offsetX - canvasBox.x + currentHandle.offsetWidth / 2
    const y =
      ev.clientY - offsetY - canvasBox.y + currentHandle.offsetHeight / 2

    const percentX = unlerp(originX, maxX, x)
    const percentY = unlerp(originY, maxY, y)

    const sat = clamp(lerp(...saturationRange, percentX), ...saturationRange)
    const lightness = clamp(
      lerp(...lightnessRange, percentY),
      ...lightnessRange
    )

    setHandlePosition(currentHandle, sat, lightness)
    requestDraw(ctx)

    const isMin = currentHandle === minHandle
    if (isMin) {
      ctx.minSaturation = sat
      ctx.minLightness = lightness
    } else {
      ctx.maxSaturation = sat
      ctx.maxLightness = lightness
    }
  }

  const padding = 8
  const fontSize = 16
  const originX = fontSize + padding
  const originY = canvas.height - fontSize - padding
  const maxX = canvas.width - 1
  const maxY = 0

  function clamp(value: number, min: number, max: number) {
    return Math.max(min, Math.min(max, value))
  }

  function setHandlePosition(
    handle: HTMLElement,
    sat: number,
    lightness: number
  ) {
    const x = lerp(originX, maxX, unlerp(...saturationRange, sat))
    const y = lerp(originY, maxY, unlerp(...lightnessRange, lightness))
    handle.style.transform = `translate(${x - handle.offsetWidth / 2}px, ${
      y - handle.offsetHeight / 2
    }px)`
  }

  const onEnd = (ctx: AlpineThis<PaletteFunction>, ev: MouseEvent) => {
    ev.preventDefault()
    minHandle.style.cursor = 'grab'
    maxHandle.style.cursor = 'grab'
    document.documentElement.style.cursor = 'default'
    document.removeEventListener('mousemove', boundMove)
    document.removeEventListener('mouseup', boundEnd)
  }

  let drawRequested = false
  function requestDraw(context: AlpineThis<PaletteFunction>) {
    if (drawRequested) return
    drawRequested = true
    timedRaf('palettefunction', () => {
      drawRequested = false
      update(context)
    })
  }

  function update(context: AlpineThis<PaletteFunction>) {
    setHandlePosition(minHandle, context.minSaturation, context.minLightness)
    setHandlePosition(maxHandle, context.maxSaturation, context.maxLightness)

    let steps = (context.$data as any).steps ?? 6
    steps--

    ctx.save()
    ctx.translate(0.5, 0.5)

    ctx.clearRect(0, 0, canvas.width, canvas.height)

    const gridLines = 10

    ctx.font = `${fontSize}px Inter`
    ctx.strokeStyle = 'black'
    ctx.lineWidth = 2

    // draw x-axis
    ctx.beginPath()
    ctx.moveTo(originX, originY)
    ctx.lineTo(maxX, originY)
    ctx.stroke()
    ctx.closePath()

    // draw y-axis
    ctx.beginPath()
    ctx.moveTo(originX, originY)
    ctx.lineTo(originX, maxY)
    ctx.stroke()
    ctx.closePath()

    // draw grid lines
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.2)'
    ctx.lineWidth = 1
    for (let i = 1; i <= gridLines; i++) {
      // draw x-axis grid line
      ctx.beginPath()
      const percent = i / gridLines
      const x = lerp(originX, maxX, percent)
      ctx.moveTo(x, originY)
      ctx.lineTo(x, maxY)
      ctx.stroke()
      ctx.closePath()

      // draw y-axis grid line
      ctx.beginPath()
      const y = lerp(originY, maxY, percent)
      ctx.moveTo(originX, y)
      ctx.lineTo(maxX, y)
      ctx.stroke()
      ctx.closePath()
    }

    // draw axis labels
    ctx.fillStyle = 'black'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText('Saturation', lerp(originX, maxX, 0.5), originY + fontSize)
    ctx.save()
    ctx.rotate(-Math.PI / 2)
    const m = ctx.getTransform()
    const yLabelPosition = m.inverse().transformPoint({
      x: originX - fontSize,
      y: lerp(originY, maxY, 0.5),
    })
    ctx.fillText('Lightness', yLabelPosition.x, yLabelPosition.y)
    ctx.restore()

    // draw line segment for function

    const x1 = lerp(
      originX,
      maxX,
      unlerp(...saturationRange, context.minSaturation)
    )
    const y1 = lerp(
      originY,
      maxY,
      unlerp(...lightnessRange, context.minLightness)
    )

    const x2 = lerp(
      originX,
      maxX,
      unlerp(...saturationRange, context.maxSaturation)
    )
    const y2 = lerp(
      originY,
      maxY,
      unlerp(...lightnessRange, context.maxLightness)
    )

    ctx.strokeStyle = 'black'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.lineTo(x1, y1)
    ctx.lineTo(x2, y2)
    ctx.stroke()
    ctx.closePath()

    // draw step points
    ctx.fillStyle = 'black'
    ctx.strokeStyle = 'white'
    ctx.lineWidth = 2
    for (let i = 0; i <= steps; i++) {
      const percent = i / steps
      const x = lerp(x1, x2, percent)
      const y = lerp(y1, y2, percent)
      ctx.beginPath()
      ctx.arc(x, y, 5, 0, Math.PI * 2)
      ctx.fill()
      ctx.stroke()
      ctx.closePath()
    }

    ctx.restore()
  }

  return <AlpineComponent<PaletteFunction>>{
    init() {
      boundStart = (ev) => onStart(this, ev)
      boundMove = (ev) => onMove(this, ev)
      boundEnd = (ev) => onEnd(this, ev)

      update(this)

      minHandle.addEventListener('mousedown', boundStart)
      maxHandle.addEventListener('mousedown', boundStart)

      this.$watch('steps', () => {
        update(this)
      })
      this.$watch('minSaturation', () => requestDraw(this))
      this.$watch('maxSaturation', () => requestDraw(this))
      this.$watch('minLightness', () => requestDraw(this))
      this.$watch('maxLightness', () => requestDraw(this))
    },

    destroy() {
      minHandle.removeEventListener('mousedown', boundStart)
      maxHandle.removeEventListener('mousedown', boundStart)
      document.removeEventListener('mousemove', boundMove)
      document.removeEventListener('mouseup', boundEnd)
    },
  }
}
