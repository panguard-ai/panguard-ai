/**
 * ResponseContainmentController — Layer 3. Maps a session escalation onto the
 * existing response/ primitives (process kill, file quarantine).
 *
 * Escalations are session-oriented; the response primitives are
 * resource-oriented (a PID, a file path). A SessionResourceResolver bridges the
 * two. Until a chokepoint (Layer 1) and session-resource tracking are live, the
 * resolver returns nothing and this controller is a safe no-op in practice —
 * but every escalation is still logged, never silently dropped.
 *
 * @module @panguard-ai/panguard-guard/containment/response-controller
 */
import { createLogger } from '@panguard-ai/core';
import type { ContainmentController } from './guard-gate.js';
import type { ContainmentMode } from './types.js';

const logger = createLogger('panguard-guard:containment');

/** Resolves the OS resources currently owned by an agent session. */
export interface SessionResourceResolver {
  resolve(sessionId: string): {
    readonly pids: readonly number[];
    readonly files: readonly string[];
  };
}

/** Narrow view of ProcessKiller (the real one is wired via a thin adapter). */
export interface ProcessKillLike {
  kill(pid: number): Promise<unknown>;
}

/** Narrow view of FileQuarantine. */
export interface FileQuarantineLike {
  quarantine(filePath: string): Promise<unknown>;
}

export interface ResponseControllerDeps {
  readonly resolver: SessionResourceResolver;
  readonly killer: ProcessKillLike;
  readonly quarantine: FileQuarantineLike;
}

export class ResponseContainmentController implements ContainmentController {
  constructor(private readonly deps: ResponseControllerDeps) {}

  async escalate(sessionId: string, mode: ContainmentMode): Promise<void> {
    const { pids, files } = this.deps.resolver.resolve(sessionId);
    switch (mode) {
      case 'kill':
        for (const pid of pids) await this.safeKill(pid);
        return;
      case 'quarantine':
        for (const file of files) await this.safeQuarantine(file);
        return;
      case 'branch':
      case 'hitl':
      case 'deceive':
        // Write-branch overlay, the HITL gate, and deception are later slices.
        // Log so an escalation is never silently dropped.
        logger.warn(`Containment mode '${mode}' not yet implemented for session ${sessionId}`);
        return;
    }
  }

  private async safeKill(pid: number): Promise<void> {
    try {
      await this.deps.killer.kill(pid);
    } catch (err) {
      logger.error(`Failed to kill pid ${pid}: ${(err as Error).message}`);
    }
  }

  private async safeQuarantine(file: string): Promise<void> {
    try {
      await this.deps.quarantine.quarantine(file);
    } catch (err) {
      logger.error(`Failed to quarantine ${file}: ${(err as Error).message}`);
    }
  }
}
