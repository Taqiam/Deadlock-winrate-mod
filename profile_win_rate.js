// Uses the profile's existing stats; no external requests.
(function () {
    var root = $.GetContextPanel();

    // Labels show formatted strings. Convert full integer displays to numbers.
    function readCount(text) {
        var s = String(text || "").replace(/[\u0660-\u0669\u06f0-\u06f9]/g, function (c) {
            var n = c.charCodeAt(0);
            return String(n >= 0x06f0 ? n - 0x06f0 : n - 0x0660);
        });
        if (!/^\s*[0-9][0-9\s,.'\u00a0\u202f\u066c]*\s*$/.test(s)) return NaN;
        return Number(s.replace(/[^0-9]/g, ""));
    }
    function formatRate(wins, played) {
        if (!isFinite(wins) || !isFinite(played) || played <= 0 || wins < 0 || wins > played) return "N/A";
        return (100 * wins / played).toFixed(1) + "%";
    }
    function update() {
        // Closing the profile destroys its panels; stop the loop when that happens.
        if (!root.IsValid()) return;
        var playedContainer = root.FindChildTraverse("GamesPlayedContainer");
        var wonContainer = root.FindChildTraverse("GamesWonContainer");
        var commends = root.FindChildTraverse("CommendsContainer");
        var value = root.FindChildTraverse("ProfileWinRateValue");
        if (!value && commends) {
            // Create the UI once. Reuse Valve's profile CSS classes for styling.
            var stat = $.CreatePanel("Panel", commends.GetParent(), "ProfileWinRateContainer");
            stat.AddClass("TextStat");
            value = $.CreatePanel("Label", stat, "ProfileWinRateValue");
            value.AddClass("statValue");
            value.text = "N/A";
            var label = $.CreatePanel("Label", stat, "ProfileWinRateLabel");
            label.AddClass("statLabel");
            label.text = "Win Rate";
        }
        var played = playedContainer ? playedContainer.FindChildrenWithClassTraverse("statValue")[0] : null;
        var won = wonContainer ? wonContainer.FindChildrenWithClassTraverse("statValue")[0] : null;
        if (played && won && value) {
            // The game updates these base labels when the selected hero changes.
            var text = formatRate(readCount(won.text), readCount(played.text));
            if (value.text !== text) value.text = text;
            var container = root.FindChildTraverse("ProfileWinRateContainer");
            if (container) container.SetHasClass("isZeroValue", text === "N/A");
        }
        $.Schedule(0.25, update);
    }
    update();
})();
