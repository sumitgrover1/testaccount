import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // This frontend lives alongside the backend in the same repo (each with its
  // own lockfile) — pin the workspace root so Next.js doesn't have to guess.
  turbopack: {
    root: __dirname,
  },
};

export default nextConfig;
