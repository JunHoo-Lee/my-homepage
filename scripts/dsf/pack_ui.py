"""
Builds the two UI images of /play/dsf that are not copied as they are:

  public/play/dsf/ui/faces.png   228 x 38, one row of 38 x 38 portraits:
                                 you, mote, prompter, bookkeeper, copyist, artist
  public/play/dsf/ui/icons.png   27 x 9, three 9 x 9 icons: book, speaker on, speaker off

Run by hand from the repository root, output committed:

  python3 -I scripts/dsf/pack_ui.py

The suspect portraits are the face cards of the Ninja Adventure Asset Pack
(Pixel-boy and AAA, CC0, see scripts/dsf/src/LICENSE-NinjaAdventure-CC0.txt).
The robot's visor is recoloured to cyan exactly as the world packer does, so
sprite and portrait match. Mote and the icons are drawn here from pixel grids.
"""

import os
import sys

from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
SRC = os.path.join(ROOT, "scripts", "dsf", "src", "ui", "faces")
OUT = os.path.join(ROOT, "public", "play", "dsf", "ui")
CELL = 38

# the shared recolour of the robot (spec 2.3)
ROBOT = {(0xE0, 0x39, 0x4C): (0x71, 0xDD, 0xEE), (0x8F, 0x3E, 0x56): (0x2D, 0x69, 0x7B)}

PALETTE = {
    ".": None,
    "o": (0x14, 0x1B, 0x1B),
    "s": (0x3B, 0x36, 0x43),
    "r": (0x4A, 0x52, 0x70),
    "c": (0x71, 0xDD, 0xEE),
    "d": (0x2D, 0x69, 0x7B),
    "w": (0xFF, 0xFF, 0xFF),
    "g": (0xFF, 0xE1, 0x8D),
    "b": (0x96, 0x53, 0x40),
    "p": (0xE0, 0x39, 0x4C),
}


def face(name, recolour=None):
    image = Image.open(os.path.join(SRC, name + "-face.png")).convert("RGBA")
    if image.size != (CELL, CELL):
        sys.exit(f"{name}: expected {CELL} x {CELL}, got {image.size}")
    if recolour:
        pixels = image.load()
        for y in range(CELL):
            for x in range(CELL):
                r, g, b, a = pixels[x, y]
                if (r, g, b) in recolour:
                    pixels[x, y] = (*recolour[(r, g, b)], a)
    return image


def mote():
    """A grain of static: a dark field with sparse specks and one bright diamond."""
    image = Image.new("RGBA", (CELL, CELL), (*PALETTE["o"], 255))
    pixels = image.load()
    # sparse specks in short horizontal runs, like the sea (fixed positions, no randomness in the build)
    seed = 20261128
    for n in range(46):
        seed = (seed * 1103515245 + 12345) & 0x7FFFFFFF
        x = seed % CELL
        seed = (seed * 1103515245 + 12345) & 0x7FFFFFFF
        y = seed % CELL
        seed = (seed * 1103515245 + 12345) & 0x7FFFFFFF
        run = 1 + seed % 3
        colour = PALETTE["s"] if n % 3 else PALETTE["r"]
        for dx in range(run):
            if 0 <= x + dx < CELL and abs(x + dx - 18) + abs(y - 18) > 8:
                pixels[x + dx, y] = (*colour, 255)
    # the 9 x 9 diamond, cyan with a white core and a darker rim
    cx = cy = 18
    for y in range(-5, 6):
        for x in range(-5, 6):
            d = abs(x) + abs(y)
            if d <= 1:
                colour = PALETTE["w"]
            elif d <= 4:
                colour = PALETTE["c"]
            elif d == 5:
                colour = PALETTE["d"]
            else:
                continue
            pixels[cx + x, cy + y] = (*colour, 255)
    # four small rays, so it reads as light
    for k in (7, 8):
        for dx, dy in ((k, 0), (-k, 0), (0, k), (0, -k)):
            pixels[cx + dx, cy + dy] = (*PALETTE["c"], 255)
    return image


ICONS = {
    "book": [
        ".ggggggg.",
        ".g.ggggg.",
        ".g.ggggg.",
        ".g.g...g.",
        ".g.ggggg.",
        ".g.ggggg.",
        ".g.ggggg.",
        ".g.ggggg.",
        ".ggggggg.",
    ],
    "sound": [
        ".........",
        "....g....",
        "...gg.g..",
        "ggggg..g.",
        "ggggg..g.",
        "ggggg..g.",
        "...gg.g..",
        "....g....",
        ".........",
    ],
    "muted": [
        ".........",
        "....g....",
        "...gg....",
        "ggggg.p.p",
        "ggggg..p.",
        "ggggg.p.p",
        "...gg....",
        "....g....",
        ".........",
    ],
}


def icon(rows):
    if len(rows) != 9 or any(len(row) != 9 for row in rows):
        sys.exit("an icon must be 9 x 9")
    image = Image.new("RGBA", (9, 9), (0, 0, 0, 0))
    pixels = image.load()
    for y, row in enumerate(rows):
        for x, key in enumerate(row):
            colour = PALETTE[key]
            if colour:
                pixels[x, y] = (*colour, 255)
    return image


def main():
    os.makedirs(OUT, exist_ok=True)
    cells = [face("RobotGrey", ROBOT), mote(), face("Inspector"), face("OldMan"), face("Monk"), face("SorcererBlack")]
    strip = Image.new("RGBA", (CELL * len(cells), CELL), (0, 0, 0, 0))
    for index, cell in enumerate(cells):
        strip.paste(cell, (index * CELL, 0))
    strip.save(os.path.join(OUT, "faces.png"), optimize=True)

    names = ["book", "sound", "muted"]
    sheet = Image.new("RGBA", (9 * len(names), 9), (0, 0, 0, 0))
    for index, name in enumerate(names):
        sheet.paste(icon(ICONS[name]), (index * 9, 0))
    sheet.save(os.path.join(OUT, "icons.png"), optimize=True)
    print("faces.png", strip.size, "icons.png", sheet.size)


if __name__ == "__main__":
    main()
