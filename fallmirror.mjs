#!/usr/bin/env node
// ═══════════════════════════════════════════════════════════════════
//  fallmirror · sovereign multi-host repo mirroring · ◊·κ=1
//  One push · GitHub + Codeberg + GitLab + IPFS pin + local USB.
//  If any host nukes you, mirrors persist. MIT.
//
//  Usage:
//    node fallmirror.mjs              # mirror current repo to all configured hosts
//    node fallmirror.mjs --all        # mirror every repo under FALLMIRROR_ROOT
//    node fallmirror.mjs --status     # show last mirror status per host
//    node fallmirror.mjs --setup      # interactive · prints setup checklist
//
//  Env vars:
//    FALLMIRROR_HOSTS  · csv · default: "codeberg,gitlab"
//    FALLMIRROR_USB    · path to USB drive for local mirror · e.g. "E:\\fallmirror"
//    FALLMIRROR_IPFS   · "1" to also IPFS-add (needs ipfs daemon)
//    FALLMIRROR_ROOT   · folder containing repos for --all mode
//    CODEBERG_TOKEN    · for Codeberg API · create at codeberg.org/user/settings/applications
//    GITLAB_TOKEN      · for GitLab API · gitlab.com/-/profile/personal_access_tokens
//    GITLAB_USER       · your GitLab username
//    CODEBERG_USER     · your Codeberg username
// ═══════════════════════════════════════════════════════════════════

import { execSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const ARGS = process.argv.slice(2);
const MODE_ALL    = ARGS.includes('--all');
const MODE_STATUS = ARGS.includes('--status');
const MODE_SETUP  = ARGS.includes('--setup');
const HOSTS  = (process.env.FALLMIRROR_HOSTS || 'codeberg,gitlab').split(',').map(s => s.trim()).filter(Boolean);
const USB    = process.env.FALLMIRROR_USB || '';
const IPFS   = process.env.FALLMIRROR_IPFS === '1';
const ROOT   = process.env.FALLMIRROR_ROOT || '';
const STATE  = './fallmirror-state.json';

function sh(cmd, opts = {}) {
  try { return execSync(cmd, { encoding: 'utf8', stdio: ['ignore','pipe','pipe'], ...opts }); }
  catch (e) { return { error: true, stderr: (e.stderr||e.message||'').toString().slice(0,400) }; }
}

function loadState() {
  if (fs.existsSync(STATE)) try { return JSON.parse(fs.readFileSync(STATE, 'utf8')); } catch {}
  return {};
}
function saveState(s) {
  fs.writeFileSync(STATE, JSON.stringify(s, null, 2));
}

function repoName() {
  const r = sh('git rev-parse --show-toplevel').trim();
  return path.basename(r);
}

function originUrl() {
  return sh('git remote get-url origin').trim();
}

// ─── host adapters ───
const hosts = {
  codeberg: {
    label: 'Codeberg',
    ensureRepo(name) {
      const token = process.env.CODEBERG_TOKEN;
      const user = process.env.CODEBERG_USER;
      if (!token || !user) return { error: true, stderr: 'set CODEBERG_TOKEN + CODEBERG_USER' };
      const check = sh(`curl -s -o /dev/null -w "%{http_code}" -H "Authorization: token ${token}" https://codeberg.org/api/v1/repos/${user}/${name}`);
      if (typeof check === 'string' && check.trim() === '200') return { existed: true };
      const create = sh(`curl -s -H "Authorization: token ${token}" -H "Content-Type: application/json" -X POST https://codeberg.org/api/v1/user/repos -d "{\\"name\\":\\"${name}\\",\\"private\\":false}"`);
      if (typeof create === 'object' && create.error) return create;
      return { created: true };
    },
    pushUrl(name) {
      const token = process.env.CODEBERG_TOKEN;
      const user = process.env.CODEBERG_USER;
      return `https://${user}:${token}@codeberg.org/${user}/${name}.git`;
    },
  },
  gitlab: {
    label: 'GitLab',
    ensureRepo(name) {
      const token = process.env.GITLAB_TOKEN;
      const user = process.env.GITLAB_USER;
      if (!token || !user) return { error: true, stderr: 'set GITLAB_TOKEN + GITLAB_USER' };
      const check = sh(`curl -s -o /dev/null -w "%{http_code}" -H "PRIVATE-TOKEN: ${token}" https://gitlab.com/api/v4/projects/${encodeURIComponent(user+'/'+name)}`);
      if (typeof check === 'string' && check.trim() === '200') return { existed: true };
      const create = sh(`curl -s -H "PRIVATE-TOKEN: ${token}" -X POST "https://gitlab.com/api/v4/projects?name=${name}&visibility=public"`);
      if (typeof create === 'object' && create.error) return create;
      return { created: true };
    },
    pushUrl(name) {
      const token = process.env.GITLAB_TOKEN;
      const user = process.env.GITLAB_USER;
      return `https://oauth2:${token}@gitlab.com/${user}/${name}.git`;
    },
  },
  usb: {
    label: 'USB',
    enabled: () => !!USB,
    ensureRepo(name) {
      const dest = path.join(USB, name + '.git');
      if (!fs.existsSync(USB)) return { error: true, stderr: 'USB path not found · ' + USB };
      if (!fs.existsSync(dest)) {
        sh(`git init --bare "${dest}"`);
        return { created: true };
      }
      return { existed: true };
    },
    pushUrl(name) { return path.join(USB, name + '.git'); },
  },
  ipfs: {
    label: 'IPFS',
    enabled: () => IPFS,
    push(name) {
      const tar = sh(`git archive --format=tar HEAD`);
      if (typeof tar === 'object' && tar.error) return tar;
      fs.writeFileSync(`/tmp/${name}.tar`, tar);
      const add = sh(`ipfs add -Q /tmp/${name}.tar`);
      if (typeof add === 'object' && add.error) return add;
      fs.unlinkSync(`/tmp/${name}.tar`);
      return { cid: add.trim() };
    },
  },
};

// ─── mirror one repo ───
function mirrorRepo(dir) {
  const cwd = process.cwd();
  if (dir && dir !== '.') process.chdir(dir);
  try {
    const name = repoName();
    const origin = originUrl();
    if (!name || !origin) { console.log(`  ⊘ ${dir || '.'} · not a git repo`); return; }
    console.log(`\n◊ mirroring ${name}`);

    const state = loadState();
    state[name] = state[name] || {};

    for (const h of HOSTS) {
      const adapter = hosts[h];
      if (!adapter) { console.log(`   ⊘ ${h} · unknown host`); continue; }
      if (adapter.enabled && !adapter.enabled()) { console.log(`   ⊘ ${h} · disabled`); continue; }
      const ensure = adapter.ensureRepo ? adapter.ensureRepo(name) : null;
      if (ensure?.error) { console.log(`   ✗ ${h} · ${ensure.stderr}`); state[name][h] = { ok: false, error: ensure.stderr, ts: new Date().toISOString() }; continue; }
      if (adapter.pushUrl) {
        const url = adapter.pushUrl(name);
        const push = sh(`git push --mirror "${url}"`);
        if (typeof push === 'object' && push.error) {
          console.log(`   ✗ ${h} · push failed · ${push.stderr.slice(0,160)}`);
          state[name][h] = { ok: false, error: push.stderr.slice(0,200), ts: new Date().toISOString() };
        } else {
          console.log(`   ✓ ${h} · pushed`);
          state[name][h] = { ok: true, url: url.replace(/:[^@/]+@/, ':****@'), ts: new Date().toISOString() };
        }
      } else if (adapter.push) {
        const r = adapter.push(name);
        if (r.error) {
          console.log(`   ✗ ${h} · ${r.stderr}`);
          state[name][h] = { ok: false, error: r.stderr, ts: new Date().toISOString() };
        } else {
          console.log(`   ✓ ${h} · ${JSON.stringify(r)}`);
          state[name][h] = { ok: true, ...r, ts: new Date().toISOString() };
        }
      }
    }

    process.chdir(cwd);
    saveState(state);
  } catch (e) {
    process.chdir(cwd);
    console.log('   ✗ error · ' + e.message);
  }
}

// ─── main ───
console.log('◊·κ=1 · fallmirror · sovereign multi-host repo mirroring');
console.log('   hosts · ' + HOSTS.concat(USB?['usb']:[]).concat(IPFS?['ipfs']:[]).join(', '));

if (MODE_SETUP) {
  console.log(`\n◊ setup checklist:
  1. Codeberg account · sign up at https://codeberg.org/user/sign_up
     Then create token at https://codeberg.org/user/settings/applications
     $env:CODEBERG_USER = "your-handle"
     $env:CODEBERG_TOKEN = "your-token"
  2. GitLab account · sign up at https://gitlab.com/users/sign_up
     Then create token at https://gitlab.com/-/profile/personal_access_tokens
     $env:GITLAB_USER = "your-handle"
     $env:GITLAB_TOKEN = "your-token"
  3. (Optional) USB · plug in drive, get path · e.g. E:\\fallmirror
     $env:FALLMIRROR_USB = "E:\\fallmirror"
  4. (Optional) IPFS · install ipfs · run "ipfs daemon"
     $env:FALLMIRROR_IPFS = "1"
  5. Run · cd <your-repo> · node fallmirror.mjs
  6. Schedule nightly · Task Scheduler → run fallmirror.mjs at 02:00 daily
`);
  process.exit(0);
}

if (MODE_STATUS) {
  const s = loadState();
  if (!Object.keys(s).length) { console.log('   (no mirror history yet)'); process.exit(0); }
  for (const [name, hosts] of Object.entries(s)) {
    console.log(`\n  ${name}`);
    for (const [h, r] of Object.entries(hosts)) {
      const tag = r.ok ? '✓' : '✗';
      console.log(`     ${tag} ${h.padEnd(10)} · ${r.ts || ''} ${r.url||r.cid||r.error||''}`);
    }
  }
  process.exit(0);
}

if (MODE_ALL) {
  if (!ROOT || !fs.existsSync(ROOT)) { console.error('✗ set FALLMIRROR_ROOT to a folder of repos'); process.exit(1); }
  for (const e of fs.readdirSync(ROOT, { withFileTypes: true })) {
    if (e.isDirectory() && fs.existsSync(path.join(ROOT, e.name, '.git'))) {
      mirrorRepo(path.join(ROOT, e.name));
    }
  }
} else {
  mirrorRepo('.');
}

console.log('\n◊·κ=1 · fallmirror complete · check ./fallmirror-state.json for log');
