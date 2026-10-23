using System;
using System.Collections.Generic;
using System.ComponentModel;
using System.Diagnostics;
using System.IO;
using System.Linq;
using System.Text;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using System.Windows;
using System.Windows.Threading;
using Microsoft.Web.WebView2.Core;
using Microsoft.Win32;
namespace VertexX;

public partial class MainWindow : Window
{
    private const string Origin = "https://vertexx.local";
    private static readonly JsonSerializerOptions Json = new() { PropertyNamingPolicy = JsonNamingPolicy.CamelCase, PropertyNameCaseInsensitive = true, WriteIndented = true };
    private readonly string _data = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "VertexX");
    private readonly string _library = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.MyDocuments), "Vertex X", "Scripts");
    private readonly VertexAuthService _auth = new();
    private readonly RobloxProfileService _roblox = new();
    private readonly VertexUpdateService _updates = new();
    private readonly DispatcherTimer _timer = new() { Interval = TimeSpan.FromHours(4) };
    private readonly SemaphoreSlim _accountGate = new(1, 1);
    private readonly SemaphoreSlim _fileGate = new(1, 1);
    private Dictionary<string, string> _paths = new();
    private Preferences _preferences = new();
    private CancellationTokenSource? _execution;
    private bool _allowClose;
    private bool _ready;
    private bool _closed;
    private bool _initializing;
    private bool _configured;
    private bool _closeRequested;

    public MainWindow()
    {
        InitializeComponent();
        Title = "Vertex X " + VertexUpdateService.CurrentVersion;
        _timer.Tick += async (_, _) => await AutomaticUpdateAsync();
    }
    private async void Window_Loaded(object sender, RoutedEventArgs e) => await InitializeAsync();
    private async void Retry_Click(object sender, RoutedEventArgs e) => await InitializeAsync();
    private async Task InitializeAsync()
    {
        if (_initializing || _ready) return;
        _initializing = true;
        RetryButton.Visibility = Visibility.Collapsed;
        try
        {
            Directory.CreateDirectory(_data);
            Directory.CreateDirectory(_library);
            try { _preferences = JsonSerializer.Deserialize<Preferences>(File.ReadAllText(Path.Combine(_data, "settings.json")), Json) ?? new(); } catch { }
            try { _paths = JsonSerializer.Deserialize<Dictionary<string, string>>(File.ReadAllText(Path.Combine(_data, "documents.json"))) ?? new(); } catch { }
            _preferences.FontSize = double.IsFinite(_preferences.FontSize) ? Math.Clamp(_preferences.FontSize, 10, 24) : 14;
            if (Web.CoreWebView2 == null)
            {
                var environment = await CoreWebView2Environment.CreateAsync(userDataFolder: Path.Combine(_data, "WebView2"));
                await Web.EnsureCoreWebView2Async(environment);
            }
            var core = Web.CoreWebView2 ?? throw new InvalidOperationException("The WebView2 runtime did not initialize.");
            core.Settings.AreHostObjectsAllowed = false;
            core.Settings.AreDefaultContextMenusEnabled = false;
            core.Settings.AreDevToolsEnabled = false;
            core.Settings.IsStatusBarEnabled = false;
            core.Settings.AreDefaultScriptDialogsEnabled = false;
            core.SetVirtualHostNameToFolderMapping("vertexx.local", Path.Combine(AppContext.BaseDirectory, "ui"), CoreWebView2HostResourceAccessKind.DenyCors);
            if (!_configured)
            {
            core.NavigationStarting += (_, args) => { if (!IsTrusted(args.Uri)) args.Cancel = true; };
            core.NewWindowRequested += (_, args) => args.Handled = true;
            core.PermissionRequested += (_, args) => args.State = CoreWebView2PermissionState.Deny;
            core.DownloadStarting += (_, args) => args.Cancel = true;
            core.WebMessageReceived += WebMessageReceived;
            core.NavigationCompleted += (_, args) =>
            {
                if (!args.IsSuccess) { StartupPanel.Visibility = Visibility.Visible; RetryButton.Visibility = Visibility.Visible; StartupMessage.Text = "The interface could not load. Run setup again to repair the local UI files."; return; }
                Web.Visibility = Visibility.Visible;
                StartupPanel.Visibility = Visibility.Collapsed;
            };
            _configured = true;
            }
            if (!File.Exists(Path.Combine(AppContext.BaseDirectory, "ui", "index.html"))) throw new FileNotFoundException("The React UI files are missing. Reinstall Vertex X.");
            core.Navigate(Origin + "/index.html");
        }
        catch (Exception ex)
        {
            StartupMessage.Text = "Vertex X could not start its interface. Run setup again to install or repair Microsoft WebView2. Internet is required if the runtime is missing.\n\n" + ex.Message;
            RetryButton.Visibility = Visibility.Visible;
        }
        finally { _initializing = false; }
    }
    private static bool IsTrusted(string uri) => Uri.TryCreate(uri, UriKind.Absolute, out var value) && value.Scheme == "https" && value.Host == "vertexx.local" && value.IsDefaultPort;
    private void Send(object data)
    {
        if (_closed) return;
        if (Web.CoreWebView2 != null && IsTrusted(Web.Source?.AbsoluteUri ?? ""))
            Web.CoreWebView2.PostWebMessageAsJson(JsonSerializer.Serialize(data, Json));
    }
    private async void WebMessageReceived(object? sender, CoreWebView2WebMessageReceivedEventArgs args)
    {
        if (!IsTrusted(args.Source)) return;
        string? id = null;
        try
        {
            if (args.WebMessageAsJson.Length > 7_000_000) throw new ArgumentException("Request is too large.");
            using var doc = JsonDocument.Parse(args.WebMessageAsJson);
            var root = doc.RootElement;
            id = root.GetProperty("id").GetString();
            if (id == null || id.Length > 80) throw new ArgumentException("Invalid request ID.");
            var method = root.GetProperty("method").GetString();
            var payload = root.TryGetProperty("payload", out var p) ? p : default;
            var result = await HandleAsync(method ?? "", payload);
            Send(new { id, ok = true, result });
        }
        catch (Exception ex) { Send(new { id, ok = false, error = ex is OperationCanceledException ? "Execution stopped." : ex.Message, output = ex.Data["VertexX.Output"] as string }); }
    }
    private static string Text(JsonElement p, string name, int limit = 1_000_000)
    {
        if (p.ValueKind != JsonValueKind.Object || !p.TryGetProperty(name, out var field) || field.ValueKind != JsonValueKind.String) throw new ArgumentException("Missing " + name + ".");
        var text = field.GetString() ?? "";
        if (text.Length > limit) throw new ArgumentException(name + " is too long.");
        return text;
    }
    private object Account() => new { signedIn = _auth.AccessToken != null, username = _auth.Username, userId = _auth.UserId };
    private object Document(string path)
    {
        var info = new FileInfo(path);
        if (info.Length > 1_000_000) throw new IOException("Files must be smaller than 1 MB.");
        var id = _paths.FirstOrDefault(p => string.Equals(p.Value, path, StringComparison.OrdinalIgnoreCase)).Key ?? Guid.NewGuid().ToString();
        _paths[id] = path;
        PersistPaths();
        return new { id, name = Path.GetFileName(path), content = File.ReadAllText(path), saved = true };
    }
    private void PersistPaths() => AtomicWrite(Path.Combine(_data, "documents.json"), JsonSerializer.Serialize(_paths));
    private static void AtomicWrite(string path, string content)
    {
        var temporary = path + ".tmp";
        File.WriteAllText(temporary, content, new UTF8Encoding(false));
        File.Move(temporary, path, true);
    }
    private object Library() => Directory.EnumerateFiles(_library).Where(p => new[] { ".lua", ".txt" }.Contains(Path.GetExtension(p).ToLowerInvariant())).OrderBy(Path.GetFileName).Select(p => new { name = Path.GetFileName(p), size = new FileInfo(p).Length }).ToArray();
    private async Task<object?> HandleAsync(string method, JsonElement p)
    {
        switch (method)
        {
            case "app.ready":
                _ready = true;
                _closeRequested = false;
                _timer.Start();
                _ = AutomaticUpdateAsync();
                return new { version = VertexUpdateService.CurrentVersion, preferences = _preferences, account = Account(), library = Library() };
            case "app.close": _allowClose = true; Close(); return null;
            case "app.cancelClose": _closeRequested = false; return null;
            case "files.list": return Library();
            case "files.folder": Process.Start(new ProcessStartInfo("explorer.exe", "\"" + _library + "\"") { UseShellExecute = true }); return null;
            case "files.open":
            case "files.library":
            case "files.save":
            {
                if (!await _fileGate.WaitAsync(0)) throw new InvalidOperationException("Finish the current file dialog first.");
                try
                {
                    if (method == "files.open")
                    {
                        var dialog = new OpenFileDialog { Filter = "Scripts (*.lua;*.txt)|*.lua;*.txt", Multiselect = true, InitialDirectory = _library };
                        return dialog.ShowDialog(this) == true ? dialog.FileNames.Select(Document).ToArray() : Array.Empty<object>();
                    }
                    if (method == "files.library")
                    {
                        var name = Text(p, "name", 255);
                        if (name != Path.GetFileName(name) || name.IndexOfAny(Path.GetInvalidFileNameChars()) >= 0) throw new ArgumentException("Invalid filename.");
                        return Document(Path.Combine(_library, name));
                    }
                    var id = Text(p, "id", 80);
                    if (!Guid.TryParse(id, out _)) throw new ArgumentException("Invalid document.");
                    var content = Text(p, "content");
                    _paths.TryGetValue(id, out var path);
                    var saveAs = p.TryGetProperty("saveAs", out var sa) && sa.ValueKind == JsonValueKind.True;
                    if (path == null || saveAs)
                    {
                        var name = Path.GetFileName(Text(p, "name", 255));
                        var dialog = new SaveFileDialog { Filter = "Lua script (*.lua)|*.lua|Text file (*.txt)|*.txt", FileName = name, InitialDirectory = _library, AddExtension = true, DefaultExt = ".lua" };
                        if (dialog.ShowDialog(this) != true) return null;
                        path = dialog.FileName;
                    }
                    AtomicWrite(path, content);
                    _paths[id] = path;
                    PersistPaths();
                    return new { id, name = Path.GetFileName(path), content, saved = true };
                }
                finally { _fileGate.Release(); }
            }
            case "lua.run":
            {
                if (_execution != null) throw new InvalidOperationException("A script is already running.");
                var code = Text(p, "code");
                using var cancellation = new CancellationTokenSource();
                _execution = cancellation;
                try { return await Task.Run(() => VertexLuaRuntime.Run(code, cancellation.Token)); }
                finally { _execution = null; }
            }
            case "lua.stop": _execution?.Cancel(); return null;
            case "settings.save":
                var prefs = p.Deserialize<Preferences>(Json) ?? throw new ArgumentException("Invalid preferences.");
                prefs.FontSize = double.IsFinite(prefs.FontSize) ? Math.Clamp(prefs.FontSize, 10, 24) : 14;
                if (prefs.Accent is not ("violet" or "mint" or "ice")) prefs.Accent = "violet";
                AtomicWrite(Path.Combine(_data, "settings.json"), JsonSerializer.Serialize(prefs, Json));
                _preferences = prefs;
                return _preferences;
            case "auth.login":
            case "auth.signup":
            case "auth.logout":
            {
                if (!await _accountGate.WaitAsync(0)) throw new InvalidOperationException("An account request is already running.");
                try
                {
                    if (method == "auth.logout") { _auth.SignOut(); return new { message = "Signed out.", account = Account() }; }
                    var email = Text(p, "email", 254);
                    var password = Text(p, "password", 1024);
                    var message = method == "auth.login" ? await _auth.SignInAsync(email, password) : await _auth.SignUpAsync(Text(p, "username", 20), email, password);
                    return new { message, account = Account() };
                }
                finally { _accountGate.Release(); }
            }
            case "updates.check":
                await _updates.CheckAsync(this, quietWhenCurrent: true, automatic: true);
                return UpdateState();
            case "updates.page": Process.Start(new ProcessStartInfo("https://github.com/taithedev/Vertex-X/releases") { UseShellExecute = true }); return null;
            case "performance.gamebar":
                Process.Start(new ProcessStartInfo("ms-gamebar:") { UseShellExecute = true }); return null;
            case "performance.settings":
                Process.Start(new ProcessStartInfo("ms-settings:gaming-gamebar") { UseShellExecute = true }); return null;
            case "roblox.lookup":
                return await _roblox.LookupAsync(Text(p, "username", 20));
            case "roblox.open":
                var userId = p.GetProperty("id").GetInt64();
                if (userId <= 0) throw new ArgumentException("Invalid profile ID.");
                Process.Start(new ProcessStartInfo("https://www.roblox.com/users/" + userId + "/profile") { UseShellExecute = true }); return null;
            default: throw new ArgumentException("Unknown application command.");
        }
    }
    private object UpdateState() => new { version = VertexUpdateService.CurrentVersion, pendingVersion = _updates.PendingVersion, message = _updates.StatusMessage, hasError = _updates.HasError };
    private async Task AutomaticUpdateAsync()
    {
        if (!_ready || !_preferences.AutoUpdateEnabled || _updates.PendingVersion != null) return;
        await _updates.CheckAsync(this, quietWhenCurrent: true, automatic: true);
        Send(new { type = "updates", data = UpdateState() });
    }
    private void Window_Closing(object? sender, CancelEventArgs e)
    {
        if (_ready && !_allowClose)
        {
            e.Cancel = true;
            if (!_closeRequested) { _closeRequested = true; Send(new { type = "request-close" }); }
            return;
        }
        _execution?.Cancel();
        _timer.Stop();
        if (_updates.PendingVersion != null && !_updates.InstallPendingOnExit())
            MessageBox.Show(this, "The update could not start. Your current version remains installed. Use Updates to retry.", "Vertex X Updates");
        _ready = false;
        _closed = true;
        Web.Dispose();
    }
}
public sealed class Preferences
{
    public double FontSize { get; set; } = 14;
    public bool WordWrap { get; set; }
    public bool AutoUpdateEnabled { get; set; } = true;
    public string Accent { get; set; } = "violet";
}
