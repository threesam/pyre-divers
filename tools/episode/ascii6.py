# ponytail: ascii5 + a static-room PLATE (bgplate.py). With PLATE set, a cell is foreground when it does not
# match the known room (TOL raw-tone units), or the matte says person; matching cells decay to ROOMFLOOR in
# FGHALF seconds (0.3). Motion still drives MODE effects. Cells the plate never saw fall back to matte+motion.
#   PLATE=plate.npz  TOL=12  FGHALF=0.3  ALPHA=0.05 (room drift tracking)
#   CW=6 CH=12 (3x6 = 2x finer)  LO=1 HI=99 (person tone-stretch percentiles; raise HI to keep highlight detail)
#   DARK=1 inverts: light glyphs on the ink colour, bright pixels get the dense glyphs
# ascii4 + a MODE for what moving cells become (needs MOTION=1):
#   MODE=fine       moving cells re-render at CW/FINEDIV x CH/FINEDIV glyphs (finer grain where things move)
#   MODE=pixel      moving cells show the real frame, desaturated into the BG..INK palette; still people stay ASCII at PFLOOR
#   MODE=pixelfade  same, but pixels crossfade into ASCII as activity decays (an ASCII shadow trails the motion)
#   SAT=0 (pixel modes: 0 = desaturated into the palette, 1 = original color where it moves)
#   ACTTH=0.35 (activity that counts as moving, fine/pixel)  PIXA=0.35 (pixelfade: pixels fully in at 1.0, gone at PIXA)  FINEDIV=2
# ascii3 + a motion layer. cells that stop moving decay to nothing (or ROOMFLOOR glyph);
# the person matte is a non-temporal floor so a still face never fades. MOTION=1 turns it on.
#   MTH=12 (raw tone delta, /255)  HALF=2.0 (room half-life, s)  PFLOOR=0.55 (person floor)
#   ROOMMAX=1.0 (moving room cells go this dark)  ROOMFLOOR=0 (ramp index dead room cells settle to; 1 = '.')
# usage: ascii2.py SRC OUT T0 T1 [select_expr_file]   -> video-only mp4 @30fps 1920x1080
import sys,subprocess,numpy as np,cv2,os
from PIL import Image,ImageDraw,ImageFont
import mediapipe as mp
from mediapipe.tasks import python as mpp; from mediapipe.tasks.python import vision
SRC,OUT,T0,T1=sys.argv[1],sys.argv[2],float(sys.argv[3]),float(sys.argv[4])
SEL=open(sys.argv[5]).read().strip() if len(sys.argv)>5 else None
CW,CH=int(os.environ.get('CW','6')),int(os.environ.get('CH','12')); FPS=int(os.environ.get('FPS','30')); DW,DH=640,360
PAD=69
PANELS=[(0,0,960,1080),(960+PAD,PAD,960-2*PAD,1080-2*PAD)]   # (x,y,w,h): left full-bleed, right framed
NECKLINE=False
import os
SURROUND=tuple(int(os.environ.get('SURROUND','000000')[i:i+2],16) for i in (0,2,4))   # border colour, hex
ZOOM=float(os.environ.get('ZOOM','1.0')); YOFF=float(os.environ.get('YOFF','0'))   # crop window starts this fraction down the frame                                              # >1 = tighter crop, the panel edge cuts the body           # decode small: matte + tone from the same frame
MOTION=bool(os.environ.get('MOTION')); MTH=float(os.environ.get('MTH','12')); HALF=float(os.environ.get('HALF','2.0'))
PFLOOR=float(os.environ.get('PFLOOR','0.55')); ROOMMAX=float(os.environ.get('ROOMMAX','1.0')); ROOMFLOOR=int(os.environ.get('ROOMFLOOR','0'))
DECAY=0.5**(1/(FPS*HALF)); prev={0:None,1:None}; act={0:None,1:None}; K3=np.ones((3,3),np.uint8)
MODE=os.environ.get('MODE',''); FINEDIV=int(os.environ.get('FINEDIV','2')); ACTTH=float(os.environ.get('ACTTH','0.35')); PIXA=float(os.environ.get('PIXA','0.35')); SAT=float(os.environ.get('SAT','0'))
FULLRES=MODE in ('pixel','pixelfade'); PW,PH=(1920,1080) if FULLRES else (640,360)
PLATE=os.environ.get('PLATE'); TOL=float(os.environ.get('TOL','12')); FGHALF=float(os.environ.get('FGHALF','0.3')); ALPHA=float(os.environ.get('ALPHA','0.05'))
FGDECAY=0.5**(1/(FPS*FGHALF)); fgact={0:None,1:None}; LO,HI=float(os.environ.get('LO','1')),float(os.environ.get('HI','99')); DARK=bool(os.environ.get('DARK'))
if PLATE:
    _z=np.load(PLATE); P={}; K={}; _C,_R=960//CW,1080//CH                                 # resample the plate to this render's cell grid
    for h in (0,1):
        _p=_z[f'p{h}']; _k=np.isfinite(_p).astype(np.float32); _f=np.where(np.isfinite(_p),_p,0).astype(np.float32)
        if _p.shape!=(_R,_C): _f=cv2.resize(_f,(_C,_R),interpolation=cv2.INTER_LINEAR); _k=cv2.resize(_k,(_C,_R),interpolation=cv2.INTER_LINEAR)
        K[h]=_k>0.5; P[h]=np.where(K[h],_f,np.nan).astype(np.float32)
BG,INK=(0xe7,0xe2,0xda),(0x21,0x26,0x14); RAMP=os.environ.get("RAMP"," .:-=+*#%@") if "os" in dir() else " .:-=+*#%@"; GAMMA=float(os.environ.get('GAMMA','1.3'))
if DARK: BG,INK=INK,BG
font=ImageFont.truetype("/System/Library/Fonts/Menlo.ttc",int(CH*0.88),index=1)   # bold
CHAR=os.environ.get("CHAR")            # single-glyph mode: tone = ink opacity (MONO=alpha) or presence dither (MONO=dither)
MONO=os.environ.get("MONO","alpha")
if CHAR:
    LEVELS=10; tiles=np.zeros((LEVELS,CH,CW,4),np.uint8)
    for i in range(LEVELS):
        a=0 if i==0 else int(255*(i/(LEVELS-1))**0.8) if MONO=="alpha" else 255
        im=Image.new("RGBA",(CW,CH),(0,0,0,0)); ImageDraw.Draw(im).text((0,-CH//8),CHAR,font=font,fill=INK+(a,)); tiles[i]=np.asarray(im)
    RAMP=" "*LEVELS
else:
    tiles=np.zeros((len(RAMP),CH,CW,4),np.uint8)
    for i,c in enumerate(RAMP):
        im=Image.new("RGBA",(CW,CH),(0,0,0,0)); ImageDraw.Draw(im).text((0,-CH//8),c,font=font,fill=INK+(255,)); tiles[i]=np.asarray(im)
LEFTMODE=os.environ.get('LEFTMODE'); LEFTSCALE=os.environ.get('LEFTSCALE')
if LEFTMODE=='dark':
    tiles_dark=np.zeros_like(tiles)
    for i,c in enumerate(RAMP):
        im=Image.new("RGBA",(CW,CH),(0,0,0,0)); ImageDraw.Draw(im).text((0,-CH//8),c,font=font,fill=BG+(255,)); tiles_dark[i]=np.asarray(im)
def flat(T,bgc):
    a=T[...,3:4].astype(np.float32)/255; return (np.array(bgc,np.uint8)*(1-a)+T[...,:3]*a).astype(np.uint8)
RINGCHAR=os.environ.get("RINGCHAR")     # border ring drawn as one repeated glyph
if RINGCHAR:
    im=Image.new("RGBA",(CW,CH),(0,0,0,0)); ImageDraw.Draw(im).text((0,-CH//8),RINGCHAR,font=font,fill=INK+(255,))
    tiles=np.concatenate([tiles,np.asarray(im)[None]]); RING_IDX=len(tiles)-1
TILES_BG=flat(tiles,BG); TILES_INK=flat(tiles_dark,INK) if LEFTMODE=='dark' else None
if MODE=='fine':
    FW,FH=CW//FINEDIV,CH//FINEDIV; ffont=ImageFont.truetype("/System/Library/Fonts/Menlo.ttc",max(4,int(FH*0.88)),index=1)
    tiles_fine=np.zeros((len(RAMP),FH,FW,4),np.uint8)
    for i,c in enumerate(RAMP):
        im=Image.new("RGBA",(FW,FH),(0,0,0,0)); ImageDraw.Draw(im).text((0,-FH//8),c,font=ffont,fill=INK+(255,)); tiles_fine[i]=np.asarray(im)
    TILES_FINE_BG=flat(tiles_fine,BG)
BAYER=np.array([[0,8,2,10],[12,4,14,6],[3,11,1,9],[15,7,13,5]])/16.0
seg=vision.ImageSegmenter.create_from_options(vision.ImageSegmenterOptions(base_options=mpp.BaseOptions(model_asset_path=f"{os.path.dirname(os.path.abspath(__file__))}/selfie_segmenter_landscape.tflite"),output_confidence_masks=True))
fd=vision.FaceDetector.create_from_options(vision.FaceDetectorOptions(base_options=mpp.BaseOptions(model_asset_path=f"{os.path.dirname(os.path.abspath(__file__))}/blaze_face_short_range.tflite"),min_detection_confidence=0.4))
NECK=1.08   # chin line = face-box top + NECK*box height; cells below are blanked
cut_y={0:None,1:None}  # per half (left/right), last known neckline in decode px
vf=(f"select='{SEL}',setpts=N/FRAME_RATE/TB," if SEL else "")+f"fps={FPS},scale={PW}:{PH}:flags=area,format=rgb24"
dec=subprocess.Popen(["/usr/local/bin/ffmpeg","-nostdin","-v","error","-ss",str(T0),"-t",str(T1-T0),"-i",SRC,"-vf",vf,"-f","rawvideo","-"],stdout=subprocess.PIPE,bufsize=PW*PH*3*4)
enc=subprocess.Popen(["/usr/local/bin/ffmpeg","-nostdin","-v","error","-y","-f","rawvideo","-pix_fmt","rgba","-s","1920x1080","-r",str(FPS),"-i","-","-c:v","libx264","-preset","fast","-crf",os.environ.get("CRF","18"),"-pix_fmt","yuv420p",OUT],stdin=subprocess.PIPE)
lut=((np.arange(256) if DARK else (255-np.arange(256)))*(len(RAMP)-1)//255).astype(np.int32); n=0   # dark: bright -> dense glyph
while True:
    raw=dec.stdout.read(PW*PH*3)
    if len(raw)<PW*PH*3: break
    full=np.frombuffer(raw,np.uint8).reshape(PH,PW,3)
    rgb=cv2.resize(full,(DW,DH),interpolation=cv2.INTER_AREA) if FULLRES else full
    m=seg.segment(mp.Image(image_format=mp.ImageFormat.SRGB,data=np.ascontiguousarray(rgb))).confidence_masks[0].numpy_view().copy()
    g=cv2.cvtColor(rgb,cv2.COLOR_RGB2GRAY).astype(np.float32); graw=g   # raw copy: motion is measured before the person tone-stretch
    mpi=mp.Image(image_format=mp.ImageFormat.SRGB,data=np.ascontiguousarray(rgb))
    for d in fd.detect(mpi).detections:
        b=d.bounding_box; half=0 if b.origin_x+b.width/2<DW/2 else 1; cut_y[half]=b.origin_y+b.height*NECK
    for half in (0,1):
        if NECKLINE and cut_y[half] is not None:
            x0,x1=(0,DW//2) if half==0 else (DW//2,DW); m[int(cut_y[half]):,x0:x1]=0
    person=m>0.5
    if os.environ.get('KEEPBG') and not os.environ.get('BGSCALE'): person[:]=True   # whole-frame tone only when the bg is full-strength
    if person.sum()>200:                                   # tone-stretch on the person only
        lo,hi=np.percentile(g[person],LO),np.percentile(g[person],HI); g=np.clip((g-lo)/max(hi-lo,1),0,1)
    else: g=g/255
    g=(255*g**GAMMA).astype(np.uint8)
    canvas=np.zeros((1080,1920,4),np.uint8); canvas[...,:3]=BG; canvas[...,3]=255
    LIGHT=int(os.environ.get('LIGHT','2'))                                              # border ring: glyphs clamped to the lightest LIGHT levels
    hh=int(DH*0.88/ZOOM); ww=int(round(hh*960/1080)); xo=(DW//2-ww)//2                 # each half fills 960x1080; bottom 12% (name bars) dropped
    COLS,ROWS=960//CW,1080//CH
    for half in (0,1):
        x0=half*(DW//2)+xo; y0=min(int(DH*YOFF),DH-hh); gh=g[y0:y0+hh,x0:x0+ww]; mh=m[y0:y0+hh,x0:x0+ww]
        gg=cv2.resize(gh,(COLS,ROWS),interpolation=cv2.INTER_AREA); mm=cv2.resize(mh,(COLS,ROWS),interpolation=cv2.INTER_AREA)
        rr=cv2.resize(graw[y0:y0+hh,x0:x0+ww],(COLS,ROWS),interpolation=cv2.INTER_AREA)
        idx=lut[gg]
        if half==0 and LEFTMODE=='dark': idx=(len(RAMP)-1)-idx                                   # invert: bright pixel -> dense light glyph
        bgs=float(LEFTSCALE) if (half==0 and LEFTSCALE) else float(os.environ.get('BGSCALE','1'))
        if MOTION:
            if prev[half] is None: prev[half]=rr; act[half]=np.ones((ROWS,COLS),np.float32); fgact[half]=np.ones((ROWS,COLS),np.float32)   # frame 1: everything on, then the room decays away
            d=rr-prev[half]; d-=np.median(d)                                                   # drop frame-wide drift (exposure, stretch) before thresholding
            mot=cv2.morphologyEx((np.abs(d)>MTH).astype(np.uint8),cv2.MORPH_OPEN,K3)          # single-cell noise sparkle doesn't count
            prev[half]=rr; act[half]=np.maximum(act[half]*DECAY,mot.astype(np.float32))
            conf=np.clip((mm-0.3)/0.4,0,1)                                                     # soft person confidence per cell
            if PLATE:
                pk=P[half]; known=K[half]; d=rr-pk; d=d-np.nanmedian(d)                            # drop frame-wide drift before comparing to the room
                fgp=np.zeros((ROWS,COLS),bool); fgp[known]=np.abs(d[known])>TOL
                fgp=cv2.morphologyEx(fgp.astype(np.uint8),cv2.MORPH_OPEN,K3).astype(bool)         # lone noise cells are not foreground
                fgp[~known]=mot[~known].astype(bool)                                               # room never seen here: fall back to motion
                fg=fgp|(conf>0.5)                                                                  # ...and the matte always counts
                upd=known&~fgp; pk[upd]+=ALPHA*(rr[upd]-pk[upd])                                   # the room tracks its own slow light drift
                fgact[half]=np.maximum(fgact[half]*FGDECAY,fg.astype(np.float32))
                w=np.maximum(fgact[half],PFLOOR*conf)
            else:
                w=np.maximum(act[half]*np.maximum(ROOMMAX,conf),PFLOOR*conf)                       # person: max(motion, floor); room: motion*ROOMMAX
            idx=(idx*w).astype(np.int32)
            if ROOMFLOOR: idx[(conf<0.5)&(idx<ROOMFLOOR)]=ROOMFLOOR
        elif not os.environ.get('KEEPBG'): idx[mm<0.45]=0
        elif os.environ.get('BGSCALE') or LEFTSCALE: idx[mm<0.45]=(idx[mm<0.45]*bgs).astype(np.int32)
        if half==1 and not os.environ.get('NORING'):                                    # right half: everything outside the 69px inset goes faint (NORING=1: raw, no frame)
            ring=np.ones_like(idx,bool); r0,c0=PAD//CH,PAD//CW; ring[r0:ROWS-r0,c0:COLS-c0]=False
            idx[ring]=RING_IDX if RINGCHAR else (idx[ring]*float(os.environ.get('RINGSCALE','0.2'))).astype(np.int32)
        if CHAR and MONO=="dither":
            tone=idx/(len(RAMP)-1); th=np.tile(BAYER,(ROWS//4+1,COLS//4+1))[:ROWS,:COLS]
            idx=np.where(tone>th,len(RAMP)-1,0)
        T=TILES_INK if (half==0 and LEFTMODE=='dark') else TILES_BG
        px=half*960
        if half==0 and LEFTMODE=='dark': canvas[:,:960,:3]=INK
        block=T[idx].transpose(0,2,1,3,4).reshape(ROWS*CH,COLS*CW,3)
        if MOTION and MODE:
            a=act[half].copy()
            if half==1: a[ring]=0                                                             # the frame stays a frame
            if MODE=='fine':
                gf=cv2.resize(gh,(COLS*FINEDIV,ROWS*FINEDIV),interpolation=cv2.INTER_AREA)
                wf=cv2.resize(w,(COLS*FINEDIV,ROWS*FINEDIV),interpolation=cv2.INTER_NEAREST)
                idf=(lut[gf]*wf).astype(np.int32)
                fine=TILES_FINE_BG[idf].transpose(0,2,1,3,4).reshape(ROWS*CH,COLS*CW,3)
                fm=cv2.resize((a>ACTTH).astype(np.uint8),(COLS*CW,ROWS*CH),interpolation=cv2.INTER_NEAREST).astype(bool)   # not 'm': that is the segmenter mask
                block=np.where(fm[...,None],fine,block)
            else:
                sx,sy=PW/DW,PH/DH
                crop=full[int(y0*sy):int((y0+hh)*sy),int(x0*sx):int((x0+ww)*sx)]
                crop=cv2.resize(crop,(COLS*CW,ROWS*CH),interpolation=cv2.INTER_AREA)
                t=(1-cv2.cvtColor(crop,cv2.COLOR_RGB2GRAY).astype(np.float32)/255)[...,None]   # dark -> ink, light -> paper
                pix=np.array(BG,np.float32)*(1-t)+np.array(INK,np.float32)*t
                if SAT>0: pix=pix*(1-SAT)+crop.astype(np.float32)*SAT                            # keep the real color where it moves
                am=(a>ACTTH).astype(np.float32) if MODE=='pixel' else np.clip((a-PIXA)/(1-PIXA),0,1).astype(np.float32)
                alpha=cv2.resize(am,(COLS*CW,ROWS*CH),interpolation=cv2.INTER_NEAREST)[...,None]
                block=(pix*alpha+block.astype(np.float32)*(1-alpha)).astype(np.uint8)
        canvas[:ROWS*CH,px:px+COLS*CW,:3]=block
    img=canvas
    enc.stdin.write(np.ascontiguousarray(img).tobytes()); n+=1
enc.stdin.close(); enc.wait(); print("frames",n)
