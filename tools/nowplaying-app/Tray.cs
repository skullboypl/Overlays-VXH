using System.Runtime.InteropServices;

namespace VxhNowPlaying;

/// <summary>Tray icon and its menu through the Windows API (no WinForms / WPF needed).</summary>
public sealed class Tray
{
    public sealed record Item(string Text, Action? OnClick, bool Checked = false, bool Disabled = false, bool Separator = false);

    const int WM_USER = 0x0400, WM_TRAY = WM_USER + 1, WM_COMMAND = 0x0111, WM_DESTROY = 0x0002, WM_LBUTTONUP = 0x0202, WM_RBUTTONUP = 0x0205, WM_CLOSE = 0x0010;
    const int NIM_ADD = 0, NIM_MODIFY = 1, NIM_DELETE = 2, NIF_MESSAGE = 1, NIF_ICON = 2, NIF_TIP = 4, NIF_INFO = 0x10;
    const uint MF_STRING = 0, MF_GRAYED = 1, MF_CHECKED = 8, MF_SEPARATOR = 0x800, TPM_RIGHTBUTTON = 2, TPM_RETURNCMD = 0x100;

    [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Unicode)]
    struct NOTIFYICONDATA
    {
        public int cbSize; public IntPtr hWnd; public int uID; public int uFlags; public int uCallbackMessage; public IntPtr hIcon;
        [MarshalAs(UnmanagedType.ByValTStr, SizeConst = 128)] public string szTip;
        public int dwState; public int dwStateMask;
        [MarshalAs(UnmanagedType.ByValTStr, SizeConst = 256)] public string szInfo;
        public int uVersion;
        [MarshalAs(UnmanagedType.ByValTStr, SizeConst = 64)] public string szInfoTitle;
        public int dwInfoFlags; public Guid guidItem; public IntPtr hBalloonIcon;
    }
    [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Unicode)]
    struct WNDCLASSEX
    {
        public int cbSize; public int style; public WndProc lpfnWndProc; public int cbClsExtra; public int cbWndExtra; public IntPtr hInstance;
        public IntPtr hIcon; public IntPtr hCursor; public IntPtr hbrBackground; public string? lpszMenuName; public string lpszClassName; public IntPtr hIconSm;
    }
    [StructLayout(LayoutKind.Sequential)] struct POINT { public int X, Y; }
    [StructLayout(LayoutKind.Sequential)] struct MSG { public IntPtr hwnd; public uint message; public IntPtr wParam; public IntPtr lParam; public uint time; public POINT pt; }
    delegate IntPtr WndProc(IntPtr hWnd, uint msg, IntPtr wParam, IntPtr lParam);

    [DllImport("shell32.dll", CharSet = CharSet.Unicode)] static extern bool Shell_NotifyIcon(int msg, ref NOTIFYICONDATA data);
    [DllImport("user32.dll", CharSet = CharSet.Unicode)] static extern ushort RegisterClassEx(ref WNDCLASSEX wc);
    [DllImport("user32.dll", CharSet = CharSet.Unicode)] static extern IntPtr CreateWindowEx(int exStyle, string cls, string name, int style, int x, int y, int w, int h, IntPtr parent, IntPtr menu, IntPtr inst, IntPtr param);
    [DllImport("user32.dll")] static extern IntPtr DefWindowProc(IntPtr hWnd, uint msg, IntPtr wParam, IntPtr lParam);
    [DllImport("user32.dll")] static extern int GetMessage(out MSG msg, IntPtr hWnd, uint min, uint max);
    [DllImport("user32.dll")] static extern bool TranslateMessage(ref MSG msg);
    [DllImport("user32.dll")] static extern IntPtr DispatchMessage(ref MSG msg);
    [DllImport("user32.dll")] static extern void PostQuitMessage(int code);
    [DllImport("user32.dll")] static extern bool PostMessage(IntPtr hWnd, uint msg, IntPtr wParam, IntPtr lParam);
    [DllImport("user32.dll")] static extern IntPtr CreatePopupMenu();
    [DllImport("user32.dll", CharSet = CharSet.Unicode)] static extern bool AppendMenu(IntPtr menu, uint flags, UIntPtr id, string? text);
    [DllImport("user32.dll")] static extern int TrackPopupMenu(IntPtr menu, uint flags, int x, int y, int reserved, IntPtr hWnd, IntPtr rect);
    [DllImport("user32.dll")] static extern bool DestroyMenu(IntPtr menu);
    [DllImport("user32.dll")] static extern bool SetForegroundWindow(IntPtr hWnd);
    [DllImport("user32.dll")] static extern bool GetCursorPos(out POINT p);
    [DllImport("user32.dll")] static extern IntPtr LoadIcon(IntPtr inst, IntPtr name);
    [DllImport("kernel32.dll")] static extern IntPtr GetModuleHandle(string? name);

    readonly WndProc proc;
    readonly IntPtr hwnd;
    NOTIFYICONDATA data;
    readonly Func<IReadOnlyList<Item>> menu;

    public Tray(string tip, Func<IReadOnlyList<Item>> menuItems)
    {
        menu = menuItems;
        proc = Proc;
        var inst = GetModuleHandle(null);
        var wc = new WNDCLASSEX { cbSize = Marshal.SizeOf<WNDCLASSEX>(), lpfnWndProc = proc, hInstance = inst, lpszClassName = "VxhNowPlayingTray" };
        RegisterClassEx(ref wc);
        hwnd = CreateWindowEx(0, wc.lpszClassName, "VXH Now Playing", 0, 0, 0, 0, 0, IntPtr.Zero, IntPtr.Zero, inst, IntPtr.Zero);
        // The .exe's own icon (ApplicationIcon) is resource 32512; Windows' default icon if it is missing.
        var icon = LoadIcon(inst, (IntPtr)32512);
        if (icon == IntPtr.Zero) icon = LoadIcon(IntPtr.Zero, (IntPtr)32512);
        data = new NOTIFYICONDATA
        {
            cbSize = Marshal.SizeOf<NOTIFYICONDATA>(), hWnd = hwnd, uID = 1, uFlags = NIF_MESSAGE | NIF_ICON | NIF_TIP,
            uCallbackMessage = WM_TRAY, hIcon = icon, szTip = Trim(tip, 127), szInfo = "", szInfoTitle = "",
        };
        Shell_NotifyIcon(NIM_ADD, ref data);
    }

    static string Trim(string s, int n) => s.Length > n ? s[..(n - 1)] + "…" : s;

    public void SetTip(string tip)
    {
        data.uFlags = NIF_TIP;
        data.szTip = Trim(tip, 127);
        Shell_NotifyIcon(NIM_MODIFY, ref data);
    }

    public void Balloon(string title, string text)
    {
        data.uFlags = NIF_INFO;
        data.szInfoTitle = Trim(title, 63);
        data.szInfo = Trim(text, 255);
        data.dwInfoFlags = 1; // info icon
        Shell_NotifyIcon(NIM_MODIFY, ref data);
    }

    public void Run()
    {
        while (GetMessage(out var msg, IntPtr.Zero, 0, 0) > 0) { TranslateMessage(ref msg); DispatchMessage(ref msg); }
        Shell_NotifyIcon(NIM_DELETE, ref data);
    }

    public void Quit() => PostMessage(hwnd, WM_CLOSE, IntPtr.Zero, IntPtr.Zero);

    IntPtr Proc(IntPtr h, uint msg, IntPtr w, IntPtr l)
    {
        if (msg == WM_TRAY && ((int)l == WM_RBUTTONUP || (int)l == WM_LBUTTONUP)) { ShowMenu(); return IntPtr.Zero; }
        if (msg == WM_CLOSE) { Shell_NotifyIcon(NIM_DELETE, ref data); PostQuitMessage(0); return IntPtr.Zero; }
        if (msg == WM_DESTROY) { PostQuitMessage(0); return IntPtr.Zero; }
        return DefWindowProc(h, msg, w, l);
    }

    void ShowMenu()
    {
        var items = menu();
        var m = CreatePopupMenu();
        for (var i = 0; i < items.Count; i++)
        {
            var it = items[i];
            if (it.Separator) { AppendMenu(m, MF_SEPARATOR, UIntPtr.Zero, null); continue; }
            AppendMenu(m, MF_STRING | (it.Checked ? MF_CHECKED : 0) | (it.Disabled || it.OnClick == null ? MF_GRAYED : 0), (UIntPtr)(i + 1), it.Text);
        }
        GetCursorPos(out var p);
        SetForegroundWindow(hwnd);
        var cmd = TrackPopupMenu(m, TPM_RIGHTBUTTON | TPM_RETURNCMD, p.X, p.Y, 0, hwnd, IntPtr.Zero);
        DestroyMenu(m);
        if (cmd > 0 && cmd <= items.Count) items[cmd - 1].OnClick?.Invoke();
    }
}
