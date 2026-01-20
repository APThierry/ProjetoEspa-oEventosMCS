/** @type {import('next').NextConfig} */
const nextConfig = {
  // Modo estrito do React (bom para desenvolvimento)
  reactStrictMode: true,
  
  // Otimização de minificação
  swcMinify: true,
  
  // Imagens externas permitidas (Supabase Storage)
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
      },
    ],
  },
  
  // Headers de segurança
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin',
          },
        ],
      },
    ]
  },
  
  // Configurações experimentais (opcional)
  experimental: {
    // Otimiza imports de pacotes grandes
    optimizePackageImports: ['lucide-react', '@radix-ui/react-icons'],
  },
}

module.exports = nextConfig