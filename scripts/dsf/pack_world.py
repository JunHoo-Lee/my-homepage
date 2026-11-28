#!/usr/bin/env python3
"""Packs the world atlas of /play/dsf.

Run by hand from the repository root, output is committed:

    python3 -I scripts/dsf/pack_world.py

Reads only the regions named below from scripts/dsf/src/world/ (Ninja Adventure
Asset Pack, CC0), applies the recolours, draws the hand-made sprites from the
pixel grids in this file and writes

    public/play/dsf/world/atlas.png
    app/play/dsf/engine/atlas.ts

It fails if a hand-made pixel is not one of the palette colours.
"""
import os
import sys

from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
SRC = os.path.join(ROOT, "scripts", "dsf", "src", "world")
OUT_PNG = os.path.join(ROOT, "public", "play", "dsf", "world", "atlas.png")
OUT_TS = os.path.join(ROOT, "app", "play", "dsf", "engine", "atlas.ts")
ATLAS_W = 256


def rgb(text):
    text = text.lstrip("#")
    return (int(text[0:2], 16), int(text[2:4], 16), int(text[4:6], 16))


# ----------------------------------------------------------------------------- palette
PALETTE = {
    "k": "#141b1b",  # outline
    "G": "#74a334", "g": "#56864c", "d": "#345a52",  # grass
    "D": "#a3754e", "e": "#9c6546", "b": "#965340",  # dirt
    "s": "#56634d", "S": "#5f7160", "t": "#8d977f", "T": "#abc2bc",  # stone
    "o": "#e46d3a", "O": "#ef914f", "A": "#ffad5d", "Y": "#ffe18d", "W": "#ffffff",  # warm
    "c": "#2d697b", "C": "#548789", "u": "#79b8ce", "U": "#71ddee",  # cool
    "L": "#f2eaf1", "B": "#fce2ca",  # light
    "r": "#e0394c", "p": "#a5608b",  # accent
}
PALETTE_RGB = {key: rgb(value) for key, value in PALETTE.items()}
ALLOWED = set(PALETTE_RGB.values())


def grid(rows):
    """A sprite from rows of palette keys; '.' is transparent."""
    width = len(rows[0])
    image = Image.new("RGBA", (width, len(rows)), (0, 0, 0, 0))
    for y, row in enumerate(rows):
        if len(row) != width:
            sys.exit("ragged pixel grid: %r" % (rows,))
        for x, key in enumerate(row):
            if key == ".":
                continue
            if key not in PALETTE_RGB:
                sys.exit("off-palette key %r in a hand-made sprite" % key)
            image.putpixel((x, y), PALETTE_RGB[key] + (255,))
    return image


def check_palette(name, image):
    for pixel in image.get_flattened_data():
        if pixel[3] and pixel[:3] not in ALLOWED:
            sys.exit("off-palette pixel %r in hand-made sprite %s" % (pixel, name))


# ----------------------------------------------------------------------------- sources
_sheets = {}


def sheet(path):
    if path not in _sheets:
        _sheets[path] = Image.open(os.path.join(SRC, path)).convert("RGBA")
    return _sheets[path]


def tiles(path, col, row, w=1, h=1):
    return sheet(path).crop((col * 16, row * 16, (col + w) * 16, (row + h) * 16))


def remap(image, table):
    image = image.copy()
    pixels = image.load()
    for y in range(image.height):
        for x in range(image.width):
            p = pixels[x, y]
            if p[3] and p[:3] in table:
                to = table[p[:3]]
                pixels[x, y] = (0, 0, 0, 0) if to is None else to + (p[3],)
    return image


SHORE = {rgb("#71ddee"): None, rgb("#79b8ce"): None, rgb("#adbc3a"): rgb("#74a334"), rgb("#a8a129"): rgb("#56864c")}
VISOR = {rgb("#e0394c"): rgb("#71ddee"), rgb("#8f3e56"): rgb("#2d697b")}
STONES = [rgb("#56634d"), rgb("#5f7160"), rgb("#8d977f"), rgb("#abc2bc")]
OUTLINE = rgb("#141b1b")


def stone(image):
    """The four suspects once ruled out: luma quantised to the stone ramp, outline kept."""
    image = image.copy()
    pixels = image.load()
    for y in range(image.height):
        for x in range(image.width):
            r, g, b, a = pixels[x, y]
            if not a or (r, g, b) == OUTLINE:
                continue
            luma = 0.3 * r + 0.59 * g + 0.11 * b
            step = 0 if luma < 70 else 1 if luma < 120 else 2 if luma < 185 else 3
            pixels[x, y] = STONES[step] + (a,)
    return image


# ----------------------------------------------------------------------------- entries
entries = []  # (name, image, source note)


def add(name, image, note):
    entries.append((name, image, note))


def pack(name, path, col, row, w=1, h=1, table=None):
    image = tiles(path, col, row, w, h)
    if table:
        image = remap(image, table)
    add(name, image, "%s (%d,%d,%d,%d)" % (path, col, row, w, h))


def hand(name, image):
    check_palette(name, image)
    add(name, image, "drawn for this game")


F = "tiles/TilesetFloor.png"
WATER = "tiles/TilesetWater.png"
N = "tiles/TilesetNature.png"
RUIN = "tiles/TilesetVillageAbandoned.png"
EL = "tiles/TilesetElement.png"
HOUSE = "tiles/TilesetHouse.png"
CAMP = "tiles/tileset_camp.png"

# ground
pack("dirt", F, 11, 7, 3, 3)
pack("dirtInner", F, 16, 8, 2, 2)
pack("grass", F, 11, 12)
pack("tufts", F, 12, 12, 4, 1)
pack("pond", WATER, 0, 6, 3, 3, SHORE)
pack("convex", WATER, 5, 7, 2, 2, SHORE)
pack("details", "tiles/TilesetFloorDetail.png", 0, 2, 8, 1)
pack("flowers", N, 0, 11, 7, 1)
pack("bushes", N, 0, 10, 6, 1)
pack("steps", N, 15, 18, 4, 1)
pack("plant", "tiles/AnimPlant.png", 0, 0, 4, 1)
# nature
pack("treeRound", N, 0, 0, 2, 2)
pack("treeDark", N, 2, 0, 2, 2)
pack("treeDead", N, 4, 0, 2, 2)
pack("rock", N, 16, 8, 2, 2)
pack("rockSmall", N, 18, 9)
# ruins
pack("slab", EL, 0, 5, 1, 2)
pack("board", EL, 1, 5, 1, 2)
pack("hall", RUIN, 0, 0, 4, 3)
pack("cave", "tiles/TilesetReliefDetail.png", 0, 7, 3, 3)
pack("stone", RUIN, 2, 3, 1, 3)
pack("tower", "tiles/TilesetTowers.png", 12, 4, 2, 2)
pack("table", EL, 11, 1, 3, 1)
pack("shelfA", EL, 3, 7, 1, 2)
pack("shelfB", EL, 4, 7, 1, 2)
pack("book", CAMP, 7, 8)
pack("candle", CAMP, 13, 7)
pack("arch", HOUSE, 29, 20, 3, 3)
pack("pillar", HOUSE, 0, 19, 1, 3)
pack("post", HOUSE, 7, 21, 1, 2)
pack("lamp", CAMP, 6, 5, 1, 2)
pack("desk", EL, 6, 7, 2, 2)
pack("bookcase", EL, 8, 7, 2, 2)
pack("seated", RUIN, 0, 3, 2, 3)
pack("pillarBroken", RUIN, 3, 3, 1, 3)
pack("frog", RUIN, 9, 5, 2, 2)
pack("fenceEnd", HOUSE, 10, 7)
pack("fenceMid", HOUSE, 11, 7)
add("fenceEndR", tiles(HOUSE, 10, 7).transpose(Image.FLIP_LEFT_RIGHT), "%s (10,7,1,1) mirrored" % HOUSE)

# the lamp with its glass dark: the lit glass is drawn by the engine
lamp_off = tiles(CAMP, 6, 5, 1, 2)
for y in range(17, 20):
    for x in range(11, 14):
        if lamp_off.getpixel((x, y))[:3] == rgb("#f2eaf1"):
            lamp_off.putpixel((x, y), rgb("#5f7160") + (255,))
add("lampOff", lamp_off, "%s (6,5,1,2), glass darkened" % CAMP)

# bubbles and effects
add("emoteDots", sheet("emotes/emote20.png"), "emotes/emote20.png")
add("emoteBang", sheet("emotes/emote21.png"), "emotes/emote21.png")
add("emoteAsk", sheet("emotes/emote23.png"), "emotes/emote23.png")
add("ring", sheet("fx/CircleWhite.png"), "fx/CircleWhite.png, 4 frames of 32x32")
add("spark", sheet("fx/ParticleSpark.png"), "fx/ParticleSpark.png, 7 frames of 10x8")
add("fire", sheet("fx/ParticleFire.png"), "fx/ParticleFire.png, 8 frames of 12x12")
add("shadow", sheet("chars/Shadow.png"), "chars/Shadow.png")

# characters: 16x16 frames, columns down / up / left / right
add("you", remap(sheet("chars/RobotGrey.png"), VISOR), "chars/RobotGrey.png, visor recoloured")
for who, path in (("prompter", "Inspector"), ("bookkeeper", "OldMan"), ("copyist", "Monk"), ("artist", "SorcererBlack")):
    row = sheet("chars/%s.png" % path).crop((0, 0, 64, 16))
    add(who, row, "chars/%s.png row 0" % path)
    add(who + "Stone", stone(row), "chars/%s.png row 0, stone ramp" % path)

# ----------------------------------------------------------------------------- hand-made sprites
hand("mote0", grid([
    "..U..",
    ".UWU.",
    "UWWWU",
    ".UWU.",
    "..U..",
]))
hand("mote1", grid([
    ".....",
    "..U..",
    ".UWU.",
    "..U..",
    ".....",
]))
hand("slabFace", grid([
    "cccccc",
    "U...Uc".replace(".", "c"),
    "UUUUUc",
    "UcUcUc",
    "UUUUUc",
    "cUUUcc",
    "cccccc",
]))
hand("stake", grid([
    "kkk",
    "kAk",
    "kDk",
    "kDk",
    "kek",
    "kek",
    "kbk",
    "kbk",
    ".k.",
]))
SPROUT = [
    ".kkkkkkkk.",
    ".kssSsssk.",
    ".ksTsstsk.",
    ".kssstssk.",
    ".kstsssTk.",
    ".kssssssk.",
    ".kkkkkkkk.",
    "....kk....",
    "...kGgk...",
    "..kkgGk...",
    ".kGgkGkk..",
    "..kkkgGgk.",
    "...kGgkk..",
    "....kk....",
]
hand("sprout0", grid(SPROUT))
hand("sprout1", grid(["." + row[:-1] if index < 8 else row for index, row in enumerate(SPROUT)]))
FOOT = [
    ".ssss.",
    "ssssss",
    "ssssss",
    ".ssss.",
    "......",
    ".ssss.",
    ".ssss.",
]
# the prints lead east along the north path, so they are stored toe to the right
hand("footA", grid(FOOT).rotate(-90, expand=True))
hand("footB", grid(FOOT).rotate(-90, expand=True).transpose(Image.FLIP_TOP_BOTTOM))
CLOCK = [
    "..kkkkkk..",
    ".kLLLLLLk.",
    "kLLLLLLLLk",
    "kLLLLLLLLk",
    "kLLLLkLLLk",
    "kLLLLLLLTk",
    ".kLLLLTTk.",
    "..kkkkkk..",
]
hand("clock0", grid(CLOCK))
hand("clock1", grid([
    "..kkkkkk..",
    ".kLLLLLLk.",
    "kLkLLLLkLk",
    "kLLkLLkLLk",
    "kLLLkkLLLk",
    "kLLLLLLLTk",
    ".kLLLLTTk.",
    "..kkkkkk..",
]))
hand("card0", grid([
    "kkkkk",
    "kLLLk",
    "kLrLk",
    "kLLLk",
    "kLcLk",
    "kLLLk",
    "kkkkk",
]))
hand("card1", grid([
    "kkkkk",
    "kBBBk",
    "kBoBk",
    "kBoBk",
    "kBBBk",
    "kBcBk",
    "kkkkk",
]))
hand("glow0", grid([
    ".......",
    ".......",
    "..YWY..",
    "..WWW..",
    "..YWY..",
    ".......",
    ".......",
]))
hand("glow1", grid([
    ".......",
    ".......",
    "..YYY..",
    "A.YWY.A",
    "..YYY..",
    ".......",
    ".......",
]))

# the door: a slab that fills the arch, drawn behind it
DOOR_W, DOOR_H = 22, 30
door = Image.new("RGBA", (DOOR_W, DOOR_H), PALETTE_RGB["S"] + (255,))
for y in range(DOOR_H):
    for x in range(DOOR_W):
        key = "S"
        if x < 2 or y < 2:
            key = "t"
        if x >= DOOR_W - 2:
            key = "s"
        if y % 10 == 9 and 1 < x < DOOR_W - 2:
            key = "s"
        if y % 10 == 0 and y > 0 and 1 < x < DOOR_W - 2:
            key = "t"
        door.putpixel((x, y), PALETTE_RGB[key] + (255,))
SOCKETS = [(3 + index * 4, 12) for index in range(5)]
for sx, sy in SOCKETS:
    for dy in range(2):
        for dx in range(2):
            door.putpixel((sx + dx, sy + dy), PALETTE_RGB["k"] + (255,))
hand("doorClosed", door)
opened = Image.new("RGBA", (DOOR_W, DOOR_H), PALETTE_RGB["k"] + (255,))
for y in range(6, DOOR_H):
    half = 1 + (y - 6) * 8 // (DOOR_H - 6)
    for x in range(DOOR_W // 2 - half, DOOR_W // 2 + half):
        inner = abs(x - DOOR_W / 2 + 0.5) < half * 0.45
        opened.putpixel((x, y), PALETTE_RGB["W" if inner and y > 16 else "Y"] + (255,))
hand("doorOpen", opened)

# compass arrows: east and north-east are drawn, the rest are quarter turns
ARROW_E = grid([
    "..kk...",
    "..kYk..",
    "kkkYYk.",
    "kYYYYYk",
    "kkkYYk.",
    "..kYk..",
    "..kk...",
])
ARROW_NE = grid([
    "..kkkkk",
    "..kYYYk",
    "...kYYk",
    "..kYkYk",
    ".kYk.kk",
    "kYk....",
    ".k.....",
])
arrows = Image.new("RGBA", (7 * 8, 7), (0, 0, 0, 0))
# order: E, SE, S, SW, W, NW, N, NE (clockwise on screen from east)
for index in range(8):
    base = ARROW_E if index % 2 == 0 else ARROW_NE
    # Image.rotate turns counter-clockwise; on screen "clockwise from east" is E, SE, S...
    quarter = index // 2 if index % 2 == 0 else (index + 1) // 2
    arrows.paste(base.rotate(-90 * quarter), (index * 7, 0))
hand("arrows", arrows)

# destination bracket, two frames
bracket = Image.new("RGBA", (32, 16), (0, 0, 0, 0))
for frame, inset in enumerate((1, 3)):
    for cx, cy, dx, dy in ((inset, inset, 1, 1), (15 - inset, inset, -1, 1), (inset, 15 - inset, 1, -1), (15 - inset, 15 - inset, -1, -1)):
        for step in range(4):
            for px, py in ((cx + dx * step, cy), (cx, cy + dy * step)):
                bracket.putpixel((frame * 16 + px, py), PALETTE_RGB["Y"] + (255,))
        for step in range(-1, 5):
            for px, py in ((cx + dx * step, cy - dy), (cx - dx, cy + dy * step)):
                if 0 <= px < 16 and 0 <= py < 16:
                    bracket.putpixel((frame * 16 + px, py), PALETTE_RGB["k"] + (255,))
hand("bracket", bracket)

# ----------------------------------------------------------------------------- shelf packing
order = sorted(range(len(entries)), key=lambda index: (-entries[index][1].height, -entries[index][1].width))
rects = {}
x = y = shelf = 0
for index in order:
    name, image, _ = entries[index]
    if x + image.width > ATLAS_W:
        x = 0
        y += shelf
        shelf = 0
    rects[name] = (x, y, image.width, image.height)
    x += image.width
    shelf = max(shelf, image.height)
height = y + shelf
atlas = Image.new("RGBA", (ATLAS_W, height), (0, 0, 0, 0))
for name, image, _ in entries:
    atlas.paste(image, rects[name][:2])
os.makedirs(os.path.dirname(OUT_PNG), exist_ok=True)
atlas.save(OUT_PNG, optimize=True)

lines = [
    "// Generated by scripts/dsf/pack_world.py. Do not edit by hand.",
    "// Sources are the Ninja Adventure Asset Pack (CC0) and sprites drawn for this game.",
    "",
    "export const ATLAS_SIZE = [%d, %d] as const;" % (ATLAS_W, height),
    "",
    "/** Where the five sockets sit on the closed door, in its own pixels. */",
    "export const DOOR_SOCKETS = [%s] as const;" % ", ".join("[%d, %d]" % s for s in SOCKETS),
    "",
    "export const ATLAS = {",
]
for name, _, note in entries:
    lines.append("  %s: [%d, %d, %d, %d], // %s" % ((name,) + rects[name] + (note,)))
lines += ["} as const;", "", "export type SpriteName = keyof typeof ATLAS;", ""]
os.makedirs(os.path.dirname(OUT_TS), exist_ok=True)
with open(OUT_TS, "w") as handle:
    handle.write("\n".join(lines))
print("atlas %dx%d, %d entries, %d bytes" % (ATLAS_W, height, len(entries), os.path.getsize(OUT_PNG)))
