"""Recorta los sprites de las hojas del diseñador y los exporta como PNG con transparencia.

Uso:  python tools/extract_sprites.py "<carpeta Diseños/Visuales>"
Salida: public/assets/sprites/*.png  (+ manifest.json con tamaños)

Las hojas son JPG con fondo liso (blanco en objetos, paneles oscuros en personajes), así que
el fondo se quita con un relleno desde los bordes por similitud de color.
"""

import json
import sys
from collections import deque
from pathlib import Path

import numpy as np
from PIL import Image

SRC = Path(sys.argv[1] if len(sys.argv) > 1 else '../Diseños/Visuales')
OUT = Path(__file__).resolve().parent.parent / 'public' / 'assets' / 'sprites'
OUT.mkdir(parents=True, exist_ok=True)

CELL = 1254 / 4  # hojas de 4 x 4
manifest: dict[str, dict] = {}


def load(name: str) -> Image.Image:
    return Image.open(SRC / name).convert('RGB')


def cutout(img: Image.Image, tol: float) -> Image.Image:
    """Quita el fondo conectado al borde cuyo color se parece al color típico del borde."""
    a = np.asarray(img).astype(np.int16)
    h, w, _ = a.shape
    border = np.concatenate([a[0], a[-1], a[:, 0], a[:, -1]])
    bg = np.median(border, axis=0)
    close = np.sqrt(((a - bg) ** 2).sum(axis=2)) < tol
    seen = np.zeros((h, w), bool)
    q = deque()
    for x in range(w):
        for y in (0, h - 1):
            if close[y, x] and not seen[y, x]:
                seen[y, x] = True
                q.append((y, x))
    for y in range(h):
        for x in (0, w - 1):
            if close[y, x] and not seen[y, x]:
                seen[y, x] = True
                q.append((y, x))
    while q:
        y, x = q.popleft()
        for ny, nx in ((y + 1, x), (y - 1, x), (y, x + 1), (y, x - 1)):
            if 0 <= ny < h and 0 <= nx < w and not seen[ny, nx] and close[ny, nx]:
                seen[ny, nx] = True
                q.append((ny, nx))
    alpha = np.where(seen, 0, 255).astype(np.uint8)
    alpha = keep_main_parts(alpha)
    rgba = np.dstack([a.astype(np.uint8), alpha])
    out = Image.fromarray(rgba, 'RGBA')
    bbox = out.getchannel('A').getbbox()
    return out.crop(bbox) if bbox else out


def keep_main_parts(alpha: np.ndarray, pad: int = 6) -> np.ndarray:
    """Descarta pedazos de la celda vecina: conserva la pieza mayor y lo que toque su caja (hojas, sombras)."""
    h, w = alpha.shape
    label = np.zeros((h, w), np.int32)
    boxes = [None]
    for y0 in range(h):
        for x0 in range(w):
            if alpha[y0, x0] == 0 or label[y0, x0]:
                continue
            lid = len(boxes)
            label[y0, x0] = lid
            q = deque([(y0, x0)])
            n, x1, y1, x2, y2 = 0, x0, y0, x0, y0
            while q:
                y, x = q.popleft()
                n += 1
                x1, y1, x2, y2 = min(x1, x), min(y1, y), max(x2, x), max(y2, y)
                for dy in (-1, 0, 1):
                    for dx in (-1, 0, 1):
                        ny, nx = y + dy, x + dx
                        if 0 <= ny < h and 0 <= nx < w and alpha[ny, nx] and not label[ny, nx]:
                            label[ny, nx] = lid
                            q.append((ny, nx))
            boxes.append((n, x1, y1, x2, y2))
    if len(boxes) <= 2:
        return alpha
    main_id = max(range(1, len(boxes)), key=lambda i: boxes[i][0])
    _, mx1, my1, mx2, my2 = boxes[main_id]
    keep = np.zeros(len(boxes), bool)
    for i in range(1, len(boxes)):
        _, x1, y1, x2, y2 = boxes[i]
        keep[i] = x1 <= mx2 + pad and x2 >= mx1 - pad and y1 <= my2 + pad and y2 >= my1 - pad and x1 >= mx1 - pad and x2 <= mx2 + pad
    return np.where(keep[label], alpha, 0).astype(np.uint8)


def save(name: str, img: Image.Image):
    img.save(OUT / f'{name}.png')
    manifest[name] = {'w': img.width, 'h': img.height}


def fit(img: Image.Image, max_side: int, resample=Image.LANCZOS) -> Image.Image:
    k = max_side / max(img.size)
    return img.resize((max(1, round(img.width * k)), max(1, round(img.height * k))), resample)


def cell(sheet: Image.Image, row: int, col: int, inset: int = 6) -> Image.Image:
    x0 = round(col * CELL) + inset
    y0 = round(row * CELL) + inset
    return sheet.crop((x0, y0, round((col + 1) * CELL) - inset, round((row + 1) * CELL) - inset))


# ---------------------------------------------------------------- suelos (64 px = 1 casilla a 2x)
GROUND = {
    'textura10.jpg': {
        'asphalt': (0, 0), 'asphalt-cracked': (0, 1), 'asphalt-grass': (0, 2), 'asphalt-rubble': (0, 3),
        'concrete': (2, 0), 'concrete-cracked': (2, 1), 'pavers': (2, 2), 'tiles-dark': (2, 3),
        'dirt': (3, 0), 'gravel': (3, 1), 'grass': (3, 2), 'mud': (3, 3),
    },
    'textura9.jpg': {'metal-floor': (0, 0), 'metal-rust': (1, 0), 'grate': (1, 1), 'hazard': (1, 3), 'grass-dense': (2, 3), 'mud-wet': (2, 2)},
    'textura5.jpg': {'water': (0, 0)},
}
for sheet_name, tiles in GROUND.items():
    sheet = load(sheet_name)
    for name, (r, c) in tiles.items():
        inset = 80 if sheet_name == 'textura5.jpg' else 4
        save(f'ground-{name}', cell(sheet, r, c, inset).resize((64, 64), Image.LANCZOS))

# ---------------------------------------------------------------- objetos (fondo blanco)
OBJECTS = {
    'textura6.jpg': {
        'core-blue': (0, 0), 'core-red': (0, 1), 'core-blue-damaged': (0, 2), 'core-red-damaged': (0, 3),
        'core-blue-destroyed': (1, 0), 'core-red-destroyed': (1, 1), 'crate': (1, 2), 'crate-open': (1, 3),
        'crate-blue': (2, 0), 'crate-red': (2, 1), 'item-wood': (2, 2), 'item-metal': (2, 3),
        'item-ammo': (3, 0), 'item-medkit': (3, 1), 'item-pistol': (3, 2), 'item-shotgun': (3, 3),
    },
    'textura2.jpg': {
        'wall-wood-h': (0, 0), 'wall-wood-v': (0, 1), 'wall-metal-h': (1, 0), 'wall-metal-v': (1, 1),
        'trap': (2, 2), 'wall-wood-broken': (3, 0), 'wall-wood-rubble': (3, 1), 'wall-metal-broken': (3, 2), 'wall-metal-rubble': (3, 3),
        'sandbags': (2, 0),
    },
    'textura4.jpg': {
        'tree': (0, 0), 'tree-autumn': (0, 1), 'tree-dead': (0, 2), 'bush': (1, 0), 'bush-dry': (1, 1), 'grass-tuft': (1, 2),
        'rock': (2, 2), 'rocks': (2, 3), 'debris': (3, 2), 'bricks': (3, 3),
    },
    'textura7.jpg': {
        'car-red-v': (0, 1), 'car-wreck-v': (0, 3), 'van-v': (1, 1), 'truck-v': (1, 3), 'bus-v': (2, 1),
        'car-red-h': (0, 0), 'car-wreck-h': (0, 2), 'van-h': (1, 0), 'truck-h': (1, 2),
        'container-red-h': (2, 2), 'container-red-v': (2, 3), 'container-blue-h': (3, 0), 'container-blue-v': (3, 1),
    },
    'Textura1.jpg': {
        'barrier': (1, 2), 'cone': (1, 3), 'lamp': (2, 0), 'lantern': (2, 1), 'barrel': (2, 2), 'tires': (2, 3),
        'fence': (3, 1), 'barrier-concrete': (3, 3),
    },
}
for sheet_name, objs in OBJECTS.items():
    sheet = load(sheet_name)
    for name, (r, c) in objs.items():
        save(name, fit(cutout(cell(sheet, r, c), tol=42), 160))

# ---------------------------------------------------------------- personajes y zombis (hoja general)
main = load('Texturas.jpg')


def char(name: str, cx: int, cy: int, w: int = 44, h: int = 50, tol: float = 22, flip: bool = False):
    img = cutout(main.crop((cx - w // 2, cy - h // 2 - 2, cx + w // 2, cy + h // 2 - 2)), tol)
    if flip:
        img = img.transpose(Image.FLIP_LEFT_RIGHT)
    save(name, img.resize((img.width * 2, img.height * 2), Image.NEAREST))


ROWS = {'idle': 185, 'walk': 233, 'pistol': 283, 'shotgun': 333, 'hurt': 382, 'dead': 430}
for prefix, cols in (('p1', (307, 375, 445, 523)), ('p2', (870, 937, 1005, 1077))):
    char(f'{prefix}-front', cols[0], ROWS['idle'])
    char(f'{prefix}-back', cols[1], ROWS['idle'])
    char(f'{prefix}-side', cols[0], ROWS['pistol'], w=52)  # mira a la derecha con el arma
    char(f'{prefix}-side-shotgun', cols[0], ROWS['shotgun'], w=56)
    char(f'{prefix}-dead', cols[3], ROWS['dead'], w=56, h=40)

# Zombi normal (oleada 1), rápido (oleada 2) y resistente (horda final)
for i, x in enumerate((115, 152, 190, 227)):
    char(f'zombie-normal-{i}', x, 607, w=38)
for i, x in enumerate((340, 377, 413, 450)):
    char(f'zombie-fast-{i}', x, 607, w=38)
char('zombie-normal-dead', 217, 765, w=60, h=36)

(OUT / 'manifest.json').write_text(json.dumps(manifest, indent=1))
print(f'{len(manifest)} sprites -> {OUT}')
