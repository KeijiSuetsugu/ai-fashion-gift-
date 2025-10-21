'use client';

import './globals.css';
import { useEffect, useMemo, useRef, useState } from 'react';

type Outfit = {
  name: string;
  vibe: string;
  items: string[];
  colors: string[];
  accessories: string[];
  occasion: string;
  price_range: string;
  caption: string;
  prompt: string;
};

export default function Home() {
  const [faceFile,setFaceFile] = useState<File|null>(null);
  const [faceURL,setFaceURL] = useState<string>('');
  const [notes,setNotes] = useState('');
  const [age,setAge] = useState('45');
  const [style,setStyle] = useState('キレイめ / モード');
  const [sizes,setSizes] = useState('トップスM / ボトムM / 足24.0');
  const [budget,setBudget] = useState('1〜2万円/コーデ');
  const [colors,setColors] = useState('黒, ベージュ, 白, ブラウン, ネイビー');
  const [occasion,setOccasion] = useState('誕生日ディナー / 週末のおでかけ / 仕事後の食事');
  const [outfits,setOutfits] = useState<Outfit[]>([]);
  const [pending,setPending] = useState(false);
  const [genLoading, setGenLoading] = useState<{[k:string]:boolean}>({});
  const [genImageMap, setGenImageMap] = useState<{[k:string]:string}>({});

  // Canvas overlay state
  const canvasRef = useRef<HTMLCanvasElement|null>(null);
  const [baseImage, setBaseImage] = useState<HTMLImageElement|null>(null);
  const [overlayImage, setOverlayImage] = useState<HTMLImageElement|null>(null);
  const [overlayPos, setOverlayPos] = useState({ x: 100, y: 40 });
  const [overlaySize, setOverlaySize] = useState(160);
  const [dragging,setDragging] = useState(false);
  const dragOffset = useRef({x:0,y:0});

  useEffect(()=>{
    if(faceFile){
      const url = URL.createObjectURL(faceFile);
      setFaceURL(url);
      const img = new Image();
      img.onload = () => setOverlayImage(img);
      img.src = url;
    } else {
      setFaceURL('');
      setOverlayImage(null);
    }
  },[faceFile]);

  function onFaceSelect(e: React.ChangeEvent<HTMLInputElement>){
    const f = e.target.files?.[0];
    if(!f) return;
    if(!f.type.startsWith('image/')){ alert('画像ファイルを選択してください'); return; }
    setFaceFile(f);
  }

  async function getRecommendations(){
    if(!faceFile){ alert('先に顔写真をアップロードしてください'); return; }
    try{
      setPending(true);
      const payload = { age, style, sizes, budget, colors, occasion, notes };
      const res = await fetch('/api/recommend', {
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body: JSON.stringify(payload)
      });
      if(!res.ok){ throw new Error(await res.text()); }
      const data = await res.json();
      setOutfits(data.outfits || []);
      window.scrollTo({top: 900, behavior: 'smooth'});
    }catch{
      alert('おすすめ取得に失敗');
    }finally{
      setPending(false);
    }
  }

  async function generateLook(idx:number, outfit: Outfit){
    try{
      setGenLoading(s => ({...s, [String(idx)]: true}));
      const res = await fetch('/api/generate-image', {
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ prompt: outfit.prompt })
      });
      if(!res.ok){ throw new Error(await res.text()); }
      const data = await res.json();
      const b64 = data.b64;
      if(!b64){ throw new Error('no image'); }
      const imgUrl = 'data:image/png;base64,'+b64;
      setGenImageMap(m => ({...m, [String(idx)]: imgUrl}));
      const img = new Image();
      img.onload = () => {
        setBaseImage(img);
        // 画像幅の中央あたりにリセット
        const W = img.naturalWidth || 1024;
        setOverlayPos({ x: Math.max(0, Math.floor(W/2 - overlaySize/2)), y: 40 });
      };
      img.src = imgUrl;
      setOverlaySize(160);
      setTimeout(()=>{ document.getElementById('editor')?.scrollIntoView({behavior:'smooth'}); }, 300);
    }catch{
      alert('画像生成に失敗');
    }finally{
      setGenLoading(s => ({...s, [String(idx)]: false}));
    }
  }

  // draw canvas (画像の実寸に合わせる)
  useEffect(()=>{
    const canvas = canvasRef.current;
    if(!canvas || !baseImage) return;
    const ctx = canvas.getContext('2d')!;
    const W = baseImage.naturalWidth || baseImage.width || 1024;
    const H = baseImage.naturalHeight || baseImage.height || 1024;
    canvas.width = W; canvas.height = H;

    ctx.clearRect(0,0,W,H);
    ctx.drawImage(baseImage, 0, 0, W, H);

    if(overlayImage){
      const r = overlaySize/2;
      const cx = overlayPos.x + r;
      const cy = overlayPos.y + r;
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI*2);
      ctx.closePath();
      ctx.clip();

      const scale = Math.max(overlaySize/overlayImage.width, overlaySize/overlayImage.height);
      const drawW = overlayImage.width*scale;
      const drawH = overlayImage.height*scale;
      const dx = overlayPos.x + (overlaySize - drawW)/2;
      const dy = overlayPos.y + (overlaySize - drawH)/2;
      ctx.drawImage(overlayImage, dx, dy, drawW, drawH);
      ctx.restore();

      ctx.strokeStyle = 'rgba(255,255,255,.8)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI*2);
      ctx.stroke();
    }
  }, [baseImage, overlayImage, overlayPos, overlaySize]);

  function bounds(){
    const c = canvasRef.current;
    const W = c?.width ?? 1024;
    const H = c?.height ?? 1024;
    return { W, H };
  }

  function onCanvasMouseDown(e: React.MouseEvent){
    if(!overlayImage) return;
    const rect = (e.target as HTMLCanvasElement).getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const r = overlaySize/2;
    const cx = overlayPos.x + r;
    const cy = overlayPos.y + r;
    const inside = Math.hypot(x - cx, y - cy) <= r;
    if(inside){
      setDragging(true);
      (dragOffset as any).current = { x: x - overlayPos.x, y: y - overlayPos.y };
    }
  }
  function onCanvasMouseMove(e: React.MouseEvent){
    if(!dragging) return;
    const { W, H } = bounds();
    const rect = (e.target as HTMLCanvasElement).getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setOverlayPos({
      x: Math.max(0, Math.min(x - (dragOffset as any).current.x, W - overlaySize)),
      y: Math.max(0, Math.min(y - (dragOffset as any).current.y, H - overlaySize)),
    });
  }
  function onCanvasMouseUp(){ setDragging(false); }

  function onTouchStart(e: React.TouchEvent){
    if(!overlayImage) return;
    const touch = e.touches[0];
    const rect = (e.target as HTMLCanvasElement).getBoundingClientRect();
    const x = touch.clientX - rect.left;
    const y = touch.clientY - rect.top;
    const r = overlaySize/2;
    const cx = overlayPos.x + r;
    const cy = overlayPos.y + r;
    const inside = Math.hypot(x - cx, y - cy) <= r;
    if(inside){
      setDragging(true);
      (dragOffset as any).current = { x: x - overlayPos.x, y: y - overlayPos.y };
    }
  }
  function onTouchMove(e: React.TouchEvent){
    if(!dragging) return;
    const { W, H } = bounds();
    const touch = e.touches[0];
    const rect = (e.target as HTMLCanvasElement).getBoundingClientRect();
    const x = touch.clientX - rect.left;
    const y = touch.clientY - rect.top;
    setOverlayPos({
      x: Math.max(0, Math.min(x - (dragOffset as any).current.x, W - overlaySize)),
      y: Math.max(0, Math.min(y - (dragOffset as any).current.y, H - overlaySize)),
    });
  }
  function onTouchEnd(){ setDragging(false); }

  function downloadCanvas(){
    const canvas = canvasRef.current; if(!canvas) return;
    const a = document.createElement('a');
    a.download = 'ai-fashion-gift.png';
    a.href = canvas.toDataURL('image/png');
    a.click();
  }
  function shareIfSupported(){
    const canvas = canvasRef.current; if(!canvas) return;
    canvas.toBlob(async (blob)=>{
      if(!blob) return;
      const file = new File([blob], 'ai-fashion-gift.png', { type:'image/png' });
      if((navigator as any).share){
        try{
          await (navigator as any).share({ files:[file], title:'AIコーデ画像', text:'AIがコーデした画像をInstagramにアップ！' });
        }catch{}
      }else{
        alert('共有シートに未対応のブラウザです。ダウンロードしてInstagramアプリから投稿してください。');
      }
    });
  }

  const captionForFirst = useMemo(()=> outfits[0]?.caption ?? '', [outfits]);

  return (
    <div className="container">
      {/* 省略：残りのUIはそのまま（前回のままでOK） */}
      {/* ... 上部フォームとおすすめコーデの部分は変更不要 ... */}

      <div id="editor" className="card" style={{marginTop:16}}>
        <h2>顔はめエディタ（ドラッグで位置、スライダーで大きさ）</h2>
        <div className="small">※ 高精度な自動合成ではなく、楽しく “顔はめ” して仕上げる簡易版です。</div>
        <div className="canvas-wrap" style={{marginTop:10}}>
          <canvas
            ref={canvasRef}
            onMouseDown={onCanvasMouseDown}
            onMouseMove={onCanvasMouseMove}
            onMouseUp={onCanvasMouseUp}
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
            style={{width:'100%', height:'auto', background:'#0b0b0c'}}
          />
        </div>
        <div className="toolbar">
          <label>顔サイズ</label>
          <input type="range" min={80} max={280} value={overlaySize} onChange={e=>setOverlaySize(parseInt(e.target.value))} />
          <button onClick={()=>{ setOverlayPos({x:100,y:40}); setOverlaySize(160); }}>位置リセット</button>
          <button onClick={downloadCanvas}>画像をダウンロード</button>
          <button onClick={shareIfSupported}>共有（iPhone推奨）</button>
        </div>
        <hr/>
        <div>
          <label>Instagram向けキャプション例</label>
          <textarea readOnly value={captionForFirst} rows={4} />
          <div className="small">コピーしてInstagramに貼り付けてください。</div>
        </div>
      </div>
    </div>
  );
}
