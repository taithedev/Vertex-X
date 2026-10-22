using System.Net;
using System.Text;
using VertexX;

static void Check(bool value, string message) { if (!value) throw new Exception(message); }
const string user = "{\"id\":\"00000000-0000-0000-0000-000000000001\",\"user_metadata\":{\"vertexx_username\":\"tester\"}}";
const string session = "{\"access_token\":\"test-token\",\"user\":" + user + "}";
var handler = new Replies();
var auth = new VertexAuthService(new HttpClient(handler));
handler.Enqueue(HttpStatusCode.OK, user);
Check((await auth.SignUpAsync("tester", "test@example.com", "password123")).Contains("Verify"), "Confirmation signup response");
Check(auth.AccessToken == null, "Confirmation signup must not authenticate");
handler.Enqueue(HttpStatusCode.OK, session);
handler.Enqueue(HttpStatusCode.NoContent, "");
await auth.SignInAsync("test@example.com", "password123");
Check(auth.Username == "tester" && auth.AccessToken == "test-token", "Empty profile success response");
auth.SignOut();
handler.Enqueue(HttpStatusCode.OK, session);
handler.Enqueue(HttpStatusCode.Created, "");
await auth.SignUpAsync("tester", "test@example.com", "password123");
Check(auth.AccessToken != null, "Immediate signup session");
handler.Enqueue(HttpStatusCode.OK, session);
handler.Enqueue(HttpStatusCode.Conflict, "{\"message\":\"Username already exists\"}");
try { await auth.SignInAsync("test@example.com", "password123"); throw new Exception("Expected conflict"); }
catch (InvalidOperationException ex) { Check(ex.Message.Contains("Username"), "Readable profile error"); }
Check(auth.AccessToken == null && auth.UserId == null && auth.Username == null, "Failed profile cannot leave partial session");
handler.Enqueue(HttpStatusCode.BadRequest, "{\"error_description\":\"Invalid login credentials\"}");
try { await auth.SignInAsync("test@example.com", "incorrect"); throw new Exception("Expected rejection"); }
catch (InvalidOperationException ex) { Check(ex.Message.Contains("Invalid login"), "Readable login error"); }
Check(auth.AccessToken == null, "Rejected login must remain signed out");
Check(handler.Count == 0, "All expected requests were sent");
Console.WriteLine("PASS: confirmation signup, immediate signup, empty profile responses, conflict rollback, rejected login.");

sealed class Replies : HttpMessageHandler
{
    readonly Queue<(HttpStatusCode Status, string Body)> replies = new();
    public int Count => replies.Count;
    public void Enqueue(HttpStatusCode status, string body) => replies.Enqueue((status, body));
    protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
    {
        var reply = replies.Dequeue();
        return Task.FromResult(new HttpResponseMessage(reply.Status) { Content = new StringContent(reply.Body, Encoding.UTF8, "application/json") });
    }
}
