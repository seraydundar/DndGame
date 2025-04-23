import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";

// Sayfalar
import Home from "./pages/Home";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import CharacterCreation from "./pages/CharacterCreation";
import Lobby from "./pages/Lobby";
import Battle from "./pages/Battle";
import Trade from "./pages/Trade";
import Chat from "./pages/Chat";
import CreateLobby from "./pages/CreateLobby";
import Lobbies from "./pages/Lobbies";
import GodPanel from "./pages/GodPanel";     // GM paneli
import PlayerPage from "./pages/PlayerPage"; // Oyuncu sayfası
import EndBattle from "./pages/EndBattle";

// Bileşenler / Context
import RequireAuth from "./components/RequireAuth";
import { WebSocketProvider } from "./contexts/WebSocketContext";
import { AuthProvider, AuthContext } from "./contexts/AuthContext";

function App() {
  return (
    <AuthProvider>
      <Router>
        <AuthContext.Consumer>
          {({ userId }) => (
            <WebSocketProvider userId={userId}>
              {userId ? (
                // Kullanıcı giriş yapmışsa:
                <div style={styles.container}>
                  <div style={styles.mainContent}>
                    <Routes>
                      {/* Public sayfalar */}
                      <Route path="/" element={<Home />} />
                      <Route path="/login" element={<Login />} />
                      <Route path="/register" element={<Register />} />

                      {/* Korunan sayfalar */}
                      <Route
                        path="/dashboard"
                        element={
                          <RequireAuth>
                            <Dashboard />
                          </RequireAuth>
                        }
                      />
                      <Route
                        path="/charactercreation"
                        element={
                          <RequireAuth>
                            <CharacterCreation />
                          </RequireAuth>
                        }
                      />
                      <Route
                        path="/lobbies/:lobby_id/character-creation"
                        element={
                          <RequireAuth>
                            <CharacterCreation />
                          </RequireAuth>
                        }
                      />
                      <Route
                        path="/battle"
                        element={
                          <RequireAuth>
                            <Battle />
                          </RequireAuth>
                        }
                      />
                      <Route
                        path="/EndBattle/:lobby_id"
                        element={
                          <RequireAuth>
                            <EndBattle />
                          </RequireAuth>
                        }
                      />
                      <Route
                        path="/trade"
                        element={
                          <RequireAuth>
                            <Trade />
                          </RequireAuth>
                        }
                      />
                      <Route
                        path="/chat"
                        element={
                          <RequireAuth>
                            <Chat />
                          </RequireAuth>
                        }
                      />
                      {/* GM paneli */}
                      <Route
                        path="/godpanel"
                        element={
                          <RequireAuth>
                            <GodPanel />
                          </RequireAuth>
                        }
                      />
                      {/* Oyuncu sayfası */}
                      <Route
                        path="/playerpage"
                        element={
                          <RequireAuth>
                            <PlayerPage />
                          </RequireAuth>
                        }
                      />
                      {/* Lobi listesi */}
                      <Route
                        path="/lobbies"
                        element={
                          <RequireAuth>
                            <Lobbies />
                          </RequireAuth>
                        }
                      />
                      {/* Yeni lobi oluşturma */}
                      <Route
                        path="/lobbies/create"
                        element={
                          <RequireAuth>
                            <CreateLobby />
                          </RequireAuth>
                        }
                      />
                      {/* Tekil Lobi Detayı */}
                      <Route
                        path="/lobbies/:id"
                        element={
                          <RequireAuth>
                            <Lobby />
                          </RequireAuth>
                        }
                      />
                    </Routes>
                  </div>
                  {/* Artık yan paneller burada değil, Dashboard.js içinde tek seferlik render ediliyor */}
                </div>
              ) : (
                // Kullanıcı giriş yapmamışsa:
                <div style={{ padding: 20 }}>
                  <Routes>
                    <Route path="/" element={<Home />} />
                    <Route path="/login" element={<Login />} />
                    <Route path="/register" element={<Register />} />
                    <Route path="/dashboard" element={<Dashboard />} />
                  </Routes>
                  <p>Lütfen giriş yapınız.</p>
                </div>
              )}
            </WebSocketProvider>
          )}
        </AuthContext.Consumer>
      </Router>
    </AuthProvider>
  );
}

const styles = {
  container: { display: "flex" },
  mainContent: { flex: 1, padding: "20px", paddingRight: "270px" },
};

export default App;
