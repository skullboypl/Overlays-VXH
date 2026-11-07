"""Looping video backgrounds with MiniMax H3 (local, image to video) instead of Wan 2.2.

Wan with the photo as both first and last frame barely moved (0.1-3 % of pixels). H3 gets only the first frame and a
motion-heavy prompt, so things really move; the loop is closed afterwards with a 1 s crossfade of the end into the start.

  1. H3 fl2va int8 + 8-step turbo LoRA, 1280x704, 124 frames at 24 fps (~5 s), frames saved by ComfyUI
  2. second prompt (after the 20 GB model is freed): RealESRGAN x2 on every frame
  3. crossfade loop + ffmpeg: 1920x1080 H.264, 24 fps

    python gen_videos_h3.py <bg_dir> <out_dir> [id,id...] [--suffix=-h3]
"""
import ast, json, os, random, shutil, subprocess, sys, time, urllib.parse, urllib.request
import numpy as np
import requests
from PIL import Image

API = 'http://127.0.0.1:8188'
COMFY_OUT = 'A:/AI_MODELS_LOCAL/ComfyUI_windows_portable_nvidia/ComfyUI_windows_portable/ComfyUI/output'
args = [a for a in sys.argv[1:] if not a.startswith('--')]
opts = dict(a[2:].split('=', 1) for a in sys.argv[1:] if a.startswith('--') and '=' in a)
BG, OUT = args[0], args[1]
ONLY = args[2].split(',') if len(args) > 2 else None
SUFFIX = opts.get('suffix', '')
# --flf=1: the photo is also the last frame. Tested: H3 then barely moves (1.8 % of pixels) and sways sideways, so the
# default is first frame only (static camera, ~46 % of pixels change: fire, snow, lights) plus a crossfade loop.
FLF = opts.get('flf', '0') == '1'
# --from=<dir>: skip generation and only upscale + encode frames that already exist (for re-encoding a test).
FROM = opts.get('from', '')
W, H, LENGTH, FADE = 1280, 704, 124, 24
os.makedirs(OUT, exist_ok=True)

# Same motion descriptions as the Wan script (read without running it).
_tree = ast.parse(open(os.path.join(os.path.dirname(__file__), 'gen_videos.py'), encoding='utf-8').read())
MOTION = next(ast.literal_eval(n.value) for n in _tree.body if isinstance(n, ast.Assign) and getattr(n.targets[0], 'id', '') == 'MOTION')
TAIL = (' Clearly visible, lively, continuous motion through the whole clip, everything that can move keeps moving.'
        ' Locked-off static camera, no cuts, no zoom, photorealistic, cinematic lighting, no people, no text.')


def post(path, data):
    req = urllib.request.Request(API + path, data=json.dumps(data).encode(), headers={'Content-Type': 'application/json'})
    return json.loads(urllib.request.urlopen(req).read())


def wait(pid, limit=3000):
    t0 = time.time()
    while time.time() - t0 < limit:
        time.sleep(4)
        h = json.loads(urllib.request.urlopen(f'{API}/history/{pid}').read())
        if pid in h:
            e = h[pid]
            if e.get('status', {}).get('status_str') == 'error':
                raise RuntimeError(json.dumps(e['status'])[:1500])
            return e
    raise TimeoutError(pid)


def free():
    try:
        post('/free', {'unload_models': True, 'free_memory': True})
    except Exception:
        pass


def generate(name, image_path, prompt):
    shutil.rmtree(os.path.join(COMFY_OUT, 'vxh_h3', name), ignore_errors=True)
    with open(image_path, 'rb') as f:
        up = requests.post(f'{API}/upload/image', files={'image': (f'bg_{name}.webp', f.read(), 'image/webp')}, data={'overwrite': 'true'}).json()
    wf = {
        '1': {'class_type': 'UNETLoader', 'inputs': {'unet_name': 'minimax_h3_fl2va_pruned_int8_convrot.safetensors', 'weight_dtype': 'default'}},
        '2': {'class_type': 'LoraLoaderModelOnly', 'inputs': {'model': ['1', 0], 'lora_name': 'minimax_h3_fl2v_turbo_8step_v1.0_comfyui_bf16.safetensors', 'strength_model': 1.0}},
        '3': {'class_type': 'CLIPLoader', 'inputs': {'clip_name': 'qwen3vl_32b_minimax_h3_nvfp4_awq.safetensors', 'type': 'minimax', 'device': 'default'}},
        '4': {'class_type': 'VAELoader', 'inputs': {'vae_name': 'minimax_h3_video_vae_int8_convrot.safetensors'}},
        '5': {'class_type': 'LoadImage', 'inputs': {'image': up['name']}},
        '6': {'class_type': 'ImageScale', 'inputs': {'image': ['5', 0], 'upscale_method': 'lanczos', 'width': W, 'height': H, 'crop': 'center'}},
        '7': {'class_type': 'MiniMaxH3ImageToVideo', 'inputs': {'clip': ['3', 0], 'vae': ['4', 0], 'prompt': prompt, 'width': W, 'height': H,
                                                               'length': LENGTH, 'first_frame': ['6', 0], **({'last_frame': ['6', 0]} if FLF else {})}},
        '8': {'class_type': 'BasicScheduler', 'inputs': {'model': ['2', 0], 'scheduler': 'simple', 'steps': 8, 'denoise': 1.0}},
        '9': {'class_type': 'KSamplerSelect', 'inputs': {'sampler_name': 'res_multistep'}},
        '10': {'class_type': 'RandomNoise', 'inputs': {'noise_seed': random.randint(1, 2**31)}},
        '11': {'class_type': 'BasicGuider', 'inputs': {'model': ['2', 0], 'conditioning': ['7', 0]}},
        '12': {'class_type': 'SamplerCustomAdvanced', 'inputs': {'noise': ['10', 0], 'guider': ['11', 0], 'sampler': ['9', 0], 'sigmas': ['8', 0], 'latent_image': ['7', 1]}},
        '13': {'class_type': 'VAEDecode', 'inputs': {'samples': ['12', 0], 'vae': ['4', 0]}},
        '14': {'class_type': 'SaveImage', 'inputs': {'images': ['13', 0], 'filename_prefix': f'vxh_h3/{name}/f'}},
    }
    out = wait(post('/prompt', {'prompt': wf})['prompt_id'])['outputs']['14']['images']
    return os.path.join(COMFY_OUT, 'vxh_h3', name), len(out)


_UPSCALER = None


def upscale(name, src_dir):
    """RealESRGAN x2 on every frame, in this process (ComfyUI would have to swap models, which crashed its queue)."""
    global _UPSCALER
    import torch
    from spandrel import ModelLoader
    if _UPSCALER is None:
        path = 'A:/AI_MODELS_LOCAL/ComfyUI_windows_portable_nvidia/ComfyUI_windows_portable/ComfyUI/models/upscale_models/RealESRGAN_x2.pth'
        _UPSCALER = ModelLoader().load_from_file(path).model.eval()
    dev = 'cuda' if torch.cuda.is_available() else 'cpu'
    model = _UPSCALER.to(dev).half() if dev == 'cuda' else _UPSCALER
    dst = os.path.join(COMFY_OUT, 'vxh_h3_x2', name)
    shutil.rmtree(dst, ignore_errors=True)  # never mix frames of an older run
    os.makedirs(dst, exist_ok=True)
    for n in sorted(x for x in os.listdir(src_dir) if x.endswith('.png')):
        img = torch.from_numpy(np.asarray(Image.open(os.path.join(src_dir, n)).convert('RGB'))).permute(2, 0, 1)[None].float() / 255
        with torch.no_grad():
            out = model(img.to(dev).half() if dev == 'cuda' else img).float().clamp(0, 1)
        Image.fromarray((out[0].permute(1, 2, 0).cpu().numpy() * 255).round().astype(np.uint8)).save(os.path.join(dst, n), compress_level=1)
    model.to('cpu')
    torch.cuda.empty_cache()
    return dst


def encode(frames_dir, out):
    names = sorted(n for n in os.listdir(frames_dir) if n.endswith('.png'))
    frames = [np.asarray(Image.open(os.path.join(frames_dir, n)).convert('RGB'), dtype=np.float32) for n in names]
    n = len(frames)
    if FLF:
        looped = frames[:-1]  # the last frame is the first one again: drop it for a clean loop
    else:
        looped = []
    # Crossfade loop: the last FADE frames dissolve into the first FADE frames, so the end flows into the start.
    for i in (range(0) if FLF else range(n - FADE)):
        if i < FADE:
            a = (i + 1) / (FADE + 1)
            looped.append(frames[n - FADE + i] * (1 - a) + frames[i] * a)
        else:
            looped.append(frames[i])
    tmp = frames_dir + '_loop'
    shutil.rmtree(tmp, ignore_errors=True)
    os.makedirs(tmp, exist_ok=True)
    for i, f in enumerate(looped):
        Image.fromarray(f.clip(0, 255).astype(np.uint8)).save(os.path.join(tmp, f'{i:04d}.png'), compress_level=1)
    subprocess.run(['ffmpeg', '-loglevel', 'error', '-y', '-framerate', '24', '-i', os.path.join(tmp, '%04d.png'),
                    '-vf', 'scale=1920:1080:force_original_aspect_ratio=increase:flags=lanczos,crop=1920:1080',
                    '-c:v', 'libx264', '-preset', 'slow', '-crf', '21', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', '-an', out], check=True)
    return len(looped)


for name, motion in MOTION.items():
    out = os.path.join(OUT, f'{name}{SUFFIX}.mp4')
    if (ONLY and name not in ONLY) or os.path.exists(out):
        continue
    src = os.path.join(BG, f'{name}.webp')
    if not os.path.exists(src):
        continue
    t0 = time.time()
    raw_dir, count = (FROM, len(os.listdir(FROM))) if FROM else generate(name, src, motion + TAIL)
    t1 = time.time()
    big_dir = upscale(name, raw_dir)
    t2 = time.time()
    frames = encode(big_dir, out)
    print(name, 'ok', count, 'frames ->', frames, 'loop', f'gen {round(t1 - t0)} s, x2 {round(t2 - t1)} s', os.path.getsize(out) // 1024, 'KB', flush=True)
