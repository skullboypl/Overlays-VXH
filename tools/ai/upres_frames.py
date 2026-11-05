"""Re-export the holiday frames at 1920x1080 from the raw Flux outputs ComfyUI kept, without regenerating.

Each existing frame is matched to its raw image (and the RMBG cut-out of the same run) by comparing
small thumbnails over the visible pixels, then run through gen_frames.finish again.
    python tools/ai/upres_frames.py [comfy_output_dir] [only,names]
"""
import glob, os, sys
import numpy as np
from PIL import Image

sys.path.insert(0, os.path.dirname(__file__))
from gen_frames import finish  # noqa: E402

COMFY = sys.argv[1] if len(sys.argv) > 1 and sys.argv[1] else 'A:/AI_MODELS_LOCAL/ComfyUI_windows_portable_nvidia/ComfyUI_windows_portable/ComfyUI/output/vxh_overlays'
ONLY = sys.argv[2].split(',') if len(sys.argv) > 2 else None
FRAMES = 'src/assets/frames'
T = (192, 108)


def thumb(im):
    return np.asarray(im.convert('RGB').resize(T, Image.BILINEAR), dtype=np.float32)


raws = {p: thumb(Image.open(p)) for p in sorted(glob.glob(f'{COMFY}/frame_raw_*.png'))}

for path in sorted(glob.glob(f'{FRAMES}/*.webp')):
    name = os.path.basename(path)[:-5]
    if ONLY and name not in ONLY:
        continue
    im = Image.open(path).convert('RGBA').resize(T, Image.BILINEAR)
    arr = np.asarray(im, dtype=np.float32)
    vis = arr[..., 3] > 200
    if vis.sum() < 50:
        print(name, 'skip: nothing visible')
        continue

    def err(t):
        return float(np.abs(t[..., :3][vis] - arr[..., :3][vis]).mean())

    raw_p, raw_e = min(((p, err(t)) for p, t in raws.items()), key=lambda x: x[1])
    # The cut-out of a run carries the same counter as its raw image.
    cut_p = raw_p.replace('frame_raw_', 'frame_cut_')
    if raw_e > 8 or not os.path.exists(cut_p):
        print(name, f'skip: no confident match (raw {raw_e:.1f})')
        continue
    finish(Image.open(raw_p), Image.open(cut_p), path, glow=name.endswith('-neon'))
    print(name, '<-', os.path.basename(raw_p), f'{raw_e:.1f}', flush=True)
