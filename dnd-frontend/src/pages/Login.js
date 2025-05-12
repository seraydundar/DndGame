// src/pages/Login.js

import React, { useState, useEffect, useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../services/api';
import { AuthContext } from '../contexts/AuthContext';

const Login = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();
  const { setUser } = useContext(AuthContext);

  const [visible, setVisible] = useState(false);
  const [blurScale, setBlurScale] = useState(1.1);

  useEffect(() => {
    setVisible(true);
    setBlurScale(1);
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const response = await api.post("accounts/login/", { username, password });
      const { user_id, username: uname } = response.data;

      // LocalStorage’a kaydet
      localStorage.setItem("user_id", user_id);
      localStorage.setItem("username", uname);

      // Aynı verileri SessionStorage’a da kaydet
      sessionStorage.setItem("user_id", user_id);
      sessionStorage.setItem("username", uname);

      setUser({ userId: user_id, username: uname });
      navigate("/dashboard");
    } catch (error) {
      console.error("Login hatası:", error);
      alert("Giriş başarısız. Bilgilerinizi kontrol edin.");
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        overflow: 'hidden',
        margin: 0,
        padding: 0,
      }}
    >
      {/* Bulanık arkaplan */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          backgroundImage: 'url("/dndregister.jpg")',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          filter: 'blur(6px)',
          transform: `scale(${blurScale})`,
          transition: 'transform 1s ease-out',
          zIndex: -1,
        }}
      />

      {/* Form kutusu tam ortada */}
      <form
        onSubmit={handleLogin}
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: visible
            ? 'translate(-50%, -50%)'
            : 'translate(-50%, -60%)',
          opacity: visible ? 1 : 0,
          transition: 'transform 0.8s ease-in-out, opacity 0.8s ease-in-out',
          background: 'rgba(0, 0, 0, 0.7)',
          color: '#fff',
          padding: '50px 40px',
          borderRadius: '14px',
          boxShadow: '0 8px 24px rgba(0, 0, 0, 0.7)',
          width: '90%',
          maxWidth: '480px',
          textAlign: 'center',
          zIndex: 1,
        }}
      >
        <h2 style={{ marginBottom: '32px', fontSize: '1.8em' }}>Login</h2>

        <div style={{ marginBottom: '24px', textAlign: 'left' }}>
          <label style={{ display: 'block', marginBottom: '8px' }}>Username</label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            style={{
              width: '100%',
              padding: '14px',
              borderRadius: '8px',
              border: 'none',
              background: 'rgba(255,255,255,0.9)',
              fontSize: '1em',
            }}
          />
        </div>

        <div style={{ marginBottom: '32px', textAlign: 'left' }}>
          <label style={{ display: 'block', marginBottom: '8px' }}>Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            style={{
              width: '100%',
              padding: '14px',
              borderRadius: '8px',
              border: 'none',
              background: 'rgba(255,255,255,0.9)',
              fontSize: '1em',
            }}
          />
        </div>

        <button
          type="submit"
          style={{
            width: '100%',
            padding: '16px',
            border: 'none',
            borderRadius: '10px',
            backgroundColor: '#a57c3c',
            color: '#fff',
            fontSize: '1.1em',
            fontWeight: '700',
            cursor: 'pointer',
            transition: 'background-color 0.3s ease',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#8d662f')}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#a57c3c')}
        >
          Login
        </button>
        {/* added register link */}
       <div style={{ marginTop: 20, textAlign: 'center' }}>
         Don’t have an account?{' '}
         <Link to="/register" style={{ color: '#a57c3c', textDecoration: 'none' }}>
           Register
         </Link>
       </div>
      </form>
    </div>
  );
};

export default Login;