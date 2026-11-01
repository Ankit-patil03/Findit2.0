import { Camera, Images, RefreshCw, Trash2 } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';

const MAX_SIZE = 5 * 1024 * 1024; // same 5 MB limit as the backend
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_SIDE = 1280; // camera photos are scaled down to this, so uploads stay small

// Photo picker for the report form (flowchart: take photo -> "Photo clear?" -> retake or submit).
// Shows one of three things:
//   1. no photo yet  -> "Take photo" / "Choose from gallery" buttons
//   2. camera is on  -> live video with "Capture"
//   3. photo chosen  -> preview with "Retake" / "Remove"
// The parent form owns the chosen file: `file` is the current photo, `onChange(file or null)` updates it.
export default function CameraCapture({ file, onChange }) {
  const videoRef = useRef(null);
  const streamRef = useRef(null); // the live camera stream, so we can switch it off later
  const fileInputRef = useRef(null);
  const [cameraOn, setCameraOn] = useState(false);
  const [error, setError] = useState('');

  // A temporary local URL so the <img> can show the chosen file before it's uploaded
  const previewUrl = useMemo(() => (file ? URL.createObjectURL(file) : null), [file]);
  useEffect(() => () => previewUrl && URL.revokeObjectURL(previewUrl), [previewUrl]);

  // Once the <video> is on screen, connect the camera stream to it
  useEffect(() => {
    if (cameraOn && videoRef.current) videoRef.current.srcObject = streamRef.current;
  }, [cameraOn]);

  // Always switch the camera off when leaving the page (otherwise the camera light stays on)
  useEffect(() => () => stopStream(streamRef), []);

  async function startCamera() {
    setError('');
    if (!navigator.mediaDevices?.getUserMedia) {
      setError('This browser cannot open the camera here. Please choose a photo from the gallery.');
      return;
    }
    try {
      // MediaDevices API: asks permission, then gives a live video stream.
      // facingMode "environment" prefers the back camera on phones.
      streamRef.current = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
        audio: false,
      });
      setCameraOn(true);
    } catch (err) {
      setError(
        err.name === 'NotAllowedError'
          ? 'Camera permission was denied. Allow it in the browser, or choose a photo from the gallery.'
          : 'Could not open the camera. Please choose a photo from the gallery.'
      );
    }
  }

  function closeCamera() {
    stopStream(streamRef);
    setCameraOn(false);
  }

  // Canvas: copy the current video frame onto a canvas, then save the canvas as a JPEG file
  function capture() {
    const video = videoRef.current;
    if (!video?.videoWidth) return; // camera not ready yet

    const scale = Math.min(1, MAX_SIDE / Math.max(video.videoWidth, video.videoHeight));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(video.videoWidth * scale);
    canvas.height = Math.round(video.videoHeight * scale);
    canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob(
      (blob) => {
        onChange(new File([blob], `photo-${Date.now()}.jpg`, { type: 'image/jpeg' }));
        closeCamera();
      },
      'image/jpeg',
      0.85 // quality: good enough to recognise the item, much smaller file
    );
  }

  function pickFromGallery(e) {
    const picked = e.target.files[0];
    e.target.value = ''; // so choosing the same file again still triggers onChange
    if (!picked) return;
    if (!ALLOWED_TYPES.includes(picked.type)) return setError('Only JPG, PNG or WEBP images are allowed.');
    if (picked.size > MAX_SIZE) return setError('Image must be smaller than 5 MB.');
    setError('');
    onChange(picked);
  }

  function retake() {
    onChange(null);
    startCamera();
  }

  return (
    <div className="space-y-3">
      {error && <p className="error-box">{error}</p>}

      {/* 3. Photo chosen: preview + "Photo clear?" */}
      {file && (
        <div className="space-y-3">
          <img src={previewUrl} alt="Item preview" className="max-h-80 w-full rounded-2xl bg-slate-100 object-contain" />
          <p className="text-sm font-medium text-slate-700">Is the photo clear? If not, retake it.</p>
          <div className="flex gap-2">
            <button type="button" className="btn-secondary" onClick={retake}>
              <RefreshCw className="h-4 w-4" /> Retake
            </button>
            <button type="button" className="btn-secondary" onClick={() => onChange(null)}>
              <Trash2 className="h-4 w-4" /> Remove
            </button>
          </div>
        </div>
      )}

      {/* 2. Camera on: live video */}
      {!file && cameraOn && (
        <div className="space-y-3">
          <video ref={videoRef} autoPlay playsInline muted className="max-h-80 w-full rounded-2xl bg-black" />
          <div className="flex gap-2">
            <button type="button" className="btn-primary flex-1" onClick={capture}>
              <Camera className="h-4 w-4" /> Capture
            </button>
            <button type="button" className="btn-secondary" onClick={closeCamera}>Cancel</button>
          </div>
        </div>
      )}

      {/* 1. No photo yet: a dashed box with two choices */}
      {!file && !cameraOn && (
        <div className="grid grid-cols-2 gap-3 rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 p-3">
          <PickButton icon={Camera} label="Take photo" onClick={startCamera} />
          <PickButton icon={Images} label="Choose from gallery" onClick={() => fileInputRef.current.click()} />
        </div>
      )}

      {/* Hidden file input, opened by the "Choose from gallery" button */}
      <input ref={fileInputRef} type="file" accept={ALLOWED_TYPES.join(',')} hidden onChange={pickFromGallery} />
    </div>
  );
}

function PickButton({ icon: Icon, label, onClick }) {
  return (
    <button type="button" onClick={onClick}
      className="flex flex-col items-center gap-2 rounded-xl bg-white px-3 py-5 text-sm font-medium text-slate-700 shadow-sm ring-1 ring-slate-200 transition hover:text-brand-700 hover:ring-brand-300">
      <span className="grid h-11 w-11 place-items-center rounded-full bg-brand-50 text-brand-600">
        <Icon className="h-5 w-5" />
      </span>
      {label}
    </button>
  );
}

function stopStream(streamRef) {
  streamRef.current?.getTracks().forEach((track) => track.stop());
  streamRef.current = null;
}
