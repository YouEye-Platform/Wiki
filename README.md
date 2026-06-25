# YouEye Wiki

Privacy-friendly article reader for the [YouEye](https://github.com/YouEye-Platform/YouEye) platform.

Wiki runs as a native YouEye app. It is installed by the Control Panel from GitHub releases, receives identity and launch context from YouEye, and exposes dashboard, settings, and notification surfaces back to the platform.

Current public release line: `v0.5.0`

## Features

- Article browsing with clean reading layouts
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

## Release Artifact

The Control Panel updater expects each native app release to upload an uncompressed `standalone.tar` asset.

```bash
pnpm build
cd .next/standalone
tar -cf standalone.tar .
```

The release tag for this standalone repo is `v0.5.0` with no component prefix.

## License

YouEye source code is licensed under the [Business Source License 1.1](LICENSE). Each version converts to AGPL-3.0 after four years.

The "YouEye" name and logo are trademarks. See [TRADEMARK.md](TRADEMARK.md) for usage guidelines.
