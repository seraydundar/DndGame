import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../services/api';

function Register() {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();

  const handleRegister = async (e) => {
    e.preventDefault();
    try {
      // Burada /api/accounts/register/ veya sizin backend'de tanımladığınız endpoint'e istekte bulunacaksınız.
      const response = await api.post('accounts/register/', {
        username,
        email,
        password,
      });
      
      console.log('Kayıt başarılı:', response.data);
      alert('Kayıt başarılı! Şimdi giriş yapabilirsiniz.');
      navigate('/login'); // Kayıt başarılı olunca Login sayfasına yönlendirin
    } catch (error) {
      console.error('Kayıt hatası:', error);
      alert('Kayıt yapılamadı, lütfen bilgilerinizi kontrol edin.');
    }
  };

  return (
    <div style={{ padding: '20px' }}>
      <h2>Register</h2>
      <form onSubmit={handleRegister}>
        <div>
          <label>Kullanıcı Adı:</label>
          <br />
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />
        </div>
        <br />
        <div>
          <label>E-posta:</label>
          <br />
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <br />
        <div>
          <label>Şifre:</label>
          <br />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        <br />
        <button type="submit">Kayıt Ol</button>
      </form>
      <br />
      <p>
        Zaten bir hesabınız var mı? <Link to="/login">Giriş Yap</Link>
      </p>
    </div>
  );
}

export default Register;
