using System;
using System.Linq;
using System.Text.Json;

namespace VertexX;

public static class VertexRelease
{
    public static Version? ParseVersion(string? tag)
    {
        if (string.IsNullOrWhiteSpace(tag)) return null;
        return Version.TryParse(tag.TrimStart('v', 'V'), out var value)
            && value.Build >= 0 && value.Revision < 0 ? value : null;
    }

    // The app ships as a beta, so published prereleases belong to its channel.
    // Ignore drafts, malformed versions and releases without the full update pair.
    public static JsonElement? SelectLatest(JsonElement releases)
    {
        if (releases.ValueKind != JsonValueKind.Array) return null;
        JsonElement? selected = null;
        Version? highest = null;
        foreach (var release in releases.EnumerateArray())
        {
            if (release.ValueKind != JsonValueKind.Object ||
                !release.TryGetProperty("draft", out var draft) || draft.ValueKind != JsonValueKind.False ||
                !release.TryGetProperty("tag_name", out var tag) || tag.ValueKind != JsonValueKind.String ||
                ParseVersion(tag.GetString()) is not { } version ||
                !release.TryGetProperty("assets", out var assets) || assets.ValueKind != JsonValueKind.Array)
                continue;
            var names = assets.EnumerateArray()
                .Where(a => a.ValueKind == JsonValueKind.Object && a.TryGetProperty("name", out var n) && n.ValueKind == JsonValueKind.String)
                .Select(a => a.GetProperty("name").GetString()).ToArray();
            if (!names.Contains("VertexX-Setup-" + version.ToString(3) + "-x64.exe", StringComparer.OrdinalIgnoreCase) ||
                !names.Contains("SHA256SUMS.txt", StringComparer.OrdinalIgnoreCase)) continue;
            if (highest == null || version > highest) { highest = version; selected = release; }
        }
        return selected;
    }
}
