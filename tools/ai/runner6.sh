#!/usr/bin/env bash
# Second pass: the two missing neon frames, all 40 video backgrounds again with MiniMax H3 (real motion; the Wan 2.2
# clips barely moved), then the new characters. ComfyUI is restarted between stages: unloading the H3 text encoder
# (nvfp4) when the next stage swaps models crashed ComfyUI's queue. Every item is skipped once its file exists.
DIR="$(cd "$(dirname "$0")" && pwd)"
COMFY="${COMFY:-A:/AI_MODELS_LOCAL/ComfyUI_windows_portable_nvidia/ComfyUI_windows_portable}"
PY="$COMFY/python_embeded/python.exe"
ASSETS="$DIR/../../src/assets"
WORK="$DIR/.work"
export PATH="/c/ffmpeg/bin:$PATH"

up() { curl -s -m 3 http://127.0.0.1:8188/system_stats >/dev/null; }
ensure() {
  up && return 0
  echo "$(date +%T) ComfyUI is down, starting it"
  (cd "$COMFY" && nohup ./python_embeded/python.exe -s ComfyUI/main.py --windows-standalone-build --disable-pinned-memory > "$WORK/comfy.log" 2>&1 &)
  for _ in $(seq 1 60); do sleep 5; up && { echo "$(date +%T) ComfyUI is up"; return 0; }; done
  return 1
}
restart() {
  echo "$(date +%T) restarting ComfyUI"
  powershell -NoProfile -Command "Get-CimInstance Win32_Process | Where-Object { \$_.CommandLine -match 'ComfyUI[\\/]main.py' } | ForEach-Object { Stop-Process -Id \$_.ProcessId -Force }" >/dev/null 2>&1
  sleep 5
  ensure
}
item() { # $1 = expected file, rest = command
  local f="$1"; shift
  for attempt in 1 2 3; do
    [ -f "$f" ] && { echo "$(date +%T) ok $(basename "$f")"; return 0; }
    ensure || return 1
    "$@"
    [ -f "$f" ] && { echo "$(date +%T) ok $(basename "$f")"; return 0; }
    echo "$(date +%T) $(basename "$f"): attempt $attempt failed"
    restart
  done
}

for t in xmas; do
  for v in neon2 neon5; do
    item "$ASSETS/frames/$t-$v.webp" timeout 1300 "$PY" -I "$DIR/gen_frames.py" "$ASSETS/frames" "$t-$v"
  done
done
restart
for v in xmas-cabin xmas-village xmas-bokeh winter-lake winter-street winter-pines ny-fireworks ny-party ny-gold val-roses val-hearts val-city easter-meadow easter-table easter-garden hw-mansion hw-forest hw-witch pl-oldtown pl-flags pl-tatra bday-party bday-cake bday-neon gaming-room space-window rainy-cafe aurora-peaks cyber-alley underwater cozy city winter xmas halloween nebula sunset abstract sakura beach; do
  item "$ASSETS/videos/$v.mp4" timeout 3000 "$PY" -I "$DIR/gen_videos_h3.py" "$DIR/../../public/bg" "$ASSETS/videos" "$v"
done
restart
for c in $(cat "$WORK/new_chars.txt"); do
  item "$ASSETS/characters/$c.webm" timeout 1700 "$PY" -I "$DIR/gen_chars.py" "$ASSETS/characters" "$WORK/frames" "$c"
done
echo "$(date +%T) DONE: $(ls "$ASSETS/frames" | wc -l) frames, $(ls "$ASSETS/characters"/*.webm | wc -l) characters, $(ls "$ASSETS/videos"/*.mp4 | wc -l) videos"
