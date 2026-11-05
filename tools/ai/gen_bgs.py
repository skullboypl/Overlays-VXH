"""4K photo backgrounds for the scenes: Flux1-dev at 1920x1088 -> 4x-UltraSharp -> 3840x2160 WebP + thumb.

Also lifts the older 1920x1080 backgrounds to 4K with the same upscaler. Run with ComfyUI's Python:
    python gen_bgs.py <public/bg dir> [id,id...]
Writes public/bg/<id>.webp, <id>-thumb.webp and keeps src/overlays/photo-bgs.json (the list the app reads)
in sync. Existing 4K files are skipped, so the script can be re-run after a crash.
"""
import io, json, os, random, sys, time, urllib.parse, urllib.request
import requests
from PIL import Image

API = 'http://127.0.0.1:8188'
BG = sys.argv[1]
ONLY = sys.argv[2].split(',') if len(sys.argv) > 2 else None
LIST = os.path.join(os.path.dirname(__file__), '..', '..', 'src', 'overlays', 'photo-bgs.json')

LOOK = ', photorealistic, cinematic lighting, ultra detailed, sharp focus, 8k photography, wide shot, no people, no text, no letters, no watermark'
PROMPTS = {
    # Christmas
    'xmas-village': 'snowy european christmas village street at night, warm glowing shop windows, string lights across the street, snow falling softly',
    'xmas-cabin': 'cozy wooden log cabin interior on christmas eve, crackling fireplace, decorated christmas tree with warm lights, snowy window',
    'xmas-bokeh': 'close-up of a christmas tree with golden fairy lights and red baubles, dreamy bokeh background, warm tones',
    # Winter
    'winter-lake': 'frozen mountain lake at sunrise, snowy pine trees, pink and blue sky reflected on the ice, crisp winter morning',
    'winter-street': 'quiet city street at night during heavy snowfall, glowing street lamps, snow-covered cars and trees, blue hour',
    'winter-pines': 'deep snowy pine forest at blue hour, soft moonlight, sparkling fresh snow, calm and quiet',
    # New Year
    'ny-fireworks': 'colorful new year fireworks exploding over a city skyline and river at midnight, reflections on the water',
    'ny-party': 'luxury new year party table with champagne glasses, gold confetti and sparklers, golden bokeh lights',
    'ny-gold': 'gold and silver confetti and streamers falling against a dark elegant background, shiny glitter, festive mood',
    # Valentine
    'val-roses': 'romantic candlelit table with red roses and rose petals, soft warm light, elegant valentine evening',
    'val-hearts': 'soft pink and red heart-shaped bokeh lights, dreamy romantic background, gentle glow',
    'val-city': 'romantic old town bridge over a river at dusk with warm lanterns and string lights, valentine atmosphere',
    # Easter
    'easter-meadow': 'sunny spring meadow with colorful painted easter eggs in the grass, tulips and daisies, soft morning light',
    'easter-table': 'bright easter breakfast table with pastel painted eggs, spring flowers, wicker basket, sunlight from a window',
    'easter-garden': 'blooming spring garden with cherry and magnolia blossoms, fresh green grass, warm sunlight, peaceful',
    # Halloween
    'hw-mansion': 'haunted victorian mansion on a hill under a huge full moon, bare twisted trees, fog, bats in the sky',
    'hw-forest': 'foggy dark forest path lined with glowing jack-o-lanterns at night, eerie orange light, mist',
    'hw-witch': 'witch cottage interior at night, bubbling cauldron, candles, potion bottles, spell books, purple and orange light',
    # 11 November (Polish Independence Day)
    'pl-oldtown': 'historic old town market square in Warsaw at dusk, colorful tenement houses, white and red flags hanging, warm street lights',
    'pl-flags': 'white and red flags waving in the wind against a dramatic blue sky with sunbeams, proud and festive',
    'pl-tatra': 'Tatra mountains at sunrise, golden light on rocky peaks, mist in the valleys, majestic landscape',
    # Birthday
    'bday-party': 'colorful birthday party room with balloons, streamers, confetti and gift boxes, warm festive light',
    'bday-cake': 'birthday cake with lit candles on a table, warm bokeh lights in the background, cozy celebration',
    'bday-neon': 'neon-lit party club with colorful lights, balloons and confetti in the air, vibrant celebration',
    # Everyday
    'gaming-room': 'dark gaming room at night with RGB lights, multiple monitors glowing, LED strips, cozy streamer setup',
    'space-window': 'view from a spaceship window of the planet earth and stars, soft blue glow, sci-fi interior frame',
    'rainy-cafe': 'cozy cafe interior on a rainy evening, raindrops on the big window, warm lamps, coffee cups, city lights outside',
    'aurora-peaks': 'vivid green and purple aurora borealis over snowy mountain peaks and a still lake, starry night',
    'cyber-alley': 'rainy cyberpunk city alley at night, glowing neon signs, wet reflective street, steam',
    'underwater': 'underwater coral reef with sun rays through the blue water, colorful fish, calm ocean',
}


def post(path, data):
    req = urllib.request.Request(API + path, data=json.dumps(data).encode(), headers={'Content-Type': 'application/json'})
    return json.loads(urllib.request.urlopen(req).read())


def run(wf, limit=1500):
    pid = post('/prompt', {'prompt': wf})['prompt_id']
    t0 = time.time()
    while time.time() - t0 < limit:
        time.sleep(3)
        h = json.loads(urllib.request.urlopen(f'{API}/history/{pid}').read())
        if pid in h:
            e = h[pid]
            if e.get('status', {}).get('status_str') == 'error':
                raise RuntimeError(json.dumps(e['status'])[:1200])
            im = next(o for o in e['outputs'].values() if 'images' in o)['images'][0]
            q = urllib.parse.urlencode({'filename': im['filename'], 'subfolder': im['subfolder'], 'type': im['type']})
            return Image.open(io.BytesIO(urllib.request.urlopen(f'{API}/view?{q}').read()))
    raise TimeoutError(pid)


UPSCALE = lambda src: {
    '20': {'class_type': 'UpscaleModelLoader', 'inputs': {'model_name': '4x-UltraSharp.pth'}},
    '21': {'class_type': 'ImageUpscaleWithModel', 'inputs': {'upscale_model': ['20', 0], 'image': src}},
    '22': {'class_type': 'ImageScale', 'inputs': {'image': ['21', 0], 'upscale_method': 'lanczos', 'width': 3840, 'height': 2160, 'crop': 'center'}},
    '23': {'class_type': 'SaveImage', 'inputs': {'images': ['22', 0], 'filename_prefix': 'vxh_overlays/bg4k'}},
}


def generate(prompt):
    wf = {
        '1': {'class_type': 'UNETLoader', 'inputs': {'unet_name': 'flux1-dev-fp8.safetensors', 'weight_dtype': 'fp8_e4m3fn'}},
        '2': {'class_type': 'DualCLIPLoader', 'inputs': {'clip_name1': 'clip_l.safetensors', 'clip_name2': 't5xxl_fp8_e4m3fn_scaled.safetensors', 'type': 'flux'}},
        '3': {'class_type': 'VAELoader', 'inputs': {'vae_name': 'ae.safetensors'}},
        '4': {'class_type': 'CLIPTextEncode', 'inputs': {'text': prompt + LOOK, 'clip': ['2', 0]}},
        '5': {'class_type': 'FluxGuidance', 'inputs': {'conditioning': ['4', 0], 'guidance': 3.0}},
        '6': {'class_type': 'EmptySD3LatentImage', 'inputs': {'width': 1920, 'height': 1088, 'batch_size': 1}},
        '7': {'class_type': 'KSampler', 'inputs': {'model': ['1', 0], 'positive': ['5', 0], 'negative': ['5', 0], 'latent_image': ['6', 0],
                                                   'seed': random.randint(1, 2**31), 'steps': 26, 'cfg': 1.0, 'sampler_name': 'euler', 'scheduler': 'simple', 'denoise': 1.0}},
        '8': {'class_type': 'VAEDecode', 'inputs': {'samples': ['7', 0], 'vae': ['3', 0]}},
    }
    wf.update(UPSCALE(['8', 0]))
    return run(wf)


def upscale_existing(path, name):
    with open(path, 'rb') as f:
        up = requests.post(f'{API}/upload/image', files={'image': (f'bg_src_{name}.webp', f.read(), 'image/webp')}, data={'overwrite': 'true'}).json()
    wf = {'5': {'class_type': 'LoadImage', 'inputs': {'image': up['name']}}}
    wf.update(UPSCALE(['5', 0]))
    return run(wf)


def save(img, name):
    img = img.convert('RGB')
    img.save(os.path.join(BG, f'{name}.webp'), 'WEBP', quality=84, method=6)
    img.resize((384, 216), Image.LANCZOS).save(os.path.join(BG, f'{name}-thumb.webp'), 'WEBP', quality=80)


def register(name):
    ids = json.load(open(LIST, encoding='utf-8')) if os.path.exists(LIST) else []
    if name not in ids:
        ids.append(name)
        json.dump(ids, open(LIST, 'w', encoding='utf-8'), indent=1)


def main():
    # The older 1080p backgrounds first: same names, just sharper.
    for f in sorted(os.listdir(BG)):
        name = f[:-5]
        if not f.endswith('.webp') or name.endswith('-thumb') or (ONLY and name not in ONLY):
            continue
        p = os.path.join(BG, f)
        if Image.open(p).size[0] >= 3840:
            continue
        t0 = time.time()
        save(upscale_existing(p, name), name)
        print(name, 'upscaled to 4K', round(time.time() - t0), 's', flush=True)
    for name, prompt in PROMPTS.items():
        if (ONLY and name not in ONLY) or os.path.exists(os.path.join(BG, f'{name}.webp')):
            if os.path.exists(os.path.join(BG, f'{name}.webp')):
                register(name)
            continue
        t0 = time.time()
        save(generate(prompt), name)
        register(name)
        print(name, 'ok', round(time.time() - t0), 's', os.path.getsize(os.path.join(BG, f'{name}.webp')) // 1024, 'KB', flush=True)


if __name__ == '__main__':
    main()
