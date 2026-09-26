# Step 5: clean the conversation with FabFilter, hosted by Pedalboard (no DAW):
# Pro-Q 4 -> Pro-DS -> Pro-C 3 -> Pro-L 2, settings in clean.json next to this file.
#   - Pro-Q: a light touch. Ep 2 was first tone-matched to ep 1's FL master and every
#     version came out thin; the raw sounded best. Cut rumble, shave 200 Hz and 1 kHz.
#   - Pro-DS: split band over 3-16 kHz, so only the esses band is pulled down.
#   - Pro-C: opto, -24 dB, 2:1, about 3 dB of gentle levelling.
#   - Pro-L: -1 dBTP ceiling; its input gain is fitted so the result lands on -13.5 LUFS
#     (ep 1's clean): render, measure, and render again if it's off by more than 0.3 dB.
# With PUBDIR (the diarized transcript), `speaker`'s turns get `speaker_bands` on top of
# the EQ, crossfaded over 50 ms: two Pro-Q instances, switched by who's talking. Steve's
# mic runs 12-14 dB light at 100-200 Hz next to Sam's, so his turns get a low shelf.
# usage: clean.py EDIT.wav OUT.wav [PUBDIR]
import glob
import json
import os
import re
import subprocess
import sys

import numpy as np
from pedalboard import Pedalboard, load_plugin
from pedalboard.io import AudioFile

VST = '/Library/Audio/Plug-Ins/VST3/FabFilter {}.vst3'
TARGET = -13.5


def pro_q(bands):
    q = load_plugin(VST.format('Pro-Q 4'))
    q.processing_mode = 'Zero Latency'  # so both EQs line up sample for sample
    for i, (shape, f, g, bq) in enumerate(bands, 1):
        for k, v in (('used', 'Used'), ('enabled', True), ('shape', shape), ('frequency', float(f))):
            setattr(q, f'band_{i}_{k}', v)
        if shape == 'Low Cut':
            setattr(q, f'band_{i}_slope', '12 dB/oct')
        else:
            setattr(q, f'band_{i}_gain', float(g)); setattr(q, f'band_{i}_q', float(bq))
    return q


def dynamics(s, gain):
    ds = load_plugin(VST.format('Pro-DS'))
    ds.mode, ds.band_processing = 'Single Vocal', 'Split Band'
    ds.threshold, ds.range = s['ds_threshold'], s['ds_range']
    ds.high_pass_frequency, ds.low_pass_frequency = s['ds_hp'], s['ds_lp']
    c = load_plugin(VST.format('Pro-C 3'))
    c.style, c.auto_gain = s['c_style'], False
    c.threshold, c.ratio, c.attack, c.release = s['c_threshold'], f"{s['c_ratio']:.2f}:1", 10.0, 150.0
    lim = load_plugin(VST.format('Pro-L 2'))
    lim.style, lim.true_peak_limiting, lim.oversampling = 'Transparent', True, '4x'
    lim.gain, lim.output_level = gain, -1.0
    return Pedalboard([ds, c, lim])


def delay(s):
    # streaming with reset=False does NOT compensate plugin latency, and the reported
    # latencies miss Pro-L's oversampling filter (ep 2: 1794 samples), so measure it
    x = np.zeros((2, 48000 * 10), np.float32); x[:, 24000] = 0.5
    return int(np.argmax(np.abs(dynamics(s, 0.0)(x, 48000, reset=False)[0]))) - 24000


def turns(pub, who, n):
    # 1 inside who's diarized turns, 0 elsewhere, on a 10 ms grid with 50 ms ramps
    off = dict(line.split() for line in open(f'{pub}/parts.txt'))
    m = np.zeros(n)
    for f in glob.glob(f'{pub}/diarized-part*.json'):
        o = float(off[os.path.basename(f)[len('diarized-'):].replace('.json', '.mp3')])
        for sg in json.load(open(f))['segments']:
            if (sg.get('speaker') or '').lower() == who:
                m[int((o + sg['start']) * 100):int((o + sg['end']) * 100) + 1] = 1
    return np.convolve(m, np.ones(5) / 5, 'same')


def render(src, out, s, gain, pub):
    d = delay(s)
    eq, eq_spk, dyn = pro_q(s['eq']), pro_q(s['eq'] + s['speaker_bands']), dynamics(s, gain)
    with AudioFile(src) as f, AudioFile(out, 'w', f.samplerate, f.num_channels, bit_depth=32) as o:
        if pub:
            mask = turns(pub, s['speaker'], int(f.frames / f.samplerate * 100) + 2)
            print(f"{s['speaker']}: {mask.sum() / 100:.0f} s of turns")
        while f.tell() < f.frames:
            t0, x = f.tell(), f.read(f.samplerate * 10)
            y = eq(x, f.samplerate, reset=False)
            if pub:
                g = np.interp((t0 + np.arange(x.shape[1])) / f.samplerate, np.arange(len(mask)) / 100, mask)
                y = y * (1 - g.astype(np.float32)) + eq_spk(x, f.samplerate, reset=False) * g.astype(np.float32)
            y = dyn(y, f.samplerate, reset=False)
            skip = min(d, y.shape[1]); d -= skip
            o.write(y[:, skip:])
        o.write(dyn(np.zeros((f.num_channels, f.samplerate), np.float32), f.samplerate, reset=False)[:, :f.frames - o.frames])
        assert o.frames == f.frames, 'output must stay sample-aligned with the edit'


def lufs(path):
    r = subprocess.run(['/usr/local/bin/ffmpeg', '-nostdin', '-hide_banner', '-i', path, '-af', 'ebur128=peak=true',
                        '-f', 'null', '-'], capture_output=True, text=True, check=True).stderr
    return float(re.findall(r'I:\s+(-?[\d.]+) LUFS', r)[-1]), float(re.findall(r'Peak:\s+(-?[\d.]+)', r)[-1])


src, out = sys.argv[1], sys.argv[2]
pub = sys.argv[3] if len(sys.argv) > 3 else None
s = json.load(open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'clean.json')))
gain = s['l_gain']
for _ in range(2):
    render(src, out, s, gain, pub)
    i, peak = lufs(out)
    print(f'{out}: limiter gain {gain:.1f} dB -> {i} LUFS, {peak} dBTP')
    if abs(i - TARGET) <= 0.3:
        break
    gain += TARGET - i
