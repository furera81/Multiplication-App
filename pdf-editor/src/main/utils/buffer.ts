/** Copy a Node Buffer/Uint8Array into a fresh, plain ArrayBuffer for sending over IPC. */
export function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const out = new ArrayBuffer(bytes.byteLength)
  new Uint8Array(out).set(bytes)
  return out
}
