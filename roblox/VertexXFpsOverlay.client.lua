-- Vertex X FPS overlay
-- Roblox Studio: create a LocalScript in StarterPlayer > StarterPlayerScripts.
-- Paste this entire file, then use Play (F5) to test.
-- This measures the current player's rendered frames, not the server's FPS.

local Players = game:GetService("Players")
local RunService = game:GetService("RunService")
local UserInputService = game:GetService("UserInputService")

if not RunService:IsClient() then
    warn("Vertex X FPS: use a LocalScript in StarterPlayerScripts.")
    return
end

local player = Players.LocalPlayer
local playerGui = player:WaitForChild("PlayerGui", 15)
if not playerGui then
    warn("Vertex X FPS: PlayerGui was not available.")
    return
end

local existing = playerGui:FindFirstChild("VertexXFpsOverlay")
if existing then
    existing:Destroy()
end

local gui = Instance.new("ScreenGui")
gui.Name = "VertexXFpsOverlay"
gui.ResetOnSpawn = false
gui.IgnoreGuiInset = false
gui.DisplayOrder = 30
gui.ZIndexBehavior = Enum.ZIndexBehavior.Sibling

local toggle = Instance.new("TextButton")
toggle.Name = "Toggle"
toggle.AnchorPoint = Vector2.new(1, 0)
toggle.Position = UDim2.new(1, -16, 0, 12)
toggle.Size = UDim2.fromOffset(62, 28)
toggle.BackgroundColor3 = Color3.fromRGB(29, 27, 37)
toggle.BorderSizePixel = 0
toggle.Font = Enum.Font.GothamMedium
toggle.Text = "FPS"
toggle.TextSize = 12
toggle.TextColor3 = Color3.fromRGB(220, 207, 246)
toggle.Selectable = true
toggle.Parent = gui
local toggleCorner = Instance.new("UICorner")
toggleCorner.CornerRadius = UDim.new(0, 8)
toggleCorner.Parent = toggle

local panel = Instance.new("Frame")
panel.Name = "Metrics"
panel.AnchorPoint = Vector2.new(1, 0)
panel.Position = UDim2.new(1, -16, 0, 48)
panel.Size = UDim2.fromOffset(182, 78)
panel.BackgroundColor3 = Color3.fromRGB(18, 17, 24)
panel.BackgroundTransparency = 0.1
panel.BorderSizePixel = 0
panel.Parent = gui
local corner = Instance.new("UICorner")
corner.CornerRadius = UDim.new(0, 10)
corner.Parent = panel
local border = Instance.new("UIStroke")
border.Color = Color3.fromRGB(82, 65, 111)
border.Transparency = 0.3
border.Thickness = 1
border.Parent = panel

local fpsText = Instance.new("TextLabel")
fpsText.Name = "FPS"
fpsText.Position = UDim2.fromOffset(14, 10)
fpsText.Size = UDim2.new(1, -28, 0, 29)
fpsText.BackgroundTransparency = 1
fpsText.TextXAlignment = Enum.TextXAlignment.Left
fpsText.Font = Enum.Font.GothamBold
fpsText.TextSize = 23
fpsText.TextColor3 = Color3.fromRGB(189, 161, 245)
fpsText.Text = "Measuring..."
fpsText.Parent = panel

local detailText = Instance.new("TextLabel")
detailText.Name = "FrameTime"
detailText.Position = UDim2.fromOffset(14, 43)
detailText.Size = UDim2.new(1, -28, 0, 19)
detailText.BackgroundTransparency = 1
detailText.TextXAlignment = Enum.TextXAlignment.Left
detailText.Font = Enum.Font.Gotham
detailText.TextSize = 11
detailText.TextColor3 = Color3.fromRGB(161, 154, 178)
detailText.Text = "Frame time · F8 to toggle"
detailText.Parent = panel

local connections = {}
local cleaned = false
local function cleanup()
    if cleaned then return end
    cleaned = true
    for _, connection in ipairs(connections) do
        connection:Disconnect()
    end
end

local function togglePanel()
    panel.Visible = not panel.Visible
end

table.insert(connections, toggle.Activated:Connect(togglePanel))
table.insert(connections, UserInputService.InputBegan:Connect(function(input, processed)
    if not processed and not UserInputService:GetFocusedTextBox()
        and input.KeyCode == Enum.KeyCode.F8 then
        togglePanel()
    end
end))

local frameCount = 0
local elapsed = 0
local updateInterval = 0.5
table.insert(connections, RunService.PreRender:Connect(function(deltaTime)
    if deltaTime <= 0 then return end
    frameCount = frameCount + 1
    elapsed = elapsed + deltaTime
    if elapsed < updateInterval then return end

    local averageFps = frameCount / elapsed
    local frameMs = elapsed * 1000 / frameCount
    fpsText.Text = string.format("%d FPS", math.floor(averageFps + 0.5))
    detailText.Text = string.format("%.1f ms / frame · F8", frameMs)
    if averageFps >= 55 then
        fpsText.TextColor3 = Color3.fromRGB(139, 214, 169)
    elseif averageFps >= 30 then
        fpsText.TextColor3 = Color3.fromRGB(232, 202, 132)
    else
        fpsText.TextColor3 = Color3.fromRGB(237, 148, 160)
    end
    frameCount = 0
    elapsed = 0
end))

table.insert(connections, gui.Destroying:Connect(cleanup))
table.insert(connections, script.Destroying:Connect(function()
    cleanup()
    gui:Destroy()
end))
gui.Parent = playerGui
