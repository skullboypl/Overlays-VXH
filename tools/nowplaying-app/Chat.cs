using System.Net.Http.Json;
using System.Net.WebSockets;
using System.Text;
using System.Text.Json;

namespace VxhNowPlaying;

/// <summary>One chat line: who wrote it, whether they may skip right away (moderator / broadcaster), and the text.</summary>
public sealed record ChatLine(string Platform, string User, bool Privileged, string Text);

/// <summary>Read-only chat clients without login: Twitch's anonymous IRC WebSocket and Kick's public Pusher channel.</summary>
public static class Chat
{
    static async Task<string?> ReceiveAsync(ClientWebSocket ws, CancellationToken stop)
    {
        var buf = new byte[16384];
        using var ms = new MemoryStream();
        WebSocketReceiveResult r;
        do
        {
            r = await ws.ReceiveAsync(buf, stop);
            if (r.MessageType == WebSocketMessageType.Close) return null;
            ms.Write(buf, 0, r.Count);
        } while (!r.EndOfMessage);
        return Encoding.UTF8.GetString(ms.ToArray());
    }

    static Task SendAsync(ClientWebSocket ws, string text, CancellationToken stop) =>
        ws.SendAsync(Encoding.UTF8.GetBytes(text), WebSocketMessageType.Text, true, stop);

    /// <summary>Twitch: tags tell who is broadcaster / moderator. Reconnects until <paramref name="stop"/>.</summary>
    public static async Task TwitchAsync(string channel, Action<ChatLine> onLine, CancellationToken stop)
    {
        var ch = channel.Trim().ToLowerInvariant().TrimStart('#');
        if (ch.Length < 2) return;
        while (!stop.IsCancellationRequested)
        {
            try
            {
                using var ws = new ClientWebSocket();
                await ws.ConnectAsync(new Uri("wss://irc-ws.chat.twitch.tv:443"), stop);
                await SendAsync(ws, "CAP REQ :twitch.tv/tags twitch.tv/commands", stop);
                await SendAsync(ws, "PASS SCHMOOPIIE", stop);
                await SendAsync(ws, $"NICK justinfan{Random.Shared.Next(10000, 90000)}", stop);
                await SendAsync(ws, $"JOIN #{ch}", stop);
                while (!stop.IsCancellationRequested && await ReceiveAsync(ws, stop) is { } data)
                {
                    foreach (var line in data.Split("\r\n", StringSplitOptions.RemoveEmptyEntries))
                    {
                        if (line.StartsWith("PING")) { await SendAsync(ws, "PONG" + line[4..], stop); continue; }
                        var i = line.IndexOf(" PRIVMSG #", StringComparison.Ordinal);
                        if (i < 0 || !line.StartsWith('@')) continue;
                        var tags = line[1..line.IndexOf(' ')].Split(';').Select(t => t.Split('=', 2)).Where(p => p.Length == 2).ToDictionary(p => p[0], p => p[1]);
                        var text = line[(line.IndexOf(" :", i, StringComparison.Ordinal) + 2)..];
                        var badges = tags.GetValueOrDefault("badges", "");
                        var privileged = badges.Contains("broadcaster/") || badges.Contains("moderator/") || tags.GetValueOrDefault("mod") == "1";
                        var user = tags.GetValueOrDefault("display-name", "");
                        onLine(new ChatLine("twitch", string.IsNullOrEmpty(user) ? "?" : user, privileged, text));
                    }
                }
            }
            catch (OperationCanceledException) { return; }
            catch { /* network: retry */ }
            try { await Task.Delay(5000, stop); } catch { return; }
        }
    }

    /// <summary>Kick: the chatroom id comes from the panel server (/api/followers), messages from Pusher.</summary>
    public static async Task KickAsync(string origin, string channel, Action<ChatLine> onLine, CancellationToken stop)
    {
        var slug = channel.Trim().ToLowerInvariant();
        if (slug.Length < 2) return;
        using var http = new HttpClient { Timeout = TimeSpan.FromSeconds(10) };
        while (!stop.IsCancellationRequested)
        {
            try
            {
                var info = await http.GetFromJsonAsync<JsonElement>($"{origin}/api/followers?platform=kick&channel={Uri.EscapeDataString(slug)}", stop);
                var room = info.TryGetProperty("chatroom", out var c) && c.ValueKind == JsonValueKind.Number ? c.GetInt64() : 0;
                if (room == 0) { await Task.Delay(60_000, stop); continue; }
                using var ws = new ClientWebSocket();
                await ws.ConnectAsync(new Uri("wss://ws-us2.pusher.com/app/32cbd69e4b950bf97679?protocol=7&client=js&version=8.4.0&flash=false"), stop);
                await SendAsync(ws, JsonSerializer.Serialize(new { @event = "pusher:subscribe", data = new { auth = "", channel = $"chatrooms.{room}.v2" } }), stop);
                while (!stop.IsCancellationRequested && await ReceiveAsync(ws, stop) is { } data)
                {
                    using var doc = JsonDocument.Parse(data);
                    var ev = doc.RootElement.TryGetProperty("event", out var e) ? e.GetString() ?? "" : "";
                    if (ev == "pusher:ping") { await SendAsync(ws, "{\"event\":\"pusher:pong\",\"data\":{}}", stop); continue; }
                    if (!ev.EndsWith("ChatMessageEvent")) continue;
                    using var msg = JsonDocument.Parse(doc.RootElement.GetProperty("data").GetString() ?? "{}");
                    var m = msg.RootElement;
                    var sender = m.TryGetProperty("sender", out var s) ? s : default;
                    var user = sender.ValueKind == JsonValueKind.Object && sender.TryGetProperty("username", out var u) ? u.GetString() ?? "?" : "?";
                    var privileged = false;
                    if (sender.ValueKind == JsonValueKind.Object && sender.TryGetProperty("identity", out var id) && id.TryGetProperty("badges", out var b) && b.ValueKind == JsonValueKind.Array)
                        privileged = b.EnumerateArray().Any(x => x.TryGetProperty("type", out var t) && t.GetString() is "moderator" or "broadcaster");
                    var text = m.TryGetProperty("content", out var ct) ? ct.GetString() ?? "" : "";
                    onLine(new ChatLine("kick", user, privileged, text));
                }
            }
            catch (OperationCanceledException) { return; }
            catch { /* network: retry */ }
            try { await Task.Delay(5000, stop); } catch { return; }
        }
    }
}
