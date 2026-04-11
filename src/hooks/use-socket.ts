/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useRef, useState, useCallback } from "react";
import { io, Socket } from "socket.io-client";

type SocketConnectError = Error & {
  description?: string | Record<string, unknown> | null;
};

export const useSocket = () => {
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const rawSocketUrl = process.env.NEXT_PUBLIC_SOCKET_URL;
    const socketUrl = rawSocketUrl?.replace(/\/+$/, "");

    if (!socketUrl) return;

    const socket = io(socketUrl, {
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      withCredentials: true,
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      setIsConnected(true);
    });

    socket.on("disconnect", () => {
      setIsConnected(false);
    });

    socket.on("connect_error", (err: SocketConnectError) => {
      void err;
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, []);

  const joinSession = useCallback((sessionId: string) => {
    if (!socketRef.current?.connected) {
      return;
    }
    socketRef.current.emit("join_session", sessionId);
  }, []);

  const sendMessage = useCallback((sessionId: string, message: string) => {
    socketRef.current?.emit("send_message", { sessionId, message });
  }, []);

  const onNewMessage = useCallback((callback: (data: any) => void) => {
    const socket = socketRef.current;
    if (!socket) return () => {};

    socket.off("new_message");
    socket.on("new_message", callback);

    return () => {
      socket.off("new_message");
    };
  }, []);

  const onAgentJoined = useCallback((callback: (data: any) => void) => {
    const socket = socketRef.current;
    if (!socket) return () => {};

    socket.off("agent_joined");
    socket.on("agent_joined", callback);

    return () => {
      socket.off("agent_joined");
    };
  }, []);

  const emitEvent = useCallback((event: string, payload?: any) => {
    socketRef.current?.emit(event, payload);
  }, []);

  const onEvent = useCallback((event: string, callback: (data: any) => void) => {
    const socket = socketRef.current;
    if (!socket) return () => {};

    socket.on(event, callback);

    return () => {
      socket.off(event, callback);
    };
  }, []);

  return {
    isConnected,
    joinSession,
    sendMessage,
    onNewMessage,
    onAgentJoined,
    emitEvent,
    onEvent,
  };
};
