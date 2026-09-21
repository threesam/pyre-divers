# The site's wordmark as two 1920x1080 masks ("pyre", "divers"), placed with the site's own CSS math
# (app.css .wordmark / .line) at dpr 1. Calibrated against a capture of the live splash: IoU 0.921 on "divers".
import os
from PIL import Image, ImageDraw, ImageFont
W,H=1920,1080
FONT=1.0*268.8                     # clamp(2.2rem, min(15vmax,14vw), 17rem) @1920 -> min(288, 268.8)
TTF=os.path.join(os.path.dirname(os.path.abspath(__file__)),"..","pyre-display.ttf")   # font-weight 400
f=ImageFont.truetype(TTF,FONT)
wsp=-0.092*FONT
adv_p=f.getlength("pyre"); adv_s=f.getlength(" "); adv_d=f.getlength("divers")
total=adv_p+adv_s+wsp+adv_d
x0=W/2-total/2-0.018*FONT
base=H/2+0.3935*FONT-0.126*FONT      # baseline: box centre + 0.3935em, then translateY(-0.126em)
def layer(word):
    im=Image.new("L",(W,H),0); d=ImageDraw.Draw(im)
    x=x0 if word=="pyre" else x0+adv_p+adv_s+wsp
    d.text((x,base),word,font=f,fill=255,anchor="ls"); return im
def masks(): return layer("pyre"),layer("divers")
