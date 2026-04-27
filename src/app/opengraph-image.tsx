import { ImageResponse } from 'next/og';

export const alt = 'イラスト検索';
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = 'image/png';

export default function OgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%)',
          fontFamily: 'sans-serif',
        }}
      >
        <div style={{ fontSize: 80, fontWeight: 'bold', color: 'white', marginBottom: 20 }}>
          イラスト検索
        </div>
        <div style={{ fontSize: 36, color: '#bfdbfe', textAlign: 'center' }}>
          Twitter(X)のイラストをまとめて探せる検索サイト
        </div>
      </div>
    ),
    { ...size }
  );
}
