# Architectural Decisions & Design Rationale

This document details the core technical strategies implemented in the Agent Console, addressing sequence recovery, layout stability, reconnection state, and future scalability scenarios.

---

## 1. Sequence-Based Ordering & Deduplication

### Data Structure Used
We implemented a custom sequence buffer (`SeqBuffer`) backed by a native JavaScript **`Map<number, ServerMessage>`** and two integer cursor tracking variables: `lastDeliveredSeq` and `nextExpectedSeq`.

### Why This Design?
1. **O(1) Efficiency**: In chaos mode, messages can arrive out-of-order, delayed, or duplicated. A simple array-based queue would require \(O(N)\) search overhead or \(O(N \log N)\) sorting operations on every frame. A `Map` provides constant-time \(O(1)\) lookups and insertions by sequence number.
2. **Cursor-Based Contiguous Draining**: The buffer does not sort the keys. Instead, on every message insertion, a `while` loop checks if the `nextExpectedSeq` key exists in the `Map`. If found, it drains the message, updates the cursors, and repeats. This eliminates sorting and keeps the CPU overhead minimal.
3. **Strict Deduplication**: `lastDeliveredSeq` acts as a fence. Any message with a sequence number `seq <= lastDeliveredSeq` is immediately discarded. This safely handles duplicate messages delivered by the server during reconnection replays or packet duplication.

---

## 2. Preventing Layout Shift During Tool Call Interruptions

### CSS and Layout Strategy
1. **Block vs Inline Layout**: Text tokens are rendered in a `span` element with `whitespace-pre-wrap break-words`. This ensures flowing text adjusts naturally to the container boundaries without forcing vertical layout recalculations.
2. **Stable Tool Cards**: Tool cards (`ToolCallCard`) use block layouts with static margins, a fixed left border (`border-l-4`), and stable padding (`py-2`, `px-4`). No height-collapsing or dynamic expansion animations are applied when rendering.
3. **Scrollable Code Blocks**: Arguments and results are formatted inside `<pre>` elements with `overflow-x-auto`. This prevents long JSON payloads from wrapping unpredictably and causing sudden vertical layout jumps.
4. **Instant Badge State Swap**: The badge indicating tool status switches from `waiting` to `complete` in place without shifting adjacent text or layout blocks.

### Rendering State Strategy
* The assistant's response is structured in React state as an array of **segments** (either a `TextSegment` or a `ToolSegment`).
* When a `TOOL_CALL` arrives, the active text segment is frozen. The state machine appends a new `ToolSegment` to the message's segment list.
* When a subsequent `TOKEN` is received (following the tool call), the text appending logic detects that the last segment in the array is a tool card, so it inserts a **new** `TextSegment` instead of appending to the previous one.
* Each segment is rendered with a stable, unique `id` key. This prevents React from unmounting or re-rendering existing DOM nodes, guaranteeing that previous text and cards remain locked in place.

---

## 3. Reconnection State Recovery Approach

### Tracking DOM "Consumed" vs. Socket "Received"
* **Socket Received**: Includes all raw packets arriving on the WebSocket. These might be out-of-order, duplicates, or packets stored in the pending buffer waiting for missing sequences.
* **DOM Consumed**: Tracked by `lastSeqRef.current` in the connection layer, which is synchronized with the state machine reducer's `lastProcessedSeq`. This reference is updated *only* when a message has successfully bypassed the `SeqBuffer` ordering queue and has been dispatched and applied to the React state. It represents the exact, gap-free state of what has been rendered in the UI.

### State Recovery Protocol
1. **Disconnection Detection**: When the socket closes, a connection failure state is flagged, showing a non-intrusive indicator badge without freezing the screen or blocking scroll.
2. **Exponential Backoff**: Reconnections are attempted using backoff logic (starting at 500ms and doubling up to a 10s maximum cap) to avoid overloading the server.
3. **Resume Transmission**: Upon socket reconnection, the client immediately transmits a `RESUME { last_seq: lastSeqRef.current }` message.
4. **Replay Re-filtering**: The server replays the event stream starting from `last_seq + 1`. If there is any overlap (messages that the socket received but the DOM did not process yet), `SeqBuffer` automatically deduplicates them.
5. **Replay Suppression**: A `replayActiveRef` boolean is toggled during the replay phase. While active, the client suppresses outgoing compliance replies (such as sending a `PONG` in response to a replayed `PING` or a `TOOL_ACK` in response to a replayed `TOOL_CALL`). This prevents duplicate acknowledgement packets from corrupting the server's tracking state.

---

## 4. Scaling to 50 Concurrent Agent Streams (Operations Dashboard)

If this console were scaled to show 50 agent feeds concurrently on a single screen, we would make the following changes:

1. **State Sharding & Normalization**: Shard the global state reducer by a unique `stream_id` or session ID. The chat and timeline stores would be structured as a normalized dictionary: `{ streams: { [streamId]: { messages, timeline, status } } }`.
2. **Web Worker Thread Offloading**: Move raw WebSocket listeners, JSON parsing, sequence buffer checks, and JSON diff calculations to a background `SharedWorker` or dedicated Web Worker. The worker would send only clean, pre-ordered UI payloads back to the main UI thread.
3. **Aggressive DOM Virtualization**: Use virtualization libraries (`react-window` or `react-virtualized`) for the chat logs and timeline views. Instead of rendering thousands of DOM nodes across 50 streams, only the currently visible nodes in the viewport would be rendered.
4. **Render Throttling & Batching**: Buffer fast-incoming tokens in a queue and trigger UI updates in batches (e.g., every 150-250ms) using a timer or `requestAnimationFrame`, rather than dispatching a state update for every single token.
5. **Lazy Context Diffs**: Compute and render context snapshot differences *only* when the user explicitly expands or inspects a specific agent stream, instead of performing background diffing on all 50 sessions continuously.

---

## 5. Scaling to 100x Longer Responses (Full Document Generation)

If the console had to process document-length responses (e.g., millions of tokens) instead of short chat messages, we would adapt the system as follows:

1. **Rope Data Structure**: Storing megabytes of text as a single flat JavaScript string causes massive \(O(N^2)\) memory allocations on every append. We would store text using a **Rope** data structure or an array of text chunk strings.
2. **Markdown Virtualization**: Render long documents page-by-page or block-by-block. Only the visible viewport lines would be parsed and rendered into HTML/React elements.
3. **Timeline Event Roll-ups**: Instead of rendering every token batch as an individual timeline row, we would compress token batches into time-window blocks (e.g., "10,000 tokens generated in 5 seconds") to keep the timeline performance high and DOM footprint small.
4. **IndexedDB Local Checkpointing**: Save the processed sequence and segment configurations to `IndexedDB` at designated checkpoints. If a connection drops during a massive document transfer, the client can resume from the last saved checkpoint instead of replaying megabytes of data over the socket.
5. **Incremental Path Diffs**: For context snapshots, compute diffs on demand at specific leaf paths (RFC 6902 JSON Patches) instead of running a full-document `diffJson` on a half-megabyte object.
