import { defineConfig } from 'vitepress'

export default defineConfig({
    title: 'Finance Ingestion Benchmark',
    description: 'High-performance financial data ingestion systems comparison',
    
    head: [
      ['link', { rel: 'icon', href: '/favicon.ico' }],
      ['meta', { name: 'theme-color', content: '#3c82f6' }],
      ['meta', { property: 'og:type', content: 'website' }],
      ['meta', { property: 'og:locale', content: 'en' }],
      ['meta', { property: 'og:title', content: 'Finance Ingestion Benchmark | High-Performance Data Processing' }],
      ['meta', { property: 'og:site_name', content: 'Finance Ingestion Benchmark' }],
      ['meta', { property: 'og:image', content: '/og-image.png' }],
      ['meta', { property: 'og:url', content: 'https://finance-ingestion-benchmark.dev/' }]
    ],

    themeConfig: {
      logo: '/logo.svg',
      
      nav: [
        { text: 'Home', link: '/' },
        { text: 'Guide', link: '/guide/getting-started' },
        { text: 'Architecture', link: '/architecture/overview' },
        { text: 'Benchmarks', link: '/benchmarks/overview' },
        { text: 'API', link: '/api/python' },
        {
          text: 'v1.0.0',
          items: [
            { text: 'Changelog', link: '/changelog' },
            { text: 'Contributing', link: '/contributing' },
            { text: 'All Releases', link: 'https://github.com/finance-ingestion-benchmark/releases' }
          ]
        }
      ],

      sidebar: {
        '/guide/': [
          {
            text: 'Getting Started',
            items: [
              { text: 'Introduction', link: '/guide/introduction' },
              { text: 'Quick Start', link: '/guide/getting-started' },
              { text: 'Installation', link: '/guide/installation' },
              { text: 'Configuration', link: '/guide/configuration' }
            ]
          },
          {
            text: 'Development',
            items: [
              { text: 'Development Setup', link: '/guide/development' },
              { text: 'Testing', link: '/guide/testing' },
              { text: 'Debugging', link: '/guide/debugging' }
            ]
          },
          {
            text: 'Deployment',
            items: [
              { text: 'Docker Deployment', link: '/guide/docker' },
              { text: 'Production Setup', link: '/guide/production' },
              { text: 'Monitoring', link: '/guide/monitoring' }
            ]
          }
        ],
        '/architecture/': [
          {
            text: 'System Design',
            items: [
              { text: 'Overview', link: '/architecture/overview' },
              { text: 'Components', link: '/architecture/components' },
              { text: 'Data Flow', link: '/architecture/data-flow' },
              { text: 'Performance Design', link: '/architecture/performance' }
            ]
          },
          {
            text: 'Implementation',
            items: [
              { text: 'Python Stack', link: '/architecture/python' },
              { text: 'Node.js Stack', link: '/architecture/nodejs' },
              { text: 'Storage Layer', link: '/architecture/storage' },
              { text: 'Networking', link: '/architecture/networking' }
            ]
          }
        ],
        '/benchmarks/': [
          {
            text: 'Benchmarking',
            items: [
              { text: 'Overview', link: '/benchmarks/overview' },
              { text: 'Methodology', link: '/benchmarks/methodology' },
              { text: 'Results Analysis', link: '/benchmarks/results' },
              { text: 'Performance Tuning', link: '/benchmarks/tuning' }
            ]
          },
          {
            text: 'Test Scenarios',
            items: [
              { text: 'Latency Tests', link: '/benchmarks/latency' },
              { text: 'Throughput Tests', link: '/benchmarks/throughput' },
              { text: 'Load Tests', link: '/benchmarks/load' },
              { text: 'Stability Tests', link: '/benchmarks/stability' }
            ]
          }
        ],
        '/api/': [
          {
            text: 'API Reference',
            items: [
              { text: 'Python API', link: '/api/python' },
              { text: 'Node.js API', link: '/api/nodejs' },
              { text: 'REST Endpoints', link: '/api/rest' },
              { text: 'WebSocket Protocol', link: '/api/websocket' }
            ]
          },
          {
            text: 'Data Models',
            items: [
              { text: 'Message Formats', link: '/api/messages' },
              { text: 'Configuration Schema', link: '/api/config' },
              { text: 'Metrics Schema', link: '/api/metrics' }
            ]
          }
        ]
      },

      socialLinks: [
        { icon: 'github', link: 'https://github.com/finance-ingestion-benchmark' }
      ],

      footer: {
        message: 'Released under the MIT License.',
        copyright: 'Copyright © 2024 Finance Ingestion Benchmark'
      },

      search: {
        provider: 'local',
        options: {
          locales: {
            root: {
              translations: {
                button: {
                  buttonText: 'Search',
                  buttonAriaLabel: 'Search'
                },
                modal: {
                  noResultsText: 'No results for',
                  resetButtonTitle: 'Clear search',
                  footer: {
                    selectText: 'to select',
                    navigateText: 'to navigate'
                  }
                }
              }
            }
          }
        }
      },

      editLink: {
        pattern: 'https://github.com/finance-ingestion-benchmark/edit/main/apps/docs-site/:path',
        text: 'Edit this page on GitHub'
      },

      lastUpdated: {
        text: 'Updated at',
        formatOptions: {
          dateStyle: 'full',
          timeStyle: 'medium'
        }
      }
    },

    markdown: {
      theme: {
        light: 'github-light',
        dark: 'github-dark'
      },
      lineNumbers: true,
      config: (md) => {
        // Add custom markdown plugins here
      }
    },

    vite: {
      plugins: [],
      optimizeDeps: {
        include: ['vue', '@vue/runtime-core']
      }
    },

    ignoreDeadLinks: true
  })