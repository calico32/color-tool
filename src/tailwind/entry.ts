import anchor from '@alpinejs/anchor'
import persist from '@alpinejs/persist'
import Alpine from 'alpinejs'

import draggable from './draggable'
import tailwindcolors from './tailwindcolors'

import '../entry-common'

window.Alpine = Alpine

Alpine.data('draggable', draggable)
Alpine.data('tailwindcolors', tailwindcolors)

Alpine.plugin(anchor)
Alpine.plugin(persist)
Alpine.start()
