import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, X, Send, Loader2, Sparkles } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

const API_URL = import.meta.env?.VITE_API_URL || import.meta.env?.REACT_APP_API_URL || 'http://localhost:5000/api/v1';

const AiChatWidget = ({ reportContext }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const toggleChat = () => setIsOpen(!isOpen);

  const sendMessage = async (e) => {
    e?.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMsg = { role: 'user', content: input };
    const updatedMessages = [...messages, userMsg];
    
    setMessages(updatedMessages);
    setInput('');
    setIsLoading(true);

    // Extract current visible page text context
    let pageText = "";
    try {
      const mainEl = document.querySelector('main');
      if (mainEl) {
        pageText = mainEl.innerText.replace(/\s+/g, ' ').slice(0, 8000);
      }
    } catch (err) {
      console.error("Failed to extract page context", err);
    }

    const compiledContext = [
      `Current Page URL Path: ${window.location.pathname}`,
      `Current Page Document Title: ${document.title}`,
      reportContext ? `Report Data:\n${reportContext}` : `Visible Page Content:\n${pageText}`
    ].filter(Boolean).join("\n\n");

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/v1/ai/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          messages: updatedMessages,
          context: compiledContext
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        setMessages([...updatedMessages, { role: 'assistant', content: data.reply }]);
      } else {
        setMessages([...updatedMessages, { role: 'assistant', content: "Sorry, I encountered an error. Please try again." }]);
      }
    } catch (err) {
      console.error(err);
      setMessages([...updatedMessages, { role: 'assistant', content: "Network error connecting to the AI." }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {/* Floating Action Button */}
      <motion.button
        onClick={toggleChat}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className="fixed bottom-6 right-6 lg:bottom-10 lg:right-10 w-14 h-14 bg-indigo-600 rounded-full shadow-2xl flex items-center justify-center text-white z-50 ring-4 ring-indigo-100 dark:ring-indigo-900"
      >
        {isOpen ? <X size={24} /> : <MessageSquare size={24} />}
      </motion.button>

      {/* Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed bottom-24 right-4 lg:right-10 w-[90vw] max-w-[380px] h-[550px] max-h-[70vh] bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 z-50 flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="bg-indigo-600 p-4 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <Sparkles size={20} className="text-lime-300" />
                <h3 className="font-bold">AI Assistant</h3>
              </div>
              <button onClick={toggleChat} className="text-indigo-200 hover:text-white">
                <X size={20} />
              </button>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50 dark:bg-slate-900/50">
              {messages.length === 0 && (
                <div className="text-center text-slate-500 mt-10 text-sm">
                  <MessageSquare size={32} className="mx-auto mb-2 opacity-50" />
                  <p>{reportContext ? "Ask me questions about the current report!" : "Ask me anything about tasks or operations!"}</p>
                  <p className="text-xs mt-2 opacity-75">{reportContext ? 'e.g. "Who had the highest attendance?"' : 'e.g. "How can I update my daily tasks?"'}</p>
                </div>
              )}
              {messages.map((msg, idx) => (
                <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div 
                    className={`max-w-[85%] p-3 rounded-2xl text-sm ${
                      msg.role === 'user' 
                        ? 'bg-indigo-600 text-white rounded-br-none' 
                        : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 rounded-bl-none shadow-sm'
                    }`}
                  >
                    {msg.role === 'user' ? (
                      msg.content
                    ) : (
                      <div className="prose prose-sm dark:prose-invert max-w-none text-slate-700 dark:text-slate-200">
                        <ReactMarkdown>
                          {msg.content}
                        </ReactMarkdown>
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-3 rounded-2xl rounded-bl-none shadow-sm">
                    <Loader2 size={16} className="animate-spin text-indigo-500" />
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <form onSubmit={sendMessage} className="p-3 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 shrink-0">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder={reportContext ? "Ask about this report..." : "Ask me anything..."}
                  className="flex-1 bg-slate-100 dark:bg-slate-800 text-sm text-slate-900 dark:text-white px-4 py-2.5 rounded-full border-none focus:ring-2 focus:ring-indigo-500 outline-none"
                />
                <button 
                  type="submit"
                  disabled={!input.trim() || isLoading}
                  className="p-2.5 bg-indigo-600 text-white rounded-full disabled:opacity-50 hover:bg-indigo-700 transition-colors"
                >
                  <Send size={16} />
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default AiChatWidget;
