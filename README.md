# YouEye Wiki

Privacy-friendly article reader for the [YouEye](https://github.com/YouEye-Platform/YouEye) platform.

Wiki runs as a native YouEye app. It is installed by the Control Panel from GitHub releases, receives identity and launch context from YouEye, and exposes dashboard, settings, and notification surfaces back to the platform.

The version in `package.json` and `youeye-app.yaml` is the exact source version.

## Features

- Article browsing with responsive reading controls and body-only upstream HTML
- Search and featured article surfaces
- Reading-focused dashboard widgets
- App-owned settings panel for YouEye Settings
- Notification surface for rich app notifications
- Theme, language, and account menu integration
- PWA-ready build with service worker assets

## YouEye Surfaces

| Surface | Purpose |
|---|---|
| `/` | Main Wiki app |
| `/embed/widget/featured-article` | Dashboard featured article widget |
| `/embed/widget/today-in-history` | Dashboard history widget |
| `/embed/settings` | App settings panel shown inside YouEye Settings |
| `/embed/notification/default` | Rich notification body |
| `/api/manifest` | Native app manifest consumed by Market and UI |
| `/api/health` | Container health and version endpoint |

## Development

```bash
pnpm install
pnpm dev
```

The app uses Next.js 15, TypeScript, Tailwind CSS, and the shared native-app surface contract used by YouEye apps.

## Build and release checks

```bash
pnpm test
pnpm release:check
pnpm build
```

The source-owned `.youeye/build/app` entrypoint produces an unsigned
`standalone.tar` for independent validation, signing, and publication. It
requires the build environment described in `.youeye/build/manifest.json`.
Package and install-manifest versions must agree. Development tags use
`dev-v<version>`; Stable tags use `v<version>`.

The install manifest retains the Forgejo source identity. The public project
website is documentation metadata, not an instruction to switch update sources.
See [PUBLIC_RELEASE_POLICY.md](PUBLIC_RELEASE_POLICY.md) for publication rules.

## License

YouEye source code is licensed under the [Business Source License 1.1](LICENSE). Each version converts to AGPL-3.0 after four years.

The "YouEye" name and logo are trademarks. See [TRADEMARK.md](TRADEMARK.md) for usage guidelines.

## Acting user and household admission

Private routes derive the acting identity from `getSession(appId)`, which checks
the native cookie and current identity session through the configured client.
Never use a browser-supplied `X-YouEye-User`, `userId` or `user_id` to select
private rows or nominate the user of a platform service call. Household admission
and per-user service consent are separate checks; administrative status does not
grant access to every app.

Widget, card and inter-app routes require a native session. Inter-app factories
receive an explicit app ID and pass `{ userId }` as the second handler argument;
user fields are removed from request data. A server-to-server caller without a
validated native session is denied. Header/body identity nomination is not a
supported delegation protocol. Existing explicitly public shares and public
content remain distinct from private routes, and external public exposure must
be chosen by the appliance administrator.

## App service credentials

Platform calls run on the server with the protected `YOUEYE_APP_ID`,
`YOUEYE_APP_TOKEN` and `YOUEYE_GATEWAY` values injected by the installer.
The app ID is the exact installed ID; helpers do not invent prefix aliases.
A missing credential fails with an integration-not-ready error. Use Market's
administrator credential reconciliation action to repair delivery.

Pass the acting user from a validated server session. Caller-supplied headers
cannot replace machine identity, select another user, or attach a browser/bridge
credential. Keep platform helpers in server code and keep runtime credentials
out of source, browser bundles and logs. Public health/manifests do not need a
service credential. Rotation and restore reinject a credential and prove it
before marking integration ready.

The legacy featured-article scheduler cannot enumerate the platform's
administrator user directory with an app credential. It sends scoped machine
identity and leaves recipients unavailable on denial. Automatic delivery needs
an app-owned authenticated subscription contract; do not grant the scheduler
administrator or browser authority to make that endpoint succeed. Interactive
Wiki and user-scoped notification calls keep their normal session-derived user.
