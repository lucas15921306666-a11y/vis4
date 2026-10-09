import { useEffect, useRef, useState } from "react";

const BRIDGE_URL = "ws://127.0.0.1:8765";

export function useHapticBridge(speed) {
  const [connected, setConnected] = useState(false);
  const socketRef = useRef(null);
  const speedRef = useRef(speed);
  speedRef.current = speed;

  useEffect(() => {
    let disposed = false;
    let retry;
    function connect() {
      if (disposed) return;
      let socket;
      try { socket = new WebSocket(BRIDGE_URL); }
      catch { retry = setTimeout(connect, 2000); return; }
      socketRef.current = socket;
      socket.onopen = () => {
        if (disposed) return;
        setConnected(true);
        socket.send(JSON.stringify({ type: "fanSpeed", value: speedRef.current }));
      };
      socket.onclose = () => {
        if (disposed) return;
        setConnected(false);
        retry = setTimeout(connect, 2000);
      };
      socket.onerror = () => {}; // onclose handles reconnect
    }
    connect();
    return () => {
      disposed = true;
      clearTimeout(retry);
      const socket = socketRef.current;
      if (socket?.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({ type: "stop" }));
      }
      socket?.close();
      socketRef.current = null;
    };
  }, []);

  useEffect(() => {
    const socket = socketRef.current;
    if (socket?.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({ type: "fanSpeed", value: speed }));
    }
  }, [speed]);

  return { connected };
}
