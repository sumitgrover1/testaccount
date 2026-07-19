import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Produces a self-contained .next/standalone/server.js that only needs its
  // own folder (plus copied-in static assets) to run — no full node_modules
  // install needed on the host. This is what lets cPanel's Node.js Selector
  // (Passenger) run the app directly on shared hosting; see DEPLOYMENT.md.
  output: 'standalone',
  // This site lives alongside the backend and admin panel in the same repo
  // (each with its own lockfile) — pin the workspace root so Next.js doesn't
  // have to guess.
  turbopack: {
    root: __dirname,
  },
};

export default nextConfig;
