# Second PC Setup

Use this when you want to continue the project from another computer without losing context.

## Repo

- GitHub: `https://github.com/Eevee-Eevee-Eve/eurovision-project.git`
- Main branch: `main`

## Quick Start

1. Install:
   - Git
   - Node.js
   - VS Code
2. Open PowerShell.
3. Run:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\setup-second-pc.ps1
```

If you run it outside the repo, pass a target folder:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\setup-second-pc.ps1 -TargetPath "$HOME\Projects\eurovision-project" -OpenVSCode
```

## Manual Alternative

```powershell
git clone https://github.com/Eevee-Eevee-Eve/eurovision-project.git
cd .\eurovision-project
git pull --rebase
```

## Read These First

Before starting a new Codex session, open:

- `PROJECT_CONTEXT.md`
- `SESSION_LOG.md`
- `KNOWN_ISSUES.md`
- `GIT_WORKFLOW.md`

Then write:

```text
Read PROJECT_CONTEXT.md, SESSION_LOG.md, and KNOWN_ISSUES.md, then continue.
```

## Secrets

- `deploy-secrets.local.env` is local-only and must not be committed.
- If you need local runs on the second PC, copy that file manually from your first PC or recreate it there.
- Do not store secrets in GitHub issues, commits, or markdown notes.

## Useful Commands

```powershell
git pull --rebase
git status
git add .
git commit -m "Short clear message"
git push
```

## If You Need Local Frontend Run

```powershell
cd .\frontend
npm install
npm run dev
```

## If You Need Local Backend Run

```powershell
cd .\backend\backend_core
npm install
npm run dev
```
