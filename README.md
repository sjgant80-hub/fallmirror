# FallMirror

**A sovereign browser-native stress sonar. Seven shapes, one reflection, one prescribed exercise.**

Two minutes. No account. No cloud. Nothing leaves your device.

- Live: **https://sjgant80-hub.github.io/fallmirror/**
- Machine summary: **[llms.txt](llms.txt)**

## What it does

FallMirror asks you seven short slider questions. It identifies which of seven distinct stress shapes fits you strongest right now, gives you the published research behind that pattern, and prescribes one specific breath or vocal exercise to try immediately.

That's the whole app.

## The seven shapes

Each shape maps to a documented chronic-stress pattern from peer-reviewed research:

| Shape | Pattern | Research | Exercise |
|---|---|---|---|
| ▲ Tetrahedron · Sharp Edge | Chronic sympathetic activation | Friedman & Rosenman (1959), Williams et al. (2000) | Long exhale hiss |
| ◎ Spiral · The Chase | Reward-seeking without completion | Koob & Volkow (2016) | Chest-voice grounding |
| ● Sphere · The Flood | Gut-brain override, unbounded intake | Dallman et al. (2003) | Sealed hum |
| — Line · Flatline | Dorsal vagal shutdown | Porges (2011, Polyvagal Theory) | Sharp inhale + activation |
| ◄ Cone · The Squeeze | Scarcity narrowing exec function | Mani et al. (2013) | Wide-open vowels |
| ◇ Mirror · Comparison | Social-status pain (ACC) | Takahashi et al. (2009) | Eyes-closed silence |
| ▯ Tower · The Mask | Invulnerability posture | Reinhard et al. (2012) | Whispered "help" |

The unifying frame: every shape is what happens when a system runs alone too long. The exercises help you meet yourself. The deepest correction for all seven is connection with another person.

## Architecture

- One HTML file
- Vanilla JS · no framework, no build step
- IndexedDB for the journal
- Service worker for offline
- Zero external requests
- No account, no server, no telemetry

## Run it locally

```bash
# Serve any way you like
npx --yes http-server . -p 8080

# Then open http://localhost:8080

# Or save index.html to your disk and open it directly.
```

## What it is not

- Not a diagnosis
- Not therapy
- Not a substitute for professional care
- Not a crisis service

**If you are in crisis, contact a qualified professional or emergency services:**
- UK: [Samaritans 116 123](https://www.samaritans.org/)
- US: [988 Suicide & Crisis Lifeline](https://988lifeline.org/)

## License

MIT · Copyright 2026 AI-Native Solutions · https://ai-nativesolutions.com

Fork it. Host it. Save the HTML to your disk. It runs forever.
