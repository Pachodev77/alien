import { useEffect, useState, useRef } from 'react';
import { SkipBack, SkipForward, Shuffle, Repeat } from 'lucide-react';

function App() {
  // Base dimensions of the reference design
  const BASE_W = 430;
  const BASE_H = 760;
  // Extra tuning knobs
  let UI_SCALE = 0.9; // make UI slightly smaller/more compact
  let BG_ZOOM = 1.2; // enlarge background a bit so elements line up better

  // Fine-tune offsets (in px) to align exactly with the background
  const OFF = {
    headerX: -6,
    headerY: 54,
    albumX: 0,
    albumY: 48,
    infoY: 70,
    infoL: 44, // move further toward center
    infoR: 44, // move further toward center
    sliderY: 86,
    controlsY: -8,
    miscY: 32, // lower shuffle/repeat buttons by default
  } as const;

  // Allow overriding via URL query params, e.g.: ?h=6&ay=12&iy=18&sy=24&cy=10&hx=0&ax=0&ui=0.88&bg=1.15
  try {
    const qp = new URLSearchParams(window.location.search);
    const num = (k: string) => (qp.get(k) !== null ? Number(qp.get(k)) : null);
    const n = (v: number | null, d: number) => (Number.isFinite(v as number) ? (v as number) : d);

    // Offsets
    // @ts-ignore - reassign to mutable copy
    (OFF as any).headerY = n(num('h'), OFF.headerY);
    // @ts-ignore
    (OFF as any).headerX = n(num('hx'), OFF.headerX);
    // @ts-ignore
    (OFF as any).albumY = n(num('ay'), OFF.albumY);
    // @ts-ignore
    (OFF as any).albumX = n(num('ax'), OFF.albumX);
    // @ts-ignore
    (OFF as any).infoY = n(num('iy'), OFF.infoY);
    // @ts-ignore
    (OFF as any).infoL = n(num('il'), OFF.infoL);
    // @ts-ignore
    (OFF as any).infoR = n(num('ir'), OFF.infoR);
    // @ts-ignore
    (OFF as any).sliderY = n(num('sy'), OFF.sliderY);
    // @ts-ignore
    (OFF as any).controlsY = n(num('cy'), OFF.controlsY);
    // @ts-ignore
    (OFF as any).miscY = n(num('my'), OFF.miscY);

    // Scales
    UI_SCALE = n(num('ui'), UI_SCALE) || UI_SCALE;
    BG_ZOOM = n(num('bg'), BG_ZOOM) || BG_ZOOM;
  } catch {}

  const [scale, setScale] = useState(1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentVideoIndex, setCurrentVideoIndex] = useState(0);
  const [repeatCount, setRepeatCount] = useState(0);
  const [activeVideo, setActiveVideo] = useState<'primary' | 'secondary'>('primary');
  const primaryVideoRef = useRef<HTMLVideoElement>(null);
  const secondaryVideoRef = useRef<HTMLVideoElement>(null);

  const videos = [
    '/background-1.mp4',
    '/background-2.mp4', 
    '/background-3.mp4',
    '/background.mp4'
  ];
  const maxRepeats = 3;

  useEffect(() => {
    const update = () => {
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const s = Math.min(vw / BASE_W, vh / BASE_H);
      setScale(s);
    };
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  useEffect(() => {
    if (primaryVideoRef.current) {
      primaryVideoRef.current.playbackRate = 0.3;
    }
    if (secondaryVideoRef.current) {
      secondaryVideoRef.current.playbackRate = 0.3;
    }
  }, []);

  useEffect(() => {
    const activeVideoElement = activeVideo === 'primary' ? primaryVideoRef.current : secondaryVideoRef.current;
    if (!activeVideoElement) return;

    const handleVideoEnd = () => {
      if (repeatCount < maxRepeats - 1) {
        // Repetir el mismo video
        setRepeatCount(prev => prev + 1);
        activeVideoElement.currentTime = 0;
        activeVideoElement.play().catch(err => console.log('Auto-play failed:', err));
      } else {
        // Pasar al siguiente video y resetear contador
        setRepeatCount(0);
        const nextIndex = (currentVideoIndex + 1) % videos.length;
        
        // Preparar el siguiente video en el elemento inactivo
        const inactiveVideoElement = activeVideo === 'primary' ? secondaryVideoRef.current : primaryVideoRef.current;
        if (inactiveVideoElement) {
          inactiveVideoElement.src = videos[nextIndex];
          inactiveVideoElement.currentTime = 0;
          inactiveVideoElement.playbackRate = 0.3; // Asegurar velocidad 30%
          inactiveVideoElement.play().catch(err => console.log('Next video play failed:', err));
          
          // Hacer transición suave
          inactiveVideoElement.style.opacity = '1';
          activeVideoElement.style.opacity = '0';
          
          setTimeout(() => {
            setActiveVideo(activeVideo === 'primary' ? 'secondary' : 'primary');
            setCurrentVideoIndex(nextIndex);
            activeVideoElement.style.opacity = '0';
            inactiveVideoElement.style.opacity = '1';
          }, 100);
        }
      }
    };

    activeVideoElement.addEventListener('ended', handleVideoEnd);
    return () => activeVideoElement.removeEventListener('ended', handleVideoEnd);
  }, [repeatCount, maxRepeats, currentVideoIndex, videos.length, activeVideo]);

  useEffect(() => {
    // Configurar video inicial
    if (primaryVideoRef.current && videos[currentVideoIndex]) {
      primaryVideoRef.current.src = videos[currentVideoIndex];
      primaryVideoRef.current.playbackRate = 0.3; // Asegurar velocidad 30%
      primaryVideoRef.current.play().catch(err => console.log('Initial video play failed:', err));
    }
    
    // Pre-cargar el siguiente video
    if (secondaryVideoRef.current) {
      const nextIndex = (currentVideoIndex + 1) % videos.length;
      secondaryVideoRef.current.src = videos[nextIndex];
      secondaryVideoRef.current.currentTime = 0;
      secondaryVideoRef.current.playbackRate = 0.3; // Asegurar velocidad 30%
    }
  }, []);

  return (
    <div className="fixed inset-0 overflow-hidden">
      {/* Fullscreen background */}
      <div className="absolute inset-0 bg-black" />
      
      {/* Video primario */}
      <video
        ref={primaryVideoRef}
        autoPlay
        muted
        playsInline
        className="absolute inset-0 w-full h-full object-contain transition-opacity duration-100"
        style={{ 
          transform: `scale(${BG_ZOOM})`, 
          transformOrigin: 'center',
          opacity: activeVideo === 'primary' ? 1 : 0
        }}
      />
      
      {/* Video secundario */}
      <video
        ref={secondaryVideoRef}
        muted
        playsInline
        className="absolute inset-0 w-full h-full object-contain transition-opacity duration-100"
        style={{ 
          transform: `scale(${BG_ZOOM})`, 
          transformOrigin: 'center',
          opacity: activeVideo === 'secondary' ? 1 : 0
        }}
      />

      {/* Centered scaling stage */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div
          className="relative"
          style={{
            width: BASE_W,
            height: BASE_H,
            transform: `scale(${scale * UI_SCALE})`,
            transformOrigin: 'center',
          }}
        >
          {/* Outer frame glow (transparent fill) */}
          <div
            className="absolute rounded-[18px] pointer-events-none"
            style={{ 
              left: 0, 
              right: 0, 
              top: 42, 
              bottom: 10,
              boxShadow: '0 0 24px rgba(27,250,90,0.25), inset 0 0 0 2px rgba(27,250,90,0.55)' 
            }}
          />

          {/* Header: ALBUM ART */}
          <div
            className="absolute h-[72px] flex items-center"
            style={{
              left: 24 + OFF.headerX,
              right: 24 - OFF.headerX,
              top: 22 + OFF.headerY,
              border: '2px solid rgba(27,250,90,0.5)',
              borderRadius: 12,
              background: 'transparent',
              boxShadow: '0 0 12px rgba(27,250,90,0.35), inset 0 0 0 1px rgba(27,250,90,0.25)'
            }}
          >
            <div className="bg-black px-2 py-1 rounded text-[22px] tracking-widest text-[#bfeebb] font-semibold">ALBUM ART</div>
            <div className="ml-auto flex items-center gap-1 pr-2 text-[#82f2a4]">
              <div className="w-1.5 h-1.5 rounded-full bg-[#1bfa5a] opacity-80" />
              <div className="w-1.5 h-1.5 rounded-full bg-[#1bfa5a] opacity-60" />
              <div className="w-1.5 h-1.5 rounded-full bg-[#1bfa5a] opacity-40" />
            </div>
          </div>

          {/* Album art frame (transparent) */}
          <div
            className="absolute rounded-[12px]"
            style={{
              left: 36 + OFF.albumX,
              right: 36 - OFF.albumX,
              top: 92 + OFF.albumY,
              height: 360,
              outline: '2px solid rgba(27,250,90,0.4)',
              outlineOffset: '-6px',
              background: 'transparent',
            }}
          />

          {/* Info blocks */}
          <div
            className="absolute text-[#bfeebb] text-[16px] leading-6 font-semibold bg-black px-2 py-1 rounded"
            style={{ left: OFF.infoL, top: 476 + OFF.infoY }}
          >
            <div className="opacity-60 tracking-widest">TITLE</div>
            <div className="opacity-90 tracking-widest">ARTIST</div>
          </div>
          <div
            className="absolute text-right text-[#bfeebb] text-[16px] leading-6 font-semibold bg-black px-2 py-1 rounded"
            style={{ right: OFF.infoR, top: 476 + OFF.infoY }}
          >
            <div className="opacity-60 tracking-widest">ARTIST</div>
            <div className="opacity-90 tracking-widest">ALBUM</div>
          </div>

          {/* Slider (track + fill + thumb) */}
          <div className="absolute z-10" style={{ left: 42, right: 42, top: 516 + OFF.sliderY }}>
            <div className="h-[5px] bg-[#0b1f15]/80 rounded-full relative overflow-visible border border-[#1bfa5a]/40 shadow-[0_0_10px_rgba(27,250,90,0.25)]">
              <div className="h-full bg-[#26ff7a] rounded-full shadow-[0_0_10px_rgba(27,250,90,0.6)]" style={{ width: '36%' }} />
              <div
                className="absolute -top-[10px] w-[20px] h-[20px] rounded-full bg-[#1bfa5a] shadow-[0_0_14px_3px_rgba(27,250,90,0.9)] border border-[#0a2a1b]"
                style={{ left: '36%' }}
              />
            </div>
          </div>

          {/* Transport controls */}
          <div
            className="absolute left-0 right-0 flex items-center justify-center gap-6"
            style={{ bottom: 56 - OFF.controlsY }}
          >
            <button className="w-12 h-12 rounded-lg border border-[#1bfa5a] text-[#bfeebb] bg-black backdrop-blur-[0px] flex items-center justify-center">
              <SkipBack className="w-7 h-7" strokeWidth={3.5} stroke="currentColor" />
            </button>
            <button className="w-16 h-16 rounded-full bg-[#1bfa5a] text-black shadow-[0_0_18px_rgba(27,250,90,0.6)] flex items-center justify-center">
              {isPlaying ? (
                // Solid pause (filled bars)
                <svg width="28" height="28" viewBox="0 0 28 28" aria-hidden="true">
                  <rect x="6" y="4" width="6" height="20" fill="currentColor" rx="1" />
                  <rect x="16" y="4" width="6" height="20" fill="currentColor" rx="1" />
                </svg>
              ) : (
                // Solid play (filled triangle)
                <svg width="28" height="28" viewBox="0 0 28 28" aria-hidden="true">
                  <path d="M9 6 L22 14 L9 22 Z" fill="currentColor" />
                </svg>
              )}
            </button>
            <button className="w-12 h-12 rounded-lg border border-[#1bfa5a] text-[#bfeebb] bg-black backdrop-blur-[0px] flex items-center justify-center">
              <SkipForward className="w-7 h-7" strokeWidth={3.5} stroke="currentColor" />
            </button>
          </div>

          {/* Shuffle / Repeat small buttons */}
          <button
            className="absolute w-10 h-10 rounded-md border border-[#1bfa5a] text-[#bfeebb] bg-black flex items-center justify-center"
            style={{ left: 42, bottom: 112 - OFF.miscY }}
            aria-label="Shuffle"
          >
            <Shuffle className="w-7 h-7" strokeWidth={3.5} stroke="currentColor" />
          </button>
          <button
            className="absolute w-10 h-10 rounded-md border border-[#1bfa5a] text-[#bfeebb] bg-black flex items-center justify-center"
            style={{ right: 42, bottom: 112 - OFF.miscY }}
            aria-label="Repeat"
          >
            <Repeat className="w-7 h-7" strokeWidth={3.5} stroke="currentColor" />
          </button>
        </div>
      </div>
    </div>
  );
}

export default App;
