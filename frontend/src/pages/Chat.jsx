import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Send, Paperclip, Check, CheckCheck, X, ShieldOff, Image as ImageIcon } from 'lucide-react';
import { io } from 'socket.io-client';
import { apiRequest, getStoredTokens } from '../lib/apiClient';

const SOCKET_URL = import.meta.env.VITE_API_BASE_URL
  ? import.meta.env.VITE_API_BASE_URL.replace('/api/v1', '')
  : 'http://localhost:4000';

const Chat = () => {
  const navigate = useNavigate();
  const [message, setMessage] = useState('');
  // A real conversation over the same chat gateway the technician app uses.
  // This screen used to seed two invented messages and answer with a rotating
  // list of canned technician replies, so a customer believed they were talking
  // to their engineer when nothing was sent anywhere.
  const [messages, setMessages] = useState([]);
  const [conversationId, setConversationId] = useState(null);
  const [chatError, setChatError] = useState('');
  const [techTyping] = useState(false);
  const [attachment, setAttachment] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [sessionEnded, setSessionEnded] = useState(false);
  const bottomRef = useRef(null);
  const socketRef = useRef(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const res = await apiRequest('/chat/conversations/support', { method: 'POST', auth: true });
        const convo = res.data;
        if (cancelled || !convo) return;
        setConversationId(convo.id);
        setSessionEnded(convo.status === 'Closed');

        const history = await apiRequest(`/chat/conversations/${convo.id}/messages`, { auth: true });
        if (cancelled) return;
        setMessages((history.data || []).map((m) => ({
          id: m.id,
          from: m.sender === 'customer' ? 'user' : 'technician',
          text: m.text,
          attachment: m.attachmentUrl ? { name: m.attachmentName || 'Attachment', url: m.attachmentUrl } : null,
          time: new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          status: 'read',
        })));

        const { accessToken } = getStoredTokens();
        const socket = io(SOCKET_URL, { auth: { token: accessToken }, transports: ['websocket'] });
        socketRef.current = socket;
        socket.on('connect', () => socket.emit('join-conversation', { conversationId: convo.id }));
        socket.on('message:new', (m) => {
          setMessages((prev) => (prev.some((x) => x.id === m.id) ? prev : [...prev, {
            id: m.id,
            from: m.sender === 'customer' ? 'user' : 'technician',
            text: m.text,
            time: new Date(m.createdAt || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            status: 'read',
          }]));
        });
        socket.on('connect_error', () => setChatError('Lost connection to chat.'));
      } catch (err) {
        if (!cancelled) setChatError(err.message || 'Could not open this conversation.');
      }
    })();

    return () => { cancelled = true; };
  }, []);

  useEffect(() => () => { socketRef.current?.disconnect(); }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, techTyping]);

  const handleSend = (e) => {
    e.preventDefault();
    if (sessionEnded) return;
    const text = message.trim();
    if (!text && !attachment) return;
    if (!socketRef.current || !conversationId) {
      setChatError('Chat is not connected yet. Please wait a moment and try again.');
      return;
    }

    socketRef.current.emit(
      'send-message',
      { conversationId, text, attachmentUrl: attachment?.url, attachmentName: attachment?.name },
      (ack) => { if (!ack?.ok) setChatError(ack?.error || 'Message could not be sent.'); },
    );
    setMessage('');
    setAttachment(null);
  };

  // A real upload — the previous version invented a filename like
  // "work_photo_42.jpg" and attached nothing.
  const handleAttach = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setChatError('');
    try {
      const form = new FormData();
      form.append('file', file);
      const res = await apiRequest('/uploads', { method: 'POST', auth: true, body: form });
      setAttachment({ name: res.data.name, url: res.data.url });
    } catch (err) {
      setChatError(err.message || 'Could not attach that file.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header */}
      <div className="p-4 flex items-center border-b border-border-color">
        <button onClick={() => navigate(-1)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
          <ArrowLeft className="h-6 w-6 text-[#0D47A1]" />
        </button>
        <div className="flex items-center gap-3 ml-2 flex-1">
          <div className="w-10 h-10 bg-[#0D47A1] rounded-full flex items-center justify-center text-white font-bold">N</div>
          <div>
            <h1 className="text-sm font-bold text-text-primary">Nigam Care Support</h1>
            <span className="text-xs font-semibold text-green-500">
              {sessionEnded ? 'session closed' : conversationId ? 'Connected' : 'Connecting…'}
            </span>
          </div>
        </div>
      </div>

      {chatError && (
        <p className="mx-4 mt-3 bg-red-50 border border-red-200 rounded-xl px-3 py-2 text-[11px] font-bold text-red-700">{chatError}</p>
      )}

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
          <label className="p-3 text-text-secondary hover:text-[#0D47A1] transition-colors cursor-pointer">
            <Paperclip className={`h-5 w-5 ${uploading ? 'opacity-40' : ''}`} />
            <input type="file" accept="image/*,application/pdf" onChange={handleAttach} className="hidden" disabled={uploading} />
          </label>
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
