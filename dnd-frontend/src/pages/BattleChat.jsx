// src/pages/BattleChat.jsx
import React, { useState } from "react";

export default function BattleChat({
  chatLog,
  onSendMessage,
}) {
  const [msg, setMsg] = useState("");

  const submit = (e) => {
    e.preventDefault();
    if (!msg.trim()) return;
    onSendMessage(msg.trim());
    setMsg("");
  };

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
      {/* ------- Sadece Chat Log ------- */}
      <div
        style={{
          flex: 1,
          padding: 10,
          border: "1px solid #aaa",
          borderRadius: 4,
          overflowY: "auto",
          background: "#f0f0f0",
        }}
      >
        {chatLog.map((m, i) => (
          <p key={i} style={{ margin: "4px 0" }}>
            {m}
          </p>
        ))}
      </div>

      {/* ------- Mesaj Girişi ------- */}
      <form
        onSubmit={submit}
        style={{ display: "flex", gap: 4, marginTop: 8, padding: 10 }}
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
