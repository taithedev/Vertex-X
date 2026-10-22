using VertexX;
using MoonSharp.Interpreter;
var result = VertexLuaRuntime.Run("print('hello'); return 2+3", CancellationToken.None);
if (!result.Output.Contains("hello") || !result.Output.Contains("5")) throw new Exception("Output/return value failed.");
try { VertexLuaRuntime.Run("while true do end", CancellationToken.None, TimeSpan.FromMilliseconds(50)); throw new Exception("Infinite loop was not stopped."); } catch (TimeoutException) { }
using var stop = new CancellationTokenSource();
stop.Cancel();
try { VertexLuaRuntime.Run("return 1", stop.Token); throw new Exception("Cancelled script ran."); } catch (OperationCanceledException) { }
var noisy = VertexLuaRuntime.Run("for i=1,10000 do print(string.rep('a',100)) end", CancellationToken.None);
if (!noisy.Truncated || noisy.Output.Length > 100000) throw new Exception("Output limit failed.");
try { VertexLuaRuntime.Run("function broken(", CancellationToken.None); throw new Exception("Syntax error was accepted."); } catch (SyntaxErrorException) { }
try { VertexLuaRuntime.Run("print('before-error'); error('failed')", CancellationToken.None); throw new Exception("Runtime error was accepted."); }
catch (ScriptRuntimeException ex) { if (!(ex.Data["VertexX.Output"] as string ?? "").Contains("before-error")) throw new Exception("Output before error was lost."); }
using var midRun = new CancellationTokenSource();
var task = Task.Run(() => VertexLuaRuntime.Run("while true do end", midRun.Token));
midRun.CancelAfter(75);
try { await task; throw new Exception("Running script was not cancelled."); } catch (OperationCanceledException) { }
Console.WriteLine("PASS: Lua output/returns, endless-loop time limit, cancellation before and during execution, output cap, syntax errors, output before failure.");
