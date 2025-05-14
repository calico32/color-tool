import type { AlpineComponent } from 'alpinejs'

type ToastType = 'default' | 'info' | 'success' | 'warning' | 'error'
type ToastPosition =
  | 'top-left'
  | 'top-center'
  | 'top-right'
  | 'bottom-left'
  | 'bottom-center'
  | 'bottom-right'

export interface ToastOptions {
  message: string
  type: ToastType
  description: string
  position: ToastPosition
  html: string
}

export interface ToastData {
  id: string
  show: boolean
  message: string
  description: string
  type: ToastType
  html: string
}

export interface Toaster {
  toasts: Array<ToastData>
  toastsHovered: boolean
  expanded: boolean
  layout: string
  position: string
  paddingBetweenToasts: number
  deleteToastWithId(id: string): void
  burnToast(id: string): void
  getToastWithId(id: string): ToastData | undefined
  stackToasts(): void
  positionToasts(): void
  alignBottom(element1: HTMLElement, element2: HTMLElement): void
  alignTop(element1: HTMLElement, element2: HTMLElement): void
  resetBottom(): void
  resetTop(): void
  getBottomPositionOfElement(el: HTMLElement): number
  calculateHeightOfToastsContainer(): void

  toaster: Record<string, unknown>
}

export function toaster(): AlpineComponent<Toaster> {
  return {
    toasts: [],
    toastsHovered: false,
    expanded: false,
    layout: 'default',
    position: 'top-center',
    paddingBetweenToasts: 15,
    deleteToastWithId(id: string) {
      for (let i = 0; i < this.toasts.length; i++) {
        if (this.toasts[i].id === id) {
          this.toasts.splice(i, 1)
          break
        }
      }
    },
    burnToast(id: string) {
      let burnToast = this.getToastWithId(id)
      if (!burnToast) return
      let burnToastElement = document.getElementById(burnToast.id)
      if (burnToastElement) {
        if (this.toasts.length == 1) {
          if (this.layout == 'default') {
            this.expanded = false
          }
          burnToastElement.classList.remove('translate-y-0')
          if (this.position.includes('bottom')) {
            burnToastElement.classList.add('translate-y-full')
          } else {
            burnToastElement.classList.add('-translate-y-full')
          }
          burnToastElement.classList.add('-translate-y-full')
        }
        burnToastElement.classList.add('opacity-0')
        let that = this
        setTimeout(function () {
          that.deleteToastWithId(id)
          setTimeout(function () {
            that.stackToasts()
          }, 1)
        }, 300)
      }
    },
    getToastWithId(id: string) {
      for (let i = 0; i < this.toasts.length; i++) {
        if (this.toasts[i].id === id) {
          return this.toasts[i]
        }
      }
      return undefined
    },
    stackToasts() {
      this.positionToasts()
      this.calculateHeightOfToastsContainer()
      setTimeout(() => {
        this.calculateHeightOfToastsContainer()
      }, 300)
    },
    positionToasts() {
      if (this.toasts.length == 0) return
      let topToast = document.getElementById(this.toasts[0].id)!
      topToast.style.zIndex = '100'
      if (this.expanded) {
        if (this.position.includes('bottom')) {
          topToast.style.top = 'auto'
          topToast.style.bottom = '0px'
        } else {
          topToast.style.top = '0px'
        }
      }

      let bottomPositionOfFirstToast = this.getBottomPositionOfElement(topToast)

      if (this.toasts.length == 1) return
      let middleToast = document.getElementById(this.toasts[1].id)!
      middleToast.style.zIndex = '90'

      if (this.expanded) {
        let middleToastPosition =
          topToast.getBoundingClientRect().height +
          this.paddingBetweenToasts +
          'px'

        if (this.position.includes('bottom')) {
          middleToast.style.top = 'auto'
          middleToast.style.bottom = middleToastPosition
        } else {
          middleToast.style.top = middleToastPosition
        }

        middleToast.style.scale = '100%'
        middleToast.style.transform = 'translateY(0px)'
      } else {
        middleToast.style.scale = '94%'
        if (this.position.includes('bottom')) {
          middleToast.style.transform = 'translateY(-16px)'
        } else {
          this.alignBottom(topToast, middleToast)
          middleToast.style.transform = 'translateY(16px)'
        }
      }

      if (this.toasts.length == 2) return
      let bottomToast = document.getElementById(this.toasts[2].id)!
      bottomToast.style.zIndex = '80'
      if (this.expanded) {
        let bottomToastPosition =
          topToast.getBoundingClientRect().height +
          this.paddingBetweenToasts +
          middleToast.getBoundingClientRect().height +
          this.paddingBetweenToasts +
          'px'

        if (this.position.includes('bottom')) {
          bottomToast.style.top = 'auto'
          bottomToast.style.bottom = bottomToastPosition
        } else {
          bottomToast.style.top = bottomToastPosition
        }

        bottomToast.style.scale = '100%'
        bottomToast.style.transform = 'translateY(0px)'
      } else {
        bottomToast.style.scale = '88%'
        if (this.position.includes('bottom')) {
          bottomToast.style.transform = 'translateY(-32px)'
        } else {
          this.alignBottom(topToast, bottomToast)
          bottomToast.style.transform = 'translateY(32px)'
        }
      }

      if (this.toasts.length == 3) return
      let burnToast = document.getElementById(this.toasts[3].id)!
      burnToast.style.zIndex = '70'
      if (this.expanded) {
        let burnToastPosition =
          topToast.getBoundingClientRect().height +
          this.paddingBetweenToasts +
          middleToast.getBoundingClientRect().height +
          this.paddingBetweenToasts +
          bottomToast.getBoundingClientRect().height +
          this.paddingBetweenToasts +
          'px'

        if (this.position.includes('bottom')) {
          burnToast.style.top = 'auto'
          burnToast.style.bottom = burnToastPosition
        } else {
          burnToast.style.top = burnToastPosition
        }

        burnToast.style.scale = '100%'
        burnToast.style.transform = 'translateY(0px)'
      } else {
        burnToast.style.scale = '82%'
        this.alignBottom(topToast, burnToast)
        burnToast.style.transform = 'translateY(48px)'
      }

      burnToast.firstElementChild!.classList.remove('opacity-100')
      burnToast.firstElementChild!.classList.add('opacity-0')

      // Burn 🔥 (remove) last toast
      setTimeout(() => {
        this.toasts.pop()
      }, 300)

      if (this.position.includes('bottom')) {
        middleToast.style.top = 'auto'
      }

      return
    },
    alignBottom(element1: HTMLElement, element2: HTMLElement) {
      // Get the top position and height of the first element
      let top1 = element1.offsetTop
      let height1 = element1.offsetHeight

      // Get the height of the second element
      let height2 = element2.offsetHeight

      // Calculate the top position for the second element
      let top2 = top1 + (height1 - height2)

      // Apply the calculated top position to the second element
      element2.style.top = top2 + 'px'
    },
    alignTop(element1: HTMLElement, element2: HTMLElement) {
      // Get the top position of the first element
      let top1 = element1.offsetTop

      // Apply the same top position to the second element
      element2.style.top = top1 + 'px'
    },
    resetBottom() {
      for (let i = 0; i < this.toasts.length; i++) {
        let toastElement = document.getElementById(this.toasts[i].id)
        if (toastElement) {
          toastElement.style.bottom = '0px'
        }
      }
    },
    resetTop() {
      for (let i = 0; i < this.toasts.length; i++) {
        let toastElement = document.getElementById(this.toasts[i].id)
        if (toastElement) {
          toastElement.style.top = '0px'
        }
      }
    },
    getBottomPositionOfElement(el: HTMLElement) {
      return el.getBoundingClientRect().height + el.getBoundingClientRect().top
    },
    calculateHeightOfToastsContainer() {
      if (this.toasts.length == 0) {
        this.$el.style.height = '0px'
        return
      }

      let lastToast = this.toasts[this.toasts.length - 1]
      let lastToastRectangle = document
        .getElementById(lastToast.id)!
        .getBoundingClientRect()

      let firstToast = this.toasts[0]
      let firstToastRectangle = document
        .getElementById(firstToast.id)!
        .getBoundingClientRect()

      if (this.toastsHovered) {
        if (this.position.includes('bottom')) {
          this.$el.style.height =
            firstToastRectangle.top +
            firstToastRectangle.height -
            lastToastRectangle.top +
            'px'
        } else {
          this.$el.style.height =
            lastToastRectangle.top +
            lastToastRectangle.height -
            firstToastRectangle.top +
            'px'
        }
      } else {
        this.$el.style.height = firstToastRectangle.height + 'px'
      }
    },

    init() {
      if (this.layout == 'expanded') {
        this.expanded = true
      }
      this.stackToasts()
      this.$watch('toastsHovered', (value) => {
        if (this.layout == 'default') {
          if (this.position.includes('bottom')) {
            this.resetBottom()
          } else {
            this.resetTop()
          }

          if (value) {
            // calculate the new positions
            this.expanded = true
            if (this.layout == 'default') {
              this.stackToasts()
            }
          } else {
            if (this.layout == 'default') {
              this.expanded = false
              //setTimeout(function(){
              this.stackToasts()
              //}, 10);
              setTimeout(() => {
                this.stackToasts()
              }, 10)
            }
          }
        }
      })
    },

    toaster: {
      '@set-toasts-layout.window'(event: CustomEvent) {
        this.layout = event.detail.layout
        this.expanded = this.layout === 'expanded'
        this.stackToasts()
      },
      '@toast-show.window'(event: CustomEvent) {
        event.stopPropagation()
        const options: ToastOptions = event.detail
        this.position = options.position

        this.toasts.unshift({
          id: 'toast-' + Math.random().toString(16).slice(2),
          show: false,
          message: options.message,
          description: options.description,
          type: options.type,
          html: options.html,
        })
      },
      '@mouseenter'() {
        this.toastsHovered = true
      },
      '@mouseleave'() {
        this.toastsHovered = false
      },
    },
  }
}

interface Toast extends Toaster {
  toast: ToastData
  toastHovered: boolean
}

export function toast(): AlpineComponent<Toast> {
  return <AlpineComponent<Toast>>{
    toastHovered: false,
    init() {
      if (this.$data.position.includes('bottom')) {
        this.$el.firstElementChild!.classList.add('toast-bottom')
        this.$el.firstElementChild!.classList.add(
          'opacity-0',
          'translate-y-full'
        )
      } else {
        this.$el.firstElementChild!.classList.add(
          'opacity-0',
          '-translate-y-full'
        )
      }
      setTimeout(() => {
        setTimeout(() => {
          if (this.position.includes('bottom')) {
            this.$el.firstElementChild!.classList.remove(
              'opacity-0',
              'translate-y-full'
            )
          } else {
            this.$el.firstElementChild!.classList.remove(
              'opacity-0',
              '-translate-y-full'
            )
          }
          this.$el.firstElementChild!.classList.add(
            'opacity-100',
            'translate-y-0'
          )

          setTimeout(() => {
            this.stackToasts()
          }, 10)
        }, 5)
      }, 50)

      setTimeout(() => {
        setTimeout(() => {
          this.$el.firstElementChild!.classList.remove('opacity-100')
          this.$el.firstElementChild!.classList.add('opacity-0')
          if (this.$data.toasts.length == 1) {
            this.$el.firstElementChild!.classList.remove('translate-y-0')
            this.$el.firstElementChild!.classList.add('-translate-y-full')
          }
          setTimeout(() => {
            this.$data.deleteToastWithId(this.$data.toast.id)
          }, 300)
        }, 5)
      }, 4000)
    },
  }
}
