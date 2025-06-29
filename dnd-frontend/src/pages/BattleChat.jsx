// src/pages/BattleChat.jsx
import React, { useState } from "react";

export default function BattleChat({
  initiativeOrder,
  currentTurnIndex,
  chatLog,
  onSendMessage,
  /* yeni ↓ */
  isGM = false,
  onEndBattle
}) {
  const [msg, setMsg] = useState("");

  const submit = (e) => {
    e.preventDefault();
    if (!msg.trim()) return;
    onSendMessage(msg.trim());
    setMsg("");
  };

  return (
    <div style={{ marginTop: 20 }}>
      {/* ------- ÜST BAR (inisiyatif + GM butonu) ------- */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: 10,
          background: "#ddd",
          borderRadius: 4,
          marginBottom: 10,
          gap: 8
        }}
      >
        <div>
          <strong>İnisiyatif:</strong>{" "}
          {initiativeOrder.map((p, idx) => (
            <span
              key={p.character_id}
              style={{
                fontWeight: idx === currentTurnIndex ? "bold" : "normal",
                marginRight: 8
              }}
            >
              {p.name} ({p.initiative})
            </span>
          ))}
        </div>

        {/* --------- Savaşı Bitir (sadece GM) --------- */}
        {isGM && (
          <button
            onClick={onEndBattle}
            style={{
              padding: "6px 14px",
              background: "#c62828",
              color: "#fff",
              border: "none",
              borderRadius: 4,
              cursor: "pointer"
            }}
          >
            Savaşı Bitir
          </button>
        )}
      </div>

      {/* ------- Chat Log ------- */}
      <div
        style={{
          padding: 10,
          border: "1px solid #aaa",
          borderRadius: 4,
          maxHeight: 150,
          overflowY: "auto",
          background: "#f0f0f0"
        }}
      >
        {chatLog.map((m, i) => (
          <p key={i} style={{ margin: "4px 0" }}>
            {m}
          </p>
        ))}
      </div>

      {/* ------- Mesaj girişi ------- */}
      <form
        onSubmit={submit}
        style={{ display: "flex", gap: 4, marginTop: 8 }}
      >
        <input
          value={msg}
          onChange={(e) => setMsg(e.target.value)}
          placeholder="Mesaj yaz…"
          style={{ flex: 1, padding: 8 }}
        />
        <button type="submit" style={{ padding: "8px 12px" }}>
          Gönder
        </button>
      </form>
    </div>
  );
}
