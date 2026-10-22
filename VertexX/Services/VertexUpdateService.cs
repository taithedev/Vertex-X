using System;
using System.Diagnostics;
using System.IO;
using System.Linq;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Security.Cryptography;
using System.Text.Json;
using System.Threading.Tasks;
using System.Windows;

namespace VertexX;

public sealed class VertexUpdateService
{
    private const string ApiUrl = "https://api.github.com/repos/taithedev/Vertex-X/releases/latest";
    public static string CurrentVersion => typeof(VertexUpdateService).Assembly.GetName().Version?.ToString(3) ?? "0.4.1";
    private static readonly HttpClient Http = new() { Timeout = TimeSpan.FromMinutes(5) };

    public async Task CheckAsync(Window owner, bool quietWhenCurrent)
    {
        try
        {
            using var request = new HttpRequestMessage(HttpMethod.Get, ApiUrl);
            request.Headers.UserAgent.Add(new ProductInfoHeaderValue("VertexX", CurrentVersion));
            request.Headers.Accept.Add(new MediaTypeWithQualityHeaderValue("application/vnd.github+json"));
            using var response = await Http.SendAsync(request);
            if (response.StatusCode == System.Net.HttpStatusCode.NotFound)
            {
                if (!quietWhenCurrent)
                    MessageBox.Show(owner, "No stable Vertex X release has been published yet.", "Vertex X Updates");
                return;
            }
            response.EnsureSuccessStatusCode();
            using var document = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
            var release = document.RootElement;
            var tag = release.GetProperty("tag_name").GetString() ?? "";
            if (!Version.TryParse(tag.TrimStart('v', 'V'), out var latest) ||
                !Version.TryParse(CurrentVersion, out var current))
            {
                if (!quietWhenCurrent) MessageBox.Show(owner, "The release version cannot be compared.", "Vertex X Updates");
                return;
            }
            if (latest <= current)
            {
                if (!quietWhenCurrent) MessageBox.Show(owner, "You are using Vertex X " + CurrentVersion + ".", "Vertex X Updates");
                return;
            }
            var fileName = "VertexX-Setup-" + latest.ToString(3) + "-x64.exe";
            var assets = release.GetProperty("assets").EnumerateArray().ToArray();
            var setup = assets.FirstOrDefault(asset =>
                asset.GetProperty("name").GetString()?.Equals(fileName, StringComparison.OrdinalIgnoreCase) == true);
            var sums = assets.FirstOrDefault(asset =>
                asset.GetProperty("name").GetString() == "SHA256SUMS.txt");
            if (setup.ValueKind != JsonValueKind.Object || sums.ValueKind != JsonValueKind.Object)
            {
                if (!quietWhenCurrent)
                    MessageBox.Show(owner, "A new release exists, but its installer or SHA256 checksum is unavailable.", "Vertex X Updates");
                return;
            }
            var setupUrl = setup.GetProperty("browser_download_url").GetString() ?? "";
            var sumsUrl = sums.GetProperty("browser_download_url").GetString() ?? "";
            if (!IsOfficialReleaseUrl(setupUrl) || !IsOfficialReleaseUrl(sumsUrl))
                throw new InvalidDataException("Release assets are not hosted at the official Vertex X GitHub repository.");
            if (MessageBox.Show(owner,
                    "Vertex X " + latest + " is available.\n\nDownload its official installer, verify its SHA256 checksum, and open setup?\n\nThe installer is currently unsigned.",
                    "Vertex X Update", MessageBoxButton.YesNo, MessageBoxImage.Information) != MessageBoxResult.Yes)
                return;
            owner.Cursor = System.Windows.Input.Cursors.Wait;
            try
            {
                var manifest = await Http.GetStringAsync(sumsUrl);
                var matching = manifest.Split('\n', StringSplitOptions.RemoveEmptyEntries)
                    .Select(line => line.Trim().Split((char[]?)null, StringSplitOptions.RemoveEmptyEntries))
                    .FirstOrDefault(tokens => tokens.Length >= 2 && tokens[1] == fileName);
                var expectedHash = matching is { Length: >= 2 } ? matching[0].Trim() : "";
                if (expectedHash.Length != 64 || !expectedHash.All(Uri.IsHexDigit))
                    throw new InvalidDataException("Installer checksum is missing or invalid.");
                var directory = Path.Combine(Path.GetTempPath(), "VertexXUpdates", latest.ToString(3));
                Directory.CreateDirectory(directory);
                var target = Path.Combine(directory, fileName);
                using (var download = await Http.GetAsync(setupUrl, HttpCompletionOption.ResponseHeadersRead))
                {
                    download.EnsureSuccessStatusCode();
                    if (download.Content.Headers.ContentLength > 300_000_000)
                        throw new InvalidDataException("Installer exceeds the allowed download size.");
                    await using var source = await download.Content.ReadAsStreamAsync();
                    await using var destination = File.Create(target);
                    await source.CopyToAsync(destination);
                }
                await using (var stream = File.OpenRead(target))
                {
                    var digest = Convert.ToHexString(await SHA256.HashDataAsync(stream));
                    if (!digest.Equals(expectedHash, StringComparison.OrdinalIgnoreCase))
                    {
                        File.Delete(target);
                        throw new InvalidDataException("Installer checksum mismatch. The file was rejected.");
                    }
                }
                if (MessageBox.Show(owner,
                        "Vertex X setup downloaded and SHA256 verified.\n\nSave your open scripts, then select Yes to start the installer. The installer may need to close Vertex X.",
                        "Start Verified Setup?", MessageBoxButton.YesNo, MessageBoxImage.Question) ==
                    MessageBoxResult.Yes)
                {
                    Process.Start(new ProcessStartInfo(target) { UseShellExecute = true });
                }
            }
            finally { owner.Cursor = null; }
        }
        catch (Exception ex)
        {
            if (!quietWhenCurrent)
                MessageBox.Show(owner, "Update check or download failed: " + ex.Message, "Vertex X Updates", MessageBoxButton.OK, MessageBoxImage.Warning);
        }
    }

    private static bool IsOfficialReleaseUrl(string url)
    {
        return Uri.TryCreate(url, UriKind.Absolute, out var uri)
            && uri.Scheme == Uri.UriSchemeHttps
            && uri.Host.Equals("github.com", StringComparison.OrdinalIgnoreCase)
            && uri.AbsolutePath.StartsWith("/taithedev/Vertex-X/releases/download/", StringComparison.Ordinal);
    }
}