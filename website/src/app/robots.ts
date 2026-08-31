import type { MetadataRoute } from 'next';
import { siteConfig } from '@/config/site';

// The wildcard rule below already permits every crawler, AI ones included.
// These named entries are listed explicitly anyway so it's unambiguous
// (to anyone reading this file, and to the crawlers themselves) that LLM
// and AI-answer-engine crawlers are welcome to index this site — see
// /llms.txt for the LLM-oriented summary these crawlers are pointed at.
const AI_CRAWLER_USER_AGENTS = [
  'GPTBot',
  'ChatGPT-User',
  'OAI-SearchBot',
  'ClaudeBot',
  'Claude-Web',
  'anthropic-ai',
  'PerplexityBot',
  'Perplexity-User',
  'Google-Extended',
  'Applebot-Extended',
  'CCBot',
  'Amazonbot',
  'Meta-ExternalAgent',
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: '*', allow: '/' },
      ...AI_CRAWLER_USER_AGENTS.map((userAgent) => ({ userAgent, allow: '/' })),
    ],
    sitemap: `${siteConfig.url}/sitemap.xml`,
  };
}
