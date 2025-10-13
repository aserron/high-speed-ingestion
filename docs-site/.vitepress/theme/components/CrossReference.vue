<template>
  <div class="cross-reference">
    <div class="reference-header">
      <span class="reference-icon">🔗</span>
      <span class="reference-title">{{ title || 'Related Topics' }}</span>
    </div>
    
    <div class="reference-grid">
      <a 
        v-for="link in links" 
        :key="link.url"
        :href="link.url"
        class="reference-item"
        :class="{ external: isExternal(link.url) }"
      >
        <div class="reference-content">
          <div class="reference-info">
            <span class="reference-icon-small">{{ link.icon || getDefaultIcon(link.url) }}</span>
            <div class="reference-text">
              <div class="reference-name">{{ link.title }}</div>
              <div v-if="link.description" class="reference-desc">{{ link.description }}</div>
            </div>
          </div>
          <div class="reference-arrow">
            {{ isExternal(link.url) ? '↗' : '→' }}
          </div>
        </div>
      </a>
    </div>
    
    <div v-if="showSeeAlso" class="see-also">
      <h5>See Also</h5>
      <ul>
        <li v-for="item in seeAlso" :key="item.url">
          <a :href="item.url">{{ item.title }}</a>
          <span v-if="item.description" class="see-also-desc"> - {{ item.description }}</span>
        </li>
      </ul>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  title: {
    type: String,
    default: ''
  },
  links: {
    type: Array,
    required: true
  },
  seeAlso: {
    type: Array,
    default: () => []
  }
})

const showSeeAlso = computed(() => props.seeAlso && props.seeAlso.length > 0)

function isExternal(url) {
  return url.startsWith('http') || url.startsWith('https')
}

function getDefaultIcon(url) {
  if (url.includes('/guide/')) return '📚'
  if (url.includes('/api/')) return '🔌'
  if (url.includes('/architecture/')) return '🏗️'
  if (url.includes('/benchmarks/')) return '📊'
  if (isExternal(url)) return '🌐'
  return '📄'
}
</script>

<style scoped>
.cross-reference {
  border: 1px solid var(--vp-c-border);
  border-radius: 8px;
  padding: 16px;
  margin: 24px 0;
  background-color: var(--vp-c-bg-soft);
}

.reference-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
}

.reference-icon {
  font-size: 1rem;
}

.reference-title {
  font-weight: 600;
  color: var(--vp-c-text-1);
  font-size: 0.875rem;
}

.reference-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 8px;
}

.reference-item {
  display: block;
  padding: 12px;
  border: 1px solid var(--vp-c-border);
  border-radius: 6px;
  background-color: var(--vp-c-bg);
  text-decoration: none;
  transition: all 0.25s;
  color: inherit;
}

.reference-item:hover {
  border-color: var(--vp-c-brand-1);
  background-color: var(--vp-c-bg-alt);
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.reference-item.external {
  border-left: 3px solid var(--vp-c-warning-1);
}

.reference-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.reference-info {
  display: flex;
  align-items: center;
  gap: 10px;
  flex: 1;
}

.reference-icon-small {
  font-size: 1.125rem;
  flex-shrink: 0;
}

.reference-text {
  flex: 1;
  min-width: 0;
}

.reference-name {
  font-weight: 500;
  color: var(--vp-c-text-1);
  font-size: 0.875rem;
  margin-bottom: 2px;
}

.reference-desc {
  color: var(--vp-c-text-2);
  font-size: 0.75rem;
  line-height: 1.3;
}

.reference-arrow {
  color: var(--vp-c-text-2);
  font-size: 0.875rem;
  flex-shrink: 0;
  margin-left: 8px;
  transition: transform 0.25s;
}

.reference-item:hover .reference-arrow {
  transform: translateX(2px);
  color: var(--vp-c-brand-1);
}

.see-also {
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid var(--vp-c-border);
}

.see-also h5 {
  margin: 0 0 8px 0;
  color: var(--vp-c-text-1);
  font-size: 0.875rem;
  font-weight: 600;
}

.see-also ul {
  margin: 0;
  padding-left: 16px;
  list-style-type: disc;
}

.see-also li {
  margin-bottom: 4px;
  font-size: 0.875rem;
  line-height: 1.4;
}

.see-also a {
  color: var(--vp-c-brand-1);
  text-decoration: none;
}

.see-also a:hover {
  text-decoration: underline;
}

.see-also-desc {
  color: var(--vp-c-text-2);
}

@media (max-width: 768px) {
  .reference-grid {
    grid-template-columns: 1fr;
  }
  
  .reference-content {
    align-items: flex-start;
  }
  
  .reference-info {
    align-items: flex-start;
  }
}
</style>