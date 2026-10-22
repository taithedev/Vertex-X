using System;
using System.Diagnostics;
using System.Linq;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Text.Json;
using System.Threading.Tasks;
using System.Windows;

namespace VertexX;
public sealed class VertexUpdateService
{
    private const string ApiUrl = "https://api.github.com/repos/taithedev/Vertex-X/releases/latest";
    public const string CurrentVersion = "0.4.0";
    private static readonly HttpClient Http = new() { Timeout = TimeSpan.FromSeconds(12) };
    public async Task CheckAsync(Window owner, bool quietWhenCurrent)
    {
        try {
            using var request = new HttpRequestMessage(HttpMethod.Get, ApiUrl);
            request.Headers.UserAgent.Add(new ProductInfoHeaderValue("VertexX", CurrentVersion));
            request.Headers.Accept.Add(new MediaTypeWithQualityHeaderValue("application/vnd.github+json"));
            using var response = await Http.SendAsync(request);
            if (response.StatusCode == System.Net.HttpStatusCode.NotFound) {
                if (!quietWhenCurrent) MessageBox.Show(owner, "No stable GitHub Release is published yet.", "Vertex X Updates"); return;
            }
            response.EnsureSuccessStatusCode();
            using var doc = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
            var release = doc.RootElement;
            var tag = release.GetProperty("tag_name").GetString() ?? "";
            if (!Version.TryParse(tag.TrimStart('v', 'V'), out var latest) ||
                !Version.TryParse(CurrentVersion, out var current)) {
                if (!quietWhenCurrent) MessageBox.Show(owner, "Unable to compare release versions.", "Vertex X"); return;
            }
            if (latest <= current) {
                if (!quietWhenCurrent) MessageBox.Show(owner, "Vertex X is up to date (" + CurrentVersion + ").", "Vertex X"); return;
            }
            var assets = release.GetProperty("assets").EnumerateArray();
            var setup = assets.FirstOrDefault(a =>
                (a.GetProperty("name").GetString() ?? "").StartsWith("VertexX-Setup-", StringComparison.OrdinalIgnoreCase)
                && (a.GetProperty("name").GetString() ?? "").EndsWith(".exe", StringComparison.OrdinalIgnoreCase));
            var url = setup.ValueKind == JsonValueKind.Object
                ? setup.GetProperty("browser_download_url").GetString()
                : release.GetProperty("html_url").GetString();
            if (string.IsNullOrWhiteSpace(url) || !Uri.TryCreate(url, UriKind.Absolute, out var uri) ||
                uri.Scheme != "https" || (uri.Host != "github.com" && uri.Host != "objects.githubusercontent.com"))
                return;
            if (MessageBox.Show(owner, "Version " + latest + " is available. Open the official installer download? Your scripts stay in Documents.",
                    "Vertex X Update", MessageBoxButton.YesNo, MessageBoxImage.Information) == MessageBoxResult.Yes)
                Process.Start(new ProcessStartInfo(uri.AbsoluteUri) { UseShellExecute = true });
        } catch (Exception ex) {
            if (!quietWhenCurrent) MessageBox.Show(owner, "Update check failed: " + ex.Message, "Vertex X Updates");
        }
    }
}