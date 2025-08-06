// Import necessary packages
const express = require('express');
const cors = require('cors');
const { OpenAI } = require('openai');
require('dotenv').config(); // This loads the .env file

// Initialize Express app
const app = express();
const port = process.env.PORT || 3000;

// Initialize OpenAI with your secret key from the environment variables
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Use middleware
app.use(cors()); // Allows your frontend to talk to this server
app.use(express.json()); // Allows the server to understand JSON requests

// === ADD THIS NEW BLOCK ===
// This is the health check endpoint for UptimeRobot to ping.
// When UptimeRobot visits /health, the server will respond with "OK".
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', message: 'Server is alive and well!' });
});
// === END OF NEW BLOCK ===

// Define the API endpoint for generating questions
app.post('/api/generate-questions', async (req, res) => {
  const { exam, subject, count } = req.body;

  if (!exam || !subject || !count) {
    return res.status(400).json({ message: 'Missing exam, subject, or count in request.' });
  }

  const prompt = `
    Generate ${count} CBT (Computer-Based Test) questions for the Nigerian exam "${exam}" on the subject "${subject}".
    For each question, provide:
    - A "question" text.
    - An "options" object with four choices labeled "A", "B", "C", and "D".
    - An "answer" key with the correct option letter (e.g., "B").
    - A brief "explanation" for why the answer is correct.

    Return the result as a single, valid JSON object with a key "questions" which is an array of these question objects. Do not include any text or markdown formatting outside of the JSON object.
  `;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4-turbo-preview",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
    });

    const questionsJson = JSON.parse(response.choices[0].message.content);
    res.json(questionsJson);

  } catch (error) {
    console.error('Error calling OpenAI API:', error);
    res.status(500).json({ message: 'Failed to generate questions from OpenAI.' });
  }
});

// Start the server
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
