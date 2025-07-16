import React, { useContext, useEffect, useState } from 'react';
import { Download, Share2, Printer } from 'lucide-react';
import { PaperContext } from '../context/PaperContext';
import { NotificationContext } from '../context/NotificationContext';
import { FileStorageManager } from '../utils/fileStorage';
import PDFViewer from '../components/PDFViewer';

const Home: React.FC = () => {
  const { totalPapers, getTodaysPaper, getLatestPaper } = useContext(PaperContext);
  const { showNotification } = useContext(NotificationContext);
  const fileManager = FileStorageManager.getInstance();
  const [pdfUrl, setPdfUrl] = useState<string>('');
  const [pdfError, setPdfError] = useState<boolean>(false);
  
  // Get today's paper first, if not available get the latest paper
  const todaysPaper = getTodaysPaper();
  const latestPaper = getLatestPaper();
  const displayPaper = todaysPaper || latestPaper;

  // Debug function to check storage
  const debugStorage = async () => {
    console.log('=== COMPREHENSIVE STORAGE DEBUG ===');
    console.log('Total papers:', totalPapers);
    console.log('Today\'s paper:', todaysPaper);
    console.log('Latest paper:', latestPaper);
    console.log('Display paper:', displayPaper);
    
    // Check localStorage directly
    console.log('--- LocalStorage Files ---');
    const localStorageKeys = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith('file_')) {
        localStorageKeys.push(key);
        console.log(`Found file key: ${key}`);
      }
    }
    console.log(`Total files in localStorage: ${localStorageKeys.length}`);
    
    // Check papers storage
    const papersData = localStorage.getItem('aksharakalam_papers');
    if (papersData) {
      try {
        const papers = JSON.parse(papersData);
        console.log('Papers in localStorage:', papers);
      } catch (e) {
        console.error('Error parsing papers data:', e);
      }
    } else {
      console.log('No papers data in localStorage');
    }
    
    // Check stored files list
    const storedFiles = localStorage.getItem('stored_files');
    if (storedFiles) {
      try {
        const files = JSON.parse(storedFiles);
        console.log('Stored files list:', files);
      } catch (e) {
        console.error('Error parsing stored files:', e);
      }
    } else {
      console.log('No stored files list in localStorage');
    }
    
    if (displayPaper) {
      console.log('--- Testing Current Paper ---');
      console.log('Paper details:', {
        id: displayPaper.id,
        title: displayPaper.title,
        storedFileId: displayPaper.storedFile?.id
      });
      
      if (displayPaper.storedFile?.id) {
        const fileKey = `file_${displayPaper.storedFile.id}`;
        const fileData = localStorage.getItem(fileKey);
        console.log(`File data exists for ${fileKey}:`, !!fileData);
        
        if (fileData) {
          try {
            const parsed = JSON.parse(fileData);
            console.log('File data info:', {
              hasData: !!parsed.data,
              dataLength: parsed.data?.length || 0,
              dataStart: parsed.data?.substring(0, 50) || 'N/A'
            });
          } catch (e) {
            console.error('Error parsing file data:', e);
          }
        }
        
        try {
          const exists = await fileManager.verifyPermanentStorage(displayPaper.storedFile.id);
          console.log('File exists in storage:', exists);
          
          const url = await fileManager.getFileUrl(displayPaper.storedFile.id);
          console.log('Generated URL:', url);
          
          if (url) {
            // Test the URL directly
            try {
              const response = await fetch(url);
              console.log('URL fetch test:', {
                ok: response.ok,
                status: response.status,
                contentType: response.headers.get('content-type')
              });
            } catch (fetchError) {
              console.error('URL fetch failed:', fetchError);
            }
          }
          
          showNotification(`Debug complete - check console for details`, 'info', 5000);
        } catch (error) {
          console.error('Debug error:', error);
          showNotification(`Debug error: ${error}`, 'error');
        }
      }
    } else {
      showNotification('No paper to debug', 'info');
    }
    
    // Check localStorage and IndexedDB directly
    const storageInfo = fileManager.getStorageInfo();
    console.log('Storage status:', storageInfo);
  };

  // Test PDF upload function
  const testPDFUpload = () => {
    showNotification('Redirecting to Admin page for PDF upload...', 'info');
    window.location.href = '/admin';
  };

  // Test direct PDF URL function
  const testDirectPDF = async () => {
    if (displayPaper?.storedFile?.id) {
      try {
        const url = await fileManager.getFileUrl(displayPaper.storedFile.id);
        if (url) {
          console.log('Opening PDF URL directly:', url);
          window.open(url, '_blank');
          showNotification('PDF URL opened in new tab', 'success');
        } else {
          showNotification('Failed to get PDF URL', 'error');
        }
      } catch (error) {
        console.error('Error getting PDF URL:', error);
        showNotification('Error getting PDF URL: ' + error, 'error');
      }
    } else {
      showNotification('No PDF available to test', 'error');
    }
  };

  // Clear all storage function
  const clearAllStorage = () => {
    if (window.confirm('Are you sure you want to clear ALL stored data? This cannot be undone!')) {
      localStorage.clear();
      showNotification('All storage cleared! Please refresh the page.', 'info');
      setTimeout(() => window.location.reload(), 2000);
    }
  };

  // Load PDF URL when displayPaper changes
  useEffect(() => {
    const loadPdfUrl = async () => {
      if (displayPaper?.storedFile?.id) {
        console.log('Loading PDF for paper:', displayPaper.title);
        console.log('File ID:', displayPaper.storedFile.id);
        try {
          // First verify the file exists
          const fileExists = await fileManager.verifyPermanentStorage(displayPaper.storedFile.id);
          console.log('File exists in storage:', fileExists);
          
          if (!fileExists) {
            console.warn('File not found in storage:', displayPaper.storedFile.id);
            setPdfError(true);
            setPdfUrl('');
            return;
          }
          
          const url = await fileManager.getFileUrl(displayPaper.storedFile.id);
          console.log('Generated PDF URL:', url);
          
          if (url) {
            setPdfUrl(url);
            setPdfError(false);
            console.log('PDF URL set successfully');
          } else {
            console.error('Failed to generate PDF URL');
            setPdfError(true);
            setPdfUrl('');
          }
          
          // Store URL for cleanup
          if (url) {
            return () => {
              fileManager.cleanupFileUrl(url);
            };
          }
        } catch (error) {
          console.error('Error loading PDF:', error);
          setPdfError(true);
          setPdfUrl('');
        }
      } else {
        console.log('No display paper or file ID available');
        // No paper selected - clear states but don't show error
        setPdfUrl('');
        setPdfError(false);
      }
    };

    loadPdfUrl();
  }, [displayPaper, fileManager]);

  const handleDownload = async () => {
    if (displayPaper) {
      try {
        const fileUrl = await fileManager.getFileDataUrl(displayPaper.storedFile.id);
        if (fileUrl) {
          const link = document.createElement('a');
          link.href = fileUrl;
          link.download = displayPaper.originalName;
          link.style.display = 'none';
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          showNotification('Download started!', 'success');
        } else {
          showNotification('File not found!', 'error');
        }
      } catch (error) {
        console.error('Download error:', error);
        showNotification('Download failed!', 'error');
      }
    }
  };

  const handleShare = async () => {
    if (navigator.share && displayPaper) {
      try {
        await navigator.share({
          title: displayPaper.title,
          text: 'Check out today\'s edition of Aksharakalam!',
          url: window.location.href
        });
      } catch (error) {
        // Fallback to clipboard
        navigator.clipboard.writeText(window.location.href);
        showNotification('Link copied to clipboard!', 'success');
      }
    } else {
      navigator.clipboard.writeText(window.location.href);
      showNotification('Link copied to clipboard!', 'success');
    }
  };

  const handlePrint = () => {
    if (displayPaper) {
      window.print();
    } else {
      showNotification('No paper to print!', 'error');
    }
  };

  return (
    <main>
      {/* Hero Section */}
      <section className="hero-section">
        <div className="container">
          <div className="hero-content">
            <h1 className="hero-title">Welcome to Aksharakalam</h1>
            <p className="hero-subtitle">Your premier destination for quality journalism and daily insights</p>
            <div className="hero-stats">
              <div className="stat-item">
                <span className="stat-number" data-count={totalPapers}>{totalPapers}</span>
                <span className="stat-label">Total Editions</span>
              </div>
              <div className="stat-item">
                <span className="stat-number" data-count="50000">50,000+</span>
                <span className="stat-label">Daily Readers</span>
              </div>
              <div className="stat-item">
                <span className="stat-number" data-count="365">365</span>
                <span className="stat-label">Days Active</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="container">
        <div className="page-header">
          <h2 className="page-title">
            {todaysPaper ? "Today's Edition" : "Latest Edition"}
          </h2>
          <div className="date-display">
            {todaysPaper && <span className="live-indicator">TODAY</span>}
            {!todaysPaper && latestPaper && <span className="live-indicator">LATEST</span>}
            <span id="currentDate">
              {displayPaper ? 
                new Date(displayPaper.date).toLocaleDateString('en-US', { 
                  weekday: 'long', 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                }) :
                new Date().toLocaleDateString('en-US', { 
                  weekday: 'long', 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })
              }
            </span>
          </div>
        </div>

        <div className="paper-viewer">
          <div className="paper-content" id="paperContent">
            {displayPaper ? (
              <div className="pdf-container">
                <div className="pdf-header">
                  <h3>{displayPaper.title}</h3>
                  <p>Published: {new Date(displayPaper.date).toLocaleDateString('en-US', { 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}</p>
                </div>
                {pdfUrl ? (
                  <PDFViewer 
                    url={pdfUrl}
                    style={{
                      width: '100%',
                      height: '80vh',
                      minHeight: '600px'
                    }}
                  />
                ) : pdfError ? (
                  <div className="paper-placeholder">
                    <h3>⚠️ PDF Loading Error</h3>
                    <p>The PDF file could not be loaded. This may be due to file corruption or storage issues.</p>
                    <button 
                      onClick={() => window.location.reload()}
                      className="btn btn-primary"
                      style={{ marginTop: '15px' }}
                    >
                      Reload Page
                    </button>
                  </div>
                ) : (
                  <div className="paper-placeholder">
                    <div className="loading" style={{ marginBottom: '15px' }}></div>
                    <h3>Loading PDF...</h3>
                    <p>Please wait while the PDF is being loaded.</p>
                  </div>
                )}
              </div>
            ) : totalPapers > 0 ? (
              <div className="paper-placeholder">
                <h3>📰 Welcome to Aksharakalam</h3>
                <p>You have {totalPapers} paper{totalPapers !== 1 ? 's' : ''} in your collection, but none for today.</p>
                <p style={{ color: 'var(--text-secondary)', marginTop: '15px' }}>
                  Check the <a href="/archive" style={{ color: 'var(--secondary-color)' }}>Archive</a> to view past editions or upload today's edition in the Admin panel.
                </p>
              </div>
            ) : (
              <div className="paper-placeholder">
                <h3>📰 Welcome to Aksharakalam</h3>
                <p>Your daily digital newspaper platform is ready! Experience premium journalism with our digital editions.</p>
                <p style={{ color: 'var(--text-secondary)', marginTop: '15px' }}>
                  <strong>Get Started:</strong> Upload your first PDF in the <a href="/admin" style={{ color: 'var(--secondary-color)' }}>Admin Panel</a> to see it here.
                </p>
                <div style={{ marginTop: '25px' }}>
                  <a href="/admin" className="btn btn-primary" style={{ marginRight: '15px' }}>
                    Upload First Edition
                  </a>
                  <a href="/archive" className="btn btn-secondary">
                    Browse Archive
                  </a>
                </div>
              </div>
            )}
          </div>

          <div className="paper-controls">
            {displayPaper && (
              <>
                <button className="btn btn-primary" onClick={handleDownload}>
                  <Download size={18} />
                  Download PDF
                </button>
                <button className="btn btn-secondary" onClick={handleShare}>
                  <Share2 size={18} />
                  Share
                </button>
                <button className="btn btn-accent" onClick={handlePrint}>
                  <Printer size={18} />
                  Print
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </main>
  );
};

export default Home;