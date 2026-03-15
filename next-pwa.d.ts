declare module 'next-pwa' {
    import { NextConfig } from 'next';

    interface PWAConfig {
        dest?: string;
        register?: boolean;
        skipWaiting?: boolean;
        disable?: boolean;
        fallbacks?: {
            document?: string;
            image?: string;
            audio?: string;
            video?: string;
            font?: string;
        };
        runtimeCaching?: Array<{
            urlPattern: RegExp | string;
            handler: 'CacheFirst' | 'NetworkFirst' | 'StaleWhileRevalidate' | 'NetworkOnly' | 'CacheOnly';
            options?: {
                cacheName?: string;
                networkTimeoutSeconds?: number;
                expiration?: {
                    maxEntries?: number;
                    maxAgeSeconds?: number;
                };
            };
        }>;
    }

    export default function withPWA(config: PWAConfig): (nextConfig: NextConfig) => NextConfig;
}
