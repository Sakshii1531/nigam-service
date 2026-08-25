import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    chunkSizeWarningLimit: 1000,
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [
            {
              name: 'vendor-react',
              test: /node_modules[\\/](react|react-dom|react-router-dom)/,
              priority: 50,
            },
            {
              name: 'vendor-three',
              test: /node_modules[\\/](@react-three|three)/,
              priority: 40,
            },
            {
              name: 'vendor-framer',
              test: /node_modules[\\/](framer-motion)/,
              priority: 30,
            },
            {
              name: 'vendor-lucide',
              test: /node_modules[\\/](lucide-react)/,
              priority: 20,
            },
            {
              // Firebase is only ever reached through a dynamic import in
              // lib/pushClient.js, but the catch-all vendor-other group below
              // would otherwise absorb it into an eagerly-loaded chunk — making
              // every visitor download the messaging SDK for a feature most of
              // them never turn on. Higher priority keeps it in its own lazy chunk.
              name: 'vendor-firebase',
              test: /node_modules[\\/](@firebase|firebase)/,
              priority: 45,
            },
            {
              name: 'vendor-other',
              test: /node_modules/,
              priority: 10,
            },
            {
              name: 'pages-super-admin',
              test: /src[\\/]pages[\\/]super-admin/,
              priority: 5,
            },
            {
              name: 'pages-brand-admin',
              test: /src[\\/]pages[\\/]brand-admin/,
              priority: 5,
            },
            {
              name: 'pages-technician',
              test: /src[\\/]pages[\\/]technician/,
              priority: 5,
            },
            {
              name: 'pages-buy-warranty',
              test: /src[\\/]pages[\\/](Buy|AMC|ExtendWarranty|Exchange|BuyProduct|BuyNew|PartnerWarranty|RaiseWarrantyRequest|SelectBrand|SelectProduct|SelectIssue)/,
              priority: 4,
            },
            {
              name: 'pages-general',
              test: /src[\\/]pages[\\/]/,
              priority: 2,
            }
          ]
        }
      }
    }
  }
});



