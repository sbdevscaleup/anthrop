import type { NextConfig } from "next";

const remotePatterns: NonNullable<NextConfig["images"]>["remotePatterns"] = [
  {
    protocol: "https",
    hostname: "lh3.googleusercontent.com",
    pathname: "/**",
  },
  {
    protocol: "https",
    hostname: "lh4.googleusercontent.com",
    pathname: "/**",
  },
  {
    protocol: "https",
    hostname: "lh5.googleusercontent.com",
    pathname: "/**",
  },
  {
    protocol: "https",
    hostname: "cdn.discordapp.com",
    pathname: "/avatars/**",
  },
  {
    protocol: "https",
    hostname: "images.unsplash.com",
    port: "",
    pathname: "/**",
  },
];

const r2PublicBaseUrl = process.env.NEXT_PUBLIC_R2_PUBLIC_BASE_URL;
if (r2PublicBaseUrl) {
  try {
    const parsed = new URL(r2PublicBaseUrl);
    remotePatterns.push({
      protocol: parsed.protocol.replace(":", "") as "https" | "http",
      hostname: parsed.hostname,
      port: parsed.port,
      pathname: "/**",
    });
  } catch {
    // Ignore invalid URL format and keep defaults.
  }
}

const nextConfig: NextConfig = {
  images: {
    remotePatterns,
  },
};

export default nextConfig;
