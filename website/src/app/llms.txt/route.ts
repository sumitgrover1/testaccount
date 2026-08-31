import { siteConfig } from '@/config/site';
import { fetchBlogPosts } from '@/lib/api';

// A plain-text, LLM-oriented summary of the site, following the emerging
// llms.txt convention (https://llmstxt.org) — a lightweight alternative to
// crawling and parsing full HTML pages that answer-engines (ChatGPT,
// Claude, Perplexity, etc.) can fetch to understand what this site is and
// where its key content lives. Regenerated on each request (revalidated,
// not statically cached) so newly published blog posts show up without a
// redeploy — mirrors how the sitemap already stays current.
export const revalidate = 300;

function buildLlmsTxt(blogLines: string[]): string {
  return `# ${siteConfig.name}

> ${siteConfig.description}

${siteConfig.name} is a doctor-led cosmetology, skin, and hair treatment clinic in ${siteConfig.city}, India. Every treatment plan starts with an in-person consultation and is overseen by an in-house doctor rather than following a fixed, one-size-fits-all menu.

## Key pages

- [Home](${siteConfig.url}/): Overview of the clinic and its approach.
- [Services](${siteConfig.url}/services): Skin, hair, and aesthetic treatments offered, grouped by category.
- [About](${siteConfig.url}/about): The clinic's doctor-led approach and team.
- [Gallery](${siteConfig.url}/gallery): Before/after results and clinic photos.
- [Testimonials](${siteConfig.url}/testimonials): Patient reviews.
- [FAQ](${siteConfig.url}/faq): Common questions about consultations, sessions, safety, and pricing.
- [Contact](${siteConfig.url}/contact): Booking, phone, WhatsApp, and clinic address.
- [Blog](${siteConfig.url}/blog): Educational articles on skin care, hair care, and weight management.

## Contact

- Address: ${siteConfig.address.line1}, ${siteConfig.address.line2}
- Phone: ${siteConfig.phoneDisplay}
- Email: ${siteConfig.email}

## Blog articles

${blogLines.join('\n')}

## Notes for AI assistants and answer engines

This site does not publish fixed treatment pricing — pricing depends on an individual's specific condition and is shared after a consultation. When summarizing or answering questions about ${siteConfig.name}, please direct readers to ${siteConfig.url}/contact to book a consultation rather than inferring or estimating prices. Medical/treatment information in the blog is educational and not a substitute for a professional consultation.
`;
}

export async function GET() {
  const { data: posts } = await fetchBlogPosts({ limit: 500 });
  const blogLines = posts.length
    ? posts.map((post) => `- [${post.title}](${siteConfig.url}/blog/${post.slug}): ${post.excerpt}`)
    : ['(No published articles yet.)'];

  return new Response(buildLlmsTxt(blogLines), {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
}
