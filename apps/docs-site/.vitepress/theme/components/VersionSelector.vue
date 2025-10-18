<template>
  <div class="version-selector">
    <div class="version-dropdown" @click="toggleDropdown" :class="{ open: isOpen }">
      <div class="current-version">
        <span class="version-icon">📋</span>
        <span class="version-text">{{ currentVersion.label }}</span>
        <span class="dropdown-arrow">{{ isOpen ? '▲' : '▼' }}</span>
      </div>
      
      <div v-if="isOpen" class="version-menu">
        <div 
          v-for="version in versions" 
          :key="version.value"
          @click="selectVersion(version)"
          :class="['version-item', { active: version.value === currentVersion.value }]"
        >
          <div class="version-info">
            <span class="version-label">{{ version.label }}</span>
            <span v-if="version.status" :class="['version-status', version.status]">
              {{ version.status }}
            </span>
          </div>
          <div v-if="version.description" class="version-description">
            {{ version.description }}
          </div>
        </div>
        
        <div class="version-divider"></div>
        
        <div class="version-links">
          <a href="/changelog" class="version-link">
            📝 Changelog
          </a>
          <a href="https://github.com/finance-ingestion-benchmark/releases" class="version-link" target="_blank">
            🏷️ All Releases
          </a>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'

const isOpen = ref(false)
const currentVersion = ref({ value: 'v1.0.0', label: 'v1.0.0 (Latest)', status: 'stable' })

const versions = [
  {
    value: 'v1.0.0',
    label: 'v1.0.0 (Latest)',
    status: 'stable',
    description: 'Current stable release with full feature set'
  },
  {
    value: 'v0.9.0',
    label: 'v0.9.0',
    status: 'legacy',
    description: 'Previous stable release'
  },
  {
    value: 'v0.8.0',
    label: 'v0.8.0',
    status: 'legacy',
    description: 'Legacy release with basic features'
  },
  {
    value: 'main',
    label: 'Development',
    status: 'beta',
    description: 'Latest development version (unstable)'
  }
]

function toggleDropdown() {
  isOpen.value = !isOpen.value
}

function selectVersion(version) {
  currentVersion.value = version
  isOpen.value = false
  
  // In a real implementation, this would navigate to the selected version
  console.log(`Switching to version: ${version.value}`)
}

function handleClickOutside(event) {
  if (!event.target.closest('.version-selector')) {
    isOpen.value = false
  }
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
})
</script>

<style scoped>
.version-selector {
  position: relative;
  display: inline-block;
}

.version-dropdown {
  position: relative;
  cursor: pointer;
  user-select: none;
}

.current-version {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background-color: var(--vp-c-bg-soft);
  border: 1px solid var(--vp-c-border);
  border-radius: 6px;
  transition: all 0.25s;
  min-width: 140px;
}

.version-dropdown:hover .current-version {
  border-color: var(--vp-c-brand-1);
  background-color: var(--vp-c-bg-alt);
}

.version-dropdown.open .current-version {
  border-color: var(--vp-c-brand-1);
  border-bottom-left-radius: 0;
  border-bottom-right-radius: 0;
}

.version-icon {
  font-size: 0.875rem;
}

.version-text {
  flex: 1;
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--vp-c-text-1);
}

.dropdown-arrow {
  font-size: 0.75rem;
  color: var(--vp-c-text-2);
  transition: transform 0.25s;
}

.version-menu {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  background-color: var(--vp-c-bg);
  border: 1px solid var(--vp-c-brand-1);
  border-top: none;
  border-radius: 0 0 6px 6px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  z-index: 1000;
  max-height: 300px;
  overflow-y: auto;
}

.version-item {
  padding: 12px;
  cursor: pointer;
  transition: background-color 0.25s;
  border-bottom: 1px solid var(--vp-c-border);
}

.version-item:hover {
  background-color: var(--vp-c-bg-soft);
}

.version-item.active {
  background-color: var(--vp-c-brand-soft);
}

.version-item:last-of-type {
  border-bottom: none;
}

.version-info {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 4px;
}

.version-label {
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--vp-c-text-1);
}

.version-status {
  padding: 2px 6px;
  border-radius: 3px;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  color: white;
}

.version-status.stable {
  background-color: #10b981;
}

.version-status.beta {
  background-color: #f59e0b;
}

.version-status.legacy {
  background-color: #6b7280;
}

.version-description {
  font-size: 0.75rem;
  color: var(--vp-c-text-2);
  line-height: 1.4;
}

.version-divider {
  height: 1px;
  background-color: var(--vp-c-border);
  margin: 8px 0;
}

.version-links {
  padding: 8px 12px;
}

.version-link {
  display: block;
  padding: 6px 0;
  color: var(--vp-c-text-2);
  text-decoration: none;
  font-size: 0.875rem;
  transition: color 0.25s;
}

.version-link:hover {
  color: var(--vp-c-brand-1);
}

@media (max-width: 768px) {
  .version-menu {
    position: fixed;
    top: auto;
    left: 16px;
    right: 16px;
    bottom: 16px;
    border-radius: 8px;
    border: 1px solid var(--vp-c-border);
  }
}
</style>