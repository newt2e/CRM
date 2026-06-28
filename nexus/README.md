# Nexus — Global Partnerships Workspace

Internal CRM for Compass Group Global Partnerships team.

## Structure

```
nexus/
├── index.html          # App shell — HTML + CSS
└── js/
    ├── data.js         # Data model: CINFO, CDATA, ADATA, constants
    ├── auth.js         # Auth: register, login, session, roles
    ├── nav.js          # Navigation: go(), render()
    ├── helpers.js      # All page renders (PAGES object)
    ├── account.js      # Account detail tabs + modal system
    ├── events.js       # Event delegation + global search
    ├── export.js       # PM export + admin import dashboard
    └── import.js       # Import framework: extract, classify, commit
```

## Local Development

Open `index.html` directly in a browser — no build step needed.

> **Note:** Chrome blocks local file imports by default.  
> Use VS Code Live Server, or run:  
> `python3 -m http.server 8080` then open `http://localhost:8080`

## GitHub Pages Deployment

1. Push to GitHub
2. Go to repo Settings → Pages
3. Set source to `main` branch, `/ (root)` folder
4. Site live at `https://yourusername.github.io/nexus`

## Making Changes

Each file is self-contained by concern:
- UI layout changes → `index.html`
- Add a new page → `helpers.js` (add to PAGES object)
- Account tab changes → `account.js`
- Import new file format → `import.js` (add to extractors)
- Auth / roles → `auth.js`
- Add a country → `data.js` (add to CINFO regions array)

## AI Classification (Future)

In `import.js`, find `function classifyExtracted()`.  
Replace the body with a `fetch()` to Claude API.  
The extracted text is in `IMP.extracted.text`.
