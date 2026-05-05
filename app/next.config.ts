import type { NextConfig } from "next";

const nextConfig: NextConfig = {
    // Ensure we use the Edge runtime for Cloudflare compatibility
    // runtime: 'edge', // Removed global edge runtime to avoid issues with some libraries, will specify per route

    webpack: (config, { isServer }) => {
        if (!isServer) {
            config.resolve.fallback = {
                ...config.resolve.fallback,
                net: false,
                tls: false,
                fs: false,
                readline: false,
                child_process: false,
                path: false,
                crypto: false,
                os: false,
                stream: false,
                buffer: require.resolve('buffer/'),
            };
        }
        return config;
    },
};

export default nextConfig;
