# 앱 아이콘·스토어 그래픽 생성: python3 scripts/icons.py app/assets store
import sys
from PIL import Image, ImageDraw
INK=(20,20,20); WHITE=(255,255,255); ACCENT=(0,94,240)
PTS=[(0.16,0.70),(0.39,0.46),(0.55,0.60),(0.84,0.30)]
def mark(size, scale, line, dot, bg=None, ss=4):
    S=size*ss; im=Image.new('RGBA',(S,S),bg+(255,) if bg else (0,0,0,0)); d=ImageDraw.Draw(im)
    off=(1-scale)/2
    p=[((off+x*scale)*S,(off+y*scale)*S) for x,y in PTS]
    w=int(S*scale*0.095)
    d.line(p,fill=line,width=w,joint='curve')
    r=w/2
    for x,y in p[:-1]: d.ellipse([x-r,y-r,x+r,y+r],fill=line)
    x,y=p[-1]; R=w*0.95; d.ellipse([x-R,y-R,x+R,y+R],fill=dot)
    return im.resize((size,size),Image.LANCZOS)
out=sys.argv[1]; store=sys.argv[2]
mark(1024,0.80,WHITE,ACCENT,INK).convert('RGB').save(f'{out}/icon.png')
mark(512,0.80,WHITE,ACCENT,INK).convert('RGB').save(f'{store}/icon-512.png')
mark(48,0.80,WHITE,ACCENT,INK).convert('RGB').save(f'{out}/favicon.png')
Image.new('RGB',(512,512),INK).save(f'{out}/android-icon-background.png')
mark(512,0.52,WHITE,ACCENT).save(f'{out}/android-icon-foreground.png')
mark(432,0.52,WHITE,WHITE).save(f'{out}/android-icon-monochrome.png')
mark(96,0.86,WHITE,WHITE).save(f'{out}/notification-icon.png')
mark(1024,0.70,INK,ACCENT).save(f'{out}/splash-icon.png')
# 구글 플레이 그래픽 이미지 1024x500
fg=Image.new('RGB',(1024,500),INK); m=mark(400,0.9,WHITE,ACCENT)
fg.paste(m,(312,50),m); fg.save(f'{store}/feature-graphic.png')
