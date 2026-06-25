import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Configuration Vite pour le projet SoundCheck.
// - plugin React pour le support JSX et Fast Refresh
// - plugin Tailwind CSS v4 (utilise @tailwindcss/vite, plus de fichier de config)
// - proxy /deezer pour contourner CORS pendant le développement local.
//   En production (Vercel), on bascule sur corsproxy.io côté client.
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    // host: true → Vite écoute sur toutes les interfaces réseau (0.0.0.0),
    // ce qui rend le serveur de dev accessible depuis un autre appareil du
    // même Wi-Fi (ton téléphone) via http://<IP-de-ton-PC>:5173
    host: true,
    proxy: {
      '/deezer': {
        target: 'https://api.deezer.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/deezer/, ''),
      },
    },
  },
})
