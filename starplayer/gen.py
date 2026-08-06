import math, json

K = 0.5522847498

def ell(cx, cy, rx, ry):
    return [('M',[(cx+rx,cy)]),
            ('C',[(cx+rx,cy+ry*K),(cx+rx*K,cy+ry),(cx,cy+ry)]),
            ('C',[(cx-rx*K,cy+ry),(cx-rx,cy+ry*K),(cx-rx,cy)]),
            ('C',[(cx-rx,cy-ry*K),(cx-rx*K,cy-ry),(cx,cy-ry)]),
            ('C',[(cx+rx*K,cy-ry),(cx+rx,cy-ry*K),(cx+rx,cy)]),
            ('Z',[])]

def parse(d):
    import re
    toks = re.findall(r'[MCLZmclz]|-?\d*\.?\d+(?:e-?\d+)?', d)
    segs=[];i=0;cmd=None
    while i < len(toks):
        t = toks[i]
        if t.isalpha(): cmd=t; i+=1
        n = {'M':2,'L':2,'C':6,'Z':0}[cmd.upper()]
        pts=[]
        for k in range(n//2):
            pts.append((float(toks[i]), float(toks[i+1]))); i+=2
        segs.append((cmd.upper(), pts))
    return segs

def emit(segs):
    out=[]
    for c,p in segs:
        if c=='Z': out.append('Z')
        else: out.append(c+' '+' '.join('%.2f %.2f'%(x,y) for x,y in p))
    return ' '.join(out)

def xform(segs, sx=1, sy=1, piv=(0,0), rot=0, rpiv=(0,0), tx=0, ty=0):
    a = math.radians(rot); ca, sa = math.cos(a), math.sin(a)
    def f(p):
        x,y = p
        x = piv[0] + (x-piv[0])*sx;  y = piv[1] + (y-piv[1])*sy
        dx, dy = x-rpiv[0], y-rpiv[1]
        x = rpiv[0] + dx*ca - dy*sa;  y = rpiv[1] + dx*sa + dy*ca
        return (x+tx, y+ty)
    return [(c,[f(p) for p in pts]) for c,pts in segs]

# ---------- base geometry ----------
BODY = parse("M192.086 268.833 C235.973 311.21 321.9 221.071 394.895 196.402 C467.889 171.733 282.923 15 192.086 15 C101.249 15 -27.6913 139.383 28.8557 196.402 C85.4027 253.42 148.199 226.457 192.086 268.833 Z")
EYEL = ell(155.5, 109.0, 5.784, 9.839)
EYER = ell(269.6, 109.8, 5.611, 9.011)
MOUTH= ell(206.3, 191.1, 16.128, 12.848)
WAND = [('M',[(374.207,168.891)]), ('L',[(451.207,66.891)])]
STAR = parse("M487.198 9.806 C492.232 17.361 479.757 43.496 479.757 43.496 C475.089 43.331 498.721 48.335 508.019 56.162 C517.318 63.989 475.931 64.877 475.931 64.877 C475.931 64.877 479.175 97.936 473.305 95.975 C467.436 94.014 450.678 67.544 450.678 67.544 C450.678 67.544 414.852 74.872 409.818 71.859 C404.784 68.846 438.896 47.811 438.896 47.811 C438.896 47.811 414.25 19.375 419.833 15.883 C425.416 12.390 456.868 32.949 456.868 32.949 C456.868 32.949 482.165 2.251 487.198 9.806 Z")

FEET=(192,292); HAND=(374.207,168.891); STARC=(463.0,50.0)
def rot_pt(p, deg, o=HAND):
    a=math.radians(deg); dx,dy=p[0]-o[0],p[1]-o[1]
    return (o[0]+dx*math.cos(a)-dy*math.sin(a), o[1]+dx*math.sin(a)+dy*math.cos(a))

# ---------- state definitions ----------
S = {
 "idle":     dict(label="待机",   fill="#FFC96B", body=dict(), wandRot=0,
                  eyeL=dict(), eyeR=dict(), mouth=dict()),
 "sing":     dict(label="唱歌",   fill="#FFD27A", body=dict(sy=1.05,sx=0.99), wandRot=-22,
                  eyeL=dict(sy=0.42), eyeR=dict(sy=0.42),
                  mouth=dict(sx=1.55,sy=2.35,ty=6)),
 "sleepy":   dict(label="困倦",   fill="#F2C58E", body=dict(sy=0.85,sx=1.09), wandRot=40,
                  eyeL=dict(sy=0.10,ty=4), eyeR=dict(sy=0.10,ty=4),
                  mouth=dict(sx=0.62,sy=0.45,ty=10)),
 "surprise": dict(label="惊讶",   fill="#FFDE96", body=dict(sy=1.13,sx=0.93), wandRot=-30,
                  eyeL=dict(sx=1.5,sy=1.35,ty=-4), eyeR=dict(sx=1.5,sy=1.35,ty=-4),
                  mouth=dict(sx=1.1,sy=1.8,ty=8)),
 "cheer":    dict(label="欢呼",   fill="#FFC14E", body=dict(sy=1.06,rot=-6), wandRot=-46,
                  eyeL=dict(sy=0.5,ty=-3), eyeR=dict(sy=0.5,ty=-3),
                  mouth=dict(sx=1.85,sy=1.15,ty=4)),
 "cast":     dict(label="施法",   fill="#FFE2A4", body=dict(sy=1.10,sx=0.95), wandRot=-36.8,
                  eyeL=dict(sx=1.35,sy=1.25,ty=-2), eyeR=dict(sx=1.35,sy=1.25,ty=-2),
                  mouth=dict(sx=0.72,sy=1.30,ty=6)),
 "wink":     dict(label="\u4fcf\u76ae", fill="#FFCB74", body=dict(sy=1.02,rot=4), wandRot=-15,
                  eyeL=dict(sy=0.08,ty=-1), eyeR=dict(sx=1.18,sy=1.12),
                  mouth=dict(sx=1.30,sy=0.92,tx=9,ty=2)),
 "shy":      dict(label="\u5bb3\u7f9e", fill="#FFB8A6", body=dict(sx=0.88,sy=0.90), wandRot=20,
                  eyeL=dict(sy=0.34,ty=3), eyeR=dict(sy=0.34,ty=3),
                  mouth=dict(sx=0.55,sy=0.58,ty=7)),
 "sad":      dict(label="\u4f24\u5fc3", fill="#E4C7AC", body=dict(sy=0.80,sx=1.14), wandRot=143.2,
                  eyeL=dict(sy=0.55,ty=7), eyeR=dict(sy=0.55,ty=7),
                  mouth=dict(sx=1.32,sy=0.34,ty=15)),
}
CENTER = {"eyeL":(155.5,109.0), "eyeR":(269.6,109.8), "mouth":(206.3,191.1)}

states={}
for name,cfg in S.items():
    b=cfg["body"]
    body = xform(BODY, sx=b.get("sx",1), sy=b.get("sy",1), piv=FEET,
                 rot=b.get("rot",0), rpiv=FEET)
    parts={"body":{"d":emit(body),"fill":cfg["fill"],"filter":"liquid"}}
    for pid, base in (("eyeL",EYEL),("eyeR",EYER),("mouth",MOUTH)):
        c=cfg[pid]
        g = xform(base, sx=c.get("sx",1), sy=c.get("sy",1), piv=CENTER[pid],
                  tx=c.get("tx",0), ty=c.get("ty",0))
        parts[pid]={"d":emit(g),
                    "fill":"#1E1E1E" if pid.startswith("eye") else "#FFEBDA",
                    "opacity":1 if pid.startswith("eye") else 0.82,
                    "filter":"facetex" if pid.startswith("eye") else "mouthtex"}
    r=cfg["wandRot"]
    parts["wand"]={"d":emit([(c,[rot_pt(p,r) for p in pts]) for c,pts in WAND]),
                   "stroke":"#A4A4A4","strokeWidth":7,"fill":"none","filter":"wandtex"}
    parts["star"]={"d":emit([(c,[rot_pt(p,r) for p in pts]) for c,pts in STAR]),
                   "fill":"#5DDAEE","filter":"softblur"}
    sc = rot_pt(STARC, r)
    states[name]={"label":cfg["label"],"paths":parts,
                  "sparkleCenter":[round(sc[0],1),round(sc[1],1)],
                  "sparkles": name in ("sing","cheer","cast"),
                  "sparkleMode": "burst" if name=="cast" else "orbit",
                  "idle":cfg.get("idle")}

IDLE = {
 "idle":    {"kind":"compound","parts":[{"kind":"breathe-y","duration":3.4,"amplitude":0.022},
                                        {"kind":"bob","duration":3.4,"amplitude":7},
                                        {"kind":"blink","selector":["eyeL","eyeR"],"every":4.2}]},
 "sing":    {"kind":"compound","parts":[{"kind":"breathe-y","duration":1.3,"amplitude":0.035},
                                        {"kind":"bob","duration":1.3,"amplitude":5},
                                        {"kind":"sway","duration":2.6,"amplitude":2.5},
                                        {"kind":"pulse","selector":["mouth"],"duration":2.5,"amplitude":0.34},
                                        {"kind":"rotate-around-point","selector":["wand","star"],
                                         "pivot":[374.2,168.9],"duration":2.1,"amplitude":16}]},
 "sleepy":  {"kind":"compound","parts":[{"kind":"breathe-y","duration":5.6,"amplitude":0.04},
                                        {"kind":"bob","duration":5.6,"amplitude":4},
                                        {"kind":"sway","duration":7.0,"amplitude":1.4}]},
 "surprise":{"kind":"compound","parts":[{"kind":"shake","duration":0.28,"amplitude":0.9},
                                        {"kind":"breathe-y","duration":2.0,"amplitude":0.012}]},
 "cheer":   {"kind":"compound","parts":[{"kind":"breathe-y","duration":1.1,"amplitude":0.03},
                                        {"kind":"bob","duration":1.1,"amplitude":9},
                                        {"kind":"sway","duration":2.2,"amplitude":4},
                                        {"kind":"blink","selector":["eyeL","eyeR"],"every":3.0},
                                        {"kind":"rotate-around-point","selector":["wand","star"],
                                         "pivot":[374.2,168.9],"duration":1.03,"amplitude":15}]},
 "cast":    {"kind":"compound","parts":[{"kind":"breathe-y","duration":1.7,"amplitude":0.03},
                                        {"kind":"bob","duration":1.7,"amplitude":5},
                                        {"kind":"pulse","selector":["star"],"duration":0.9,"amplitude":0.14},
                                        {"kind":"rotate-around-point","selector":["wand","star"],
                                         "pivot":[374.2,168.9],"duration":1.7,"amplitude":5}]},
 "wink":    {"kind":"compound","parts":[{"kind":"breathe-y","duration":2.4,"amplitude":0.025},
                                        {"kind":"bob","duration":2.4,"amplitude":6},
                                        {"kind":"sway","duration":3.2,"amplitude":3},
                                        {"kind":"rotate-around-point","selector":["wand","star"],
                                         "pivot":[374.2,168.9],"duration":1.9,"amplitude":11}]},
 "shy":     {"kind":"compound","parts":[{"kind":"breathe-y","duration":2.0,"amplitude":0.04},
                                        {"kind":"bob","duration":2.0,"amplitude":4},
                                        {"kind":"shake","duration":0.5,"amplitude":0.5}]},
 "sad":     {"kind":"compound","parts":[{"kind":"breathe-y","duration":5.0,"amplitude":0.05},
                                        {"kind":"bob","duration":5.0,"amplitude":3},
                                        {"kind":"sway","duration":6.4,"amplitude":1.0}]},
}
for k in states: states[k]["idle"]=IDLE[k]

out = ("// generated by gen.py — 星星小人 5-state animation data\n"
       "window.STATES_DATA = " + json.dumps({
          "name":"星星小人","viewBox":"-60 -80 640 420",
          "idleAnchor":[192,292],
          "order":["idle","sing","cheer","cast","wink","surprise","shy","sad","sleepy"],
          "states":states}, ensure_ascii=False, indent=1) + ";\n")
open("starkid.states.js","w",encoding="utf-8").write(out)
print(len(out), "bytes")
for n,s in states.items(): print(n, {k:len(v["d"]) for k,v in s["paths"].items()})
