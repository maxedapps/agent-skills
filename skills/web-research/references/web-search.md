# Web Search Reference

Use this reference before complex discovery searches, multi-query research, filters, recency constraints, or search workflow options.

## Query strategy

- Prefer `queries` over `query` for anything beyond a quick lookup.
- Use 2-4 varied angles, not near-duplicate phrasings.
- Good angles include:
  - official documentation
  - release notes / recent changes
  - implementation discussions
  - independent analysis or comparison
- Use `domainFilter` to prioritize official docs/repos or exclude noisy domains.
- Use `recencyFilter` when freshness matters.
- Avoid `includeContent: true` for initial discovery unless broad background fetching is intentional and useful; fetch selected sources afterward.
- Use `workflow: "none"` to skip curation, `workflow: "auto-summary"` for an automatic summary, or the default review workflow when interactive curation is useful.

## Examples

```typescript
web_search({
  queries: [
    "official docs for React Server Components caching",
    "React Server Components caching release notes",
    "React Server Components caching best practices site:react.dev OR site:github.com/facebook/react"
  ],
  recencyFilter: "year",
  workflow: "auto-summary"
})
```

```typescript
web_search({
  query: "Next.js middleware cookies docs",
  domainFilter: ["nextjs.org", "vercel.com", "github.com"]
})
```

```typescript
web_search({
  query: "OpenAI function calling structured output",
  domainFilter: ["-medium.com", "-dev.to"]
})
```

## Failure recovery

- Weak results → vary query angles, add `domainFilter`, use `recencyFilter`, or fetch the official source directly.
- No primary source → search official domains, GitHub repos, release notes, or vendor blogs specifically.
- Sources disagree → prioritize official docs, release notes, and repository evidence, then state the conflict clearly.
