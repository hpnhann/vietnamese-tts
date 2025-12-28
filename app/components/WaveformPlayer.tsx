import React, { useEffect, useRef, useState, useImperativeHandle, forwardRef } from 'react';
import WaveSurfer from 'wavesurfer.js';

interface WaveformPlayerProps {
    audioUrl: string | null;
    darkMode: boolean;
    onEnded?: () => void;
    onReady?: () => void;
    onPlay?: () => void;
    onPause?: () => void;
    onTimeUpdate?: (time: number, duration: number) => void;
}

export interface WaveformPlayerRef {
    play: () => void;
    pause: () => void;
    isPlaying: () => boolean;
    seek: (time: number) => void;
    setPlaybackRate: (rate: number) => void;
}

const WaveformPlayer = forwardRef<WaveformPlayerRef, WaveformPlayerProps>(({ audioUrl, darkMode, onEnded, onReady, onPlay, onPause, onTimeUpdate }, ref) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const wavesurfer = useRef<WaveSurfer | null>(null);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);

    useImperativeHandle(ref, () => ({
        play: () => wavesurfer.current?.play(),
        pause: () => wavesurfer.current?.pause(),
        isPlaying: () => wavesurfer.current?.isPlaying() || false,
        seek: (time: number) => {
            if (wavesurfer.current) {
                const currentDuration = wavesurfer.current.getDuration();
                if (currentDuration > 0) {
                    wavesurfer.current.seekTo(time / currentDuration);
                }
            }
        },
        setPlaybackRate: (rate: number) => wavesurfer.current?.setPlaybackRate(rate),
    }));

    useEffect(() => {
        if (!containerRef.current) return;

        wavesurfer.current = WaveSurfer.create({
            container: containerRef.current,
            waveColor: darkMode ? '#4B5563' : '#E5E7EB',
            progressColor: darkMode ? '#3B82F6' : '#2563EB',
            cursorColor: darkMode ? '#60A5FA' : '#1D4ED8',
            barWidth: 2,
            barGap: 3,
            height: 80,
            cursorWidth: 1,
            barRadius: 3,
            normalize: true,
        });

        const ws = wavesurfer.current;

        // Load audio immediately if available
        if (audioUrl) {
            ws.load(audioUrl).catch(() => {
                // Ignore abort errors during loading
            });
        }

        ws.on('finish', () => {
            if (onEnded) onEnded();
        });

        ws.on('play', () => {
            if (onPlay) onPlay();
        });

        ws.on('pause', () => {
            if (onPause) onPause();
        });

        ws.on('ready', () => {
            const dur = ws.getDuration() || 0;
            setDuration(dur);
            if (onReady) onReady();
        });

        ws.on('audioprocess', () => {
            const time = ws.getCurrentTime() || 0;
            const dur = ws.getDuration() || 0;
            setCurrentTime(time);
            if (onTimeUpdate) onTimeUpdate(time, dur);
        });

        ws.on('interaction', () => {
            const time = ws.getCurrentTime() || 0;
            const dur = ws.getDuration() || 0;
            setCurrentTime(time);
            if (onTimeUpdate) onTimeUpdate(time, dur);
        });

        return () => {
            // Cancel any active requests and destroy instance
            try {
                ws.destroy();
            } catch (e) {
                // Ignore
            }
        };
    }, [darkMode, audioUrl]);


    // Removed separate useEffect for loading to prevent race conditions

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    return (
        <div className={`p-4 rounded-xl border ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100 shadow-sm'}`}>
            <div ref={containerRef} className="w-full mb-2" />

            <div className={`flex justify-between text-xs font-mono ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                <span>{formatTime(currentTime)}</span>
                <span>{formatTime(duration)}</span>
            </div>
        </div>
    );
});

WaveformPlayer.displayName = 'WaveformPlayer';

export default WaveformPlayer;
