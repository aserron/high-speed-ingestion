import DefaultTheme from 'vitepress/theme'
import { h, onMounted, watch, nextTick } from 'vue'
import { useRoute } from 'vitepress'
import mediumZoom from 'medium-zoom'

import './custom.css'
import InteractiveChart from './components/InteractiveChart.vue'
import SystemDiagram from './components/SystemDiagram.vue'
import ApiExplorer from './components/ApiExplorer.vue'
import VersionSelector from './components/VersionSelector.vue'
import FeedbackWidget from './components/FeedbackWidget.vue'
import CrossReference from './components/CrossReference.vue'

export default {
  extends: DefaultTheme,
  enhanceApp({ app }) {
    // Register global components
    app.component('InteractiveChart', InteractiveChart)
    app.component('SystemDiagram', SystemDiagram)
    app.component('ApiExplorer', ApiExplorer)
    app.component('VersionSelector', VersionSelector)
    app.component('FeedbackWidget', FeedbackWidget)
    app.component('CrossReference', CrossReference)
  },
  setup() {
    const route = useRoute()
    const initZoom = () => {
      mediumZoom('.main img', { background: 'var(--vp-c-bg)' })
    }
    onMounted(() => {
      initZoom()
      
      // Add feedback widget to all pages
      const feedbackWidget = document.createElement('div')
      feedbackWidget.innerHTML = '<FeedbackWidget />'
      document.body.appendChild(feedbackWidget)
    })
    watch(
      () => route.path,
      () => nextTick(() => initZoom())
    )
  },
  
  Layout() {
    return h(DefaultTheme.Layout, null, {
      // Add feedback widget to layout
      'layout-bottom': () => h(FeedbackWidget)
    })
  }
}