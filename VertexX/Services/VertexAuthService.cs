using System;
using System.Net;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using System.Text.RegularExpressions;
using System.Threading.Tasks;

namespace VertexX;

// Publishable key is permitted in native clients. Never place a Supabase secret/service-role key here.
public sealed class VertexAuthService
{
    private const string BaseUrl = "https://wfqudstuncdldsvxqveu.supabase.co";
    private const string PublishableKey = "sb_publishable_LsAzcgmeAp3fBCtdU6eQzw_u5PPJjar";
    private static readonly HttpClient DefaultClient = new() { Timeout = TimeSpan.FromSeconds(20) };
    private readonly HttpClient Client;
    public VertexAuthService() : this(DefaultClient) { }
    internal VertexAuthService(HttpClient client) { Client = client; }
    public string? AccessToken { get; private set; }
    public string? UserId { get; private set; }
    public string? Username { get; private set; }

    private static HttpRequestMessage Request(HttpMethod method, string path, string? token = null)
    {
        var message = new HttpRequestMessage(method, BaseUrl + path);
        message.Headers.TryAddWithoutValidation("apikey", PublishableKey);
        if (!string.IsNullOrEmpty(token)) message.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
        return message;
    }

    private async Task<JsonDocument> SendAsync(HttpRequestMessage request)
    {
        using (request)
        using (var response = await Client.SendAsync(request))
        {
            var body = await response.Content.ReadAsStringAsync();
            if (!response.IsSuccessStatusCode)
            {
                var error = "The account service returned " + (int)response.StatusCode;
                try { using var json = JsonDocument.Parse(body);
                    if (json.RootElement.TryGetProperty("msg", out var msg)) error = msg.GetString() ?? error;
                    if (json.RootElement.TryGetProperty("error_description", out var detail)) error = detail.GetString() ?? error;
                    if (json.RootElement.TryGetProperty("message", out var message)) error = message.GetString() ?? error;
                } catch { }
                throw new InvalidOperationException(error);
            }
            // PostgREST return=minimal succeeds with an empty body (201/204).
            return JsonDocument.Parse(string.IsNullOrWhiteSpace(body) ? "{}" : body);
        }
    }

    public async Task<string> SignUpAsync(string username, string email, string password)
    {
        username = username.Trim();
        if (!Regex.IsMatch(username, "^[A-Za-z0-9_]{3,20}$"))
            throw new ArgumentException("Username must be 3–20 letters, numbers, or underscores.");
        if (password.Length < 8) throw new ArgumentException("Password must be at least 8 characters.");
        using var request = Request(HttpMethod.Post, "/auth/v1/signup");
        request.Content = new StringContent(JsonSerializer.Serialize(new {
            email = email.Trim(), password,
            data = new { vertexx_username = username }
        }), Encoding.UTF8, "application/json");
        using var result = await SendAsync(request);
        var root = result.RootElement;
        // Confirmation-required signup returns the user directly; an immediate
        // session returns { user, access_token, ... }.
        var user = root.TryGetProperty("user", out var nestedUser) ? nestedUser : root;
        if (user.ValueKind != JsonValueKind.Object || !user.TryGetProperty("id", out _))
            throw new InvalidOperationException("Signup did not return a user.");
        if (root.TryGetProperty("access_token", out var token) && token.ValueKind == JsonValueKind.String)
        {
            AccessToken = token.GetString();
            UserId = user.GetProperty("id").GetString();
            Username = username;
            try { await EnsureProfileAsync(username); }
            catch { SignOut(); throw; }
            return "Account created and signed in.";
        }
        return "Account registered. Verify your email, then sign in to complete your profile.";
    }

    public async Task<string> SignInAsync(string email, string password)
    {
        SignOut();
        using var request = Request(HttpMethod.Post, "/auth/v1/token?grant_type=password");
        request.Content = new StringContent(JsonSerializer.Serialize(new { email = email.Trim(), password }), Encoding.UTF8, "application/json");
        using var result = await SendAsync(request);
        var root = result.RootElement;
        AccessToken = root.GetProperty("access_token").GetString();
        var user = root.GetProperty("user");
        UserId = user.GetProperty("id").GetString();
        if (user.TryGetProperty("user_metadata", out var meta) && meta.TryGetProperty("vertexx_username", out var name))
            Username = name.GetString();
        try
        {
            if (!string.IsNullOrWhiteSpace(Username)) await EnsureProfileAsync(Username);
        }
        catch { SignOut(); throw; }
        return "Signed in as " + (Username ?? email);
    }

    private async Task EnsureProfileAsync(string username)
    {
        if (AccessToken == null || UserId == null) return;
        using var request = Request(HttpMethod.Post, "/rest/v1/vertexx_profiles?on_conflict=user_id", AccessToken);
        request.Headers.TryAddWithoutValidation("Prefer", "resolution=merge-duplicates,return=minimal");
        request.Content = new StringContent(JsonSerializer.Serialize(new { user_id = UserId, username }), Encoding.UTF8, "application/json");
        using var _ = await SendAsync(request);
    }

    public void SignOut()
    {
        // Access token is deliberately memory-only and not persisted to disk.
        AccessToken = null;
        UserId = null;
        Username = null;
    }
}
