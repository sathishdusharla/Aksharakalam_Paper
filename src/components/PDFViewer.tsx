import React, { useEffect, useState } from 'react';

interface PDFViewerProps {
  url: string;
  className?: string;
  style?: React.CSSProperties;
}

const PDFViewer: React.FC<PDFViewerProps> = ({ url, className, style }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    if (url) {
      setLoading(true);
      setError('');
      
      // Test the URL and set loading to false after a brief delay
      const timer = setTimeout(() => {
        setLoading(false);
      }, 1000);

      return () => clearTimeout(timer);
    } else {
      setLoading(false);
      setError('No PDF URL provided');
    }
  }, [url]);

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '600px',
        background: '#f8fafc',
        border: '1px solid #e2e8f0',
        borderRadius: '8px',
        ...style 
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ 
            width: '40px', 
            height: '40px', 
            border: '4px solid #e2e8f0',
            borderTop: '4px solid #3b82f6',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 15px'
          }}></div>
          <p style={{ color: '#64748b', fontSize: '16px', margin: 0 }}>Loading PDF...</p>
        </div>
      </div>
    );
  }

  if (error || !url) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '600px',
        background: '#f8fafc',
        border: '1px solid #e2e8f0',
        borderRadius: '8px',
        ...style 
      }}>
        <div style={{ textAlign: 'center' }}>
          <p style={{ color: '#ef4444', fontSize: '16px', margin: '0 0 15px 0' }}>
            ⚠️ Unable to load PDF
          </p>
          <p style={{ color: '#64748b', fontSize: '14px', margin: 0 }}>
            Please try refreshing the page or contact support
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={className} style={style}>
      <div style={{
        width: '100%',
        height: '100%',
        minHeight: '600px',
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '8px',
        overflow: 'hidden',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
      }}>
        {/* PDF Viewer Container */}
        <div style={{
          width: '100%',
          height: '100%',
          position: 'relative',
          background: '#ffffff'
        }}>
          {/* Primary PDF Display Method */}
          <iframe
            src={url}
            style={{
              width: '100%',
              height: '100%',
              minHeight: '600px',
              border: 'none',
              display: 'block',
              background: '#ffffff'
            }}
            title="PDF Document Viewer"
            onLoad={() => {
              console.log('PDF iframe loaded successfully');
            }}
            onError={() => {
              console.error('PDF iframe failed to load');
              setError('Failed to display PDF');
            }}
          />
          
          {/* Fallback for browsers that don't support iframe PDF viewing */}
          <div style={{
            position: 'absolute',
            bottom: '20px',
            right: '20px',
            zIndex: 10
          }}>
            <button
              onClick={() => window.open(url, '_blank')}
              style={{
                padding: '10px 16px',
                background: '#3b82f6',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '500',
                boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.background = '#2563eb';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.background = '#3b82f6';
              }}
            >
              <span>📄</span>
              Open Full Screen
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PDFViewer;