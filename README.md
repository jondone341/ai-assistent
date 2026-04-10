# Sassy AI Voice Assistant

A real-time, voice-to-voice AI assistant built with React, TypeScript, and the Gemini Live API.

## Features

- **Voice-to-Voice ONLY**: No text chat, just pure conversation.
- **Sassy Personality**: A witty, confident, and playful female persona.
- **Gemini Live API**: Low-latency, real-time interactions using `gemini-3.1-flash-live-preview`.
- **Function Calling**:
  - `openWebsite`: Can open URLs on command.
  - `writeCode`: Can write and display code blocks in the UI.
- **Futuristic UI**: Dark theme with real-time audio visualization and smooth animations.
- **Clean Architecture**: Decoupled audio streaming and session management logic.

## Tech Stack

- **Frontend**: React 19, TypeScript, Vite
- **Styling**: Tailwind CSS 4
- **Animations**: Framer Motion (motion/react)
- **AI**: Google Gemini Live API (@google/genai)
- **Icons**: Lucide React

## Getting Started

1. **Clone the repository**
2. **Install dependencies**:
   ```bash
   npm install
   ```
3. **Set up environment variables**:
   Create a `.env` file and add your Gemini API key:
   ```env
   GEMINI_API_KEY=your_api_key_here
   ```
4. **Run the development server**:
   ```bash
   npm run dev
   ```

## Audio Specifications

- **Input**: PCM16 16kHz (Mono)
- **Output**: PCM16 24kHz (Mono)

## License

Apache-2.0
