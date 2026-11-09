const encoder = new globalThis.TextEncoder();
const brands = new WeakMap();
export const WIRE_BYTES = 65536;
export const CHUNK_BYTES = 8192;
export function failure(code = "view.data_invalid") {
  const error = new Error(code); brands.set(error, code); return error;
}
export function safeCode(error) { return brands.get(error) ?? "view.data_invalid"; }
export function snapshot(value, maximum) {
  let nodes = 0, bytes = 0;
  const ancestors = new Set(), parts = [];
  function append(text) {
    bytes += encoder.encode(text).length;
    if (bytes > maximum) throw failure("view.message_too_large");
    parts.push(text);
  }
  function visit(item, depth) {
    if (depth > 64) throw failure("view.depth_limit");
    if (++nodes > 10000) throw failure();
    if (item === null || typeof item === "boolean" || typeof item === "string" || typeof item === "number") {
      if (typeof item === "number" && !Number.isFinite(item)) throw failure();
      if (typeof item === "string" && item.length > maximum) throw failure("view.message_too_large");
      append(JSON.stringify(item)); return item;
    }
    if (typeof item !== "object" || ancestors.has(item)) throw failure();
    const array = Array.isArray(item), prototype = Object.getPrototypeOf(item);
    if (array ? prototype !== Array.prototype : prototype !== null && prototype !== Object.prototype) throw failure();
    const keys = Reflect.ownKeys(item);
    if (keys.length > 10000 - nodes + (array ? 1 : 0)) throw failure();
    const names = keys.filter((key) => !(array && key === "length"));
    if (array && Object.getOwnPropertyDescriptor(item, "length")?.value !== names.length) throw failure();
    const result = array ? [] : Object.create(null);
    ancestors.add(item); append(array ? "[" : "{");
    names.forEach((key, index) => {
      if (typeof key !== "string" || (array && key !== String(index))) throw failure();
      if (index) append(",");
      if (!array) {
        if (key.length > maximum) throw failure("view.message_too_large");
        append(`${JSON.stringify(key)}:`);
      }
      const descriptor = Object.getOwnPropertyDescriptor(item, key);
      if (!descriptor?.enumerable || !Object.hasOwn(descriptor, "value")) throw failure();
      Object.defineProperty(result, key, { value: visit(descriptor.value, depth + 1), enumerable: true });
    });
    append(array ? "]" : "}"); ancestors.delete(item); return result;
  }
  try { const result = visit(value, 0); return { value: result, text: parts.join(""), bytes }; }
  catch (error) { throw failure(safeCode(error)); }
}
export function exact(value, keys) {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    && Object.keys(value).length === keys.length && keys.every((key) => Object.hasOwn(value, key));
}
export async function hash(bytes) {
  const digest = await globalThis.crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}
// Count values/depth without materializing attacker-controlled arrays/objects.
// JSON.parse remains the syntax authority, only after this allocation budget.
function preflightJson(text) {
  let depth = 0, nodes = 0, index = 0;
  const count = () => {
    if (depth > 64) throw failure("view.depth_limit");
    if (++nodes > 10000) throw failure();
  };
  while (index < text.length) {
    const character = text[index];
    if (/\s/u.test(character) || character === "," || character === ":") { index++; continue; }
    if (character === "{" || character === "[") { count(); depth++; index++; continue; }
    if (character === "}" || character === "]") { if (--depth < 0) throw failure(); index++; continue; }
    if (character === '"') {
      index++;
      while (index < text.length && text[index] !== '"') { index += text[index] === "\\" ? 2 : 1; }
      index++;
      let next = index;
      while (next < text.length && /\s/u.test(text[next])) next++;
      if (text[next] !== ":") count();
      continue;
    }
    count();
    while (index < text.length && !/\s/u.test(text[index]) && !",[]{}:".includes(text[index])) index++;
  }
}
export async function transferPackets(text, kind, id) {
  const data = encoder.encode(text), sha256 = await hash(data);
  const packets = [{ type: "transfer.start", payload: { id, kind, bytes: data.length, chunks: Math.ceil(data.length / CHUNK_BYTES), sha256 } }];
  for (let offset = 0, index = 0; offset < data.length; offset += CHUNK_BYTES, index++) {
    const binary = String.fromCharCode(...data.subarray(offset, offset + CHUNK_BYTES));
    packets.push({ type: "transfer.chunk", payload: { id, index, data: globalThis.btoa(binary) } });
  }
  packets.push({ type: "transfer.end", payload: { id } }); return packets;
}

// One bounded assembly per direction. Timers release an idle buffer even when
// no more messages arrive; a digest cannot revive an invalidated assembly.
export function createTransferReceiver(kind, maximum) {
  let current, generation = 0, lastId = -1;
  function clear() {
    generation++;
    if (current) {
      globalThis.clearTimeout(current.absolute); globalThis.clearTimeout(current.idle);
      current.bytes = undefined; current = undefined;
    }
  }
  function idle(batch) {
    globalThis.clearTimeout(batch.idle);
    batch.idle = globalThis.setTimeout(clear, 10000);
  }
  return {
    clear,
    receive(type, payload) {
      let operationGeneration = generation;
      try {
        if (type === "transfer.start") {
          if (!exact(payload, ["id", "kind", "bytes", "chunks", "sha256"])
            || !Number.isSafeInteger(payload.id) || payload.id <= lastId || payload.id < 0 || payload.kind !== kind
            || !Number.isSafeInteger(payload.bytes) || payload.bytes <= 0 || payload.bytes > maximum
            || !Number.isSafeInteger(payload.chunks) || payload.chunks !== Math.ceil(payload.bytes / CHUNK_BYTES)
            || payload.chunks > Math.ceil(maximum / CHUNK_BYTES) || typeof payload.sha256 !== "string" || !/^[a-f0-9]{64}$/u.test(payload.sha256)) throw failure();
          clear(); operationGeneration = generation; lastId = payload.id;
          current = { id: payload.id, size: payload.bytes, chunks: payload.chunks, sha256: payload.sha256,
            bytes: new Uint8Array(payload.bytes), index: 0, offset: 0, generation,
            absolute: globalThis.setTimeout(clear, 30000), idle: undefined };
          idle(current); return { complete: false };
        }
        const batch = current;
        if (!batch || payload?.id !== batch.id) throw failure();
        if (type === "transfer.chunk") {
          if (!exact(payload, ["id", "index", "data"]) || payload.index !== batch.index || batch.index >= batch.chunks
            || typeof payload.data !== "string" || payload.data.length > 10924 || !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/u.test(payload.data)) throw failure();
          const binary = globalThis.atob(payload.data);
          const expected = Math.min(CHUNK_BYTES, batch.size - batch.offset);
          if (binary.length !== expected || globalThis.btoa(binary) !== payload.data) throw failure();
          for (let index = 0; index < binary.length; index++) batch.bytes[batch.offset + index] = binary.charCodeAt(index);
          batch.offset += binary.length; batch.index++; idle(batch); return { complete: false };
        }
        if (type !== "transfer.end" || !exact(payload, ["id"]) || batch.index !== batch.chunks || batch.offset !== batch.size) throw failure();
        return (async () => {
          try {
            const checksum = await hash(batch.bytes);
            if (current !== batch || generation !== batch.generation || checksum !== batch.sha256) throw failure();
            const text = new globalThis.TextDecoder("utf-8", { fatal: true }).decode(batch.bytes);
            preflightJson(text);
            const result = snapshot(JSON.parse(text), maximum).value;
            clear(); return { complete: true, value: result };
          } catch (error) {
            if (generation === operationGeneration) clear();
            throw failure(safeCode(error));
          }
        })();
      } catch (error) {
        if (type !== "transfer.start" && generation === operationGeneration) clear();
        throw failure(safeCode(error));
      }
    },
  };
}
