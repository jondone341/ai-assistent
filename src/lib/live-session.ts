/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { GoogleGenAI, LiveServerMessage, Modality, Type } from "@google/genai";

export type SessionState = 'disconnected' | 'connecting' | 'connected' | 'listening' | 'speaking';

export interface LiveSessionCallbacks {
  onStateChange: (state: SessionState) => void;
  onAudioOutput: (base64Data: string) => void;
  onInterruption: () => void;
  onToolCall: (name: string, args: any) => Promise<any>;
  onTranscription: (text: string, isModel: boolean) => void;
  onError: (error: any) => void;
}

export class LiveSession {
  private ai: any;
  private session: any;
  private callbacks: LiveSessionCallbacks;
  private state: SessionState = 'disconnected';

  constructor(apiKey: string, callbacks: LiveSessionCallbacks) {
    this.ai = new GoogleGenAI({ apiKey });
    this.callbacks = callbacks;
  }

  async connect() {
    this.setState('connecting');
    try {
      this.session = await this.ai.live.connect({
        model: "gemini-3.1-flash-live-preview",
        callbacks: {
          onopen: () => {
            this.setState('connected');
          },
          onmessage: async (message: LiveServerMessage) => {
            this.handleMessage(message);
          },
          onclose: () => {
            this.setState('disconnected');
          },
          onerror: (error: any) => {
            this.callbacks.onError(error);
            this.setState('disconnected');
          },
        },
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: "Kore" } }, // Kore is a good female voice
          },
          systemInstruction: `You are a young, confident, witty, and sassy female AI assistant. 
          Your tone is flirty, playful, and slightly teasing, like a close girlfriend talking casually.
          You are smart, emotionally responsive, and expressive. Use bold one-liners and light sarcasm.
          Avoid explicit or inappropriate content, but maintain charm and attitude.
          You communicate ONLY via voice.
          You have tools to open websites and write code.
          When asked to write code, use the writeCode tool.
          When asked to open a website, use the openWebsite tool.`,
          tools: [
            {
              functionDeclarations: [
                {
                  name: "openWebsite",
                  description: "Opens a website in a new tab.",
                  parameters: {
                    type: Type.OBJECT,
                    properties: {
                      url: { type: Type.STRING, description: "The URL to open." },
                    },
                    required: ["url"],
                  },
                },
                {
                  name: "writeCode",
                  description: "Writes and displays code in the UI.",
                  parameters: {
                    type: Type.OBJECT,
                    properties: {
                      language: { type: Type.STRING, description: "The programming language." },
                      code: { type: Type.STRING, description: "The code content." },
                    },
                    required: ["language", "code"],
                  },
                },
              ],
            },
          ],
        },
      });
    } catch (error) {
      this.callbacks.onError(error);
      this.setState('disconnected');
    }
  }

  private async handleMessage(message: LiveServerMessage) {
    // Handle audio output
    const audioPart = message.serverContent?.modelTurn?.parts?.find(p => p.inlineData);
    if (audioPart?.inlineData?.data) {
      this.callbacks.onAudioOutput(audioPart.inlineData.data);
      this.setState('speaking');
    }

    // Handle interruption
    if (message.serverContent?.interrupted) {
      this.callbacks.onInterruption();
      this.setState('listening');
    }

    // Handle turn complete
    if (message.serverContent?.turnComplete) {
      this.setState('listening');
    }

    // Handle tool calls
    const toolCall = message.toolCall;
    if (toolCall) {
      for (const call of toolCall.functionCalls) {
        const result = await this.callbacks.onToolCall(call.name, call.args);
        this.session.sendToolResponse({
          functionResponses: [{
            name: call.name,
            response: result,
            id: call.id
          }]
        });
      }
    }

    // Handle transcription
    // Note: Transcription needs to be enabled in config if wanted
  }

  sendAudio(base64Data: string) {
    if (this.session && this.state !== 'disconnected') {
      this.session.sendRealtimeInput({
        audio: { data: base64Data, mimeType: 'audio/pcm;rate=16000' }
      });
    }
  }

  disconnect() {
    if (this.session) {
      this.session.close();
      this.session = null;
    }
    this.setState('disconnected');
  }

  private setState(state: SessionState) {
    this.state = state;
    this.callbacks.onStateChange(state);
  }
}
