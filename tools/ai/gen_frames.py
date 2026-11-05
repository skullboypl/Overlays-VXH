"""Holiday webcam frames: Flux1-dev -> RMBG-2.0 cut-out -> forced transparent centre -> RGBA WebP.

Needs a local ComfyUI on 127.0.0.1:8188 with flux1-dev-fp8, clip_l, t5xxl_fp8_e4m3fn_scaled, ae and the
ComfyUI-RMBG nodes. Run with ComfyUI's embedded Python (it has Pillow):
    python gen_frames.py <out_dir> [theme-style,theme-style...]
Existing files are skipped, so the script can be re-run after a crash.
"""
import io, json, os, random, sys, time, urllib.parse, urllib.request
from PIL import Image, ImageChops, ImageDraw, ImageFilter

API = 'http://127.0.0.1:8188'
OUT = sys.argv[1]
ONLY = sys.argv[2].split(',') if len(sys.argv) > 2 else None

DETAILS = {
    'xmas': 'lush pine garland with red and gold baubles, warm glowing fairy lights, holly berries, candy canes and a little snow on the branches',
    'winter': 'frosted pine branches, hanging icicles, sparkling snowflakes, soft snow drifts and icy blue crystals',
    'newyear': 'golden and silver balloons, champagne glasses, gold confetti, sparklers, glitter and shiny streamers',
    'valentine': 'red and pink roses, glossy hearts, scattered rose petals and satin ribbons',
    'easter': 'pastel painted easter eggs, tulips and daisies, fresh green grass and fluffy yellow chicks',
    'halloween': 'carved glowing jack-o-lanterns, spider webs, flying bats, orange autumn leaves, melting candles and purple mist',
    'independence': 'elegant white and red ribbons, small white-and-red flags, white and red roses and carnations',
    'birthday': 'colorful balloons, party streamers, confetti, wrapped gift boxes and birthday candles',
}
NEON = {
    'xmas': 'christmas trees, baubles, stars and candy canes in red, green and gold',
    'winter': 'snowflakes, icicles and pine trees in icy blue and white',
    'newyear': 'champagne glasses, fireworks bursts and stars in gold and magenta',
    'valentine': 'hearts, arrows and roses in pink and red',
    'easter': 'easter eggs, bunnies and tulips in pastel pink, mint and yellow',
    'halloween': 'pumpkins, bats, spider webs and ghosts in orange, purple and green',
    'independence': 'white and red ribbons, stars and laurel branches in white and red',
    'birthday': 'balloons, gift boxes, cake and confetti in rainbow colors',
}
EMPTY = 'the large rectangular center is completely empty plain black, solid pure black background, no text, no letters, no people'
STYLES = {
    'real': 'photorealistic decorative {d} forming a thick frame border along all four edges of the image like a picture frame, '
            'isolated, studio product photo, sharp focus, rich detail, ' + EMPTY,
    '3d': 'stylized 3D video game art of a decorative {d} forming a thick frame border along all four edges of the image, '
          'like props from a modern cartoon battle royale game, glossy materials, soft studio lighting, ' + EMPTY,
    'cartoon': 'flat 2D cartoon illustration of a decorative {d} forming a thick frame border along all four edges of the image, '
               'bold clean outlines, cheerful saturated colors, sticker style, vector art, ' + EMPTY,
    'neon': 'glowing neon light tube sign art: a thin frame border along all four edges of the image decorated with neon line drawings of {n}, '
            'vibrant glowing neon tubes with soft bloom, realistic neon sign, ' + EMPTY,
}


def wf(prompt, seed):
    return {
        '1': {'class_type': 'UNETLoader', 'inputs': {'unet_name': 'flux1-dev-fp8.safetensors', 'weight_dtype': 'fp8_e4m3fn'}},
        '2': {'class_type': 'DualCLIPLoader', 'inputs': {'clip_name1': 'clip_l.safetensors', 'clip_name2': 't5xxl_fp8_e4m3fn_scaled.safetensors', 'type': 'flux'}},
        '3': {'class_type': 'VAELoader', 'inputs': {'vae_name': 'ae.safetensors'}},
        '4': {'class_type': 'CLIPTextEncode', 'inputs': {'text': prompt, 'clip': ['2', 0]}},
        '5': {'class_type': 'FluxGuidance', 'inputs': {'conditioning': ['4', 0], 'guidance': 3.5}},
        '6': {'class_type': 'EmptySD3LatentImage', 'inputs': {'width': 1536, 'height': 864, 'batch_size': 1}},
        '7': {'class_type': 'KSampler', 'inputs': {'model': ['1', 0], 'positive': ['5', 0], 'negative': ['5', 0], 'latent_image': ['6', 0],
                                                   'seed': seed, 'steps': 22, 'cfg': 1.0, 'sampler_name': 'euler', 'scheduler': 'simple', 'denoise': 1.0}},
        '8': {'class_type': 'VAEDecode', 'inputs': {'samples': ['7', 0], 'vae': ['3', 0]}},
        '9': {'class_type': 'SaveImage', 'inputs': {'images': ['8', 0], 'filename_prefix': 'vxh_overlays/frame_raw'}},
        '10': {'class_type': 'RMBG', 'inputs': {'image': ['8', 0], 'model': 'RMBG-2.0', 'sensitivity': 1.0, 'process_res': 1024, 'mask_blur': 0,
                                                'mask_offset': 0, 'invert_output': False, 'refine_foreground': True, 'background': 'Alpha'}},
        '11': {'class_type': 'SaveImage', 'inputs': {'images': ['10', 0], 'filename_prefix': 'vxh_overlays/frame_cut'}},
    }


def post(path, data):
    req = urllib.request.Request(API + path, data=json.dumps(data).encode(), headers={'Content-Type': 'application/json'})
    return json.loads(urllib.request.urlopen(req).read())


def fetch(im):
    q = urllib.parse.urlencode({'filename': im['filename'], 'subfolder': im['subfolder'], 'type': im['type']})
    return Image.open(io.BytesIO(urllib.request.urlopen(f'{API}/view?{q}').read()))


def finish(raw, cut, path):
    W, H = 1280, 720
    raw = raw.convert('RGB').resize((W, H), Image.LANCZOS)
    alpha = cut.convert('RGBA').resize((W, H), Image.LANCZOS).split()[3]
    # Glowing bits (lights, neon) on black can be missed by the cut-out; keep anything clearly bright.
    lum = raw.convert('L').point(lambda v: max(0, min(255, (v - 28) * 4)))
    alpha = ImageChops.lighter(alpha, lum)
    # The camera must stay visible: clear a feathered rectangle in the middle.
    hole = Image.new('L', (W, H), 255)
    ImageDraw.Draw(hole).rounded_rectangle((int(W * 0.15), int(H * 0.2), int(W * 0.85), int(H * 0.8)), radius=40, fill=0)
    alpha = ImageChops.multiply(alpha, hole.filter(ImageFilter.GaussianBlur(18)))
    Image.merge('RGBA', (*raw.split(), alpha)).save(path, 'WEBP', quality=84, method=6)


for theme, d in DETAILS.items():
    for style, tpl in STYLES.items():
        name = f'{theme}-{style}'
        if (ONLY and name not in ONLY and theme not in ONLY) or os.path.exists(f'{OUT}/{name}.webp'):
            continue
        pid = post('/prompt', {'prompt': wf(tpl.format(d=d, n=NEON[theme]), random.randint(1, 2**31))})['prompt_id']
        t0 = time.time()
        while True:
            time.sleep(2)
            if time.time() - t0 > 1200:
                raise TimeoutError(name)
            hist = json.loads(urllib.request.urlopen(f'{API}/history/{pid}').read())
            if pid not in hist:
                continue
            e = hist[pid]
            if e.get('status', {}).get('status_str') == 'error':
                raise RuntimeError(f'{name}: ' + json.dumps(e['status'])[:800])
            finish(fetch(e['outputs']['9']['images'][0]), fetch(e['outputs']['11']['images'][0]), f'{OUT}/{name}.webp')
            print(name, 'ok', round(time.time() - t0), 's', flush=True)
            break
