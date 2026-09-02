'use client';
/* oxlint-disable next/no-img-element */

import {
  Download,
  ImagePlus,
  Leaf,
  LoaderCircle,
  LockKeyhole,
  RefreshCcw,
  Sparkles,
  Upload,
  Users,
} from 'lucide-react';
import { ChangeEvent, useEffect, useId, useRef, useState } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';

const lenses = [
  {
    id: 'ecological',
    label: 'Ecological',
    icon: Leaf,
    accent: '#a8c978',
    description: 'Shade, planting, permeable ground, and visible water care.',
  },
  {
    id: 'communal',
    label: 'Communal',
    icon: Users,
    accent: '#e99a54',
    description: 'Shared seating, practical light, and room to gather.',
  },
  {
    id: 'contemplative',
    label: 'Contemplative',
    icon: Sparkles,
    accent: '#82adbf',
    description: 'A quiet threshold, softer edges, and a reason to pause.',
  },
] as const;

type LensId = (typeof lenses)[number]['id'];
type PreparedPhoto = {
  file: File;
  previewUrl: string;
  originalName: string;
  outputSize: '1024x1024' | '1536x1024' | '1024x1536';
};

const sourceLimit = 8 * 1024 * 1024;
const preparedLimit = 4 * 1024 * 1024;

function loadBitmap(file: File) {
  if ('createImageBitmap' in window) return createImageBitmap(file);
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    const url = URL.createObjectURL(file);
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Image could not be decoded.'));
    };
    image.src = url;
  });
}

async function preparePhoto(file: File): Promise<PreparedPhoto> {
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
    throw new Error('Use a JPEG, PNG, or WebP photo.');
  }
  if (file.size > sourceLimit) throw new Error('Choose a photo smaller than 8 MB.');

  const bitmap = await loadBitmap(file);
  const width = 'naturalWidth' in bitmap ? bitmap.naturalWidth : bitmap.width;
  const height = 'naturalHeight' in bitmap ? bitmap.naturalHeight : bitmap.height;
  if (width < 480 || height < 480) {
    if ('close' in bitmap) bitmap.close();
    throw new Error('Choose a photo at least 480 pixels wide and tall.');
  }

  const scale = Math.min(1, 1600 / Math.max(width, height));
  const targetWidth = Math.max(1, Math.round(width * scale));
  const targetHeight = Math.max(1, Math.round(height * scale));
  const canvas = document.createElement('canvas');
  canvas.width = targetWidth;
  canvas.height = targetHeight;
  const context = canvas.getContext('2d', { alpha: false });
  if (!context) throw new Error('This browser could not prepare the photo.');
  context.drawImage(bitmap, 0, 0, targetWidth, targetHeight);
  if ('close' in bitmap) bitmap.close();

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, 'image/jpeg', 0.88),
  );
  if (!blob || blob.size > preparedLimit) {
    throw new Error('This photo could not be reduced below the 4 MB processing limit.');
  }

  const ratio = width / height;
  const outputSize = ratio > 1.15 ? '1536x1024' : ratio < 0.87 ? '1024x1536' : '1024x1024';
  const prepared = new File([blob], 'possible-city-place.jpg', { type: 'image/jpeg' });
  return {
    file: prepared,
    previewUrl: URL.createObjectURL(prepared),
    originalName: file.name,
    outputSize,
  };
}

export function ImageStudio() {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [photo, setPhoto] = useState<PreparedPhoto | null>(null);
  const [lens, setLens] = useState<LensId>('ecological');
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [position, setPosition] = useState(50);
  const [isWorking, setIsWorking] = useState(false);
  const [error, setError] = useState('');
  const [quotaNote, setQuotaNote] = useState('3 transformations per network each day · 120 shared each month');

  useEffect(() => {
    return () => {
      if (photo?.previewUrl) URL.revokeObjectURL(photo.previewUrl);
    };
  }, [photo?.previewUrl]);

  const chooseFile = async (file?: File) => {
    if (!file) return;
    setError('');
    setResultUrl(null);
    try {
      const prepared = await preparePhoto(file);
      setPhoto(prepared);
    } catch (caught) {
      setPhoto(null);
      setError(caught instanceof Error ? caught.message : 'The photo could not be prepared.');
    }
  };

  const onFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    void chooseFile(event.target.files?.[0]);
  };

  const transform = async () => {
    if (!photo || isWorking) return;
    setIsWorking(true);
    setError('');
    setResultUrl(null);

    const body = new FormData();
    body.append('image', photo.file);
    body.append('lens', lens);
    body.append('outputSize', photo.outputSize);
    body.append('company', '');

    try {
      const response = await fetch('/api/transform', { method: 'POST', body });
      const payload = (await response.json().catch(() => ({}))) as {
        image?: string;
        error?: string;
        dailyRemaining?: number;
        monthlyRemaining?: number;
      };
      if (!response.ok || !payload.image) {
        throw new Error(payload.error || 'The transformation did not finish.');
      }

      setResultUrl(payload.image);
      setPosition(50);
      if (typeof payload.dailyRemaining === 'number' && typeof payload.monthlyRemaining === 'number') {
        setQuotaNote(
          `${payload.dailyRemaining} left for this network today · ${payload.monthlyRemaining} left in the shared monthly pool`,
        );
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'The transformation did not finish.');
    } finally {
      setIsWorking(false);
    }
  };

  const reset = () => {
    setPhoto(null);
    setResultUrl(null);
    setError('');
    setPosition(50);
    if (inputRef.current) inputRef.current.value = '';
  };

  const download = () => {
    if (!resultUrl) return;
    const selected = lenses.find((item) => item.id === lens)?.label.toLowerCase() ?? 'vision';
    const anchor = document.createElement('a');
    anchor.href = resultUrl;
    anchor.download = `possible-city-${selected}-vision.jpg`;
    anchor.click();
  };

  return (
    <section id="imagine" className="studio-section" aria-labelledby="studio-title">
      <div className="studio-heading">
        <div>
          <p className="eyebrow">Public beta · GPT Image 2</p>
          <h2 id="studio-title" className="studio-title">Imagine your own place.</h2>
        </div>
        <div className="max-w-xl">
          <p className="text-base leading-7 text-muted-foreground">
            Upload one ordinary public-space photo and test a grounded future through a single civic lens. The image is a conversation starter—not a plan or promise.
          </p>
          <p className="mt-4 font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
            {quotaNote}
          </p>
        </div>
      </div>

      <div className="studio-grid">
        <div className="studio-controls">
          <div>
            <p className="studio-step">01 · Choose a photo</p>
            <label
              htmlFor={inputId}
              className="upload-dropzone"
            >
              <input
                ref={inputRef}
                id={inputId}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="sr-only"
                onChange={onFileChange}
              />
              {photo ? (
                <>
                  <img src={photo.previewUrl} alt="Selected public place" className="upload-preview" />
                  <span className="upload-change">Choose a different photo</span>
                  <span className="upload-name">{photo.originalName}</span>
                </>
              ) : (
                <>
                  <span className="upload-icon"><ImagePlus /></span>
                  <span className="font-heading text-2xl tracking-[-0.035em]">Choose a place photo</span>
                  <span className="text-sm text-muted-foreground">JPEG, PNG, or WebP</span>
                  <span className="upload-limit">8 MB source · resized to 4 MB · minimum 480 × 480</span>
                </>
              )}
            </label>
          </div>

          <fieldset>
            <legend className="studio-step">02 · Choose one lens</legend>
            <div className="studio-lenses">
              {lenses.map((item) => {
                const Icon = item.icon;
                const selected = lens === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    className="studio-lens"
                    data-active={selected}
                    aria-pressed={selected}
                    onClick={() => {
                      setLens(item.id);
                      setResultUrl(null);
                    }}
                  >
                    <span className="studio-lens-icon" style={{ background: item.accent }}><Icon /></span>
                    <span>
                      <strong>{item.label}</strong>
                      <small>{item.description}</small>
                    </span>
                  </button>
                );
              })}
            </div>
          </fieldset>

          {error ? (
            <Alert variant="destructive" className="rounded-2xl px-4 py-3">
              <AlertTitle>Couldn’t make this vision</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}

          <Button
            type="button"
            className="h-12 w-full rounded-full text-sm"
            onClick={transform}
            disabled={!photo || isWorking}
          >
            {isWorking ? <LoaderCircle className="animate-spin" /> : <Sparkles />}
            {isWorking ? 'Imagining this place…' : 'Generate one grounded vision'}
          </Button>
          <p className="text-center text-xs leading-5 text-muted-foreground">
            A transformation can take up to two minutes. Please keep this tab open.
          </p>
        </div>

        <div className="studio-output" aria-live="polite">
          {resultUrl && photo ? (
            <div className="comparison-shell">
              <div className="comparison-frame">
                <img src={resultUrl} alt={`${lens} vision of the selected place`} className="comparison-image" />
                <div className="comparison-before" style={{ clipPath: `inset(0 ${100 - position}% 0 0)` }}>
                  <img src={photo.previewUrl} alt="Original public place" className="comparison-image" />
                </div>
                <div className="comparison-line" style={{ left: `${position}%` }} aria-hidden="true">
                  <span>↔</span>
                </div>
                <span className="comparison-label left-4">Before</span>
                <span className="comparison-label right-4">Possible</span>
              </div>
              <label className="comparison-control">
                <span>Move to compare</span>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={position}
                  onChange={(event) => setPosition(Number(event.target.value))}
                  aria-label="Compare original and transformed image"
                />
              </label>
              <div className="flex flex-wrap gap-3">
                <Button type="button" className="h-10 rounded-full px-4" onClick={download}>
                  <Download /> Download vision
                </Button>
                <Button type="button" variant="outline" className="h-10 rounded-full px-4" onClick={reset}>
                  <RefreshCcw /> Try another place
                </Button>
              </div>
              <p className="text-xs leading-5 text-muted-foreground">
                AI-generated concept · Check spatial details before using it in any public conversation.
              </p>
            </div>
          ) : isWorking && photo ? (
            <div className="studio-processing">
              <div className="processing-image">
                <img src={photo.previewUrl} alt="Selected place while the vision is being prepared" />
                <div className="processing-scan" />
              </div>
              <div>
                <p className="eyebrow">Working through the {lens} lens</p>
                <p className="mt-4 font-heading text-3xl tracking-[-0.04em]">Keeping the place. Testing a possibility.</p>
                <p className="mt-3 text-sm leading-6 text-muted-foreground">The model is preserving the viewpoint and existing urban fabric while adding a modest, reversible first move.</p>
              </div>
            </div>
          ) : (
            <div className="studio-empty">
              <span className="studio-empty-mark"><Upload /></span>
              <div>
                <p className="font-heading text-3xl tracking-[-0.045em]">Your before-and-after view will appear here.</p>
                <p className="mt-4 max-w-md text-sm leading-6 text-muted-foreground">Choose a photo with a clear view of the public realm. Wide scenes with visible ground and edges work best.</p>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="privacy-strip">
        <LockKeyhole />
        <div>
          <h3>Designed for one-time processing.</h3>
          <p>
            Your browser removes location metadata and resizes the photo before sending it. Possible City does not save the upload or result; it is sent to OpenAI for this transformation and returned to this tab. Short-lived, one-way network hashes prevent abuse, and only a monthly total is kept for the shared budget. Upload only photos you have the right to share, and avoid close-up faces, licence plates, private interiors, or sensitive locations. OpenAI processes the request under its <a href="https://developers.openai.com/api/docs/guides/your-data" target="_blank" rel="noreferrer">API data controls</a>.
          </p>
        </div>
      </div>
    </section>
  );
}
