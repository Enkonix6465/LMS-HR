import React, { useEffect, useState, useRef } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../lib/firebase";

interface FaqItem {
  question: string;
  keywords: string[];
  answer: string; // HTML string
}

interface Message {
  from: "user" | "bot";
  text?: string;
  html?: string;
}

// --- AI Chatbot Panel ---
function AIChatbotPanel({ messages, faqData }: { messages: Message[]; faqData: FaqItem[] }) {
  // Proactive reminders: if user hasn't asked about leave, remind about leave policy
  const leaveReminder = React.useMemo(() => {
    if (!messages.some(m => m.text?.toLowerCase().includes('leave'))) {
      return "Don't forget to check your leave balance and policy!";
    }
    return null;
  }, [messages]);

  // Sentiment analysis: if user is frustrated (e.g., 'not working', 'problem', 'angry')
  const negativeWords = ['not working', 'problem', 'angry', 'frustrated', 'issue', 'error'];
  const negative = React.useMemo(() => {
    return messages.some(m => m.text && negativeWords.some(w => m.text.toLowerCase().includes(w)));
  }, [messages]);

  // FAQ suggestions: top 3 most common questions
  const topFaqs = faqData.slice(0, 3);

  return (
    <div className="mb-4 bg-gradient-to-br from-purple-50 via-blue-50 to-yellow-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 rounded-xl shadow p-4">
      <h3 className="font-bold text-purple-700 dark:text-purple-300 mb-2 flex items-center gap-2"><span>🤖</span>AI Chatbot Insights</h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <h4 className="font-semibold text-blue-700 dark:text-blue-300 mb-1 text-xs flex items-center gap-1">🔔 Proactive Reminder</h4>
          {leaveReminder ? <div className="text-xs text-gray-700 dark:text-gray-200">{leaveReminder}</div> : <div className="text-xs text-gray-400">No reminders</div>}
        </div>
        <div>
          <h4 className="font-semibold text-red-700 dark:text-red-300 mb-1 text-xs flex items-center gap-1">😟 Sentiment</h4>
          {negative ? <div className="text-xs text-red-600">User seems frustrated. Offer help or escalate.</div> : <div className="text-xs text-gray-400">All good!</div>}
        </div>
        <div>
          <h4 className="font-semibold text-green-700 dark:text-green-300 mb-1 text-xs flex items-center gap-1">💡 FAQ Suggestions</h4>
          <ul className="text-xs text-gray-700 dark:text-gray-200 space-y-1">
            {topFaqs.map((faq, i) => <li key={i}>{faq.question}</li>)}
          </ul>
        </div>
      </div>
    </div>
  );
}

const Chatbot: React.FC = () => {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [faqData, setFaqData] = useState<FaqItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchFAQs = async () => {
      setLoading(true);
      setError(null);
      try {
        const snapshot = await getDocs(collection(db, "faq"));
        const data: FaqItem[] = snapshot.docs.map((doc) => doc.data() as FaqItem);
        setFaqData(data);
        setLoading(false);
      } catch (err: any) {
        setError("Failed to load FAQs. " + (err?.message || ""));
        setLoading(false);
      }
    };
    fetchFAQs();
  }, []);

  // Scroll to bottom on new message
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = () => {
    if (!input.trim()) return;

    const userMessage: Message = { from: "user", text: input };
    const botResponse = getBotResponse(input);
    setMessages((prev) => [...prev, userMessage, botResponse]);
    setInput("");
  };

  const getBotResponse = (question: string): Message => {
    const lowerQ = question.toLowerCase();
    if (!faqData.length) {
      return { from: "bot", text: "Sorry, FAQ data is not available right now." };
    }
    // Efficient keyword matching
    let bestMatch: FaqItem | null = null;
    let maxMatches = 0;
    for (const faq of faqData) {
      let matches = 0;
      for (const keyword of faq.keywords) {
        if (lowerQ.includes(keyword.toLowerCase())) matches++;
      }
      if (matches > maxMatches) {
        maxMatches = matches;
        bestMatch = faq;
      }
    }
    if (bestMatch && maxMatches > 0) {
      return { from: "bot", html: bestMatch.answer };
    }
    return { from: "bot", text: "Sorry, I don't understand that yet." };
  };

  return (
    <div className="max-w-2xl mx-auto p-4">
      <AIChatbotPanel messages={messages} faqData={faqData} />
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-center flex-1">Enkonix AI Chatbot</h1>
        <a
          href="/Faqadmin"
          className="ml-4 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg shadow transition-all text-sm font-semibold"
          style={{ whiteSpace: 'nowrap' }}
        >
          FAQ Admin
        </a>
      </div>
      {loading && (
        <div className="text-center text-blue-600 animate-pulse mb-2">Loading FAQ data...</div>
      )}
      {error && (
        <div className="text-center text-red-600 mb-2">{error}</div>
      )}
      <div className="border rounded-lg h-[500px] overflow-y-auto p-4 flex flex-col gap-3 bg-gray-50">
        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`max-w-[70%] p-2 rounded-lg text-sm ${
              msg.from === "user"
                ? "bg-blue-500 text-white self-end"
                : "bg-white text-gray-800 self-start border"
            }`}
            tabIndex={0}
            aria-label={msg.from === "user" ? "User message" : "Bot message"}
          >
            {msg.html ? (
              <div dangerouslySetInnerHTML={{ __html: msg.html }} />
            ) : (
              msg.text
            )}
          </div>
        ))}
        <div ref={chatEndRef} />
      </div>

      <div className="mt-4 flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !loading) handleSend();
          }}
          className="flex-1 px-4 py-2 border rounded-lg"
          placeholder="Ask a question..."
          aria-label="Ask a question"
          disabled={loading}
        />
        <button
          onClick={handleSend}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
          disabled={loading || !input.trim()}
          aria-label="Send message"
        >
          Send
        </button>
      </div>
    </div>
  );
};

export default Chatbot;
