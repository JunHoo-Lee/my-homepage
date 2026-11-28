import { OG_SIZE, letterImage } from "./letter";

export const alt = "A Gradient Survivors decision letter";
export const size = OG_SIZE;
export const contentType = "image/png";

export default function Image({ params }: { params: Promise<{ code: string }> }) {
  return letterImage(params);
}
