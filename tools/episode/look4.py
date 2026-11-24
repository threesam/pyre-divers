# The whole-episode look (from ep 7): luma -> four tones, ink / slate / gray /
# paper, and any tone can be a hole that shows a video underneath. Runs on the
# raw before assemble.py, so the framing, tags, ASCII ends and outro are
# untouched and the look holds the whole time. Audio is copied as-is.
# Cutoffs are per person (left half = Steve, right half = Sam): set each from that
# half's face luma, so a face splits across two tones instead of going flat.
# usage: look4.py RAW OUT [BAND=underlay.mp4 ...]   BAND 0..3, 0 = darkest (ink)
# env: SS / DUR (seconds, for test stretches), THR_L / THR_R ("a,b,c" cutoffs)
import os
import subprocess
import sys

FF = '/usr/local/bin/ffmpeg'
SRC, OUT = sys.argv[1:3]
UNDER = dict(a.split('=', 1) for a in sys.argv[3:])
PAL = [(0x21, 0x26, 0x14), (0x4a, 0x55, 0x60), (0xb9, 0xb7, 0xb2), (0xe7, 0xe2, 0xda)]  # ink, slate, gray, paper
THR = {h: tuple(int(x) for x in os.environ.get(f'THR_{h}', d).split(',')) for h, d in
       (('L', '30,95,175'), ('R', '65,100,128'))}   # ep 7: Steve, Sam
IDX = [0, 85, 170, 255]


def band(t):  # luma -> band level
    a, b, c = t
    return f"lut=y='if(lt(val,{a}),0,if(lt(val,{b}),85,if(lt(val,{c}),170,255)))'"


def pal(ch):  # band level -> palette channel
    v = [p[ch] for p in PAL]
    return f"if(lt(val,40),{v[0]},if(lt(val,128),{v[1]},if(lt(val,200),{v[2]},{v[3]})))"


cut = ['-ss', os.environ['SS']] if 'SS' in os.environ else []
DUR = os.environ.get('DUR') or subprocess.run(['/usr/local/bin/ffprobe', '-v', 'error', '-show_entries', 'format=duration',
                                               '-of', 'csv=p=0', SRC], capture_output=True, text=True, check=True).stdout.strip()
g = ["[0:v]format=gray,gblur=sigma=1.2,split=2[gl][gr]",
     f"[gl]crop=960:1080:0:0,{band(THR['L'])}[l]",
     f"[gr]crop=960:1080:960:0,{band(THR['R'])}[r]",
     f"[l][r]hstack,split={len(UNDER) + 1}[idx]" + ''.join(f'[m{k}]' for k in UNDER),
     f"[idx]format=rgb24,lutrgb=r='{pal(0)}':g='{pal(1)}':b='{pal(2)}',format=gbrp[b0]"]
inputs, cur = [*cut, '-t', DUR, '-i', SRC], 'b0'   # the looped underlay never ends: -t caps the output
for i, (k, f) in enumerate(UNDER.items(), 1):
    inputs += ['-stream_loop', '-1', '-i', f]
    g += [f"[m{k}]lut=y='if(eq(val,{IDX[int(k)]}),255,0)',format=gbrp[mk{k}]",
          f"[{i}:v]scale=1920:1080:force_original_aspect_ratio=increase,crop=1920:1080,fps=30,format=gbrp[u{k}]",
          f"[{cur}][u{k}][mk{k}]maskedmerge[b{i}]"]
    cur = f'b{i}'
g.append(f"[{cur}]format=yuv420p[v]")
subprocess.run([FF, '-nostdin', '-v', 'error', '-stats', '-y', *inputs, '-filter_complex', ';'.join(g),
                '-map', '[v]', '-map', '0:a', '-t', DUR, '-c:v', 'libx264', '-crf', '14', '-preset', 'fast',
                '-c:a', 'copy', OUT], check=True)
