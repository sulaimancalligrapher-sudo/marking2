import React, { useState, useEffect, useRef } from 'react';
import { gasApi } from '../api';
import { StudentSubmission, PredefinedText } from '../types';
import CanvasEditor from './CanvasEditor';
import {
  ArrowLeft,
  PenTool,
  Award,
  FileText,
  UploadCloud,
  ChevronLeft,
  Volume2,
  Check,
  RotateCw,
  Undo,
  Redo,
  Eraser,
  Grid,
  Mic,
  Camera,
  Play,
  Pause,
  VolumeX,
  Trash2,
  FileAudio,
  Paperclip,
  CheckCircle,
  HelpCircle,
  MessageSquareCode,
  X,
  AlertCircle,
  Smile,
  FileVideo,
  Image as ImageIcon,
  Sparkles,
  ZoomIn,
  ZoomOut,
  Maximize
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// Extract Google Drive File ID from standard and sharing URLs
export function getGoogleDriveFileId(url: string): string | null {
  if (!url) return null;
  const trimmed = url.trim();
  if (!trimmed.includes('.') && !trimmed.includes('/')) {
    return trimmed;
  }
  const match = trimmed.match(/\/file\/d\/([a-zA-Z0-9_-]{19,50})/);
  if (match && match[1]) return match[1];

  const idParam = trimmed.match(/[?&]id=([a-zA-Z0-9_-]{19,50})/);
  if (idParam && idParam[1]) return idParam[1];

  const ucMatch = trimmed.match(/\/uc\?.*id=([a-zA-Z0-9_-]{19,50})/);
  if (ucMatch && ucMatch[1]) return ucMatch[1];

  return null;
}

// Format time in seconds to minutes:seconds (e.g., 2:05)
export function formatTime(timeInSeconds: number): string {
  if (isNaN(timeInSeconds) || timeInSeconds === Infinity) return '0:00';
  const mins = Math.floor(timeInSeconds / 60);
  const secs = Math.floor(timeInSeconds % 60);
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
}

interface CorrectionWorkspaceProps {
  submission: StudentSubmission;
  onBack: () => void;
}

export default function CorrectionWorkspace({ submission, onBack }: CorrectionWorkspaceProps) {
  const editorRef = useRef<any>(null);

  // Core Data
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveStep, setSaveStep] = useState('');
  const [error, setError] = useState<string | null>(null);

  const [studentImageBase64, setStudentImageBase64] = useState<string | null>(null);
  const [predefinedTexts, setPredefinedTexts] = useState<PredefinedText[]>([]);
  const [stickersList, setStickersList] = useState<string[]>([]);
  const [stickerImages, setStickerImages] = useState<Record<string, string>>({});
  const [additionalHeaders, setAdditionalHeaders] = useState<string[]>([]);

  // Workspace controls state
  const [toolGroup, setToolGroup] = useState<'draw' | 'textSticker' | 'other'>('draw');
  const [mode, setMode] = useState<'draw' | 'sticker' | 'text'>('draw');
  const [lineWidth, setLineWidth] = useState(24);
  const [lineColor, setLineColor] = useState('#EF4444');
  const [isChisel, setIsChisel] = useState(false);
  const [nibAngle, setNibAngle] = useState(75);

  // Stickers / Text State
  const [stickerSize, setStickerSize] = useState(120);
  const [selectedStickerId, setSelectedStickerId] = useState<string | null>(null);
  const [selectedStickerBase64, setSelectedStickerBase64] = useState<string | null>(null);
  const [textFeedback, setTextFeedback] = useState('');
  const [textFontSize, setTextFontSize] = useState(30);
  const [textFontFamily, setTextFontFamily] = useState('Amiri');

  // Grades / Notes Form state
  const [imageGrade, setImageGrade] = useState('');
  const [audioGrade, setAudioGrade] = useState('');
  const [notes, setNotes] = useState('');
  const [showForms, setShowForms] = useState(true);
  const [showAudioForms, setShowAudioForms] = useState(true);
  const [showAudioInfo, setShowAudioInfo] = useState(false);
  const [showAudioFeedbackPanel, setShowAudioFeedbackPanel] = useState(false);

  // Custom Zoom Scale state
  const [scale, setScale] = useState(1);

  // Custom Uploads state
  const [showUploads, setShowUploads] = useState(false);
  const [additionalImage, setAdditionalImage] = useState<string | null>(null);
  const [additionalVideo, setAdditionalVideo] = useState<string | null>(null);
  const [additionalAudio, setAdditionalAudio] = useState<string | null>(null);

  // Original Media Modal
  const [showOriginalModal, setShowOriginalModal] = useState(false);
  const [originalMediaBase64, setOriginalMediaBase64] = useState<string | null>(null);
  const [loadingOriginal, setLoadingOriginal] = useState(false);

  // Dynamic Collapsible details
  const [showStudentDetails, setShowStudentDetails] = useState(false);

  // Media recording helper states
  const [recordingAudio, setRecordingAudio] = useState(false);
  const [recordingVideo, setRecordingVideo] = useState(false);
  const [mediaChunks, setMediaChunks] = useState<Blob[]>([]);
  const [audioRecorder, setAudioRecorder] = useState<MediaRecorder | null>(null);
  const [videoRecorder, setVideoRecorder] = useState<MediaRecorder | null>(null);
  const [videoStream, setVideoStream] = useState<MediaStream | null>(null);

  const videoPreviewRef = useRef<HTMLVideoElement | null>(null);

  // Student Audio Player states
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const [resolvedAudioSrc, setResolvedAudioSrc] = useState<string | null>(null);
  const [loadingAudio, setLoadingAudio] = useState(false);

  // Camera capture states for photo
  const [isPhotoCameraOpen, setIsPhotoCameraOpen] = useState(false);
  const photoCameraRef = useRef<HTMLVideoElement | null>(null);
  const [photoCameraStream, setPhotoCameraStream] = useState<MediaStream | null>(null);

  // Active sub-tab for response channels in audio-only correction page
  const [activeFeedbackTab, setActiveFeedbackTab] = useState<'audio' | 'video' | 'image'>('audio');

  // Collapsible mobile sidebar
  const [showMobileSidebar, setShowMobileSidebar] = useState(true);

  // Preset Colors
  const colors = [
    '#EF4444', // Crimson Red
    '#10B981', // Emerald Green
    '#3B82F6', // Cobalt Blue
    '#F59E0B', // Royal Amber
    '#000000', // Deep Black
    '#8B5CF6'  // Purple
  ];

  useEffect(() => {
    loadWorkspace();
  }, [submission]);

  const loadWorkspace = async () => {
    try {
      setLoading(true);
      setError(null);

      // Load static settings in parallel
      const [texts, stickers, headers] = await Promise.all([
        gasApi.getPredefinedTexts(),
        gasApi.getStickerUrls(),
        gasApi.getAdditionalHeaders()
      ]);

      setPredefinedTexts(texts);
      setStickersList(stickers);
      setAdditionalHeaders(headers);

      // Fetch base64 images for stickers to load them instantly on demand
      stickers.forEach(async (id) => {
        try {
          const b64 = await gasApi.getMediaAsBase64(id);
          setStickerImages((prev) => ({ ...prev, [id]: b64 }));
        } catch (e) {
          console.error('Failed to load sticker image ' + id, e);
        }
      });

      // Load student submission image or audio
      if (submission.isSaved) {
        // Load corrected draft
        const savedData = await gasApi.getSavedData(submission.row);
        setNotes(savedData.notes || '');
        setImageGrade(savedData.imageGrade || '');
        setAudioGrade(savedData.audioGrade || '');

        setAdditionalImage(savedData.additionalImage || null);
        setAdditionalVideo(savedData.video || null);
        setAdditionalAudio(savedData.audio || null);

        if (savedData.modifiedImage) {
          setStudentImageBase64(savedData.modifiedImage);
        } else {
          // Fallback if modified is missing
          await loadOriginalImage();
        }
      } else {
        // New correction
        if (submission.imageFileId) {
          await loadOriginalImage();
        } else {
          // For audio submissions without images, we use a beautiful default canvas
          setStudentImageBase64(null);
        }
      }

      // Load audio player if submission has audioFileId
      if (submission.audioFileId) {
        await loadAudioLesson();
      } else {
        setResolvedAudioSrc(null);
      }
    } catch (err: any) {
      setError(err.message || 'فشل تحميل بيانات بيئة التصحيح.');
    } finally {
      setLoading(false);
    }
  };

  const loadOriginalImage = async () => {
    if (submission.imageFileId) {
      const b64 = await gasApi.getMediaAsBase64(submission.imageFileId);
      setStudentImageBase64(b64);
    }
  };

  const loadAudioLesson = async () => {
    if (!submission.audioFileId) return;
    setLoadingAudio(true);
    setResolvedAudioSrc(null);
    setIsPlaying(false);
    try {
      const driveId = getGoogleDriveFileId(submission.audioFileId);
      if (driveId) {
        const b64 = await gasApi.getMediaAsBase64(driveId);
        if (b64) {
          const src = b64.startsWith('data:') ? b64 : `data:audio/mp3;base64,${b64}`;
          setResolvedAudioSrc(src);
        } else {
          // fallback to download stream proxy
          setResolvedAudioSrc(`https://docs.google.com/uc?export=download&id=${driveId}`);
        }
      } else {
        // Play directly if it's already a clean link
        setResolvedAudioSrc(submission.audioFileId);
      }
    } catch (e) {
      console.error('Failed to load audio file base64:', e);
      // Fallback
      const driveId = getGoogleDriveFileId(submission.audioFileId);
      if (driveId) {
        setResolvedAudioSrc(`https://docs.google.com/uc?export=download&id=${driveId}`);
      } else {
        setResolvedAudioSrc(submission.audioFileId);
      }
    } finally {
      setLoadingAudio(false);
    }
  };

  // Live audio recording helper using web browser native API
  const startAudioRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks: Blob[] = [];

      recorder.ondataavailable = (e) => chunks.push(e.data);
      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'audio/mp3' });
        const reader = new FileReader();
        reader.onload = (e: any) => {
          setAdditionalAudio(e.target.result);
        };
        reader.readAsDataURL(blob);
      };

      recorder.start();
      setAudioRecorder(recorder);
      setRecordingAudio(true);
    } catch (e) {
      alert('لا يمكن تفعيل الميكروفون. يرجى مراجعة الصلاحيات.');
    }
  };

  const stopAudioRecording = () => {
    if (audioRecorder && recordingAudio) {
      audioRecorder.stop();
      setRecordingAudio(false);
      audioRecorder.stream.getTracks().forEach((track) => track.stop());
    }
  };

  // Live camera recording helper using web browser native API
  const startVideoRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      setVideoStream(stream);
      if (videoPreviewRef.current) {
        videoPreviewRef.current.srcObject = stream;
      }

      const recorder = new MediaRecorder(stream);
      const chunks: Blob[] = [];

      recorder.ondataavailable = (e) => chunks.push(e.data);
      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'video/mp4' });
        const reader = new FileReader();
        reader.onload = (e: any) => {
          setAdditionalVideo(e.target.result);
        };
        reader.readAsDataURL(blob);
      };

      recorder.start();
      setVideoRecorder(recorder);
      setRecordingVideo(true);
    } catch (e) {
      alert('لا يمكن تفعيل الكاميرا المباشرة.');
    }
  };

  const stopVideoRecording = () => {
    if (videoRecorder && recordingVideo) {
      videoRecorder.stop();
      setRecordingVideo(false);
      if (videoStream) {
        videoStream.getTracks().forEach((track) => track.stop());
        setVideoStream(null);
      }
    }
  };

  // Open Original Media Modal (Student's original raw file)
  const handleOpenOriginalMedia = async () => {
    const fileId = submission.imageFileId || submission.audioFileId;
    if (!fileId) return;

    setShowOriginalModal(true);
    setLoadingOriginal(true);
    setOriginalMediaBase64(null);

    try {
      const b64 = await gasApi.getMediaAsBase64(fileId);
      setOriginalMediaBase64(b64);
    } catch (e) {
      alert('فشل سحب الملف الأصلي');
    } finally {
      setLoadingOriginal(false);
    }
  };

  // Saving All Media to database (Google Sheet + Drive Folder)
  const handleSaveCorrection = async () => {
    setSaving(true);

    try {
      let canvasBase64: string | null = null;
      if (submission.imageFileId && editorRef.current) {
        setSaveStep('جاري تصدير ومعالجة الرسم التوضيحي...');
        canvasBase64 = editorRef.current.exportCanvas();
      }

      setSaveStep('جاري رفع وتحديث بيانات الطالب والملفات على جوجل درايف وشيتس...');

      const cleanName = submission.studentName.replace(/[^a-zA-Z0-9\u0600-\u06FF]/g, '_');
      const canvasFilename = `صورة-معدلة-${cleanName}-${submission.studentId}-درس-${submission.lessonNumber}-إرسال-${submission.imageSubmissionCount || 1}.jpg`;
      const imageFilename = `صورة-إضافية-${cleanName}-${submission.studentId}-درس-${submission.lessonNumber}-إرسال-${submission.imageSubmissionCount || 1}.jpg`;
      const videoFilename = `فيديو-${cleanName}-${submission.studentId}-درس-${submission.lessonNumber}-إرسال-${submission.imageSubmissionCount || 1}.mp4`;
      const audioFilename = `صوت-${cleanName}-${submission.studentId}-درس-${submission.lessonNumber}-إرسال-${submission.audioSubmissionCount || 1}.mp3`;

      await gasApi.saveAllMedia({
        canvasBase64,
        canvasFilename,
        imageBase64: additionalImage,
        imageFilename,
        videoBase64: additionalVideo,
        videoFilename,
        audioBase64: additionalAudio,
        audioFilename,
        row: submission.row,
        notes,
        imageGrade,
        audioGrade
      });

      setSaveStep('تم الحفظ بنجاح! جاري العودة للرئيسية...');
      setTimeout(() => {
        onBack();
      }, 1000);
    } catch (err: any) {
      alert('حدث خطأ أثناء الحفظ: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  // Handle local file uploads
  const handleLocalImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event: any) => {
      setAdditionalImage(event.target.result);
    };
    reader.readAsDataURL(file);
  };

  const handleLocalVideoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event: any) => {
      setAdditionalVideo(event.target.result);
    };
    reader.readAsDataURL(file);
  };

  const handleLocalAudioUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event: any) => {
      setAdditionalAudio(event.target.result);
    };
    reader.readAsDataURL(file);
  };

  const startPhotoCamera = async () => {
    try {
      setIsPhotoCameraOpen(true);
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      setPhotoCameraStream(stream);
      if (photoCameraRef.current) {
        photoCameraRef.current.srcObject = stream;
      }
    } catch (e) {
      alert('تعذر فتح الكاميرا للتصوير. يرجى مراجعة الصلاحيات.');
    }
  };

  const stopPhotoCamera = () => {
    if (photoCameraStream) {
      photoCameraStream.getTracks().forEach((track) => track.stop());
      setPhotoCameraStream(null);
    }
    setIsPhotoCameraOpen(false);
  };

  const capturePhoto = () => {
    if (photoCameraStream && photoCameraRef.current) {
      const video = photoCameraRef.current;
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const b64 = canvas.toDataURL('image/jpeg', 0.85);
        setAdditionalImage(b64);
        stopPhotoCamera();
      }
    }
  };

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play().catch((e) => console.log('Playback error:', e));
      setIsPlaying(true);
    }
  };

  const handleScrub = (value: number) => {
    if (!audioRef.current) return;
    audioRef.current.currentTime = value;
    setCurrentTime(value);
  };

  const handleSpeedChange = () => {
    if (!audioRef.current) return;
    const rates = [1, 1.25, 1.5, 2, 0.75];
    const currentIndex = rates.indexOf(playbackRate);
    const nextIndex = (currentIndex + 1) % rates.length;
    const nextRate = rates[nextIndex];
    audioRef.current.playbackRate = nextRate;
    setPlaybackRate(nextRate);
  };

  const toggleMute = () => {
    if (!audioRef.current) return;
    audioRef.current.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  const handleVolumeChange = (vol: number) => {
    if (!audioRef.current) return;
    audioRef.current.volume = vol;
    setVolume(vol);
    if (vol > 0 && isMuted) {
      audioRef.current.muted = false;
      setIsMuted(false);
    }
  };

  const selectSticker = (id: string) => {
    const b64 = stickerImages[id];
    if (b64) {
      setSelectedStickerId(id);
      setSelectedStickerBase64(b64);
      setMode('sticker');
    }
  };

  const selectPredefinedText = (phrase: string) => {
    setTextFeedback(phrase);
    setMode('text');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex flex-col justify-center items-center gap-4 font-sans" dir="rtl">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-slate-700 border-t-emerald-500" />
        <p className="text-sm font-semibold text-slate-300">جاري تحميل أوراق الواجب وتجهيز السبورة الذكية...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex flex-col justify-center items-center px-4 font-sans" dir="rtl">
        <div className="h-16 w-16 bg-rose-500/10 border border-rose-500/30 text-rose-500 rounded-2xl flex items-center justify-center mb-4">
          <AlertCircle className="h-8 w-8" />
        </div>
        <h3 className="text-lg font-bold">فشل تشغيل بيئة التصحيح</h3>
        <p className="text-xs text-slate-400 mt-2 max-w-sm text-center leading-relaxed">{error}</p>
        <button
          onClick={onBack}
          className="mt-6 flex items-center gap-2 py-2 px-4 bg-slate-800 hover:bg-slate-700 rounded-xl text-xs font-semibold"
        >
          <ArrowLeft className="h-4 w-4" /> العودة للرئيسية
        </button>
      </div>
    );
  }

  return (
    <div className="h-screen bg-slate-950 text-slate-100 flex flex-col overflow-hidden font-sans select-none" dir="rtl">
      {/* Save Modal Progress */}
      <AnimatePresence>
        {saving && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4"
          >
            <div className="bg-slate-900 border border-slate-800 p-8 rounded-3xl max-w-md w-full text-center space-y-6 shadow-2xl">
              <div className="relative mx-auto h-16 w-16 flex items-center justify-center">
                <div className="absolute inset-0 rounded-full border-4 border-emerald-500/20 border-t-emerald-500 animate-spin" />
                <Award className="h-7 w-7 text-emerald-500" />
              </div>
              <div>
                <h4 className="text-lg font-bold text-white">جاري الحفظ والتدقيق</h4>
                <p className="text-xs text-slate-400 mt-2 leading-relaxed">{saveStep}</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Primary Workspace Header */}
      <header className="bg-slate-900 border-b border-slate-800 px-6 py-4 flex flex-col sm:flex-row justify-between items-center gap-4 z-20 shadow-lg">
        <div className="flex items-center gap-4 w-full sm:w-auto">
          <button
            onClick={onBack}
            className="p-3 bg-slate-800 hover:bg-slate-700 rounded-xl transition-all focus:outline-none"
            title="رجوع"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <span className="text-[10px] uppercase font-bold text-emerald-400 block tracking-wider">
              {submission.isSaved ? 'تعديل تقييم محفوظ' : 'جلسة تصحيح واجب جديدة'}
            </span>
            <h1 className="text-base font-bold text-white leading-tight">
              الطالب: {submission.studentName} • درس {submission.lessonNumber}
            </h1>
          </div>
        </div>

        {/* Toolbar categories toggle */}
        {submission.imageFileId && (
          <div className="flex items-center gap-2 bg-slate-950/60 p-1 rounded-2xl border border-slate-800/80">
            <button
              onClick={() => {
                setToolGroup('draw');
                setMode('draw');
                setShowMobileSidebar(true);
              }}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                toolGroup === 'draw' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <PenTool className="h-3.5 w-3.5 inline-block ml-1.5" /> الرسم والكتابة
            </button>
            <button
              onClick={() => {
                setToolGroup('textSticker');
                setMode('sticker');
                setShowMobileSidebar(true);
              }}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                toolGroup === 'textSticker' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Award className="h-3.5 w-3.5 inline-block ml-1.5" /> الأختام والملاحظات
            </button>
            <button
              onClick={() => {
                setToolGroup('other');
                setShowMobileSidebar(true);
              }}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                toolGroup === 'other' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Grid className="h-3.5 w-3.5 inline-block ml-1.5" /> أدوات التدوير والمحو
            </button>
          </div>
        )}

        {/* Floating actions */}
        <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
          <button
            onClick={() => setShowStudentDetails(!showStudentDetails)}
            className="py-2.5 px-4 bg-slate-800 hover:bg-slate-700 rounded-xl text-xs font-semibold flex items-center gap-2"
          >
            <FileText className="h-4 w-4" /> بيانات الطالب التفصيلية
          </button>
          {!submission.imageFileId && (
            <>
              <button
                id="btn-toggle-audio-info-header"
                onClick={() => {
                  setShowAudioInfo(!showAudioInfo);
                  if (!showAudioInfo) {
                    setShowAudioForms(false);
                    setShowAudioFeedbackPanel(false);
                  }
                }}
                className={`py-2.5 px-4 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
                  showAudioInfo ? 'bg-emerald-600 text-white shadow-md' : 'bg-slate-850 hover:bg-slate-800 text-slate-300'
                }`}
              >
                <FileText className="h-4 w-4" />
                <span>معلومات</span>
              </button>
              <button
                id="btn-toggle-audio-forms-header"
                onClick={() => {
                  setShowAudioForms(!showAudioForms);
                  if (!showAudioForms) {
                    setShowAudioInfo(false);
                    setShowAudioFeedbackPanel(false);
                  }
                }}
                className={`py-2.5 px-4 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
                  showAudioForms ? 'bg-emerald-600 text-white shadow-md' : 'bg-slate-850 hover:bg-slate-800 text-slate-300'
                }`}
              >
                <Award className="h-4 w-4" />
                <span>تقييم</span>
              </button>
            </>
          )}
          <button
            onClick={handleSaveCorrection}
            className="py-2.5 px-5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs shadow-md shadow-emerald-900/20"
          >
            حفظ التصحيح النهائي
          </button>
        </div>
      </header>

      {/* Student details dynamic modal drawer */}
      <AnimatePresence>
        {showStudentDetails && (
          <motion.div
            initial={{ opacity: 0, x: 200 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 200 }}
            className="fixed top-24 left-4 bottom-24 w-80 bg-slate-900 border border-slate-800 rounded-3xl p-6 z-35 shadow-2xl overflow-y-auto space-y-6"
          >
            <div className="flex justify-between items-center pb-3 border-b border-slate-800">
              <h3 className="font-bold text-white text-sm">بيانات الطالب</h3>
              <button onClick={() => setShowStudentDetails(false)} className="text-slate-400 hover:text-white">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-2 bg-slate-950 p-3 rounded-xl border border-slate-800/50">
                <span className="text-slate-400">رقم الطالب</span>
                <span className="font-mono text-left text-slate-200">{submission.studentId}</span>
                <span className="text-slate-400">الاسم</span>
                <span className="text-slate-200 font-semibold">{submission.studentName}</span>
                <span className="text-slate-400">الدرس الوارد</span>
                <span className="text-slate-200">درس {submission.lessonNumber}</span>
                <span className="text-slate-400">عدد المحاولات</span>
                <span className="text-slate-200">
                  {submission.imageFileId ? submission.imageSubmissionCount : submission.audioSubmissionCount} مرات إرسال
                </span>
              </div>

              {/* Dynamic Headers mapping columns T:Y */}
              {additionalHeaders.length > 0 && (
                <div className="space-y-3">
                  <h4 className="font-bold text-slate-300 border-b border-slate-800 pb-1 text-[11px]">معلومات الشيت الإضافية</h4>
                  <div className="space-y-2 bg-slate-950/60 p-3 rounded-xl border border-slate-800/30">
                    {[
                      submission.additionalT,
                      submission.additionalU,
                      submission.additionalV,
                      submission.additionalW,
                      submission.additionalX,
                      submission.additionalY
                    ].map((val, idx) => {
                      const header = additionalHeaders[idx] || `حقل إضافي ${idx + 1}`;
                      if (!val) return null;
                      return (
                        <div key={'add-head-' + idx} className="grid grid-cols-2 py-1 border-b border-slate-800/40 last:border-0">
                          <span className="text-slate-500 font-medium">{header}</span>
                          <span className="text-slate-300 text-left font-semibold">{val}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main workspace arena */}
      <div className="flex-grow flex flex-col lg:flex-row overflow-hidden relative">
        {!submission.imageFileId ? (
          /* Show custom Audio Workspace for audio-only lessons */
          <div className="flex-grow overflow-y-auto p-4 sm:p-6 lg:p-8 bg-slate-950">
            <div className="max-w-3xl mx-auto space-y-6 pb-20">
              
              {/* A. Additional Google Sheet Columns Info (Placed above the player) */}
              <AnimatePresence>
                {showAudioInfo && additionalHeaders.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: -15 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -15 }}
                    className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-xl space-y-3"
                  >
                    <h4 className="font-bold text-slate-300 border-b border-slate-800 pb-1.5 text-xs flex items-center gap-1">
                      <FileText className="h-3.5 w-3.5 text-slate-400" /> معلومات إضافية من الشيت
                    </h4>
                    <div className="space-y-2 bg-slate-950/60 p-3 rounded-xl border border-slate-800/30 text-xs">
                      {[
                        submission.additionalT,
                        submission.additionalU,
                        submission.additionalV,
                        submission.additionalW,
                        submission.additionalX,
                        submission.additionalY
                      ].map((val, idx) => {
                        const header = additionalHeaders[idx] || `حقل إضافي ${idx + 1}`;
                        if (!val) return null;
                        return (
                          <div key={'add-col-audio-tab-' + idx} className="grid grid-cols-2 py-1.5 border-b border-slate-800/30 last:border-0">
                            <span className="text-slate-500">{header}:</span>
                            <span className="text-slate-200 text-left font-semibold">{val}</span>
                          </div>
                        );
                      })}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* B. Grades & Comments (رصد تقييم ودرجات التلاوة) (Placed above the player) */}
              <AnimatePresence>
                {showAudioForms && (
                  <motion.div
                    initial={{ opacity: 0, y: -15 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -15 }}
                    className="bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl space-y-5"
                  >
                    <h3 className="text-sm font-bold text-white flex items-center gap-1.5 pb-2 border-b border-slate-800">
                      <Award className="h-4 w-4 text-emerald-400" /> رصد تقييم ودرجة التلاوة
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                      {/* Audio Grade Input */}
                      <div className="md:col-span-4 space-y-1.5">
                        <label htmlFor="audioGradeInputTab" className="text-xs font-bold text-slate-400 block">درجة التلاوة / التسميع</label>
                        <input
                          type="text"
                          id="audioGradeInputTab"
                          placeholder="درجة تلاوة الصوت"
                          value={audioGrade}
                          onChange={(e) => setAudioGrade(e.target.value)}
                          className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs font-bold text-emerald-400 placeholder:font-normal placeholder:text-slate-600 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20"
                        />
                      </div>

                      {/* Teacher Comments */}
                      <div className="md:col-span-8 space-y-1.5">
                        <label htmlFor="notesInputTab" className="text-xs font-bold text-slate-400 block">توصيات وملاحظات المعلم المصحح</label>
                        <textarea
                          id="notesInputTab"
                          rows={4}
                          placeholder="أدخل التوصيات اللفظية والنصائح لمصحف الطالب..."
                          value={notes}
                          onChange={(e) => setNotes(e.target.value)}
                          className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs leading-relaxed text-slate-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20"
                        />
                      </div>
                    </div>

                    {/* Quick Emoji Bar */}
                    <div className="space-y-1.5 pt-2">
                      <span className="text-[10px] text-slate-500 block">أضف رمز تعبيري تفاعلي سريع:</span>
                      <div className="flex flex-wrap gap-2 p-2 bg-slate-950 rounded-xl border border-slate-850">
                        {['⭐', '🌟', '👏', '🎯', '🏆', '💖', '🌹', '✏️', '👌', '👍', '💡', '🕌', '📖', '🤲'].map((emoji) => (
                          <button
                            key={'emoji-audio-' + emoji}
                            onClick={() => setNotes((prev) => prev + emoji)}
                            className="h-8 w-8 bg-slate-900 hover:bg-slate-850 rounded-lg text-lg flex items-center justify-center transition-all hover:scale-110 active:scale-95"
                          >
                            {emoji}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Compact Dropdown Select for Predefined Texts */}
                    {predefinedTexts.length > 0 && (
                      <div className="space-y-1.5 pt-2 border-t border-slate-800">
                        <label htmlFor="audio-predefined-select" className="text-[11px] font-bold text-slate-400 flex items-center gap-1">
                          <Smile className="h-3.5 w-3.5 text-emerald-400" /> اختر عبارة نموذجية جاهزة للإدراج:
                        </label>
                        <select
                          id="audio-predefined-select"
                          onChange={(e) => {
                            const val = e.target.value;
                            if (val) {
                              setNotes((prev) => prev + (prev ? ' \n' : '') + val);
                              e.target.value = ''; // reset selection
                            }
                          }}
                          className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-300 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20"
                        >
                          <option value="">-- اختر عبارة نموذجية جاهزة للإدراج مباشرة --</option>
                          {predefinedTexts.map((item, idx) => (
                            <option key={'audio-pref-select-' + idx} value={item.phrase}>
                              {item.title} ({item.phrase.substring(0, 40)}...)
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* C. Response Channels / Uploads feedback panel (Placed above the player) */}
              <AnimatePresence>
                {showAudioFeedbackPanel && (
                  <motion.div
                    initial={{ opacity: 0, y: -15 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -15 }}
                    className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden"
                  >
                    <div className="bg-slate-950 p-3 flex border-b border-slate-800">
                      <button
                        onClick={() => setActiveFeedbackTab('audio')}
                        className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                          activeFeedbackTab === 'audio' ? 'bg-emerald-600/10 border border-emerald-500/20 text-emerald-400' : 'text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        <Mic className="h-4 w-4" /> رد وتصحيح صوتي
                      </button>
                      <button
                        onClick={() => setActiveFeedbackTab('video')}
                        className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                          activeFeedbackTab === 'video' ? 'bg-emerald-600/10 border border-emerald-500/20 text-emerald-400' : 'text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        <FileVideo className="h-4 w-4" /> تسجيل توضيح مرئي
                      </button>
                      <button
                        onClick={() => setActiveFeedbackTab('image')}
                        className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                          activeFeedbackTab === 'image' ? 'bg-emerald-600/10 border border-emerald-500/20 text-emerald-400' : 'text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        <Camera className="h-4 w-4" /> التقاط صورة كروكي
                      </button>
                    </div>

                    <div className="p-6">
                      {/* Audio Recorder console */}
                      {activeFeedbackTab === 'audio' && (
                        <div className="space-y-4">
                          <div className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-center">
                            <div className="flex-1 flex gap-2">
                              {!recordingAudio ? (
                                <button
                                  onClick={startAudioRecording}
                                  className="flex-grow py-3 px-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-lg shadow-emerald-900/10 active:scale-95 transition-transform"
                                >
                                  <Mic className="h-4 w-4 animate-pulse" /> بدء تسجيل صوت المعجم المباشر
                                </button>
                              ) : (
                                <button
                                  onClick={stopAudioRecording}
                                  className="flex-grow py-3 px-4 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-lg shadow-rose-900/10 active:scale-95 transition-transform"
                                >
                                  <Volume2 className="h-4 w-4 animate-bounce" /> إيقاف التسجيل الصوتي
                                </button>
                              )}

                              <input
                                type="file"
                                accept="audio/*"
                                onChange={handleLocalAudioUpload}
                                className="hidden"
                                id="audio-uploader-direct"
                              />
                              <label
                                htmlFor="audio-uploader-direct"
                                className="p-3 bg-slate-950 hover:bg-slate-850 border border-slate-800 rounded-xl cursor-pointer flex items-center justify-center text-slate-400 hover:text-white"
                                title="رفع ملف صوت مسبق التسجيل"
                              >
                                <Paperclip className="h-4 w-4" />
                              </label>
                            </div>
                          </div>

                          {additionalAudio && (
                            <div className="bg-slate-950 p-4 rounded-xl border border-slate-850 flex flex-col sm:flex-row items-center justify-between gap-4">
                              <div className="flex items-center gap-2">
                                <CheckCircle className="h-5 w-5 text-emerald-400 shrink-0" />
                                <div className="text-[11px]">
                                  <span className="font-bold text-slate-300 block">تم تجهيز ملف الرد الصوتي</span>
                                  <span className="text-slate-500 text-[9px]">سيتم رفعه وتحديثه تلقائياً عند الحفظ النهائي</span>
                                </div>
                              </div>
                              <div className="flex items-center gap-3 w-full sm:w-auto">
                                <audio src={additionalAudio} controls className="h-8 w-full sm:w-48" />
                                <button
                                  onClick={() => setAdditionalAudio(null)}
                                  className="p-2 bg-slate-900 hover:bg-slate-850 text-rose-500 hover:text-rose-400 rounded-lg text-xs font-bold"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Video Recorder console */}
                      {activeFeedbackTab === 'video' && (
                        <div className="space-y-4">
                          <div className="flex flex-col gap-4">
                            <div className="flex gap-2">
                              {!recordingVideo ? (
                                <button
                                  onClick={startVideoRecording}
                                  className="flex-1 py-3 px-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-lg shadow-emerald-900/10 transition-colors"
                                >
                                  <Camera className="h-4 w-4" /> بدء الكاميرا وتسجيل توضيح مرئي مباشر
                                </button>
                              ) : (
                                <button
                                  onClick={stopVideoRecording}
                                  className="flex-1 py-3 px-4 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-lg shadow-rose-900/10 transition-colors"
                                >
                                  <X className="h-4 w-4" /> إيقاف وحفظ مقطع الفيديو التوضيحي
                                </button>
                              )}

                              <input
                                type="file"
                                accept="video/*"
                                onChange={handleLocalVideoUpload}
                                className="hidden"
                                id="video-uploader-direct"
                              />
                              <label
                                htmlFor="video-uploader-direct"
                                className="p-3 bg-slate-950 hover:bg-slate-850 border border-slate-800 rounded-xl cursor-pointer flex items-center justify-center text-slate-400 hover:text-white"
                                title="رفع ملف فيديو توضيحي"
                              >
                                <Paperclip className="h-4 w-4" />
                              </label>
                            </div>

                            {recordingVideo && (
                              <div className="bg-slate-950 p-2 rounded-2xl border border-slate-850 overflow-hidden aspect-video max-w-sm mx-auto relative">
                                <video
                                  ref={videoPreviewRef}
                                  autoPlay
                                  playsInline
                                  muted
                                  className="w-full rounded-xl object-cover"
                                />
                              </div>
                            )}

                            {additionalVideo && (
                              <div className="bg-slate-950 p-4 rounded-xl border border-slate-850 flex flex-col sm:flex-row items-center justify-between gap-4">
                                <div className="flex items-center gap-2">
                                  <CheckCircle className="h-5 w-5 text-emerald-400 shrink-0" />
                                  <div className="text-[11px]">
                                    <span className="font-bold text-slate-300 block">تم تسجيل/رفع مقطع الفيديو</span>
                                    <span className="text-slate-500 text-[9px]">سيتم رفعه وتحديثه تلقائياً عند الحفظ النهائي</span>
                                  </div>
                                </div>
                                <div className="flex items-center gap-3">
                                  <video src={additionalVideo} controls className="h-12 w-24 rounded" />
                                  <button
                                    onClick={() => setAdditionalVideo(null)}
                                    className="p-2 bg-slate-900 hover:bg-slate-850 text-rose-500 hover:text-rose-400 rounded-lg text-xs font-bold"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Image Camera Sketch console */}
                      {activeFeedbackTab === 'image' && (
                        <div className="space-y-4">
                          <div className="flex gap-2">
                            {!isPhotoCameraOpen ? (
                              <button
                                onClick={startPhotoCamera}
                                className="flex-grow py-3 px-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-lg transition-colors"
                              >
                                <Camera className="h-4 w-4" /> تشغيل الكاميرا لالتقاط كروكي فوري
                              </button>
                            ) : (
                              <div className="flex-grow flex gap-2">
                                <button
                                  onClick={capturePhoto}
                                  className="flex-grow py-3 px-4 bg-teal-600 hover:bg-teal-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-lg"
                                >
                                  <Check className="h-4 w-4" /> التقاط الصورة وتثبيتها
                                </button>
                                <button
                                  onClick={stopPhotoCamera}
                                  className="py-3 px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold"
                                >
                                  إلغاء
                                </button>
                              </div>
                            )}

                            <input
                              type="file"
                              accept="image/*"
                              onChange={handleLocalImageUpload}
                              className="hidden"
                              id="image-uploader-direct"
                            />
                            <label
                              htmlFor="image-uploader-direct"
                              className="p-3 bg-slate-950 hover:bg-slate-850 border border-slate-800 rounded-xl cursor-pointer flex items-center justify-center text-slate-400 hover:text-white"
                              title="رفع كروكي حل مجهز مسبقاً"
                            >
                              <Paperclip className="h-4 w-4" />
                            </label>
                          </div>

                          {isPhotoCameraOpen && (
                            <div className="bg-slate-950 p-2 rounded-2xl border border-slate-850 overflow-hidden max-w-sm mx-auto relative">
                              <video
                                ref={photoCameraRef}
                                autoPlay
                                playsInline
                                className="w-full rounded-xl object-cover"
                              />
                            </div>
                          )}

                          {additionalImage && (
                            <div className="bg-slate-950 p-4 rounded-xl border border-slate-850 flex flex-col sm:flex-row items-center justify-between gap-4">
                              <div className="flex items-center gap-2">
                                <div className="h-12 w-12 rounded-lg border border-slate-800 overflow-hidden shrink-0">
                                  <img src={additionalImage} className="h-full w-full object-cover" />
                                </div>
                                <div className="text-[11px]">
                                  <span className="font-bold text-slate-300 block">تم التقاط/رفع الصورة الكروكية</span>
                                  <span className="text-slate-500 text-[9px]">سيتم رفعه وتحديثه تلقائياً عند الحفظ النهائي</span>
                                </div>
                              </div>
                              <button
                                onClick={() => setAdditionalImage(null)}
                                className="py-2 px-3 bg-slate-900 hover:bg-slate-850 text-rose-500 hover:text-rose-400 rounded-lg text-xs font-bold"
                              >
                                حذف الصورة
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* D. Custom Audio Player Card (Main view) */}
              <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl space-y-6 relative overflow-hidden">
                <div className="absolute top-0 right-0 h-1 w-full bg-gradient-to-l from-emerald-500 via-teal-500 to-emerald-600" />
                
                <div className="flex justify-between items-center">
                  <span className="text-[11px] font-bold text-emerald-400 flex items-center gap-1">
                    <Sparkles className="h-3.5 w-3.5" /> مشغل تلاوة الطالب
                  </span>
                  <button
                    id="btn-reload-audio-v2"
                    onClick={loadAudioLesson}
                    className="p-1.5 bg-slate-950/80 hover:bg-slate-800 text-[10px] text-slate-400 rounded-lg flex items-center gap-1 border border-slate-800/80"
                    title="إعادة تحميل الصوت"
                  >
                    <RotateCw className="h-3 w-3" /> إعادة تحميل
                  </button>
                </div>

                {loadingAudio ? (
                  <div className="py-12 flex flex-col justify-center items-center gap-3">
                    <div className="animate-spin rounded-full h-8 w-8 border-4 border-slate-800 border-t-emerald-500" />
                    <p className="text-xs text-slate-400">جاري جلب الملف الصوتي من درايف...</p>
                  </div>
                ) : resolvedAudioSrc ? (
                  <div className="space-y-6">
                    {/* Audio wave glow animation */}
                    <div className="bg-slate-950 rounded-xl p-4 border border-slate-850 flex flex-col items-center justify-center min-h-[5rem]">
                      {isPlaying ? (
                        <div className="flex items-end gap-1.5 h-10 py-2">
                          <div className="w-1 bg-emerald-400 rounded-full animate-bounce h-full" style={{ animationDelay: '0.1s', animationDuration: '0.8s' }} />
                          <div className="w-1 bg-teal-400 rounded-full animate-bounce h-3/4" style={{ animationDelay: '0.3s', animationDuration: '0.6s' }} />
                          <div className="w-1 bg-emerald-500 rounded-full animate-bounce h-1/2" style={{ animationDelay: '0.5s', animationDuration: '0.9s' }} />
                          <div className="w-1 bg-teal-500 rounded-full animate-bounce h-5/6" style={{ animationDelay: '0.2s', animationDuration: '0.7s' }} />
                          <div className="w-1 bg-emerald-400 rounded-full animate-bounce h-1/3" style={{ animationDelay: '0.4s', animationDuration: '0.5s' }} />
                          <div className="w-1 bg-teal-400 rounded-full animate-bounce h-2/3" style={{ animationDelay: '0.15s', animationDuration: '0.75s' }} />
                        </div>
                      ) : (
                        <div className="flex items-end gap-1.5 h-10 py-2 opacity-30">
                          {[1, 2, 3, 4, 5, 6].map((i) => (
                            <div key={i} className="w-1 bg-slate-400 rounded-full h-2" />
                          ))}
                        </div>
                      )}
                      <span className="text-[10px] text-slate-500 mt-2 font-mono">
                        {formatTime(currentTime)} / {formatTime(duration)}
                      </span>
                    </div>

                    {/* HTML Audio element */}
                    <audio
                      ref={audioRef}
                      src={resolvedAudioSrc}
                      onTimeUpdate={() => setCurrentTime(audioRef.current?.currentTime || 0)}
                      onLoadedMetadata={() => setDuration(audioRef.current?.duration || 0)}
                      onEnded={() => setIsPlaying(false)}
                      className="hidden"
                    />

                    {/* Scrub progress bar */}
                    <div className="space-y-1">
                      <input
                        type="range"
                        min="0"
                        max={duration || 100}
                        value={currentTime}
                        onChange={(e) => handleScrub(Number(e.target.value))}
                        className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                      />
                    </div>

                    {/* Controls toolbar */}
                    <div className="flex items-center justify-between bg-slate-950 p-2.5 rounded-xl border border-slate-850">
                      {/* Play / Pause */}
                      <button
                        onClick={togglePlay}
                        className="h-10 w-10 bg-emerald-600 hover:bg-emerald-500 rounded-full flex items-center justify-center text-white shadow-lg transition-transform active:scale-95"
                      >
                        {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 fill-current ml-0.5" />}
                      </button>

                      {/* Playback rate speed */}
                      <button
                        onClick={handleSpeedChange}
                        className="px-2.5 py-1.5 bg-slate-900 hover:bg-slate-850 text-[10px] font-bold text-slate-300 rounded-lg border border-slate-800 transition-colors"
                      >
                        {playbackRate}x السرعة
                      </button>

                      {/* Mute and volume */}
                      <div className="flex items-center gap-2">
                        <button
                          onClick={toggleMute}
                          className="p-1.5 text-slate-400 hover:text-slate-200"
                        >
                          {isMuted || volume === 0 ? <VolumeX className="h-4 w-4 text-rose-500" /> : <Volume2 className="h-4 w-4 text-emerald-400" />}
                        </button>
                        <input
                          type="range"
                          min="0"
                          max="1"
                          step="0.1"
                          value={isMuted ? 0 : volume}
                          onChange={(e) => handleVolumeChange(Number(e.target.value))}
                          className="w-16 h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                        />
                      </div>
                    </div>

                    {/* Open Link Backup */}
                    <div className="text-center pt-2">
                      <a
                        href={submission.audioFileId}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[10px] text-slate-500 hover:text-emerald-400 flex items-center justify-center gap-1 transition-colors"
                      >
                        <Paperclip className="h-3 w-3" /> فتح الملف مباشرة في لسان جديد (درايف)
                      </a>
                    </div>
                  </div>
                ) : (
                  <div className="py-12 text-center text-xs text-slate-500 space-y-2">
                    <AlertCircle className="h-8 w-8 text-rose-500 mx-auto" />
                    <p>لم يتم العثور على رابط صالح لملف الصوت أو تعذر الاتصال بجوجل درايف.</p>
                    <button
                      onClick={loadAudioLesson}
                      className="py-1.5 px-3 bg-slate-950 border border-slate-800 text-[10px] font-semibold rounded-lg hover:bg-slate-850"
                    >
                      إعادة محاولة الاتصال والتحميل
                    </button>
                  </div>
                )}
              </div>

              {/* E. Audio Page Action Strip (Two Buttons Row) */}
              <div className="flex flex-wrap items-center gap-3 bg-slate-900 border border-slate-800 p-3 rounded-2xl shadow-lg">
                {/* C. رفع ملف Toggle button */}
                <button
                  id="btn-audio-toggle-feedback"
                  onClick={() => {
                    setShowAudioFeedbackPanel(!showAudioFeedbackPanel);
                    if (!showAudioFeedbackPanel) {
                      setShowAudioInfo(false);
                      setShowAudioForms(false);
                    }
                  }}
                  className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                    showAudioFeedbackPanel ? 'bg-sky-600 text-white shadow-md' : 'bg-slate-950 text-slate-300 hover:bg-slate-850'
                  }`}
                >
                  <UploadCloud className="h-4 w-4" />
                  <span>رفع ملف رد (صوت/فيديو/كروكي)</span>
                </button>

                {/* D. حفظ button */}
                <button
                  id="btn-audio-save-direct"
                  onClick={handleSaveCorrection}
                  disabled={saving}
                  className="flex-grow sm:flex-1 py-2.5 px-5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-md active:scale-95 transition-transform disabled:opacity-50"
                >
                  <Check className="h-4 w-4" />
                  <span>حفظ التقييم</span>
                </button>
              </div>
            </div>
          </div>

        ) : (
          /* Show current Canvas Editor design for image lessons */
          <>
            {/* Toolbox Options Panel (Floating Card on Top of Whiteboard) */}
            <div className={`fixed lg:absolute top-20 lg:top-4 left-4 lg:left-8 z-40 w-[calc(100%-2rem)] sm:w-80 max-h-[calc(100%-8rem)] lg:max-h-[calc(100%-4rem)] bg-slate-900/95 backdrop-blur-md border border-slate-800 flex flex-col overflow-y-auto p-5 space-y-6 rounded-2xl shadow-2xl transition-all duration-300 ${
              showMobileSidebar ? 'translate-x-0 opacity-100 scale-100 pointer-events-auto' : '-translate-x-10 opacity-0 scale-95 pointer-events-none'
            }`}>
              {/* Close Button */}
              <div className="flex justify-between items-center pb-2 border-b border-slate-800">
                <h3 className="text-xs font-bold text-emerald-400">خيارات وأدوات التصحيح</h3>
                <button
                  onClick={() => setShowMobileSidebar(false)}
                  className="p-1.5 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-300 hover:text-white transition-colors"
                  title="إغلاق اللوحة"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {toolGroup === 'draw' && (
                <div className="space-y-5">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">خيارات القلم الحر</h3>
                  {/* Chisel pen toggle */}
                  <div className="flex items-center justify-between bg-slate-950 p-3 rounded-xl border border-slate-800">
                    <div>
                      <span className="text-xs font-bold block">قلم عريض (خط عربي)</span>
                      <span className="text-[10px] text-slate-500 block">مناسب لكتابة الكاليجرافي والتصحيح</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={isChisel}
                      onChange={(e) => setIsChisel(e.target.checked)}
                      className="rounded text-emerald-500 focus:ring-emerald-500 h-4 w-4 bg-slate-800 border-slate-700"
                    />
                  </div>

                  {/* Angle selector for Calligraphy Pen */}
                  {isChisel && (
                    <div className="space-y-2 bg-slate-950 p-3 rounded-xl border border-slate-800">
                      <div className="flex justify-between text-xs font-medium">
                        <span className="text-slate-400">زاوية القلم العريض</span>
                        <span className="font-bold font-mono text-emerald-400">{nibAngle}°</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="180"
                        value={nibAngle}
                        onChange={(e) => setNibAngle(Number(e.target.value))}
                        className="w-full accent-emerald-500 bg-slate-800 h-1 rounded"
                      />
                    </div>
                  )}

                  {/* Brush width slider */}
                  <div className="space-y-2 bg-slate-950 p-3 rounded-xl border border-slate-800">
                    <div className="flex justify-between text-xs font-medium">
                      <span className="text-slate-400">سُمك الفرشاة (حجم الخط)</span>
                      <span className="font-bold font-mono text-emerald-400">{lineWidth}px</span>
                    </div>
                    <input
                      type="range"
                      min="4"
                      max="120"
                      value={lineWidth}
                      onChange={(e) => setLineWidth(Number(e.target.value))}
                      className="w-full accent-emerald-500 bg-slate-800 h-1 rounded"
                    />
                  </div>

                  {/* Color Pre-selections */}
                  <div className="space-y-2.5">
                    <span className="text-xs font-semibold text-slate-400 block">ألوان تصحيح الخط</span>
                    <div className="grid grid-cols-6 gap-2">
                      {colors.map((color) => (
                        <button
                          key={color}
                          onClick={() => setLineColor(color)}
                          style={{ backgroundColor: color }}
                          className={`h-8 rounded-lg shadow-inner flex items-center justify-center transition-all focus:outline-none ${
                            lineColor === color ? 'ring-2 ring-white scale-110' : 'opacity-75 hover:opacity-100'
                          }`}
                        >
                          {lineColor === color && <Check className="h-4 w-4 text-white drop-shadow-md" />}
                        </button>
                      ))}
                    </div>
                    {/* Native Custom color picker */}
                    <div className="flex items-center gap-3 bg-slate-950 p-2.5 rounded-xl border border-slate-800 mt-2">
                      <input
                        type="color"
                        value={lineColor}
                        onChange={(e) => setLineColor(e.target.value)}
                        className="h-8 w-12 bg-transparent cursor-pointer rounded border-0"
                      />
                      <span className="text-xs text-slate-400">اختر لوناً مخصصاً</span>
                    </div>
                  </div>
                </div>
              )}

              {toolGroup === 'textSticker' && (
                <div className="space-y-6">
                  {/* Mode toggle */}
                  <div className="flex items-center gap-2 bg-slate-950 p-1 rounded-xl border border-slate-800">
                    <button
                      onClick={() => setMode('sticker')}
                      className={`flex-1 py-1.5 text-xs font-bold rounded-lg ${
                        mode === 'sticker' ? 'bg-emerald-600 text-white' : 'text-slate-400'
                      }`}
                    >
                      أختام مصورة
                    </button>
                    <button
                      onClick={() => setMode('text')}
                      className={`flex-1 py-1.5 text-xs font-bold rounded-lg ${
                        mode === 'text' ? 'bg-emerald-600 text-white' : 'text-slate-400'
                      }`}
                    >
                      تعليقات نصية
                    </button>
                  </div>

                  {mode === 'sticker' ? (
                    <div className="space-y-4">
                      <div className="flex justify-between items-center text-xs font-medium">
                        <span className="text-slate-400">حجم الختم الرمزي</span>
                        <span className="font-bold font-mono text-emerald-400">{stickerSize}px</span>
                      </div>
                      <input
                        type="range"
                        min="40"
                        max="400"
                        value={stickerSize}
                        onChange={(e) => setStickerSize(Number(e.target.value))}
                        className="w-full accent-emerald-500 bg-slate-800 h-1 rounded"
                      />

                      {/* Stamp grid */}
                      <span className="text-xs font-semibold text-slate-400 block mt-4">الأختام المتاحة (Settings)</span>
                      {stickersList.length === 0 ? (
                        <div className="p-4 text-center bg-slate-950/60 rounded-xl border border-slate-800/40 text-xs text-slate-500">
                          لم يتم تعيين روابط ملصقات في شيت Settings!B3
                        </div>
                      ) : (
                        <div className="grid grid-cols-4 gap-2.5 bg-slate-950 p-3 rounded-xl border border-slate-800/50 max-h-[14rem] overflow-y-auto">
                          {stickersList.map((id) => {
                            const b64 = stickerImages[id];
                            return (
                              <button
                                key={id}
                                onClick={() => selectSticker(id)}
                                className={`p-1 bg-slate-900 rounded-lg hover:bg-slate-850 border transition-all ${
                                  selectedStickerId === id ? 'border-emerald-500 ring-1 ring-emerald-500/20' : 'border-transparent'
                                }`}
                              >
                                {b64 ? (
                                  <img src={b64} alt="ختم" className="h-10 w-10 mx-auto object-contain" referrerPolicy="no-referrer" />
                                ) : (
                                  <div className="h-10 w-10 flex items-center justify-center text-[10px] text-slate-600">تحميل</div>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">إضافة تعليق خطي سريع</h3>

                      <div className="space-y-1">
                        <label className="text-[10px] text-slate-500">حجم الخط</label>
                        <select
                          value={textFontSize}
                          onChange={(e) => setTextFontSize(Number(e.target.value))}
                          className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-lg text-xs"
                        >
                          <option value="20">20px</option>
                          <option value="30">30px</option>
                          <option value="40">40px</option>
                          <option value="50">50px</option>
                          <option value="80">80px</option>
                        </select>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] text-slate-500">الخط المستعمل</label>
                        <select
                          value={textFontFamily}
                          onChange={(e) => setTextFontFamily(e.target.value)}
                          className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-lg text-xs font-semibold"
                        >
                          <option value="Amiri">الأميري (عربي)</option>
                          <option value="Tajawal">التاجول (مصحح)</option>
                          <option value="Roboto">روبوتو (إنجليزي)</option>
                        </select>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[10px] text-slate-500 block">اختر عبارة جاهزة (Settings)</label>
                        <div className="space-y-2 max-h-[14rem] overflow-y-auto bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/40">
                          {predefinedTexts.map((item, idx) => (
                            <button
                              key={'pref-txt-' + idx}
                              onClick={() => selectPredefinedText(item.phrase)}
                              className="w-full text-right p-2 bg-slate-900 hover:bg-slate-850 hover:text-white rounded-lg border border-slate-800/50 text-xs transition-colors"
                            >
                              <span className="font-bold text-slate-300 block mb-0.5">{item.title}</span>
                              <span className="text-slate-500 text-[10px] block line-clamp-1">{item.phrase}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {toolGroup === 'other' && (
                <div className="space-y-4">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">إجراءات إضافية وتعديل</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => editorRef.current?.undo()}
                      className="p-3 bg-slate-950 hover:bg-slate-900 border border-slate-800 rounded-xl text-xs flex flex-col items-center gap-1 transition-all"
                    >
                      <Undo className="h-4 w-4 text-emerald-400" /> تراجع (خطوة)
                    </button>
                    <button
                      onClick={() => editorRef.current?.redo()}
                      className="p-3 bg-slate-950 hover:bg-slate-900 border border-slate-800 rounded-xl text-xs flex flex-col items-center gap-1 transition-all"
                    >
                      <Redo className="h-4 w-4 text-emerald-400" /> إعادة (تراجع)
                    </button>
                    <button
                      onClick={() => editorRef.current?.clearAll()}
                      className="p-3 bg-slate-950 hover:bg-slate-900 border border-slate-800 rounded-xl text-xs flex flex-col items-center gap-1 transition-all col-span-2"
                    >
                      <Eraser className="h-4 w-4 text-rose-400" /> مسح السبورة بالكامل
                    </button>
                    <button
                      onClick={() => editorRef.current?.rotate95()}
                      className="p-3 bg-slate-950 hover:bg-slate-900 border border-slate-800 rounded-xl text-xs flex flex-col items-center gap-1 transition-all col-span-2"
                    >
                      <RotateCw className="h-4 w-4 text-sky-400 animate-spin-slow" /> تدوير الصورة 90 درجة
                    </button>
                  </div>
                </div>
              )}

              {/* Quick link to original file helper */}
              <div className="pt-4 border-t border-slate-800">
                <button
                  onClick={handleOpenOriginalMedia}
                  className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-slate-950 hover:bg-slate-900 border border-slate-800 rounded-xl text-xs font-bold transition-all text-slate-300"
                >
                  <Play className="h-3.5 w-3.5" /> فتح واستعراض الملف الوارد الأصلي
                </button>
              </div>
            </div>

            {/* Central editor canvas */}
            <div className="flex-grow flex flex-col p-4 overflow-y-auto relative min-h-0">
              <div className="h-[520px] sm:h-[650px] lg:h-[72vh] flex flex-col shrink-0 min-h-[520px] sm:min-h-[650px] lg:min-h-[600px] relative w-full rounded-3xl overflow-hidden border border-slate-800 shadow-inner bg-slate-950">
                <CanvasEditor
                  imageBase64={studentImageBase64}
                  mode={mode}
                  lineWidth={lineWidth}
                  lineColor={lineColor}
                  isChisel={isChisel}
                  nibAngle={nibAngle}
                  selectedStickerBase64={selectedStickerBase64}
                  stickerSize={stickerSize}
                  textFeedback={textFeedback}
                  fontSize={textFontSize}
                  fontFamily={textFontFamily}
                  onSaveCanvas={() => {}}
                  editorRef={editorRef}
                  scale={scale}
                  setScale={setScale}
                />
              </div>

              {/* Custom 4-Button Action Strip under Whiteboard */}
              <div className="flex flex-wrap items-center gap-3 bg-slate-900 border border-slate-800 p-3 mt-4 rounded-2xl shadow-lg z-10">
                {/* Mobile Tools Toggle */}
                <button
                  id="btn-toggle-tools-mobile"
                  onClick={() => setShowMobileSidebar(!showMobileSidebar)}
                  className={`lg:hidden py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                    showMobileSidebar ? 'bg-emerald-600 text-white' : 'bg-slate-950 text-slate-400 hover:bg-slate-850'
                  }`}
                >
                  <PenTool className="h-4 w-4" />
                  <span>الأدوات</span>
                </button>

                {/* 1. Evaluation Toggle Button (تقييم) */}
                <button
                  id="btn-toggle-forms-v2"
                  onClick={() => {
                    setShowForms(!showForms);
                    if (!showForms) setShowUploads(false); // only one panel at a time
                  }}
                  className={`flex-1 py-2 px-3 sm:px-4 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                    showForms ? 'bg-emerald-600 text-white shadow-md' : 'bg-slate-950 text-slate-300 hover:bg-slate-850'
                  }`}
                >
                  <Award className="h-4 w-4 text-emerald-400" />
                  <span>تقييم</span>
                </button>

                {/* 2. Uploads/Stickers Toggle Button (إضافة) */}
                <button
                  id="btn-toggle-uploads-v2"
                  onClick={() => {
                    setShowUploads(!showUploads);
                    if (!showUploads) setShowForms(false); // only one panel at a time
                  }}
                  className={`flex-1 py-2 px-3 sm:px-4 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                    showUploads ? 'bg-sky-600 text-white shadow-md' : 'bg-slate-950 text-slate-300 hover:bg-slate-850'
                  }`}
                >
                  <UploadCloud className="h-4 w-4 text-sky-400" />
                  <span>إضافة</span>
                </button>

                {/* 3. Zoom / Scaling Controls */}
                <div className="flex items-center gap-2 bg-slate-950 py-1.5 px-3 rounded-xl border border-slate-800">
                  <button
                    id="btn-scale-decrease"
                    onClick={() => setScale(Math.max(0.4, scale - 0.2))}
                    className="p-1 hover:bg-white/10 rounded-lg text-slate-300 transition-all focus:outline-none"
                    title="تصغير"
                  >
                    <ZoomOut className="h-3.5 w-3.5" />
                  </button>
                  <span className="text-xs font-mono font-bold text-slate-200 min-w-[2.5rem] text-center">
                    {Math.round(scale * 100)}%
                  </span>
                  <button
                    id="btn-scale-increase"
                    onClick={() => setScale(Math.min(5, scale + 0.2))}
                    className="p-1 hover:bg-white/10 rounded-lg text-slate-300 transition-all focus:outline-none"
                    title="تكبير"
                  >
                    <ZoomIn className="h-3.5 w-3.5" />
                  </button>
                  <div className="h-4 w-px bg-slate-800" />
                  <button
                    id="btn-scale-reset"
                    onClick={() => editorRef.current?.resetView()}
                    className="p-1 hover:bg-white/10 rounded-lg text-slate-300 transition-all focus:outline-none"
                    title="إعادة ضبط"
                  >
                    <Maximize className="h-3.5 w-3.5" />
                  </button>
                </div>

                {/* 4. Save Button (حفظ) */}
                <button
                  id="btn-save-image-v2"
                  onClick={handleSaveCorrection}
                  disabled={saving}
                  className="flex-1 py-2 px-3 sm:px-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-md active:scale-95 transition-transform disabled:opacity-50"
                >
                  <Check className="h-4 w-4" />
                  <span>حفظ</span>
                </button>
              </div>

              {/* Collapsible Forms Drawer */}
              <AnimatePresence>
                {showForms && (
                  <motion.div
                    initial={{ opacity: 0, y: 50 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 50 }}
                    className="bg-slate-900/95 backdrop-blur border border-slate-800 p-5 rounded-2xl shadow-2xl mt-4 max-w-4xl mx-auto w-full z-15"
                  >
                    <div className="flex justify-between items-center pb-2 border-b border-slate-800/60 mb-4">
                      <h4 className="text-xs font-bold text-slate-300">نموذج تقييم ورصد درجات وملاحظات الواجب</h4>
                      <button onClick={() => setShowForms(false)} className="text-slate-500 hover:text-slate-300">
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                      {/* Image grades if image lesson */}
                      {submission.imageFileId && (
                        <div className="md:col-span-3 space-y-1">
                          <label htmlFor="imageGrade" className="text-[11px] font-bold text-slate-400 block">درجة الصورة</label>
                          <input
                            type="text"
                            id="imageGrade"
                            placeholder="درجة الخط / الصورة"
                            value={imageGrade}
                            onChange={(e) => setImageGrade(e.target.value)}
                            className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-lg text-xs"
                          />
                        </div>
                      )}

                      {/* Audio grades if audio lesson */}
                      {submission.audioFileId && (
                        <div className="md:col-span-3 space-y-1">
                          <label htmlFor="audioGrade" className="text-[11px] font-bold text-slate-400 block">درجة التلاوة / الصوت</label>
                          <input
                            type="text"
                            id="audioGrade"
                            placeholder="درجة تلاوة الصوت"
                            value={audioGrade}
                            onChange={(e) => setAudioGrade(e.target.value)}
                            className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-lg text-xs"
                          />
                        </div>
                      )}

                      {/* Comments */}
                      <div className="md:col-span-9 space-y-1">
                        <label htmlFor="notes" className="text-[11px] font-bold text-slate-400 block">توصيات وملاحظات المعلم المصحح</label>
                        <textarea
                          id="notes"
                          rows={2}
                          placeholder="أدخل التوصيات الخطية والملحوظات اللفظية للواجب هنا..."
                          value={notes}
                          onChange={(e) => setNotes(e.target.value)}
                          className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-lg text-xs leading-relaxed"
                        />
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Collapsible Uploads Drawer */}
              <AnimatePresence>
                {showUploads && (
                  <motion.div
                    initial={{ opacity: 0, y: 50 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 50 }}
                    className="bg-slate-900/95 backdrop-blur border border-slate-800 p-5 rounded-2xl shadow-2xl mt-4 max-w-4xl mx-auto w-full z-15 overflow-y-auto max-h-[14rem]"
                  >
                    <div className="flex justify-between items-center pb-2 border-b border-slate-800/60 mb-4">
                      <h4 className="text-xs font-bold text-slate-300">أدوات إضافية: تسجيل مقاطع ورفع ملفات مرفقة للتصحيح</h4>
                      <button onClick={() => setShowUploads(false)} className="text-slate-500 hover:text-slate-300">
                        <X className="h-4 w-4" />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      {/* Additional Image Upload */}
                      <div className="space-y-2 bg-slate-950 p-4 rounded-xl border border-slate-800/40">
                        <span className="text-[11px] font-bold text-slate-400 block">صورة إضافية للحل الصحيح</span>
                        <div className="flex flex-col gap-2">
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleLocalImageUpload}
                            className="hidden"
                            id="image-file-upload"
                          />
                          <label
                            htmlFor="image-file-upload"
                            className="py-2 px-3 bg-slate-900 hover:bg-slate-850 border border-slate-800 rounded-lg text-xs font-bold text-center cursor-pointer flex items-center justify-center gap-1.5 transition-colors"
                          >
                            <UploadCloud className="h-4 w-4" /> رفع صورة كروكي
                          </label>
                          {additionalImage && (
                            <div className="relative h-12 w-12 rounded border border-slate-800 overflow-hidden mx-auto">
                              <img src={additionalImage} className="h-full w-full object-cover" />
                              <button
                                onClick={() => setAdditionalImage(null)}
                                className="absolute inset-0 bg-black/60 opacity-0 hover:opacity-100 text-[10px] text-rose-400 transition-opacity font-bold"
                              >
                                حذف
                              </button>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Audio recorder / Upload */}
                      <div className="space-y-2 bg-slate-950 p-4 rounded-xl border border-slate-800/40">
                        <span className="text-[11px] font-bold text-slate-400 block">تسجيل رسالة صوتية للمعلم</span>
                        <div className="flex flex-col gap-2">
                          <div className="flex gap-2">
                            {!recordingAudio ? (
                              <button
                                onClick={startAudioRecording}
                                className="flex-1 py-2 px-3 bg-slate-900 hover:bg-slate-850 border border-slate-800 rounded-lg text-xs font-bold flex items-center justify-center gap-1"
                              >
                                <Mic className="h-4 w-4 text-emerald-400 animate-pulse" /> ابدأ التسجيل
                              </button>
                            ) : (
                              <button
                                onClick={stopAudioRecording}
                                className="flex-1 py-2 px-3 bg-rose-600 hover:bg-rose-700 rounded-lg text-xs font-bold flex items-center justify-center gap-1"
                              >
                                <Volume2 className="h-4 w-4 animate-bounce" /> إيقاف الميكروفون
                              </button>
                            )}
                            <input
                              type="file"
                              accept="audio/*"
                              onChange={handleLocalAudioUpload}
                              className="hidden"
                              id="audio-file-upload"
                            />
                            <label
                              htmlFor="audio-file-upload"
                              className="p-2 bg-slate-900 hover:bg-slate-850 border border-slate-800 rounded-lg cursor-pointer"
                            >
                              <Paperclip className="h-4 w-4 text-slate-400" />
                            </label>
                          </div>
                          {additionalAudio && (
                            <div className="flex items-center gap-2 bg-slate-900 p-2 rounded border border-slate-800">
                              <audio src={additionalAudio} controls className="h-6 w-full scale-90" />
                              <button
                                onClick={() => setAdditionalAudio(null)}
                                className="text-[10px] font-bold text-rose-500 hover:text-rose-400"
                              >
                                حذف
                              </button>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Video recorder / Upload */}
                      <div className="space-y-2 bg-slate-950 p-4 rounded-xl border border-slate-800/40">
                        <span className="text-[11px] font-bold text-slate-400 block">تسجيل مقطع توضيحي مرئي</span>
                        <div className="flex flex-col gap-2">
                          <div className="flex gap-2">
                            {!recordingVideo ? (
                              <button
                                onClick={startVideoRecording}
                                className="flex-1 py-2 px-3 bg-slate-900 hover:bg-slate-850 border border-slate-800 rounded-lg text-xs font-bold flex items-center justify-center gap-1"
                              >
                                <Camera className="h-4 w-4 text-emerald-400" /> تسجيل فيديو كاميرا
                              </button>
                            ) : (
                              <button
                                onClick={stopVideoRecording}
                                className="flex-1 py-2 px-3 bg-rose-600 hover:bg-rose-700 rounded-lg text-xs font-bold flex items-center justify-center gap-1"
                              >
                                إيقاف الكاميرا والتسجيل
                              </button>
                            )}
                            <input
                              type="file"
                              accept="video/*"
                              onChange={handleLocalVideoUpload}
                              className="hidden"
                              id="video-file-upload"
                            />
                            <label
                              htmlFor="video-file-upload"
                              className="p-2 bg-slate-900 hover:bg-slate-850 border border-slate-800 rounded-lg cursor-pointer"
                            >
                              <Paperclip className="h-4 w-4 text-slate-400" />
                            </label>
                          </div>

                          {recordingVideo && (
                            <video
                              ref={videoPreviewRef}
                              autoPlay
                              playsInline
                              muted
                              className="h-16 w-full rounded border border-slate-800 object-cover"
                            />
                          )}

                          {additionalVideo && !recordingVideo && (
                            <div className="flex items-center gap-2 bg-slate-900 p-2 rounded border border-slate-800">
                              <span className="text-[10px] text-emerald-400 flex items-center gap-1">
                                <CheckCircle className="h-3 w-3" /> تم تسجيل/رفع المقطع
                              </span>
                              <button
                                onClick={() => setAdditionalVideo(null)}
                                className="text-[10px] font-bold text-rose-500 hover:text-rose-400 ml-auto"
                              >
                                حذف
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </>
        )}
      </div>

      {/* Raw Original Media Preview modal */}
      <AnimatePresence>
        {showOriginalModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/90 backdrop-blur z-50 flex items-center justify-center p-4 sm:p-6"
          >
            <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-4xl w-full max-h-[85vh] overflow-hidden flex flex-col shadow-2xl">
              <div className="p-5 border-b border-slate-800 flex justify-between items-center">
                <h3 className="font-bold text-white text-base">الملف الوارد الأصلي من الطالب</h3>
                <button
                  onClick={() => setShowOriginalModal(false)}
                  className="p-1.5 hover:bg-slate-800 rounded-xl text-slate-400 hover:text-white"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="flex-grow overflow-y-auto p-6 flex flex-col items-center justify-center min-h-[16rem]">
                {loadingOriginal ? (
                  <div className="text-center space-y-3">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-slate-800 border-t-emerald-500" />
                    <p className="text-xs text-slate-400">جاري سحب الملف الأصلي من جوجل درايف...</p>
                  </div>
                ) : originalMediaBase64 ? (
                  submission.imageFileId ? (
                    <img
                      src={originalMediaBase64}
                      alt="الواجب الأصلي"
                      className="max-h-[60vh] max-w-full rounded border border-slate-800 shadow-md object-contain"
                    />
                  ) : (
                    <div className="bg-slate-950 p-8 rounded-2xl border border-slate-850 text-center max-w-md w-full space-y-4">
                      <div className="h-14 w-14 bg-emerald-500/10 rounded-2xl flex items-center justify-center mx-auto">
                        <FileAudio className="h-7 w-7 text-emerald-400" />
                      </div>
                      <p className="text-xs text-slate-400 font-semibold leading-relaxed">تلاوة وتسميع الطالب الصوتي للدرس:</p>
                      <audio src={originalMediaBase64} controls className="w-full mt-2" autoPlay />
                    </div>
                  )
                ) : (
                  <p className="text-xs text-slate-400">تعذر سحب الملف أو رابط غير صالح.</p>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
