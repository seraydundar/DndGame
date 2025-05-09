// src/App.js
import React, { useEffect } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";

// Pages
import Home               from "./pages/Home";
import Login              from "./pages/Login";
import Register           from "./pages/Register";
import Dashboard          from "./pages/Dashboard";
import CharacterCreation  from "./pages/CharacterCreation";
import Lobbies            from "./pages/Lobbies";
import CreateLobby        from "./pages/CreateLobby";
import Lobby              from "./pages/Lobby";
import BattlePage         from "./pages/BattlePage";
import EndBattle          from "./pages/EndBattle";
import Trade              from "./pages/Trade";
import Chat               from "./pages/Chat";
import GodPanel           from "./pages/GodPanel";
import PlayerPage         from "./pages/PlayerPage";

// Spells & Items & Creatures
import SpellCreate    from "./components/SpellCreate";
import SpellList      from "./components/SpellList";
import ItemCreate     from "./components/ItemCreate";
import ItemList       from "./components/ItemList";
import CreatureCreate from "./components/CreatureCreate";
import CreatureList   from "./components/CreatureList";

// Auth & Context
import RequireAuth       from "./components/RequireAuth";
import { WebSocketProvider } from "./contexts/WebSocketContext";
import { AuthProvider, AuthContext } from "./contexts/AuthContext";

// CSRF endpoint çağrısı için
import api from "./services/api";

function App() {
  // Uygulama ayağa kalkınca CSRF çerezini alıp set et
  useEffect(() => {
    api.get("/csrf/")
      .then(() => console.log("CSRFTOKEN çerezi set edildi"))
      .catch(err => console.error("CSRF alınamadı:", err));
  }, []);

  return (
    <AuthProvider>
      <Router>
        <AuthContext.Consumer>
          {({ userId }) => (
            <WebSocketProvider userId={userId}>
              {userId ? (
                <div style={styles.container}>
                  <div style={styles.mainContent}>
                    <Routes>
                      {/* Public */}
                      <Route path="/"                element={<Home />} />
                      <Route path="/login"           element={<Login />} />
                      <Route path="/register"        element={<Register />} />

                      {/* Protected */}
                      <Route path="/dashboard"       element={<RequireAuth><Dashboard /></RequireAuth>} />

                      {/* Character creation */}
                      <Route path="/lobbies/:id/character-creation"
                              element={<RequireAuth><CharacterCreation /></RequireAuth>} />

                      {/* Lobbies */}
                      <Route path="/lobbies"          element={<RequireAuth><Lobbies /></RequireAuth>} />
                      <Route path="/lobbies/create"   element={<RequireAuth><CreateLobby /></RequireAuth>} />
                      <Route path="/lobbies/:id"      element={<RequireAuth><Lobby /></RequireAuth>} />

                      {/* Battle */}
                      <Route path="/battle/:id"       element={<RequireAuth><BattlePage /></RequireAuth>} />
                      <Route path="/endbattle/:lobby_id"
                                                      element={<RequireAuth><EndBattle /></RequireAuth>} />

                      {/* Trade & Chat */}
                      <Route path="/trade"            element={<RequireAuth><Trade /></RequireAuth>} />
                      <Route path="/chat"             element={<RequireAuth><Chat /></RequireAuth>} />

                      {/* GM & Player */}
                      <Route path="/godpanel"         element={<RequireAuth><GodPanel /></RequireAuth>} />
                      <Route path="/playerpage"       element={<RequireAuth><PlayerPage /></RequireAuth>} />

                      {/* Spells */}
                      <Route path="/spells"           element={<RequireAuth><SpellList /></RequireAuth>} />
                      <Route path="/spells/create"    element={<RequireAuth><SpellCreate /></RequireAuth>} />

                      {/* Items */}
                      <Route path="/items"            element={<RequireAuth><ItemList /></RequireAuth>} />
                      <Route path="/items/create"     element={<RequireAuth><ItemCreate /></RequireAuth>} />

                      {/* Creatures */}
                      <Route path="/creatures"        element={<RequireAuth><CreatureList /></RequireAuth>} />
                      <Route path="/creatures/create" element={<RequireAuth><CreatureCreate /></RequireAuth>} />
                    </Routes>
                  </div>
                </div>
              ) : (
                <div style={{ padding: 20 }}>
                  <Routes>
                    <Route path="/"         element={<Home />} />
                    <Route path="/login"    element={<Login />} />
                    <Route path="/register" element={<Register />} />
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
  container:   { display: "flex" },
  mainContent: { flex: 1, padding: "20px", paddingRight: "270px" },
};

export default App;
