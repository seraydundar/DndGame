import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import api from "../services/api";
import { Trophy, Sword, HeartPulse } from "lucide-react";

/**
 * EndBattle – savaş bittikten sonra istatistik, MVP ve chat özetini gösterir.
 * MVP skoru = verilen hasar + yapılan iyileştirme + alınan hasar.
 * (Loot / banner yok – sade MVP + istatistik + chat.)
 */
export default function EndBattle() {
  const { lobbyId } = useParams();

  // --- STATE ---
  const [stats, setStats] = useState([]);          // [{id,name,damage,healed,damage_taken}]
  const [chat,  setChat]  = useState([]);          // ["...", ...]
  const [winner, setWinner] = useState("");
  const [loading, setLoading] = useState(true);
  const currentUserId = Number(localStorage.getItem("user_id") || 0);
  const [gmId, setGmId] = useState(null);

  // --- FETCH ---
  useEffect(() => {
    (async () => {
      try {
        // 1) Sonuç & istatistik (backend'de /combat/finish/${lobbyId}/ gibi kabul ediyoruz)
        const res = await api.get(`combat/finish/${lobbyId}/`);
        setStats(res.data.stats || []);
        setChat(res.data.chat_log || []);
        setWinner(res.data.winner || "");

        // 2) GM id
        const l = await api.get(`lobbies/${lobbyId}/`);
        setGmId(l.data.gm_player);
      } catch (err) {
        console.error("EndBattle fetch hata:", err);
      } finally {
        setLoading(false);
      }
    })();
  }, [lobbyId]);

  if (loading) return <div className="p-6 text-lg">İstatistikler yükleniyor…</div>;

  /* --- MVP hesapla --- */
  const withScore = stats.map((s) => ({
    ...s,
    score: (s.damage || 0) + (s.healed || 0) + (s.damage_taken || 0),
  }));
  const mvp = withScore.reduce((a, b) => (b.score > a.score ? b : a), withScore[0] || null);

  const handleContinue = () => {
    window.location.href = currentUserId === gmId ? "/godpanel" : "/playerpage";
  };

  return (
    <div className="p-6 font-sans max-w-4xl mx-auto space-y-6">
      {/* Başlık */}
      <h2 className="text-3xl font-bold text-center">
        {winner ? `${winner} kazandı!` : "Savaş Sonuçları"}
      </h2>

      {/* MVP Kartı */}
      {mvp && (
        <div className="flex items-center gap-3 bg-yellow-100 border border-yellow-300 rounded-xl p-4 shadow">
          <Trophy className="w-6 h-6 text-yellow-600" />
          <span className="font-semibold">MVP:</span>
          <span className="text-lg font-bold">{mvp.name}</span>
          <span className="ml-auto text-sm text-gray-600">Skor: {mvp.score}</span>
        </div>
      )}

      {/* İstatistik Tablosu */}
      <div className="overflow-x-auto border rounded-lg">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-100 text-gray-700">
            <tr>
              <th className="px-4 py-2 text-left">Karakter</th>
              <th className="px-4 py-2 text-center"><Sword className="inline w-4 h-4" /> Hasar</th>
              <th className="px-4 py-2 text-center"><HeartPulse className="inline w-4 h-4" /> İyileştirme</th>
              <th className="px-4 py-2 text-center">Alınan Hasar</th>
              <th className="px-4 py-2 text-center">Skor</th>
            </tr>
          </thead>
          <tbody>
            {withScore.map((c) => (
              <tr key={c.id} className={mvp && c.id === mvp.id ? "bg-yellow-50" : ""}>
                <td className="px-4 py-2 font-medium">{c.name}</td>
                <td className="px-4 py-2 text-center">{c.damage || 0}</td>
                <td className="px-4 py-2 text-center">{c.healed || 0}</td>
                <td className="px-4 py-2 text-center">{c.damage_taken || 0}</td>
                <td className="px-4 py-2 text-center font-semibold">{c.score}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Chat Log */}
      <div className="border rounded-lg p-4 max-h-60 overflow-y-auto bg-gray-50">
        <h3 className="font-semibold mb-2">Chat Kaydı</h3>
        {chat.length ? (
          chat.map((line, idx) => (
            <p key={idx} className="text-xs leading-relaxed"><span className="text-gray-500">•</span> {line}</p>
          ))
        ) : (
          <p className="text-xs text-gray-500">Kayıt bulunamadı.</p>
        )}
      </div>

      {/* Devam Butonu */}
      <div className="text-center">
        <button
          onClick={handleContinue}
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg shadow"
        >
          Devam Et
        </button>
      </div>
    </div>
  );
}
