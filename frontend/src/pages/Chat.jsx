import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Send, Paperclip } from 'lucide-react';

const Chat = () => {
  const navigate = useNavigate();
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([
    { id: 1, from: 'technician', text: 'I am on my way, will reach in 10 mins.', time: '10:45 AM' },
    { id: 2, from: 'user', text: 'Great, I am at home.', time: '10:46 AM' },
  ]);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = (e) => {
    e.preventDefault();
    if (!message.trim()) return;
    const now = new Date();
    const time = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setMessages([...messages, { id: Date.now(), from: 'user', text: message.trim(), time }]);
    setMessage('');
  };

  return (
    <div className="min-h-screen bg-white flex flex-col">
        
        {/* Header */}
        <div className="p-6 flex items-center border-b border-border-color">
          <button 
            onClick={() => navigate(-1)}
            className="p-2 hover:bg-slate-100 rounded-full transition-colors"
          >
            <ArrowLeft className="h-6 w-6 text-[#0D47A1]" />
          </button>
          <div className="flex items-center gap-3 ml-4">
            <div className="w-10 h-10 bg-[#0D47A1] rounded-full flex items-center justify-center text-white font-bold">
              R
            </div>
            <div>
              <h1 className="text-sm font-bold text-text-primary">Rahul Sharma</h1>
              <span className="text-xs text-green-500 font-semibold">Online</span>
            </div>
          </div>
        </div>

        {/* Chat Messages */}
        <div className="flex-1 p-6 flex flex-col gap-4 overflow-y-auto bg-slate-50">
          
          {/* Security Banner */}
          <div className="bg-white p-3 rounded-xl text-center text-xs text-text-secondary shadow-sm">
            🔒 Your phone number is masked for security.
          </div>

          {messages.map((msg) => (
            msg.from === 'technician' ? (
              <div key={msg.id} className="flex flex-col items-start gap-1">
                <div className="bg-white p-4 rounded-t-2xl rounded-r-2xl max-w-[80%] shadow-sm text-sm text-text-primary">
                  {msg.text}
                </div>
                <span className="text-xs text-text-secondary ml-1">{msg.time}</span>
              </div>
            ) : (
              <div key={msg.id} className="flex flex-col items-end gap-1">
                <div className="bg-[#0D47A1] text-white p-4 rounded-t-2xl rounded-l-2xl max-w-[80%] shadow-sm text-sm">
                  {msg.text}
                </div>
                <span className="text-xs text-text-secondary mr-1">{msg.time}</span>
              </div>
            )
          ))}

          <div ref={bottomRef} />
        </div>

        {/* Message Input */}
        <form onSubmit={handleSend} className="p-4 border-t border-border-color bg-white flex items-center gap-3">
          <button type="button" className="p-3 text-text-secondary hover:text-[#0D47A1] transition-colors">
            <Paperclip className="h-5 w-5" />
          </button>
          <input
            type="text"
            placeholder="Type a message..."
            className="flex-1 py-3 px-4 bg-slate-50 border border-border-color rounded-2xl focus:border-[#0D47A1] focus:ring-1 focus:ring-[#0D47A1] outline-none transition-all text-sm"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
          />
          <button 
            type="submit"
            className="p-3 bg-[#FFD600] rounded-full hover:bg-yellow-400 transition-colors shadow-sm"
          >
            <Send className="h-5 w-5 text-[#0D47A1]" />
          </button>
        </form>

    </div>
  );
};

export default Chat;


