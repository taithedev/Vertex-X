using System;
using System.Diagnostics;
using System.IO;
using System.Linq;
using System.Net;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Security.Cryptography;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using System.Windows;

namespace VertexX;

/// <summary>
/// Downloads a newer official GitHub Release installer, validates SHA-256,
/// and applies it only after Vertex X exits normally. No GitHub Actions required.
/// </summary>
public sealed class VertexUpdateService
{
    private const string ApiUrl = "https://api.github.com/repos/taithedev/Vertex-X/releases?per_page=100";
    private const long MaximumInstallerBytes = 300_000_000;
    private static readonly HttpClient Http = new() { Timeout = TimeSpan.FromMinutes(6) };
    private readonly SemaphoreSlim _gate = new(1, 1);
    private string? _pendingSetup;
    private string? _pendingHash;

    public static string CurrentVersion =>
        typeof(VertexUpdateService).Assembly.GetName().Version?.ToString(3) ?? "0.5.1";

    public string? PendingVersion { get; private set; }

    public async Task<bool> CheckAsync(Window owner, bool quietWhenCurrent, bool automatic = false)
    {
        if (!await _gate.WaitAsync(0)) return false;

        try
        {
            using var request = new HttpRequestMessage(HttpMethod.Get, ApiUrl);
            request.Headers.UserAgent.Add(new ProductInfoHeaderValue("VertexX", CurrentVersion));
            request.Headers.Accept.Add(new MediaTypeWithQualityHeaderValue("application/vnd.github+json"));
            using var response = await Http.SendAsync(request);
            if (response.StatusCode == HttpStatusCode.NotFound)
            {
                if (!quietWhenCurrent)
                    MessageBox.Show(owner, "Vertex X has no published release yet.", "Vertex X Updates");
                return false;
            }

            response.EnsureSuccessStatusCode();
            using var json = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
            var release = VertexRelease.SelectLatest(json.RootElement);
            if (release == null)
            {
                if (!quietWhenCurrent)
                    MessageBox.Show(owner, "Vertex X has no compatible published release yet.", "Vertex X Updates");
                return false;
            }
            var selected = release.Value;
            var latest = VertexRelease.ParseVersion(selected.GetProperty("tag_name").GetString())!;
            var current = Version.Parse(CurrentVersion);
            if (latest <= current)
            {
                if (!quietWhenCurrent)
                    MessageBox.Show(owner, "Vertex X " + CurrentVersion + " is up to date.", "Vertex X Updates");
                return false;
            }

            var version = latest.ToString(3);
            if (PendingVersion == version && File.Exists(_pendingSetup))
            {
                if (!automatic && !quietWhenCurrent)
                    MessageBox.Show(owner, "Vertex X " + version + " is ready. Close Vertex X to install it.", "Vertex X Updates");
                return true;
            }

            var fileName = "VertexX-Setup-" + version + "-x64.exe";
            var assets = selected.GetProperty("assets").EnumerateArray().ToArray();
            var setupAsset = assets.FirstOrDefault(a =>
                a.GetProperty("name").GetString()?.Equals(fileName, StringComparison.OrdinalIgnoreCase) == true);
            var sumsAsset = assets.FirstOrDefault(a =>
                a.GetProperty("name").GetString()?.Equals("SHA256SUMS.txt", StringComparison.OrdinalIgnoreCase) == true);

            if (setupAsset.ValueKind != JsonValueKind.Object || sumsAsset.ValueKind != JsonValueKind.Object)
                throw new InvalidDataException("Release is missing its setup EXE or SHA256SUMS.txt.");

            var setupUrl = setupAsset.GetProperty("browser_download_url").GetString() ?? "";
            var sumsUrl = sumsAsset.GetProperty("browser_download_url").GetString() ?? "";
            if (!IsReleaseDownload(setupUrl) || !IsReleaseDownload(sumsUrl))
                throw new InvalidDataException("Unexpected release download URL.");

            if (!automatic && MessageBox.Show(owner,
                    "Vertex X " + version + " is available.\n\nDownload the installer and install it the next time Vertex X closes?",
                    "Vertex X Updates", MessageBoxButton.YesNo, MessageBoxImage.Question) != MessageBoxResult.Yes)
                return false;

            var manifest = await Http.GetStringAsync(sumsUrl);
            var tokens = manifest.Split('\n', StringSplitOptions.RemoveEmptyEntries)
                .Select(line => line.Trim().Split((char[]?)null, StringSplitOptions.RemoveEmptyEntries))
                .FirstOrDefault(parts => parts.Length >= 2 && parts[1].TrimStart('*') == fileName);
            var expectedHash = tokens is { Length: >= 2 } ? tokens[0] : "";
            if (expectedHash.Length != 64 || !expectedHash.All(Uri.IsHexDigit))
                throw new InvalidDataException("Installer SHA-256 checksum is missing or invalid.");

            var cache = Path.Combine(
                Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
                "VertexX", "Updates", version);
            Directory.CreateDirectory(cache);
            var destination = Path.Combine(cache, fileName);
            if (!await MatchesSha256Async(destination, expectedHash))
            {
                var temporary = destination + ".part";
                try
                {
                    using var download = await Http.GetAsync(setupUrl, HttpCompletionOption.ResponseHeadersRead);
                    download.EnsureSuccessStatusCode();
                    if (download.Content.Headers.ContentLength is long size && size > MaximumInstallerBytes)
                        throw new InvalidDataException("Installer exceeds the allowed file size.");

                    await using var input = await download.Content.ReadAsStreamAsync();
                    await using (var output = new FileStream(temporary, FileMode.Create, FileAccess.Write, FileShare.None))
                    {
                        var buffer = new byte[64 * 1024];
                        long total = 0;
                        int read;
                        while ((read = await input.ReadAsync(buffer.AsMemory())) > 0)
                        {
                            total += read;
                            if (total > MaximumInstallerBytes)
                                throw new InvalidDataException("Installer exceeds the allowed file size.");
                            await output.WriteAsync(buffer.AsMemory(0, read));
                        }
                    }

                    if (!await MatchesSha256Async(temporary, expectedHash))
                        throw new InvalidDataException("Installer checksum does not match. Update rejected.");
                    File.Move(temporary, destination, overwrite: true);
                }
                finally
                {
                    if (File.Exists(temporary)) File.Delete(temporary);
                }
            }

            _pendingSetup = destination;
            _pendingHash = expectedHash;
            PendingVersion = version;

            if (!automatic)
                MessageBox.Show(owner,
                    "Vertex X " + version + " has been downloaded and verified.\n\nClose Vertex X normally to apply the update. Your saved Lua files and account settings will remain in your profile.",
                    "Update Ready", MessageBoxButton.OK, MessageBoxImage.Information);
            return true;
        }
        catch (Exception ex)
        {
            if (!quietWhenCurrent)
                MessageBox.Show(owner, "Vertex X could not check or prepare the update:\n" + ex.Message,
                    "Vertex X Updates", MessageBoxButton.OK, MessageBoxImage.Warning);
            return false;
        }
        finally { _gate.Release(); }
    }

    public bool InstallPendingOnExit()
    {
        var setup = _pendingSetup;
        var hash = _pendingHash;
        if (setup == null || hash == null || !File.Exists(setup)) return false;
        try
        {
            using var stream = File.OpenRead(setup);
            var actual = Convert.ToHexString(SHA256.HashData(stream));
            if (!actual.Equals(hash, StringComparison.OrdinalIgnoreCase)) return false;

            // NSIS waits for this exact process before replacing the per-user install.
            Process.Start(new ProcessStartInfo
            {
                FileName = setup,
                Arguments = "/S /UPDATEPID=" + Environment.ProcessId,
                UseShellExecute = true
            });
            _pendingSetup = null;
            _pendingHash = null;
            PendingVersion = null;
            return true;
        }
        catch { return false; }
    }

    private static async Task<bool> MatchesSha256Async(string file, string expectedHash)
    {
        if (!File.Exists(file)) return false;
        await using var stream = File.OpenRead(file);
        return Convert.ToHexString(await SHA256.HashDataAsync(stream))
            .Equals(expectedHash, StringComparison.OrdinalIgnoreCase);
    }

    private static bool IsReleaseDownload(string text)
    {
        return Uri.TryCreate(text, UriKind.Absolute, out var uri)
            && uri.Scheme == Uri.UriSchemeHttps
            && uri.Host.Equals("github.com", StringComparison.OrdinalIgnoreCase)
            && uri.AbsolutePath.StartsWith("/taithedev/Vertex-X/releases/download/", StringComparison.Ordinal);
    }
}
