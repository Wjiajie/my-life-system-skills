import { validateJsonSchema } from "../../packages/schemas/src/vnext.mjs";
import { snapshot, exact, failure, safeCode, WIRE_BYTES, createTransferReceiver, transferPackets } from "../../packages/template-sdk/protocol.mjs";

/** Explicit author preview adapter. A candidate is inert JSON, never a stored story. */
export function createPreviewSession({ sessionId, packageOrigin, source, view, schema, send, onCandidate, onStatus }) {
  if (!/^[a-f0-9]{64}$/u.test(sessionId) || !/^http:\/\/127\.0\.0\.1:[1-9][0-9]*$/u.test(packageOrigin)) throw failure("view.origin_invalid");
  const definition = schema === undefined ? undefined : snapshot(schema, 2 * 1024 * 1024).value;
  const encoder = new globalThis.TextEncoder();
  let closed = false, ready = false, incoming = 0, outgoing = 0;
  let receiveEpoch = 0, renderEpoch = 0, transferId = 0, lastSent = -Infinity;
  let pending = 0, pendingBytes = 0, windowStart = 0, count = 0;
  const transfer = createTransferReceiver("initialization.submit", 2 * 1024 * 1024);
  const notify = (code) => { try { onStatus(code); } catch { /* Preview UI callback has no protocol authority. */ } };
  const close = () => { closed = true; receiveEpoch++; renderEpoch++; transfer.clear(); };
  const require = (condition, code) => { if (!condition) throw failure(code); };
  function candidate(payload) {
    require(exact(payload, ["initialization"]), "view.payload_invalid");
    const checked = validateJsonSchema(definition, payload.initialization);
    require(checked.ok, checked.code);
    onCandidate(payload.initialization); notify("initialization.candidate");
  }
  return {
    receive(event) {
      let bytes;
      try {
        require(!closed, "view.closed");
        require(event.source === source, "view.source_invalid");
        require(event.origin === packageOrigin, "view.origin_invalid");
        require(typeof event.data === "string" && event.data.length <= WIRE_BYTES && encoder.encode(event.data).length <= WIRE_BYTES, "view.message_too_large");
        const now = globalThis.performance.now();
        if (now - windowStart >= 1000) { windowStart = now; count = 0; }
        require(++count <= 120, "view.rate_limit");
        bytes = encoder.encode(event.data).length;
        if (pending >= 32 || pendingBytes + bytes > 1024 * 1024) { close(); throw failure("view.inbound_limit"); }
      } catch (error) { notify(safeCode(error)); return; }
      pending++; pendingBytes += bytes;
      let operationEpoch;
      return (async () => { try {
        const message = snapshot(JSON.parse(event.data), WIRE_BYTES).value;
        require(exact(message, ["version", "sessionId", "sequence", "type", "payload"]) && message.version === 1 && message.sessionId === sessionId, "view.json_invalid");
        require(Number.isSafeInteger(message.sequence) && message.sequence === incoming, "view.sequence_invalid");
        const isTransfer = ["transfer.start", "transfer.chunk", "transfer.end"].includes(message.type);
        if (!isTransfer) incoming++;
        require(ready || message.type === "view.ready", "view.not_ready");
        if (isTransfer) {
          require(view === "initialization", "view.type_invalid");
          const result = transfer.receive(message.type, message.payload);
          incoming++;
          if (message.type === "transfer.start") receiveEpoch++;
          const epoch = operationEpoch = receiveEpoch;
          const completed = await result;
          if (closed || epoch !== receiveEpoch) return;
          if (completed.complete) candidate(completed.value);
        } else if (message.type === "view.ready") {
          require(!ready && exact(message.payload, []), "view.payload_invalid");
          ready = true; notify("view.ready");
        } else if (message.type === "initialization.submit") {
          require(view === "initialization" && exact(message.payload, ["initialization"]), "view.payload_invalid");
          candidate(message.payload); receiveEpoch++; transfer.clear();
        } else if (message.type === "view.activate" || message.type === "view.close") {
          require(exact(message.payload, []) && (message.type === "view.close" || view === "card"), "view.payload_invalid");
          if (message.type === "view.close") close();
          notify(message.type);
        } else throw failure("view.type_invalid");
      } catch (error) { if (!closed && (operationEpoch === undefined || operationEpoch === receiveEpoch)) notify(safeCode(error)); }
      })().finally(() => { pending--; pendingBytes -= bytes; });
    },
    async render(data) {
      let epoch;
      try {
        require(!closed, "view.closed"); require(ready, "view.not_ready");
        const copy = snapshot(data, 4 * 1024 * 1024);
        epoch = ++renderEpoch;
        const envelope = (type, payload) => JSON.stringify({ version: 1, sessionId, sequence: outgoing, type, payload });
        require(Number.isSafeInteger(transferId), "view.sequence_invalid");
        const packets = encoder.encode(envelope("host.render", copy.value)).length <= WIRE_BYTES
          ? [{ type: "host.render", payload: copy.value }] : await transferPackets(copy.text, "host.render", transferId++);
        for (const packet of packets) {
          if (closed || epoch !== renderEpoch) return;
          const delay = Math.max(0, 25 - (globalThis.performance.now() - lastSent));
          if (delay) await new Promise((resolve) => globalThis.setTimeout(resolve, delay));
          if (closed || epoch !== renderEpoch) return;
          require(Number.isSafeInteger(outgoing), "view.sequence_invalid");
          const raw = envelope(packet.type, packet.payload);
          require(encoder.encode(raw).length <= WIRE_BYTES, "view.message_too_large");
          outgoing++; lastSent = globalThis.performance.now(); send(raw);
        }
      } catch (error) { if (!closed && (epoch === undefined || epoch === renderEpoch)) notify(safeCode(error)); }
    },
    close,
  };
}
