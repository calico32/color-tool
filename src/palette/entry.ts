import anchor from '@alpinejs/anchor'
import persist from '@alpinejs/persist'
import sort from '@alpinejs/sort'
import Alpine from 'alpinejs'

import huecircle from './huecircle'
import palettefunction from './palettefunction'
import palettegenerator from './palettegenerator'

import '../entry-common'

window.Alpine = Alpine

Alpine.data('huecircle', huecircle)
Alpine.data('palettefunction', palettefunction)
Alpine.data('palettegenerator', palettegenerator)

Alpine.plugin(persist)
Alpine.plugin(sort)
Alpine.plugin(anchor)
Alpine.start()
