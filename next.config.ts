import type { NextConfig } from "next";

const isProd = process.env.NODE_ENV === "production";

const nextConfig: NextConfig = {
  output: "standalone",
  typescript: {
    tsconfigPath: isProd ? "tsconfig.build.json" : "tsconfig.json",
  },
  images: {
    localPatterns: [{ pathname: "/**" }],
    remotePatterns: [
      { protocol: "https", hostname: "i.ibb.co" },
      { protocol: "https", hostname: "ibb.co" },
      { protocol: "https", hostname: "res.cloudinary.com" },
    ],
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "Permissions-Policy",
            value: "microphone=*, camera=*",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
