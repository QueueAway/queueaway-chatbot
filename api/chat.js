import fs from 'fs';
import path from 'path';

// Load FAQ knowledge base
const faqPath = path.join(process.cwd(), 'api', 'queueaway_faq_knowledge.json');
const faqData = JSON.parse(fs.readFileSync(faqPath, 'utf8'));

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { message } = req.body;
  if (!message) {
    return res.status(400).json({ error: 'No message provided' });
  }

  // Simple keyword-based FAQ lookup
  const lowerMessage = message.toLowerCase();
  const match = faqData.find(faq => lowerMessage.includes(faq.question.toLowerCase().split(' ')[0]));

  if (match) {
    return res.status(200).json({ reply: match.answer });
  }

  // Fallback to GPT if no FAQ match
  const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content:
            "You are a helpful assistant for QueueAway, a queue management system. Answer based on their services and FAQ. If a question is unrelated, respond politely that you're only here to help with QueueAway-related queries.",
        },
        {
          role: "user",
          content: message,
        },
      ],
      temperature: 0.7,
    }),
  });

  const data = await response.json();

  if (data.error) {
    return res.status(500).json({ error: data.error.message });
  }

  const reply = data.choices[0].message.content;
  return res.status(200).json({ reply });
}

