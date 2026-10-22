using System.Windows;
namespace VertexX;
public partial class SettingsWindow : Window
{
    public Preferences Preferences { get; private set; }
    public SettingsWindow(Preferences current)
    {
        InitializeComponent();
        Preferences = new Preferences { FontSize = current.FontSize, WordWrap = current.WordWrap };
        FontSizeSlider.Value = Preferences.FontSize;
        WrapCheck.IsChecked = Preferences.WordWrap;
    }
    private void Apply_Click(object sender, RoutedEventArgs e)
    {
        Preferences.FontSize = FontSizeSlider.Value;
        Preferences.WordWrap = WrapCheck.IsChecked == true;
        DialogResult = true;
    }
}