import { failure, safeCode, snapshot, exact, transferPackets, createTransferReceiver, WIRE_BYTES } from "./protocol.mjs";

export function createTemplateClient({ origin, bridge, onRender, onError }) {
  const match = typeof origin === "string" && /^https:\/\/omn-template-([a-f0-9]{64})\.invalid$/u.exec(origin);
  if (!match) throw failure("view.origin_invalid");
  const sessionId = match[1];
  let outgoing = 0, incoming = 0, transferId = 0, closed = false, busy = false;
  const receiver = createTransferReceiver("host.render", 4 * 1024 * 1024);
  let receiveGeneration = 0;
  let lastSent = -Infinity;
  const notify = (code) => { try { onError(code); } catch { /* Package callback has no host authority. */ } };
  const envelope = (type, payload) => JSON.stringify({ version: 1, sessionId, sequence: outgoing, type, payload });
  function post(type, payload) {
    if (!Number.isSafeInteger(outgoing)) throw failure("view.sequence_invalid");
    const raw = envelope(type, payload);
    if (new globalThis.TextEncoder().encode(raw).length > WIRE_BYTES) throw failure("view.message_too_large");
    bridge.postMessage(raw); outgoing++; lastSent = globalThis.performance.now();
  }
  async function paced(type, payload) {
    const delay = Math.max(0, 25 - (globalThis.performance.now() - lastSent));
    if (delay) await new Promise((resolve) => globalThis.setTimeout(resolve, delay));
    if (closed) throw failure("view.closed");
    post(type, payload);
  }
  async function send(type, payload) {
    if (closed) throw failure("view.closed");
    if (busy) throw failure("view.busy");
    busy = true;
    try {
      const copy = snapshot(payload, 2 * 1024 * 1024);
      if (new globalThis.TextEncoder().encode(envelope(type, copy.value)).length <= WIRE_BYTES) await paced(type, copy.value);
      else {
        if (!Number.isSafeInteger(transferId)) throw failure("view.sequence_invalid");
        const packets = await transferPackets(copy.text, type, transferId++);
        for (const packet of packets) await paced(packet.type, packet.payload);
      }
    } catch (error) {
      const code = safeCode(error); notify(code); throw failure(code);
    } finally { busy = false; }
  }
  bridge.onmessage = (event) => {
    if (closed) return;
    try {
      if (typeof event.data !== "string" || event.data.length > WIRE_BYTES || new globalThis.TextEncoder().encode(event.data).length > WIRE_BYTES) throw failure();
      const message = snapshot(JSON.parse(event.data), WIRE_BYTES).value;
      if (!exact(message, ["version", "sessionId", "sequence", "type", "payload"]) || message.version !== 1
        || message.sessionId !== sessionId) throw failure();
      if (!Number.isSafeInteger(message.sequence) || message.sequence !== incoming) throw failure("view.sequence_invalid");
      if (message.type === "host.render") {
        receiveGeneration++; receiver.clear(); incoming++; onRender(message.payload); return;
      }
      if (!["transfer.start", "transfer.chunk", "transfer.end"].includes(message.type)) throw failure();
      const result = receiver.receive(message.type, message.payload);
      if (message.type === "transfer.start") receiveGeneration++;
      const epoch = receiveGeneration;
      incoming++;
      if (message.type === "transfer.end") void Promise.resolve(result).then((value) => {
        if (closed || epoch !== receiveGeneration) return;
        if (!value.complete) throw failure();
        onRender(value.value);
      }).catch((error) => { if (!closed && epoch === receiveGeneration) notify(safeCode(error)); });
    } catch (error) { notify(safeCode(error)); }
  };
  try { post("view.ready", {}); }
  catch (error) { closed = true; bridge.onmessage = null; throw failure(safeCode(error)); }
  return {
    submitInitialization: (value) => send("initialization.submit", { initialization: value }),
    activate: () => send("view.activate", {}),
    async close() {
      if (closed) return;
      closed = true; receiveGeneration++; receiver.clear(); bridge.onmessage = null;
      try { post("view.close", {}); } catch (error) { const code = safeCode(error); notify(code); throw failure(code); }
    },
  };
}
export function connectTemplate(callbacks) {
  const bridge = globalThis.omnTemplate;
  if (!bridge || typeof bridge.postMessage !== "function") throw failure("view.sdk_unavailable");
  return createTemplateClient({ ...callbacks, origin: globalThis.location.origin, bridge });
}
