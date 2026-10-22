using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text.Json;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Input;
using System.Windows.Media;
using Microsoft.Win32;
using MoonSharp.Interpreter;

namespace VertexX;

public partial class MainWindow : Window
{
    private readonly string _library = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.MyDocuments), "Vertex X", "Scripts");
    private readonly string _preferencesPath = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "VertexX", "settings.json");
    private readonly Dictionary<TabItem, string?> _paths = new();
    private Preferences _preferences = new();
    private readonly VertexAuthService _auth = new();
    private readonly VertexUpdateService _updates = new();

    public MainWindow()
    {
        InitializeComponent();
        Directory.CreateDirectory(_library);
        LoadPreferences();
        AddTab("Untitled.lua", "print('Welcome to Vertex X!')\n");
        RefreshLibrary();
        StatusText.Text = "Ready • Scripts: " + _library;
        Loaded += async (_, _) => await _updates.CheckAsync(this, true);
    }

    private TextBox? ActiveEditor => (EditorTabs.SelectedItem as TabItem)?.Content as TextBox;
    private TabItem? ActiveTab => EditorTabs.SelectedItem as TabItem;

    private void AddTab(string title, string content, string? path = null)
    {
        var editor = new TextBox {
            Text = content, AcceptsReturn = true, AcceptsTab = true,
            Background = Brushes.Transparent, Foreground = new SolidColorBrush(Color.FromRgb(232, 232, 237)),
            CaretBrush = Brushes.White, SelectionBrush = new SolidColorBrush(Color.FromRgb(85, 85, 105)),
            BorderThickness = new Thickness(0), FontFamily = new FontFamily("Consolas"),
            FontSize = _preferences.FontSize, TextWrapping = _preferences.WordWrap ? TextWrapping.Wrap : TextWrapping.NoWrap,
            VerticalScrollBarVisibility = ScrollBarVisibility.Auto, HorizontalScrollBarVisibility = ScrollBarVisibility.Auto,
            Padding = new Thickness(14), SpellCheck = { IsEnabled = false }
        };
        var tab = new TabItem { Header = title, Content = editor };
        _paths[tab] = path;
        editor.TextChanged += (_, _) => {
            if (tab.Header is string header && !header.EndsWith("*", StringComparison.Ordinal))
                tab.Header = header + "*";
            StatusText.Text = "Edited • " + title;
        };
        EditorTabs.Items.Add(tab);
        EditorTabs.SelectedItem = tab;
        editor.Focus();
    }

    private bool SaveTab(TabItem tab, bool saveAs = false)
    {
        if (tab.Content is not TextBox editor) return false;
        var path = _paths[tab];
        if (saveAs || string.IsNullOrEmpty(path))
        {
            var dialog = new SaveFileDialog {
                Filter = "Lua scripts (*.lua)|*.lua|Text files (*.txt)|*.txt",
                InitialDirectory = _library,
                FileName = (tab.Header?.ToString() ?? "Untitled.lua").TrimEnd('*')
            };
            if (dialog.ShowDialog(this) != true) return false;
            path = dialog.FileName;
        }
        try {
            File.WriteAllText(path!, editor.Text);
            _paths[tab] = path;
            tab.Header = Path.GetFileName(path);
            StatusText.Text = "Saved • " + path;
            RefreshLibrary();
            return true;
        } catch (Exception ex) {
            MessageBox.Show(this, ex.Message, "Save failed", MessageBoxButton.OK, MessageBoxImage.Error);
            return false;
        }
    }

    private void Account_Click(object sender, RoutedEventArgs e)
    {
        if (_auth.AccessToken != null)
        {
            if (MessageBox.Show(this, "Signed in as " + (_auth.Username ?? _auth.UserId) + ". Sign out?", "Vertex X Account",
                    MessageBoxButton.YesNo) == MessageBoxResult.Yes) { _auth.SignOut(); StatusText.Text = "Signed out"; }
            return;
        }
        var dialog = new AccountWindow(_auth) { Owner = this };
        if (dialog.ShowDialog() == true) StatusText.Text = "Connected to Zuzify Supabase • " + (_auth.Username ?? "Account");
    }
    private async void Updates_Click(object sender, RoutedEventArgs e) => await _updates.CheckAsync(this, false);
    private void Roblox_Click(object sender, RoutedEventArgs e) => new RobloxWindow { Owner = this }.ShowDialog();
    private void New_Click(object sender, RoutedEventArgs e) => AddTab("Untitled.lua", "");
    private void Save_Click(object sender, RoutedEventArgs e) { if (ActiveTab is { } tab) SaveTab(tab); }
    private void Open_Click(object sender, RoutedEventArgs e)
    {
        var dialog = new OpenFileDialog { Filter = "Lua scripts (*.lua)|*.lua|Text files (*.txt)|*.txt|All files (*.*)|*.*", Multiselect = true };
        if (dialog.ShowDialog(this) == true) foreach (var file in dialog.FileNames) OpenFile(file);
    }
    private void OpenFile(string path)
    {
        try {
            if (!File.Exists(path)) return;
            var existing = _paths.FirstOrDefault(p => string.Equals(p.Value, path, StringComparison.OrdinalIgnoreCase)).Key;
            if (existing != null) { EditorTabs.SelectedItem = existing; return; }
            AddTab(Path.GetFileName(path), File.ReadAllText(path), path);
        } catch (Exception ex) { MessageBox.Show(this, ex.Message, "Open failed", MessageBoxButton.OK, MessageBoxImage.Error); }
    }
    private void RefreshLibrary()
    {
        Directory.CreateDirectory(_library);
        LibraryList.ItemsSource = Directory.EnumerateFiles(_library, "*.lua").OrderBy(Path.GetFileName).ToArray();
    }
    private void Refresh_Click(object sender, RoutedEventArgs e) => RefreshLibrary();
    private void Library_DoubleClick(object sender, MouseButtonEventArgs e)
    {
        if (LibraryList.SelectedItem is string file) OpenFile(file);
    }
    private void Run_Click(object sender, RoutedEventArgs e)
    {
        if (ActiveEditor is not { } editor) return;
        ConsoleOutput.Clear();
        try {
            var script = new Script(CoreModules.Preset_HardSandbox);
            script.Options.DebugPrint = line => ConsoleOutput.AppendText(line + Environment.NewLine);
            var result = script.DoString(editor.Text);
            if (result.Type != DataType.Void && result.Type != DataType.Nil) ConsoleOutput.AppendText("Result: " + result + Environment.NewLine);
            StatusText.Text = "Finished • Local Lua runtime";
        } catch (Exception ex) {
            ConsoleOutput.AppendText("Error: " + ex.Message + Environment.NewLine);
            StatusText.Text = "Execution error";
        }
    }
    private void Clear_Click(object sender, RoutedEventArgs e) => ConsoleOutput.Clear();
    private void Tabs_SelectionChanged(object sender, SelectionChangedEventArgs e)
    {
        if (ActiveTab is { } tab) StatusText.Text = "Active • " + tab.Header;
    }
    private void Settings_Click(object sender, RoutedEventArgs e)
    {
        var options = new SettingsWindow(_preferences) { Owner = this };
        if (options.ShowDialog() != true) return;
        _preferences = options.Preferences;
        foreach (var editor in EditorTabs.Items.OfType<TabItem>().Select(t => t.Content).OfType<TextBox>()) {
            editor.FontSize = _preferences.FontSize;
            editor.TextWrapping = _preferences.WordWrap ? TextWrapping.Wrap : TextWrapping.NoWrap;
        }
        SavePreferences();
    }
    private void LoadPreferences()
    {
        try {
            if (File.Exists(_preferencesPath))
                _preferences = JsonSerializer.Deserialize<Preferences>(File.ReadAllText(_preferencesPath)) ?? new Preferences();
            _preferences.FontSize = Math.Clamp(_preferences.FontSize, 10, 28);
        } catch { _preferences = new Preferences(); }
    }
    private void SavePreferences()
    {
        try {
            Directory.CreateDirectory(Path.GetDirectoryName(_preferencesPath)!);
            File.WriteAllText(_preferencesPath, JsonSerializer.Serialize(_preferences, new JsonSerializerOptions { WriteIndented = true }));
        } catch (Exception ex) { MessageBox.Show(this, ex.Message, "Settings could not be saved"); }
    }
    private void Window_KeyDown(object sender, KeyEventArgs e)
    {
        if (e.Key == Key.F5) { Run_Click(sender, new RoutedEventArgs()); e.Handled = true; return; }
        if (Keyboard.Modifiers != ModifierKeys.Control) return;
        if (e.Key == Key.N) { New_Click(sender, new RoutedEventArgs()); e.Handled = true; }
        else if (e.Key == Key.O) { Open_Click(sender, new RoutedEventArgs()); e.Handled = true; }
        else if (e.Key == Key.S) { Save_Click(sender, new RoutedEventArgs()); e.Handled = true; }
        else if (e.Key == Key.W && ActiveTab is { } tab) {
            if (tab.Header?.ToString()?.EndsWith("*", StringComparison.Ordinal) == true &&
                MessageBox.Show(this, "Close tab with unsaved changes?", "Vertex X", MessageBoxButton.YesNo) != MessageBoxResult.Yes) return;
            _paths.Remove(tab); EditorTabs.Items.Remove(tab);
            if (EditorTabs.Items.Count == 0) AddTab("Untitled.lua", "");
            e.Handled = true;
        }
    }
    private void Window_Closing(object? sender, System.ComponentModel.CancelEventArgs e)
    {
        if (!EditorTabs.Items.OfType<TabItem>().Any(t => t.Header?.ToString()?.EndsWith("*", StringComparison.Ordinal) == true)) return;
        if (MessageBox.Show(this, "You have unsaved tabs. Exit anyway?", "Vertex X", MessageBoxButton.YesNo, MessageBoxImage.Warning) != MessageBoxResult.Yes)
            e.Cancel = true;
    }
}
public sealed class Preferences
{
    public double FontSize { get; set; } = 15;
    public bool WordWrap { get; set; }
}