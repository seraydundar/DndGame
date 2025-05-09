// src/pages/BattleChat.jsx
import React, { useState } from 'react';

export default function BattleChat({
  initiativeOrder,
  currentTurnIndex,
  chatLog,
  onSendMessage
}) {
  const [msg, setMsg] = useState('');

  const submit = e => {
    e.preventDefault();
    if (!msg.trim()) return;
    onSendMessage(msg.trim());
    setMsg('');
  };

  return (
    <div style={{ marginTop:20 }}>
      <div style={{
        padding:10,
        backgroundColor:'#ddd',
        borderRadius:4,
        marginBottom:10
      }}>
        <strong>İnisiyatif:</strong>{' '}
        {initiativeOrder.map((p, idx) => (
          <span key={p.character_id}
                style={{
                  fontWeight: idx===currentTurnIndex?'bold':'normal',
                  marginRight:8
                }}>
            {p.name} ({p.initiative})
          </span>
        ))}
      </div>
      <div style={{
        padding:10,
        border:'1px solid #aaa',
        borderRadius:4,
        maxHeight:150,
        overflowY:'auto',
        backgroundColor:'#f0f0f0'
      }}>
        {chatLog.map((m,i)=><p key={i} style={{ margin:'4px 0' }}>{m}</p>)}
      </div>
      <form onSubmit={submit} style={{ display:'flex', gap:4, marginTop:8 }}>
        <input
          value={msg}
          onChange={e=>setMsg(e.target.value)}
          placeholder="Mesaj yaz…"
          style={{ flex:1, padding:8 }}
        />
        <button type="submit" style={{ padding:'8px 12px' }}>Gönder</button>
      </form>
    </div>
  );
}
