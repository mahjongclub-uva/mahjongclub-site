"""Trace the one bamboo bird, the flowers, the seasons and a single bamboo
stalk from photos of the club's own tile set into SVG paths.

Whole faces are traced once per ink. Stalk tiles are not traced whole: one
stalk is, and the site lays copies of it out, which keeps them small enough
to ship on every page.

The photos are not committed. To regenerate, put them in a folder under the
names used in BOXES and run:

    pip install vtracer pillow numpy scikit-image   # Python 3.12; vtracer crashes on 3.14
    python pipeline/trace_tiles.py path/to/photos

Each face is cropped, split into blue, red and green ink by hue (the cream
face and grey shadows fall out on saturation), and scaled into the tile
face's 88 x 124 box. The moulded ridges inside the ink are kept as fine
pale lines. The corner names and numbers are left out; the site draws those
with its own brush glyphs.
"""

import re
import sys
import tempfile
from pathlib import Path

import numpy as np
import vtracer
from PIL import Image, ImageFilter
from scipy import ndimage
from skimage.measure import label, regionprops
from skimage.morphology import remove_small_objects

ROOT = Path(__file__).resolve().parent.parent
# Whole faces go in a static sprite the browser caches, rather than inline in
# every page's HTML; the small stalk path is inlined once per page instead.
OUT = ROOT / "public/tiles/traced.svg"
STALK_OUT = ROOT / "src/components/tracedStalk.ts"
# Keep in step with the inks in src/components/TileArtwork.tsx.
HEX = {"BLUE": "#114ba3", "RED": "#c94219", "GREEN": "#236951"}

# Face boxes (left, top, right, bottom) in each close-up, measured on a
# 1500 x 2000 preview of the 1932 x 2576 originals. The box may overlap the
# table or a hand; only ink inside the tile's cream face is kept.
PREVIEW_SCALE = 1932 / 1500
BOXES = {
    "bird": ("9fcd486b", (395, 650, 1340, 1770)),
    "flower1": ("b72c7f63", (25, 495, 715, 1395)),
    "flower2": ("b72c7f63", (720, 490, 1420, 1400)),
    "flower3": ("130651fd", (15, 455, 765, 1420)),
    "flower4": ("130651fd", (745, 385, 1480, 1370)),
    "season1": ("bdace90a", (270, 435, 1195, 1545)),
    "season2": ("35bcd009", (280, 370, 1230, 1510)),
    "season3": ("b0922e6d", (330, 465, 1245, 1575)),
    "season4": ("6a72fb67", (300, 425, 1265, 1570)),
}

# Each ink: hue range in degrees, then the minimum saturation and value
# (0-255) to count as ink. The green is dark, so it gets a lower floor.
INKS = {
    "BLUE": (200, 275, 90, 40),
    "RED": (330, 25, 90, 40),
    "GREEN": (85, 190, 80, 15),
}
FACE_W, FACE_H = 88, 124
TRACE_HEIGHT = 800  # working height, in pixels, every face is traced at
FACE_EROSION = 12  # pixels trimmed off the face's edge, to drop bevel shading
RIDGE_CONTRAST = 6  # how much brighter than its surroundings a ridge line is
# Blur radius: more for bamboo, to close its moulded ridges.
SMOOTH = {"bamboo": 3, "bird": 2, "flower": 2, "season": 2}

# The top-left green stalk of the 7-bamboo, in preview coordinates.
STALK = ("33d29c7b", (570, 940, 695, 1190))


def tile_face(hsv: np.ndarray) -> np.ndarray:
    """The tile's cream face: the largest pale region, holes (the ink)
    filled in, pulled in a little so the bevel's shading stays out."""
    cream = (hsv[..., 1] < 70) & (hsv[..., 2] > 120)
    regions = label(cream)
    largest = max(regionprops(regions), key=lambda r: r.area).label
    face = ndimage.binary_fill_holes(regions == largest)
    return ndimage.binary_erosion(face, iterations=FACE_EROSION)


def ink_masks(crop: Image.Image, smooth: float, face: np.ndarray | bool = True) -> dict[str, Image.Image]:
    """One mask per ink, limited to `face` (a stalk crop is all face)."""
    hsv = np.asarray(crop.convert("HSV"), dtype=np.float32)
    hue = hsv[..., 0] * 360 / 255
    masks = {}
    for name, (lo, hi, sat, val) in INKS.items():
        ink = (hsv[..., 1] > sat) & (hsv[..., 2] > val) & face
        in_hue = (hue >= lo) & (hue <= hi) if lo < hi else (hue >= lo) | (hue <= hi)
        mask = Image.fromarray(np.where(ink & in_hue, 0, 255).astype(np.uint8))
        # Blur and re-threshold, to drop glare speckle.
        mask = mask.filter(ImageFilter.GaussianBlur(smooth))
        masks[name] = mask.point(lambda v: 0 if v < 128 else 255)
    return masks


def ridges(crop: Image.Image, ink: np.ndarray) -> np.ndarray:
    """Moulded ridges inside the ink: lines slightly brighter than the ink
    around them, widened a little so they survive at tile size."""
    lum = np.asarray(crop.convert("L"), dtype=np.float32)
    bright = lum - ndimage.gaussian_filter(lum, 4) > RIDGE_CONTRAST
    lines = bright & ndimage.binary_erosion(ink, iterations=2)
    lines = ndimage.binary_opening(lines, iterations=1)
    lines = remove_small_objects(lines, max_size=30)  # speckle, not ridges
    return ndimage.binary_dilation(lines, iterations=1) & ink


def trace(mask: Image.Image) -> list[str]:
    """Trace a black-on-white mask; return path data in mask pixels."""
    # The file-based call. vtracer crashes under Python 3.14; use 3.12.
    with tempfile.TemporaryDirectory() as tmp:
        src, dst = Path(tmp, "mask.png"), Path(tmp, "mask.svg")
        mask.save(src)
        vtracer.convert_image_to_svg_py(
            str(src),
            str(dst),
            colormode="binary",
            filter_speckle=24,
            mode="spline",
            corner_threshold=90,
            length_threshold=6.0,
            splice_threshold=60,
            path_precision=1,
        )
        svg = dst.read_text()
    paths = []
    for d, tx, ty in re.findall(
        r'<path d="([^"]+)"[^>]*transform="translate\(([-\d.]+),([-\d.]+)\)"', svg
    ):
        paths.append(shift(d, float(tx), float(ty)))
    return paths


def shift(d: str, tx: float, ty: float) -> str:
    """Move absolute path coordinates by (tx, ty); vtracer emits M/L/C/Z only."""
    out, xy = [], 0
    for token in re.findall(r"[A-Za-z]|-?\d+(?:\.\d+)?", d):
        if token.isalpha():
            out.append(token)
            xy = 0
            continue
        out.append(str(round(float(token) + (tx if xy == 0 else ty))))
        xy ^= 1
    return re.sub(r" ?([A-Za-z]) ?", r"\1", " ".join(out))


def drop_corner_text(mask: Image.Image) -> Image.Image:
    """Remove ink lying wholly in the top band: the flowers' and seasons'
    names and numbers (always blue or red; the plants start lower). The photos
    are too soft there to trace cleanly, so the site draws them with its own
    brush glyphs instead."""
    ink = np.asarray(mask) == 0
    h = ink.shape[0]
    for region in regionprops(label(ink)):
        if region.bbox[2] < h * 0.42:
            ink[region.slice] &= ~region.image
    return Image.fromarray(np.where(ink, 0, 255).astype(np.uint8))


def face(name: str, photos: Path, photo: str, box: tuple[int, int, int, int]) -> str:
    image = Image.open(photos / f"{photo}-image.jpg").convert("RGB")
    crop = image.crop(tuple(round(v * PREVIEW_SCALE) for v in box))
    # Every face traced at one working height: finer than the site ever draws
    # a tile, coarse enough to keep the sprite small.
    k = TRACE_HEIGHT / crop.height
    crop = crop.resize((round(crop.width * k), TRACE_HEIGHT), Image.LANCZOS)
    face_mask = tile_face(np.asarray(crop.convert("HSV"), dtype=np.float32))
    # Fit the photographed face to 88 x 124 by width, centred vertically.
    ys, xs = np.nonzero(face_mask)
    inset = FACE_EROSION  # tile_face pulled the edge in by this much
    left, right = xs.min() - inset, xs.max() + inset
    top, bottom = ys.min() - inset, ys.max() + inset
    s = FACE_W / (right - left)
    dx = -left * s
    dy = (FACE_H - (bottom - top) * s) / 2 - top * s
    layers = []
    smooth = SMOOTH[name.rstrip("0123456789")]
    masks = ink_masks(crop, smooth, face_mask)
    any_ink = np.any([np.asarray(m) == 0 for m in masks.values()], axis=0)
    cut = ridges(crop, any_ink)
    for ink, mask in masks.items():
        mask = Image.fromarray(np.where((np.asarray(mask) == 0) & ~cut, 0, 255).astype(np.uint8))
        if name.startswith(("flower", "season")) and ink != "GREEN":
            mask = drop_corner_text(mask)
        for d in trace(mask):
            layers.append(f'<path fill="{HEX[ink]}" fill-rule="evenodd" d="{d}"/>')
    return (
        f'<symbol id="{name}" viewBox="0 0 {FACE_W} {FACE_H}">'
        f'<g transform="translate({dx:.2f} {dy:.2f}) scale({s:.5f})">'
        + "".join(layers)
        + "</g></symbol>"
    )


def stalk(photos: Path) -> str:
    """One green stalk, centred on the origin and 100 units tall.

    Rebuilt rather than traced, since the photographed stalk leans: its
    widest lobe and pinch are measured, and three ovals drawn from them.
    """
    photo, box = STALK
    image = Image.open(photos / f"{photo}-image.jpg").convert("RGB")
    crop = image.crop(tuple(round(v * PREVIEW_SCALE) for v in box))
    ink = ndimage.binary_fill_holes(np.asarray(ink_masks(crop, SMOOTH["bamboo"])["GREEN"]) == 0)
    regions = label(ink)  # the stalk alone, not stray specks around it
    ink = regions == max(regionprops(regions), key=lambda r: r.area).label
    rows = [y for y in range(ink.shape[0]) if ink[y].any()]
    top, bottom = rows[0], rows[-1]
    k = 100 / (bottom - top)
    half = np.array([np.ptp(np.nonzero(ink[y])[0]) / 2 for y in range(top, bottom + 1)]) * k
    half = np.convolve(np.pad(half, 8, mode="edge"), np.ones(17) / 17, mode="valid")
    wide = half.max()
    middle = half[len(half) // 6 : -len(half) // 6]
    pinch = middle.min()
    q = np.sqrt(1 - (pinch / wide) ** 2)
    ry = 50 / (1 + 2 * q)
    centres = (-(50 - ry), 0, 50 - ry)
    yy = np.linspace(-50, 50, 121)
    widths = np.max(
        [wide * np.sqrt(np.clip(1 - ((yy - c) / ry) ** 2, 0, None)) for c in centres], axis=0
    )
    right = [f"{w:.1f} {y:.1f}" for w, y in zip(widths, yy)]
    left = [f"{-w:.1f} {y:.1f}" for w, y in zip(widths[::-1], yy[::-1])]
    outline = "M" + "L".join(right + left) + "Z"
    # The groove: a slim capsule down the middle.
    g, r = 0.1 * widths.max(), 36
    groove = f"M{-g:.1f} {-r}A{g:.1f} {g:.1f} 0 0 1 {g:.1f} {-r}V{r}A{g:.1f} {g:.1f} 0 0 1 {-g:.1f} {r}Z"
    return outline + groove


if __name__ == "__main__":
    photos = Path(sys.argv[1])
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(
        '<svg xmlns="http://www.w3.org/2000/svg">\n'
        "<!-- Generated by pipeline/trace_tiles.py from photos of the club's set. -->\n"
        + "\n".join(face(name, photos, *spec) for name, spec in BOXES.items())
        + "\n</svg>\n",
        encoding="utf-8",
    )
    STALK_OUT.write_text(
        "// Generated by pipeline/trace_tiles.py from photos of the club's set.\n"
        "// Do not edit by hand.\n\n"
        "/** One bamboo stalk, centred on the origin, 100 units tall. */\n"
        f'export const STALK =\n  "{stalk(photos)}";\n',
        encoding="utf-8",
    )
    for path in (OUT, STALK_OUT):
        print(f"wrote {path} ({path.stat().st_size // 1024} KB)")
