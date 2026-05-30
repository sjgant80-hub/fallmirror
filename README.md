# ◊ fallmirror · sovereign multi-host repo mirroring

**One push · GitHub + Codeberg + GitLab + IPFS pin + USB. If any host nukes you, mirrors persist.**

[**Live landing**](https://sjgant80-hub.github.io/fallmirror/) · [Source](./fallmirror.mjs) · MIT · Part of [AI Native Solutions](https://www.ai-nativesolutions.com) · ◊·κ=1 · prime 281

## Install · 60 seconds

```bash
gh repo clone sjgant80-hub/fallmirror
cd fallmirror
node fallmirror.mjs --setup    # prints config checklist
```

Then in PowerShell (or bash):

```powershell
$env:CODEBERG_USER = "your-handle"
$env:CODEBERG_TOKEN = "..."
$env:GITLAB_USER = "your-handle"
$env:GITLAB_TOKEN = "..."
$env:FALLMIRROR_USB = "E:\fallmirror"   # optional
$env:FALLMIRROR_IPFS = "1"               # optional

cd path/to/any/git/repo
node /path/to/fallmirror.mjs                   # mirror this one
node /path/to/fallmirror.mjs --all             # mirror every repo under FALLMIRROR_ROOT
node /path/to/fallmirror.mjs --status          # see last mirror per host
```

## Why this exists · the host-gating defense

| Threat | fallmirror response |
|---|---|
| GitHub closes your account | Codeberg + GitLab + USB still have everything |
| DMCA takedown | Mirrors stay up · next push restores |
| Country block | Codeberg / GitLab / IPFS reachable from anywhere |
| Internet down | USB bare repo · clone offline |

## Schedule nightly

**Windows Task Scheduler**: run `node fallmirror.mjs --all` daily at 02:00.

**Cron**:
```cron
0 2 * * * cd ~/code && node ~/fallmirror/fallmirror.mjs --all >> ~/fallmirror.log 2>&1
```

## License

MIT · ◊·κ=1 · prime 281 · part of AI Native Solutions
