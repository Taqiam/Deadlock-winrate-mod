# How this mod is built

## 1. Learn the three layers separately

**Panorama layout** describes the screen: panels, labels, snippets and includes.
**JavaScript** finds panels, reads values, creates labels and refreshes them.
**Packaging** turns those resources into a VPK the game can mount.

Start by reading `profile_win_rate.js`. The binary writers in `formats.mjs`
are supporting build code; you do not need to understand them to change the feature.

## 2. Inspect Valve's profile

Open the game's `game/citadel/pak01_dir.vpk` in Source 2 Viewer and find:

```
panorama/layout/citadel_db_page_profile.vxml_c
```

The `_c` means compiled. Export/decompile it to read the XML. This package also includes
`profile.xml`, the readable result of our patched layout.

Find `GamesPlayedContainer`, `GamesWonContainer` and `CommendsContainer`.
Each stats container has a Label with the `statValue` class. These are stable lookup
points for this game build. Updates can change them, so inspect again when a mod breaks.

## 3. Load our own script

The only layout addition is:

```xml
<scripts>
    <include src="s2r://panorama/scripts/profile_win_rate.vjs_c" />
</scripts>
```

This is why the mod does not need QOL: the game loads our script directly.
There is no existing third-party script to append to.

The compiled layout stores its structure in the LaCo block as a KV3 syntax tree.
`build.mjs` reads that tree and inserts a SCRIPTS node containing an INCLUDE node.
The other layout content and resource blocks are retained.

## 4. Find the existing numbers

```js
var root = $.GetContextPanel();
var container = root.FindChildTraverse("GamesPlayedContainer");
var label = container.FindChildrenWithClassTraverse("statValue")[0];
```

`label.text` contains the displayed number, such as `225` or `1,234`.
`readCount()` converts it to a number. It also handles Persian/Arabic digits and rejects
unresolved bindings. It assumes the full integer display used by these labels, not
abbreviations such as `1.2k`.

## 5. Create matching UI

```js
var stat = $.CreatePanel("Panel", commends.GetParent(), "ProfileWinRateContainer");
stat.AddClass("TextStat");
```

Creating it under Commends' parent puts it in the same row. The new value uses
`statValue`; its caption uses `statLabel`. All three CSS classes come from Valve's
profile stylesheet, so the appearance matches without a separate stylesheet.

Check for `ProfileWinRateValue` before creating anything. Otherwise every refresh would
create another label.

## 6. Calculate, then refresh

```js
return (100 * wins / played).toFixed(1) + "%";
```

Zero games or unavailable values produce `N/A`. The update function reschedules itself
with `$.Schedule(0.25, update)`. Selecting a hero changes the base game's labels; the next
update reads them. The loop stops when its root panel is no longer valid.

Only assign new label text when it differs, to avoid unnecessary UI updates.

## 7. Rebuild after an edit

Build-time tools: Node.js and Source 2 Viewer's **CLI**. The portable GUI alone does not
provide the same command-line interface. Obtain the CLI from the project's own releases:
https://github.com/ValveResourceFormat/ValveResourceFormat/releases

Run from this package's directory, changing these example paths for your PC:

```powershell
node build.mjs "C:\Tools\Source2Viewer-CLI.exe" "D:\SteamLibrary\steamapps\common\Deadlock\game\citadel\pak01_dir.vpk"
```

The builder extracts the original layout from the game, reads its LaCo tree, adds our
script include, writes a compiled layout and JS resource, decompiles the result for
inspection, and packages exactly two resources into `win-rate_dir.vpk`.

The JS resource uses Panorama script version 4, with UTF-8 source in DATA. The layout
tree uses uncompressed binary KV3 version 4. `formats.mjs` implements only the value
types needed by this layout, not a general Source 2 compiler.

The build does not install anything or edit gameinfo.gi. Close the game before replacing
your installed `addons/win_rate/pak01_dir.vpk` with the newly built VPK.

## 8. Test one change at a time

Open the profile, compare the result to wins / games, switch several heroes, and return
to All Heroes. Check a hero with zero games if one is available. Reopen the screen to
check that it does not create duplicates. Test with other profile mods disabled first.

Suggested learning exercise: change the caption to `Win percentage`, rebuild, install
and check the result. Then add Games Lost using `played - wins`, creating a different
panel ID so it cannot collide with Win Rate.

The game layout belongs to Valve. Format references are the open-source
ValveResourceFormat project's Panorama and BinaryKV3 implementations:
https://github.com/ValveResourceFormat/ValveResourceFormat
