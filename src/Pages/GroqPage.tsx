'use client';

import React, { useState } from 'react';
import Groq from 'groq-sdk';

interface GroqChatCompletionResponse {
  choices: {
    message?: {
      content?: string | null;
    };
  }[];
}

const configValue : string = import.meta.env.VITE_GROQ_API_KEY || "";
const groq = new Groq({
    apiKey: configValue,
  dangerouslyAllowBrowser: true,
});

export async function getGroqChatCompletion(question: string): Promise<GroqChatCompletionResponse> {
  return groq.chat.completions.create({
    messages: [
      {
        role: 'user',
        content: question,
      },
    ],
    model: 'llama3-8b-8192',
  });
}

export default function GroqPage() {
  const [question, setQuestion] = useState<string>('');
  const [context, setContext] = useState<string>('');
  const [arrayData, setArray] = useState<string[][]>([]);

  const promptArray: string[] = [
    `Given the context: "${context}", give me exactly ten single word synonyms of "${question}". Return no other text, such as any kind of introduction. Separate each synonym with a space and then a |.`,
    `Given the context: "${context}", give me three artistic artistic quotes / lines on "${question}" from incredible people. Separate each with a | and return no other text. Lets say I ask for quotes about love you should return this:
    “Love is composed of a single soul inhabiting two bodies.” — Aristotle | “Where there is love there is life.” — Mahatma Gandhi | “To love and be loved is to feel the sun from both sides.” — David Viscott`,
  ];

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    if (!question.trim()) {
      setArray([]);
      return;
    }
    try {
      let newArrayData: string[][] = [];
      for (const prompt of promptArray) {
        const content = await getGroqChatCompletion(prompt);
        console.log(content.choices[0]?.message?.content)
        newArrayData.push(textToArray(content.choices[0]?.message?.content || ''));
      }
      setArray(newArrayData);
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  };

  return (
    <div className="flex justify-center align-middle items-center p-6 sm:p-6 bg-gray-100 overflow-scroll rounded-lg w-[80%]  mx-[10vw]">
      <div className="w-full bg-white shadow-lg rounded-lg p-6 flex flex-col align-middle space-y-6">
        {/* Header */}
        <h1 className="text-3xl sm:text-4xl font-semibold text-gray-800 text-center">
          Synonym AI
        </h1>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row items-center gap-4">
          <label className="w-full sm:flex-1">
            <span className="text-gray-600 font-medium block mb-2 text-sm sm:text-base">
              Origin Word
            </span>
            <input
              type="text"
              value={question}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setQuestion(e.target.value)}
              className="w-full text-black border-gray-300 rounded-md shadow-sm focus:ring focus:ring-custom-rgb focus:border-custom-rgb p-2 text-sm sm:text-base"
              placeholder="Type a word..."
            />
          </label>

          <label className="w-full sm:flex-1">
            <span className="text-gray-600 font-medium block mb-2 text-sm sm:text-base">
              Context (Optional)
            </span>
            <input
              type="text"
              value={context}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setContext(e.target.value)}
              className="w-full text-black border-gray-300 rounded-md shadow-sm focus:ring focus:ring-custom-rgb focus:border-custom-rgb p-2 text-sm sm:text-base"
              placeholder="Provide context..."
            />
          </label>

          <button
            type="submit"
            className="w-full sm:w-auto bg-custom-rgb text-white py-2 px-6 rounded-md hover:opacity-90 transition text-sm sm:text-base"
          >
            Generate
          </button>
        </form>

        {/* Synonym Results */}
        <div className="flex flex-col sm:flex-row gap-6 flex-grow">
          {/* Regular Synonyms */}
          <div className="flex-1 flex flex-col bg-gray-50 p-4 rounded-lg shadow-inner overflow-hidden">
            <h2 className="text-lg sm:text-xl font-semibold text-gray-700 mb-3 text-center">
              Regular Synonyms
            </h2>
            <div className="flex flex-wrap gap-2 overflow-auto">
              {arrayData[0]?.map((item: string, index: number) => (
                <button
                  key={index}
                  className="px-4 text-black py-2 border border-custom-rgb text-custom-rgb rounded-md hover:bg-custom-rgb hover:text-white transition text-sm sm:text-base"
                  onClick={() => setQuestion(item)}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>

          {/* Poetic Synonyms */}
          <div className="flex-1 flex flex-col bg-gray-50 p-4 rounded-lg shadow-inner overflow-hidden">
            <h2 className="text-lg sm:text-xl font-semibold text-gray-700 mb-3 text-center">
              Poetic Synonyms
            </h2>
            <div className="flex flex-wrap gap-2 overflow-auto">
              {arrayData[1]?.map((item: string, index: number) => (
                <button
                  key={index}
                  className="px-4 text-black py-2 border border-custom-rgb text-custom-rgb rounded-md hover:bg-custom-rgb hover:text-white transition text-sm sm:text-base"
                  onClick={() => setQuestion(item)}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const textToArray = (text: string): string[] => {
  // If it matches the quote format, use regex to extract them
  const quoteRegex = /“([^”]+)”\s+—\s+([^|]+)/g;
  const quoteMatches: string[] = [];
  let match;
  while ((match = quoteRegex.exec(text)) !== null) {
    quoteMatches.push(`"${match[1]}" — ${match[2].trim()}`);
  }

  if (quoteMatches.length > 0) {
    return quoteMatches;
  }

  // Otherwise, treat it as a synonyms list separated by " |"
  return text
    .split('|')
    .map((word) => word.trim())
    .filter((word) => word.length > 0);
};


