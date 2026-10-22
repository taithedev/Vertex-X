using System.Windows;
namespace VertexX;
public partial class SettingsWindow : Window
{
    public Preferences Preferences { get; private set; }
    public SettingsWindow(Preferences current)
    {
        InitializeComponent();
        Preferences = new Preferences { FontSize = current.FontSize, WordWrap = current.WordWrap, AutoUpdateEnabled = current.AutoUpdateEnabled };
        FontSizeSlider.Value = Preferences.FontSize;
        WrapCheck.IsChecked = Preferences.WordWrap;
        AutoUpdateCheck.IsChecked = Preferences.AutoUpdateEnabled;
    }
    private void Apply_Click(object sender, RoutedEventArgs e)
    {
        Preferences.FontSize = FontSizeSlider.Value;
        Preferences.WordWrap = WrapCheck.IsChecked == true;
        Preferences.AutoUpdateEnabled = AutoUpdateCheck.IsChecked == true;
        DialogResult = true;
    }
}