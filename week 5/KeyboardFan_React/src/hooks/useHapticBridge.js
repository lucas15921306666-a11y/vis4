
import { useEffect, useRef, useState } from "react";

const BRIDGE_URL = "ws://127.0.0.1:8765";
const RETRY_MS = 2000;

export function useHapticBridge(speed) {
  const [connected, setConnected] = useState(false);

  const socketRef = useRef(null);
  const latestSpeed = useRef(speed);

  latestSpeed.current = speed;

  useEffect(() => {
    let disposed = false;
    let retryTimer = null;

    function connect() {
      if (disposed) return;

      const socket = new WebSocket(BRIDGE_URL);
      socketRef.current = socket;

      socket.onopen = () => {
        if (disposed || socketRef.current !== socket) return;

        setConnected(true);

        socket.send(
          JSON.stringify({
            type: "fanSpeed",
            value: latestSpeed.current,
          })
        );
      };

      socket.onclose = () => {
        if (disposed || socketRef.current !== socket) return;

        socketRef.current = null;
        setConnected(false);

        retryTimer = window.setTimeout(connect, RETRY_MS);
      };

      socket.onerror = () => {};
    }

    connect();

    return () => {
      disposed = true;
      window.clearTimeout(retryTimer);

      const socket = socketRef.current;
      socketRef.current = null;

      if (socket?.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({ type: "stop" }));
        socket.close();
      } else if (
        socket?.readyState === WebSocket.CONNECTING
      ) {
        // Avoid closing a WebSocket during its handshake.
        socket.addEventListener(
          "open",
          () => socket.close(),
          { once: true }
        );
        socket.addEventListener(
          "error",
          () => socket.close(),
          { once: true }
        );
      } else {
        socket?.close();
      }
    };
  }, []);

  useEffect(() => {
    const socket = socketRef.current;

    if (socket?.readyState === WebSocket.OPEN) {
      socket.send(
        JSON.stringify({
          type: "fanSpeed",
          value: speed,
        })
      );
    }
  }, [speed]);

  return { connected };
}
