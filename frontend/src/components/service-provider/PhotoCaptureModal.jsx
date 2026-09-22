import { useState, useRef, useEffect, useCallback } from 'react';
import { 
  Camera, Image as ImageIcon, Upload, X, RotateCcw, Check, 
  AlertCircle, Sparkles, SwitchCamera, Loader2, ArrowLeft,
  FileCheck, Shield
} from 'lucide-react';
import { convertToWebP, captureFrameToWebP, formatFileSize } from '../../lib/imageUtils';
import { apiRequest } from '../../lib/apiClient';

/**
 * PhotoCaptureModal provides:
 * 1. Choice between live Camera or Gallery/Device Storage.
 * 2. In-app live camera viewfinder with front/back camera switch and instant capture.
 * 3. Automatic client-side conversion to WebP format with visual reduction stats.
 * 4. Distinct loading states for conversion and uploading.
 * 5. Direct upload button to server / Cloudinary.
 */
export default function PhotoCaptureModal({
  isOpen,
  onClose,
  title = 'Upload Photo',
  subtitle = 'Required for verification',
  onUploadSuccess,
  currentPhotoUrl = null,
}) {
  // Modal step: 'choose' | 'camera' | 'preview' | 'uploading'
  const [step, setStep] = useState('choose');
  
  // Camera state
  const [cameraStream, setCameraStream] = useState(null);
  const [facingMode, setFacingMode] = useState('environment'); // 'environment' (back) | 'user' (front)
  const [hasCameraSupport, setHasCameraSupport] = useState(true);
  const [cameraError, setCameraError] = useState(null);
  
  // Converted photo data
  const [photoData, setPhotoData] = useState(null);
  const [isConverting, setIsConverting] = useState(false);
  const [conversionError, setConversionError] = useState(null);
  
  // Upload state
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState(null);
  const [uploadSuccess, setUploadSuccess] = useState(false);

  // DOM Refs
  const videoRef = useRef(null);
  const fileInputGalleryRef = useRef(null);
  const fileInputCameraFallbackRef = useRef(null);

  // Stop camera tracks cleanly
  const stopCameraStream = useCallback(() => {
    if (cameraStream) {
      cameraStream.getTracks().forEach((track) => track.stop());
      setCameraStream(null);
    }
  }, [cameraStream]);

  // Reset all state when modal closes
  const handleClose = () => {
    stopCameraStream();
    setStep('choose');
    setPhotoData(null);
    setIsConverting(false);
    setConversionError(null);
    setIsUploading(false);
    setUploadError(null);
    setUploadSuccess(false);
    onClose();
  };

  // Start in-app camera stream
  const startCamera = async (mode = facingMode) => {
    setCameraError(null);
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera stream not supported in this browser');
      }

      // Stop previous stream if any
      if (cameraStream) {
        cameraStream.getTracks().forEach((t) => t.stop());
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: mode,
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      });

      setCameraStream(stream);
      setStep('camera');

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch((err) => console.warn('[PhotoCaptureModal] video play failed:', err));
      }
    } catch (err) {
      console.warn('[PhotoCaptureModal] In-app camera failed or denied:', err.message);
      setCameraError(err.message);
      // Fallback: trigger native camera input
      if (fileInputCameraFallbackRef.current) {
        fileInputCameraFallbackRef.current.click();
      } else {
        setHasCameraSupport(false);
      }
    }
  };

  // Re-attach video stream if step changes to camera
  useEffect(() => {
    if (step === 'camera' && cameraStream && videoRef.current) {
      videoRef.current.srcObject = cameraStream;
      videoRef.current.play().catch(() => {});
    }
  }, [step, cameraStream]);

  // Clean up stream on unmount
  useEffect(() => {
    return () => {
      if (cameraStream) {
        cameraStream.getTracks().forEach((t) => t.stop());
      }
    };
  }, [cameraStream]);

  // Switch front/back camera
  const toggleFacingMode = () => {
    const nextMode = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(nextMode);
    startCamera(nextMode);
  };

  // Process any picked/captured File or Blob through WebP converter
  const processImage = async (fileOrBlob) => {
    stopCameraStream();
    setIsConverting(true);
    setConversionError(null);
    setStep('preview');

    try {
      const result = await convertToWebP(fileOrBlob, {
        quality: 0.82,
        maxDimension: 1600,
      });
      setPhotoData(result);
    } catch (err) {
      console.error('[PhotoCaptureModal] WebP conversion failed:', err);
      setConversionError(err.message || 'Failed to convert image');
    } finally {
      setIsConverting(false);
    }
  };

  // Capture frame from in-app camera video
  const handleSnapCamera = async () => {
    if (!videoRef.current) return;
    setIsConverting(true);
    setStep('preview');

    try {
      const result = await captureFrameToWebP(videoRef.current, {
        quality: 0.82,
        maxDimension: 1600,
      });
      stopCameraStream();
      setPhotoData(result);
    } catch (err) {
      console.error('[PhotoCaptureModal] Capture frame failed:', err);
      // Fallback to processImage with video canvas
      stopCameraStream();
      setConversionError(err.message || 'Failed to capture photo');
    } finally {
      setIsConverting(false);
    }
  };

  // File input change (gallery or camera fallback)
  const handleFileInputChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    // Reset the input value so the same file can be chosen again if retried
    e.target.value = '';
    processImage(file);
  };

  // Upload the converted WebP image to backend / Cloudinary
  const handleUpload = async () => {
    if (!photoData?.file) return;

    setIsUploading(true);
    setUploadError(null);
    setStep('uploading');

    try {
      const formData = new FormData();
      formData.append('file', photoData.file);

      const res = await apiRequest('/uploads', {
        method: 'POST',
        auth: true,
        body: formData,
      });

      const uploadedUrl = res?.url || photoData.previewUrl;
      setUploadSuccess(true);

      // Notify parent component
      if (onUploadSuccess) {
        onUploadSuccess(uploadedUrl, photoData.file);
      }

      // Close modal smoothly after success indicator
      setTimeout(() => {
        handleClose();
      }, 750);
    } catch (err) {
      console.error('[PhotoCaptureModal] Upload failed:', err);
      setUploadError(err.message || 'Upload failed. Please check network and try again.');
      setStep('preview');
    } finally {
      setIsUploading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/65 backdrop-blur-sm transition-all animate-in fade-in duration-200">
      {/* Hidden file inputs */}
      {/* 1. Camera native fallback / mobile capture */}
      <input
        ref={fileInputCameraFallbackRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleFileInputChange}
      />
      {/* 2. Gallery / Storage / Files */}
      <input
        ref={fileInputGalleryRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileInputChange}
      />

      <div className="relative w-full max-w-sm bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-200/80 flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-slate-100 bg-white sticky top-0 z-10">
          <div className="flex items-center gap-2.5">
            {step !== 'choose' && !isUploading && !uploadSuccess && (
              <button
                type="button"
                onClick={() => {
                  stopCameraStream();
                  setStep('choose');
                  setPhotoData(null);
                }}
                className="p-1 -ml-1 text-slate-500 hover:text-slate-800 rounded-full hover:bg-slate-100 transition-colors"
                title="Back"
              >
                <ArrowLeft size={18} />
              </button>
            )}
            <div>
              <h3 className="text-sm font-bold text-[#052355] leading-tight">{title}</h3>
              <p className="text-[11px] text-slate-500">{subtitle}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            disabled={isUploading}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors disabled:opacity-30"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body based on current step */}
        <div className="p-5 overflow-y-auto flex-1 flex flex-col justify-center">
          {/* ──────────────────────────────────────────────────────────
              STEP 1: CHOOSE SOURCE (Camera vs Gallery / Storage)
             ────────────────────────────────────────────────────────── */}
          {step === 'choose' && (
            <div className="space-y-3 py-1">
              <p className="text-xs text-slate-600 mb-3 text-center">
                Select where you want to provide the photo from:
              </p>

              {/* Option A: Take Photo from Camera */}
              <button
                type="button"
                onClick={() => {
                  // On mobile/tablets, opening native capture gives highest quality & native UI
                  const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
                  if (isMobile && fileInputCameraFallbackRef.current) {
                    fileInputCameraFallbackRef.current.click();
                  } else {
                    startCamera();
                  }
                }}
                className="w-full group flex items-center gap-4 p-4 rounded-2xl border-2 border-slate-200 hover:border-[#0D47A1] bg-linear-to-r hover:from-blue-50/50 hover:to-indigo-50/30 transition-all text-left shadow-sm"
              >
                <div className="w-12 h-12 rounded-2xl bg-[#0D47A1]/10 text-[#0D47A1] flex items-center justify-center group-hover:scale-105 group-hover:bg-[#0D47A1] group-hover:text-white transition-all">
                  <Camera size={24} />
                </div>
                <div className="flex-1">
                  <h4 className="text-xs font-bold text-[#052355] group-hover:text-[#0D47A1] flex items-center gap-1.5">
                    Take Photo with Camera
                    <span className="text-[9px] font-semibold bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full">
                      Live
                    </span>
                  </h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Open camera and snap directly from your device
                  </p>
                </div>
              </button>

              {/* Option B: Choose from Gallery / Storage / Stories */}
              <button
                type="button"
                onClick={() => {
                  if (fileInputGalleryRef.current) {
                    fileInputGalleryRef.current.click();
                  }
                }}
                className="w-full group flex items-center gap-4 p-4 rounded-2xl border-2 border-slate-200 hover:border-[#0D47A1] bg-linear-to-r hover:from-blue-50/50 hover:to-indigo-50/30 transition-all text-left shadow-sm"
              >
                <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center group-hover:scale-105 group-hover:bg-[#0D47A1] group-hover:text-white transition-all">
                  <ImageIcon size={24} />
                </div>
                <div className="flex-1">
                  <h4 className="text-xs font-bold text-[#052355] group-hover:text-[#0D47A1]">
                    Choose from Gallery / Files
                  </h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Upload from device storage, photos, or saved media
                  </p>
                </div>
              </button>

              {/* WebP Auto-compression notice */}
              <div className="flex items-center gap-2 p-2.5 bg-blue-50/80 rounded-xl border border-blue-100/80 mt-2">
                <Sparkles size={14} className="text-[#0D47A1] shrink-0" />
                <span className="text-[10px] text-[#052355] font-medium leading-tight">
                  Photos are automatically converted to <strong>WebP</strong> format to reduce size by up to 90% before uploading.
                </span>
              </div>
            </div>
          )}

          {/* ──────────────────────────────────────────────────────────
              STEP 2: LIVE CAMERA VIEWFINDER
             ────────────────────────────────────────────────────────── */}
          {step === 'camera' && (
            <div className="flex flex-col items-center">
              <div className="relative w-full aspect-[4/3] bg-black rounded-2xl overflow-hidden shadow-inner flex items-center justify-center">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                />

                {/* Grid Overlay Guide */}
                <div className="absolute inset-0 pointer-events-none border border-white/20 grid grid-cols-3 grid-rows-3">
                  <div className="border-r border-b border-white/15" />
                  <div className="border-r border-b border-white/15" />
                  <div className="border-b border-white/15" />
                  <div className="border-r border-b border-white/15" />
                  <div className="border-r border-b border-white/15" />
                  <div className="border-b border-white/15" />
                  <div className="border-r border-white/15" />
                  <div className="border-r border-white/15" />
                  <div />
                </div>

                {/* Flip camera button */}
                <button
                  type="button"
                  onClick={toggleFacingMode}
                  className="absolute top-3 right-3 p-2 bg-black/50 hover:bg-black/70 text-white rounded-full backdrop-blur-sm transition-all"
                  title="Switch Camera"
                >
                  <SwitchCamera size={18} />
                </button>
              </div>

              {/* Shutter Controls */}
              <div className="flex items-center justify-between w-full mt-4 px-4">
                <button
                  type="button"
                  onClick={() => {
                    stopCameraStream();
                    setStep('choose');
                  }}
                  className="text-xs font-semibold text-slate-500 hover:text-slate-800"
                >
                  Cancel
                </button>

                {/* Big Shutter Button */}
                <button
                  type="button"
                  onClick={handleSnapCamera}
                  className="w-16 h-16 rounded-full border-4 border-white bg-[#0D47A1] hover:bg-[#0A3F91] shadow-lg flex items-center justify-center text-white ring-4 ring-[#0D47A1]/30 active:scale-95 transition-all"
                  title="Capture Photo"
                >
                  <Camera size={26} />
                </button>

                <button
                  type="button"
                  onClick={() => {
                    stopCameraStream();
                    if (fileInputCameraFallbackRef.current) {
                      fileInputCameraFallbackRef.current.click();
                    }
                  }}
                  className="text-xs font-semibold text-[#0D47A1] hover:underline"
                >
                  System App
                </button>
              </div>
            </div>
          )}

          {/* ──────────────────────────────────────────────────────────
              STEP 3: CONVERTING & PREVIEW WITH WEBP STATS
             ────────────────────────────────────────────────────────── */}
          {step === 'preview' && (
            <div className="flex flex-col items-center">
              {/* Image Preview Area */}
              <div className="relative w-full aspect-square bg-slate-950 rounded-2xl overflow-hidden border border-slate-200 shadow-md flex items-center justify-center">
                {photoData?.previewUrl ? (
                  <img
                    src={photoData.previewUrl}
                    alt="Captured preview"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="flex flex-col items-center text-slate-400 gap-2">
                    <ImageIcon size={32} />
                    <span className="text-xs">Processing image...</span>
                  </div>
                )}

                {/* Converting Overlay */}
                {isConverting && (
                  <div className="absolute inset-0 bg-black/60 backdrop-blur-xs flex flex-col items-center justify-center text-white p-4 text-center">
                    <Loader2 size={32} className="animate-spin text-blue-400 mb-2" />
                    <span className="text-xs font-bold">Converting to WebP format...</span>
                    <span className="text-[10px] text-blue-200 mt-0.5">
                      Compressing and optimizing resolution
                    </span>
                  </div>
                )}
              </div>

              {/* Conversion Statistics Badge */}
              {photoData && !isConverting && (
                <div className="w-full mt-3 p-2.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-md bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                      <FileCheck size={14} />
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px] font-bold text-slate-800">
                          WebP Format
                        </span>
                        {photoData.compressionRatio > 0 && (
                          <span className="text-[9px] font-bold px-1.5 py-0.2 bg-emerald-100 text-emerald-700 rounded-full">
                            -{photoData.compressionRatio}%
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-slate-500">
                        {photoData.originalSize > 0 && (
                          <span className="line-through text-slate-400 mr-1">
                            {formatFileSize(photoData.originalSize)}
                          </span>
                        )}
                        <strong>{formatFileSize(photoData.webpSize)}</strong>
                      </span>
                    </div>
                  </div>
                  <span className="text-[9px] font-semibold text-[#0D47A1] bg-blue-50 border border-blue-100 px-2 py-0.5 rounded-md">
                    Optimized
                  </span>
                </div>
              )}

              {/* Error Message if any */}
              {conversionError && (
                <div className="w-full mt-2 p-2.5 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-red-700 text-xs">
                  <AlertCircle size={14} className="shrink-0" />
                  <span>{conversionError}</span>
                </div>
              )}

              {/* Action Buttons: Retake vs Upload */}
              <div className="flex items-center gap-2 w-full mt-4">
                <button
                  type="button"
                  onClick={() => {
                    setPhotoData(null);
                    setStep('choose');
                  }}
                  className="flex-1 flex items-center justify-center gap-1.5 py-3 px-3 border border-slate-300 hover:border-slate-400 bg-white text-slate-700 rounded-xl text-xs font-semibold transition-all"
                >
                  <RotateCcw size={14} />
                  Retake
                </button>

                <button
                  type="button"
                  onClick={handleUpload}
                  disabled={isConverting || !photoData?.file}
                  className="flex-1 flex items-center justify-center gap-1.5 py-3 px-3 bg-[#0D47A1] hover:bg-[#0A3F91] text-white rounded-xl text-xs font-semibold shadow-md transition-all disabled:opacity-50"
                >
                  <Upload size={14} />
                  Upload Photo
                </button>
              </div>
            </div>
          )}

          {/* ──────────────────────────────────────────────────────────
              STEP 4: UPLOADING STATE
             ────────────────────────────────────────────────────────── */}
          {step === 'uploading' && (
            <div className="flex flex-col items-center justify-center py-6 text-center">
              <div className="relative w-20 h-20 mb-4 flex items-center justify-center">
                {uploadSuccess ? (
                  <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center animate-in zoom-in-50 duration-200">
                    <Check size={36} className="stroke-[3]" />
                  </div>
                ) : (
                  <>
                    <div className="absolute inset-0 rounded-full border-4 border-blue-100" />
                    <div className="absolute inset-0 rounded-full border-4 border-[#0D47A1] border-t-transparent animate-spin" />
                    <Upload size={24} className="text-[#0D47A1] animate-pulse" />
                  </>
                )}
              </div>

              <h4 className="text-sm font-bold text-[#052355]">
                {uploadSuccess ? 'Photo Uploaded!' : 'Uploading to Cloud...'}
              </h4>
              <p className="text-xs text-slate-500 mt-1 max-w-55">
                {uploadSuccess
                  ? 'Your verified photo has been securely attached to this job.'
                  : 'Saving optimized WebP photo to server / Cloudinary...'}
              </p>

              {uploadError && (
                <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center gap-2">
                  <AlertCircle size={14} className="shrink-0" />
                  <span>{uploadError}</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
