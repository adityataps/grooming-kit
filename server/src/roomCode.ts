import { ROOM_CODE_LENGTH } from '@grooming-kit/shared';

// Excludes visually-ambiguous characters: I, L, O, 0, 1 (see docs/lld.md §6).
const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

export function generateRoomCode(): string {
  let code = '';
  for (let i = 0; i < ROOM_CODE_LENGTH; i += 1) {
    code += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  }
  return code;
}
