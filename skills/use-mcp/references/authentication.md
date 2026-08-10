# MCPorter authentication and credential safety

Read this file before starting, resetting, seeding, troubleshooting, or clearing authentication.

## Human checkpoint

Before running an authentication command:

1. Identify the exact server name and HTTPS endpoint.
2. Explain that mcporter persists OAuth artifacts locally and that its vault is file-protected but not encrypted.
3. Obtain the user's approval to authenticate and persist credentials.
4. Never ask the user to disclose tokens, client secrets, passwords, or the authorization URL in chat.

## Browser OAuth

```sh
mcporter auth <server>
```

Mcporter discovers the authorization server, selects configured/metadata-based/dynamic client registration, uses authorization-code OAuth with PKCE, opens the system browser, and waits on a loopback callback. The user completes consent in the browser.

- The default callback listens on `127.0.0.1` with a dynamic port.
- Keep the mcporter process alive until the browser redirects back and the command reports completion.
- Use `mcporter auth <server> --reset` only when the user approves clearing cached credentials before reauthorization.
- Treat the displayed consent scopes and destination as authoritative; stop on an unexpected provider, endpoint, client identity, or scope expansion.

## Headless or remote OAuth

```sh
mcporter auth <server> --no-browser
```

This prints a sensitive authorization URL but still runs a callback listener. The command must remain alive. **Do not run it through captured agent shell tooling.** Give the command to the user for a secure interactive terminal and wait for the user to report completion.

- Do not ask the user to return the URL or put it in durable logs, tickets, progress files, shell history, or assistant responses.
- If the browser is on another machine, use an approved SSH tunnel or a pre-registered fixed `oauthRedirectUrl`; a browser-local loopback does not reach the remote mcporter process automatically.
- Do not improvise redirect URIs. OAuth providers commonly require an exact pre-registered URI.
- On unattended systems, prefer credentials provisioned through an approved secret-management workflow over trying to automate interactive consent.

## What mcporter stores

The shared vault is:

```text
~/.mcporter/credentials.json
```

With an absolute `XDG_DATA_HOME`, it is:

```text
$XDG_DATA_HOME/mcporter/credentials.json
```

The vault can contain access and refresh tokens, dynamic client registration data (possibly a client secret), PKCE verifier, OAuth state, issuer/resource metadata, and expiration data.

Security properties and additional locations:

- The vault is plain JSON, not OS-keychain storage or encrypted-at-rest storage.
- Newly created credential files use mode `0600`; same-user processes can still read them.
- An existing file's mode is preserved, so do not assume mcporter repairs older permissive modes.
- A configured `tokenCacheDir` is honored alongside the shared vault and can contain `tokens.json`, `client.json`, verifier/state, and discovery files.
- Legacy per-server caches can exist under `~/.mcporter/<server>/`; migration into the vault does not justify assuming every source artifact disappeared.
- A stdio server's custom `oauthCommand` controls its own storage and may use provider-specific paths.
- Ad-hoc OAuth can cache credentials under an inferred name even without `--persist` for the server definition.
- An incomplete flow may already have persisted state, verifier, discovery, or client-registration artifacts.

Never inspect these files to diagnose authentication. Use targeted `mcporter list <server> --status --no-oauth`, `mcporter auth`, reset, vault clear, or logout commands instead.

## Pre-registered clients and bearer credentials

Some providers do not support metadata-based identity or dynamic client registration. Configure only values supplied by that provider:

- Public client ID: `oauthClientId`
- Client secret reference: `oauthClientSecretEnv`
- Required token endpoint method: `oauthTokenEndpointAuthMethod`
- Exact registered callback: `oauthRedirectUrl`
- Explicit scopes only when required: `oauthScope`

Prefer `oauthClientSecretEnv` and runtime environment/secret-manager injection. Do not commit or display `oauthClientSecret`, raw bearer tokens, authorization headers, or resolved environment values.

For approved headless token seeding, prefer mcporter's stdin boundary over a new plaintext token file:

```sh
mcporter vault set <server> --stdin
```

The credential source must come from an approved secret channel. Never compose the payload from secrets revealed in chat, include it directly in shell history, or echo it into logs.

## Clearing credentials

Choose the scope explicitly and confirm the exact server:

```sh
# Shared vault entry only; custom, legacy, or provider caches may remain usable.
mcporter vault clear <server>

# Complete mcporter logout: shared vault, configured tokenCacheDir, legacy cache,
# and known provider-specific artifacts.
mcporter config logout <server>
```

`mcporter auth <server> --reset` performs the broader cache clearing and then starts reauthorization. Use it only when the user requested both effects. Complete logout/reset may require full reauthorization.

## Source baseline

Behavior was checked against mcporter v0.13.3 and these primary sources:

- [Configuration guide](https://github.com/openclaw/mcporter/blob/v0.13.3/docs/config.md)
- [Ad-hoc and headless OAuth](https://github.com/openclaw/mcporter/blob/v0.13.3/docs/adhoc.md)
- [OAuth vault implementation](https://github.com/openclaw/mcporter/blob/v0.13.3/src/oauth-vault.ts)
- [Persistence stores](https://github.com/openclaw/mcporter/blob/v0.13.3/src/oauth-persistence-stores.ts)
- [Atomic file permissions](https://github.com/openclaw/mcporter/blob/v0.13.3/src/fs-json.ts)
- [MCP authorization specification](https://modelcontextprotocol.io/specification/draft/basic/authorization)

When installed mcporter behavior or `mcporter <command> --help` conflicts with this reference, stop and resolve the version mismatch from current official docs before handling credentials.
