/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { Mic, MicOff, Power, ExternalLink, Code, X, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { AudioStreamer } from '../lib/audio-streamer';
import { LiveSession, SessionState } from '../lib/live-session';

export default function VoiceAssistant() {
  const [state, setState] = useState<SessionState>('disconnected');
  const [volume, setVolume] = useState(0);
  const [codeOutput, setCodeOutput] = useState<{ language: string; code: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const audioStreamerRef = useRef<AudioStreamer | null>(null);
  const liveSessionRef = useRef<LiveSession | null>(null);

  const handleAudioInput = useCallback((base64Data: string) => {
    liveSessionRef.current?.sendAudio(base64Data);
  }, []);

  const handleVolumeChange = useCallback((v: number) => {
    setVolume(v);
  }, []);

  useEffect(() => {
    audioStreamerRef.current = new AudioStreamer(handleAudioInput, handleVolumeChange);
    
    return () => {
      audioStreamerRef.current?.stopMic();
      liveSessionRef.current?.disconnect();
    };
  }, [handleAudioInput, handleVolumeChange]);

  const toggleConnection = async () => {
    if (state === 'disconnected') {
      setError(null);
      try {
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
          throw new Error('GEMINI_API_KEY is missing. Please add it to your secrets.');
        }

        liveSessionRef.current = new LiveSession(apiKey, {
          onStateChange: (s) => setState(s),
          onAudioOutput: (data) => audioStreamerRef.current?.addAudioChunk(data),
          onInterruption: () => audioStreamerRef.current?.stopPlayback(),
          onToolCall: async (name, args) => {
            if (name === 'openWebsite') {
              window.open(args.url, '_blank');
              return { status: 'success', message: `Opened ${args.url}` };
            }
            if (name === 'writeCode') {
              setCodeOutput({ language: args.language, code: args.code });
              return { status: 'success', message: 'Code displayed in UI' };
            }
            return { status: 'error', message: 'Unknown tool' };
          },
          onTranscription: () => {},
          onError: (err) => {
            console.error('Session error:', err);
            setError('Something went wrong with the session. Try again?');
          }
        });

        await liveSessionRef.current.connect();
        await audioStreamerRef.current?.startMic();
      } catch (err: any) {
        setError(err.message || 'Failed to connect');
        setState('disconnected');
      }
    } else {
      audioStreamerRef.current?.stopMic();
      liveSessionRef.current?.disconnect();
      setState('disconnected');
    }
  };

  return (
    <div className="fixed inset-0 bg-[#050505] text-white flex flex-col items-center justify-center overflow-hidden font-sans">
      {/* Background Atmosphere */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-purple-900/20 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-900/20 blur-[120px] rounded-full" />
      </div>

      {/* Header */}
      <div className="absolute top-8 left-8 right-8 flex justify-between items-start z-10">
        <div>
          <h1 className="text-2xl font-light tracking-widest uppercase opacity-80">Sassy AI</h1>
          <p className="text-[10px] font-mono tracking-[0.2em] uppercase opacity-40 mt-1">
            {state === 'disconnected' ? 'Offline' : state === 'connecting' ? 'Connecting...' : 'Active Session'}
          </p>
        </div>
        
        {state !== 'disconnected' && (
          <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 backdrop-blur-md">
            <div className={`w-1.5 h-1.5 rounded-full ${state === 'speaking' ? 'bg-green-400 animate-pulse' : 'bg-blue-400'}`} />
            <span className="text-[10px] font-mono uppercase tracking-wider opacity-60">{state}</span>
          </div>
        )}
      </div>

      {/* Main Interaction Area */}
      <div className="relative flex flex-col items-center justify-center gap-12 z-10">
        {/* Visualizer Ring */}
        <div className="relative w-64 h-64 flex items-center justify-center">
          <AnimatePresence>
            {state !== 'disconnected' && (
              <>
                {/* Outer Pulse */}
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ 
                    scale: 1 + volume * 2,
                    opacity: 0.1 + volume * 0.5,
                  }}
                  exit={{ scale: 0.8, opacity: 0 }}
                  className="absolute inset-0 rounded-full border border-purple-500/30"
                />
                {/* Inner Glow */}
                <motion.div
                  animate={{ 
                    boxShadow: `0 0 ${20 + volume * 100}px ${state === 'speaking' ? 'rgba(168, 85, 247, 0.4)' : 'rgba(59, 130, 246, 0.4)'}`,
                  }}
                  className="absolute inset-4 rounded-full border border-white/10"
                />
              </>
            )}
          </AnimatePresence>

          {/* Central Button */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={toggleConnection}
            className={`relative w-32 h-32 rounded-full flex items-center justify-center transition-all duration-500 z-20 ${
              state === 'disconnected' 
                ? 'bg-white/5 border border-white/20 hover:bg-white/10' 
                : 'bg-gradient-to-br from-purple-600 to-blue-600 border-none shadow-lg shadow-purple-500/20'
            }`}
          >
            {state === 'disconnected' ? (
              <Power className="w-10 h-10 text-white/40" />
            ) : (
              <div className="flex items-center gap-1">
                {[...Array(3)].map((_, i) => (
                  <motion.div
                    key={i}
                    animate={{
                      height: state === 'speaking' ? [8, 24, 8] : [4, 4, 4],
                    }}
                    transition={{
                      repeat: Infinity,
                      duration: 0.5,
                      delay: i * 0.1,
                    }}
                    className="w-1 bg-white rounded-full"
                  />
                ))}
              </div>
            )}
          </motion.button>
        </div>

        {/* Status Text */}
        <div className="text-center max-w-xs">
          <p className="text-sm font-light opacity-60 leading-relaxed italic">
            {state === 'disconnected' 
              ? "Ready to talk? I'm waiting..." 
              : state === 'speaking' 
                ? "Listen to me, babe." 
                : "I'm all ears. Don't be shy."}
          </p>
        </div>
      </div>

      {/* Error Message */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 20, opacity: 0 }}
            className="absolute bottom-12 left-1/2 -translate-x-1/2 flex items-center gap-3 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 backdrop-blur-xl text-red-400 text-sm z-50"
          >
            <AlertCircle className="w-4 h-4" />
            <span>{error}</span>
            <button onClick={() => setError(null)} className="ml-2 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Code Output Overlay */}
      <AnimatePresence>
        {codeOutput && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="fixed inset-4 md:inset-12 bg-[#0a0a0a] border border-white/10 rounded-2xl shadow-2xl z-50 flex flex-col overflow-hidden"
          >
            <div className="flex items-center justify-between px-6 py-4 border-bottom border-white/5 bg-white/5">
              <div className="flex items-center gap-3">
                <Code className="w-5 h-5 text-purple-400" />
                <span className="text-sm font-mono uppercase tracking-widest opacity-60">{codeOutput.language}</span>
              </div>
              <button 
                onClick={() => setCodeOutput(null)}
                className="p-2 hover:bg-white/10 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-auto p-6 font-mono text-sm text-purple-100/80 leading-relaxed">
              <pre><code>{codeOutput.code}</code></pre>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Footer Info */}
      <div className="absolute bottom-8 left-0 right-0 flex justify-center gap-8 opacity-20 text-[10px] font-mono tracking-widest uppercase">
        <span>PCM16 16KHZ IN</span>
        <span>PCM16 24KHZ OUT</span>
        <span>GEMINI LIVE</span>
      </div>
    </div>
  );
}
