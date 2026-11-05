"""Adds 17 more characters to the generator and their Polish names to the app."""
ROOT = r'X:/INNE/DEV_PROGRAMOWANIE/overlays/'

NEW = {
    # id: (label, look, motion)
    'gingerbread-game': ('Piernikowy ludzik', 'GAME', 'cheerful gingerbread man with white icing details and gumdrop buttons', 'The gingerbread man waves both arms and does a little happy jump'),
    'penguin-game': ('Pingwin', 'GAME', 'cute penguin wearing a red winter scarf and a knitted hat', 'The penguin flaps its wings, waddles in place and tilts its head'),
    'ghost-game': ('Duszek', 'GAME', 'friendly little white ghost with big eyes and a tiny smile, floating', 'The ghost floats up and down, waves and does a playful spooky wiggle'),
    'skeleton-game': ('Szkielet', 'GAME', 'funny cartoon skeleton wearing a party hat', 'The skeleton dances a little, rattles its bones and waves'),
    'robot-game': ('Robot', 'GAME', 'cute friendly robot with glowing blue eyes and an antenna', 'The robot waves, its eyes blink and the antenna light pulses'),
    'dragon-game': ('Smoczek', 'GAME', 'cute baby dragon with small wings, purple and green scales', 'The baby dragon flaps its little wings, blows a small puff of smoke and smiles'),
    'cat-game': ('Kotek', 'GAME', 'cute orange cat with big eyes wearing a gamer headset', 'The cat waves a paw, blinks slowly and its tail swishes'),
    'panda-game': ('Panda', 'GAME', 'cute chubby panda holding a game controller', 'The panda bobs its head happily and taps the game controller'),
    'astronaut-game': ('Astronauta', 'GAME', 'cute little astronaut in a white space suit with a glass helmet', 'The astronaut waves and floats up a little as if in low gravity'),
    'knight-game': ('Rycerz', 'GAME', 'brave little knight in shiny armor with a sword and shield', 'The knight raises the sword in a salute and nods'),
    'gamer-game': ('Gamer', 'GAME', 'energetic young gamer character with a gaming headset and a hoodie, holding a controller', 'The gamer cheers, pumps a fist in the air and smiles'),
    'angel-game': ('Aniołek', 'GAME', 'cute angel with small white wings and a golden halo', 'The angel flaps the small wings, the halo glows and it waves'),
    'elf-real': ('Elf (realistyczny)', 'REAL', 'christmas elf actor with pointy ears in a green velvet costume', 'The elf waves cheerfully and laughs'),
    'witch-real': ('Czarownica (realistyczna)', 'REAL', 'woman in an elegant black witch costume with a pointy hat and a broom', 'The witch waves her hand and smiles mysteriously'),
    'snowman-real': ('Bałwan (realistyczny)', 'REAL', 'real snowman made of snow with a carrot nose, coal buttons, a red scarf and a black hat', 'The scarf flutters in the wind and snowflakes fall around'),
    'reindeer-real': ('Renifer (realistyczny)', 'REAL', 'real reindeer with big antlers and a red harness with bells', 'The reindeer turns its head slightly and blinks, the bells jingle'),
    'bunny-real': ('Zajączek (realistyczny)', 'REAL', 'real fluffy white rabbit sitting next to a basket of painted Easter eggs', 'The rabbit twitches its nose and moves its ears'),
}

p = ROOT + 'tools/ai/gen_chars.py'
s = open(p, encoding='utf-8').read()
add = ''.join(f"    '{k}': ({look} + '{desc}' + BG,\n                   '{motion}, then returns to the exact starting pose.' + STILL),\n" for k, (_, look, desc, motion) in NEW.items())
s = s.replace("}\n\n\ndef post(", add + "}\n\n\ndef post(", 1)
open(p, 'w', encoding='utf-8').write(s)

p = ROOT + 'src/overlays/backgrounds.ts'
s = open(p, encoding='utf-8').read()
a = "  'partygirl-game': 'Sylwestrowa impreza',\n};"
assert a in s
s = s.replace(a, "  'partygirl-game': 'Sylwestrowa impreza',\n" + ''.join(f"  '{k}': '{v[0]}',\n" for k, v in NEW.items()) + "};", 1)
open(p, 'w', encoding='utf-8').write(s)

open(ROOT + 'tools/ai/.work/new_chars.txt', 'w').write(' '.join(NEW))
print(' '.join(NEW))
