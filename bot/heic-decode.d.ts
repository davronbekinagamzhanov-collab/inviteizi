declare module "heic-decode" {
  /** HEIC/HEIF → RGBA (libheif в wasm) */
  export default function decode(o: { buffer: Uint8Array | ArrayBuffer }): Promise<{ width: number; height: number; data: Uint8ClampedArray }>;
}
