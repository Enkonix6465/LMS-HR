import React, { useState } from "react";
import { db } from "../lib/firebase";
import { addDoc, collection } from "firebase/firestore";

const FaqAdmin: React.FC = () => {
  const [question, setQuestion] = useState("");
  const [keywords, setKeywords] = useState("");
  const [answer, setAnswer] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async () => {
    if (!question.trim() || !keywords.trim() || !answer.trim()) {
      alert("Please fill in all fields");
      return;
    }

    setLoading(true);

    try {
      const newFaq = {
        question,
        keywords: keywords.split(",").map((k) => k.trim().toLowerCase()),
        answer,
      };

      await addDoc(collection(db, "faq"), newFaq);

      setQuestion("");
      setKeywords("");
      setAnswer("");
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (error) {
      alert("Error adding FAQ: " + (error as Error).message);
    }

    setLoading(false);
  };

  return (
    <div className="max-w-3xl mx-auto p-4">
      <h2 className="text-2xl font-bold mb-4 text-center">🛠️ Admin: Add FAQ</h2>
      <div className="space-y-4">
        <div>
          <label className="block font-medium mb-1">Question</label>
          <input
            type="text"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            className="w-full p-2 border rounded"
            placeholder="e.g. What is your name?"
          />
        </div>

        <div>
          <label className="block font-medium mb-1">
            Keywords (comma-separated)
          </label>
          <input
            type="text"
            value={keywords}
            onChange={(e) => setKeywords(e.target.value)}
            className="w-full p-2 border rounded"
            placeholder="your name, name, who are you"
          />
        </div>

        <div>
          <label className="block font-medium mb-1">
            Answer (HTML allowed)
          </label>
          <textarea
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            rows={5}
            className="w-full p-2 border rounded"
            placeholder="<p>My name is <strong>Enkonix AI</strong>.</p>"
          />
        </div>

        <button
          onClick={handleSubmit}
          disabled={loading}
          className="bg-green-600 text-white px-6 py-2 rounded hover:bg-green-700"
        >
          {loading ? "Saving..." : "Add FAQ"}
        </button>

        {success && (
          <p className="text-green-600">✅ FAQ added successfully!</p>
        )}
      </div>
    </div>
  );
};

export default FaqAdmin;
