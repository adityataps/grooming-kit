import type { Participant, RoomState, RoomType } from '@grooming-kit/shared';

/** Grace period before a disconnected participant is permanently removed (LLD §7). */
const DISCONNECT_GRACE_MS = 30_000;

interface ParticipantRecord extends Participant {
  socketId: string | null;
  disconnectTimer: ReturnType<typeof setTimeout> | null;
}

export abstract class RoomBase {
  readonly code: string;
  readonly createdAt: number;
  abstract readonly type: RoomType;

  protected participants = new Map<string, ParticipantRecord>();

  constructor(code: string) {
    this.code = code;
    this.createdAt = Date.now();
  }

  addParticipant(
    participantId: string,
    displayName: string,
    socketId: string,
    isModerator: boolean
  ): void {
    this.participants.set(participantId, {
      id: participantId,
      displayName,
      isModerator,
      connected: true,
      socketId,
      disconnectTimer: null,
    });
  }

  getParticipant(participantId: string): Participant | undefined {
    const record = this.participants.get(participantId);
    if (!record) return undefined;
    const { id, displayName, isModerator, connected } = record;
    return { id, displayName, isModerator, connected };
  }

  isModerator(participantId: string): boolean {
    return this.participants.get(participantId)?.isModerator === true;
  }

  /** Reconnects a previously-known participant to a new socket, clearing any pending removal. */
  reconnectParticipant(participantId: string, socketId: string): boolean {
    const record = this.participants.get(participantId);
    if (!record) return false;
    if (record.disconnectTimer) {
      clearTimeout(record.disconnectTimer);
      record.disconnectTimer = null;
    }
    record.connected = true;
    record.socketId = socketId;
    return true;
  }

  /** Immediate, intentional removal (explicit "leave"), no grace period. */
  removeParticipant(participantId: string): void {
    const record = this.participants.get(participantId);
    if (record?.disconnectTimer) clearTimeout(record.disconnectTimer);
    this.participants.delete(participantId);
  }

  /** Network-blip/refresh path: mark disconnected, remove for good only after the grace period. */
  markDisconnected(participantId: string, onExpire: () => void): void {
    const record = this.participants.get(participantId);
    if (!record) return;
    record.connected = false;
    record.socketId = null;
    record.disconnectTimer = setTimeout(() => {
      this.participants.delete(participantId);
      onExpire();
    }, DISCONNECT_GRACE_MS);
  }

  isEmpty(): boolean {
    return this.participants.size === 0;
  }

  protected listParticipants(): Participant[] {
    return Array.from(this.participants.values()).map(
      ({ id, displayName, isModerator, connected }) => ({ id, displayName, isModerator, connected })
    );
  }

  /** Public: current display names in the room, used to de-duplicate a new joiner's name.
   *  Optionally excludes one participant (e.g. the one being renamed) from the check. */
  listDisplayNames(excludeParticipantId?: string): string[] {
    return Array.from(this.participants.values())
      .filter((p) => p.id !== excludeParticipantId)
      .map((p) => p.displayName);
  }

  /** Renames an existing participant. Returns false if the participant isn't found. */
  renameParticipant(participantId: string, displayName: string): boolean {
    const record = this.participants.get(participantId);
    if (!record) return false;
    record.displayName = displayName;
    return true;
  }

  abstract toState(): RoomState;
}
