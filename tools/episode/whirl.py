# The outro sequence: the edit's last frame (the ASCII ending) turns, darkest cell first, into the site's
# whirlpool drawn as '.' dots on paper; the wordmark fades in black over it, holds, then everything fades to
# flat paper. The vortex is a port of pyredivers.com's own algorithm (src/lib/page-fx.ts): 6000 bodies on 3
# log-spiral lanes, r0 = R_IN + (R_START-R_IN)*frac^1.9, Rankine flow, tang = (-y, x) in screen space.
# ep 1 timing at 24 fps: flips over frames 1-88, wordmark in 66-96, fade to paper 144-192, 195 frames (8.125 s).
# usage: whirl.py EDIT.mp4 OUT.mkv [NF=195] [TS=0.4]   (TS = sim speed; 1.0 twinkled, 0.4 glides)
#   -> OUT.mkv (ffv1, lossless) + OUT-frames/ (a few 640px stills to review)
import numpy as np, math, os, subprocess, sys, tempfile
from PIL import Image, ImageDraw, ImageFilter
sys.path.insert(0,os.path.dirname(os.path.abspath(__file__)))
from wordmark import masks
EDIT,OUTMKV=sys.argv[1],sys.argv[2]; FR=os.path.splitext(OUTMKV)[0]+"-frames"; os.makedirs(FR,exist_ok=True)
W,H=1920,1080; CW,CH=6,12; NC,NR=W//CW,H//CH; FPS=24; NF=int(sys.argv[3]) if len(sys.argv)>3 else 195
F0,F1=1.0,88.0                     # darkest-first flips span these frames
WM0,WM1=66.0,96.0                  # wordmark fade-in
TAU=2*math.pi; R_START=0.72; K=0.02124; LANES=3; R_IN=0.002; FONT=268.8
Scss=float(round(0.7*math.hypot(W,H)))            # 1542 — the site's S at 16:9, dpr 1
W_CORE=TAU/24; V_RIM_W=(TAU/70)*R_START
R_CORE=0.72*FONT/Scss; R_E=0.92*R_CORE; V_E=W_CORE*R_E; C2=(V_RIM_W**2-V_E**2)/(R_START-R_E)
speedN=lambda rn: np.sqrt(np.maximum(V_E**2+C2*(rn-R_E),0.25*V_E**2))
cx,cy=W/2,H/2
# ---- seed (site's seedParticles, same distributions)
rng=np.random.default_rng(777); N=6000; i=np.arange(N); lane=i%LANES
GAP=1-math.exp(-TAU*K/LANES)
drift=(rng.random(N)+rng.random(N)-1)*0.8*GAP
off=lane*(TAU/LANES)+(rng.random(N)-0.5)*0.03
frac=(i+0.25+rng.random(N)*0.5)/N
r0=R_IN+(R_START-R_IN)*frac**1.9; rn=r0*(1+drift); ang=np.log(R_START/r0)/K+off
pos=np.stack([cx+np.cos(ang)*rn*Scss, cy+np.sin(ang)*rn*Scss],1)
rel=pos-[cx,cy]; r=np.maximum(np.hypot(rel[:,0],rel[:,1]),1e-3)
tang=np.stack([-rel[:,1]/r,rel[:,0]/r],1); rad=rel/r[:,None]; rnl=r/Scss
cm=np.clip((rnl-R_E)/(R_E*2.4-R_E),0,1)
d=tang-rad*(K*cm)[:,None]; d/=np.hypot(d[:,0],d[:,1])[:,None]
vel=d*((cm*speedN(rnl)+(1-cm)*(V_E/R_E)*rnl)*Scss/60)[:,None]
hash2=lambda a,b:(lambda x:x-np.floor(x))(np.sin(a*12.9898+b*78.233)*43758.5453)
def sstep(e0,e1,x): t=np.clip((x-e0)/(e1-e0),0,1); return t*t*(3-2*t)
def step(pos,vel,t,dt):
    rel=pos-[cx,cy]; r=np.maximum(np.hypot(rel[:,0],rel[:,1]),1e-3); rn=r/Scss
    radial=rel/r[:,None]; tang=np.stack([-radial[:,1],radial[:,0]],1)
    core=sstep(R_E,R_E*2.4,rn); vFree=np.sqrt(np.maximum(V_E**2+C2*(rn-R_E),0.25*V_E**2)); vSolid=(V_E/R_E)*rn
    vpf=(vSolid+(vFree-vSolid)*core)*Scss/60
    vd=tang-radial*(K*core)[:,None]; vd/=np.hypot(vd[:,0],vd[:,1])[:,None]; vd*=vpf[:,None]
    k=min(0.16*dt,1.0); vel=vel+(vd-vel)*k
    tt=t*0.66; ft=math.floor(tt); s=sstep(0,1,tt-ft); idf=np.arange(len(pos),dtype=np.float64)
    n0=np.stack([hash2(idf,ft),hash2(idf+7,ft)],1)-0.5; n1=np.stack([hash2(idf,ft+1),hash2(idf+7,ft+1)],1)-0.5
    vel=vel+(n0+(n1-n0)*s)*vpf[:,None]*k
    pos=pos+vel*dt; vel=vel*0.97**dt
    esc=np.hypot(pos[:,0]-cx,pos[:,1]-cy)/Scss>0.745
    if esc.any():
        a=hash2(pos[esc,0]+vel[esc,0],pos[esc,1]+vel[esc,1])*TAU; dv=np.stack([np.cos(a),np.sin(a)],1)
        pos[esc]=np.array([cx,cy])+dv*R_START*Scss
        t2=np.stack([-dv[:,1],dv[:,0]],1)-dv*K; t2/=np.hypot(t2[:,0],t2[:,1])[:,None]
        vel[esc]=t2*(math.sqrt(V_E**2+C2*(R_START-R_E))*Scss/60)
    return pos,vel
# ---- last frame + cell darkness ordering
with tempfile.TemporaryDirectory() as td:   # the edit's final frame: decode its last ~2 s, keep the last image
    dur=float(subprocess.run(["/usr/local/bin/ffprobe","-v","error","-show_entries","format=duration","-of","csv=p=0",EDIT],capture_output=True,text=True,check=True).stdout)
    subprocess.run(["/usr/local/bin/ffmpeg","-nostdin","-v","error","-y","-ss",f"{max(0.0,dur-2):.3f}","-i",EDIT,"-update","1",td+"/last.png"],check=True)
    last=np.asarray(Image.open(td+"/last.png").convert("RGB")).astype(np.float32)
lum=last@np.array([.299,.587,.114],np.float32)
BG=np.array([np.median(last[...,c][lum>np.percentile(lum,90)]) for c in range(3)],np.float32); bgl=float(BG@[.299,.587,.114])
INK=np.array([0x21,0x26,0x14],np.float32)
dark=np.maximum(bgl-lum,0).reshape(NR,CH,NC,CW).mean((1,3))
order=np.argsort(-dark.ravel(),kind="stable"); rk=np.empty_like(order); rk[order]=np.arange(order.size); rf=rk.reshape(NR,NC)/(order.size-1)
act=F0+(F1-F0)*(0.9*rf+0.1*np.random.default_rng(5).random((NR,NC)))
# ---- '.' tiles: an anti-aliased dot per cell, 4 density levels ('*' twinkled at video size)
GW,GH=8,18; GC,GR=W//GW,H//GH                       # swirl grid (coarser than the 6x12 flip grid so a dot reads)
SS=8; g=Image.new("L",(GW*SS,GH*SS),0); r_=2.4*SS; ImageDraw.Draw(g).ellipse((GW*SS/2-r_,GH*SS*0.5-r_,GW*SS/2+r_,GH*SS*0.5+r_),fill=255)
gm=np.asarray(g.resize((GW,GH),Image.LANCZOS),np.float32)/255
T=np.stack([BG+(INK-BG)*gm[...,None]*a for a in (0.0,0.6,0.85,1.0)]).astype(np.float32)   # (4,GH,GW,3)
# ---- wordmark: black over the whirlpool, letters carved out of the swarm (as the site carves 'pyre')
p,dv=masks(); wm=np.maximum(np.asarray(p),np.asarray(dv)).astype(np.float32)/255
halo=Image.fromarray((wm*255).astype(np.uint8)).filter(ImageFilter.MaxFilter(19))
halo=np.asarray(halo)>128
carve=halo.reshape(GR,GH,GC,GW).max((1,3))
# end state: flat paper — the swirl and the wordmark both dissolve into it
GRID=np.broadcast_to(BG,(H,W,3)).astype(np.float32)   # flat paper
FADE0,FADE1=144.0,192.0
proc=subprocess.Popen(["/usr/local/bin/ffmpeg","-nostdin","-v","error","-y","-f","rawvideo","-pix_fmt","rgb24","-s",f"{W}x{H}","-r",str(FPS),"-i","-","-c:v","ffv1",OUTMKV],stdin=subprocess.PIPE)
hist=[]   # last two frames' positions: the trail that makes the rotation legible
def hits(pp):
    cx_=np.floor(pp[:,0]/GW).astype(int); cy_=np.floor(pp[:,1]/GH).astype(int)
    ok=(cx_>=0)&(cx_<GC)&(cy_>=0)&(cy_<GR)
    return np.bincount(cy_[ok]*GC+cx_[ok],minlength=GC*GR).reshape(GR,GC).astype(np.float32)
TS=float(sys.argv[4]) if len(sys.argv)>4 else 0.4
KEEP={0,60,96,144,156,168,180,NF-1}
for f in range(NF):
    if f>0: pos,vel=step(pos,vel,f/FPS*TS,TS*60/FPS)
    c=hits(pos)
    for w,pp in zip((0.7,0.5,0.3),reversed(hist[-3:])): c=c+w*hits(pp)
    hist.append(pos.copy()); hist[:]=hist[-3:]
    cnt=np.select([c<0.5,c<1.3,c<2.4],[0,1,2],3); cnt[carve]=0
    tgt=T[np.minimum(cnt,3)].transpose(0,2,1,3,4).reshape(H,W,3)
    s=np.clip((f-act)/2.0,0,1); sp=np.repeat(np.repeat(s,CH,0),CW,1)[...,None]
    out=last*(1-sp)+tgt*sp
    wa=float(sstep(WM0,WM1,f))*wm[...,None]
    out=out*(1-wa)+INK*wa
    gf=float(sstep(FADE0,FADE1,f)); out=out*(1-gf)+GRID*gf
    frame=np.clip(out+0.5,0,255).astype(np.uint8)
    proc.stdin.write(frame.tobytes())
    if f in KEEP: Image.fromarray(frame).resize((640,360),Image.LANCZOS).save(f"{FR}/f{f:03d}.png")
proc.stdin.close(); proc.wait()
print("frames",NF,"| bg",BG.round(1),"| carve cells",int(carve.sum()),"| flipped by f=60:",round(float((act<=60).mean())*100,1),"% of cells")
print("bodies within 200px of centre at start:",int((np.hypot(*(pos.T-np.array([[cx],[cy]])))<200).sum()))
