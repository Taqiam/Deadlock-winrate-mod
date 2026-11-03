# Hero Profile Win Rate

Adds **Win Rate** beside **Commends** on the profile screen. It works for All Heroes
and the selected hero. It needs no QOL Lock, mod manager, API, account login, or network
connection beyond Deadlock's own profile loading.

The VPK contains exactly two files:

```
panorama/layout/citadel_db_page_profile.vxml_c
panorama/scripts/profile_win_rate.vjs_c
```

The layout comes from Valve's game files. Its only logical change is one script include.
Our JavaScript creates the extra labels and reads the stats already displayed by the game.
No QOL code, assets, settings, or VPKs are included.

## Install / send to a friend

Send this folder or its ZIP. Your friend does not need Node, the builder, Source 2 Viewer,
or QOL to use the prebuilt VPK.

1. Close Deadlock.
2. Open Deadlock's installation folder using Steam → Properties → Installed Files → Browse.
3. Under `game/citadel/addons`, create a folder named `win_rate`.
4. Copy `win-rate_dir.vpk` into it and rename the copy to `pak01_dir.vpk`.
5. Back up `game/citadel/gameinfo.gi` before editing it.
6. Find `FileSystem` → `SearchPaths`. Add this line **before** the normal `Game citadel`
   line and before any other addon search paths:

```
Game    citadel/addons/win_rate
```

7. If the SearchPaths section does not already contain `Mod` and `Write` entries, add:

```
Mod     citadel
Write   citadel
```

These keep the base game as the source of MOD config files and writable game data.
They matter because otherwise the first Game path can become the default MOD path.
Keep the existing `Game citadel`, `Game core`, language, and other search paths.

Example (preserve your existing language entries above these):

```
Mod     citadel
Write   citadel
Game    citadel/addons/win_rate
Game    citadel/addons
Game    citadel
Game    core
```

The general `Game citadel/addons` line is only needed for other addons you use.
This mod itself only needs its own `win_rate` folder mounted.

8. Launch Deadlock. Open Profile and select a hero. Win Rate appears beside Commends.

To uninstall, close the game and remove the `Game citadel/addons/win_rate` search-path
line. You can then remove its folder. Keep other addon mounts if you still use those mods.
Game updates can reset gameinfo.gi; recheck the mount after an update.

## Other profile mods, including QOL

QOL's archive is restored to its original bytes on this PC. This mod is a separate VPK.
However, both can replace the same profile layout. The earlier search path wins;
with this mod first, QOL-specific additions to the profile layout are not displayed.
QOL's other screens and features can still load normally. Restoring a file and combining
two mods' changes to the same file are different operations.

Use LEARN.md to understand and rebuild the mod. Start with `source/profile_win_rate.js`.
