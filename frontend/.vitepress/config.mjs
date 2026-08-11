import { defineConfig } from 'vitepress';
import { withMermaid } from 'vitepress-plugin-mermaid';

const siteUrl = 'https://eco.stuff8.com';
const siteTitle = 'Eco — Compose reusable domains into self-sustaining estates';
const siteDescription =
  'Eco is a host-native DDD platform for Proxmox. Compose reusable domains into self-sustaining application estates with a Docker-like developer experience — no Docker required. Built for the world of AI: end-to-end, from a single developer to large teams.';

const jsonLd = JSON.stringify({
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'Eco',
  applicationCategory: 'DeveloperApplication',
  operatingSystem: 'Proxmox VE, Linux, macOS',
  description: siteDescription,
  url: siteUrl,
  publisher: {
    '@type': 'Organization',
    name: 'Eco'
  },
  offers: { '@type': 'Offer', price: '0' }
});

export default withMermaid(
  {
    title: 'Eco',
    description: siteDescription,
    lang: 'en-US',
    cleanUrls: true,
    lastUpdated: true,
    outDir: 'dist',
    head: [
      ['meta', { name: 'theme-color', content: '#43aa82' }],
      ['meta', { name: 'author', content: 'Eco' }],
      ['meta', { name: 'robots', content: 'index, follow' }],
      ['meta', { property: 'og:type', content: 'website' }],
      ['meta', { property: 'og:site_name', content: 'Eco' }],
      ['meta', { property: 'og:title', content: siteTitle }],
      ['meta', { property: 'og:description', content: siteDescription }],
      ['meta', { property: 'og:url', content: siteUrl }],
      ['meta', { property: 'og:image', content: `${siteUrl}/og-image.png` }],
      ['meta', { property: 'og:image:width', content: '1200' }],
      ['meta', { property: 'og:image:height', content: '630' }],
      ['meta', { property: 'og:image:type', content: 'image/png' }],
      ['meta', { property: 'og:locale', content: 'en_US' }],
      ['meta', { name: 'twitter:card', content: 'summary_large_image' }],
      ['meta', { name: 'twitter:title', content: siteTitle }],
      ['meta', { name: 'twitter:description', content: siteDescription }],
      ['meta', { name: 'twitter:image', content: `${siteUrl}/og-image.png` }],
      ['link', { rel: 'canonical', href: siteUrl }],
      ['link', { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' }],
      ['link', { rel: 'preconnect', href: 'https://cdn.jsdelivr.net' }],
      ['link', { rel: 'stylesheet', href: '/widgets/eco-contact-form.css' }],
      ['script', { src: '/widgets/eco-contact-form.js', defer: true }],
      ['script', { type: 'application/ld+json', innerHTML: jsonLd }]
    ],
    themeConfig: {
      logo: { light: '/logo-light.svg', dark: '/logo-dark.svg' },
      nav: [
        { text: 'Ecosphere', link: '/ecosphere/' },
        { text: 'Guide', link: '/guide/getting-started' },
        { text: 'Why Eco', link: '/why/eco-vs-docker' },
        { text: 'Concepts', link: '/concepts/domains' },
        { text: 'Reference', link: '/reference/ecompose' },
        { text: 'Case Study', link: '/case-study/java-to-rust-migration' },
        { text: 'Tips', link: '/tips/backspace-in-tmux' },
        { text: 'Contact', link: '/contact' }
      ],
      sidebar: {
        '/ecosphere/': [
          {
            text: 'Ecosphere',
            items: [
              { text: 'Introducing LXS', link: '/ecosphere/' },
              { text: 'Why Rust & Go?', link: '/ecosphere/why-rust-and-go' },
              { text: 'Tutorial: 3 apps with OpenCode Zen', link: '/ecosphere/tutorial-open-code-zen' }
            ]
          }
        ],
        '/guide/': [
          {
            text: 'Guide',
            items: [
              { text: 'Getting Started', link: '/guide/getting-started' },
              { text: 'Quick Start', link: '/guide/quick-start' },
              { text: 'Prod & Staging Workflow', link: '/guide/prod-staging-workflow' },
              { text: 'Supported Languages', link: '/guide/languages' }
            ]
          }
        ],
        '/why/': [
          {
            text: 'Why Eco',
            items: [
              { text: 'Eco vs Docker', link: '/why/eco-vs-docker' },
              { text: 'Why Eco promotes Rust', link: '/why/why-rust' },
              { text: 'Why Golang?', link: '/why/why-golang' },
              { text: 'The end-to-end model', link: '/why/end-to-end' },
              { text: 'The story behind Eco', link: '/why/story' },
              { text: 'Why the name "Eco"', link: '/why/the-name' }
            ]
          }
        ],
        '/concepts/': [
          {
            text: 'Concepts',
            items: [
              { text: 'Domains', link: '/concepts/domains' },
              { text: 'Estates', link: '/concepts/estates' },
              { text: 'The Resource Registry', link: '/concepts/registry' },
              { text: 'Composition', link: '/concepts/composition' },
              { text: 'Scaling', link: '/concepts/scaling' },
              { text: 'CI/CD — built in', link: '/concepts/cicd' },
              { text: 'What is Proxmox?', link: '/concepts/proxmox' }
            ]
          }
        ],
        '/reference/': [
          {
            text: 'Reference',
            items: [
              { text: 'ecompose.yml', link: '/reference/ecompose' },
              { text: 'CLI Commands', link: '/reference/cli' },
              { text: 'Architecture', link: '/reference/architecture' },
              { text: 'Domain Catalog', link: '/reference/domains' }
            ]
          }
        ],
         '/case-study/': [
          {
             text: 'Case Study',
             items: [
              { text: 'Java → Rust Migration', link: '/case-study/java-to-rust-migration' },
              { text: 'Stuff8', link: '/case-study/stuff8' },
              { text: 'Stress Testing at Scale', link: '/case-study/stress-test' },
              { text: 'Single-Binary Rust', link: '/case-study/single-binary-stress-test' },
              { text: 'Go → Rust Conversion', link: '/case-study/go-to-rust' },
              { text: 'Keeping Multi-Binary', link: '/case-study/keeping-multi-binary' },
              { text: 'The eco CLI: Node → Rust', link: '/case-study/eco-cli-node-to-rust' },
              { text: 'Future Scaling Features', link: '/case-study/future-scaling-features' }
            ]
          }
        ],
        '/contact/': [
          {
            text: 'Contact',
            items: [{ text: 'Contact', link: '/contact' }]
          }
        ],
        '/tips/': [
          {
            text: 'Tips & Tricks',
            items: [
              { text: 'Backspace broken in tmux', link: '/tips/backspace-in-tmux' },
              { text: 'opencode crashes on some SSH clients', link: '/tips/opencode-crash-on-some-ssh-clients' }
            ]
          }
        ]
      },
      footer: {
        message: 'Released under the MIT License.',
        copyright: 'Copyright © 2026 Eco'
      }
    }
  },
  {
    theme: 'default'
  }
);
