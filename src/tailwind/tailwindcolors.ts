import type { Magics } from 'alpinejs'
import {
  formatCss,
  formatHex,
  formatRgb,
  modeHsl,
  modeHsv,
  modeLab,
  modeLch,
  modeLrgb,
  modeOkhsl,
  modeOkhsv,
  modeOklab,
  modeOklch,
  modeRgb,
  useMode,
  wcagContrast,
  type Color,
} from 'culori/fn'
import colors from 'tailwindcss/colors'

const rgb = useMode(modeRgb)
const hsl = useMode(modeHsl)
const hsv = useMode(modeHsv)
const lab = useMode(modeLab)
const lch = useMode(modeLch)
const oklab = useMode(modeOklab)
const oklch = useMode(modeOklch)
const okhsl = useMode(modeOkhsl)
const okhsv = useMode(modeOkhsv)
useMode(modeLrgb) // required for contrast calculation

const colorNames = [
  'slate',
  'gray',
  'zinc',
  'neutral',
  'stone',
  'red',
  'orange',
  'amber',
  'yellow',
  'lime',
  'green',
  'emerald',
  'teal',
  'cyan',
  'sky',
  'blue',
  'indigo',
  'violet',
  'purple',
  'fuchsia',
  'pink',
  'rose',
] as const satisfies (keyof typeof colors)[]

const shades = [
  '50',
  '100',
  '200',
  '300',
  '400',
  '500',
  '600',
  '700',
  '800',
  '900',
  '950',
] as const satisfies (keyof typeof colors.gray)[]

type ColorFormat = [(c: Color) => Color, (c: Color) => string]

const copyFormats: Record<string, ColorFormat> = {
  Hex: [rgb, formatHex],
  Plain: [rgb, (c: Color) => formatHex(c).substring(1)],
  RGB: [rgb, formatRgb],
  RGBA: [rgb, formatRgb],
  HSL: [hsl, formatCss],
  HSV: [hsv, formatCss],
  Lab: [lab, formatCss],
  LCh: [lch, formatCss],
  Oklab: [oklab, formatCss],
  Oklch: [oklch, formatCss],
  Okhsl: [okhsl, formatCss],
  Okhsv: [okhsv, formatCss],
}

const copyFormatPreviews = Object.fromEntries(
  Object.entries(copyFormats).map(([k, format]) => [
    k,
    formatColor(colors.blue[500], format),
  ])
)

const swatchCopyFormats = {
  JSON: '{ "$key": "$value" }',
  Array: `["$value", ...]`,
  CSV: '$value, ...',
  TSV: '$value\\t...',
  CSS: '--$color-$shade: $value',
} as const

function colorContrast(bgColor: Color, fgColors: Color[]): Color {
  if (fgColors.length === 0) {
    fgColors = [
      { mode: 'rgb', r: 0, g: 0, b: 0 },
      { mode: 'rgb', r: 255, g: 255, b: 255 },
    ]
  }
  let maxContrast = 0
  let bestColor = fgColors[0]
  for (const fgColor of fgColors) {
    const contrast = wcagContrast(bgColor, fgColor)
    if (contrast > maxContrast) {
      maxContrast = contrast
      bestColor = fgColor
    }
  }
  return bestColor
}

function formatColor(inputColor: string, format: ColorFormat): string {
  let color: Color | undefined = oklch(inputColor)
  if (color == null) {
    console.error('Invalid color', inputColor)
    return '<invalid>'
  }

  const [converter, formatter] = format
  color = converter(color)

  for (const [key, value] of Object.entries(color)) {
    if (typeof value !== 'number') continue
    // @ts-ignore
    color[key] = parseFloat(value.toFixed(4))
  }

  return formatter(color)
}

export default function (this: Magics<unknown>) {
  const handler = (ctx: any, event: MouseEvent) => {
    if (event.target === document.body) {
      ctx.selectedColor = null
      ctx.selectedShade = null
    }
  }

  let boundHandler: (ev: MouseEvent) => void

  return {
    colors: colorNames,
    shades: shades,
    swatches: colors,
    copyFormats: copyFormats,
    copyFormatPreviews: copyFormatPreviews,
    swatchCopyFormats: swatchCopyFormats,
    formats: Object.keys(copyFormats),

    selectedColor: this.$persist(null).as('_x_selected-color') as unknown as
      | string
      | null,
    selectedShade: this.$persist(null).as('_x_selected-shade') as unknown as
      | string
      | null,

    selectedCopyFormat: this.$persist('Hex').as(
      '_x_selected-copy-format'
    ) as unknown as keyof typeof copyFormats,
    selectedSwatchCopyFormat: this.$persist('JSON').as(
      '_x_selected-swatch-copy-format'
    ) as unknown as keyof typeof swatchCopyFormats,

    init() {
      boundHandler = (ev: MouseEvent) => handler(this, ev)
      document.body.addEventListener('click', boundHandler)
    },

    destroy() {
      document.body.removeEventListener('click', boundHandler)
    },

    capitalize(str: string | null): string {
      if (str == null) {
        return ''
      }
      return str.charAt(0).toUpperCase() + str.slice(1)
    },

    alternate(
      color: (typeof this.colors)[number],
      shade: (typeof this.shades)[number]
    ): string {
      let nextShadeIndex = (shades.indexOf(shade) + 1) % shades.length
      if (nextShadeIndex === 0) {
        // last shade, return black
        return colors.black
      }
      if (nextShadeIndex === 1) {
        // first shade, return even darker color for contrast
        nextShadeIndex++
      }

      return colors[color][shades[nextShadeIndex]]
    },

    formatColor,

    generateSwatchCopyFormatPreview(format: string): string {
      const color = 'blue'
      const shade = '500'
      const value = formatColor(
        colors[color][shade],
        this.copyFormats[this.selectedCopyFormat]
      )

      const preview = format
        .replace('$color', color)
        .replace('$shade', shade)
        .replace('$key', color)
        .replace('$value', value)

      return preview
    },

    contrastColor(bg: string, fg: string[]) {
      if (bg == null || fg.length === 0) {
        return null
      }
      const bgColor = oklch(bg)
      if (bgColor == null) {
        console.error('Invalid color', bg)
        return null
      }
      const fgColors = fg
        .map((c) => oklch(c))
        .filter((c) =>
          c == null ? (console.error('Invalid color', c), false) : true
        )
      return formatHex(colorContrast(bgColor, fgColors as Color[]))
    },

    copyToClipboard(element: HTMLElement, color: string) {
      const value = formatColor(
        color,
        this.copyFormats[this.selectedCopyFormat]
      )
      navigator.clipboard.writeText(value)
      const originalContents = element.innerHTML
      element.innerHTML = '☑️'
      setTimeout(() => {
        element.innerHTML = originalContents
      }, 1000)
    },

    copyTextToClipboard(element: HTMLElement, text: string) {
      navigator.clipboard.writeText(text)
      const originalContents = element.innerHTML
      element.innerHTML += ' ☑️'
      setTimeout(() => {
        element.innerHTML = originalContents
      }, 1000)
    },

    copyColorSwatchToClipboard(
      element: HTMLElement,
      color: (typeof colorNames)[number]
    ) {
      const swatchFormat = this.selectedSwatchCopyFormat

      const colors = Object.entries(this.swatches[color]).map(([k, v]) => [
        k,
        formatColor(v, this.copyFormats[this.selectedCopyFormat]),
      ])

      switch (swatchFormat) {
        case 'JSON': {
          const json = Object.fromEntries(colors)
          navigator.clipboard.writeText(JSON.stringify(json, null, 2))
          break
        }
        case 'Array': {
          const array = colors.map(([k, v]) => v)
          navigator.clipboard.writeText(JSON.stringify(array, null, 2))
          break
        }
        case 'CSV': {
          const csv = colors.map(([k, v]) => v).join(', ')
          navigator.clipboard.writeText(csv)
          break
        }
        case 'TSV': {
          const tsv = colors.map(([k, v]) => v).join('\t')
          navigator.clipboard.writeText(tsv)
          break
        }
        case 'CSS': {
          const css = colors
            .map(([k, v]) => `--${color}-${k}: ${v};`)
            .join('\n')
          navigator.clipboard.writeText(css)
          break
        }
        default: {
          throw new Error(`Unknown swatch format: ${swatchFormat}`)
        }
      }

      const originalContents = element.innerHTML
      element.innerHTML = '☑️'
      setTimeout(() => {
        element.innerHTML = originalContents
      }, 1000)
    },

    copyShadeSwatchToClipboard(
      element: HTMLElement,
      shade: (typeof shades)[number]
    ) {
      const swatchFormat = this.selectedSwatchCopyFormat

      const colors = Object.entries(this.swatches).flatMap(([k, v]) =>
        colorNames.includes(k as any)
          ? [
              [
                k,
                formatColor(
                  v[shade],
                  this.copyFormats[this.selectedCopyFormat]
                ),
              ],
            ]
          : []
      )

      switch (swatchFormat) {
        case 'JSON': {
          const json = Object.fromEntries(colors)
          navigator.clipboard.writeText(JSON.stringify(json, null, 2))
          break
        }
        case 'Array': {
          const array = colors.map(([k, v]) => v)
          navigator.clipboard.writeText(JSON.stringify(array, null, 2))
          break
        }
        case 'CSV': {
          const csv = colors.map(([k, v]) => v).join(', ')
          navigator.clipboard.writeText(csv)
          break
        }
        case 'TSV': {
          const tsv = colors.map(([k, v]) => v).join('\t')
          navigator.clipboard.writeText(tsv)
          break
        }
        case 'CSS': {
          const css = colors
            .map(([k, v]) => `--${k}-${shade}: ${v};`)
            .join('\n')
          navigator.clipboard.writeText(css)
          break
        }
        default: {
          throw new Error(`Unknown swatch format: ${swatchFormat}`)
        }
      }

      const originalContents = element.innerHTML
      element.innerHTML = '☑️'
      setTimeout(() => {
        element.innerHTML = originalContents
      }, 1000)
    },
  }
}
