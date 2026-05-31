/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: "https",
        hostname: "amandita-products-uploads.s3.sa-east-1.amazonaws.com",
        port: "",
        pathname: "**",
      },
      {
        protocol: "http",
        hostname: "amandita-products-uploads.s3.sa-east-1.amazonaws.com",
        port: "",
        pathname: "**",
      },
      {
        protocol: "http",
        hostname: "d26zivezixyii1.cloudfront.net",
        port: "",
        pathname: "**",
      },
      {
        protocol: "https",
        hostname: "d26zivezixyii1.cloudfront.net",
        port: "",
        pathname: "**",
      },
      {
        protocol: "http",
        hostname: "localhost",
        port: "8080",
        pathname: "**",
      },
      {
        protocol: "http",
        hostname: "127.0.0.1",
        port: "8080",
        pathname: "**",
      },
      {
        protocol: "http",
        hostname: "amandita-frontend",
      },
      {
        protocol: "http",
        hostname: "amandita-frontend:3000",
      },
      {
        protocol: "https",
        hostname: "amandita-frontend",
      },
      {
        protocol: "https",
        hostname: "amandita-frontend:3000",
      },
    ],
  },
  basePath: "",
  reactStrictMode: false,
  typescript: {
    ignoreBuildErrors: false,
  },
};

module.exports = nextConfig;
