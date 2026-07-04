import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Send, Paperclip, Check, CheckCheck, X, ShieldOff, Image as ImageIcon } from 'lucide-react';

const CANNED_REPLIES = [
  'Sure, I will take care of that.',
  'Okay, noted. See you soon!',
  'I am carrying the required spare parts.',
  'Please keep the appliance accessible, thanks.',
];

const Chat = () => {
  const navigate = useNavigate();
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([
    { id: 1, from: 'technician', text: 'I am on my way, will reach in 10 mins.', time: '10:45 AM' },
    { id: 2, from: 'user', text: 'Great, I am at home.', time: '10:46 AM', status: 'read' },
  ]);
  const [techTyping, setTechTyping] = useState(false);
  const [attachment, setAttachment] = useState(null);
  const [sessionEnded, setSessionEnded] = useState(false);
  const bottomRef = useRef(null);
  const replyIdx = useRef(0);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, techTyping]);

  const nowTime = () =>
    new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const handleSend = (e) => {
    e.preventDefault();
    if (sessionEnded) return;
    if (!message.trim() && !attachment) return;

    const newMsg = {
      id: Date.now(),
      from: 'user',
      text: message.trim(),
      attachment,
      time: nowTime(),
      status: 'sent',
    };
    setMessages((prev) => [...prev, newMsg]);
    setMessage('');
    setAttachment(null);

    // simulate delivery -> read, then a typing reply
    setTimeout(() => {
      setMessages((prev) => prev.map((m) => (m.id === newMsg.id ? { ...m, status: 'read' } : m)));
      setTechTyping(true);
    }, 900);

    setTimeout(() => {
      setTechTyping(false);
      const reply = CANNED_REPLIES[replyIdx.current % CANNED_REPLIES.length];
      replyIdx.current += 1;
      setMessages((prev) => [...prev, { id: Date.now() + 1, from: 'technician', text: reply, time: nowTime() }]);
    }, 2600);
  };

  const handleAttach = () => {
    // simulated file pick
    setAttachment({ name: `work_photo_${Math.floor(Math.random() * 90 + 10)}.jpg` });
  };

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header */}
      <div className="p-4 flex items-center border-b border-border-color">
        <button onClick={() => navigate(-1)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
          <ArrowLeft className="h-6 w-6 text-[#0D47A1]" />
        </button>
        <div className="flex items-center gap-3 ml-2 flex-1">
          <div className="w-10 h-10 bg-[#0D47A1] rounded-full flex items-center justify-center text-white font-bold">R</div>
          <div>
            <h1 className="text-sm font-bold text-text-primary">Rahul Sharma</h1>
            <span className="text-xs font-semibold text-green-500">
              {techTyping ? 'typing…' : sessionEnded ? 'session closed' : 'Online'}
            </span>
          </div>
        </div>
        {!sessionEnded && (
          <button
            onClick={() => setSessionEnded(true)}
            title="Simulate job completion"
            className="ml-2 p-2.5 rounded-full hover:bg-slate-100 transition-colors text-text-secondary"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 p-4 flex flex-col gap-3 overflow-y-auto bg-slate-50">
        <div className="bg-white p-3 rounded-xl text-center text-xs text-text-secondary shadow-sm">
          🔒 Your phone number is masked for security.
        </div>

        {messages.map((msg) =>
          msg.from === 'technician' ? (
            <div key={msg.id} className="flex flex-col items-start gap-1">
              <div className="bg-white p-3.5 rounded-t-2xl rounded-r-2xl max-w-[80%] shadow-sm text-sm text-text-primary">
                {msg.text}
              </div>
              <span className="text-xs text-text-secondary ml-1">{msg.time}</span>
            </div>
          ) : (
            <div key={msg.id} className="flex flex-col items-end gap-1">
              <div className="bg-[#0D47A1] text-white p-3.5 rounded-t-2xl rounded-l-2xl max-w-[80%] shadow-sm text-sm">
                {msg.attachment && (
                  <div className="flex items-center gap-2 mb-1.5 bg-white/15 rounded-lg px-2 py-1.5">
                    <ImageIcon className="h-4 w-4 shrink-0" />
                    <span className="text-xs truncate">{msg.attachment.name}</span>
                  </div>
                )}
                {msg.text}
              </div>
              <span className="flex items-center gap-1 text-xs text-text-secondary mr-1">
                {msg.time}
                {msg.status === 'read' ? (
                  <CheckCheck className="h-3.5 w-3.5 text-[#0D47A1]" />
                ) : (
                  <Check className="h-3.5 w-3.5 text-text-secondary" />
                )}
              </span>
            </div>
          )
        )}

        {techTyping && (
          <div className="flex items-start">
            <div className="bg-white px-4 py-3 rounded-t-2xl rounded-r-2xl shadow-sm flex items-center gap-1">
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce"
                  style={{ animationDelay: `${i * 0.15}s` }}
                />
              ))}
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Attachment preview */}
      {attachment && !sessionEnded && (
        <div className="px-4 pt-2 bg-white">
          <div className="inline-flex items-center gap-2 bg-slate-100 rounded-xl px-3 py-2">
            <ImageIcon className="h-4 w-4 text-[#0D47A1]" />
            <span className="text-xs text-text-primary">{attachment.name}</span>
            <button onClick={() => setAttachment(null)} className="text-text-secondary hover:text-red-500">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Input / expired banner */}
      {sessionEnded ? (
        <div className="p-4 border-t border-border-color bg-white">
          <div className="flex items-center justify-center gap-2 bg-slate-50 border border-border-color rounded-2xl py-3 text-xs text-text-secondary">
            <ShieldOff className="h-4 w-4" />
            This masked chat has ended after job completion.
          </div>
        </div>
      ) : (
        <form onSubmit={handleSend} className="p-4 border-t border-border-color bg-white flex items-center gap-3">
          <button type="button" onClick={handleAttach} className="p-3 text-text-secondary hover:text-[#0D47A1] transition-colors">
            <Paperclip className="h-5 w-5" />
          </button>
          <input
            type="text"
            placeholder="Type a message..."
            className="flex-1 py-3 px-4 bg-slate-50 border border-border-color rounded-2xl focus:border-[#0D47A1] focus:ring-1 focus:ring-[#0D47A1] outline-none transition-all text-sm"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
          />
          <button type="submit" className="p-3 bg-[#FFD600] rounded-full hover:bg-yellow-400 transition-colors shadow-sm">
            <Send className="h-5 w-5 text-[#0D47A1]" />
          </button>
        </form>
      )}
    </div>
  );
};

export default Chat;
