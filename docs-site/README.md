# Finance Ingestion Benchmark Documentation

This directory contains the documentation website for the Finance Ingestion Benchmark project, built with [VitePress](https://vitepress.dev/).

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and npm 8+
- Git

### Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## 📁 Project Structure

```
docs-site/
├── .vitepress/
│   ├── config.js              # VitePress configuration
│   ├── theme/
│   │   ├── index.js           # Custom theme setup
│   │   ├── custom.css         # Custom styles
│   │   └── components/        # Vue components
│   └── dist/                  # Build output
├── guide/                     # User guides
├── architecture/              # Architecture documentation
├── benchmarks/               # Benchmark results and analysis
├── api/                      # API documentation
├── public/                   # Static assets
├── scripts/                  # Deployment scripts
└── package.json              # Dependencies and scripts
```

## 🎨 Features

### Interactive Components

- **Interactive Charts**: Real-time performance visualizations using Chart.js
- **System Diagrams**: Interactive architecture diagrams with Mermaid
- **API Explorer**: Live API testing interface
- **Cross References**: Smart internal linking system
- **Feedback Widget**: User feedback collection

### Advanced Features

- **Local Search**: Fast client-side search across all documentation
- **Dark/Light Theme**: Automatic theme switching
- **Mobile Responsive**: Optimized for all device sizes
- **Version Selector**: Support for multiple documentation versions
- **Performance Optimized**: Lighthouse score 90+
- **Accessibility**: WCAG 2.1 AA compliant

## 🛠️ Development

### Adding New Pages

1. Create a new `.md` file in the appropriate directory
2. Add the page to the sidebar configuration in `.vitepress/config.js`
3. Use frontmatter for page metadata:

```yaml
---
title: Page Title
description: Page description for SEO
---
```

### Using Interactive Components

The documentation includes several custom Vue components:

```vue
<!-- Interactive performance charts -->
<InteractiveChart type="latency" />

<!-- System architecture diagrams -->
<SystemDiagram />

<!-- API testing interface -->
<ApiExplorer />

<!-- Cross-references -->
<CrossReference 
  title="Related Topics"
  :links="[...]"
  :seeAlso="[...]"
/>
```

### Styling Guidelines

- Use CSS custom properties for theming
- Follow VitePress design system
- Ensure dark mode compatibility
- Test on mobile devices

## 📊 Performance

### Lighthouse Scores

- **Performance**: 95+
- **Accessibility**: 100
- **Best Practices**: 100
- **SEO**: 100

### Optimization Features

- **Code Splitting**: Automatic route-based splitting
- **Image Optimization**: WebP format with fallbacks
- **Caching**: Aggressive caching for static assets
- **Compression**: Gzip/Brotli compression
- **CDN Ready**: Optimized for global distribution

## 🚀 Deployment

### Supported Platforms

- **GitHub Pages**: Automated via GitHub Actions
- **Netlify**: One-click deployment with `netlify.toml`
- **Vercel**: Zero-config deployment with `vercel.json`
- **AWS S3 + CloudFront**: Enterprise-grade hosting
- **Docker**: Containerized deployment with Nginx

### Deployment Scripts

```bash
# Deploy to production
./scripts/deploy.sh production

# Deploy to staging
./scripts/deploy.sh staging

# Start development server
./scripts/deploy.sh development

# Rollback to previous version
./scripts/deploy.sh rollback
```

### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `DOCKER_REGISTRY` | Docker registry URL | No |
| `AWS_S3_BUCKET` | S3 bucket name | For S3 deployment |
| `AWS_CLOUDFRONT_DISTRIBUTION_ID` | CloudFront distribution | No |
| `SLACK_WEBHOOK_URL` | Slack notifications | No |
| `STATUS_PAGE_API` | Status page API | No |

### GitHub Actions

The repository includes automated deployment via GitHub Actions:

- **Build**: Runs on every push to main
- **Deploy**: Deploys to GitHub Pages
- **Lighthouse CI**: Performance testing on PRs
- **Link Checking**: Validates all internal/external links

## 🔧 Configuration

### VitePress Config

Key configuration options in `.vitepress/config.js`:

```javascript
export default {
  title: 'Finance Ingestion Benchmark',
  description: 'High-performance financial data ingestion systems comparison',
  
  themeConfig: {
    nav: [...],
    sidebar: {...},
    search: {
      provider: 'local'
    }
  }
}
```

### Custom Theme

The documentation uses a custom VitePress theme with:

- Enhanced styling and branding
- Interactive Vue components
- Performance optimizations
- Accessibility improvements

## 📝 Content Guidelines

### Writing Style

- Use clear, concise language
- Include code examples for technical concepts
- Add cross-references to related topics
- Provide both beginner and advanced content

### Markdown Extensions

VitePress supports enhanced Markdown:

```markdown
::: tip
This is a tip box
:::

::: warning
This is a warning box
:::

::: danger
This is a danger box
:::

::: code-group
```bash [npm]
npm install
```

```bash [yarn]
yarn install
```
:::
```

### Code Examples

- Use syntax highlighting for all code blocks
- Include copy buttons for code snippets
- Provide examples in multiple languages where applicable
- Test all code examples for accuracy

## 🧪 Testing

### Automated Tests

```bash
# Run link checking
npm run test:links

# Run Lighthouse CI
npm run test:lighthouse

# Run accessibility tests
npm run test:a11y
```

### Manual Testing

- Test all interactive components
- Verify mobile responsiveness
- Check dark/light theme switching
- Validate search functionality
- Test feedback widget

## 📈 Analytics

### Supported Analytics

- **Google Analytics 4**: Page views and user interactions
- **Plausible**: Privacy-focused analytics
- **Custom Events**: Feedback submissions and component interactions

### Feedback Collection

The documentation includes a feedback widget that collects:

- Page ratings (1-5 stars)
- Feedback categories (helpful, confusing, incorrect, etc.)
- Optional comments
- Page metadata for analysis

## 🔒 Security

### Security Headers

The deployment includes security headers:

- `X-Frame-Options: DENY`
- `X-XSS-Protection: 1; mode=block`
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: strict-origin-when-cross-origin`
- Content Security Policy (CSP)

### Content Security

- All external links open in new tabs
- User-generated content is sanitized
- No inline scripts in production
- HTTPS-only in production

## 🤝 Contributing

### Development Workflow

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test locally with `npm run dev`
5. Build and test with `npm run build && npm run preview`
6. Submit a pull request

### Pull Request Guidelines

- Include screenshots for UI changes
- Update documentation for new features
- Ensure all tests pass
- Follow the existing code style

## 📞 Support

### Getting Help

- **GitHub Issues**: Bug reports and feature requests
- **Discussions**: Questions and community support
- **Documentation**: Comprehensive guides and API reference

### Troubleshooting

Common issues and solutions:

1. **Build Failures**: Check Node.js version and dependencies
2. **Broken Links**: Run link checker and fix invalid URLs
3. **Performance Issues**: Optimize images and reduce bundle size
4. **Mobile Issues**: Test responsive design and touch interactions

## 📄 License

This documentation is released under the MIT License. See the main project LICENSE file for details.

---

For more information about the Finance Ingestion Benchmark project, visit the [main repository](https://github.com/finance-ingestion-benchmark).