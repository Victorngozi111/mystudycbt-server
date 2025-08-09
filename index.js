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

// Health check endpoint for Render/UptimeRobot to prevent spin-down
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', message: 'Server is alive!' });
});

// Define the API endpoint for generating questions
app.post('/api/generate-questions', async (req, res) => {
  const { exam, subject, count } = req.body;

  if (!exam || !subject || !count) {
    return res.status(400).json({ message: 'Missing exam, subject, or count in request.' });
  }

  // REVISED PROMPT: This prompt is now aligned with the client-side data structure.
  // It asks for an array of options and a zero-based index for the answer.
  const prompt = `
    Generate ${count} CBT (Computer-Based Test) questions for the Nigerian exam "${exam}" on the subject "${subject}".
    For each question object, provide:
    - A "question" key with the question text.
    - An "options" key with an array of four string-based choices.
    - An "answer" key with the correct answer represented as a zero-based index (0, 1, 2, or 3) corresponding to the "options" array.
    - A brief "explanation" for why the answer is correct.

    Return the result as a single, valid JSON object with a key "questions" which is an array of these question objects.
    Example of one question object in the array:
    {
      "question": "Who was the first president of Nigeria?",
      "options": ["Nnamdi Azikiwe", "Abubakar Tafawa Balewa", "Obafemi Awolowo", "Ahmadu Bello"],
      "answer": 0,
      "explanation": "Nnamdi Azikiwe was the first President of Nigeria, serving from 1963 to 1966."
    }
    Do not include any text or markdown formatting outside of the main JSON object.
  `;

  try {
    const response = await openai.chat.completions.create({
      // OPTIMIZED MODEL: Switched to gpt-3.5-turbo for better speed and cost-effectiveness.
      model: "gpt-3.5-turbo", 
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
    });

    let questionsData;
    try {
      // ROBUST PARSING: The response from the AI is a string, which needs to be parsed.
      // This is now wrapped in its own try-catch to prevent server crashes on malformed JSON.
      questionsData = JSON.parse(response.choices[0].message.content);
    } catch (parseError) {
      console.error('OpenAI response was not valid JSON:', response.choices[0].message.content);
      return res.status(500).json({ message: 'Failed to parse questions from AI. The AI returned a malformed response.' });
    }

    // DATA VALIDATION: Ensure the data structure is correct before sending to the client.
    if (!questionsData.questions || !Array.isArray(questionsData.questions)) {
        return res.status(500).json({ message: 'AI failed to generate the expected data structure.' });
    }
    
    // DATA TRANSFORMATION: Ensure answer is a number.
    questionsData.questions.forEach(q => {
        if (typeof q.answer !== 'number') {
            q.answer = parseInt(q.answer, 10);
        }
    });

    res.json(questionsData);

  } catch (error) {
    console.error('Error calling OpenAI API:', error);
    res.status(500).json({ message: 'An internal error occurred while contacting the OpenAI service.' });
  }
});

// Start the server
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
