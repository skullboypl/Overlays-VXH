# Generation progress (stopped 2026-11-05 on user request)

runner5.sh skips every file that already exists, so `bash tools/ai/runner5.sh` resumes where it stopped.

Done: all holiday frames for real..real5, 3d, cartoon, neon, neon3 (8 themes each).
Missing frames:
- neon2: xmas winter newyear easter halloween independence birthday
- neon4: newyear easter halloween independence
- neon5: all 8 themes
Most of these were rejected by quality_ok(): art share < 7%. Fixed: neon now counts alpha > 40 and needs 5%.

Not started: 4K backgrounds (gen_bgs.py, 40), videos (36 left), characters (17 left in new_chars.txt).
