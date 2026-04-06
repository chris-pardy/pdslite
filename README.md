# PDS Lite

A lightweight AT Protocol Personal Data Server designed for app developers who want to let users sign up -- not just sign in.

## The Problem

Building on the AT Protocol today means picking between two bad options:

1. **Redirect users to Bluesky** (or another PDS) to create an account. This creates a dependency on a third party, fragments your onboarding flow, and means your app can't work without someone else's infrastructure.

2. **Run the full reference PDS.** This is a serious operational commitment. You're now responsible for moderating arbitrary user content -- text, images, video -- and handling the legal obligations that come with it (CSAM reporting, DMCA takedowns). For an app that only needs to store likes and follows, this is wildly disproportionate.

PDS Lite gives you a third option.

## The Approach

PDS Lite implements the AT Protocol PDS specification with one fundamental difference: **all writes are denied by default.** Nothing gets stored unless a filter explicitly allows it.

This means you choose exactly what your PDS will host. Only likes and follows? Configure one filter and you're done. No images, no arbitrary text, no moderation burden, no legal exposure.

### Start Restrictive, Grow When Ready

The idea is to start with the smallest possible surface area and expand only when you're prepared:

**Level 1 -- Zero moderation burden**
Allow only structural records: likes, follows, reposts, blocks, mutes. These are references to other content, not content themselves. There's nothing to moderate.

**Level 2 -- Minimal moderation**
Add profiles. Now users can set a display name and bio on your PDS. The text surface is small and manageable.

**Level 3 -- Controlled content**
Allow records from your own app's lexicon. You define the schema, you know what's in it, you validate it. Add blob uploads but only from your own trusted service -- not directly from users.

**Level 4 -- Open content**
Allow posts, images, and other user-generated content. At this point you've built (or contracted) the moderation capability to handle it.

**Level 5 -- Migration**
When your users outgrow what you want to host, help them migrate to a full PDS. PDS Lite treats itself as a temporary home -- account migration is a first-class feature, not an afterthought.

### Compliance by Design

Hosting arbitrary user-uploaded content on the open web creates legal obligations: CSAM reporting requirements, DMCA safe harbor compliance, and jurisdiction-specific content laws. These apply to anyone operating generic infrastructure that accepts and serves uploads.

PDS Lite's answer is simple: **don't host what you can't moderate.** The filter system isn't just a feature -- it's your compliance strategy. A PDS that only allows likes and follows has no images to scan, no text to review, and no content to take down. You expand your liability surface only when you're ready to handle it.

## For Developers

PDS Lite is built for app developers, not infrastructure operators:

- **Sign up, not sign in.** Users create accounts directly on your PDS. No redirects, no third-party dependencies.
- **Use your existing database.** Pluggable storage backends support in-memory (testing), SQLite (simple deployments), and Postgres (for teams that already have it running).
- **Pluggable everything.** Filters, storage, and identity are all interfaces you can swap out. Ship with the defaults or bring your own.
- **AT Protocol compatible.** Repositories sync via the standard firehose. Relays can index your PDS. Clients work as expected. Accounts can migrate out when they're ready.

## Architecture

### Filter Pipelines

PDS Lite uses the same default-deny filter model for both **writes** and **account creation**. Every operation passes through a configurable filter chain. Any filter can reject (short-circuit), allow, or pass (no opinion). At least one "allow" is required — otherwise the operation is denied.

#### Write Filters

```
Write Request
  → Auth verification
  → Filter 1: decision (allow / reject / pass)
  → Filter 2: decision (allow / reject / pass)  
  → Filter N: ...
  → At least one "allow" required, any "reject" stops immediately
  → Repository write
```

Write filters can also **transform** records — stripping undeclared fields, sanitizing text, etc. They receive information about **who** is making the request, enabling trust decisions like allowing blob uploads only from your own backend.

#### Account Filters

```
Create Account Request
  → Account Filter 1: decision (allow / reject / pass)
  → Account Filter 2: decision (allow / reject / pass)
  → Account Filter N: ...
  → At least one "allow" required, any "reject" stops immediately
  → Auth provider creates account
```

Account filters control **who can sign up**, independent of how authentication works. This lets you compose signup policy from small, focused plugins:

- **Invite codes** — require a valid invite code to create an account
- **App restriction** — only allow signups from your app's client ID
- **Email domain** — only allow signups from specific email domains
- **Rate limiting** — per-IP signup rate limits

The auth plugin (password, OIDC) handles credential mechanics. Account filters handle signup policy. They compose independently.

### Pluggable Storage

```
StorageBackend
  ├── AccountStore      # Accounts, sessions, passwords
  ├── RepoStoreFactory  # Per-actor repository block storage
  ├── BlobStore         # Binary large objects (images, etc.)
  └── SequencerStore    # Event log for the firehose
```

Ship with in-memory for tests. Add SQLite or Postgres for production. The interface is the same.

### Monorepo

```
packages/
  pds/                       # Core server
  plugin-allow-all/          # Development: allows writes, blobs, and signups
  plugin-collection-allow/   # Allow specific record collections
  plugin-record-schema/      # Lexicon validation + field stripping
  plugin-blob-type/          # MIME type + size filtering
  plugin-profanity-filter/   # Text content transformation
  plugin-rate-limit/         # Per-account rate limiting
  plugin-invite-code/        # Invite code signup gating
  storage-sqlite/            # SQLite storage backend
  storage-postgres/          # Postgres storage backend
```

Plugins are separate packages. Install only what you need.

## Quick Start

```bash
# Install
pnpm add @pdslite/pds @pdslite/plugin-collection-allow

# Configure
cat > pds.config.yaml << EOF
server:
  port: 3000
  hostname: pds.example.com

identity:
  plcDirectoryUrl: https://plc.directory

storage:
  backend: memory  # or sqlite, postgres

filters:
  - id: collection-allow
    config:
      allow:
        - "app.bsky.graph.follow"
        - "app.bsky.graph.block"
        - "app.bsky.feed.like"
        - "app.bsky.feed.repost"
EOF
```

With this configuration, your PDS accepts follows, blocks, likes, and reposts. Nothing else. No images, no posts, no moderation required.

## Status

Under active development. Not yet ready for production use.

## License

MIT
