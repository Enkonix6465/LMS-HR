import React, { useEffect, useState } from "react";
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

const Chatbot: React.FC = () => {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [faqData, setFaqData] = useState<FaqItem[]>([]);

  useEffect(() => {
    const fetchFAQs = async () => {
      const snapshot = await getDocs(collection(db, "faq"));
      const data: FaqItem[] = snapshot.docs.map((doc) => doc.data() as FaqItem);
      setFaqData(data);
    };
    fetchFAQs();
  }, []);

  const handleSend = () => {
    if (!input.trim()) return;

    const userMessage: Message = { from: "user", text: input };
    const botResponse = getBotResponse(input);
    setMessages((prev) => [...prev, userMessage, botResponse]);
    setInput("");
  };

  const getBotResponse = (question: string): Message => {
    const lowerQ = question.toLowerCase();
    const matched = faqData.find((faq) =>
      faq.keywords.some((keyword) => lowerQ.includes(keyword.toLowerCase()))
    );

    return matched
      ? { from: "bot", html: matched.answer }
      : { from: "bot", text: "Sorry, I don't understand that yet." };
  };

  return (
    <div className="max-w-2xl mx-auto p-4">
      <h1 className="text-2xl font-bold text-center mb-4">
        Enkonix AI Chatbot
      </h1>
      <div className="border rounded-lg h-[500px] overflow-y-auto p-4 flex flex-col gap-3 bg-gray-50">
        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`max-w-[70%] p-2 rounded-lg text-sm ${
              msg.from === "user"
                ? "bg-blue-500 text-white self-end"
                : "bg-white text-gray-800 self-start border"
            }`}
          >
            {msg.html ? (
              <div dangerouslySetInnerHTML={{ __html: msg.html }} />
            ) : (
              msg.text
            )}
          </div>
        ))}
      </div>

      <div className="mt-4 flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
          className="flex-1 px-4 py-2 border rounded-lg"
          placeholder="Ask a question..."
        />
        <button
          onClick={handleSend}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          Send
        </button>
      </div>
    </div>
  );
};

export default Chatbot;
