# Release validation

Tested November 3, 2026 on Deadlock build 26390257.

- Rebuilt from the installed game's base profile resource using the published builder.
- Rebuilt VPK matches the release byte-for-byte: SHA-256 FDFA4386D0F8C660ED9698D017D46AF5F4FB2F38EE582C7CD5254331F88D825E.
- All two VPK resource CRCs verified; packaged JavaScript matches source.
- Script checks passed: hero changes, zero/unavailable/invalid records, grouping separators, Persian and Arabic digits, no duplicate labels, and stopping after profile closes.
- Installed through Deadlock Mod Manager; launched with existing mods enabled.
- In-game All Heroes: 103 wins / 225 games = 45.8%.
- In-game Silver: 36 wins / 72 games = 50.0%.
- QOL archive still matches its original backup SHA-256 547CCEEE8382FF5ECC26CD5D642E647BA2CEF93C233019A8A9B7D0028877DBD7.

Zero-game behavior was checked in the script harness; no zero-game hero was checked in-game. Conflicting profile layouts require load-order priority.
