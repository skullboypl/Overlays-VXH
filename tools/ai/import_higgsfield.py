"""Imports a clip generated in Higgsfield as a NEW looping video background.

Higgsfield gives the motion (720p / 1080p, 5-10 s); this script only finishes it the way the site expects:
  1. frames at 24 fps (optionally a window of the clip: --start / --dur)
  2. RealESRGAN on every frame with the model file from the local ComfyUI (same as gen_videos_h3.py), skipped with
     --no-upscale when the clip is already 1080p or more
  3. a crossfade of the end into the start, so the loop has no jump; with --seamless (a clip generated with the SAME
     picture as first and last frame, e.g. Seedance start_image = end_image = one of our 4K backgrounds) the clip already
     ends where it starts, so only the duplicated last frame is dropped
  4. 1920x1080 H.264 -> src/assets/videos/<id>.mp4, poster public/bg/<id>.webp, thumbnail public/bg/<id>-thumb.webp

Backward compatibility: an existing id is NEVER overwritten (a link with bg=v-<id> would start showing a different
clip). Pick a new id. Ids are lowercase letters, digits and dashes.

    python tools/ai/import_higgsfield.py <clip.mp4> <id> --label="Polski opis" [--scale=2] [--no-upscale]
                                         [--start=0 --dur=6] [--fade=24] [--seamless] [--root=.]

Then add the printed line to PHOTO_LABELS in src/overlays/registry.ts, run `pnpm i18n:extract` and translate it.
Upscaler model path: env VXH_UPSCALER (default: RealESRGAN_x2.pth in the local ComfyUI models/upscale_models).
"""
import os, re, shutil, subprocess, sys, tempfile
import numpy as np
from PIL import Image

args = [a for a in sys.argv[1:] if not a.startswith('--')]
opts = dict((a[2:].split('=', 1) + ['1'])[:2] for a in sys.argv[1:] if a.startswith('--'))
if len(args) != 2:
    sys.exit(__doc__)
CLIP, ID = args
ROOT = os.path.abspath(opts.get('root', os.path.join(os.path.dirname(__file__), '..', '..')))
SEAMLESS = 'seamless' in opts
FADE = 0 if SEAMLESS else int(opts.get('fade', 24))
SCALE = int(opts.get('scale', 2))
UPSCALE = 'no-upscale' not in opts
MODEL = os.environ.get('VXH_UPSCALER', 'A:/AI_MODELS_LOCAL/ComfyUI_windows_portable_nvidia/ComfyUI_windows_portable/ComfyUI/models/upscale_models/'
                       + ('RealESRGAN_x2.pth' if SCALE == 2 else 'RealESRGAN_x4plus.pth'))

if not re.fullmatch(r'[a-z0-9]+(-[a-z0-9]+)*', ID):
    sys.exit(f'id "{ID}": use lowercase letters, digits and dashes, e.g. "neon-arcade"')
VIDEO = os.path.join(ROOT, 'src', 'assets', 'videos', f'{ID}.mp4')
POSTER = os.path.join(ROOT, 'public', 'bg', f'{ID}.webp')
THUMB = os.path.join(ROOT, 'public', 'bg', f'{ID}-thumb.webp')
taken = [p for p in (VIDEO, POSTER, THUMB) if os.path.exists(p)]
if taken:
    sys.exit('refusing to overwrite (old links would change): ' + ', '.join(os.path.relpath(p, ROOT) for p in taken) + '\nchoose a new id')


def frames_of(clip, out_dir):
    cut = []
    if 'start' in opts:
        cut += ['-ss', opts['start']]
    if 'dur' in opts:
        cut += ['-t', opts['dur']]
    subprocess.run(['ffmpeg', '-loglevel', 'error', '-y', *cut, '-i', clip, '-vf', 'fps=24', os.path.join(out_dir, '%04d.png')], check=True)
    names = sorted(n for n in os.listdir(out_dir) if n.endswith('.png'))
    if len(names) < FADE * 2 + 12:
        sys.exit(f'clip too short: {len(names)} frames at 24 fps, need at least {FADE * 2 + 12} (or lower --fade)')
    return names


def upscale(src_dir, names, dst_dir):
    import torch
    from spandrel import ModelLoader
    model = ModelLoader().load_from_file(MODEL).model.eval()
    dev = 'cuda' if torch.cuda.is_available() else 'cpu'
    model = model.to(dev).half() if dev == 'cuda' else model
    for n in names:
        img = torch.from_numpy(np.asarray(Image.open(os.path.join(src_dir, n)).convert('RGB'))).permute(2, 0, 1)[None].float() / 255
        with torch.no_grad():
            out = model(img.to(dev).half() if dev == 'cuda' else img).float().clamp(0, 1)
        Image.fromarray((out[0].permute(1, 2, 0).cpu().numpy() * 255).round().astype(np.uint8)).save(os.path.join(dst_dir, n), compress_level=1)
    del model
    if dev == 'cuda':
        torch.cuda.empty_cache()


def loop_and_encode(src_dir, names, tmp, out):
    """The last FADE frames dissolve into the first FADE ones: the clip ends where it starts."""
    frames = [np.asarray(Image.open(os.path.join(src_dir, n)).convert('RGB'), dtype=np.float32) for n in names]
    if SEAMLESS:
        frames = frames[:-1]  # the last frame is the first one again
    n = len(frames)
    for i in range(n - FADE):
        f = frames[i]
        if i < FADE:  # never true with --seamless (FADE = 0)
            a = (i + 1) / (FADE + 1)
            f = frames[n - FADE + i] * (1 - a) + frames[i] * a
        Image.fromarray(f.clip(0, 255).astype(np.uint8)).save(os.path.join(tmp, f'{i:04d}.png'), compress_level=1)
    os.makedirs(os.path.dirname(out), exist_ok=True)
    subprocess.run(['ffmpeg', '-loglevel', 'error', '-y', '-framerate', '24', '-i', os.path.join(tmp, '%04d.png'),
                    '-vf', 'scale=1920:1080:force_original_aspect_ratio=increase:flags=lanczos,crop=1920:1080',
                    '-c:v', 'libx264', '-preset', 'slow', '-crf', '21', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', '-an', out], check=True)
    return n - FADE


def poster(first_png):
    img = Image.open(first_png).convert('RGB')
    w, h = img.size
    # cover-crop to 16:9 like the video itself
    tw, th = (w, round(w * 9 / 16)) if w * 9 <= h * 16 else (round(h * 16 / 9), h)
    img = img.crop(((w - tw) // 2, (h - th) // 2, (w - tw) // 2 + tw, (h - th) // 2 + th))
    os.makedirs(os.path.dirname(POSTER), exist_ok=True)
    img.resize((1920, 1080), Image.LANCZOS).save(POSTER, quality=82)
    img.resize((384, 216), Image.LANCZOS).save(THUMB, quality=80)


work = tempfile.mkdtemp(prefix=f'vxh-{ID}-')
try:
    raw, big, loop = (os.path.join(work, d) for d in ('raw', 'big', 'loop'))
    for d in (raw, big, loop):
        os.makedirs(d)
    names = frames_of(CLIP, raw)
    w, h = Image.open(os.path.join(raw, names[0])).size
    print(f'{len(names)} frames {w}x{h}', flush=True)
    if UPSCALE:
        upscale(raw, names, big)
        src = big
    else:
        src = raw
    count = loop_and_encode(src, names, loop, VIDEO)
    poster(os.path.join(loop, '0000.png'))
    print(f'ok: {os.path.relpath(VIDEO, ROOT)} ({count} frames, {os.path.getsize(VIDEO) // 1024} KB), poster + thumbnail in public/bg/')
    label = opts.get('label', 'OPIS PO POLSKU')
    print(f"\nadd to PHOTO_LABELS in src/overlays/registry.ts:\n  '{ID}': '{label}',\nthen: pnpm i18n:extract, translate '▶ {label}', pnpm compat:check")
finally:
    shutil.rmtree(work, ignore_errors=True)
