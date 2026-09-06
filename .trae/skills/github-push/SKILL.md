---
name: "github-push"
description: "Commits and pushes local changes of the landscape portfolio repo (d:/3D/card) to GitHub, handling this machine's PowerShell-5 quirks and remote-divergence sync. Invoke when user asks to push/sync/upload changes to GitHub after editing site files."
---

# GitHub Push (landscape workspace)

Standard procedure to commit and push the repo at `d:\3D\card` (remote:
`https://github.com/aimeerichardtkjn800-max/landscape.git`, branch `main`).

## When to invoke

- User asks to "推送到 GitHub / 同步仓库 / 上传代码" after site file changes.
- After completing any code/content change the user explicitly wants deployed.

## Fixed procedure (run from `d:\3D\card`)

1. **Stage & commit** — stage only the intended changes, use a descriptive message:
   ```powershell
   cd d:\3D\card
   git add -A
   git commit -m "<type: 简短描述>"
   ```
   Commit message style used in this repo: `feat: ...` / `fix: ...` / `refactor: ...`.

2. **Sync with remote BEFORE pushing** (the user often edits files on the GitHub
   web UI, so remote frequently has 1+ commits the local repo doesn't have):
   ```powershell
   git fetch origin
   git log --oneline main..origin/main   # inspect incoming commits
   git rebase origin/main
   ```
   - If rebase reports CONFLICT (add/add is common when the same file was edited
     both sides): resolve the file with the Write tool, then
     `git add <file>; git -c core.editor=true rebase --continue`.
   - Never use force push, never run `reset --hard`, `checkout .`, or delete the
     `.git` folder to "fix" divergence.
   - Do NOT amend commits that were already pushed.

3. **Push and verify**:
   ```powershell
   git push origin main
   git status -sb      # must show "## main...origin/main" (no ahead/behind)
   git log --oneline -3
   ```

## Environment gotchas (this machine)

- **PowerShell 5.1**: `&&` and `||` are NOT valid statement separators — use `;`
  or separate Shell calls.
- **git writes progress to stderr**: PowerShell wraps it as a red
  `RemoteException`/`NativeCommandError` block (e.g. "To https://github.com/...").
  This is NORMAL, not a failure. Pipe through `2>&1 | Out-String` to keep output
  readable; judge success by the trailing `git status -sb` / `x..y main -> main`
  line, not by the red error block.
- **Real push failure signature**: output contains `! [rejected]` or
  `failed to push some refs` → run the fetch + rebase sync (step 2), then push again.
  `Connection was reset` / `Could not connect to server port 443` = network
  problem (user's proxy); retry, and if it persists, tell the user to check
  their proxy — do not change remote URLs.
- Line-ending warnings `LF will be replaced by CRLF` are harmless.

## Local preview (optional verification before/after push)

- This machine's `python`/`python3` are Microsoft Store stubs that DO NOT work
  (exit code 9009). Use the Node one-liner static server instead (repo root
  equals site root):
  ```powershell
  node -e "const http=require('http'),fs=require('fs'),path=require('path');const root='d:/3D/card';const mime={'.html':'text/html;charset=utf-8','.js':'text/javascript','.css':'text/css','.jpg':'image/jpeg','.png':'image/png','.json':'application/json','.mp3':'audio/mpeg','.mp4':'video/mp4','.svg':'image/svg+xml'};http.createServer((req,res)=>{let p=path.join(root,decodeURIComponent(req.url.split('?')[0]));if(req.url.split('?')[0].endsWith('/'))p=path.join(p,'index.html');fs.readFile(p,(e,d)=>{if(e){res.writeHead(404);res.end('404');}else{res.writeHead(200,{'Content-Type':mime[path.extname(p).toLowerCase()]||'application/octet-stream','Cache-Control':'no-cache'});res.end(d);}});}).listen(8765,()=>console.log('serving on 8765'));"
  ```
  Preview: `http://127.0.0.1:8765/index.html`.
- Before (re)starting a server, check port 8765:
  `Get-NetTCPConnection -LocalPort 8765 -State Listen` — stop the old job with
  StopCommand if occupied; don't launch a second server on the same port.
- The 3D card uses ES modules + WebGL: it CANNOT be opened via `file://`
  (CORS blocks module loading) — always verify over http://127.0.0.1:8765.

## Constraints

- Only commit when the user asked; never commit credentials/secrets.
- Report the final commit hash, sync result, and confirm `main...origin/main`
  with no ahead/behind.
