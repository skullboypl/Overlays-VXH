"""Looping realistic video backgrounds from the photo backgrounds in public/bg.

Wan 2.2 I2V (smoothMix Q6 GGUF) with the photo as both first and last frame, so the clip loops
seamlessly; ffmpeg upscales to 1280x720 H.264. Existing clips are skipped.
    python gen_videos.py <bg_dir> <out_dir> [id,id...]
"""
import json, os, random, subprocess, sys, tempfile, time, urllib.parse, urllib.request
import requests

API = 'http://127.0.0.1:8188'
BG, OUT = sys.argv[1], sys.argv[2]
ONLY = sys.argv[3].split(',') if len(sys.argv) > 3 else None
os.makedirs(OUT, exist_ok=True)

STILL = ' The camera is completely static, the composition does not change, seamless loop.'
MOTION = {
    'cozy': 'Rain streaks run down the big window, distant city lights twinkle and shimmer, the curtains sway very gently, the LED glow softly pulses.',
    'city': 'Neon signs flicker and glow, light fog drifts slowly across the skyline, tiny lights twinkle on the skyscrapers.',
    'winter': 'Snow falls gently, the green aurora borealis waves slowly across the sky, the cabin windows glow and flicker warmly.',
    'xmas': 'The fireplace flames dance, the christmas tree fairy lights twinkle, soft bokeh lights shimmer.',
    'halloween': 'Fog rolls slowly over the pumpkin field, the jack-o-lantern candles flicker, the full moon glows.',
    'nebula': 'The colorful nebula clouds swirl very slowly, stars twinkle, a faint glow pulses.',
    'sunset': 'The pink clouds drift slowly across the sky, the sun shimmers and glows.',
    'abstract': 'The glossy liquid shapes flow and morph slowly, the spheres float gently, light reflections move across the surfaces.',
    'sakura': 'Cherry blossom petals fall slowly, the paper lanterns flicker, ripples move across the pond.',
    'beach': 'Waves roll gently onto the shore, the palm leaves sway in the breeze, the sun glitters on the water.',
}


def post(path, data):
    req = urllib.request.Request(API + path, data=json.dumps(data).encode(), headers={'Content-Type': 'application/json'})
    return json.loads(urllib.request.urlopen(req).read())


def wait(pid, limit=1700):
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


def fetch(im):
    q = urllib.parse.urlencode({'filename': im['filename'], 'subfolder': im['subfolder'], 'type': im['type']})
    return urllib.request.urlopen(f'{API}/view?{q}').read()


def clip(name, image_path, prompt, w=832, h=480, length=81):
    with open(image_path, 'rb') as f:
        up = requests.post(f'{API}/upload/image', files={'image': (f'bg_{name}.webp', f.read(), 'image/webp')}, data={'overwrite': 'true'}).json()
    neg = 'camera movement, zoom, pan, cut, morphing scene, people, text, watermark, blurry, flicker, distortion'
    ks = lambda model, latent, start, end, noise: {'class_type': 'KSamplerAdvanced', 'inputs': {
        'model': model, 'add_noise': 'enable' if noise else 'disable', 'noise_seed': random.randint(1, 2**31), 'steps': 6, 'cfg': 1.0,
        'sampler_name': 'euler', 'scheduler': 'simple', 'positive': ['9', 0], 'negative': ['9', 1], 'latent_image': latent,
        'start_at_step': start, 'end_at_step': end, 'return_with_leftover_noise': 'enable' if noise else 'disable'}}
    wf = {
        '1': {'class_type': 'UnetLoaderGGUF', 'inputs': {'unet_name': 'smoothMixWan22I2VT2V_i2vHigh-Q6_K.gguf'}},
        '2': {'class_type': 'UnetLoaderGGUF', 'inputs': {'unet_name': 'smoothMixWan22I2VT2V_i2vLow-Q6_K.gguf'}},
        '3': {'class_type': 'CLIPLoader', 'inputs': {'clip_name': 'umt5_xxl_fp8_e4m3fn_scaled.safetensors', 'type': 'wan', 'device': 'default'}},
        '4': {'class_type': 'VAELoader', 'inputs': {'vae_name': 'wan_2.1_vae.safetensors'}},
        '5': {'class_type': 'LoadImage', 'inputs': {'image': up['name']}},
        '6': {'class_type': 'ImageScale', 'inputs': {'image': ['5', 0], 'upscale_method': 'lanczos', 'width': w, 'height': h, 'crop': 'center'}},
        '7': {'class_type': 'CLIPTextEncode', 'inputs': {'text': prompt + STILL, 'clip': ['3', 0]}},
        '8': {'class_type': 'CLIPTextEncode', 'inputs': {'text': neg, 'clip': ['3', 0]}},
        '9': {'class_type': 'WanFirstLastFrameToVideo', 'inputs': {'positive': ['7', 0], 'negative': ['8', 0], 'vae': ['4', 0], 'width': w, 'height': h,
                                                                  'length': length, 'batch_size': 1, 'start_image': ['6', 0], 'end_image': ['6', 0]}},
        '10': {'class_type': 'ModelSamplingSD3', 'inputs': {'model': ['1', 0], 'shift': 8.0}},
        '11': {'class_type': 'ModelSamplingSD3', 'inputs': {'model': ['2', 0], 'shift': 8.0}},
        '12': ks(['10', 0], ['9', 2], 0, 3, True),
        '13': ks(['11', 0], ['12', 0], 3, 10000, False),
        '14': {'class_type': 'VAEDecode', 'inputs': {'samples': ['13', 0], 'vae': ['4', 0]}},
        '15': {'class_type': 'SaveImage', 'inputs': {'images': ['14', 0], 'filename_prefix': f'vxh_overlays/video_{name}'}},
    }
    return wait(post('/prompt', {'prompt': wf})['prompt_id'])['outputs']['15']['images']


for name, motion in MOTION.items():
    out = os.path.join(OUT, f'{name}.mp4')
    if (ONLY and name not in ONLY) or os.path.exists(out):
        continue
    src = os.path.join(BG, f'{name}.webp')
    if not os.path.exists(src):
        continue
    t0 = time.time()
    frames = clip(name, src, motion)
    with tempfile.TemporaryDirectory() as tmp:
        for i, im in enumerate(frames[:-1]):  # last frame equals the first: drop it for a clean loop
            open(os.path.join(tmp, f'{i:04d}.png'), 'wb').write(fetch(im))
        subprocess.run(['ffmpeg', '-loglevel', 'error', '-y', '-framerate', '16', '-i', os.path.join(tmp, '%04d.png'),
                        '-vf', 'scale=1280:720:flags=lanczos,fps=24', '-c:v', 'libx264', '-preset', 'slow', '-crf', '24',
                        '-pix_fmt', 'yuv420p', '-movflags', '+faststart', '-an', out], check=True)
    print(name, 'ok', len(frames), 'frames', round(time.time() - t0), 's', os.path.getsize(out) // 1024, 'KB', flush=True)
