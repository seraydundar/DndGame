import React, { createContext, useState } from 'react';

export const FriendContext = createContext();

export const FriendProvider = ({ children }) => {
  const [friends, setFriends] = useState([]);

  const addFriend = (friend) => {
    setFriends((prev) => [...prev, friend]);
  };

  const updateFriendStatus = (friendId, status) => {
    setFriends((prev) =>
      prev.map((friend) =>
        friend.id === friendId ? { ...friend, status } : friend
      )
    );
  };

  return (
    <FriendContext.Provider value={{ friends, addFriend, updateFriendStatus }}>
      {children}
    </FriendContext.Provider>
  );
};
