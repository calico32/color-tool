import type { AlpineComponent } from 'alpinejs'
import {
  convertOkhslToOklab,
  formatCss,
  lerp,
  modeOklab,
  modeOklch,
  round,
  useMode,
  type Color,
  type Okhsl,
} from 'culori/fn'
import { timedRaf } from '../common/timing'
import { toast } from '../toast'
import type { AlpineThis, Persist } from '../types'

useMode(modeOklch) // required to format colors as oklch
useMode(modeOklab) // required to format colors as oklab

interface PaletteColor {
  css: string
  display: string
}

export interface PaletteGenerator {
  /** hues in degrees */
  hues: Persist<Hue[]>
  selectedHue: string | null
  hueCircleHue: number
  steps: Persist<number>
  minSaturation: Persist<number>
  maxSaturation: Persist<number>
  minLightness: Persist<number>
  maxLightness: Persist<number>
  palette: PaletteColor[][]

  reset(): void
  getPermalink(): URL
  copyPermalink(): void
  copyPalette(
    format: 'css' | 'tailwind' | 'json' | 'json-arrays' | 'json-flat'
  ): void
  restoreState(): void
  computePalette(): void
  colorForHue(hue: number, selected: boolean): string
  addHue(): void
  moveHue(index: number, to: number): void
  updateHue(id: string, hue: string): void
  deleteHue(id: string): void
}

interface PaletteGeneratorState {
  h: (number | [number, string])[]
  st: number
  s1: number
  s2: number
  l1: number
  l2: number
}

interface Hue {
  id: string
  name?: string
  value: number
}

function newHue(value: number | readonly [number, string]): Hue {
  const id = Math.random().toString(36).substring(2, 15)
  if (Array.isArray(value)) {
    return { id, name: value[1], value: value[0] }
  }

  return { id, value: value as number }
}

function debounce<T extends (...args: any[]) => any>(
  func: T,
  waitMs: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null
  return function (...args: Parameters<T>) {
    if (timeout) clearTimeout(timeout)
    timeout = setTimeout(() => func(...args), waitMs)
  }
}

/**
 * KeysFor\<T, V> is the union of all keys of T whose values extends V, including
 * nullable values.
 */
type KeysFor<T, V> = {
  [K in keyof T]-?: NonNullable<T[K]> extends never
    ? never
    : NonNullable<T[K]> extends V
    ? K
    : never
}[keyof T]

function roundColor(n: number): <T extends Color>(color: T) => T {
  const r = round(n)
  return (color) => {
    color = { ...color }
    for (const [k, v] of Object.entries(color)) {
      if (typeof v == 'number') {
        color[k as KeysFor<Color, number>] = r(v)
      }
    }
    return color
  }
}

const defaultHues = [
  [0, 'rose'],
  [30, 'apricot'],
  [60, 'orange'],
  [90, 'amber'],
  [120, 'lime'],
  [150, 'emerald'],
  [180, 'teal'],
  [210, 'cyan'],
  [240, 'ocean'],
  [270, 'blue'],
  [300, 'purple'],
  [330, 'magenta'],
] as const

export default function (
  this: AlpineThis<PaletteGenerator>
): AlpineComponent<PaletteGenerator> {
  let boundHandler: (ev: MouseEvent) => void
  let handler = (ctx: AlpineThis<PaletteGenerator>, ev: MouseEvent) => {
    if (ev.target === document.body) {
      ev.preventDefault()
      ctx.selectedHue = null
    }
  }

  const updateUrl = debounce((ctx: AlpineThis<PaletteGenerator>) => {
    const url = ctx.getPermalink()
    const path = url.toString().replace(url.origin, '')
    history.replaceState({}, '', path)
  }, 250)

  let computeRequested = false
  function requestCompute(ctx: AlpineThis<PaletteGenerator>) {
    if (computeRequested) return
    computeRequested = true
    timedRaf('palettegenerator', () => {
      computeRequested = false
      ctx.computePalette()
      updateUrl(ctx)
    })
  }

  return {
    hues: this.$persist(defaultHues.map(newHue)),
    selectedHue: null,
    hueCircleHue: 0,
    steps: this.$persist(10),
    minSaturation: this.$persist(0.8).as('_x_min-saturation'),
    maxSaturation: this.$persist(1).as('_x_max-saturation'),
    minLightness: this.$persist(0.08).as('_x_min-lightness'),
    maxLightness: this.$persist(0.954).as('_x_max-lightness'),

    palette: [],

    reset() {
      if (!confirm('Are you sure you want to reset the generator?')) {
        return
      }

      this.hues = defaultHues.map(newHue)
      this.selectedHue = null
      this.hueCircleHue = 0
      this.steps = 10
      this.minSaturation = 0.8
      this.maxSaturation = 1
      this.minLightness = 0.08
      this.maxLightness = 0.954
      this.palette = []
      this.computePalette()
    },

    getPermalink() {
      const url = new URL(window.location.href)
      const state: PaletteGeneratorState = {
        h: this.hues.map((h) => (h.name ? [h.value, h.name] : h.value)),
        st: Number(this.steps),
        s1: Number(this.minSaturation),
        s2: Number(this.maxSaturation),
        l1: Number(this.minLightness),
        l2: Number(this.maxLightness),
      }
      const stateString = btoa(JSON.stringify(state))
      url.hash = stateString
      return url
    },

    copyPermalink() {
      const url = this.getPermalink()
      navigator.clipboard.writeText(url.toString()).then(() => {
        alert('Permalink copied to clipboard!')
      })
    },

    copyPalette(format) {
      switch (format) {
        case 'css': {
          const palette = this.palette.flatMap((swatch, i) => {
            const hue = this.hues[i]
            const name = hue.name || `h${hue.value}`
            return swatch
              .toReversed()
              .map((color, j) => `  --${name}-${j + 1}: ${color.css};`)
          })

          const css = `:root {\n${palette.join('\n')}\n}`
          navigator.clipboard.writeText(css).then(() => {
            toast('Copied palette to clipboard as CSS variables', {
              type: 'success',
            })
          })
          break
        }
        case 'tailwind': {
          const palette = this.palette.flatMap((swatch, i) => {
            const hue = this.hues[i]
            const name = hue.name || `h${hue.value}`
            return swatch
              .toReversed()
              .map((color, j) => `  --color-${name}-${j + 1}: ${color.css};`)
          })

          const tailwind = palette.join('\n')

          navigator.clipboard.writeText(tailwind).then(() => {
            toast('Copied palette to clipboard as TailwindCSS colors', {
              type: 'success',
              description: 'Paste inside TailwindCSS @theme {} to use',
            })
          })

          break
        }
        case 'json': {
          const palette = Object.fromEntries(
            this.palette.map((swatch, i) => {
              const hue = this.hues[i]
              const name = hue.name || `h${hue.value}`
              return [
                name,
                Object.fromEntries(
                  swatch.toReversed().map((color, j) => [j + 1, color.css])
                ),
              ]
            })
          )
          navigator.clipboard.writeText(JSON.stringify(palette)).then(() => {
            toast('Copied palette to clipboard as JSON', {
              type: 'success',
            })
          })
          break
        }
        case 'json-arrays': {
          const palette = Object.fromEntries(
            this.palette.map((swatch, i) => {
              const hue = this.hues[i]
              const name = hue.name || `h${hue.value}`
              return [name, swatch.toReversed().map((color) => color.css)]
            })
          )
          navigator.clipboard.writeText(JSON.stringify(palette)).then(() => {
            toast('Copied palette to clipboard as JSON arrays', {
              type: 'success',
            })
          })
          break
        }
        case 'json-flat': {
          const palette = Object.fromEntries(
            this.palette.flatMap((swatch, i) => {
              const hue = this.hues[i]
              const name = hue.name || `h${hue.value}`
              return swatch
                .toReversed()
                .map((color, j) => [`${name}-${j + 1}`, color.css])
            })
          )
          navigator.clipboard.writeText(JSON.stringify(palette)).then(() => {
            toast('Copied palette to clipboard as JSON arrays', {
              type: 'success',
            })
          })
          break
        }
      }
    },

    restoreState() {
      const url = new URL(window.location.href)
      const stateString = decodeURIComponent(url.hash.substring(1))
      if (!stateString) return
      try {
        const state: PaletteGeneratorState = JSON.parse(atob(stateString))
        this.hues = state.h.map(newHue)
        this.steps = state.st
        this.minSaturation = state.s1
        this.maxSaturation = state.s2
        this.minLightness = state.l1
        this.maxLightness = state.l2
      } catch (e) {
        console.error('Failed to parse state', e)
      }
    },

    computePalette() {
      const {
        hues,
        steps,
        minSaturation,
        maxSaturation,
        minLightness,
        maxLightness,
      } = this

      const rc = roundColor(4)

      const palette: PaletteColor[][] = []
      for (let i = 0; i < hues.length; i++) {
        const hue = hues[i].value
        const colors: PaletteColor[] = []
        for (let j = 1; j <= steps; j++) {
          const t = j / steps
          const saturation = lerp(minSaturation, maxSaturation, t)
          const lightness = lerp(minLightness, maxLightness, t)

          let color: Okhsl = {
            mode: 'okhsl',
            h: hue,
            s: saturation,
            l: lightness,
          }

          const css = formatCss(
            rc(modeOklch.fromMode.oklab(convertOkhslToOklab(color)))
          )

          color = rc(color)
          const display = `okhsl(${color.h}°, ${color.s}, ${color.l})`

          colors.push({ css, display })
        }
        palette.push(colors)
      }
      this.palette = palette
      console.log(palette)
    },

    colorForHue(hue: number, selected: boolean): string {
      const color: Okhsl = {
        mode: 'okhsl',
        h: hue,
        s: selected ? 0.75 : 0.7,
        l: selected ? 0.75 : 0.7,
      }
      return formatCss(convertOkhslToOklab(color))
    },

    init() {
      this.restoreState()
      this.$watch('selectedHue', (newId) => {
        if (newId === null) {
          this.hueCircleHue = 0
          return
        }
        this.hueCircleHue = this.hues.find((h) => h.id === newId)!.value
      })
      this.$watch('hueCircleHue', (newValue) => {
        if (this.selectedHue == null) return
        this.hues = this.hues.map((h) => {
          if (h.id !== this.selectedHue) return h
          return { ...h, value: Math.round(newValue) }
        })
      })

      this.$watch('hues', () => requestCompute(this))
      this.$watch('steps', () => requestCompute(this))
      this.$watch('minSaturation', () => requestCompute(this))
      this.$watch('maxSaturation', () => requestCompute(this))
      this.$watch('minLightness', () => requestCompute(this))
      this.$watch('maxLightness', () => requestCompute(this))

      this.computePalette()

      boundHandler = (ev) => handler(this, ev)
      document.body.addEventListener('click', boundHandler)
    },

    destroy() {
      document.body.removeEventListener('click', boundHandler)
    },

    addHue() {
      const h = newHue(0)
      this.hues = [...this.hues, h]
      this.selectedHue = h.id
    },

    moveHue(index, to) {
      if (to < 0 || to >= this.hues.length) return
      if (index === to) return
      const movedHue = this.hues[index]
      let newHues: Hue[]
      if (index < to) {
        // 0 1 2 3 4 5
        // 1 -> 3
        // 0 2 3 1 4 5
        // [:1] .. [1+1:3+1] .. v .. [3+1:]
        newHues = [
          ...this.hues.slice(0, index),
          ...this.hues.slice(index + 1, to + 1),
          movedHue,
          ...this.hues.slice(to + 1),
        ]
      } else {
        // 0 1 2 3 4 5
        // 3 -> 1
        // 0 3 1 2 4 5
        // [:1] .. v .. [1:3] .. [3+1:]
        newHues = [
          ...this.hues.slice(0, to),
          movedHue,
          ...this.hues.slice(to, index),
          ...this.hues.slice(index + 1),
        ]
      }

      this.hues = newHues
    },

    updateHue(id: string, hue: string) {
      const hueValue = parseInt(hue, 10)
      if (isNaN(hueValue) || hueValue < 0 || hueValue > 360) {
        this.hues = this.hues
      } else {
        this.hues = this.hues.map((h) =>
          h.id === id ? { ...h, value: hueValue } : h
        )
      }
    },

    deleteHue(id) {
      if (this.hues.length <= 1) return
      this.hues = this.hues.filter((h) => h.id !== id)
      if (this.selectedHue === id) {
        this.selectedHue = null
      }
    },
  }
}
