# Email DLP Gateway — Design Document

**Status:** Draft for review
**Scope:** Outbound email Data Loss Prevention gateway, Forcepoint-Email-DLP class
**Deployment model:** In-line SMTP relay (store-and-forward MTA in the send path)
**Client:** India-based fintech company

## Decisions to date

Settled — these are fixed inputs to Phase 1, not open questions:

| Decision | Value | Consequence |
|---|---|---|
| Topology | In-line SMTP relay, not API-based | "Block" actually blocks (§1.1); gateway becomes production mail infrastructure |
| Codebase | Standalone project, no coupling to anything else | Own package, schema, deployment |
| Client sector | Fintech | Policy pack defaults to PCI-DSS + DPDP + Financial (§9.6) |
| Jurisdiction | **India** | RBI localisation, CERT-In, DPDP all apply as hard constraints (§15.1) |
| Hosting region | **India only** — all state (blob store, Postgres, Redis) | Follows from localisation; rules out non-Indian managed-service regions |
| LLM classifier stage | **Off**; self-hosted in-country only if ever enabled | Follows from localisation (§8.7) |
| Fail mode | `fail-closed` (proposed default) | Needs client sign-off — §21.1 Q5 |

Still open: the six blocking questions in §21.1. Four of them (mail platform,
smarthost, card-data scope, legal clearance) are deployment- and config-layer
concerns that do **not** block the detection engine — Phase 1 can start.

---

## 1. Purpose

Prevent sensitive data — customer and employee records, payment card data,
government identifiers, health records, credentials, source code, confidential
documents — from leaving the organisation over email, **before** the message
reaches the internet.

The system is built for a specific client deployment, but nothing in the design
is industry-specific: what counts as sensitive is expressed entirely in policy
and dictionaries (§9), so the same engine serves a hospital, a bank, or a
software company by swapping the policy pack, not the code.

The system sits in the outbound mail path as an SMTP relay. Every message is
parsed, extracted, classified against policy, and then allowed, quarantined,
blocked, redacted, or flagged for encryption. Every decision produces an
immutable incident record with full forensics.

### 1.1 Why in-line relay (and not API-based)

An API integration (Gmail/Graph) can only detect a leak *after* delivery. Once
a message with 4,000 customer records has reached an external MX, deletion is a
courtesy, not a control. An in-line relay is the only topology where "block"
actually means blocked. Cost: the gateway becomes availability-critical mail
infrastructure, which drives most of the reliability design in §6 and §16.

### 1.2 Client context

The deployment is for an **India-based fintech company**. That is not a
cosmetic detail — it sets three things that ripple through the whole design:

1. **The data is regulated on multiple axes at once.** Cardholder data
   (PCI-DSS), customer financial records, KYC identity documents, RBI's
   payment-data localisation circular, CERT-In's logging directions, and the
   DPDP Act — simultaneously. §15.1 works through this. The binding one is
   localisation: it fixes the hosting region before any other choice is made.
2. **The highest-risk leak is bulk, not incidental.** A support agent emailing
   one customer's statement is a policy violation. An analyst exporting 50,000
   rows of `customer_id, account_no, ifsc, balance` to a personal address is
   the event that ends careers and triggers regulatory reporting. The
   record-structure detector (§8.4) and EDM (§8.5) are the load-bearing
   components here, not the regex library.
3. **Where the system stores data is itself a compliance question.** A DLP
   gateway that retains forensic copies of messages containing cardholder data
   has just created a new PCI scope boundary. §12.4 retention and §8's
   never-store-raw-values rule are compliance controls, not hygiene.

Everything else in this document is platform-neutral. The fintech specifics are
confined to §9.6 (policy pack), §15.1 (regulatory), and §21 (discovery).

---

## 2. Non-goals (explicitly out of scope)

| Not building | Why |
|---|---|
| Endpoint agent (USB, print, clipboard, screenshot DLP) | Different product surface. Email channel only. |
| Inbound mail security (anti-spam, anti-phishing, malware sandbox) | Complementary product, not DLP. Assume an existing inbound gateway. |
| Full MTA feature set (mailing lists, virtual domains, LDAP routing) | We relay to an existing smarthost; we are not the authoritative MTA. |
| Vendor-scale policy template library (1000+ regulations) | We ship ~20 curated, tested policies (§9.6) and let customers author more. |
| Trained proprietary ML classifiers | Replaced by an optional LLM classifier stage (§8.7) with strict cost/latency budget. |
| Email archiving / eDiscovery | Adjacent. We retain forensic copies of *incidents* only, on a retention clock. |

---

## 3. Feature parity map vs Forcepoint Email DLP

Honest assessment of what we match, approximate, and skip.

| Forcepoint capability | Our plan | Phase |
|---|---|---|
| In-line SMTP inspection with block/quarantine/encrypt | Full parity | 1 |
| Pattern detection (regex) with validation checksums | Full parity | 1 |
| Keyword dictionaries, weighted, with proximity | Full parity | 1 |
| Attachment text extraction (Office, PDF, archives) | Full parity | 1 |
| True file type detection (magic bytes, not extension) | Full parity | 1 |
| Cumulative/threshold rules ("≥10 records") | Full parity | 1 |
| Directional policy (internal→external only) | Full parity | 1 |
| Incident workbench, release/deny workflow, forensics | Full parity | 2 |
| Exact Data Match (EDM) — fingerprint a customer DB | Parity via salted-hash token index + Bloom filter | 3 |
| Indexed Document Match (IDM) — fingerprint documents | Approximate parity via MinHash/SimHash shingling | 3 |
| OCR of images inside attachments | Tesseract; accuracy below commercial OCR | 4 |
| Pre-trained ML classifiers | Replaced by LLM classifier stage | 4 |
| Encrypted/password-protected file handling | Detect-and-policy (cannot inspect); parity | 1 |
| Structured-data steganography, image forensics | Skipped | — |
| Endpoint DLP, web/CASB channel | Skipped (non-goal) | — |
| Appliance HA, clustering, 100k+ msg/hr | Horizontal scale designed in; not tuned to appliance grade | 3 |

**Bottom line:** phases 1–3 produce a system that catches the leaks that
actually happen — bulk database exports, misdirected customer lists, card
numbers in spreadsheets, credentials in plaintext, confidential documents sent
to a personal Gmail account on someone's last week at the company.
The gap to Forcepoint is breadth of policy library and ML sophistication, not
architecture.

---

## 4. High-level architecture

```
   Internal senders                                              Internet
   (app, staff MUA,                                                 │
    ERP, CRM)                                                       │
        │                                                           │
        │ SMTP (submission, AUTH + STARTTLS)                        │
        ▼                                                           │
┌───────────────────────────────────────────┐                       │
│  SMTP INGRESS  (smtp-server)              │                       │
│  · TLS, AUTH, IP allowlist                │                       │
│  · envelope capture (MAIL FROM/RCPT TO)   │                       │
│  · size / recipient limits                │                       │
│  · spool to disk + enqueue                │                       │
└──────────────────┬────────────────────────┘                       │
                   │ msgId (spooled, durable)                       │
                   ▼                                                │
┌───────────────────────────────────────────┐                       │
│  INSPECTION WORKER  (BullMQ / Redis)      │                       │
│  1. MIME parse            (mailparser)    │                       │
│  2. Extract               (§7)            │                       │
│  3. Detect                (§8)            │                       │
│  4. Evaluate policy       (§9)            │                       │
│  5. Decide action         (§10)           │                       │
└──────────────────┬────────────────────────┘                       │
                   │ verdict                                        │
      ┌────────────┼─────────────┬──────────────┐                   │
      ▼            ▼             ▼              ▼                   │
   ALLOW      QUARANTINE       BLOCK        ENCRYPT/                │
      │            │             │          REDACT                  │
      │            │             │              │                   │
      │            ▼             ▼              │                   │
      │      ┌──────────┐  ┌──────────┐         │                   │
      │      │ Incident │  │ Incident │         │                   │
      │      │ + hold   │  │ + NDR to │         │                   │
      │      │ blob     │  │ sender   │         │                   │
      │      └────┬─────┘  └──────────┘         │                   │
      │           │ release                     │                   │
      ▼           ▼                             ▼                   │
┌───────────────────────────────────────────┐                       │
│  SMTP EGRESS  (nodemailer → smarthost)    │──────────────────────►│
│  · retry with backoff, DSN handling       │   SES / SendGrid /    │
│  · per-domain TLS enforcement (MTA-STS)   │   Google / on-prem MTA│
└───────────────────────────────────────────┘                       │

┌───────────────────────────────────────────┐
│  CONTROL PLANE (REST API + Admin UI)      │
│  · policy authoring & versioning          │
│  · incident workbench, release/deny       │
│  · dictionaries, EDM/IDM index management │
│  · reports, audit log                     │
└───────────────────────────────────────────┘
```

### 4.1 Processes

Three deployable units, independently scalable:

| Process | Responsibility | Scale driver |
|---|---|---|
| `dlp-smtp` | SMTP ingress + egress, spooling | Connection count |
| `dlp-worker` | Inspection pipeline | CPU (extraction + detection) |
| `dlp-api` | REST API + admin UI backend | Admin usage (low) |

Shared: PostgreSQL (state), Redis (queue + cache), object store or filesystem
(message spool + forensic blobs).

### 4.2 Technology choices

| Concern | Choice | Rationale |
|---|---|---|
| Language | TypeScript (strict), Node 20+ | Matches team; excellent MIME/SMTP ecosystem (nodemailer/mailparser by the same author) |
| SMTP server | `smtp-server` | Battle-tested, streaming, TLS/AUTH built in |
| SMTP client | `nodemailer` | Same lineage, connection pooling, DSN |
| MIME parse | `mailparser` | Streaming, handles malformed real-world MIME |
| Queue | BullMQ + Redis | Durable, retries, rate limiting, dead-letter |
| DB | PostgreSQL + Prisma | JSONB for policy/evidence, partial indexes, partitioning for incidents |
| File type | `file-type` (magic bytes) | Extension is attacker-controlled |
| Extraction | `pdf-parse`, `mammoth`, `exceljs`, `yauzl`, `officeparser` | See §7 |
| Sandboxing | Extraction runs in a child process with rlimits | Parser CVEs are the #1 RCE risk (§15) |

**Language note:** extraction is the CPU-bound part and Node is not ideal for it.
If throughput becomes the binding constraint, the extraction stage is the one
component designed to be swappable for a Go or Rust sidecar over a simple
job protocol — the interface is a pure function `bytes → ExtractedPart[]`.

---

## 5. Message identity and direction

Every message gets a `messageRef` (ULID) at ingress, used for spool path, queue
job, incident, and audit correlation.

**Direction classification** drives most policy. Computed from envelope, not
headers (headers are forgeable):

```ts
type Direction =
  | 'internal'      // all recipients in protected domains
  | 'outbound'      // ≥1 recipient outside protected domains
  | 'mixed';        // both — treated as outbound for enforcement
```

Protected domains are configured, plus optional "trusted partner" domain groups
that can carry relaxed policy (e.g. the KYC verification vendor legitimately
receives identity documents; the auditor legitimately receives ledger extracts).

**Sender identity** = authenticated SMTP AUTH user where available, else
envelope MAIL FROM, else source IP mapping. Recorded separately so incidents
show who *authenticated*, not just who the message *claims* to be from — a
compromised-account leak looks exactly like a normal one otherwise.

---

## 6. SMTP gateway behaviour

### 6.1 Placing the gateway in the client's mail flow

Before any of the below matters, outbound mail has to actually traverse the
gateway. How that is arranged depends entirely on the client's mail platform,
and it is the part of the project most likely to need their IT team:

| Client platform | How the gateway gets in the path | Friction |
|---|---|---|
| **Microsoft 365 / Exchange Online** | Outbound connector: `Route mail through these smart hosts` → gateway. Gateway then relays back out via a receive connector or direct-to-MX. | Moderate — tenant admin change, needs certificate + static IP |
| **Google Workspace** | Routing → `Outbound gateway` (or a content-compliance rule with a route to the gateway host). | Moderate — same shape |
| **On-prem Exchange / Postfix** | Send connector / `relayhost` points at the gateway. | Low |
| **Application-generated mail only** (ERP, CRM, billing) | Change each app's SMTP host to the gateway. No mailbox platform involved. | Lowest — a good Phase 1 pilot scope |
| **Staff using desktop/mobile clients directly** | Clients submit to the gateway on 587 with AUTH, or the platform routes on their behalf. | Highest — touches every user |

Two consequences worth stating early to the client:

1. **The gateway becomes production mail infrastructure.** Its availability
   budget is the mail system's availability budget. This drives §6.4.
2. **Mailbox-platform routing changes are a change-control item**, not a
   developer task. Their IT/mail owner needs to be in the project from week one,
   and the pilot should start with application-generated mail (lowest friction,
   often the highest-volume source of bulk data exports anyway).

A useful staged rollout: application mail → one pilot department → all staff,
with the gateway in monitor mode (§9.5) at every step before enforcement.

### 6.2 Ingress

- Listens on 587 (submission, AUTH required, STARTTLS required) and optionally
  25 for internal-only relay restricted by IP allowlist.
- Limits: max message size (default 50 MB), max recipients (default 100), max
  concurrent connections per IP, command timeouts.
- Message is streamed to the spool (never fully buffered in memory) and hashed
  (SHA-256) while streaming.
- **Accept-then-inspect**, not inspect-during-DATA. We `250 OK` after spooling,
  then inspect asynchronously. Rationale: inspecting a 40 MB archive inside the
  DATA transaction blows SMTP timeouts and makes the client retry storms. Cost:
  a blocked message needs an NDR rather than a `550` rejection at DATA time.

  *Configurable alternative:* `syncInspection: true` performs inspection before
  the final dot for messages under a size threshold (default 2 MB), giving a
  true `550 5.7.0 Message blocked by DLP policy` rejection for the common case.
  Recommended default: sync for small messages, async above the threshold.

### 6.3 Egress

- Relays to a configured smarthost (SES/SendGrid/Google/on-prem) with pooled
  connections, or direct-to-MX if configured.
- Retry with exponential backoff on 4xx; permanent failure on 5xx generates a
  DSN to the original sender.
- Per-domain TLS policy: `require`, `prefer`, `none`. MTA-STS/DANE lookups are
  Phase 3.
- Adds `X-DLP-Scan-Id` and, when policy calls for downstream encryption,
  `X-DLP-Encrypt: true` (or a configured subject tag) for the encryption gateway.

### 6.4 Failure posture — the single most important operational decision

If the inspection pipeline is down, what happens to mail?

| Mode | Behaviour | Use when |
|---|---|---|
| `fail-closed` | Queue and hold; do not relay. Mail delays, nothing leaks. | Regulated data (PHI/PCI). **Default.** |
| `fail-open` | Relay uninspected, mark incident `UNINSPECTED`. | Availability > confidentiality |
| `fail-degraded` | Relay only if message passes a cheap-detector-only pass (regex, no extraction). | Middle ground |

Configurable per-policy: a policy may declare `failMode: 'closed'` so that
HIPAA-scoped mail holds even when the global mode is open. Held mail has a
maximum hold time after which it is quarantined and the sender is notified —
silent indefinite holding is worse than either failure mode.

---

## 7. Content extraction

The detector engine only ever sees normalised text plus structured metadata.
All format handling lives here.

### 7.1 Extraction tree

A message decomposes into a tree of `Part`s:

```ts
interface ExtractedPart {
  partId: string;            // '0.2.1' — stable path in the tree
  parentId: string | null;
  source: 'subject' | 'body' | 'header' | 'attachment' | 'embedded';
  filename?: string;
  declaredType?: string;     // Content-Type / extension — untrusted
  trueType: string;          // magic-byte detection — authoritative
  bytes: number;
  text: string | null;       // extracted plain text, null if not extractable
  extraction: 'ok' | 'unsupported' | 'encrypted' | 'corrupt'
            | 'too-large' | 'too-deep' | 'timeout';
  sha256: string;
}
```

Detectors run over every part with `text !== null`; parts with a non-`ok`
extraction status are themselves policy-relevant (§7.4).

### 7.2 Format support (Phase 1)

| Family | Handling |
|---|---|
| text/plain, text/html | Direct; HTML stripped to text, and **also** scanned raw (data hidden in attributes/comments is a real exfil path) |
| PDF | `pdf-parse`; encrypted PDFs → `encrypted` |
| DOCX/XLSX/PPTX | `mammoth` / `exceljs` / `officeparser`; comments, speaker notes, hidden rows/columns/sheets all extracted — hiding a column is the oldest trick |
| Legacy DOC/XLS/PPT | `officeparser` best-effort; failures → `unsupported` |
| CSV/TSV | Parsed as records, enabling accurate record-count thresholds |
| ZIP/TAR/GZ/7z | Recursive descent with limits (§7.3); encrypted archives → `encrypted` |
| RTF, EML (attached messages) | Recursive parse |
| Images | Phase 4 (OCR) |

### 7.3 Resource limits (mandatory, not optional)

Zip bombs and parser hangs are the primary DoS vector against any DLP gateway.

```
maxMessageBytes         50 MB
maxPartBytes            25 MB   (post-decompression, per part)
maxTotalExtractedBytes  200 MB  (cumulative decompression budget per message)
maxArchiveDepth         5
maxPartsPerMessage      500
perPartTimeoutMs        10_000
perMessageTimeoutMs     60_000
```

Exceeding any limit does **not** silently truncate. It marks the part
`too-large`/`too-deep`/`timeout` and raises a `ExtractionLimitExceeded` signal
that policy can act on (default: quarantine for review). "We couldn't look
inside it" must never be silently treated as "it was clean".

### 7.4 Undecryptable content is a policy decision

Password-protected archives and encrypted PDFs are the classic bypass. The
gateway cannot inspect them, so policy decides:

- `allow` — permissive orgs
- `quarantine` — **recommended default** for outbound to non-partner domains
- `block` — high-security
- `allow-if-recipient-in-partner-group`

The same applies to `unsupported` and `corrupt`. A malformed file that no
parser understands, sent to a personal Gmail address, is a signal, not noise.

---

## 8. Detection engine

A **detector** is a pure function over `(part, context) → Match[]`. Detectors
are stateless and independently testable; that's the core testability property
of the whole design.

```ts
interface Match {
  detectorId: string;
  partId: string;
  offset: number;
  length: number;
  redactedSample: string;   // '4111********1111' — never the raw value
  confidence: number;       // 0..1
  meta?: Record<string, unknown>;
}
```

**Never store the matched raw value in the incident record.** The incident DB
would otherwise become the highest-value PII store in the company. Store
offsets and a masked sample; the raw message lives once, encrypted, in the
forensic blob store with a retention clock (§12.4).

### 8.1 Pattern detectors with validators

Regex alone produces unusable false-positive rates. Every numeric identifier
detector pairs a pattern with an arithmetic/format validator:

| Detector | Pattern | Validator |
|---|---|---|
| Payment card (PAN) | 13–19 digits, optional separators | **Luhn** + IIN range + not a known test PAN (4111…) |
| Aadhaar | 12 digits | **Verhoeff** checksum + not all-same-digit + not starting 0/1 |
| PAN (India tax) | `[A-Z]{5}[0-9]{4}[A-Z]` | 4th char in valid entity set |
| GSTIN | 15 chars | Check digit + valid state code prefix |
| IFSC | `[A-Z]{4}0[A-Z0-9]{6}` | 5th char is literal `0` |
| US SSN | `\d{3}-?\d{2}-?\d{4}` | Not 000/666/9xx area, not 00 group, not 0000 serial |
| IBAN | Country + length table | **mod-97** |
| NPI (US health) | 10 digits | Luhn with 80840 prefix |
| Bank account no. (India) | 9–18 digits | Weak alone — **requires** IFSC or account-context proximity to score |
| UPI VPA | `[\w.\-]{3,}@[a-z]{3,}` | Handle against a known PSP suffix list (`@okhdfcbank`, `@ybl`, `@paytm`…) |
| CVV | 3–4 digits | Only ever scored in proximity to a PAN or "cvv/cvc" keyword |
| Credit bureau score | 3 digits, 300–900 | Requires "CIBIL/Experian/bureau" proximity |
| Voter ID / DL / passport | Format per issuer | Format check; KYC-document context boost |
| Email/phone | RFC-ish | Domain sanity, length |

**Fintech-specific note on precision.** Bank account numbers and CVVs are the
two detectors that will generate the most false positives if scored on pattern
alone — a 12-digit invoice number and a 3-digit quantity are everywhere in
normal business mail. Both are deliberately specified as **context-required**:
they contribute score only in proximity to a corroborating signal (an IFSC, a
PAN, an account-related keyword). This is the difference between a policy the
client keeps and one they switch off in week three.

Plus **context boosting**: a bare 16-digit number scores 0.55; the same number
within 50 characters of "card", "cvv", "expiry", "visa" scores 0.95. Proximity
is a first-class scoring input, not an afterthought.

### 8.2 Secret / credential detectors

High-precision patterns for AWS keys, Google API keys, GitHub tokens, Slack
tokens, private key PEM blocks, JWTs, connection strings with embedded
passwords, and `.env`-shaped content. These are near-zero-false-positive and
should default to `block`, not `quarantine`.

### 8.3 Dictionary detectors

Weighted term lists with per-dictionary thresholds:

```ts
{
  id: 'clinical-terms',
  terms: [
    { term: 'diagnosis', weight: 2 },
    { term: 'ICD-10',    weight: 3 },
    { term: 'prescription', weight: 2 },
    { term: 'biopsy',    weight: 3 }
  ],
  matchMode: 'word-boundary',   // never naive substring
  caseSensitive: false,
  threshold: 6                  // sum of distinct-term weights
}
```

Stemming and near-miss handling deliberately excluded in Phase 1 — they trade
precision for recall, and false positives are what kill DLP deployments.

### 8.4 Record-structure detector

The highest-value detector in practice. One customer record in an email is
normal business. A CSV with 4,000 rows of `name,dob,phone,account_no` is a
breach. The difference is volume, and no pattern detector expresses volume.

Operates over parsed tabular parts (CSV/XLSX): infers column semantics from
headers *and* from per-column value validation, then reports
`recordCount` for the combination. Policy can then say
"≥25 rows containing (name + any strong identifier)" — the rule that catches
real exfiltration and ignores routine correspondence.

### 8.5 Exact Data Match (EDM) — Phase 3

Fingerprint the client's system of record — customer master, HR database,
patient index, cardholder vault — so the gateway recognises *their* data
specifically, not merely data-shaped strings. This is what separates "a number
that looks like an account number" from "account number 7781 belonging to
customer Sharma".

- Indexer reads the source table over a read-only replica or an exported
  extract — the gateway must never hold write credentials to the client's
  system of record — normalises each cell, and stores
  `HMAC-SHA256(salt, normalisedValue)` — never plaintext, never a reversible
  hash. The salt lives in a KMS/secret store.
- Index is a Bloom filter (fast negative) fronting a hash set (exact positive).
- Detection tokenises candidate text, hashes each token, and requires a
  **multi-column co-occurrence within a row window** — a match on `firstName`
  alone is meaningless; `firstName + dob + mrn` from the same indexed row is
  conclusive.
- Sizing: 5M records × 6 columns ≈ 30M tokens ≈ ~110 MB for a 1% FP Bloom
  filter; the exact set is kept in Redis or an on-disk hash index.

### 8.6 Indexed Document Match (IDM) — Phase 3

Detect derivatives of confidential documents (a paragraph copied out of a
contract, a renamed treatment protocol).

- Normalise → shingle (w=5 words) → MinHash (128 permutations) → LSH banding.
- Similarity threshold configurable (default: Jaccard ≥ 0.35 flags partial
  match, ≥ 0.7 flags substantial copy).
- Also store a whole-file SHA-256 for exact-copy detection at zero cost.

### 8.7 LLM classifier stage — Phase 4

For the categories regex cannot express: "is this message discussing an
unannounced acquisition", "does this describe a named individual's medical or
financial situation in prose".

Strict constraints, because this stage is the cost and privacy risk:

- Runs **only** when cheap detectors produce an ambiguous score band
  (configurable, e.g. 0.3–0.7), never on every message.
- Sends a bounded excerpt (default 4 KB) around the ambiguous region, never the
  full message; never attachments wholesale.
- Off by default; must be explicitly enabled with an acknowledged data-handling
  note, because it sends message content to a third party — the exact thing the
  product exists to prevent. Self-hosted model endpoint is a supported option.
- **For this client: a hosted third-party API is not an option.** RBI
  localisation (§15.1) means content cannot leave India, so this stage is either
  off or backed by a model self-hosted in an Indian region. Plan Phase 1–3
  assuming it is off; the detection quality targets must be met without it.
- Returns a structured verdict (category + confidence + rationale) that feeds
  scoring like any other detector. It never makes the block decision alone.

### 8.8 Evasion resistance

Documented bypasses we handle in Phase 1–2, because a DLP that only catches
accidental leaks should say so honestly:

| Evasion | Countermeasure |
|---|---|
| Base64/quoted-printable encoding | MIME decoding is native; we scan decoded content |
| Data in HTML attributes/comments | Raw HTML scanned in addition to stripped text |
| Zero-width chars, homoglyphs, spacing (`4 1 1 1 …`) | Unicode NFKC normalisation, ZWSP/ZWJ stripping, and a separator-tolerant numeric pass |
| Renamed extensions (`.jpg` holding a CSV) | Magic-byte true type detection |
| Nested archives | Recursive descent to depth limit |
| Password-protected archives | Cannot inspect → policy decision (§7.4) |
| Splitting across many messages | Phase 2: per-sender rolling aggregation window |
| Steganography in images | **Not addressed.** Out of scope, stated plainly. |
| Personal webmail / USB / phone camera | Out of channel. Email DLP is one control, not the whole programme. |

---

## 9. Policy engine

### 9.1 Model

```ts
interface Policy {
  id: string;
  name: string;
  enabled: boolean;
  version: number;          // immutable versions; incidents pin the version
  severity: 'low' | 'medium' | 'high' | 'critical';
  order: number;            // evaluation order; first terminal action wins
  scope: PolicyScope;
  condition: Condition;     // boolean tree over detector results
  actions: Action[];
  exceptions: Exception[];
  failMode?: 'open' | 'closed';
  mode: 'monitor' | 'enforce';   // ← see §9.5
}

interface PolicyScope {
  direction: Direction[];                 // ['outbound','mixed']
  senderGroups?: string[];                // 'finance', 'support', 'engineering'
  excludeSenderGroups?: string[];
  recipientDomains?: DomainMatcher[];     // 'gmail.com', '*.partner.com'
  excludeRecipientGroups?: string[];      // trusted partners
  timeWindow?: CronWindow;                // e.g. after-hours policies
}

type Condition =
  | { all: Condition[] }
  | { any: Condition[] }
  | { not: Condition }
  | { detector: string; minMatches?: number; minConfidence?: number;
      inParts?: PartSelector; withinChars?: number }
  | { recordCount: { detectorSet: string[]; min: number } }
  | { extraction: 'encrypted' | 'unsupported' | 'corrupt' | 'limit-exceeded' }
  | { attachment: { trueTypeIn?: string[]; minBytes?: number; nameMatches?: string } }
  | { score: { min: number } };
```

### 9.2 Evaluation

1. Filter policies by `scope` (cheap; short-circuits most).
2. Run only the detectors those policies actually reference — the detector set
   is derived from the active policy graph, so an unused detector costs nothing.
3. Evaluate conditions against the match set.
4. Apply exceptions (allowlists: specific sender+recipient pairs, approved
   business processes, previously-released message hashes).
5. Collect all matched policies; the **highest-severity terminal action wins**;
   non-terminal actions (notify, tag, log) all apply.

### 9.3 Actions

```ts
type Action =
  | { type: 'allow' }
  | { type: 'block'; ndrTemplate?: string }
  | { type: 'quarantine'; approverGroup: string; slaHours?: number }
  | { type: 'encrypt' }                    // header/subject tag for downstream gateway
  | { type: 'redact'; strategy: 'mask' | 'remove-attachment' }
  | { type: 'strip-attachment'; match: PartSelector }
  | { type: 'notify'; to: 'sender' | 'manager' | 'security'; template: string }
  | { type: 'tag'; header: string; value: string }
  | { type: 'log-only' };
```

`redact` is deliberately narrow: masking values inside an arbitrary DOCX and
re-serialising it is a correctness minefield. Phase 1 supports redaction of
plain-text/HTML bodies and *removal* (not rewriting) of offending attachments,
with a stub file explaining what was removed and how to request release.

### 9.4 Exceptions

```ts
interface Exception {
  id: string;
  reason: string;              // required, shows in audit
  expiresAt?: Date;            // required for 'temporary' exceptions
  match: {
    senders?: string[]; recipients?: string[];
    messageHash?: string;      // a specific previously-released message
    detectorIds?: string[];
  };
}
```

Every exception is time-boxable and appears in a "standing exceptions" report.
Permanent undocumented exceptions are how DLP deployments rot.

### 9.5 Monitor mode is a first-class feature, not a debug flag

Every policy ships in `monitor` mode: it produces incidents but takes no
enforcement action. This is how a policy gets tuned against real traffic before
it starts bouncing the CEO's mail. The UI shows, for any monitor-mode policy,
"would have blocked N messages in the last 30 days" — that number is what
justifies flipping to `enforce`.

**This is the single highest-value feature for actually shipping a DLP into
production.** Deployments fail on false positives, not missing detectors.

### 9.6 Shipped policy pack (Phase 2)

The pack the client actually gets is selected during discovery (§21) from this
menu — shipping all of it to every client is how you get a false-positive
problem on day one.

**Universal (every deployment):**
credentials & secrets in plaintext · encrypted/unopenable attachment to an
untrusted domain · large attachment to personal webmail · misdirected-recipient
heuristic (external address added to a thread that was internal) · bulk record
export by volume · departing-employee watchlist · after-hours bulk export.

**Regime-specific (enabled by what applies to the client). For this fintech
client the expected default selection is PCI-DSS + India DPDP + Financial,
confirmed in discovery:**

| Regime | Policies |
|---|---|
| PCI-DSS | Cardholder data in body/attachment, CVV, cardholder bulk export |
| HIPAA / health | PHI in body, PHI bulk export, clinical-terms dictionary, NPI |
| India DPDP | Aadhaar, PAN, GSTIN, bank account + IFSC |
| GDPR | EU personal data with special-category terms, data-subject bulk export |
| Financial / listed company | Pre-announcement financial statements, MNPI markers, deal codenames |
| IP / product | Source code, private keys, design documents, IDM-fingerprinted docs |
| HR / legal | Salary and resume data, legal privilege markers, investigation files |

Each policy ships in monitor mode (§9.5) with a documented expected hit profile,
so the client can see its real-traffic impact before it enforces.

---

## 10. Enforcement outcomes

| Verdict | Sender experience | Message state |
|---|---|---|
| `allow` | Nothing | Relayed; low-detail log record only |
| `allow-with-incident` | Nothing | Relayed; full incident recorded |
| `tag`/`encrypt` | Nothing | Relayed with header/subject marker |
| `redact` | Notification explaining what was removed | Modified message relayed |
| `quarantine` | "Held for review, ref DLP-XXXX" | Held; reviewer releases or denies |
| `block` | NDR with policy-safe reason + incident ref | Not relayed; forensic copy retained |

NDR text must **not** leak the detection detail ("we found 3 card numbers at
offset 4,102") — that turns the gateway into an oracle an insider can tune
against. It names the policy category and the incident reference; the reviewer
sees the detail.

---

## 11. Incident management

### 11.1 Incident lifecycle

```
NEW ──► TRIAGED ──► ┌─ RELEASED   (message relayed, reason recorded)
                    ├─ DENIED     (message discarded, reason recorded)
                    ├─ FALSE_POSITIVE (feeds tuning report)
                    └─ ESCALATED  ──► CLOSED
```

### 11.2 Reviewer workbench

- Queue filtered by severity, policy, sender, age, SLA breach.
- Message preview with **matches highlighted and values masked by default**;
  unmasking is a separate permission and is itself audited (`INCIDENT_UNMASK`).
- One-click release / deny / mark-false-positive, reason mandatory.
- "Release and create exception" — the natural workflow — creates a
  time-boxed, attributed exception, never a silent permanent one.
- Bulk actions with a confirmation guard, because a reviewer bulk-releasing 200
  quarantined messages is itself a breach vector.

### 11.3 Separation of duties

The reviewer of an incident must not be its sender. Enforced, not advisory: an
incident whose sender is the current user is hidden from their queue and routed
to an escalation group.

---

## 12. Data model (PostgreSQL)

```
policies              (id, name, enabled, mode, severity, order, scope jsonb,
                       condition jsonb, actions jsonb, version, created_by, created_at)
policy_versions       (policy_id, version, snapshot jsonb, created_by, created_at)
detectors             (id, kind, config jsonb, enabled, builtin)
dictionaries          (id, name, terms jsonb, threshold, match_mode)
exceptions            (id, policy_id?, match jsonb, reason, expires_at, created_by)

messages              (id, direction, sender_auth, envelope_from, subject_hash,
                       size_bytes, sha256, received_at, verdict, relay_status)
message_recipients    (message_id, address, domain, is_external)

incidents             (id, message_id, policy_id, policy_version, severity,
                       status, score, created_at, assigned_to, sla_due_at)
incident_matches      (incident_id, detector_id, part_id, offset, length,
                       redacted_sample, confidence)   -- never the raw value
incident_events       (incident_id, actor, action, reason, at)   -- append-only

parts                 (message_id, part_id, parent_id, true_type, declared_type,
                       filename, bytes, sha256, extraction_status)

forensic_blobs        (message_id, storage_key, encrypted, retention_until)

edm_indexes           (id, name, source, columns jsonb, salt_ref, record_count,
                       built_at)
idm_documents         (id, name, sha256, minhash bytea, added_by, added_at)

audit_log             (id, at, actor, action, target_type, target_id,
                       detail jsonb, prev_hash, hash)   -- hash-chained
```

### 12.1 Partitioning

`incidents`, `incident_matches`, and `messages` partition by month. Incident
volume is the growth driver; a mid-size org generates 10k–100k incidents/month
in monitor mode.

### 12.2 Tamper-evident audit

`audit_log.hash = SHA256(prev_hash || canonical(row))`. A daily job verifies the
chain and publishes the head hash. This matters because the audit log is the
evidence artefact in a regulatory investigation, and the people with database
access are exactly the people it constrains.

### 12.3 Encryption

- Forensic blobs encrypted at rest with an envelope key from KMS; per-message
  data key. Blob store credentials are separate from the app DB credentials.
- Database: PII-bearing columns (`envelope_from`, recipient addresses) are
  ordinary columns under full-disk/managed encryption — column-level encryption
  would break the queries the workbench needs, and the honest trade-off is to
  keep raw sensitive *content* out of the DB entirely (§8).

### 12.4 Retention

Per-category, configurable, enforced by a reaper job:

| Data | Default retention |
|---|---|
| Forensic blob (allowed messages) | Not stored |
| Forensic blob (incident messages) | 90 days |
| Incident metadata + matches | 2 years |
| Audit log | 7 years |
| Message log (no content) | 1 year |

A DLP system that keeps every message forever is a bigger liability than the
leaks it prevents.

---

## 13. API surface (control plane)

```
POST   /v1/policies                 create (draft)
PUT    /v1/policies/:id             new version
POST   /v1/policies/:id/simulate    run policy against historical corpus  ← key
GET    /v1/incidents                filter/paginate
GET    /v1/incidents/:id            detail + masked matches
POST   /v1/incidents/:id/release    reason required
POST   /v1/incidents/:id/deny       reason required
POST   /v1/incidents/:id/unmask     elevated permission, audited
POST   /v1/scan                     synchronous scan of a supplied MIME message
GET    /v1/reports/policy-impact    monitor-mode "would have blocked" data
POST   /v1/edm/indexes              build/refresh an EDM index
POST   /v1/idm/documents            fingerprint a document
```

`/v1/policies/:id/simulate` replays a new policy against retained message
metadata and (where blobs are retained) content, producing a projected FP rate
before the policy goes live. Paired with monitor mode (§9.5), this is the
tuning loop.

`/v1/scan` also makes the whole engine usable without the SMTP path — useful
for testing and for integrating other channels later.

**Authn/z:** OIDC SSO for humans, scoped service tokens for machines. Roles:
`viewer`, `reviewer`, `policy-author`, `admin`, plus the separate
`unmask` permission. Reviewer actions always carry the actor identity into the
audit chain.

---

## 14. Admin UI

Next.js + TypeScript. Screens: Dashboard (volume, verdicts, top policies, FP
rate trend), Incidents (queue + detail), Policies (list, editor, simulate,
impact), Dictionaries & Detectors, EDM/IDM indexes, Exceptions, Audit, Settings.

Policy editor is a structured condition builder over the `Condition` tree with
a raw-JSON escape hatch — not a free-text rule language. Rule languages become
untestable; a typed tree stays diffable and versionable.

---

## 15. Security & threat model

The gateway sees every outbound message. It is a higher-value target than most
of what it protects.

| Threat | Control |
|---|---|
| **Parser RCE** via crafted PDF/Office/archive (highest risk) | Extraction runs in a short-lived child process, non-root, seccomp/rlimits, no network, read-only FS except a scratch dir, hard wall-clock kill. A crashed extractor marks the part `corrupt`, never crashes the worker. |
| Zip bomb / decompression DoS | Cumulative decompression budget + depth limit (§7.3) |
| Insider abuse of the workbench | Masked-by-default, separate unmask permission, hash-chained audit, separation of duties (§11.3) |
| Incident DB becomes a PII honeypot | Raw matched values never persisted; masked samples only (§8) |
| Exception abuse (attacker adds an allowlist entry) | Exceptions require reason, are audited, expire, and appear in a standing report |
| Open relay | AUTH required on submission; IP allowlist on 25; no unauthenticated relay to external domains, ever — tested explicitly in CI |
| Policy tampering | Immutable versions; incidents pin the version that fired; policy changes audited |
| LLM stage exfiltrating content to a third party | Off by default, bounded excerpts, self-host option, explicit acknowledgement (§8.7) |
| Gateway compromise = total mail visibility | Minimal blast radius: KMS keys separate, blob store credentials separate, no shell in production image, egress restricted to smarthost + KMS |
| DLP as an oracle (insider tunes payload against NDR text) | NDR names category only, never detection detail (§10) |

### 15.1 Regulatory posture

**Raise this with the client early.** The gateway processes
every outbound message, so it inherits the client's most restrictive data
obligation. Whatever regime applies to *their* data applies to *this system*:

- **HIPAA** — the gateway processes PHI; a BAA with the hosting provider is
  required, plus the audit trail in §12.2 and the retention limits in §12.4.
- **PCI-DSS** — if cardholder data traverses it, the gateway is in the CDE
  unless carefully segmented. Retaining forensic blobs containing PANs is a
  compliance problem; §12.4 retention and §8's no-raw-values rule exist for it.
- **GDPR / India DPDP** — data residency for the blob store and incident DB,
  lawful basis for monitoring employee communications, and DPIA.
- **Employee monitoring law** — in several jurisdictions (Germany, France,
  and works-council environments generally) inspecting staff email requires
  notification, consultation, or consent. This is a **legal precondition on
  deployment**, not a feature, and it is the client's counsel's call — not ours.
  Flag it in discovery; do not let it surface after the gateway is built.

#### India — applies to this client

These are hard constraints on the architecture, not advisory notes. The client
is India-based, so every row below is in force; discovery (§21) confirms the
details, not whether they apply:

| Requirement | Effect on this design |
|---|---|
| **RBI payment-data localisation** (Storage of Payment System Data, 2018) — payment system data stored only in India | Blob store, incident DB, and Redis must be in an Indian region. Rules out most US-region managed services and, in practice, **rules out a foreign-hosted LLM API for the §8.7 stage** — self-hosted in-country only. |
| **CERT-In Directions (2022)** — security logs retained 180 days **within India**; reportable incidents notified within 6 hours | §12.4 log retention floor is 180 days, in-country. The gateway should expose an incident-export path suited to a 6-hour reporting clock. |
| **DPDP Act 2023** | Lawful basis for processing employee and customer data in the gateway; breach notification; data-principal rights over what the incident DB retains. |
| **PCI-DSS** (if the client touches card data) | Retaining a forensic copy of a message containing a PAN puts the blob store in the CDE. Options: never retain blobs for card-data incidents (metadata + masked samples only), or accept and segment the scope. **Recommend the former** — decide before build, not after an audit. |
| **RBI IT Governance / Cyber Security Framework** | Change management, access control, and audit expectations that the §12.2 hash-chained log and §13 RBAC are designed to satisfy. |
| **SEBI / MNPI** (if listed or handling market-sensitive data) | Adds the pre-announcement financial and deal-codename policies from §9.6. |

**Localisation is the load-bearing constraint** — it fixes hosting region,
managed-service choice, and the LLM stage simultaneously. It is therefore
treated as decided (see Decisions to date): **all state stays in an Indian
region, and the LLM stage stays off unless a self-hosted in-country model is
provisioned.** What remains for discovery is which Indian region/provider, and
whether card data is in scope (which decides forensic-blob retention).

Practical consequence for infrastructure selection: prefer AWS `ap-south-1`
(Mumbai) / `ap-south-2` (Hyderabad), Azure Central/South India, GCP
`asia-south1/2`, or an Indian colo — and verify that every *managed* dependency
(object store, managed Postgres, managed Redis, log aggregation, error tracking,
APM) is also India-resident. Error trackers and APM SaaS are the usual
localisation leak: they ship message metadata and stack payloads to a US region
by default, and nobody notices until audit.

---

## 16. Performance & scale

Targets for the reference deployment (single mid-size org):

| Metric | Target |
|---|---|
| Sustained throughput | 20 msg/s per worker (typical mix) |
| p50 added latency (small text message) | < 200 ms |
| p95 added latency (with 5 MB attachment) | < 4 s |
| p99 end-to-end (async path, 40 MB archive) | < 60 s |
| Queue depth alarm | > 500 or oldest job > 5 min |

Scale levers, in order: add workers (stateless), cache extraction by part
SHA-256 (identical attachments are extremely common on mailing threads), skip
extraction for parts already seen and cleared, and move extraction to a native
sidecar if Node becomes the bottleneck.

---

## 17. Observability

- **Metrics:** messages/s by verdict, inspection latency histogram by stage,
  extraction failures by type, queue depth and age, per-policy hit rate,
  quarantine backlog and SLA breaches, relay failure rate.
- **The alert that matters most:** false-positive rate per policy, week over
  week. A policy whose FP rate rises is a policy about to be disabled by an
  angry VP. Alert on it before that happens.
- **Structured logs** (pino), correlated by `messageRef`, with content redacted
  by default — the logging pipeline must not become the leak.
- **Tracing** across ingress → queue → worker → egress.

---

## 18. Testing strategy

Detection quality is the product. Testing is not an afterthought here.

1. **Detector unit tests** — table-driven positive/negative corpora per
   detector, including the near-miss cases (a 16-digit order number that fails
   Luhn, a 12-digit invoice number that fails Verhoeff).
2. **Extraction fixtures** — a committed corpus of real-world-ugly files:
   nested archives, malformed PDFs, XLSX with hidden sheets, DOCX with tracked
   changes and comments, mislabelled extensions, a zip bomb, an encrypted PDF.
3. **Policy evaluation tests** — golden `(message, policy set) → verdict` cases.
4. **SMTP conformance/integration** — real `smtp-server` + `nodemailer` over a
   loopback, covering STARTTLS, AUTH failure, oversized message, connection
   drop mid-DATA, smarthost 4xx retry, smarthost 5xx DSN.
5. **Open-relay regression test** — explicit, in CI, non-negotiable.
6. **Precision/recall benchmark** — a labelled corpus (synthetic + de-identified
   real mail) run on every change to the detection engine, reporting
   precision/recall/F1 per detector. A PR that drops precision fails CI.
7. **Fail-mode tests** — kill Redis, kill the worker, fill the disk; assert mail
   is held (fail-closed) and no message is silently dropped or silently relayed.
8. **Load test** — sustained throughput with a realistic size distribution.

---

## 19. Deployment

- Docker images per process; docker-compose for dev, Helm/compose for prod.
- Postgres + Redis managed or containerised; object store (S3-compatible) or a
  mounted volume for spool/blobs.
- Zero-downtime deploys matter more than usual: the SMTP listener drains
  connections, and the spool is durable, so a worker restart never loses mail.
- Runbook required at Phase 2: how to flip fail mode, drain the queue, release
  a stuck hold, rebuild an EDM index, rotate the EDM salt.

---

## 20. Phased roadmap

### Phase 1 — Inspection core (~2 weeks)
SMTP ingress/egress with spooling and durable queue. MIME parsing, extraction
with true file type and resource limits, archives. Pattern detectors with
validators, secret detectors, dictionaries, record-count detector. Policy engine
with scope/condition/actions. Verdicts: allow/block/quarantine/tag. Incident
persistence. `/v1/scan`. Full test suite per §18 (1–5).
**Exit criteria:** a message with 25 customer records to gmail.com is quarantined;
the same to a partner domain is allowed; an open-relay test fails to relay;
throughput ≥ 20 msg/s per worker.

### Phase 2 — Operability (~1.5 weeks)
Monitor mode + policy impact reporting + simulate endpoint. Incident workbench
UI with mask/unmask and separation of duties. Exceptions with expiry. Curated
policy pack (§9.6). Hash-chained audit, retention reaper. Redaction and
attachment stripping. Notifications. Runbook.
**Exit criteria:** a policy can be authored, simulated against history, run in
monitor mode for a week, and promoted to enforce — all from the UI.

### Phase 3 — Fingerprinting & scale (~2 weeks)
EDM indexer + detector. IDM MinHash/LSH. Rolling per-sender aggregation
(split-message evasion). Horizontal worker scale-out, extraction cache,
per-domain TLS/MTA-STS.

### Phase 4 — Advanced classification (~1.5 weeks)
OCR (Tesseract) for image attachments. LLM classifier stage with the §8.7
guardrails. Anomaly signals (volume deviation per sender, first-time recipient
domain, departing-employee watchlist).

Total: roughly **7 weeks** to a system that is genuinely deployable, with a
usable product at the end of Phase 2 (~3.5 weeks).

---

## 21. Client discovery — what to ask before Phase 1

This is a client engagement, so the unknowns are theirs, not ours. The questions
below are grouped by whether they **block** implementation or merely shape it.
Take the blocking six to the client's IT/security owner in one session; they are
answerable in an hour and each one changes the build.

### 21.1 Blocking — cannot start Phase 1 without these

1. **Mail platform.** Microsoft 365, Google Workspace, on-prem Exchange, or
   application-generated mail only? Determines how the gateway enters the mail
   path (§6.1), who has to make the change, and how long change control takes.
2. **Smarthost / egress.** What relays their outbound mail today — SES,
   SendGrid, Google, an on-prem MTA? Sets egress auth, DSN handling, and IP
   reputation continuity (the sending IP must not change silently, or their
   deliverability drops).
3. **Hosting specifics.** *Settled: Indian region, localisation applies.* What
   remains: which cloud/region or colo, whether they already have a preferred
   provider and landing zone, and confirmation that every managed dependency
   (object store, Postgres, Redis, logging, APM, error tracking) is
   India-resident — see §15.1 for why this last one bites late.
4. **Card data in scope?** Does cardholder data traverse their email at all? If
   yes, decide now whether forensic blobs for card incidents are retained
   (PCI CDE implications, §15.1) — this is a build-time decision, not a config
   toggle.
5. **Fail mode.** Confirm `fail-closed` (§6.4). It means a DLP outage delays
   the company's mail. This needs written sign-off from someone senior enough
   to own that trade-off, not a developer's default.
6. **Employee-monitoring legal clearance.** Has their counsel cleared
   inspection of staff email, and are employees notified? A legal precondition
   (§15.1), and the one most likely to surface late and expensively.

### 21.2 Scoping — shape the policy pack and sizing

7. **Sender population.** Application mail only, staff mailboxes, or both?
   Staff mail requires the quarantine notification and self-release flow;
   app-only mail does not, and is the recommended pilot scope (§6.1).
8. **Protected and partner domains.** The actual lists — owned domains, plus
   the vendors, auditors, and banking partners who legitimately receive
   customer data and need relaxed policy.
9. **Regulatory regimes that actually apply.** PCI-DSS, DPDP, GDPR, SEBI/MNPI,
   sector-specific RBI directions. Drives the §9.6 policy selection.
10. **Systems of record for EDM (§8.5).** Which databases hold the crown
    jewels — customer master, KYC store, transaction ledger? Read-only replica
    access needed; the gateway must never hold write credentials.
11. **Volume.** Messages/day, peak hour, average and p99 attachment size. Sets
    Phase 1 sizing (§16).
12. **Known incidents.** Has data walked out over email before, and how? The
    single most useful question in the whole list — it tells you which policy
    to build first and gives you a real test case with a known-correct verdict.
13. **Reviewer team.** Who triages quarantine, what SLA, and is separation of
    duties (§11.3) achievable with their headcount? A quarantine queue nobody
    staffs turns "quarantine" into "delete".
14. **LLM stage (§8.7).** Acceptable at all? If localisation applies, only a
    self-hosted in-country model is viable. Default: leave it off.

### 21.3 Delivery questions for us, not the client

15. **Bespoke or product?** Is this a one-client deployment, or the first
    instance of something resold? Multi-tenancy is cheap to design in now and
    expensive to retrofit — the data model (§12) is already tenant-shaped, but
    policy scoping, key isolation, and the admin UI are not.
16. **Who operates it in production?** If the client's ops team runs it, the
    Phase 2 runbook (§19) and the alerting in §17 are contractual deliverables,
    not nice-to-haves.
17. **Acceptance criteria.** Agree these before Phase 1: a labelled test corpus
    of their own mail (de-identified) with an agreed precision/recall target
    per policy. Without it, "does the DLP work?" becomes an opinion, and
    opinions are how fixed-price projects overrun.
