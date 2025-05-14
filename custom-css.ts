import colors from 'tailwindcss/colors'
import type { Plugin } from 'vite'

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

const template = 'body:has(#$ID:hover) #$ID-tooltip,\n'

function generateCss(): string {
  let css = ''
  for (const color of colorNames) {
    const id = 'color-' + color
    css += template.replace(/\$ID/g, id)
  }
  for (const shade of shades) {
    const id = 'shade-' + shade
    css += template.replace(/\$ID/g, id)
  }
  css = css.substring(0, css.length - 2) + ' {\n  display: block;\n}'
  return css
}

export default function customCss(): Plugin {
  return {
    name: 'x-custom-css',

    transform(code, id) {
      if (!id.endsWith('.css') && !id.endsWith('.css?direct')) {
        return
      }

      const css = generateCss()
      code = code.replace('/*! x-custom-css */', css)
      return code
    },
  }
}
