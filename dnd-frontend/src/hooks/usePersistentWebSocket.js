import { useEffect, useRef, useCallback } from 'react';

/**
 * Kalıcı WebSocket kancası.
 * - Otomatik reconnect (exponential back‑off, max 30 s)
 * - 30 sn'de bir ping; 5 sn içinde pong gelmezse bağlantı düştü kabul edilir
 * - Sekme kapanırken clean‑up
 */
export default function usePersistentWebSocket(
  url,
  { onMessage, protocols } = {}
) {
  const wsRef   = useRef(null);
  const pingId  = useRef(null);
  const retries = useRef(0);

  const connect = useCallback(() => {
    wsRef.current = new WebSocket(url, protocols);

    wsRef.current.onopen = () => {
      retries.current = 0;
      // 30 sn’de bir ping
      pingId.current = setInterval(() => {
        if (wsRef.current?.readyState === WebSocket.OPEN) {
          wsRef.current.send(JSON.stringify({ type: 'ping' }));
        }
      }, 30_000);
    };

    wsRef.current.onmessage = (e) => onMessage?.(JSON.parse(e.data));

    wsRef.current.onclose = () => {
      clearInterval(pingId.current);
      // exponential back‑off
      const wait = Math.min(30_000, 1_000 * 2 ** retries.current++);
      setTimeout(connect, wait);
    };
  }, [url, protocols, onMessage]);

  // ilk mount
  useEffect(() => {
    connect();
    const handleUnload = () => wsRef.current?.close(1001, 'tab closed');
    window.addEventListener('beforeunload', handleUnload);

    return () => {
      clearInterval(pingId.current);
      wsRef.current?.close(1000, 'cleanup');
      window.removeEventListener('beforeunload', handleUnload);
    };
  }, [connect]);

  return wsRef;           // göndermek için wsRef.current.send(...)
}
