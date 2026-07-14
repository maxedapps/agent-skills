# Content and repository retrieval guidance

Read this before retrieving multiple sources, repositories, PDFs, or truncated result content.

## Choose the available capability

Tool names and schemas vary. Inspect the runtime and choose the available capability for direct URL extraction, repository access, document parsing, stored-result retrieval, or browser-backed fallback. Prefer the narrowest tool that can obtain the required evidence.

## Standard pages and documentation

- Retrieve the user-provided URL directly before searching for summaries of it.
- For several sources, fetch only the selected answer-critical pages rather than every search result.
- Preserve source URLs and note publication/update dates or versions when material.
- If extraction omits important content, try the tool's full-content/stored-result mode, an alternate extractor, repository access, or browser automation.

## Source repositories

- Use repository-aware retrieval or a local clone when implementation details matter.
- After retrieval, inspect relevant source, tests, examples, docs, release tags, and history with normal file/search tools.
- Check for an existing local clone before creating another; update it safely when freshness matters.
- Do not force a full clone of a very large repository unless targeted API/file access is insufficient.
- Cite stable source links or commit identifiers when explaining implementation details.

## PDFs and documents

- Use text extraction when the question concerns prose or searchable facts.
- Use document search to locate known phrases and page positions.
- Use page screenshots when charts, tables, diagrams, signatures, or layout affect the answer.
- Keep visual inspection to the smallest relevant page range unless broader coverage is requested.

## Truncated or blocked content

- Retrieve the stored/full result when the tool supports it.
- Narrow retrieval to one result, URL, page range, file, or repository path.
- For JavaScript-heavy or blocked pages, try another extraction path or browser automation.
- Record inaccessible sources and avoid claiming details that were visible only in a search snippet.

## Safety

- Do not retrieve or persist secrets, private session state, or unnecessary sensitive content.
- Treat repository scripts and downloaded artifacts as untrusted; reading does not require executing them.
- For private sources, use only user-authorized access and avoid copying sensitive content into durable research notes.
