using System;
using System.Diagnostics;
using System.Text;
using System.Threading;
using MoonSharp.Interpreter;
namespace VertexX;
public sealed record LuaRunResult(string Output, long ElapsedMs, bool Truncated);
public static class VertexLuaRuntime
{
    public static LuaRunResult Run(string code, CancellationToken cancellationToken, TimeSpan? timeout = null, Action<string>? onOutput = null)
    {
        if (code.Length > 1_000_000) throw new ArgumentException("Scripts must be smaller than 1 MB.");
        var clock = Stopwatch.StartNew();
        var output = new StringBuilder();
        var truncated = false;
        var sent = 0;
        long lastOutput = 0;
        void Flush(bool force = false)
        {
            if (onOutput == null || output.Length == sent || (!force && clock.ElapsedMilliseconds - lastOutput < 50)) return;
            onOutput(output.ToString(sent, output.Length - sent));
            sent = output.Length;
            lastOutput = clock.ElapsedMilliseconds;
        }
        var limit = timeout ?? TimeSpan.FromSeconds(5);
        var script = new Script(CoreModules.Preset_HardSandbox);
        script.Options.DebugPrint = line =>
        {
            cancellationToken.ThrowIfCancellationRequested();
            if (clock.Elapsed > limit) throw new TimeoutException("Script exceeded the execution time limit.");
            var text = line + Environment.NewLine;
            var remaining = Math.Max(0, 100_000 - output.Length);
            output.Append(text.AsSpan(0, Math.Min(remaining, text.Length)));
            truncated |= text.Length > remaining;
            Flush();
        };
        cancellationToken.ThrowIfCancellationRequested();
        try
        {
        var function = script.LoadString(code);
        var coroutine = script.CreateCoroutine(function).Coroutine;
        coroutine.AutoYieldCounter = 10_000;
        DynValue result;
        do
        {
            cancellationToken.ThrowIfCancellationRequested();
            if (clock.Elapsed > limit) throw new TimeoutException("Script exceeded the execution time limit.");
            result = coroutine.Resume();
        } while (coroutine.State != CoroutineState.Dead);
        if (result.Type != DataType.Void && result.Type != DataType.Nil)
        {
            var text = "Result: " + result + Environment.NewLine;
            var remaining = Math.Max(0, 100_000 - output.Length);
            output.Append(text.AsSpan(0, Math.Min(remaining, text.Length)));
            truncated |= text.Length > remaining;
        }
        Flush(true);
        return new LuaRunResult(output.ToString(), clock.ElapsedMilliseconds, truncated);
        }
        catch (Exception ex)
        {
            Flush(true);
            ex.Data["VertexX.Output"] = output.ToString();
            throw;
        }
    }
}
