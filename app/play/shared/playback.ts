/*
 * Web Audio on a phone is treated as "ambient" sound: on an iPhone the ringer
 * switch silences it completely, and most phones sit on silent. Games are
 * something the player asked to hear, so before the first sound we ask for
 * the "playback" category instead, which ignores that switch.
 *
 * Safari 16.4+ has an API for this. Older iOS versions switch category when
 * an <audio> element is playing, so there we loop a second of silence.
 *
 * Call it from a user gesture (click, keydown, pointerdown), before or right
 * after creating the AudioContext. Safe to call many times; never throws.
 */

let done = false;
let silence: HTMLAudioElement | null = null;

// one second of 8-bit mono silence at 8 kHz
function silentWav() {
  const samples = 8000;
  const bytes = new Uint8Array(44 + samples);
  const view = new DataView(bytes.buffer);
  const text = (offset: number, value: string) => {
    for (let i = 0; i < value.length; i += 1) bytes[offset + i] = value.charCodeAt(i);
  };
  text(0, "RIFF");
  view.setUint32(4, 36 + samples, true);
  text(8, "WAVEfmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, 8000, true);
  view.setUint32(28, 8000, true);
  view.setUint16(32, 1, true);
  view.setUint16(34, 8, true);
  text(36, "data");
  view.setUint32(40, samples, true);
  bytes.fill(128, 44);
  return URL.createObjectURL(new Blob([bytes], { type: "audio/wav" }));
}

export function preferPlayback() {
  if (done || typeof navigator === "undefined") return;
  done = true;
  try {
    const session = (navigator as Navigator & { audioSession?: { type: string } }).audioSession;
    if (session) {
      session.type = "playback";
      return;
    }
    // iPadOS reports itself as a Mac; touch points tell them apart
    const apple = /iPad|iPhone|iPod/.test(navigator.userAgent) || (/Macintosh/.test(navigator.userAgent) && navigator.maxTouchPoints > 1);
    if (!apple) return;
    silence = new Audio(silentWav());
    silence.loop = true;
    silence.setAttribute("playsinline", "");
    void silence.play().catch(() => {
      // not in a gesture after all: try again on the next call
      done = false;
    });
  } catch {
    /* sound is decoration; never break the game for it */
  }
}
