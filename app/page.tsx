'use client';
<div className="grid cols-3" style={{marginTop:8}}>
{outfits.map((o, i)=> (
<div key={i} className="card" style={{background:'#0f0f11'}}>
<div className="badge">{o.vibe}</div>
<h3 style={{margin:'6px 0 8px'}}>{o.name}</h3>
<div className="small">想定シーン：{o.occasion}</div>
<hr/>
<div>
<strong>アイテム</strong>
<ul>{o.items.map((it,ix)=><li key={ix} className="small">・{it}</li>)}</ul>
</div>
<div className="small">カラー：{o.colors.join(', ')}</div>
<div className="small">価格帯：{o.price_range}</div>
<hr/>
<div className="actions">
<button onClick={()=>generateLook(i,o)} disabled={!!genLoading[String(i)]} style={{background:'#22c55e',borderColor:'#16a34a'}}>
{genLoading[String(i)] ? '生成中…' : 'この案で画像を作る'}
</button>
</div>
</div>
))}
</div>
</div>
)}


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
<button onClick={()=>{ setOverlayPos({x:220,y:80}); setOverlaySize(160); }}>位置リセット</button>
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


<div className="footer small">
<div className="notice warn">プライバシー注意：本人の同意がある写真のみ使用してください。端末上で編集され、顔画像はサーバーに保存しません。</div>
</div>
</div>
);
}
