# Email DLP Gateway

An in-line SMTP relay that inspects outbound email for sensitive data and
allows, blocks, quarantines, redacts, or tags it according to policy —
Forcepoint-Email-DLP class, self-hosted.

**Status:** design phase. No implementation yet. First deployment is for a
fintech client — see §1.2 and §15.1 of the design for what that constrains.

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

This directory is self-contained and shares nothing with the unrelated
application in the repository root — separate package, schema, and deployment.
It lives here only because it is where the branch is; lift it into its own
repository with:

```sh
git subtree split --prefix=email-dlp -b email-dlp-standalone
```

## Next step

`docs/DESIGN.md` §21 is the client discovery list — six blocking questions that
gate Phase 1, plus scoping and delivery questions.
