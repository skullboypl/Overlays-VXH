"""Holiday webcam frames: Flux1-dev -> RMBG-2.0 cut-out -> forced transparent centre -> RGBA WebP.

Needs a local ComfyUI on 127.0.0.1:8188 with flux1-dev-fp8, clip_l, t5xxl_fp8_e4m3fn_scaled, ae and the
ComfyUI-RMBG nodes. Run with ComfyUI's embedded Python (it has Pillow):
    python gen_frames.py <out_dir> [theme-style,theme-style...]
Existing files are skipped, so the script can be re-run after a crash.
"""
import io, json, os, random, sys, time, urllib.parse, urllib.request
import numpy as np
from PIL import Image, ImageChops, ImageDraw, ImageFilter

API = 'http://127.0.0.1:8188'
OUT = sys.argv[1] if len(sys.argv) > 1 else 'src/assets/frames'
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
    '3d': 'high-end 3D render (Blender, Octane) of decorative 3D objects: {d}, with real depth, volumetric soft shadows and glossy reflections, '
          'arranged as a thick frame border along all four edges of the image, like premium 3D game assets, ' + EMPTY,
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


def background_mask(raw):
    """Plain background the cut-out model kept: flood-filled from the empty centre and from plain corners."""
    W, H = raw.size
    work = raw.copy()
    KEY = (255, 0, 255)
    seeds = [(W // 2, H // 2), (W // 3, H // 2), (2 * W // 3, H // 2), (W // 2, H // 3), (W // 2, 2 * H // 3)]
    for x, y in [(2, 2), (W - 3, 2), (2, H - 3), (W - 3, H - 3), (W // 2, 2), (W // 2, H - 3), (2, H // 2), (W - 3, H // 2)]:
        r, g, b = raw.getpixel((x, y))
        if max(r, g, b) - min(r, g, b) < 18 and (max(r, g, b) < 40 or min(r, g, b) > 225):
            seeds.append((x, y))
    for xy in seeds:
        if work.getpixel(xy) != KEY:
            ImageDraw.floodfill(work, xy, KEY, thresh=46)
    r, g, b = work.split()
    mask = ImageChops.multiply(ImageChops.multiply(r.point(lambda v: 255 if v == 255 else 0), g.point(lambda v: 255 if v == 0 else 0)),
                               b.point(lambda v: 255 if v == 255 else 0))
    return mask.filter(ImageFilter.MaxFilter(3)).filter(ImageFilter.GaussianBlur(1.5))


def unmultiply_black(raw):
    """Neon light on black -> light with its own alpha.

    Colour is the light's hue at full brightness and alpha its brightness above the image's own black
    level (Flux sometimes paints a dim wall instead of pure black). The faint ambient haze fades out
    smoothly: a hard threshold shows up as torn, blotchy edges over a camera.
    """
    src = np.asarray(raw, dtype=np.float32)
    v0 = src.max(axis=2)
    black = float(np.percentile(v0, 50))
    rgb = src * np.clip((v0 - black) / np.maximum(v0, 1), 0, 1)[..., None]
    v = rgb.max(axis=2)
    knee = np.asarray(Image.fromarray(np.clip(v, 0, 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(2)), dtype=np.float32)
    t = np.clip((knee - 26) / (76 - 26), 0, 1)
    a = (v / 255) * t * t * (3 - 2 * t)
    col = rgb / np.maximum(v, 1)[..., None] * 255
    return Image.fromarray(np.clip(col, 0, 255).astype(np.uint8)), Image.fromarray(np.clip(a * 255, 0, 255).astype(np.uint8))


def rebuild_neon(raw):
    """For raws whose bloom floods the whole picture: keep only the bright tube cores and grow an even
    glow from them, tinted with the light's own colour."""
    src = np.asarray(raw, dtype=np.float32)
    lum = src.min(axis=2)  # tube cores are near white; the bloom is saturated, so it is dark here
    t = np.clip((lum - 110) / (190 - 110), 0, 1)
    core = t * t * (3 - 2 * t)
    hue_src = np.asarray(raw.filter(ImageFilter.GaussianBlur(6)), dtype=np.float32)
    hue = hue_src / np.maximum(hue_src.max(axis=2), 1)[..., None]
    m = Image.fromarray((core * 255).astype(np.uint8))
    glow = (np.asarray(m.filter(ImageFilter.GaussianBlur(9)), dtype=np.float32) * 1.4
            + np.asarray(m.filter(ImageFilter.GaussianBlur(26)), dtype=np.float32) * 0.9) / 255
    glow_rgb = hue * np.clip(glow, 0, 1)[..., None] * 255
    core_rgb = src * core[..., None]
    light = 255 - (255 - core_rgb) * (255 - glow_rgb) / 255
    return Image.fromarray(np.clip(light, 0, 255).astype(np.uint8))


# Neon raws where Flux flooded the background with bloom.
REBUILD = {'valentine-neon'}


def finish(raw, cut, path, glow=False):
    W, H = 1920, 1080
    raw = raw.convert('RGB').resize((W, H), Image.LANCZOS)
    alpha = cut.convert('RGBA').resize((W, H), Image.LANCZOS).split()[3]
    if glow:
        # Neon: alpha comes from the light itself, colours are un-multiplied from black.
        if os.path.basename(path)[:-5] in REBUILD:
            raw = rebuild_neon(raw)
        raw, alpha = unmultiply_black(raw)
        hole = Image.new('L', (W, H), 255)
        ImageDraw.Draw(hole).rounded_rectangle((int(W * 0.15), int(H * 0.2), int(W * 0.85), int(H * 0.8)), radius=60, fill=0)
        alpha = ImageChops.multiply(alpha, hole.filter(ImageFilter.GaussianBlur(27)))
        Image.merge('RGBA', (*raw.split(), alpha)).save(path, 'WEBP', quality=92, method=6)
        return
    # Guard: if the flood fill would wipe out most of the artwork (dark decorations touching the
    # background), keep the cut-out model's mask alone.
    cleaned = ImageChops.subtract(alpha, background_mask(raw))
    before = sum(alpha.point(lambda v: 1 if v > 128 else 0).getdata())
    after = sum(cleaned.point(lambda v: 1 if v > 128 else 0).getdata())
    if before == 0 or after / before > 0.45:
        alpha = cleaned
    # The camera must stay visible: clear a feathered rectangle in the middle.
    hole = Image.new('L', (W, H), 255)
    ImageDraw.Draw(hole).rounded_rectangle((int(W * 0.15), int(H * 0.2), int(W * 0.85), int(H * 0.8)), radius=60, fill=0)
    alpha = ImageChops.multiply(alpha, hole.filter(ImageFilter.GaussianBlur(27)))
    Image.merge('RGBA', (*raw.split(), alpha)).save(path, 'WEBP', quality=90, method=6)


def main():
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
              finish(fetch(e['outputs']['9']['images'][0]), fetch(e['outputs']['11']['images'][0]), f'{OUT}/{name}.webp', glow=style == 'neon')
              print(name, 'ok', round(time.time() - t0), 's', flush=True)
              break


if __name__ == '__main__':
    main()
