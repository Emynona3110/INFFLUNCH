# -*- coding: utf-8 -*-
"""Recadre un SVG sur le contenu : calcule la bbox des <path> (en appliquant leur
transform), l'intersecte avec l'éventuel clipPath, et réécrit width/height/viewBox.
Les paths ne sont PAS touchés. --apply pour écrire, sinon simple rapport."""
import io, re, sys, math, os

NUM = re.compile(r'[-+]?(?:\d*\.\d+(?:[eE][-+]?\d+)?|\d+\.?(?:[eE][-+]?\d+)?)')
CMD = re.compile(r'([MmLlHhVvCcSsQqTtAaZz])')

def tokens(d):
    out, i = [], 0
    for part in CMD.split(d):
        part = part.strip()
        if not part:
            continue
        if len(part) == 1 and part in 'MmLlHhVvCcSsQqTtAaZz':
            out.append(part)
        else:
            out.extend(float(x) for x in NUM.findall(part))
    return out

ARGS = dict(M=2, L=2, H=1, V=1, C=6, S=4, Q=4, T=2, A=7, Z=0)

def path_points(d):
    """Points absolus (sommets + points de contrôle) d'un path."""
    pts, i = [], 0
    tk = tokens(d)
    cur = (0.0, 0.0); start = (0.0, 0.0); cmd = None
    while i < len(tk):
        if isinstance(tk[i], str):
            cmd = tk[i]; i += 1
        if cmd is None:
            break
        up = cmd.upper(); rel = cmd.islower(); n = ARGS[up]
        if up == 'Z':
            cur = start
            if i < len(tk) and isinstance(tk[i], str):
                continue
            continue
        if i + n > len(tk):
            break
        a = tk[i:i+n]; i += n
        def pt(x, y):
            return (cur[0] + x, cur[1] + y) if rel else (x, y)
        if up == 'M':
            cur = pt(a[0], a[1]); start = cur; pts.append(cur); cmd = 'l' if rel else 'L'
        elif up == 'L':
            cur = pt(a[0], a[1]); pts.append(cur)
        elif up == 'H':
            cur = (cur[0] + a[0] if rel else a[0], cur[1]); pts.append(cur)
        elif up == 'V':
            cur = (cur[0], cur[1] + a[0] if rel else a[0]); pts.append(cur)
        elif up == 'C':
            p1 = pt(a[0], a[1]); p2 = pt(a[2], a[3]); cur = pt(a[4], a[5]); pts += [p1, p2, cur]
        elif up == 'S':
            p2 = pt(a[0], a[1]); cur = pt(a[2], a[3]); pts += [p2, cur]
        elif up == 'Q':
            p1 = pt(a[0], a[1]); cur = pt(a[2], a[3]); pts += [p1, cur]
        elif up == 'T':
            cur = pt(a[0], a[1]); pts.append(cur)
        elif up == 'A':
            end = pt(a[5], a[6]); rx, ry = abs(a[0]), abs(a[1])
            pts += [end, (end[0]-rx, end[1]-ry), (end[0]+rx, end[1]+ry)]
            cur = end
    return pts

def parse_transform(t):
    """-> (a,b,c,d,e,f) ; composition gauche→droite."""
    m = (1.0, 0, 0, 1.0, 0, 0)
    def mul(m1, m2):
        a1,b1,c1,d1,e1,f1 = m1; a2,b2,c2,d2,e2,f2 = m2
        return (a1*a2+c1*b2, b1*a2+d1*b2, a1*c2+c1*d2, b1*c2+d1*d2,
                a1*e2+c1*f2+e1, b1*e2+d1*f2+f1)
    for name, args in re.findall(r'(\w+)\s*\(([^)]*)\)', t or ''):
        v = [float(x) for x in NUM.findall(args)]
        if name == 'translate':
            m = mul(m, (1, 0, 0, 1, v[0], v[1] if len(v) > 1 else 0))
        elif name == 'scale':
            sx = v[0]; sy = v[1] if len(v) > 1 else sx
            m = mul(m, (sx, 0, 0, sy, 0, 0))
        elif name == 'matrix':
            m = mul(m, tuple(v[:6]))
        elif name == 'rotate':
            r = math.radians(v[0]); cs, sn = math.cos(r), math.sin(r)
            m = mul(m, (cs, sn, -sn, cs, 0, 0))
    return m

def apply(m, p):
    a,b,c,d,e,f = m
    return (a*p[0] + c*p[1] + e, b*p[0] + d*p[1] + f)

def bbox(svg):
    xs, ys = [], []
    for attrs, d in re.findall(r'<path\b([^>]*?)\bd="([^"]*)"', svg, re.S):
        tr = re.search(r'transform="([^"]*)"', attrs)
        m = parse_transform(tr.group(1) if tr else '')
        for p in path_points(d):
            q = apply(m, p); xs.append(q[0]); ys.append(q[1])
    if not xs:
        return None
    box = [min(xs), min(ys), max(xs), max(ys)]
    clip = re.search(r'<clipPath[^>]*>\s*<rect([^>]*)/?>', svg, re.S)
    if clip:
        at = clip.group(1)
        g = lambda k, dflt=0.0: float(re.search(k + r'="([-\d.eE+]+)"', at).group(1)) if re.search(k + r'="', at) else dflt
        cx, cy, cw, ch = g('x'), g('y'), g('width', 1e9), g('height', 1e9)
        box = [max(box[0], cx), max(box[1], cy), min(box[2], cx + cw), min(box[3], cy + ch)]
    return box

def trim(path, apply_it):
    svg = io.open(path, encoding='utf-8').read()
    b = bbox(svg)
    if not b:
        return path, None
    x0, y0, x1, y1 = math.floor(b[0]), math.floor(b[1]), math.ceil(b[2]), math.ceil(b[3])
    w, h = x1 - x0, y1 - y0
    old = re.search(r'viewBox="([^"]*)"', svg)
    oldvb = old.group(1) if old else '?'
    new = re.sub(r'\swidth="[^"]*"', ' width="%d"' % w, svg, count=1)
    new = re.sub(r'\sheight="[^"]*"', ' height="%d"' % h, new, count=1)
    new = re.sub(r'\sviewBox="[^"]*"', ' viewBox="%d %d %d %d"' % (x0, y0, w, h), new, count=1)
    if apply_it:
        io.open(path, 'w', encoding='utf-8', newline='').write(new)
    return oldvb, '%d %d %d %d' % (x0, y0, w, h)

if __name__ == '__main__':
    do = '--apply' in sys.argv
    files = [a for a in sys.argv[1:] if a != '--apply']
    for f in sorted(files):
        o, n = trim(f, do)
        print('%-28s %-22s -> %s' % (os.path.basename(f), o, n))
