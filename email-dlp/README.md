# Email DLP Gateway

An in-line SMTP relay that inspects outbound email for sensitive data and
allows, blocks, quarantines, redacts, or tags it according to policy —
Forcepoint-Email-DLP class, self-hosted.

**Status:** design phase. No implementation yet.

Start with the design document: [`docs/DESIGN.md`](./docs/DESIGN.md).

## Why in-line

An API-based scanner (Gmail/Graph) only sees a message after it has been
delivered. This gateway sits in the send path, so "block" actually blocks.

## Shape of the system

Three processes over PostgreSQL + Redis:

| Process | Role |
|---|---|
| `dlp-smtp` | SMTP ingress (submission) and egress (relay to smarthost) |
| `dlp-worker` | Parse → extract → detect → evaluate policy → decide |
| `dlp-api` | REST control plane + admin UI backend |

## Standalone by design

This directory is self-contained and shares nothing with the clinic management
backend in the repository root — separate package, schema, and deployment. It
can be lifted into its own repository with:

```sh
git subtree split --prefix=email-dlp -b email-dlp-standalone
```

## Next step

`docs/DESIGN.md` §21 lists the eight open questions that need answers before
Phase 1 implementation starts.
