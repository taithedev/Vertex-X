using System.Text.Json;
using VertexX;

static object Release(string tag, bool draft = false, bool prerelease = true, bool checksum = true) =>
    new { tag_name = tag, draft, prerelease, assets = new[] {
        new { name = "VertexX-Setup-" + tag.TrimStart('v') + "-x64.exe" },
        new { name = checksum ? "SHA256SUMS.txt" : "notes.txt" } } };
static void Expect(string? expected, params object[] releases)
{
    using var doc = JsonDocument.Parse(JsonSerializer.Serialize(releases));
    var actual = VertexRelease.SelectLatest(doc.RootElement)?.GetProperty("tag_name").GetString();
    if (actual != expected) throw new Exception($"Expected {expected ?? "none"}, got {actual ?? "none"}");
}
Expect("v0.5.2", Release("v0.5.1", prerelease: false), Release("v0.5.2"));
Expect("v0.5.1", Release("v0.5.3", draft: true), Release("v0.5.2", checksum: false), Release("v0.5.1"));
Expect("v0.10.0", Release("v0.9.0"), Release("v0.10.0"), Release("v0.8.0"));
Expect(null, Release("invalid"), Release("v0.5"), Release("v0.5.2.1"));
Expect(null);
foreach (var json in new[] { "{}", "[{},null,42]" })
{
    using var doc = JsonDocument.Parse(json);
    if (VertexRelease.SelectLatest(doc.RootElement) != null) throw new Exception("Malformed release accepted");
}
Console.WriteLine("PASS: beta updates, drafts, incomplete assets, numeric ordering, invalid versions, empty/malformed feeds.");
