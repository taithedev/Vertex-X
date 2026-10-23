using System;
using System.IO;
using System.Linq;
using System.Text;
namespace VertexX;
public sealed class VertexScriptLibrary
{
    public string DirectoryPath { get; }
    public VertexScriptLibrary(string path) { DirectoryPath = path; Directory.CreateDirectory(path); }
    public string Resolve(string name)
    {
        if (string.IsNullOrWhiteSpace(name) || name.Length > 180 || name != Path.GetFileName(name) ||
            name.IndexOfAny(new[] { '/', '\\', ':', '*', '?', '"', '<', '>', '|' }) >= 0 || name.Any(char.IsControl) ||
            name.EndsWith(' ') || name.EndsWith('.') || !new[] { ".lua", ".txt" }.Contains(Path.GetExtension(name).ToLowerInvariant()))
            throw new ArgumentException("Use a filename ending in .lua or .txt, without folders or special characters.");
        var stem = Path.GetFileNameWithoutExtension(name).Split('.')[0].ToUpperInvariant();
        if (new[] { "CON", "PRN", "AUX", "NUL", "COM1", "COM2", "COM3", "COM4", "COM5", "COM6", "COM7", "COM8", "COM9", "LPT1", "LPT2", "LPT3", "LPT4", "LPT5", "LPT6", "LPT7", "LPT8", "LPT9" }.Contains(stem))
            throw new ArgumentException("This filename is reserved by Windows.");
        return Path.Combine(DirectoryPath, name);
    }
    public string SaveCopy(string name, string content)
    {
        var path = Resolve(name);
        if (Encoding.UTF8.GetByteCount(content) > 1_000_000) throw new ArgumentException("Scripts must be smaller than 1 MB.");
        var temporary = Path.Combine(DirectoryPath, "." + Guid.NewGuid().ToString("N") + ".tmp");
        try
        {
            File.WriteAllText(temporary, content, new UTF8Encoding(false));
            File.Move(temporary, path, false);
        }
        catch (IOException) when (File.Exists(path)) { throw new IOException("A script with this name already exists. Choose another name, or open it and use Save."); }
        finally { if (File.Exists(temporary)) File.Delete(temporary); }
        return path;
    }
}
