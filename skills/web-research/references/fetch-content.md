# Fetch Content Reference

Use this reference before fetching GitHub repos, PDFs, multiple URLs, or retrieving truncated fetched/search content.

## Standard pages and docs

```typescript
fetch_content({ url: "https://example.com/article" })
fetch_content({ urls: ["https://docs.example.com/guide", "https://example.com/changelog"] })
```

Use for official docs, blog posts, changelogs, announcements, issue/PR pages that render as normal web pages, PDFs, and other directly fetchable source material.

## GitHub repositories

```typescript
fetch_content({ url: "https://github.com/owner/repo" })
fetch_content({ url: "https://github.com/owner/repo/tree/main/packages/core" })
fetch_content({ url: "https://github.com/owner/repo/blob/main/README.md" })
```

Important behavior:

- Repository URLs are fetched as repository content, not just scraped HTML.
- Root repo URLs are cloned locally when feasible.
- After cloning, inspect returned files with `read`, `grep`, `find`, and `bash`.
- Large repos may fall back to an API view; use `forceClone: true` only when the full clone is truly needed.

## PDFs

```typescript
fetch_content({ url: "https://example.com/report.pdf" })
```

Use this when the user needs content from a PDF and extracted text is enough. Use browser/document tools instead when visual layout matters.

## Retrieving stored/truncated content

Use `get_search_content` when `web_search` or `fetch_content` output is truncated or when stored full content is needed.

```typescript
get_search_content({ responseId: "abc123", queryIndex: 0 })
get_search_content({ responseId: "abc123", query: "official docs for React Server Components caching" })
get_search_content({ responseId: "abc123", urlIndex: 0 })
get_search_content({ responseId: "abc123", url: "https://docs.example.com/guide" })
```

Reach for this when:

- `fetch_content` says content was truncated.
- `web_search` found useful sources and you need the stored full result set.
- You need one specific URL/query from a larger batch.

## Failure recovery

- Result content is truncated → use `get_search_content`.
- Page is JS-heavy or blocks normal scraping → still try `fetch_content`; the extension has fallbacks.
- GitHub repo is too large → accept the API view or retry with `forceClone: true` only when necessary.
