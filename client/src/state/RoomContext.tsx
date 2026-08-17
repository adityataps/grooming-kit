import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import type {
  CreateRoomAck,
  ErrorAck,
  ErrorPayload,
  JoinRoomAck,
  PokerCard,
  RetroColumnId,
  RoomState,
  RoomType,
} from '@grooming-kit/shared';
import { getSocket } from '../socket/socketClient';
import { SESSION_STORAGE_KEYS } from '../config';

export interface RoomContextValue {
  connected: boolean;
  roomState: RoomState | null;
  participantId: string | null;
  lastError: ErrorPayload | null;
  closedReason: string | null;
  createRoom: (type: RoomType, displayName: string) => Promise<CreateRoomAck | ErrorAck>;
  joinRoom: (roomCode: string, displayName: string) => Promise<JoinRoomAck | ErrorAck>;
  leaveRoom: () => void;
  pokerVote: (card: PokerCard) => void;
  pokerReveal: () => void;
  pokerReset: () => void;
  retroAddCard: (columnId: RetroColumnId, text: string) => void;
  retroVote: (cardId: string) => void;
  retroClose: (actionItems: string[]) => void;
  dismissError: () => void;
  dismissClosed: () => void;
}

export const RoomContext = createContext<RoomContextValue | null>(null);

function clearSession(): void {
  sessionStorage.removeItem(SESSION_STORAGE_KEYS.roomCode);
  sessionStorage.removeItem(SESSION_STORAGE_KEYS.participantId);
  sessionStorage.removeItem(SESSION_STORAGE_KEYS.displayName);
}

function persistSession(roomCode: string, participantId: string, displayName: string): void {
  sessionStorage.setItem(SESSION_STORAGE_KEYS.roomCode, roomCode);
  sessionStorage.setItem(SESSION_STORAGE_KEYS.participantId, participantId);
  sessionStorage.setItem(SESSION_STORAGE_KEYS.displayName, displayName);
}

export function RoomProvider({ children }: { children: ReactNode }) {
  const socketRef = useRef(getSocket());
  const [connected, setConnected] = useState(false);
  const [roomState, setRoomState] = useState<RoomState | null>(null);
  const [participantId, setParticipantId] = useState<string | null>(() =>
    sessionStorage.getItem(SESSION_STORAGE_KEYS.participantId)
  );
  const [lastError, setLastError] = useState<ErrorPayload | null>(null);
  const [closedReason, setClosedReason] = useState<string | null>(null);

  useEffect(() => {
    const socket = socketRef.current;

    function attemptReconnect(): void {
      const roomCode = sessionStorage.getItem(SESSION_STORAGE_KEYS.roomCode);
      const storedParticipantId = sessionStorage.getItem(SESSION_STORAGE_KEYS.participantId);
      const displayName = sessionStorage.getItem(SESSION_STORAGE_KEYS.displayName);
      if (!roomCode || !storedParticipantId || !displayName) return;

      socket.emit(
        'room:join',
        { roomCode, displayName, participantId: storedParticipantId },
        (ack) => {
          if (!ack.ok) {
            clearSession();
            setParticipantId(null);
          }
        }
      );
    }

    function handleConnect(): void {
      setConnected(true);
      attemptReconnect();
    }

    function handleDisconnect(): void {
      setConnected(false);
    }

    function handleRoomState(state: RoomState): void {
      setRoomState(state);
      setClosedReason(null);
    }

    function handleRoomClosed(payload: { reason: string }): void {
      setClosedReason(payload.reason);
      setRoomState(null);
      clearSession();
      setParticipantId(null);
    }

    function handleError(payload: ErrorPayload): void {
      setLastError(payload);
    }

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    socket.on('room:state', handleRoomState);
    socket.on('room:closed', handleRoomClosed);
    socket.on('error', handleError);

    if (socket.connected) handleConnect();

    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.off('room:state', handleRoomState);
      socket.off('room:closed', handleRoomClosed);
      socket.off('error', handleError);
    };
  }, []);

  const createRoom = useCallback<RoomContextValue['createRoom']>(
    (type, displayName) =>
      new Promise((resolve) => {
        socketRef.current.emit('room:create', { type, displayName }, (ack) => {
          if (ack.ok) {
            persistSession(ack.roomCode, ack.participantId, displayName);
            setParticipantId(ack.participantId);
          }
          resolve(ack);
        });
      }),
    []
  );

  const joinRoom = useCallback<RoomContextValue['joinRoom']>(
    (roomCode, displayName) =>
      new Promise((resolve) => {
        socketRef.current.emit('room:join', { roomCode, displayName }, (ack) => {
          if (ack.ok) {
            persistSession(ack.roomCode, ack.participantId, displayName);
            setParticipantId(ack.participantId);
          }
          resolve(ack);
        });
      }),
    []
  );

  const leaveRoom = useCallback(() => {
    socketRef.current.emit('room:leave');
    clearSession();
    setRoomState(null);
    setParticipantId(null);
    setClosedReason(null);
  }, []);

  const pokerVote = useCallback((card: PokerCard) => {
    socketRef.current.emit('poker:vote', { card });
  }, []);
  const pokerReveal = useCallback(() => socketRef.current.emit('poker:reveal'), []);
  const pokerReset = useCallback(() => socketRef.current.emit('poker:reset'), []);
  const retroAddCard = useCallback((columnId: RetroColumnId, text: string) => {
    socketRef.current.emit('retro:addCard', { columnId, text });
  }, []);
  const retroVote = useCallback((cardId: string) => {
    socketRef.current.emit('retro:vote', { cardId });
  }, []);
  const retroClose = useCallback((actionItems: string[]) => {
    socketRef.current.emit('retro:close', { actionItems });
  }, []);
  const dismissError = useCallback(() => setLastError(null), []);
  const dismissClosed = useCallback(() => setClosedReason(null), []);

  const value: RoomContextValue = {
    connected,
    roomState,
    participantId,
    lastError,
    closedReason,
    createRoom,
    joinRoom,
    leaveRoom,
    pokerVote,
    pokerReveal,
    pokerReset,
    retroAddCard,
    retroVote,
    retroClose,
    dismissError,
    dismissClosed,
  };

  return <RoomContext.Provider value={value}>{children}</RoomContext.Provider>;
}

export function useRoom(): RoomContextValue {
  const ctx = useContext(RoomContext);
  if (!ctx) throw new Error('useRoom must be used within a RoomProvider');
  return ctx;
}
