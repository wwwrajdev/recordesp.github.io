type LogFn = (message: string, detail?: unknown, levelTag?: string) => void;

function logInfo(log: LogFn | undefined, message: string) {
  log?.(message, undefined, '[ESPConnect-Debug]');
}

export async function detectFilesystemType(
  loader: { readFlash: (offset: number, length: number) => Promise<Uint8Array> },
  offset: number,
  size: number,
  log?: LogFn,
) {
  try {
    const readSize = Math.min(8192, size);
    const data = await loader.readFlash(offset, readSize);

    if (data.length < 32) {
      return 'spiffs';
    }

    const textDecoder = new TextDecoder('ascii');
    const dataStr = textDecoder.decode(data);
    if (dataStr.includes('littlefs')) {
      logInfo(log, 'LittleFS detected: found "littlefs" string in partition data');
      return 'littlefs';
    }

    logInfo(log, 'SPIFFS assumed: no "littlefs" string found in partition data');
    return 'spiffs';
  } catch (err) {
    log?.('Failed to detect filesystem type', err);
    return 'spiffs';
  }
}

export async function readPartitionTable(
  loader: { readFlash: (offset: number, length: number) => Promise<Uint8Array> },
  offset = 0x8000,
  length = 0x400,
  log?: LogFn,
) {
  try {
    const data = await loader.readFlash(offset, length);
    const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
    const decoder = new TextDecoder();
    const entries: Array<{
      label: string;
      type: number;
      subtype: number;
      offset: number;
      size: number;
      detectedFilesystem?: string;
    }> = [];
    for (let i = 0; i + 32 <= data.length; i += 32) {
      const magic = view.getUint16(i, true);
      if (magic === 0xffff || magic === 0x0000) break;
      if (magic !== 0x50aa) continue;
      const type = view.getUint8(i + 2);
      const subtype = view.getUint8(i + 3);
      const addr = view.getUint32(i + 4, true);
      const size = view.getUint32(i + 8, true);
      const labelBytes = data.subarray(i + 12, i + 28);
      const label = decoder
        .decode(labelBytes)
        .replace(/\0/g, '')
        .trim();
      entries.push({ label: label || `type 0x${type.toString(16)}`, type, subtype, offset: addr, size });
    }

    for (const entry of entries) {
      if (entry.type === 0x01 && entry.subtype === 0x82) {
        entry.detectedFilesystem = await detectFilesystemType(loader, entry.offset, entry.size, log);
        logInfo(
          log,
          `Partition "${entry.label}" at 0x${entry.offset.toString(16)}: detected as ${entry.detectedFilesystem}`,
        );
      }
    }

    return entries;
  } catch (err) {
    log?.('Failed to read partition table', err);
    return [];
  }
}
