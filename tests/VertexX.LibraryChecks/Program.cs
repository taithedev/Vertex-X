using VertexX;
var folder = Path.Combine(Path.GetTempPath(), "vertex-library-check-" + Guid.NewGuid());
try {
 var library = new VertexScriptLibrary(folder);
 var path = library.SaveCopy("hello.lua", "print('hello')");
 if (File.ReadAllText(path) != "print('hello')") throw new Exception("Saved content differs.");
 try { library.SaveCopy("hello.lua", "overwrite"); throw new Exception("Duplicate was overwritten."); } catch (IOException) { }
 if (File.ReadAllText(path) != "print('hello')") throw new Exception("Existing script changed.");
 foreach (var name in new[] { "../escape.lua", @"..\escape.lua", "CON.lua", "aux.test.lua", "bad.exe", "bad:stream.lua", "bad?.lua", "bad.lua ", "LPT1.lua" }) {
  try { library.SaveCopy(name, "bad"); throw new Exception("Unsafe name accepted: " + name); } catch (ArgumentException) { }
 }
 try { library.SaveCopy("large.lua", new string('x', 1_000_001)); throw new Exception("Large file accepted."); } catch (ArgumentException) { }
 var unicode = library.SaveCopy("unicode.lua", "print('こんにちは')");
 if (!File.ReadAllText(unicode).Contains("こんにちは")) throw new Exception("Unicode lost.");
 if (Directory.EnumerateFiles(folder, "*.tmp").Any()) throw new Exception("Temporary files leaked.");
 Console.WriteLine("PASS: library save/read, duplicate preservation, filename validation, size cap, UTF-8 and temp cleanup.");
} finally { Directory.Delete(folder, true); }
