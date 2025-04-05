import React, { createContext, useState, useEffect } from "react";

// Başlangıç değerleri:
export const AuthContext = createContext({
  userId: null,
  username: null,
  setUser: () => {},
});

export const AuthProvider = ({ children }) => {
  // user nesnesi: { userId, username }
  const [user, setUser] = useState({ userId: null, username: null });

  // Uygulama ilk açıldığında localStorage'daki değerleri okuyup state'e yaz
  useEffect(() => {
    const storedUserId = localStorage.getItem("user_id");
    const storedUsername = localStorage.getItem("username");

    if (storedUserId) {
      setUser({ userId: storedUserId, username: storedUsername });
    }
  }, []);

  return (
    <AuthContext.Provider value={{ ...user, setUser }}>
      {children}
    </AuthContext.Provider>
  );
};
