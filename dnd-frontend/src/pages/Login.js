import React, { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { AuthContext } from '../contexts/AuthContext';

const Login = () => {
  // Local state
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();

  // AuthContext'ten setUser fonksiyonunu al
  const { setUser } = useContext(AuthContext);

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      // Sunucuda custom_login_view'e istek atıyoruz
      // Örnek: POST /api/accounts/login/ 
      const response = await api.post("accounts/login/", {
        username,
        password,
      });
      console.log("Login response:", response.data);
      /*
        response.data:
        {
          "message": "Giriş başarılı.",
          "user_id": 5,
          "username": "ali"
        }
      */

      // LocalStorage'a kaydet
      localStorage.setItem("user_id", response.data.user_id);
      localStorage.setItem("username", response.data.username);

      // AuthContext içindeki user state güncelle
      setUser({
        userId: response.data.user_id,
        username: response.data.username,
      });

      alert("Giriş başarılı!");
      // Dashboard'a yönlendir
      navigate("/dashboard");
    } catch (error) {
      console.error("Login hatası:", error);
      alert("Giriş başarısız. Bilgilerinizi kontrol edin.");
    }
  };

  return (
    <div style={{ padding: "20px" }}>
      <h2>Giriş Yap</h2>
      <form onSubmit={handleLogin}>
        <div>
          <label>Kullanıcı Adı</label><br />
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />
        </div>
        <br />
        <div>
          <label>Şifre</label><br />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        <br />
        <button type="submit">Giriş Yap</button>
      </form>
    </div>
  );
};

export default Login;
