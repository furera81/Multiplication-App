import { app } from 'electron'
import { join } from 'node:path'
import { mkdirSync } from 'node:fs'
import { createWorker, type Worker, type RecognizeResult } from 'tesseract.js'

/**
 * Tesseract workers are expensive to spin up (they load the wasm core plus
 * one .traineddata file per language), so we keep one alive per distinct
 * language combination and reuse it across recognize calls. Trained data is
 * cached under userData so repeat OCR runs (and app restarts) don't
 * re-download it.
 */

export type OcrLogger = (status: string, progress: number) => void

const cachePath = (): string => {
  const dir = join(app.getPath('userData'), 'tessdata')
  mkdirSync(dir, { recursive: true })
  return dir
}

const workers = new Map<string, Promise<Worker>>()
// The worker's logger is fixed at creation time, but the caller interested in
// progress changes on every request. Since OCR requests from a single-window
// app are effectively serialized, we just point this at whichever request is
// currently in flight for a given worker key.
const activeListeners = new Map<string, OcrLogger | undefined>()

function keyFor(languages: string[]): string {
  return [...new Set(languages)].sort().join('+') || 'eng'
}

async function getWorker(key: string): Promise<Worker> {
  const existing = workers.get(key)
  if (existing) return existing

  const workerPromise = createWorker(key.split('+'), undefined, {
    cachePath: cachePath(),
    logger: (m) => {
      const listener = activeListeners.get(key)
      if (listener && typeof m.progress === 'number') {
        listener(m.status ?? 'working', m.progress)
      }
    }
  })
  workers.set(key, workerPromise)
  workerPromise.catch(() => workers.delete(key))
  return workerPromise
}

export async function recognizeImage(
  imageBytes: Uint8Array,
  languages: string[],
  onLog?: OcrLogger
): Promise<RecognizeResult> {
  const key = keyFor(languages)
  const worker = await getWorker(key)
  activeListeners.set(key, onLog)
  try {
    return await worker.recognize(Buffer.from(imageBytes))
  } finally {
    activeListeners.delete(key)
  }
}

export async function terminateAllWorkers(): Promise<void> {
  const all = [...workers.values()]
  workers.clear()
  activeListeners.clear()
  await Promise.allSettled(all.map(async (w) => (await w).terminate()))
}
