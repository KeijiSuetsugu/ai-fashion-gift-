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
  // --- form state ---
  const [faceFile, setFaceFile] = useState<File | null>(null);
  const [faceURL, setFaceURL] = useState<string>('');
  const [notes, setNotes] = useState('');
  const [age, setAge] = useState('45');
  const [style, setStyle] = useState('キレイめ / モード');
  const [sizes, setSizes] = useState('トップスM / ボトムM / 足24.0');
  const [budget, setBudget] = useState('1〜2万円/コーデ');
  const [colors, setColors] = useState('黒, ベージュ, 白, ブラウン, ネイビー');
  const [occasion, setOccasion] = useState('誕生日ディナー / 週末のおでかけ / 仕事後の食事');

  // --- result state ---
  const [outfits, setOutfits] = useState<Outfit[]>([]);
  const [pending, setPending] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string>('');

  // --- image generation / canvas state ---
  const [genLoading, setGenLoading] = useState<{ [k: string]: boolean }>({});
  const [genImageMap, setGenImageMap] = useState<{ [k: string]: string }>({});
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [baseImage, setBaseImage] = useState<HTMLImageElement | null>(null);
  const [overlayImage, setOverlayImage] = useState<HTMLImageElement | null>(null);
  const [overlayPos, setOverlayPos] = useState({ x: 100, y: 40 });
  const [overlaySize, setOverlaySize] = useState(160);
  const [dragging, setDragging] = useState(false);
  const dragOffset = useRef({ x: 0, y: 0 });

  // face file preview
  useEffect(() => {
    if (faceFile) {
      const url = URL.createObjectURL(faceFile);
      setFaceURL(url);
      const img = new Image();
      img.onload = () => setOverlayImage(img);
      img.src = url;
    } else {
      setFaceURL('');
      setOverlayImage(null);
    }
  }, [faceFile]);

  function onFaceSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!f.type.startsWith('image/')) {
      alert('画像ファイルを選択してください');
      return;
    }
    setFaceFile(f);
  }

  // ====== API call with robust error handling ======
  async function getRecommendations() {
    if (!faceFile) {
      alert('先に顔写真をアップロードしてください');
      return;
    }
    setErrorMsg('');
    try {
      setPending(true);
      const payload = { age, style, sizes, budget, colors, occasion, notes };
      const res = await fetch('/api/recommend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        // show server detail if provided
        let detail = '';
        try {
          const j = await res.json();
          detail = j?.error ? `${j.error}${j.detail ? `\n${j.detail}` : ''}` : await res.text();
        } catch {
          detail = await res.text();
        }
        setErrorMsg(`おすすめ取得に失敗しました。\n${detail}`);
        return;
      }

      const data = await res.json();
      setOutfits(data.outfits || []);
      if (!data.outfits?.length) {
        setErrorMsg('AI応答が空でした。サンプルを表示しています。');
      }
      window.scrollTo({ top: 900, behavior: 'smooth' });
    } catch (e: any) {
      setErrorMsg(`ネットワークまたは実行時エラー: ${e?.message ?? e}`);
    } finally {
      setPending(false);
    }
  }

  // ====== Local sample (no API) ======
  function loadSample() {
    const cols = (colors || 'black, beige, white')
      .split(/[、,]/)
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, 3);

    setOutfits([
      {
        name: 'Smart casual set',
        vibe: 'clean & modern',
        items: ['tailored blazer', 'silk-like blouse', 'straight trousers', 'pointed-toe pumps'],
        colors: cols,
        accessories: ['simple earrings', 'leather mini shoulder'],
        occasion: occasion || 'dinner',
        price_range: budget || '¥10,000–¥20,000',
        caption: 'Tried a clean & modern look! #ootd #style #fashion',
        prompt:
          'full-body fashion model, studio backdrop, soft key light, natural pose; tailored blazer, blouse, straight trousers, pointed-toe pumps; clean & modern',
      },
      {
        name: 'Relaxed weekend',
        vibe: 'cozy chic',
        items: ['knit cardigan', 'boat-neck tee', 'satin skirt', 'ballet flats'],
        colors: cols,
        accessories: ['simple earrings', 'leather mini shoulder'],
        occasion: occasion || 'walk',
        price_range: budget || '¥10,000–¥20,000',
        caption: 'Weekend cozy chic 🌿 #weekendstyle #minimal',
        prompt:
          'full-body fashion model, soft daylight, casual pose; knit cardigan, boat-neck tee, satin skirt, ballet flats; cozy chic',
      },
      {
        name: 'Monotone mode',
        vibe: 'minimal mode',
        items: ['boxy jacket', 'tucked top', 'tapered pants', 'chunky loafers'],
        colors: cols,
        accessories: ['simple earrings', 'leather mini shoulder'],
        occasion: occasion || 'cafe',
        price_range: budget || '¥10,000–¥20,000',
        caption: 'Monotone minimal 🖤 #mode #monotone',
        prompt:
          'full-body fashion model, clean studio, high key light; monochrome outfit with boxy jacket, tapered pants; minimal mode',
      },
    ]);
    setErrorMsg('サンプルで表示中（APIを使わずにテスト）');
    setTimeout(() => {
      document.getElementById('editor')?.scrollIntoView({ behavior: 'smooth' });
    }, 300);
  }

  // ====== Generate base model image ======
  async function generateLook(idx: number, outfit: Outfit) {
    try {
      setGenLoading((s) => ({ ...s, [String(idx)]: true }));
      const res = await fetch('/api/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: outfit.prompt }),
      });
      if (!res.ok) {
        throw new Error(await res.text());
      }
      const data = await res.json();
      const b64 = data.b64;
      if (!b64) throw new Error('no image');
      const imgUrl = 'data:image/png;base64,' + b64;
      setGenImageMap((m) => ({ ...m, [String(idx)]: imgUrl }));
      const img = new Image();
      img.onload = () => {
        setBaseImage(img);
        const W = img.naturalWidth || 1024;
        setOverlayPos({ x: Math.max(0, Math.floor(W / 2 - overlaySize / 2)), y: 40 });
      };
      img.src = imgUrl;
      setOverlaySize(160);
      setTimeout(() => {
        document.getElementById('editor')?.scrollIntoView({ behavior: 'smooth' });
      }, 300);
    } catch (e: any) {
      alert(`画像生成に失敗: ${e?.message ?? e}`);
    } finally {
      setGenLoading((s) => ({ ...s, [String(idx)]: false }));
    }
  }

  // ====== Canvas draw ======
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !baseImage) return;
    const ctx = canvas.getContext('2d')!;
    const W = baseImage.naturalWidth || baseImage.width || 1024;
    const H = baseImage.naturalHeight || baseImage.height || 1024;
    canvas.width = W;
    canvas.height = H;

    ctx.clearRect(0, 0, W, H);
    ctx.drawImage(baseImage, 0, 0, W, H);

    if (overlayImage) {
      const r = overlaySize / 2;
      const cx = overlayPos.x + r;
      const cy = overlayPos.y + r;
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.closePath();
      ctx.clip();

      const scale = Math.max(overlaySize / overlayImage.width, overlaySize / overlayImage.height);
      const drawW = overlayImage.width * scale;
      const drawH = overlayImage.height * scale;
      const dx = overlayPos.x + (overlaySize - drawW) / 2;
      const dy = overlayPos.y + (overlaySize - drawH) / 2;
      ctx.drawImage(overlayImage, dx, dy, drawW, drawH);
      ctx.restore();

      ctx.strokeStyle = 'rgba(255,255,255,.8)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.stroke();
    }
  }, [baseImage, overlayImage, overlayPos, overlaySize]);

  // ====== Canvas helpers ======
  function bounds() {
    const c = canvasRef.current;
    const W = c?.width ?? 1024;
    const H = c?.height ?? 1024;
    return { W, H };
  }

  function onCanvasMouseDown(e: React.MouseEvent) {
    if (!overlayImage) return;
    const rect = (e.target as HTMLCanvasElement).getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const r = overlaySize / 2;
    const cx = overlayPos.x + r;
    const cy = overlayPos.y + r;
    const inside = Math.hypot(x - cx, y - cy) <= r;
    if (inside) {
      setDragging(true);
      (dragOffset as any).current = { x: x - overlayPos.x, y: y - overlayPos.y };
    }
  }
  function onCanvasMouseMove(e: React.MouseEvent) {
    if (!dragging) return;
    const { W, H } = bounds();
    const rect = (e.target as HTMLCanvasElement).getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setOverlayPos({
      x: Math.max(0, Math.min(x - (dragOffset as any).current.x, W - overlaySize)),
      y: Math.max(0, Math.min(y - (dragOffset as any).current.y, H - overlaySize)),
    });
  }
  function onCanvasMouseUp() {
    setDragging(false);
  }

  function onTouchStart(e: React.TouchEvent) {
    if (!overlayImage) return;
    const touch = e.touches[0];
    const rect = (e.target as HTMLCanvasElement).getBoundingClientRect();
    const x = touch.clientX - rect.left;
    const y = touch.clientY - rect.top;
    const r = overlaySize / 2;
    const cx = overlayPos.x + r;
    const cy = overlayPos.y + r;
    const inside = Math.hypot(x - cx, y - cy) <= r;
    if (inside) {
      setDragging(true);
      (dragOffset as any).current = { x: x - overlayPos.x, y: y - overlayPos.y };
    }
  }
  function onTouchMove(e: React.TouchEvent) {
    if (!dragging) return;
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
  function onTouchEnd() {
    setDragging(false);
  }

  function downloadCanvas() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const a = document.createElement('a');
    a.download = 'ai-fashion-gift.png';
    a.href = canvas.toDataURL('image/png');
    a.click();
  }
  function shareIfSupported() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.toBlob(async (blob) => {
      if (!blob) return;
      const file = new File([blob], 'ai-fashion-gift.png', { type: 'image/png' });
      if ((navigator as any).share) {
        try {
          await (navigator as any).share({
            files: [file],
            title: 'AIコーデ画像',
            text: 'AIがコーデした画像をInstagramにアップ！',
          });
        } catch {
          /* user canceled */
        }
      } else {
        alert('共有シートに未対応のブラウザです。ダウンロードしてInstagramアプリから投稿してください。');
      }
    });
  }

  const captionForFirst = useMemo(() => outfits[0]?.caption ?? '', [outfits]);

  // ====== UI ======
  return (
    <div className="container">
      <div className="header">
        <div className="brand">
          <div className="logo" />
          <span>AI Fashion Gift</span>
          <span className="tag">iPhone対応 / Instagram向け</span>
        </div>
        <a className="link" href="https://vercel.com/new" target="_blank" rel="noreferrer">
          Deploy
        </a>
      </div>

      {/* error message box */}
      {errorMsg && (
        <div className="notice warn" style={{ whiteSpace: 'pre-wrap', marginTop: 8 }}>
          {errorMsg}
        </div>
      )}

      <div className="card">
        <h1>友達の奥様向け：AIコーデ提案 & 顔はめ画像作成</h1>
        <div className="notice ok" style={{ marginTop: 8 }}>
          iPhoneでもOK。写真をアップ → 欲しいイメージを入力 → AIがコーデ案と画像を作ります。
        </div>
        <div className="row cols-2" style={{ marginTop: 12 }}>
          <div>
            <label>顔写真（正面・明るめ推奨）</label>
            <input type="file" accept="image/*" capture="environment" onChange={onFaceSelect} />
            <div className="preview" style={{ marginTop: 8 }}>
              {faceURL ? <img src={faceURL} alt="face" style={{ maxHeight: 160, borderRadius: 12 }} /> : 'ここにプレビュー'}
            </div>
            <p className="small">※個人情報なので、不要になったらアプリから削除してください。</p>
          </div>
          <div>
            <label>スタイル</label>
            <input value={style} onChange={(e) => setStyle(e.target.value)} placeholder="例：キレイめ / モード / フェミニン" />
            <label>年齢（目安）</label>
            <input value={age} onChange={(e) => setAge(e.target.value)} />
            <label>サイズ（わかる範囲）</label>
            <input value={sizes} onChange={(e) => setSizes(e.target.value)} placeholder="トップス・ボトム・足サイズなど" />
            <label>好きな色</label>
            <input value={colors} onChange={(e) => setColors(e.target.value)} />
            <label>予算めやす</label>
            <input value={budget} onChange={(e) => setBudget(e.target.value)} />
            <label>着用シーン</label>
            <input value={occasion} onChange={(e) => setOccasion(e.target.value)} />
            <label>特記事項（要望）</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="体型カバー、苦手素材、避けたい色など"
              rows={4}
            />
            <div className="actions" style={{ marginTop: 10, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button
                onClick={getRecommendations}
                disabled={pending}
                style={{ background: '#2563eb', borderColor: '#1d4ed8' }}
              >
                AIにコーデ案を作ってもらう
              </button>
              <button onClick={loadSample} style={{ background: '#6b7280', borderColor: '#4b5563' }}>
                サンプルで試す
              </button>
            </div>
          </div>
        </div>
      </div>

      {outfits.length > 0 && (
        <div className="card" style={{ marginTop: 16 }}>
          <h2>おすすめコーデ（3案）</h2>
          <div className="grid cols-3" style={{ marginTop: 8 }}>
            {outfits.map((o, i) => (
              <div key={i} className="card" style={{ background: '#0f0f11' }}>
                <div className="badge">{o.vibe}</div>
                <h3 style={{ margin: '6px 0 8px' }}>{o.name}</h3>
                <div className="small">想定シーン：{o.occasion}</div>
                <hr />
                <div>
                  <strong>アイテム</strong>
                  <ul>{o.items.map((it, ix) => <li key={ix} className="small">・{it}</li>)}</ul>
                </div>
                <div className="small">カラー：{o.colors.join(', ')}</div>
                <div className="small">価格帯：{o.price_range}</div>
                <hr />
                <div className="actions">
                  <button
                    onClick={() => generateLook(i, o)}
                    disabled={!!genLoading[String(i)]}
                    style={{ background: '#22c55e', borderColor: '#16a34a' }}
                  >
                    {genLoading[String(i)] ? '生成中…' : 'この案で画像を作る'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div id="editor" className="card" style={{ marginTop: 16 }}>
        <h2>顔はめエディタ（ドラッグで位置、スライダーで大きさ）</h2>
        <div className="small">※ 高精度な自動合成ではなく、楽しく “顔はめ” して仕上げる簡易版です。</div>
        <div className="canvas-wrap" style={{ marginTop: 10 }}>
          <canvas
            ref={canvasRef}
            onMouseDown={onCanvasMouseDown}
            onMouseMove={onCanvasMouseMove}
            onMouseUp={onCanvasMouseUp}
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
            style={{ width: '100%', height: 'auto', background: '#0b0b0c' }}
          />
        </div>
        <div className="toolbar">
          <label>顔サイズ</label>
          <input
            type="range"
            min={80}
            max={280}
            value={overlaySize}
            onChange={(e) => setOverlaySize(parseInt(e.target.value))}
          />
          <button
            onClick={() => {
              setOverlayPos({ x: 100, y: 40 });
              setOverlaySize(160);
            }}
          >
            位置リセット
          </button>
          <button onClick={downloadCanvas}>画像をダウンロード</button>
          <button onClick={shareIfSupported}>共有（iPhone推奨）</button>
        </div>
        <hr />
        <div>
          <label>Instagram向けキャプション例</label>
          <textarea readOnly value={captionForFirst} rows={4} />
          <div className="small">コピーしてInstagramに貼り付けてください。</div>
          <button
            onClick={() => {
              navigator.clipboard?.writeText(captionForFirst || '');
            }}
            style={{ marginTop: 8 }}
          >
            キャプションをコピー
          </button>
        </div>
      </div>
    </div>
  );
}
