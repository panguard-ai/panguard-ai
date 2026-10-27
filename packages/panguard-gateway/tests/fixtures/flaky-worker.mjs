// A stand-in ATR worker for pool tests. The first instance starts and answers
// (except for events whose content is "hang"); every later instance fails to
// start, so the pool runs out of respawns. Coordinated through a marker file
// named by FLAKY_WORKER_MARKER.
import { existsSync, writeFileSync } from 'node:fs';
import { parentPort } from 'node:worker_threads';

const marker = process.env.FLAKY_WORKER_MARKER;
if (marker && existsSync(marker)) {
  parentPort.postMessage({ kind: 'fatal', error: 'simulated startup failure' });
} else {
  if (marker) writeFileSync(marker, '1');
  parentPort.postMessage({
    kind: 'ready',
    rules: { runtime: 5, toolDefinitions: 5 },
    atrVersion: 'test',
  });
  parentPort.on('message', (req) => {
    if (req.event.content === 'hang') return;
    parentPort.postMessage({
      kind: 'result',
      id: req.id,
      result: {
        result: {
          outcome: 'allow',
          reason: 'ok',
          matchedRules: [],
          confidence: 0,
          durationMs: 0,
          adviseOnly: false,
        },
        windows: 1,
        coverage: 'full',
        engineError: false,
      },
    });
  });
}
