using System.Net;
using System.Net.Http.Headers;
using System.Text;
using VertexX;

static HttpResponseMessage Json(string body, HttpStatusCode status = HttpStatusCode.OK) =>
    new(status) { Content = new StringContent(body, Encoding.UTF8, "application/json") };
static void Require(bool condition, string message) { if (!condition) throw new Exception(message); }
static HttpResponseMessage Reply(HttpRequestMessage request, string state = "Completed", string imageUrl = "https://tr.rbxcdn.com/test.png", bool detailsFail = false)
{
    var uri = request.RequestUri!;
    if (uri.AbsolutePath.EndsWith("/usernames/users"))
        return Json("{\"data\":[{\"id\":1,\"name\":\"Roblox\",\"displayName\":\"Roblox\"}]}");
    if (uri.Host == "users.roblox.com")
        return detailsFail ? Json("{}", HttpStatusCode.ServiceUnavailable) : Json("{\"description\":\"Public bio\",\"created\":\"2006-02-27T21:06:40Z\",\"hasVerifiedBadge\":true}");
    if (uri.Host == "thumbnails.roblox.com")
        return Json(System.Text.Json.JsonSerializer.Serialize(new { data = new[] { new { targetId = 1, state, imageUrl } } }));
    Require(uri.Host == "tr.rbxcdn.com", "Untrusted image host was requested");
    var image = new HttpResponseMessage(HttpStatusCode.OK) { Content = new ByteArrayContent(Convert.FromBase64String("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+ip1sAAAAASUVORK5CYII=")) };
    image.Content.Headers.ContentType = new MediaTypeHeaderValue("image/png");
    return image;
}
var handler = new FakeHandler(request => Reply(request));
using var http = new HttpClient(handler);
var service = new RobloxProfileService(http);
var profile = await service.LookupAsync("Roblox");
Require(profile.Id == 1 && profile.Description == "Public bio" && profile.HasVerifiedBadge, "Profile details missing");
Require(profile.AvatarDataUrl?.StartsWith("data:image/png;base64,") == true, "Avatar was not embedded");
var count = handler.Count;
await service.LookupAsync("ROBLOX");
Require(handler.Count == count, "Repeated lookup missed the cache");

foreach (var state in new[] { "Pending", "Blocked" })
{
    using var optionalHttp = new HttpClient(new FakeHandler(request => Reply(request, state)));
    var optional = await new RobloxProfileService(optionalHttp).LookupAsync("Roblox");
    Require(optional.Id == 1 && optional.AvatarDataUrl == null && optional.AvatarState == state, "Avatar state hid the profile");
}
using (var unsafeHttp = new HttpClient(new FakeHandler(request => Reply(request, imageUrl: "https://example.invalid/avatar.png"))))
{
    var unsafeProfile = await new RobloxProfileService(unsafeHttp).LookupAsync("Roblox");
    Require(unsafeProfile.AvatarDataUrl == null, "Untrusted thumbnail URL was accepted");
}
using (var unavailableHttp = new HttpClient(new FakeHandler(request => Reply(request, detailsFail: true))))
{
    var optional = await new RobloxProfileService(unavailableHttp).LookupAsync("Roblox");
    Require(optional.Id == 1 && optional.ProfileWarning != null, "Optional details failure hid the profile");
}
using (var limitedHttp = new HttpClient(new FakeHandler(_ => Json("{}", HttpStatusCode.TooManyRequests))))
{
    try { await new RobloxProfileService(limitedHttp).LookupAsync("Roblox"); throw new Exception("Rate limit was accepted"); }
    catch (HttpRequestException ex) { Require(ex.Message.Contains("rate limiting"), "Missing rate limit explanation"); }
}
try { await service.LookupAsync("../bad"); throw new Exception("Invalid username was accepted"); }
catch (ArgumentException) { }
Console.WriteLine("PASS: public profile/avatar, cache, pending/blocked avatar, untrusted URL, optional details failure, rate limit, input validation.");

sealed class FakeHandler(Func<HttpRequestMessage, HttpResponseMessage> reply) : HttpMessageHandler
{
    public int Count { get; private set; }
    protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken token)
    { Count++; return Task.FromResult(reply(request)); }
}
