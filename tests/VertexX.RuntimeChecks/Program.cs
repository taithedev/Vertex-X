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
var streamed = new System.Text.StringBuilder();
var streamedResult = VertexLuaRuntime.Run("for i=1,1000 do print(i) end; return 'done'", CancellationToken.None, onOutput: text => streamed.Append(text));
if (streamed.ToString() != streamedResult.Output) throw new Exception("Streamed output differs from final output.");
streamed.Clear();
var cappedStream = VertexLuaRuntime.Run("for i=1,10000 do print(string.rep('x',100)) end", CancellationToken.None, onOutput: text => streamed.Append(text));
if (streamed.Length > 100000 || streamed.ToString() != cappedStream.Output) throw new Exception("Stream cap failed.");
streamed.Clear();
try { VertexLuaRuntime.Run("print('stream-before-error'); error('fail')", CancellationToken.None, onOutput: text => streamed.Append(text)); }
catch (ScriptRuntimeException) { }
if (!streamed.ToString().Contains("stream-before-error")) throw new Exception("Stream before error was lost.");
Console.WriteLine("PASS: streamed output, return values, capped stream and output before failure.");
Console.WriteLine("PASS: Lua output/returns, endless-loop time limit, cancellation before and during execution, output cap, syntax errors, output before failure.");
