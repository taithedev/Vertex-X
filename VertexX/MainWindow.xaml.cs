using System;
using System.IO;
using System.Windows;
using Microsoft.Win32;
using MoonSharp.Interpreter;
namespace VertexX;
public partial class MainWindow : Window
{
    public MainWindow() => InitializeComponent();
    private void Run_Click(object sender, RoutedEventArgs e)
    {
        ConsoleOutput.Clear();
        try
        {
            var script = new Script(CoreModules.Preset_HardSandbox);
            script.Options.DebugPrint = s => Dispatcher.Invoke(() => ConsoleOutput.AppendText(s + Environment.NewLine));
            script.DoString(Editor.Text);
        }
        catch (Exception ex) { ConsoleOutput.AppendText("Error: " + ex.Message); }
    }
    private void Open_Click(object sender, RoutedEventArgs e)
    {
        var dialog = new OpenFileDialog { Filter = "Lua files (*.lua)|*.lua|Text files (*.txt)|*.txt" };
        if (dialog.ShowDialog() == true) Editor.Text = File.ReadAllText(dialog.FileName);
    }
    private void Save_Click(object sender, RoutedEventArgs e)
    {
        var dialog = new SaveFileDialog { Filter = "Lua files (*.lua)|*.lua", FileName = "script.lua" };
        if (dialog.ShowDialog() == true) File.WriteAllText(dialog.FileName, Editor.Text);
    }
    private void Clear_Click(object sender, RoutedEventArgs e) => ConsoleOutput.Clear();
}