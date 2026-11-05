#!/usr/bin/env bash
# Waits for the main runner to finish, then generates the extra characters (same restart logic).
DIR="$(cd "$(dirname "$0")" && pwd)"
LOG="$1"
until grep -q "DONE" "$LOG" 2>/dev/null; do sleep 30; done
COMFY="${COMFY:-A:/AI_MODELS_LOCAL/ComfyUI_windows_portable_nvidia/ComfyUI_windows_portable}"
PY="$COMFY/python_embeded/python.exe"; ASSETS="$DIR/../../src/assets"; WORK="$DIR/.work"
export PATH="/c/ffmpeg/bin:$PATH"
up() { curl -s -m 3 http://127.0.0.1:8188/system_stats >/dev/null; }
ensure() { up && return 0; (cd "$COMFY" && nohup ./python_embeded/python.exe -s ComfyUI/main.py --windows-standalone-build --disable-pinned-memory > "$WORK/comfy.log" 2>&1 &); for _ in $(seq 1 60); do sleep 5; up && return 0; done; return 1; }
for c in $(cat "$WORK/new_chars.txt"); do
  for attempt in 1 2 3; do
    [ -f "$ASSETS/characters/$c.webm" ] && break
    ensure || break
    timeout 1700 "$PY" -I "$DIR/gen_chars.py" "$ASSETS/characters" "$WORK/frames" "$c"
    [ -f "$ASSETS/characters/$c.webm" ] || { echo "$(date +%T) $c attempt $attempt failed"; sleep 10; }
  done
done
echo "$(date +%T) CHARS DONE: $(ls "$ASSETS/characters"/*.webm | wc -l) characters"
