// src/pages/EndBattle.jsx
import React, {
  useEffect,
  useMemo,
  useState,
  useContext,
} from "react";
import {
  useParams,
  useNavigate,
  useLocation,
} from "react-router-dom";
import { Trophy, MessageSquare } from "lucide-react";
import api                       from "../services/api";
import { WebSocketContext }      from "../contexts/WebSocketContext";
import { AuthContext }           from "../contexts/AuthContext";
import "./EndBattle.css";

export default function EndBattle() {
  const { lobbyId }  = useParams();
  const { state }    = useLocation();      // WS’ten gelen özet olabilir
  const navigate     = useNavigate();

  const wsCtx        = useContext(WebSocketContext);
  const { userId }   = useContext(AuthContext);   // aktif kullanıcı

  /* -------- temel state’ler -------- */
  const [stats,   setStats]   = useState(state?.summary || null);
  const [loading, setLoading] = useState(!state?.summary);
  const [error,   setError]   = useState(null);

  /* -------- GM mi? -------- */
  const [isGM, setIsGM] = useState(false);
  useEffect(() => {
    // lobi ayrıntısını çek → GM ID’si
    (async () => {
      try {
        const res = await api.get(`lobbies/${lobbyId}/`);
        setIsGM(+res.data.gm_player === +userId);
      } catch {/* yoksay */ }
    })();
  }, [lobbyId, userId]);

  /* -------- 1) WS battleEnd -------- */
  useEffect(() => {
    if (!wsCtx?.lastMessage) return;
    try {
      const msg = JSON.parse(wsCtx.lastMessage.data);
      if (msg.event === "battleEnd" && String(msg.lobbyId) === String(lobbyId)) {
        if (msg.summary) setStats(msg.summary);
        setLoading(false);
      }
    } catch {/* ignore */}
  }, [wsCtx?.lastMessage, lobbyId]);

  /* -------- 2) REST fallback -------- */
  useEffect(() => {
    if (!loading) return;
    (async () => {
      try {
        const res = await api.get(`battle-summary/${lobbyId}/`);
        setStats(res.data);
      } catch (err) {
        console.error("EndBattle fetch err:", err);
        setError(err);
      } finally {
        setLoading(false);
      }
    })();
  }, [loading, lobbyId]);

  /* -------- MVP -------- */
  const mvp = useMemo(() => {
    if (!stats?.players?.length) return null;
    return [...stats.players].sort(
      (a, b) =>
        b.damage_dealt + b.healing_done + b.damage_taken -
        (a.damage_dealt + a.healing_done + a.damage_taken)
    )[0];
  }, [stats]);

  /* -------- yardımcılar -------- */
  const API_ROOT = api.defaults.baseURL?.replace(/\/api\/?$/, "") || "";
  const urlSafe  = (p) =>
    !p ? null : p.startsWith("http") ? p : `${API_ROOT}/${p.replace(/^\/+/, "")}`;

  const PlayerCard = (p) => {
    const img = urlSafe(p.icon || p.icon_url);
    const fb  = p.name?.[0]?.toUpperCase() || "?";
    return (
      <div key={p.id} className="player-card">
        {img ? <img src={img} alt={p.name} /> : <div className="avatar-fallback">{fb}</div>}
        <h3>{p.name}</h3>
        <div className="stats-grid">
          <span>🔪 Hasar</span><span>{p.damage_dealt}</span>
          <span>❤️‍🩹 İyileştirme</span><span>{p.healing_done}</span>
          <span>🛡 Tanklanan</span><span>{p.damage_taken}</span>
          {p.kills !== undefined && (
            <>
              <span>☠️ Öldürme</span><span>{p.kills}</span>
            </>
          )}
        </div>
      </div>
    );
  };

  /* -------- render blokları -------- */
  if (loading) return <FlexCenter>Yükleniyor…</FlexCenter>;
  if (error || !stats) return (
    <FlexCenter className="error">
      Savaş verileri alınamadı.
    </FlexCenter>
  );

  return (
    <div className="summary-card">
      {/* ----- HEADER ----- */}
      <header className="summary-header">
        <h1>Battle Summary</h1>
        <button
          className="summary-btn"
          onClick={() =>
            navigate(isGM ? "/godpanel" : "/playerpage")
          }
        >
          {isGM ? "DM Sayfasına Dön" : "Oyuncu Sayfasına Dön"}
        </button>
      </header>

      {/* ----- MVP ----- */}
      {mvp && (
        <div className="mvp-banner">
          <Trophy size={28} /> <span>{mvp.name} — MVP!</span>
        </div>
      )}

      {/* ----- OYUNCU KARTLARI ----- */}
      <section className="player-grid">
        {stats.players.map(PlayerCard)}
      </section>

      {/* ----- CHAT LOG ----- */}
      {stats.chat_log?.length > 0 && (
        <section className="chat-log">
          <div className="chat-header">
            <MessageSquare size={18} style={{ marginRight: 6 }} />
            Chat Log
          </div>
          {stats.chat_log.map((line, i) =>
            typeof line === "string" ? (
              <div key={i} className="chat-line">{line}</div>
            ) : (
              <div key={i} className="chat-line">
                <span className="sender">{line.sender}:</span> {line.text}
              </div>
            )
          )}
        </section>
      )}
    </div>
  );
}

/* ------- Küçük merkezleme helper’ı ------- */
const flex = { display: "flex", height: "100vh", alignItems: "center", justifyContent: "center" };
function FlexCenter({ children, className = "" }) {
  return <div style={flex} className={className}>{children}</div>;
}
