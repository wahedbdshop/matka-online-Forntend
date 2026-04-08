import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  images: {
    localPatterns: [
      {
        pathname: "/logo.png",
        search: "?v=20260331-1726",
      },
      {
        pathname: "/thai.png",
      },
      {
        pathname: "/kalyan.png",
      },
      {
        pathname: "/kalyanHome.png",
      },
      {
        pathname: "/pcso.png",
      },
    ],
    remotePatterns: [
      { protocol: "https", hostname: "i.ibb.co" },
      { protocol: "https", hostname: "ibb.co" },
    ],
  },
};

export default nextConfig;
