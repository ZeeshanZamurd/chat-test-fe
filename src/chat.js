import React, { useState, useEffect } from 'react';
import io from 'socket.io-client';
import './Chat.css';

const socket = io('http://localhost:3000');

const Chat = () => {
  const [chatType, setChatType] = useState(''); // '' for initial, 'room' or 'private'
  const [room, setRoom] = useState('');
  const [user, setUser] = useState('');
  const [usernameEntered, setUsernameEntered] = useState(false);
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([]);
  const [typing, setTyping] = useState('');
  const [availableUsers, setAvailableUsers] = useState([]);
  const [joinedRooms, setJoinedRooms] = useState([]);
  const [privateRecipient, setPrivateRecipient] = useState('');
  const [selectedConversation, setSelectedConversation] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    socket.on('message', (message) => {
      if (chatType === 'room' && message.room === room) {
        setMessages((prevMessages) => [...prevMessages, message]);
      }
    });

    socket.on('privateMessage', (message) => {
      if (chatType === 'private' && (message.from === privateRecipient || message.to === user)) {
        setMessages((prevMessages) => [...prevMessages, message]);
      }
    });

    socket.on('userJoined', (user, room) => {
      if (chatType === 'room' && room === room) {
        setMessages((prevMessages) => [
          ...prevMessages,
          { user: 'System', text: `${user} has joined the room.`, system: true },
        ]);
      }
    });

    socket.on('userLeft', (user, roomleft) => {
      if (chatType === 'room' && roomleft === room) {
        setMessages((prevMessages) => [
          ...prevMessages,
          { user: 'System', text: `${user} has left the room.`, system: true },
        ]);
      }
    });

    socket.on('messageHistory', (history) => {
      if (chatType === 'room') {
        setMessages(history);
      }
    });

    socket.on('privateMessageHistory', (history) => {
      if (chatType === 'private') {
        setMessages(history);
      }
    });

    socket.on('typing', (typingUser) => {
      if (chatType === 'room' && typingUser.room === room) {
        setTyping(`${typingUser.user} is typing...`);
        setTimeout(() => setTyping(''), 3000);
      }
    });

    socket.on('privateTyping', (typingUser) => {
      if (chatType === 'private' && privateRecipient === typingUser) {
        setTyping(`${typingUser} is typing...`);
        setTimeout(() => setTyping(''), 3000);
      }
    });

    socket.on('availableUsers', (users) => {
      if (joinedRooms.length > 0) {
        setAvailableUsers(users.filter((u) => u !== user));
      } else {
        setAvailableUsers([]);
      }
    });

    socket.on('usernameTaken', () => {
      setError('Username is already taken, please choose another one.');
      setUsernameEntered(false);
    });

    socket.on('joinConfirmation', (message) => {

      console.log("mesage ", message)
      // setMessages((prevMessages) => [
      //   ...prevMessages,
      //   { user: 'System', text: message, system: true },
      // ]);
      setJoinedRooms((prevRooms) => [...prevRooms, room]);
    });

    return () => {
      socket.off('message');
      socket.off('privateMessage');
      socket.off('userJoined');
      socket.off('userLeft');
      socket.off('messageHistory');
      socket.off('privateMessageHistory');
      socket.off('typing');
      socket.off('privateTyping');
      socket.off('availableUsers');
      socket.off('usernameTaken');
      socket.off('joinConfirmation');
    };
  }, [user, room, privateRecipient, selectedConversation, chatType, joinedRooms]);

  const handleUsernameSubmit = () => {
    if (user) {
      socket.emit('registerUser', user);
      setUsernameEntered(true);
      setError('');
    }
  };

  const joinRoom = () => {
    if (room && user) {
      socket.emit('joinRoom', { room, user });
      socket.emit('getAvailableUsers');
    }
  };

  const leaveRoom = () => {
    if (room && user) {
      socket.emit('leaveRoom', { room, user });
      setJoinedRooms((prevRooms) => prevRooms.filter((r) => r !== room));
      setMessages([]);
      setAvailableUsers([]);
    }
  };

  const sendMessage = () => {
    if (message) {
      if (chatType === 'room' && room) {
        const newMessage = { room, user, text: message };
        socket.emit('message', newMessage);
        // setMessages((prevMessages) => [...prevMessages, newMessage]);
      } else if (chatType === 'private' && privateRecipient) {
        const newMessage = { to: privateRecipient, from: user, text: message };
        socket.emit('privateMessage', newMessage);
        setMessages((prevMessages) => [...prevMessages, newMessage]);
      }
      setMessage('');
    }
  };

  const handleTyping = () => {
    if (chatType === 'room' && room) {
      socket.emit('typing', { room, user });
    } else if (chatType === 'private' && privateRecipient) {
      socket.emit('privateTyping', { to: privateRecipient, from: user });
    }
  };

  const selectConversation = (type, identifier) => {
    setChatType(type);
    if (type === 'room') {
      setRoom(identifier);
      socket.emit('getRoomMessageHistory', identifier);
    } else if (type === 'private') {
      setPrivateRecipient(identifier);
      socket.emit('getPrivateMessageHistory', { user, to: identifier });
    }
    setSelectedConversation(identifier);
    setMessages([]);
  };

  return (
    <div className="chat-container">
      <div className="chat-sidebar">
        <div className="username-display">{user}</div>
        {!usernameEntered && (
          <>
            <input
              type="text"
              placeholder="Enter your name"
              value={user}
              onChange={(e) => setUser(e.target.value)}
            />
            <button onClick={handleUsernameSubmit}>Submit</button>
            {error && <p className="error">{error}</p>}
          </>
        )}
        {usernameEntered && (
          <>
            <div className="join-room-section">
              <input
                type="text"
                placeholder="Enter room name"
                value={room}
                onChange={(e) => setRoom(e.target.value)}
              />
              <button onClick={joinRoom}>Join Room</button>
              <button onClick={leaveRoom}>Leave Room</button>
            </div>
            <div className="conversations">
              <div className="conversations-header">Rooms</div>
              {joinedRooms.map((r) => (
                <div
                  key={r}
                  className={`conversation ${selectedConversation === r ? 'active' : ''}`}
                  onClick={() => selectConversation('room', r)}
                >
                  {r}
                </div>
              ))}
              {joinedRooms.length > 0 && (
                <>
                  <div className="conversations-header">Private Chat</div>
                  {availableUsers.map((u) => (
                    <div
                      key={u}
                      className={`conversation ${selectedConversation === u ? 'active' : ''}`}
                      onClick={() => selectConversation('private', u)}
                    >
                      {u}
                    </div>
                  ))}
                </>
              )}
            </div>
          </>
        )}
      </div>
      <div className="chat-main">
        <div className="messages">
          {messages.map((msg, index) => (
            <div
              key={index}
              className={`message ${msg.user === user || msg.from === user ? 'self' : msg.system ? 'system' : 'other'}`}
            >
              <div className="message-content">
                {chatType === 'room' && !msg.system && <strong>{msg.user}: </strong>}
                {msg.text}
              </div>
            </div>
          ))}
        </div>
        <div className="typing">{typing}</div>
        {chatType && (
          <div className="message-input">
            <input
              type="text"
              placeholder="Type a message..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyPress={handleTyping}
            />
            <button onClick={sendMessage}>Send</button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Chat;
