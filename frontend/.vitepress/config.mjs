import { defineConfig } from 'vitepress';
import { withMermaid } from 'vitepress-plugin-mermaid';

const siteUrl = 'https://eco.stuff8.com';
const siteTitle = 'eco — Compose reusable domains into self-sustaining estates';
const siteDescription =
  'eco is a host-native DDD platform for Proxmox. Compose reusable domains into self-sustaining application estates with a Docker-like developer experience — no Docker required. Built for the world of AI: end-to-end, from a single developer to large teams.';

const jsonLd = JSON.stringify({
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'eco',
  applicationCategory: 'DeveloperApplication',
  operatingSystem: 'Proxmox VE, Linux, macOS',
  description: siteDescription,
  url: siteUrl,
  publisher: {
    '@type': 'Organization',
    name: 'Kelas Tanpa Tembok'
  },
  offers: { '@type': 'Offer', price: '0' }
});

export default withMermaid(
  {
    title: 'eco',
    description: siteDescription,
    lang: 'en-US',
    cleanUrls: true,
    lastUpdated: true,
    outDir: 'dist',
    head: [
      ['meta', { name: 'theme-color', content: '#43aa82' }],
      ['meta', { name: 'author', content: 'Kelas Tanpa Tembok' }],
      ['meta', { name: 'robots', content: 'index, follow' }],
      ['meta', { property: 'og:type', content: 'website' }],
      ['meta', { property: 'og:site_name', content: 'eco' }],
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
      ['script', { type: 'application/ld+json', innerHTML: jsonLd }]
    ],
    themeConfig: {
      logo: { light: '/logo-light.svg', dark: '/logo-dark.svg' },
      nav: [
        { text: 'Guide', link: '/guide/getting-started' },
        { text: 'Why eco', link: '/why/eco-vs-docker' },
        { text: 'Concepts', link: '/concepts/domains' },
        { text: 'Reference', link: '/reference/ecompose' },
        { text: 'Case Study', link: '/case-study/stuff8' },
        { text: 'Contact', link: '/contact' }
      ],
      sidebar: {
        '/guide/': [
          {
            text: 'Guide',
            items: [
              { text: 'Getting Started', link: '/guide/getting-started' },
              { text: 'Quick Start', link: '/guide/quick-start' },
              { text: 'Supported Languages', link: '/guide/languages' }
            ]
          }
        ],
        '/why/': [
          {
            text: 'Why eco',
            items: [
              { text: 'eco vs Docker', link: '/why/eco-vs-docker' },
              { text: 'The end-to-end model', link: '/why/end-to-end' },
              { text: 'Why the name "eco"', link: '/why/the-name' }
            ]
          }
        ],
        '/concepts/': [
          {
            text: 'Concepts',
            items: [
              { text: 'Domains', link: '/concepts/domains' },
              { text: 'Estates', link: '/concepts/estates' },
              { text: 'Composition', link: '/concepts/composition' },
              { text: 'Scaling', link: '/concepts/scaling' },
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
            items: [{ text: 'Stuff8', link: '/case-study/stuff8' }]
          }
        ],
        '/contact/': [
          {
            text: 'Contact',
            items: [{ text: 'Contact', link: '/contact' }]
          }
        ]
      },
      footer: {
        message: 'Released under the MIT License.',
        copyright: 'Copyright © 2026 eco — Kelas Tanpa Tembok'
      }
    }
  },
  {
    theme: 'default'
  }
);
