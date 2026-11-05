"""Looping animated characters for stream overlays.

Flux1-dev (character still) -> Wan 2.2 I2V (smoothMix Q6 GGUF) with the same start and end image, so the
clip loops -> RMBG-2.0 per frame -> transparent VP9 WebM + poster PNG.
Needs local ComfyUI (127.0.0.1:8188) with ComfyUI-GGUF and ComfyUI-RMBG, plus ffmpeg on PATH.
    python gen_chars.py <out_dir> <work_dir> [name,name...]
Existing clips are skipped, so it can be re-run after a crash.
"""
import io, json, os, random, subprocess, sys, time, urllib.parse, urllib.request
import requests
from PIL import Image

API = 'http://127.0.0.1:8188'
OUT, WORK = sys.argv[1], sys.argv[2]
ONLY = sys.argv[3].split(',') if len(sys.argv) > 3 else None
os.makedirs(OUT, exist_ok=True)

GAME = ('stylized 3D video game character render, like a hero from a modern cartoon battle royale game, '
        'clean shading, vibrant colors, full body, centered, standing, facing the viewer, ')
REAL = 'photorealistic, cinematic studio photo, full body, centered, standing, facing the viewer, '
BG = ', isolated on a plain seamless light grey studio background, soft even lighting, no text, no logo'
STILL = ' Static camera, plain background.'

CHARS = {
    'santa-game': (GAME + 'cheerful Santa Claus with a big white beard, red suit and a sack of presents over his shoulder' + BG,
                   'Santa Claus waves his free hand at the viewer and laughs, his belly bounces, then he returns to the exact starting pose.' + STILL),
    'santa-real': (REAL + 'jolly Santa Claus with a real white beard, red velvet suit with white fur trim, black boots' + BG,
                   'Santa Claus waves at the viewer with a warm smile and a small laugh, then returns to the exact starting pose.' + STILL),
    'elf-game': (GAME + 'playful Christmas elf with pointy ears, green outfit and a candy cane' + BG,
                 'The elf hops happily, twirls the candy cane and waves, then returns to the exact starting pose.' + STILL),
    'snowman-game': (GAME + 'friendly snowman with a carrot nose, red scarf and top hat, stick arms' + BG,
                     'The snowman sways from side to side and waves a stick arm, his scarf flutters, then he returns to the exact starting pose.' + STILL),
    'reindeer-game': (GAME + 'cute reindeer with big antlers, a glowing red nose and a jingle bell collar' + BG,
                      'The reindeer nods its head, its red nose glows and blinks, it does a little hop, then returns to the exact starting pose.' + STILL),
    'pumpkin-game': (GAME + 'funny pumpkin-head character with a carved glowing jack-o-lantern head, purple cape and a candy bucket' + BG,
                     'The pumpkin character waves the candy bucket and bobs its head, the carved face glows, then returns to the exact starting pose.' + STILL),
    'witch-game': (GAME + 'cute little witch with a pointy purple hat, black dress and a broom' + BG,
                   'The witch waves her magic wand, a few sparkles appear and fade, then she returns to the exact starting pose.' + STILL),
    'bunny-game': (GAME + 'adorable Easter bunny holding a basket of painted eggs' + BG,
                   'The bunny wiggles its ears, hops in place and lifts the basket, then returns to the exact starting pose.' + STILL),
    'cupid-game': (GAME + 'cute cupid with small white wings, a pink bow and a heart-tipped arrow' + BG,
                   'Cupid flaps the small wings, floats up a little and blows a kiss, then returns to the exact starting pose.' + STILL),
    'partygirl-game': (GAME + 'happy party character in a sparkly golden outfit holding a glass of champagne and a party popper, New Year party hat' + BG,
                       'The character raises the champagne glass in a toast and cheers, then returns to the exact starting pose.' + STILL),
    'gingerbread-game': (GAME + 'cheerful gingerbread man with white icing details and gumdrop buttons' + BG,
                   'The gingerbread man waves both arms and does a little happy jump, then returns to the exact starting pose.' + STILL),
    'penguin-game': (GAME + 'cute penguin wearing a red winter scarf and a knitted hat' + BG,
                   'The penguin flaps its wings, waddles in place and tilts its head, then returns to the exact starting pose.' + STILL),
    'ghost-game': (GAME + 'friendly little white ghost with big eyes and a tiny smile, floating' + BG,
                   'The ghost floats up and down, waves and does a playful spooky wiggle, then returns to the exact starting pose.' + STILL),
    'skeleton-game': (GAME + 'funny cartoon skeleton wearing a party hat' + BG,
                   'The skeleton dances a little, rattles its bones and waves, then returns to the exact starting pose.' + STILL),
    'robot-game': (GAME + 'cute friendly robot with glowing blue eyes and an antenna' + BG,
                   'The robot waves, its eyes blink and the antenna light pulses, then returns to the exact starting pose.' + STILL),
    'dragon-game': (GAME + 'cute baby dragon with small wings, purple and green scales' + BG,
                   'The baby dragon flaps its little wings, blows a small puff of smoke and smiles, then returns to the exact starting pose.' + STILL),
    'cat-game': (GAME + 'cute orange cat with big eyes wearing a gamer headset' + BG,
                   'The cat waves a paw, blinks slowly and its tail swishes, then returns to the exact starting pose.' + STILL),
    'panda-game': (GAME + 'cute chubby panda holding a game controller' + BG,
                   'The panda bobs its head happily and taps the game controller, then returns to the exact starting pose.' + STILL),
    'astronaut-game': (GAME + 'cute little astronaut in a white space suit with a glass helmet' + BG,
                   'The astronaut waves and floats up a little as if in low gravity, then returns to the exact starting pose.' + STILL),
    'knight-game': (GAME + 'brave little knight in shiny armor with a sword and shield' + BG,
                   'The knight raises the sword in a salute and nods, then returns to the exact starting pose.' + STILL),
    'gamer-game': (GAME + 'energetic young gamer character with a gaming headset and a hoodie, holding a controller' + BG,
                   'The gamer cheers, pumps a fist in the air and smiles, then returns to the exact starting pose.' + STILL),
    'angel-game': (GAME + 'cute angel with small white wings and a golden halo' + BG,
                   'The angel flaps the small wings, the halo glows and it waves, then returns to the exact starting pose.' + STILL),
    'elf-real': (REAL + 'christmas elf actor with pointy ears in a green velvet costume' + BG,
                   'The elf waves cheerfully and laughs, then returns to the exact starting pose.' + STILL),
    'witch-real': (REAL + 'woman in an elegant black witch costume with a pointy hat and a broom' + BG,
                   'The witch waves her hand and smiles mysteriously, then returns to the exact starting pose.' + STILL),
    'snowman-real': (REAL + 'real snowman made of snow with a carrot nose, coal buttons, a red scarf and a black hat' + BG,
                   'The scarf flutters in the wind and snowflakes fall around, then returns to the exact starting pose.' + STILL),
    'reindeer-real': (REAL + 'real reindeer with big antlers and a red harness with bells' + BG,
                   'The reindeer turns its head slightly and blinks, the bells jingle, then returns to the exact starting pose.' + STILL),
    'bunny-real': (REAL + 'real fluffy white rabbit sitting next to a basket of painted Easter eggs' + BG,
                   'The rabbit twitches its nose and moves its ears, then returns to the exact starting pose.' + STILL),
}


def post(path, data):
    req = urllib.request.Request(API + path, data=json.dumps(data).encode(), headers={'Content-Type': 'application/json'})
    return json.loads(urllib.request.urlopen(req).read())


def wait(pid, limit=1500):
    t0 = time.time()
    while time.time() - t0 < limit:
        time.sleep(3)
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


def still(prompt):
    wf = {
        '1': {'class_type': 'UNETLoader', 'inputs': {'unet_name': 'flux1-dev-fp8.safetensors', 'weight_dtype': 'fp8_e4m3fn'}},
        '2': {'class_type': 'DualCLIPLoader', 'inputs': {'clip_name1': 'clip_l.safetensors', 'clip_name2': 't5xxl_fp8_e4m3fn_scaled.safetensors', 'type': 'flux'}},
        '3': {'class_type': 'VAELoader', 'inputs': {'vae_name': 'ae.safetensors'}},
        '4': {'class_type': 'CLIPTextEncode', 'inputs': {'text': prompt, 'clip': ['2', 0]}},
        '5': {'class_type': 'FluxGuidance', 'inputs': {'conditioning': ['4', 0], 'guidance': 3.5}},
        '6': {'class_type': 'EmptySD3LatentImage', 'inputs': {'width': 832, 'height': 1216, 'batch_size': 1}},
        '7': {'class_type': 'KSampler', 'inputs': {'model': ['1', 0], 'positive': ['5', 0], 'negative': ['5', 0], 'latent_image': ['6', 0],
                                                   'seed': random.randint(1, 2**31), 'steps': 24, 'cfg': 1.0, 'sampler_name': 'euler', 'scheduler': 'simple', 'denoise': 1.0}},
        '8': {'class_type': 'VAEDecode', 'inputs': {'samples': ['7', 0], 'vae': ['3', 0]}},
        '9': {'class_type': 'SaveImage', 'inputs': {'images': ['8', 0], 'filename_prefix': 'vxh_overlays/char_still'}},
    }
    return fetch(wait(post('/prompt', {'prompt': wf})['prompt_id'])['outputs']['9']['images'][0])


def animate(png_bytes, name, prompt, w=480, h=720, length=49):
    """Wan 2.2 I2V, high + low noise experts, same start and end image."""
    up = requests.post(f'{API}/upload/image', files={'image': (f'{name}.png', png_bytes, 'image/png')}, data={'overwrite': 'true'}).json()
    neg = 'blurry, distorted, extra limbs, deformed hands, camera movement, zoom, background change, text, watermark, flicker'
    ksampler = lambda model, latent, start, end, noise: {'class_type': 'KSamplerAdvanced', 'inputs': {
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
        '7': {'class_type': 'CLIPTextEncode', 'inputs': {'text': prompt, 'clip': ['3', 0]}},
        '8': {'class_type': 'CLIPTextEncode', 'inputs': {'text': neg, 'clip': ['3', 0]}},
        '9': {'class_type': 'WanFirstLastFrameToVideo', 'inputs': {'positive': ['7', 0], 'negative': ['8', 0], 'vae': ['4', 0], 'width': w, 'height': h,
                                                                  'length': length, 'batch_size': 1, 'start_image': ['6', 0], 'end_image': ['6', 0]}},
        '10': {'class_type': 'ModelSamplingSD3', 'inputs': {'model': ['1', 0], 'shift': 8.0}},
        '11': {'class_type': 'ModelSamplingSD3', 'inputs': {'model': ['2', 0], 'shift': 8.0}},
        '12': ksampler(['10', 0], ['9', 2], 0, 3, True),
        '13': ksampler(['11', 0], ['12', 0], 3, 10000, False),
        '14': {'class_type': 'VAEDecode', 'inputs': {'samples': ['13', 0], 'vae': ['4', 0]}},
        '15': {'class_type': 'RMBG', 'inputs': {'image': ['14', 0], 'model': 'RMBG-2.0', 'sensitivity': 1.0, 'process_res': 768, 'mask_blur': 0,
                                                'mask_offset': 0, 'invert_output': False, 'refine_foreground': True, 'background': 'Alpha'}},
        '16': {'class_type': 'SaveImage', 'inputs': {'images': ['15', 0], 'filename_prefix': f'vxh_overlays/char_{name}'}},
    }
    return wait(post('/prompt', {'prompt': wf})['prompt_id'])['outputs']['16']['images']


for name, (look, motion) in CHARS.items():
    if (ONLY and name not in ONLY) or os.path.exists(os.path.join(OUT, f'{name}.webm')):
        continue
    t0 = time.time()
    frames = animate(still(look), name, motion)
    fdir = os.path.join(WORK, name)
    os.makedirs(fdir, exist_ok=True)
    for f in os.listdir(fdir):
        os.remove(os.path.join(fdir, f))
    for i, im in enumerate(frames):
        open(os.path.join(fdir, f'{i:04d}.png'), 'wb').write(fetch(im))
    if len(frames) > 2:  # the last frame repeats the first; dropping it removes the stutter
        os.remove(os.path.join(fdir, f'{len(frames) - 1:04d}.png'))
    webm = os.path.join(OUT, f'{name}.webm')
    subprocess.run(['ffmpeg', '-loglevel', 'error', '-y', '-framerate', '16', '-i', os.path.join(fdir, '%04d.png'),
                    '-c:v', 'libvpx-vp9', '-pix_fmt', 'yuva420p', '-b:v', '0', '-crf', '34', '-row-mt', '1', '-an', webm], check=True)
    Image.open(os.path.join(fdir, '0000.png')).save(os.path.join(OUT, f'{name}.png'), optimize=True)
    print(name, 'ok', len(frames), 'frames', round(time.time() - t0), 's', os.path.getsize(webm) // 1024, 'KB', flush=True)
