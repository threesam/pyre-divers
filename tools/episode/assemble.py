# ponytail: the original footage (keep-list cut, renderer's panel framing) with three encoded windows spliced around a
# cached plain body: HEAD [0,HW) = footage + white badge + name tags; BODY [HW,Ks) cached; TAIL [Ks,show) = footage with
# the coarse ASCII (a clip whose t=0 is edited time Ks) fading in over the first half of the last SECTION_M measures at BPM,
# fully ASCII for the second half. Audio rendered once. (née assets/ep1/ogtail.py — the ep 1 edit.)
# END_WORDMARK=1 puts the ink wordmark back on the tail; off by default since ep 1's outro sequence (whirl.py) carries it.
# usage: assemble.py EPDIR RAW.mp4 OUT.mp4 BPM   (EPDIR holds keep.json, head-ascii.mp4, tail-ascii.mp4)
import json,os,subprocess,sys
S,SRC,OUT,BPM=os.path.abspath(sys.argv[1]),sys.argv[2],sys.argv[3],float(sys.argv[4]); ASCII=f"{S}/tail-ascii.mp4"
BRAND=os.path.join(os.path.dirname(os.path.abspath(__file__)),"brand"); END_WM=os.environ.get('END_WORDMARK')=='1'
FF="/usr/local/bin/ffmpeg"; FP="/usr/local/bin/ffprobe"; FPS=24
keep=json.load(open(os.environ.get('KEEP',f"{S}/keep.json"))); show=sum(b-a for a,b in keep); n=len(keep)
MEAS=4*60/BPM; SECTION=float(os.environ.get('SECTION_M','6'))*MEAS; F=SECTION/2; TAIL=float(os.environ.get('TAIL','9')); AFADE=1.5
TAILWIN=float(os.environ.get('TAILWIN','45')); HW=float(os.environ.get('HW','30')); Ks=show-TAILWIN; D=show-Ks; A0=D-SECTION
assert SECTION+3<=TAILWIN, "SECTION longer than the tail window"
WM_I,TAGS=f"{BRAND}/wordmark-ink.png",f"{BRAND}/tags.png"; HEAD_ASCII=os.environ.get('HEAD_ASCII',f"{S}/head-ascii.mp4")
HOLD1=float(os.environ.get('HOLD_M','1'))*MEAS                     # full ASCII holds this long before it starts dissolving to footage
OPEN=float(os.environ.get('OPEN_M','3'))*MEAS                      # then dissolves to footage over OPEN seconds
T_IN=float(os.environ.get('TITLE_IN','0')); TITLE_FADE=float(os.environ.get('TITLE_FADE','0.3'))   # wordmark fades in fast, immediately, over the still-full ASCII
TITLE_HOLD=float(os.environ.get('TITLE_HOLD','8')); TAGS_IN=T_IN+float(os.environ.get('TAGS_DELAY','2.5')); TAGS_HOLD=float(os.environ.get('TAGS_HOLD','12'))
assert TAGS_IN+TAGS_HOLD+1<HW, "head window too short for the title/tags timeline"
CRF=os.environ.get('CRF','20'); W=f"{S}/assemble-work"; os.makedirs(W,exist_ok=True)
def run(cmd): subprocess.run(cmd,check=True)
def probe(args): return subprocess.run([FP,"-v","error"]+args,capture_output=True,text=True,check=True).stdout
GEO="split=2[gl][gr];[gl]crop=843:940:57:30,scale=960:1080[pl];[gr]crop=843:940:1017:30,scale=960:1080[pr];[pl][pr]hstack,fps=%d"%FPS   # renderer's crop, 8px shorter: hides the name-bar edge
def pieces_for(t0,t1):
    out=[]; e0=0.0
    for a,b in keep:
        e1=e0+(b-a)
        if e1>t0 and e0<t1: out.append((a+max(t0,e0)-e0, a+min(t1,e1)-e0))
        e0=e1
    return out
def cut(pcs,seek=0.0): return ''.join(f"[0:v]trim={a-seek:.3f}:{b-seek:.3f},setpts=PTS-STARTPTS[c{i}];" for i,(a,b) in enumerate(pcs))+''.join(f"[c{i}]" for i in range(len(pcs)))+f"concat=n={len(pcs)}:v=1:a=0,{GEO}[g];"
ENC=["-c:v","libx264","-preset","faster","-crf",CRF,"-pix_fmt","yuv420p"]
# 1. audio
aud=f"[0:a]asplit={n}"+''.join(f"[s{i}]" for i in range(n))+";"+''.join(f"[s{i}]atrim={a:.3f}:{b:.3f},asetpts=PTS-STARTPTS[t{i}];" for i,(a,b) in enumerate(keep))+''.join(f"[t{i}]" for i in range(n))+f"concat=n={n}:v=0:a=1,loudnorm=I=-16:TP=-1.5:LRA=11,aresample=48000,afade=t=out:st={show-AFADE:.3f}:d={AFADE}[a]"
run([FF,"-nostdin","-v","error","-y","-i",SRC,"-filter_complex",aud,"-map","[a]","-c:a","aac","-b:a","160k",f"{W}/audio.m4a"])
# 2. head: footage [0,HW); the ASCII clip (t=0 = show start) holds full for HOLD1, then dissolves out over OPEN; the ink
#    wordmark fades in fast right at the start, sitting on the still-full ASCII, not waiting for the footage to clear;
#    the tags flash in after it and hold longer. Words are always the top layer.
pc=pieces_for(0,HW)
fc=(cut(pc)+f"[1:v]format=yuva420p,fade=t=out:st={HOLD1:.3f}:d={OPEN:.3f}:alpha=1[ao];[g][ao]overlay=format=auto:eof_action=pass[v1];"
    f"[3:v]format=yuva420p,fade=t=in:st={TAGS_IN:.3f}:d=0.25:alpha=1,fade=t=out:st={TAGS_IN+TAGS_HOLD:.3f}:d=0.5:alpha=1[tg];[v1][tg]overlay=format=auto:eof_action=pass[v2];"
    f"[2:v]format=yuva420p,fade=t=in:st={T_IN:.3f}:d={TITLE_FADE:.3f}:alpha=1,fade=t=out:st={T_IN+TITLE_HOLD:.3f}:d=0.8:alpha=1[wm];[v2][wm]overlay=format=auto:eof_action=pass,format=yuv420p[v]")
run([FF,"-nostdin","-v","error","-y","-i",SRC,"-i",HEAD_ASCII,"-loop","1","-t",f"{HW:.3f}","-i",WM_I,"-loop","1","-t",f"{HW:.3f}","-i",TAGS,"-filter_complex",fc,"-map","[v]","-an","-r",str(FPS),"-t",f"{HW:.6f}"]+ENC+[f"{W}/head.mp4"])
# 3. body: plain footage [HW,Ks), cached
body=f"{W}/body-plain.mp4"; ok=False
if os.path.exists(body):
    bd=float(probe(["-select_streams","v:0","-show_entries","stream=duration","-of","csv=p=0",body]).strip()); ok=abs(bd-(Ks-HW))<1.5/FPS
if not ok:
    pc=pieces_for(HW,Ks); SEEK=max(0.0,pc[0][0]-2.0)
    run([FF,"-nostdin","-v","error","-y","-ss",f"{SEEK:.3f}","-i",SRC,"-filter_complex",cut(pc,SEEK)+"[g]format=yuv420p[v]","-map","[v]","-an","-r",str(FPS),"-t",f"{Ks-HW:.6f}"]+ENC+[body])
# 4. tail: footage [Ks,show) with the ASCII clip fading in at A0 over F, then full; crisp ink wordmark on top from show-TAIL
pc=pieces_for(Ks,show); SEEK=max(0.0,pc[0][0]-2.0)
fc=cut(pc,SEEK)+f"[1:v]format=yuva420p,fade=t=in:st={A0:.3f}:d={F:.3f}:alpha=1[af];[g][af]overlay=format=auto:eof_action=pass"
wm_in=[]
if END_WM:
    fc+=f"[v1];[2:v]format=yuva420p,fade=t=in:st={show-TAIL-Ks:.3f}:d=1:alpha=1[wm];[v1][wm]overlay=format=auto:eof_action=pass"
    wm_in=["-loop","1","-t",f"{D:.3f}","-i",WM_I]
fc+=",format=yuv420p[v]"
run([FF,"-nostdin","-v","error","-y","-ss",f"{SEEK:.3f}","-i",SRC,"-i",ASCII]+wm_in+["-filter_complex",fc,"-map","[v]","-an","-r",str(FPS),"-t",f"{D:.6f}"]+ENC+[f"{W}/tail.mp4"])
# 5. splice + mux
open(f"{W}/list.txt","w").write("file 'head.mp4'\nfile 'body-plain.mp4'\nfile 'tail.mp4'\n")
run([FF,"-nostdin","-v","error","-y","-f","concat","-safe","0","-i",f"{W}/list.txt","-i",f"{W}/audio.m4a","-map","0:v","-map","1:a","-c","copy","-movflags","+faststart",OUT])
vd=float(probe(["-select_streams","v:0","-show_entries","stream=duration","-of","csv=p=0",OUT]).strip()); ad=float(probe(["-select_streams","a:0","-show_entries","stream=duration","-of","csv=p=0",OUT]).strip())
for f in ("head.mp4","tail.mp4","audio.m4a","list.txt"): os.remove(f"{W}/{f}")
print(f"OGTAIL_DONE {OUT}: ascii held {HOLD1:.2f}s then dissolves {OPEN:.2f}s, title {T_IN:.1f}-{T_IN+TITLE_HOLD:.1f}s (fade {TITLE_FADE}s), tags {TAGS_IN:.1f}-{TAGS_IN+TAGS_HOLD:.1f}s; head {HW:.0f}s, body cached {HW:.0f}-{Ks:.2f}s, tail {D:.2f}s: ASCII in at +{A0:.2f}s over {F:.2f}s then full {F:.2f}s ({BPM} bpm); video {vd:.3f}s audio {ad:.3f}s show {show:.3f}s")
