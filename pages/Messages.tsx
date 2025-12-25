
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { API } from '../services/api';
import { DirectMessage, User, UserRole } from '../types';
import { 
  Send, Inbox, Search, User as UserIcon, Loader2, 
  MessageSquare, Clock, Filter, Sparkles, Mail,
  CheckCheck, ShieldCheck, MoreVertical
} from 'lucide-react';
import { useNotification } from '../context/NotificationContext';
import { UserAvatar } from '../components/Layout';

export default function Messages() {
  const { user } = useAuth();
  const { addNotification } = useNotification();
  const themeColor = user?.themeColor || '#0ea5e9';
  
  const [contacts, setContacts] = useState<User[]>([]);
  const [messages, setMessages] = useState<DirectMessage[]>([]);
  const [selectedContact, setSelectedContact] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [input, setInput] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [usersData, messagesData] = await Promise.all([
          API.auth.getUsers(),
          API.messaging.list()
        ]);
        // Filter out self and keep relevant contacts
        setContacts(usersData.filter(u => u.id !== user?.id));
        setMessages(messagesData);
      } catch (e) {
        addNotification({ title: 'Erreur', message: 'Impossible de charger la messagerie.', type: 'alert' });
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [user?.id, addNotification]);

  const activeMessages = useMemo(() => {
    if (!selectedContact) return [];
    return messages
      .filter(m => 
        (m.sender_id === user?.id && m.receiver_id === selectedContact.id) || 
        (m.sender_id === selectedContact.id && m.receiver_id === user?.id)
      )
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  }, [messages, selectedContact, user?.id]);

  const filteredContacts = useMemo(() => {
    return contacts.filter(c => 
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      c.role.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [contacts, searchTerm]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeMessages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !selectedContact || sending) return;

    setSending(true);
    try {
      await API.messaging.send(selectedContact.id, input.trim());
      // Append local message for instant feedback
      const newMsg: DirectMessage = {
        id: Math.random().toString(),
        sender_id: user!.id,
        receiver_id: selectedContact.id,
        content: input.trim(),
        timestamp: new Date().toISOString(),
        is_read: false
      };
      setMessages(prev => [newMsg, ...prev]);
      setInput('');
    } catch (e) {
      addNotification({ title: 'Erreur', message: 'Message non envoyé.', type: 'alert' });
    } finally {
      setSending(false);
    }
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-24 gap-4">
      <Loader2 className="animate-spin text-primary-500" size={48} />
      <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Initialisation de la messagerie...</p>
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto h-[calc(100vh-180px)] flex gap-8 animate-fade-in pb-10">
      {/* Sidebar Contacts */}
      <div className="w-full md:w-96 flex flex-col bg-white dark:bg-gray-900 rounded-[3rem] shadow-soft border border-gray-100 dark:border-gray-800 overflow-hidden">
         <div className="p-8 border-b border-gray-50 dark:border-gray-800">
            <h2 className="text-2xl font-black italic tracking-tighter uppercase mb-6 flex items-center gap-3">
              <Mail size={24} className="text-primary-500" /> Inbox
            </h2>
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
              <input 
                type="text" 
                placeholder="Chercher un interlocuteur..." 
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-11 pr-4 py-3 bg-gray-50 dark:bg-gray-800 border-none rounded-2xl text-xs font-bold italic outline-none focus:ring-2 focus:ring-primary-50"
              />
            </div>
         </div>
         <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-2">
            {filteredContacts.map(contact => (
              <button 
                key={contact.id}
                onClick={() => setSelectedContact(contact)}
                className={`w-full p-4 rounded-2xl flex items-center gap-4 transition-all ${selectedContact?.id === contact.id ? 'bg-gray-900 text-white shadow-xl' : 'hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300'}`}
              >
                <UserAvatar name={contact.name} color={contact.themeColor} className="w-10 h-10" />
                <div className="flex-1 text-left min-w-0">
                   <p className="text-sm font-black italic truncate leading-none mb-1">{contact.name}</p>
                   <p className={`text-[8px] font-bold uppercase tracking-widest opacity-60`}>{contact.role} • {contact.className}</p>
                </div>
              </button>
            ))}
         </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col bg-white dark:bg-gray-900 rounded-[3.5rem] shadow-premium border border-gray-100 dark:border-gray-800 overflow-hidden">
         {selectedContact ? (
            <>
              <div className="p-6 md:p-8 border-b border-gray-50 dark:border-gray-800 flex items-center justify-between bg-gray-50/20">
                 <div className="flex items-center gap-4">
                    <UserAvatar name={selectedContact.name} color={selectedContact.themeColor} className="w-12 h-12" />
                    <div>
                       <h3 className="text-xl font-black italic tracking-tighter text-gray-900 dark:text-white leading-none">{selectedContact.name}</h3>
                       <p className="text-[9px] font-black text-primary-500 uppercase tracking-widest mt-1">{selectedContact.role} • {selectedContact.className}</p>
                    </div>
                 </div>
                 <div className="flex gap-2">
                    <button className="p-3 text-gray-400 hover:text-gray-600 rounded-xl"><MoreVertical size={20}/></button>
                 </div>
              </div>

              <div className="flex-1 overflow-y-auto p-8 space-y-6 custom-scrollbar bg-gray-50/30 dark:bg-gray-900/30">
                 {activeMessages.map((msg, i) => {
                   const isMe = msg.sender_id === user?.id;
                   return (
                     <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'} animate-fade-in`}>
                        <div className={`max-w-[75%] space-y-2 ${isMe ? 'items-end' : 'items-start'}`}>
                           <div className={`px-6 py-4 rounded-[2rem] text-sm font-medium italic leading-relaxed shadow-sm ${isMe ? 'bg-gray-900 text-white rounded-tr-none' : 'bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 border border-gray-100 dark:border-gray-700 rounded-tl-none'}`}>
                              {msg.content}
                           </div>
                           <div className="flex items-center gap-2 px-2">
                              <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest">
                                {new Date(msg.timestamp).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}
                              </span>
                              {isMe && <CheckCheck size={12} className="text-primary-500" />}
                           </div>
                        </div>
                     </div>
                   );
                 })}
                 <div ref={messagesEndRef} />
                 {activeMessages.length === 0 && (
                   <div className="h-full flex flex-col items-center justify-center text-center p-12 opacity-30 grayscale">
                      <MessageSquare size={64} className="mb-6" />
                      <p className="text-sm font-black uppercase tracking-[0.3em]">Début de la conversation</p>
                      <p className="text-[10px] italic mt-2">Dites bonjour à {selectedContact.name.split(' ')[0]} !</p>
                   </div>
                 )}
              </div>

              <form onSubmit={handleSendMessage} className="p-6 md:p-10 border-t border-gray-50 dark:border-gray-800 bg-white dark:bg-gray-900">
                 <div className="flex gap-4">
                    <input 
                      type="text" 
                      value={input}
                      onChange={e => setInput(e.target.value)}
                      placeholder="Votre message institutionnel..."
                      className="flex-1 px-8 py-4 bg-gray-50 dark:bg-gray-800 border-none rounded-[1.8rem] text-sm font-bold italic outline-none focus:ring-4 focus:ring-primary-50 transition-all"
                    />
                    <button 
                      type="submit" 
                      disabled={!input.trim() || sending}
                      className="w-16 h-16 bg-primary-500 text-white rounded-[1.8rem] flex items-center justify-center shadow-xl hover:bg-primary-600 active:scale-95 transition-all disabled:opacity-50"
                    >
                       {sending ? <Loader2 className="animate-spin" /> : <Send size={24} className="-rotate-12 translate-x-0.5" />}
                    </button>
                 </div>
              </form>
            </>
         ) : (
            <div className="h-full flex flex-col items-center justify-center text-center p-20 space-y-8">
               <div className="w-32 h-32 bg-gray-50 dark:bg-gray-800 rounded-[3rem] flex items-center justify-center text-gray-200">
                  <Inbox size={64} />
               </div>
               <div>
                 <h3 className="text-2xl font-black italic tracking-tighter text-gray-900 dark:text-white uppercase">Sélectionnez un contact</h3>
                 <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] mt-3">Connectez-vous avec vos délégués ou l'administration</p>
               </div>
            </div>
         )}
      </div>
    </div>
  );
}
