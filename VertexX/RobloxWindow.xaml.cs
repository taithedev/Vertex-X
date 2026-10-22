using System;
using System.Diagnostics;
using System.Net.Http;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;
using System.Windows;

namespace VertexX;
public partial class RobloxWindow : Window
{
    private static readonly HttpClient Http = new() { Timeout = TimeSpan.FromSeconds(12) };
    public RobloxWindow() { InitializeComponent(); }
    private async void Lookup_Click(object sender, RoutedEventArgs e)
    {
        var username = UsernameInput.Text.Trim();
        if (username.Length == 0 || username.Length > 20) { ResultText.Text = "Enter a Roblox username."; return; }
        LookupButton.IsEnabled = false;
        try {
            var payload = JsonSerializer.Serialize(new { usernames = new[] { username }, excludeBannedUsers = true });
            using var content = new StringContent(payload, Encoding.UTF8, "application/json");
            using var response = await Http.PostAsync("https://users.roblox.com/v1/usernames/users", content);
            response.EnsureSuccessStatusCode();
            using var json = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
            var data = json.RootElement.GetProperty("data");
            if (data.GetArrayLength() == 0) { ResultText.Text = "No matching Roblox account found."; return; }
            var user = data[0];
            var id = user.GetProperty("id").GetInt64();
            var name = user.GetProperty("name").GetString();
            ResultText.Text = "Public Roblox profile: " + name + " (ID " + id + "). This does NOT verify account ownership.";
            var url = "https://www.roblox.com/users/" + id + "/profile";
            ProfileButton.IsEnabled = true;
            ProfileButton.Tag = url;
        } catch (Exception ex) { ResultText.Text = "Profile lookup unavailable: " + ex.Message; }
        finally { LookupButton.IsEnabled = true; }
    }
    private void Profile_Click(object sender, RoutedEventArgs e)
    {
        if (ProfileButton.Tag is string url)
            Process.Start(new ProcessStartInfo(url) { UseShellExecute = true });
    }
}