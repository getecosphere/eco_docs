import { defineConfig } from 'vitepress';
import { withMermaid } from 'vitepress-plugin-mermaid';

export default withMermaid(
  {
    title: 'eco',
    description: 'Host-native DDD platform — compose reusable domains into Proxmox estates',
    lang: 'en-US',
    cleanUrls: true,
    lastUpdated: true,
    outDir: 'dist',
    head: [
      ['meta', { name: 'og:title', content: 'eco — DDD orchestration for Proxmox' }],
      ['meta', { name: 'og:description', content: 'Compose reusable domains into self-sustaining application estates with a Docker-like developer experience, natively on Proxmox.' }]
    ],
    themeConfig: {
      logo: { light: '/logo-light.svg', dark: '/logo-dark.svg' },
      nav: [
        { text: 'Guide', link: '/guide/getting-started' },
        { text: 'Concepts', link: '/concepts/domains' },
        { text: 'Reference', link: '/reference/ecompose' },
        { text: 'Case Study', link: '/case-study/stuff8' }
      ],
      sidebar: {
        '/guide/': [
          {
            text: 'Guide',
            items: [
              { text: 'Getting Started', link: '/guide/getting-started' },
              { text: 'Quick Start', link: '/guide/quick-start' }
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
              { text: 'Scaling', link: '/concepts/scaling' }
            ]
          }
        ],
        '/reference/': [
          {
            text: 'Reference',
            items: [
              { text: 'ecompose.yml', link: '/reference/ecompose' },
              { text: 'CLI Commands', link: '/reference/cli' },
              { text: 'Architecture', link: '/reference/architecture' }
            ]
          }
        ],
        '/case-study/': [
          {
            text: 'Case Study',
            items: [{ text: 'Stuff8', link: '/case-study/stuff8' }]
          }
        ]
      },
      footer: {
        message: 'Released under the MIT License.',
        copyright: 'Copyright © 2026 eco'
      }
    }
  },
  {
    theme: 'default'
  }
);
