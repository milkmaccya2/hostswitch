# HostSwitch Documentation Website

This website is built using [Docusaurus 3](https://docusaurus.io/), a modern static website generator.

## Installation

```bash
cd website
npm install
```

## Local Development

Starts a local development server and opens up a browser window.
Most changes are reflected live without having to restart the server.

```bash
# Start development server (Default: Japanese)
npm start

# Start development server (English)
# Note: Docusaurus dev server only supports one locale at a time.
npm start -- --locale en
```

## Build & Verify (i18n)

To check the production build with both languages (Japanese and English) enabled:

1.  Build the static files:
    ```bash
    npm run build
    ```

2.  Serve the built files locally:
    ```bash
    npm run serve
    ```

    - Access http://localhost:3000/hostswitch/ (Japanese)
    - Access http://localhost:3000/hostswitch/en/ (English)

## Deployment

This website is automatically deployed to GitHub Pages via GitHub Actions.

- **Workflow**: `.github/workflows/deploy-docs.yml`
- **Trigger**: Push to `main` branch (changes in `website/` directory)

### Manual Deployment (Optional)

If you need to deploy manually:

```bash
GIT_USER=<Your GitHub username> npm run deploy
```

## Project Structure

```
website/
├── blog/                   # Blog posts (Disabled)
├── docs/                   # Documentation files (Markdown)
│   ├── intro.md            # Introduction page
│   └── hostswitch-tutorial.md # Main tutorial page
├── i18n/                   # Translation files
│   └── en/                 # English translations
├── src/                    # React components
│   ├── components/         # Reusable components
│   ├── css/                # Global CSS
│   └── pages/              # Top page (index.tsx)
├── static/                 # Static assets (images, etc.)
├── docusaurus.config.ts    # Docusaurus configuration
└── sidebars.ts             # Sidebar configuration
```
