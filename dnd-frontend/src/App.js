// src/App.js

import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";

// Pages
import Home from "./pages/Home";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import CharacterCreation from "./pages/CharacterCreation";
import Lobbies from "./pages/Lobbies";
import Lobby from "./pages/Lobby";
import Battle from "./pages/Battle";
import EndBattle from "./pages/EndBattle";
import Trade from "./pages/Trade";
import Chat from "./pages/Chat";
import CreateLobby from "./pages/CreateLobby";
import GodPanel from "./pages/GodPanel";
import PlayerPage from "./pages/PlayerPage";

// Spells
import SpellCreate from "./components/SpellCreate";
import SpellList   from "./components/SpellList";

// Items
import ItemCreate  from "./components/ItemCreate";
import ItemList    from "./components/ItemList";

// Auth & Context
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
                <div style={styles.container}>
                  <div style={styles.mainContent}>
                    <Routes>
                      {/* Public pages */}
                      <Route path="/" element={<Home />} />
                      <Route path="/login" element={<Login />} />
                      <Route path="/register" element={<Register />} />

                      {/* Protected pages */}
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
                        path="/lobbies"
                        element={
                          <RequireAuth>
                            <Lobbies />
                          </RequireAuth>
                        }
                      />
                      <Route
                        path="/lobbies/:id"
                        element={
                          <RequireAuth>
                            <Lobby />
                          </RequireAuth>
                        }
                      />
                      <Route
                        path="/battle/:lobby_id"
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
                      <Route
                        path="/create-lobby"
                        element={
                          <RequireAuth>
                            <CreateLobby />
                          </RequireAuth>
                        }
                      />

                      {/* GM Panel */}
                      <Route
                        path="/godpanel"
                        element={
                          <RequireAuth>
                            <GodPanel />
                          </RequireAuth>
                        }
                      />

                      {/* Player Page */}
                      <Route
                        path="/playerpage"
                        element={
                          <RequireAuth>
                            <PlayerPage />
                          </RequireAuth>
                        }
                      />

                      {/* Spells Pages */}
                      <Route
                        path="/spells"
                        element={
                          <RequireAuth>
                            <SpellList />
                          </RequireAuth>
                        }
                      />
                      <Route
                        path="/spells/create"
                        element={
                          <RequireAuth>
                            <SpellCreate />
                          </RequireAuth>
                        }
                      />

                      {/* Items Pages */}
                      <Route
                        path="/items"
                        element={
                          <RequireAuth>
                            <ItemList />
                          </RequireAuth>
                        }
                      />
                      <Route
                        path="/items/create"
                        element={
                          <RequireAuth>
                            <ItemCreate />
                          </RequireAuth>
                        }
                      />
                    </Routes>
                  </div>
                </div>
              ) : (
                <div style={{ padding: 20 }}>
                  <Routes>
                    <Route path="/" element={<Home />} />
                    <Route path="/login" element={<Login />} />
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
  container: { display: "flex" },
  mainContent: { flex: 1, padding: "20px", paddingRight: "270px" },
};

export default App;
