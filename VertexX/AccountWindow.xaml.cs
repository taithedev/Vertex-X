using System;
using System.Windows;

namespace VertexX;
public partial class AccountWindow : Window
{
    private readonly VertexAuthService _auth;
    public AccountWindow(VertexAuthService auth) { InitializeComponent(); _auth = auth; }
    private async void SignIn_Click(object sender, RoutedEventArgs e)
    {
        SetBusy(true);
        try { ResultText.Text = await _auth.SignInAsync(EmailInput.Text, PasswordInput.Password); DialogResult = true; }
        catch (Exception ex) { ResultText.Text = ex.Message; }
        finally { SetBusy(false); }
    }
    private async void SignUp_Click(object sender, RoutedEventArgs e)
    {
        SetBusy(true);
        try { ResultText.Text = await _auth.SignUpAsync(UsernameInput.Text, EmailInput.Text, PasswordInput.Password);
            if (_auth.AccessToken != null) DialogResult = true;
        }
        catch (Exception ex) { ResultText.Text = ex.Message; }
        finally { SetBusy(false); }
    }
    private void SetBusy(bool busy) { SignInButton.IsEnabled = !busy; SignUpButton.IsEnabled = !busy; }
}