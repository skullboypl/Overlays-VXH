#!/usr/bin/env bash
# Generates every missing holiday frame and character, one item per process, and restarts
# ComfyUI when it dies (heavy video models can take it down). Safe to re-run any time.
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

run() { # $1 = kind, $2 = item, $3 = expected file
  for attempt in 1 2 3; do
    [ -f "$3" ] && return 0
    ensure || return 1
    if [ "$1" = frame ]; then
      timeout 1300 "$PY" -I "$DIR/gen_frames.py" "$ASSETS/frames" "$2"
    else
      timeout 1700 "$PY" -I "$DIR/gen_chars.py" "$ASSETS/characters" "$WORK/frames" "$2"
    fi
    [ -f "$3" ] && return 0
    echo "$(date +%T) $2: attempt $attempt failed"
    sleep 10
  done
}

for t in xmas winter newyear valentine easter halloween independence birthday; do
  for v in real 3d cartoon neon; do run frame "$t-$v" "$ASSETS/frames/$t-$v.webp"; done
done
for c in santa-game santa-real elf-game snowman-game reindeer-game pumpkin-game witch-game bunny-game cupid-game partygirl-game; do
  run char "$c" "$ASSETS/characters/$c.webm"
done
for v in cozy city winter xmas halloween nebula sunset abstract sakura beach; do
  for attempt in 1 2 3; do
    [ -f "$ASSETS/videos/$v.mp4" ] && break
    ensure || break
    timeout 1800 "$PY" -I "$DIR/gen_videos.py" "$DIR/../../public/bg" "$ASSETS/videos" "$v"
    [ -f "$ASSETS/videos/$v.mp4" ] || { echo "$(date +%T) video $v: attempt $attempt failed"; sleep 10; }
  done
done
echo "$(date +%T) DONE: $(ls "$ASSETS/frames" | wc -l) frames, $(ls "$ASSETS/characters"/*.webm 2>/dev/null | wc -l) characters, $(ls "$ASSETS/videos"/*.mp4 2>/dev/null | wc -l) videos"
