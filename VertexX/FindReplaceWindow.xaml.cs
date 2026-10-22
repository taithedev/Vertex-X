using System;
using System.Text;
using System.Windows;
using System.Windows.Controls;

namespace VertexX;

public partial class FindReplaceWindow : Window
{
    private readonly TextBox _editor;

    public FindReplaceWindow(TextBox editor)
    {
        InitializeComponent();
        _editor = editor;
        FindInput.Text = editor.SelectedText.Length > 0 && editor.SelectedText.Length < 150
            ? editor.SelectedText : "";
        FindInput.Focus();
        FindInput.SelectAll();
    }

    private StringComparison Comparison => MatchCaseCheck.IsChecked == true
        ? StringComparison.Ordinal : StringComparison.OrdinalIgnoreCase;

    private bool FindNext()
    {
        var target = FindInput.Text;
        if (string.IsNullOrEmpty(target))
        {
            ResultText.Text = "Enter text to find.";
            return false;
        }
        var start = _editor.SelectionStart + _editor.SelectionLength;
        var index = _editor.Text.IndexOf(target, Math.Min(start, _editor.Text.Length), Comparison);
        if (index < 0)
            index = _editor.Text.IndexOf(target, 0, Comparison);
        if (index < 0)
        {
            ResultText.Text = "No matches found.";
            return false;
        }
        _editor.Select(index, target.Length);
        _editor.Focus();
        ResultText.Text = "Match selected.";
        return true;
    }

    private void FindNext_Click(object sender, RoutedEventArgs e) => FindNext();

    private void Replace_Click(object sender, RoutedEventArgs e)
    {
        var term = FindInput.Text;
        if (string.IsNullOrEmpty(term)) { ResultText.Text = "Enter text to find."; return; }
        var selection = _editor.SelectedText;
        if (selection.Equals(term, Comparison))
        {
            _editor.SelectedText = ReplaceInput.Text;
            ResultText.Text = "One match replaced.";
        }
        else if (FindNext())
        {
            _editor.SelectedText = ReplaceInput.Text;
            ResultText.Text = "One match replaced.";
        }
    }

    private void ReplaceAll_Click(object sender, RoutedEventArgs e)
    {
        var term = FindInput.Text;
        if (string.IsNullOrEmpty(term)) { ResultText.Text = "Enter text to find."; return; }
        var source = _editor.Text;
        var builder = new StringBuilder(source.Length);
        var start = 0;
        var count = 0;
        while (start < source.Length)
        {
            var index = source.IndexOf(term, start, Comparison);
            if (index < 0) break;
            builder.Append(source, start, index - start).Append(ReplaceInput.Text);
            count++;
            start = index + term.Length;
        }
        builder.Append(source, start, source.Length - start);
        if (count != 0) _editor.Text = builder.ToString();
        ResultText.Text = count + " match(es) replaced.";
    }
}