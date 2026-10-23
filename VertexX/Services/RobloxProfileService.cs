using System;
using System.Collections.Generic;
using System.IO;
using System.Net;
using System.Net.Http;
using System.Text;
using System.Text.Json;
using System.Text.RegularExpressions;
using System.Threading;
using System.Threading.Tasks;

namespace VertexX;

public sealed record RobloxProfile(long Id, string Name, string DisplayName, string Description,
    string? Created, bool HasVerifiedBadge, string? AvatarDataUrl, string AvatarState, string? ProfileWarning);

public sealed class RobloxProfileService
{
    private static readonly HttpClient DefaultHttp = new(new HttpClientHandler { AllowAutoRedirect = false })
        { Timeout = TimeSpan.FromSeconds(12) };
    private readonly HttpClient _http;
    private readonly SemaphoreSlim _gate = new(1, 1);
    private readonly Dictionary<string, (DateTimeOffset Until, RobloxProfile Profile)> _cache = new(StringComparer.OrdinalIgnoreCase);
    public RobloxProfileService() : this(DefaultHttp) { }
    internal RobloxProfileService(HttpClient http) { _http = http; }

    public async Task<RobloxProfile> LookupAsync(string username)
    {
        username = username.Trim();
        if (!Regex.IsMatch(username, "^[A-Za-z0-9_]{3,20}$"))
            throw new ArgumentException("Enter a Roblox username with 3–20 letters, digits, or underscores.");
        await _gate.WaitAsync();
        try
        {
            if (_cache.TryGetValue(username, out var cached) && cached.Until > DateTimeOffset.UtcNow)
                return cached.Profile;
            using var body = new StringContent(JsonSerializer.Serialize(new { usernames = new[] { username }, excludeBannedUsers = true }), Encoding.UTF8, "application/json");
            using var response = await _http.PostAsync("https://users.roblox.com/v1/usernames/users", body);
            using var found = await ReadJsonAsync(response);
            if (!found.RootElement.TryGetProperty("data", out var users) || users.ValueKind != JsonValueKind.Array)
                throw new InvalidDataException("Roblox returned an unexpected profile response.");
            if (users.GetArrayLength() == 0) throw new InvalidOperationException("No matching public Roblox profile was found.");
            var user = users[0];
            var id = user.GetProperty("id").GetInt64();
            if (id <= 0) throw new InvalidDataException("Roblox returned an invalid profile ID.");
            var name = user.GetProperty("name").GetString() ?? username;
            var displayName = user.TryGetProperty("displayName", out var display) ? display.GetString() ?? name : name;

            // Optional requests are independent. A missing avatar must never hide the profile.
            var detailsTask = DetailsAsync(id);
            var avatarTask = AvatarAsync(id);
            await Task.WhenAll(detailsTask, avatarTask);
            var details = await detailsTask;
            var avatar = await avatarTask;
            var result = new RobloxProfile(id, name, displayName, details.Description, details.Created,
                details.Verified, avatar.Data, avatar.State, details.Warning);
            if (_cache.Count >= 32) _cache.Clear();
            var complete = avatar.Data != null && details.Warning == null;
            _cache[username] = (DateTimeOffset.UtcNow.AddSeconds(complete ? 300 : 30), result);
            return result;
        }
        finally { _gate.Release(); }
    }

    private static async Task<JsonDocument> ReadJsonAsync(HttpResponseMessage response)
    {
        if (response.StatusCode == HttpStatusCode.TooManyRequests)
            throw new HttpRequestException("Roblox is rate limiting requests. Wait a moment and try again.");
        if (!response.IsSuccessStatusCode)
            throw new HttpRequestException("Roblox returned HTTP " + (int)response.StatusCode + ". Try again later.");
        return JsonDocument.Parse(await response.Content.ReadAsStringAsync());
    }

    private async Task<(string Description, string? Created, bool Verified, string? Warning)> DetailsAsync(long id)
    {
        try
        {
            using var response = await _http.GetAsync("https://users.roblox.com/v1/users/" + id);
            using var json = await ReadJsonAsync(response);
            var root = json.RootElement;
            var description = root.TryGetProperty("description", out var bio) && bio.ValueKind == JsonValueKind.String ? bio.GetString() ?? "" : "";
            if (description.Length > 4000) description = description[..4000];
            var created = root.TryGetProperty("created", out var date) && date.ValueKind == JsonValueKind.String ? date.GetString() : null;
            var verified = root.TryGetProperty("hasVerifiedBadge", out var badge) && badge.ValueKind == JsonValueKind.True;
            return (description, created, verified, null);
        }
        catch (Exception ex) when (ex is HttpRequestException or TaskCanceledException or JsonException or InvalidOperationException or KeyNotFoundException)
        { return ("", null, false, "Profile details are temporarily unavailable."); }
    }

    private async Task<(string? Data, string State)> AvatarAsync(long id)
    {
        try
        {
            using var response = await _http.GetAsync("https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=" + id + "&size=150x150&format=Png&isCircular=false");
            using var json = await ReadJsonAsync(response);
            var data = json.RootElement.GetProperty("data");
            if (data.GetArrayLength() == 0) return (null, "Unavailable");
            var item = data[0];
            if (item.TryGetProperty("targetId", out var target) && (!target.TryGetInt64(out var targetId) || targetId != id)) return (null, "Unavailable");
            if (!item.TryGetProperty("state", out var stateValue) || stateValue.ValueKind != JsonValueKind.String) return (null, "Unavailable");
            var state = stateValue.GetString();
            if (state != "Completed") return (null, state is "Pending" or "Blocked" or "Error" ? state : "Unavailable");
            if (!item.TryGetProperty("imageUrl", out var image) || image.ValueKind != JsonValueKind.String) return (null, "Unavailable");
            if (!Uri.TryCreate(image.GetString(), UriKind.Absolute, out var uri) ||
                uri.Scheme != "https" || !uri.IsDefaultPort || uri.UserInfo.Length != 0 ||
                !uri.Host.EndsWith(".rbxcdn.com", StringComparison.OrdinalIgnoreCase))
                return (null, "Unavailable");
            using var download = await _http.GetAsync(uri, HttpCompletionOption.ResponseHeadersRead);
            if (!download.IsSuccessStatusCode || (download.Content.Headers.ContentLength is long length && length > 2_000_000)) return (null, "Unavailable");
            var mediaType = download.Content.Headers.ContentType?.MediaType;
            if (mediaType is not ("image/png" or "image/jpeg" or "image/webp")) return (null, "Unavailable");
            await using var stream = await download.Content.ReadAsStreamAsync();
            using var buffer = new MemoryStream();
            var bytes = new byte[8192];
            int count;
            while ((count = await stream.ReadAsync(bytes.AsMemory())) > 0)
            {
                if (buffer.Length + count > 2_000_000) return (null, "Unavailable");
                buffer.Write(bytes, 0, count);
            }
            if (buffer.Length == 0) return (null, "Unavailable");
            return ("data:" + mediaType + ";base64," + Convert.ToBase64String(buffer.ToArray()), "Completed");
        }
        catch (Exception ex) when (ex is HttpRequestException or TaskCanceledException or JsonException or InvalidOperationException or KeyNotFoundException or IOException)
        { return (null, "Unavailable"); }
    }
}
