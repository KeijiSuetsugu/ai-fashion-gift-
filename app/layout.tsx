import type { Metadata } from 'next';


export const metadata: Metadata = {
title: 'AI Fashion Gift',
description: 'Upload a face, get AI-styled outfits, and export an Instagram-ready image.',
manifest: '/manifest.json',
};


export default function RootLayout({ children }: { children: React.ReactNode }) {
return (
<html lang="ja">
<body style={{ fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial' }}>
{children}
</body>
</html>
);
}
