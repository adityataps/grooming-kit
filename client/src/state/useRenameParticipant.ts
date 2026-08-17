import { useCallback } from 'react';
import { useRoom } from './RoomContext';
import { saveDisplayName } from '../displayName';

/**
 * Wraps `renameParticipant` so an explicit mid-session rename is always
 * treated as a deliberate customization — persisted to localStorage just
 * like editing the name in the Lobby — so future sessions pre-fill with the
 * name the user chose rather than a fresh random one.
 */
export function useRenameParticipant() {
  const { renameParticipant } = useRoom();

  return useCallback(
    async (displayName: string): Promise<{ ok: boolean; message?: string }> => {
      const ack = await renameParticipant(displayName);
      if (ack.ok) {
        saveDisplayName(ack.displayName);
        return { ok: true };
      }
      return { ok: false, message: ack.message };
    },
    [renameParticipant]
  );
}
