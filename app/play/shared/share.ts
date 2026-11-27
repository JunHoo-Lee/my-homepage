/*
 * "Send this to someone": the native share sheet on phones, the clipboard
 * everywhere else. Returns what happened so the button can say so.
 */
export async function shareLink(title: string, text: string, path: string): Promise<"shared" | "copied" | "failed"> {
  const url = new URL(path, window.location.origin).toString();
  try {
    if (typeof navigator.share === "function") {
      await navigator.share({ title, text, url });
      return "shared";
    }
  } catch (error) {
    // the person closed the share sheet: that is an answer, not a failure
    if (error instanceof DOMException && error.name === "AbortError") return "shared";
  }
  try {
    await navigator.clipboard.writeText(url);
    return "copied";
  } catch {
    return "failed";
  }
}
