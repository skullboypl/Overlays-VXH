#!/usr/bin/env bash
# Fills every missing holiday frame (all styles), 4K photo backgrounds, then the two missing frames, the rest of the videos and the new
# characters. Same restart logic as runner.sh; every item is skipped once its file exists.
DIR="$(cd "$(dirname "$0")" && pwd)"
COMFY="${COMFY:-A:/AI_MODELS_LOCAL/ComfyUI_windows_portable_nvidia/ComfyUI_windows_portable}"
PY="$COMFY/python_embeded/python.exe"
ASSETS="$DIR/../../src/assets"
WORK="$DIR/.work"
mkdir -p "$WORK"
export PATH="/c/ffmpeg/bin:$PATH"

up() { curl -s -m 3 http://127.0.0.1:8188/system_stats >/dev/null; }
ensure() {
  up && return 0
  echo "$(date +%T) ComfyUI is down, starting it"
  (cd "$COMFY" && nohup ./python_embeded/python.exe -s ComfyUI/main.py --windows-standalone-build --disable-pinned-memory > "$WORK/comfy.log" 2>&1 &)
  for _ in $(seq 1 60); do sleep 5; up && { echo "$(date +%T) ComfyUI is up"; return 0; }; done
  return 1
}
item() { # $1 = expected file, rest = command
  local f="$1"; shift
  for attempt in 1 2 3; do
    [ -f "$f" ] && { echo "$(date +%T) ok $(basename "$f")"; return 0; }
    ensure || return 1
    "$@"
    [ -f "$f" ] && { echo "$(date +%T) ok $(basename "$f")"; return 0; }
    echo "$(date +%T) $(basename "$f"): attempt $attempt failed"; sleep 10
  done
}

for v in real real2 real3 real4 real5 3d cartoon neon neon2 neon3 neon4 neon5; do
  for t in xmas winter newyear valentine easter halloween independence birthday; do
    item "$ASSETS/frames/$t-$v.webp" timeout 1300 "$PY" -I "$DIR/gen_frames.py" "$ASSETS/frames" "$t-$v"
  done
done
# 4K photo backgrounds (new holiday and everyday ones, older ones upscaled). One call does them all.
for attempt in 1 2 3; do
  ensure || break
  timeout 7200 "$PY" -I "$DIR/gen_bgs.py" "$DIR/../../public/bg" && break
  echo "$(date +%T) backgrounds: attempt $attempt failed"; sleep 10
done
for v in halloween nebula sunset abstract sakura beach xmas-cabin xmas-village winter-street ny-fireworks val-hearts easter-garden hw-forest hw-witch pl-flags bday-party gaming-room rainy-cafe aurora-peaks cyber-alley xmas-bokeh winter-lake winter-pines ny-party ny-gold val-roses val-city easter-meadow easter-table hw-mansion pl-oldtown pl-tatra bday-cake bday-neon space-window underwater; do
  item "$ASSETS/videos/$v.mp4" timeout 1800 "$PY" -I "$DIR/gen_videos.py" "$DIR/../../public/bg" "$ASSETS/videos" "$v"
done
for c in $(cat "$WORK/new_chars.txt"); do
  item "$ASSETS/characters/$c.webm" timeout 1700 "$PY" -I "$DIR/gen_chars.py" "$ASSETS/characters" "$WORK/frames" "$c"
done
echo "$(date +%T) DONE: $(ls "$ASSETS/frames" | wc -l) frames, $(ls "$ASSETS/characters"/*.webm | wc -l) characters, $(ls "$ASSETS/videos"/*.mp4 | wc -l) videos"
