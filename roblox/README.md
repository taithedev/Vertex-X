# Vertex X FPS overlay for Roblox Studio

1. Open a game you own or can edit in **Roblox Studio**.
2. In Explorer, expand **StarterPlayer > StarterPlayerScripts**.
3. Insert a **LocalScript**, rename it `VertexXFpsOverlay`, and paste [the FPS script](VertexXFpsOverlay.client.lua) into it.
4. Choose **Play / F5**, rather than server-only Run. The counter appears near the top right.
5. Publish your game after testing. The LocalScript runs separately for each player's client.

The FPS button works with mouse, touch and gamepad activation; F8 toggles the panel on a keyboard. It shows measured average rendered FPS and mean milliseconds per frame, updated twice per second. It survives character respawns and cleans up its connections if removed or replaced.

This is a Studio LocalScript. Vertex X's desktop Lua runner cannot access a running Roblox game's `game`, `Players`, or render loop. Use **Open FPS overlay** in Vertex X to edit it, then copy the source into Studio. No Roblox password, cookie, executor, injection, HTTP requests or server scripts are needed.

Status: source prepared; in-game Studio testing has not been performed in the current unavailable build environment.
