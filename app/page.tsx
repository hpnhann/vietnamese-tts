"use client";
import React, { useState, useRef, useEffect } from 'react';
import { Volume2, Pause, Play, RotateCcw, Download, Loader2, Moon, Sun, Keyboard, Trash2, Upload, FileText, History, X, CheckCircle, AlertCircle, Clock } from 'lucide-react';
import { parseFile, detectCSVDelimiter } from './utils/fileParser';
import FilePreviewModal, { FilePreviewData } from './components/FilePreviewModal';
import WaveformPlayer, { WaveformPlayerRef } from './components/WaveformPlayer';

interface Voice {
  id: string;
  name: string;
  gender: 'female' | 'male';
}

interface Speed {
  value: number;
  label: string;
}

interface CacheItem {
  text: string;
  voice: string;
  speed: number;
  audioUrl: string;
  timestamp: number;
}

interface HistoryItem {
  id: string;
  text: string;
  voice: string;
  speed: number;
  timestamp: number;
  title: string;
}

const VietnameseTTS = () => {
  const [text, setText] = useState<string>('');
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [playbackRate, setPlaybackRate] = useState<number>(1);
  const [selectedVoice, setSelectedVoice] = useState<string>('vi-VN-Neural2-A');
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [darkMode, setDarkMode] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [showShortcuts, setShowShortcuts] = useState<boolean>(false);
  const [cacheHit, setCacheHit] = useState<boolean>(false);
  const [cacheSize, setCacheSize] = useState<number>(0);
  const [showHistory, setShowHistory] = useState<boolean>(false);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [showFilePreview, setShowFilePreview] = useState<boolean>(false);
  const [filePreview, setFilePreview] = useState<FilePreviewData | null>(null);
  const [selectedSheets, setSelectedSheets] = useState<string[]>([]);
  const [selectedDelimiter, setSelectedDelimiter] = useState<'comma' | 'semicolon' | 'tab'>('comma');
  const [previewingVoiceId, setPreviewingVoiceId] = useState<string | null>(null);

  // const audioRef = useRef<HTMLAudioElement | null>(null); // Removed in favor of WaveformPlayer
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);
  const waveformRef = useRef<WaveformPlayerRef>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const voices: Voice[] = [
    { id: 'vi-VN-Neural2-A', name: '🎙️ Neural2-A - Nữ (Khuyến nghị)', gender: 'female' },
    { id: 'vi-VN-Neural2-D', name: '🎙️ Neural2-D - Nam (Khuyến nghị)', gender: 'male' },
    { id: 'vi-VN-Wavenet-A', name: '🔊 Wavenet-A - Nữ', gender: 'female' },
    { id: 'vi-VN-Wavenet-B', name: '🔊 Wavenet-B - Nam', gender: 'male' },
    { id: 'vi-VN-Wavenet-C', name: '🔊 Wavenet-C - Nữ (Trẻ)', gender: 'female' },
    { id: 'vi-VN-Wavenet-D', name: '🔊 Wavenet-D - Nam (Trẻ)', gender: 'male' },
  ];

  const speeds: Speed[] = [
    { value: 0.5, label: '0.5x' },
    { value: 0.75, label: '0.75x' },
    { value: 1, label: '1x' },
    { value: 1.25, label: '1.25x' },
    { value: 1.5, label: '1.5x' },
    { value: 2, label: '2x' },
  ];

  // ==================== CACHE MANAGEMENT ====================
  const CACHE_KEY = 'tts-audio-cache';
  const HISTORY_KEY = 'tts-history';
  const MAX_CACHE_SIZE = 50;
  const MAX_HISTORY_SIZE = 20;

  const getCacheKey = (text: string, voice: string, speed: number) => {
    return `${text.substring(0, 100)}-${voice}-${speed}`;
  };

  const saveToCache = (text: string, voice: string, speed: number, audioUrl: string) => {
    try {
      const cache = JSON.parse(localStorage.getItem(CACHE_KEY) || '{}');
      const key = getCacheKey(text, voice, speed);

      const keys = Object.keys(cache);
      if (keys.length >= MAX_CACHE_SIZE) {
        const oldestKey = keys.sort((a, b) => cache[a].timestamp - cache[b].timestamp)[0];
        delete cache[oldestKey];
      }

      cache[key] = { text, voice, speed, audioUrl, timestamp: Date.now() };
      localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
      updateCacheSize();
    } catch (err) {
      console.error('Cache save error:', err);
    }
  };

  const getFromCache = (text: string, voice: string, speed: number): string | null => {
    try {
      const cache = JSON.parse(localStorage.getItem(CACHE_KEY) || '{}');
      const key = getCacheKey(text, voice, speed);
      const cached = cache[key];

      if (cached) {
        const age = Date.now() - cached.timestamp;
        const maxAge = 7 * 24 * 60 * 60 * 1000;

        if (age < maxAge) {
          return cached.audioUrl;
        } else {
          delete cache[key];
          localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
        }
      }
    } catch (err) {
      console.error('Cache read error:', err);
    }
    return null;
  };

  const clearCache = () => {
    localStorage.removeItem(CACHE_KEY);
    setCacheSize(0);
    showSuccessMessage('Đã xóa cache thành công');
  };

  const updateCacheSize = () => {
    try {
      const cache = JSON.parse(localStorage.getItem(CACHE_KEY) || '{}');
      setCacheSize(Object.keys(cache).length);
    } catch (err) {
      setCacheSize(0);
    }
  };

  // ==================== HISTORY MANAGEMENT ====================
  const saveToHistory = (text: string, voice: string, speed: number) => {
    try {
      const historyData = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
      const title = text.substring(0, 50) + (text.length > 50 ? '...' : '');

      const newItem: HistoryItem = {
        id: Date.now().toString(),
        text,
        voice,
        speed,
        timestamp: Date.now(),
        title
      };

      const updated = [newItem, ...historyData].slice(0, MAX_HISTORY_SIZE);
      localStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
      setHistory(updated);
    } catch (err) {
      console.error('History save error:', err);
    }
  };

  const loadHistory = () => {
    try {
      const historyData = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
      setHistory(historyData);
    } catch (err) {
      setHistory([]);
    }
  };

  const loadFromHistory = (item: HistoryItem) => {
    setText(item.text);
    setSelectedVoice(item.voice);
    setPlaybackRate(item.speed);
    setShowHistory(false);
  };

  const deleteHistoryItem = (id: string) => {
    const updated = history.filter(item => item.id !== id);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
    setHistory(updated);
  };

  const clearHistory = () => {
    localStorage.removeItem(HISTORY_KEY);
    setHistory([]);
    showSuccessMessage('Đã xóa lịch sử thành công');
  };

  // ==================== FILE UPLOAD ====================
  // ==================== FILE UPLOAD - COMPLETE VERSION ====================
  // ==================== CSV DELIMITER DETECTION ====================
  // ==================== EXCEL PREVIEW ====================
  const handleExcelPreview = async (file: File) => {
    try {
      const XLSX = await import('xlsx');
      const arrayBuffer = await file.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: 'array' });

      const sheets: any[] = []; // Use 'any' temporarily or define interface if needed

      workbook.SheetNames.forEach((sheetName) => {
        const worksheet = workbook.Sheets[sheetName];
        const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
        const rowCount = range.e.r - range.s.r + 1;

        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        const previewRows = jsonData.slice(0, 3) as any[][];
        const preview = previewRows.map(row => row.join(' | ')).join('\n');

        sheets.push({ name: sheetName, rowCount, preview: preview || 'Empty sheet' });
      });

      setFilePreview({
        type: 'excel',
        fileName: file.name,
        sheets,
        rawData: { workbook, arrayBuffer }
      });

      setSelectedSheets([sheets[0]?.name]);
      setShowFilePreview(true);
      setUploadProgress(0);
      setIsUploading(false);
    } catch (err: any) {
      setError('❌ Lỗi preview Excel: ' + err.message);
      setIsUploading(false);
    }
  };

  const handleCSVPreview = async (file: File) => {
    try {
      const text = await file.text();
      const delimiters = detectCSVDelimiter(text);

      setFilePreview({
        type: 'csv',
        fileName: file.name,
        csvDelimiters: delimiters,
        rawData: text // rawData for CSV is the text string
      });

      setSelectedDelimiter(delimiters.detected);
      setShowFilePreview(true);
      setUploadProgress(0);
      setIsUploading(false);
    } catch (err: any) {
      setError('❌ Lỗi preview CSV: ' + err.message);
      setIsUploading(false);
    }
  };

  const handleFileUpload = async (file: File) => {
    if (!file) return;

    setIsUploading(true);
    setUploadProgress(0);
    setError('');

    try {
      const fileType = file.name.split('.').pop()?.toLowerCase();

      // ============= TXT FILES =============
      if (fileType === 'txt') {
        const text = await file.text();
        setText(text);
        showSuccessMessage(`✅ Đã tải file ${file.name}`);
        setIsUploading(false);
      }

      // ============= PDF FILES =============
      else if (fileType === 'pdf') {
        try {
          const pdfJS = await import('pdfjs-dist');
          pdfJS.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfJS.version}/build/pdf.worker.min.mjs`;

          const arrayBuffer = await file.arrayBuffer();
          const pdf = await pdfJS.getDocument({ data: arrayBuffer }).promise;

          let fullText = '';
          const maxPages = pdf.numPages;

          for (let i = 1; i <= maxPages; i++) {
            const page = await pdf.getPage(i);
            const textContent = await page.getTextContent();
            const pageText = textContent.items.map((item: any) => item.str).join(' ');
            fullText += pageText + '\n\n';
            setUploadProgress(Math.floor((i / maxPages) * 100));
          }

          if (fullText.trim()) {
            setText(fullText);
            showSuccessMessage(`✅ Đã tải PDF ${file.name} (${maxPages} trang)`);
          } else {
            setError('❌ Không tìm thấy văn bản trong PDF (có thể là file scan)');
          }
        } catch (err: any) {
          console.error('PDF parsing error:', err);
          setError('❌ Lỗi đọc PDF: ' + (err.message || 'Không thể đọc file'));
        }
        setIsUploading(false);
      }

      // ============= DOCX FILES =============
      else if (fileType === 'docx') {
        try {
          const mammoth = await import('mammoth');
          const arrayBuffer = await file.arrayBuffer();

          setUploadProgress(50);

          const result = await mammoth.extractRawText({ arrayBuffer });

          if (result.value && result.value.trim()) {
            setText(result.value);
            setUploadProgress(100);
            showSuccessMessage(`✅ Đã tải DOCX ${file.name}`);
          } else {
            setError('❌ Không tìm thấy văn bản trong file DOCX');
          }

          if (result.messages.length > 0) {
            console.warn('DOCX parsing warnings:', result.messages);
          }
        } catch (err: any) {
          console.error('DOCX parsing error:', err);
          setError('❌ Lỗi đọc DOCX: ' + (err.message || 'Không thể đọc file'));
        }
        setIsUploading(false);
      }

      // ============= EXCEL FILES (XLSX, XLS) =============
      else if (fileType === 'xlsx' || fileType === 'xls') {
        await handleExcelPreview(file);
      }

      // ============= CSV FILES =============
      else if (fileType === 'csv') {
        await handleCSVPreview(file);
      }

      // ============= UNSUPPORTED FILES =============
      else {
        setError(`❌ Không hỗ trợ định dạng .${fileType}. Chỉ hỗ trợ: TXT, PDF, DOCX, XLSX, XLS, CSV`);
        setIsUploading(false);
      }

    } catch (err: any) {
      setError('❌ Lỗi khi đọc file: ' + err.message);
      setIsUploading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFileUpload(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  // ==================== TESTING UTILITIES ====================

  // ==================== VOICE PREVIEW ====================
  const handleVoicePreview = async (voiceId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();

    // If currently playing this voice, pause/stop it
    if (previewingVoiceId === voiceId) {
      if (previewAudioRef.current) {
        previewAudioRef.current.pause();
        previewAudioRef.current.currentTime = 0;
      }
      setPreviewingVoiceId(null);
      return;
    }

    // Stop any other preview
    if (previewAudioRef.current) {
      previewAudioRef.current.pause();
      previewAudioRef.current.currentTime = 0;
    }

    // Stop Main Waveform Player if playing
    if (waveformRef.current && isPlaying) {
      waveformRef.current.pause();
      setIsPlaying(false);
    }

    try {
      setPreviewingVoiceId(voiceId);
      const previewText = "Xin chào, tôi là trợ lý ảo của bạn.";
      const cacheKey = `preview-${voiceId}`;
      let previewUrl = localStorage.getItem(cacheKey);

      if (!previewUrl) {
        const response = await fetch('/api/tts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: previewText, voice: voiceId, speed: 1 }),
        });
        if (!response.ok) throw new Error('Preview failed');
        const blob = await response.blob();
        previewUrl = URL.createObjectURL(blob);
        // Only cache locally for the session if needed, but blob URLs expire
      }

      const audio = new Audio(previewUrl);
      previewAudioRef.current = audio;

      audio.onended = () => {
        setPreviewingVoiceId(null);
      };

      await audio.play();

    } catch (err) {
      console.error('Preview error:', err);
      showSuccessMessage('⚠️ Không thể nghe thử giọng này');
      setPreviewingVoiceId(null);
    }
  };

  // ==================== SPEECH GENERATION ====================
  const generateSpeech = async () => {
    if (!text.trim()) {
      setError('Vui lòng nhập văn bản cần đọc');
      return;
    }

    if (text.length > 5000) {
      setError('Văn bản không được vượt quá 5000 ký tự');
      return;
    }

    const cachedAudio = getFromCache(text, selectedVoice, playbackRate);
    if (cachedAudio) {
      setCacheHit(true);
      setAudioUrl(cachedAudio);
      setIsPlaying(true);

      setTimeout(() => setCacheHit(false), 2000);
      return;
    }

    setIsLoading(true);
    setError('');
    setCacheHit(false);

    try {
      const response = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, voice: selectedVoice, speed: playbackRate }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.details || errorData.error || 'Lỗi khi tạo giọng nói');
      }

      const audioBlob = await response.blob();
      const newAudioUrl = URL.createObjectURL(audioBlob);

      if (audioUrl) URL.revokeObjectURL(audioUrl);

      setAudioUrl(newAudioUrl);
      saveToCache(text, selectedVoice, playbackRate, newAudioUrl);
      saveToHistory(text, selectedVoice, playbackRate);

      // Playback is now handled by WaveformPlayer automatically when audioUrl changes
      setIsPlaying(true);
      setIsLoading(false);

    } catch (err: any) {
      setError('Lỗi: ' + (err.message || String(err)));
      setIsLoading(false);
    }
  };

  const handlePlayPause = () => {
    // If preview is playing, stop it
    if (previewingVoiceId && previewAudioRef.current) {
      previewAudioRef.current.pause();
      setPreviewingVoiceId(null);
    }

    if (audioUrl) {
      // Use Waveform Player
      if (isPlaying) {
        waveformRef.current?.pause();
        setIsPlaying(false);
      } else {
        waveformRef.current?.play();
        setIsPlaying(true);
      }
    } else {
      generateSpeech(); // Trigger generation if no audio
    }
  };

  const handleStop = () => {
    if (previewingVoiceId && previewAudioRef.current) {
      previewAudioRef.current.pause();
      previewAudioRef.current.currentTime = 0;
      setPreviewingVoiceId(null);
    }

    if (audioUrl) {
      waveformRef.current?.pause();
      waveformRef.current?.seek(0); // Reset waveform to start
      setIsPlaying(false);
    }
  };

  const showSuccessMessage = (msg: string) => {
    setError(msg);
    setTimeout(() => setError(''), 2000);
  };

  // Reset audio when text, voice, or speed changes
  useEffect(() => {
    setAudioUrl(null);
    setIsPlaying(false);
    setCacheHit(false);
  }, [text, selectedVoice, playbackRate]);

  // Removed audioRef event listeners useEffect as WaveformPlayer handles events

  const handleSpeedChange = (speed: number) => {
    setPlaybackRate(speed);
    if (waveformRef.current) {
      waveformRef.current.setPlaybackRate(speed);
    }
  };

  const increaseSpeed = () => {
    const currentIndex = speeds.findIndex(s => s.value === playbackRate);
    if (currentIndex < speeds.length - 1) {
      handleSpeedChange(speeds[currentIndex + 1].value);
    }
  };

  const decreaseSpeed = () => {
    const currentIndex = speeds.findIndex(s => s.value === playbackRate);
    if (currentIndex > 0) {
      handleSpeedChange(speeds[currentIndex - 1].value);
    }
  };

  const handleDownload = () => {
    if (audioUrl) {
      const a = document.createElement('a');
      a.href = audioUrl;
      a.download = `tiengviet-tts-${Date.now()}.mp3`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  };

  // ==================== KEYBOARD SHORTCUTS ====================
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLTextAreaElement) return;

      switch (e.key.toLowerCase()) {
        case ' ':
        case 'enter':
          e.preventDefault();
          handlePlayPause();
          break;
        case 'r':
          e.preventDefault();
          handleStop();
          break;
        case 'd':
          e.preventDefault();
          if (audioUrl) handleDownload();
          break;
        case 'arrowup':
          e.preventDefault();
          increaseSpeed();
          break;
        case 'arrowdown':
          e.preventDefault();
          decreaseSpeed();
          break;
        case 'escape':
          e.preventDefault();
          handleStop();
          break;
        case 'h':
          e.preventDefault();
          setShowHistory(!showHistory);
          break;
        case '?':
          e.preventDefault();
          setShowShortcuts(!showShortcuts);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPlaying, audioUrl, playbackRate, showShortcuts, showHistory, text]);

  useEffect(() => {
    updateCacheSize();
    loadHistory();
  }, []);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Vừa xong';
    if (diffMins < 60) return `${diffMins} phút trước`;
    if (diffHours < 24) return `${diffHours} giờ trước`;
    if (diffDays < 7) return `${diffDays} ngày trước`;
    return date.toLocaleDateString('vi-VN');
  };

  const sampleTexts = [
    'Xin chào, đây là ứng dụng chuyển văn bản thành giọng nói tiếng Việt dành cho người khiếm thị.',
    'Công nghệ Text-to-Speech giúp mọi người tiếp cận thông tin dễ dàng hơn.',
    'Hôm nay trời đẹp, chúng ta cùng đi dạo công viên nhé!'
  ];

  return (
    <div className={`min-h-screen transition-colors duration-300 ${darkMode ? 'bg-gray-900' : 'bg-gradient-to-br from-blue-50 via-white to-purple-50'}`}>
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <Volume2 className={`w-8 h-8 ${darkMode ? 'text-blue-400' : 'text-blue-600'}`} />
            <div>
              <h1 className={`text-3xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                Đọc Văn Bản Pro
              </h1>
              <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                Text-to-Speech • History • Upload Files
              </p>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setShowHistory(!showHistory)}
              className={`p-3 rounded-full transition-all ${darkMode
                ? 'bg-gray-800 text-blue-400 hover:bg-gray-700'
                : 'bg-white text-blue-600 hover:bg-gray-100 shadow-md'
                }`}
              title="Lịch sử (H)"
            >
              <History className="w-5 h-5" />
            </button>

            <button
              onClick={() => setShowShortcuts(!showShortcuts)}
              className={`p-3 rounded-full transition-all ${darkMode
                ? 'bg-gray-800 text-blue-400 hover:bg-gray-700'
                : 'bg-white text-blue-600 hover:bg-gray-100 shadow-md'
                }`}
              title="Phím tắt (?)"
            >
              <Keyboard className="w-5 h-5" />
            </button>


            <button
              onClick={() => setDarkMode(!darkMode)}
              className={`p-3 rounded-full transition-all ${darkMode
                ? 'bg-gray-800 text-yellow-400 hover:bg-gray-700'
                : 'bg-white text-gray-700 hover:bg-gray-100 shadow-md'
                }`}
            >
              {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2">
            {/* Shortcuts Modal */}
            {showShortcuts && (
              <div className={`mb-6 p-6 rounded-xl border-2 ${darkMode ? 'bg-gray-800 border-blue-600' : 'bg-blue-50 border-blue-300'}`}>
                <div className="flex items-center justify-between mb-4">
                  <h3 className={`text-lg font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                    ⌨️ Phím tắt
                  </h3>
                  <button onClick={() => setShowShortcuts(false)} className={`${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    ['Space', 'Play/Pause'],
                    ['R', 'Restart'],
                    ['D', 'Download'],
                    ['Esc', 'Stop'],
                    ['↑', 'Tăng tốc độ'],
                    ['↓', 'Giảm tốc độ'],
                    ['H', 'History'],
                    ['?', 'Phím tắt']
                  ].map(([key, desc]) => (
                    <div key={key} className={`flex items-center gap-3 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                      <kbd className={`px-2 py-1 rounded font-mono text-sm ${darkMode ? 'bg-gray-700' : 'bg-white'}`}>{key}</kbd>
                      <span className="text-sm">{desc}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}


            {cacheHit && (
              <div className={`mb-4 p-3 rounded-lg text-center ${darkMode ? 'bg-green-900 text-green-200' : 'bg-green-50 text-green-800'}`}>
                ⚡ Đã tải từ cache - Nhanh hơn & tiết kiệm API!
              </div>
            )}

            {showFilePreview && filePreview && (
              <FilePreviewModal
                filePreview={filePreview}
                darkMode={darkMode}
                onClose={() => {
                  setShowFilePreview(false);
                  setFilePreview(null);
                }}
                onImport={(importedText) => {
                  setText(importedText);
                  showSuccessMessage(`✅ Đã import dữ liệu thành công`);
                  setShowFilePreview(false);
                  setFilePreview(null);
                }}
              />
            )}

            <div className={`rounded-2xl shadow-2xl overflow-hidden ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
              {/* File Upload */}
              <div
                className={`p-4 border-b ${darkMode ? 'border-gray-700 bg-gray-750' : 'border-gray-100 bg-gray-50'}`}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".txt,.pdf,.docx,.xlsx,.xls,.csv"
                  onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])}
                  className="hidden"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                  className={`w-full p-3 rounded-lg border-2 border-dashed transition-all ${isUploading
                    ? 'opacity-50 cursor-not-allowed'
                    : darkMode
                      ? 'border-gray-600 hover:border-blue-500 text-gray-300'
                      : 'border-gray-300 hover:border-blue-500 text-gray-700'
                    }`}
                >
                  <div className="flex items-center justify-center gap-2">
                    <Upload className="w-5 h-5" />
                    <span>Upload TXT, PDF, DOCX, Excel</span>
                  </div>
                </button>
                {uploadProgress > 0 && (
                  <div className={`mt-2 h-2 rounded-full overflow-hidden ${darkMode ? 'bg-gray-700' : 'bg-gray-200'}`}>
                    <div className="h-full bg-blue-500 transition-all" style={{ width: `${uploadProgress}%` }} />
                  </div>
                )}
              </div>

              {/* Text Input */}
              <div className="p-6">
                <label className={`block text-sm font-semibold mb-3 ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>
                  Nhập văn bản cần đọc
                </label>
                <textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="Nhập hoặc dán văn bản tiếng Việt vào đây..."
                  className={`w-full h-48 p-4 rounded-xl border-2 transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none text-lg ${darkMode
                    ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
                    : 'bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-400'
                    }`}
                />

                <div className="mt-3 flex flex-wrap gap-2">
                  <span className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Mẫu:</span>
                  {sampleTexts.map((sample, idx) => (
                    <button
                      key={idx}
                      onClick={() => setText(sample)}
                      className={`text-xs px-3 py-1 rounded-full transition-all ${darkMode
                        ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                        : 'bg-blue-50 text-blue-700 hover:bg-blue-100'
                        }`}
                    >
                      Mẫu {idx + 1}
                    </button>
                  ))}
                </div>

                <div className={`mt-3 flex justify-between text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  <span>{text.length} ký tự</span>
                  {cacheSize > 0 && (
                    <div className="flex items-center gap-2">
                      <span>📦 {cacheSize} cached</span>
                      <button onClick={clearCache} className="hover:text-red-500">
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Settings */}
              <div className={`px-6 py-4 border-t ${darkMode ? 'border-gray-700' : 'border-gray-100'}`}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Voice Selection - Refactored to Grid */}
                  <div>
                    <label className={`block text-sm font-semibold mb-2 ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>
                      Chọn giọng đọc
                    </label>
                    <div className="grid grid-cols-1 gap-3">
                      {voices.map(voice => (
                        <div
                          key={voice.id}
                          className={`p-3 rounded-lg border cursor-pointer flex items-center justify-between transition-all ${selectedVoice === voice.id
                            ? darkMode ? 'bg-blue-900 border-blue-500 bg-opacity-30' : 'bg-blue-50 border-blue-500'
                            : darkMode ? 'bg-gray-800 border-gray-700 hover:border-gray-500' : 'bg-white border-gray-200 hover:border-gray-300'
                            }`}
                          onClick={() => setSelectedVoice(voice.id)}
                        >
                          <div className="flex items-center gap-3">
                            <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${selectedVoice === voice.id
                              ? 'border-blue-500'
                              : darkMode ? 'border-gray-500' : 'border-gray-300'
                              }`}>
                              {selectedVoice === voice.id && (
                                <div className="w-2 h-2 rounded-full bg-blue-500" />
                              )}
                            </div>
                            <div className="text-sm">
                              <div className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                                {voice.name}
                              </div>
                              <div className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                {voice.gender === 'female' ? 'Nữ' : 'Nam'}
                              </div>
                            </div>
                          </div>

                          <button
                            onClick={(e) => handleVoicePreview(voice.id, e)}
                            className={`p-2 rounded-full transition-colors ${darkMode ? 'hover:bg-gray-700 text-gray-400 hover:text-white' : 'hover:bg-gray-100 text-gray-500 hover:text-blue-600'
                              }`}
                            title={previewingVoiceId === voice.id ? "Dừng nghe thử" : "Nghe thử"}
                          >
                            {previewingVoiceId === voice.id ? (
                              <Pause className="w-4 h-4 text-blue-500 animate-pulse" />
                            ) : (
                              <Play className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className={`block text-sm font-semibold mb-2 ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>
                      Tốc độ (↑↓)
                    </label>
                    <div className="flex gap-2">
                      {speeds.map(speed => (
                        <button
                          key={speed.value}
                          onClick={() => handleSpeedChange(speed.value)}
                          className={`flex-1 py-2 rounded-lg font-medium transition-all ${playbackRate === speed.value
                            ? darkMode ? 'bg-blue-600 text-white' : 'bg-blue-500 text-white'
                            : darkMode ? 'bg-gray-700 text-gray-300' : 'bg-white border border-gray-200'
                            }`}
                        >
                          {speed.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Controls */}
              <div className={`p-6 border-t ${darkMode ? 'border-gray-700' : 'border-gray-100'}`}>
                <div className="flex items-center justify-center gap-4">
                  <button
                    onClick={handleStop}
                    disabled={!isPlaying && !audioUrl} // Disable if not playing and no audio loaded
                    className={`p-4 rounded-full transition-all ${(!isPlaying && !audioUrl)
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      : darkMode ? 'bg-gray-700 text-white' : 'bg-gray-200 text-gray-700'
                      }`}
                    title="Restart (R)"
                  >
                    <RotateCcw className="w-6 h-6" />
                  </button>

                  <button
                    onClick={handlePlayPause}
                    disabled={isLoading || !text.trim()}
                    className={`p-6 rounded-full shadow-xl transition-all transform hover:scale-105 ${isLoading || !text.trim()
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      : darkMode ? 'bg-blue-600 text-white' : 'bg-blue-500 text-white'
                      }`}
                    title={isPlaying ? 'Pause (Space)' : 'Play (Space)'}
                  >
                    {isLoading ? (
                      <Loader2 className="w-8 h-8 animate-spin" />
                    ) : isPlaying ? (
                      <Pause className="w-8 h-8" />
                    ) : (
                      <Play className="w-8 h-8 ml-1" />
                    )}
                  </button>

                  <button
                    onClick={handleDownload}
                    disabled={!audioUrl}
                    className={`p-4 rounded-full transition-all ${audioUrl
                      ? darkMode ? 'bg-gray-700 text-white' : 'bg-gray-200 text-gray-700'
                      : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      }`}
                    title="Download (D)"
                  >
                    <Download className="w-6 h-6" />
                  </button>
                </div>

                {/* Removed hidden audio element */}

                {audioUrl ? (
                  <div className="mt-6 w-full">
                    <WaveformPlayer
                      ref={waveformRef}
                      audioUrl={audioUrl}
                      darkMode={darkMode}
                      onEnded={() => setIsPlaying(false)}
                      onPlay={() => setIsPlaying(true)}
                      onPause={() => setIsPlaying(false)}
                      onTimeUpdate={(time, duration) => {
                        setCurrentTime(time);
                        setDuration(duration);
                      }}
                    />
                  </div>
                ) : (
                  <div className={`mt-6 p-4 rounded-lg text-center text-sm ${darkMode ? 'bg-gray-800 text-gray-500' : 'bg-gray-100 text-gray-500'}`}>
                    Nhập văn bản và bấm Play để bắt đầu
                  </div>
                )}

                {error && (
                  <div className={`mt-4 p-3 rounded-lg text-sm text-center ${error.includes('thành công')
                    ? darkMode ? 'bg-green-900 text-green-200' : 'bg-green-50 text-green-800'
                    : darkMode ? 'bg-red-900 text-red-200' : 'bg-red-50 text-red-800'
                    }`}>
                    {error}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* History Sidebar */}
          <div className={`lg:col-span-1 ${!showHistory && 'hidden lg:block'}`}>
            <div className={`rounded-2xl shadow-2xl overflow-hidden ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
              <div className={`p-4 border-b ${darkMode ? 'border-gray-700' : 'border-gray-100'}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Clock className={`w-5 h-5 ${darkMode ? 'text-blue-400' : 'text-blue-600'}`} />
                    <h3 className={`font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>Lịch sử</h3>
                  </div>
                  {history.length > 0 && (
                    <button onClick={clearHistory} className={`text-xs ${darkMode ? 'text-gray-400 hover:text-red-400' : 'text-gray-600 hover:text-red-600'}`}>
                      Xóa tất cả
                    </button>
                  )}
                </div>
              </div>

              <div className="max-h-[600px] overflow-y-auto">
                {history.length === 0 ? (
                  <div className={`p-8 text-center ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p className="text-sm">Chưa có lịch sử</p>
                  </div>
                ) : (
                  history.map((item) => (
                    <div
                      key={item.id}
                      className={`p-4 border-b cursor-pointer transition-all ${darkMode
                        ? 'border-gray-700 hover:bg-gray-750'
                        : 'border-gray-100 hover:bg-gray-50'
                        }`}
                      onClick={() => loadFromHistory(item)}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-medium truncate ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                            {item.title}
                          </p>
                          <p className={`text-xs mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                            {formatDate(item.timestamp)}
                          </p>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteHistoryItem(item.id);
                          }}
                          className={`p-1 ${darkMode ? 'text-gray-400 hover:text-red-400' : 'text-gray-600 hover:text-red-600'}`}
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Features Info */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-4 gap-4">
          {[
            { icon: Volume2, title: '6 Giọng đọc', desc: 'Neural & WaveNet' },
            { icon: Keyboard, title: 'Phím tắt', desc: 'Space, R, D, ↑↓...' },
            { icon: Upload, title: 'Upload File', desc: 'TXT, PDF' },
            { icon: History, title: 'Lịch sử', desc: 'Lưu 20 items' }
          ].map((feature, idx) => (
            <div key={idx} className={`p-4 rounded-xl ${darkMode ? 'bg-gray-800' : 'bg-white shadow-md'}`}>
              <div className="flex items-center gap-3 mb-2">
                <feature.icon className={darkMode ? 'text-blue-400' : 'text-blue-600'} />
                <h3 className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  {feature.title}
                </h3>
              </div>
              <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                {feature.desc}
              </p>
            </div>
          ))}
        </div>

        <div className={`mt-8 text-center text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
          <p>🚀 Full Package: Cache + Shortcuts + History + Upload + Tests</p>
        </div>
      </div>
    </div>
  );
};

export default VietnameseTTS;