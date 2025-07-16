import React, { useContext, useState, useEffect } from 'react';
import { Search, FileText, Download, Trash2, Eye, X, ArrowLeft } from 'lucide-react';
import { PaperContext } from '../context/PaperContext';
import { NotificationContext } from '../context/NotificationContext';
import { FileStorageManager } from '../utils/fileStorage';
import PDFViewer from '../components/PDFViewer';

const Archive: React.FC = () => {
  const { papers, deletePaper } = useContext(PaperContext);
  const { showNotification } = useContext(NotificationContext);
  const [searchQuery, setSearchQuery] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [paperToDelete, setPaperToDelete] = useState<any>(null);
  const [viewingPaper, setViewingPaper] = useState<any>(null);
  const [pdfUrl, setPdfUrl] = useState<string>('');
  const [pdfError, setPdfError] = useState<boolean>(false);
  const [loadingPdf, setLoadingPdf] = useState<boolean>(false);
  const fileManager = FileStorageManager.getInstance();

  const filteredPapers = papers.filter(paper =>
    paper.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    paper.originalName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      showNotification(`Found ${filteredPapers.length} results for "${searchQuery}"`, 'info', 3000);
    }
  };

  const handleViewPaper = async (paper: any, e: React.MouseEvent) => {
    e.stopPropagation();
    setLoadingPdf(true);
    setPdfError(false);
    setViewingPaper(paper);
    
    try {
      console.log('Loading PDF for archive viewing:', paper.title);
      const url = await fileManager.getFileUrl(paper.storedFile.id);
      if (url) {
        setPdfUrl(url);
        showNotification(`Loading "${paper.title}"...`, 'info', 2000);
      } else {
        throw new Error('Failed to get PDF URL');
      }
    } catch (error) {
      console.error('Error loading PDF for archive viewing:', error);
      setPdfError(true);
      setPdfUrl('');
      showNotification('Failed to load PDF. Please try again.', 'error');
    } finally {
      setLoadingPdf(false);
    }
  };

  const handleClosePdfViewer = () => {
    setViewingPaper(null);
    setPdfUrl('');
    setPdfError(false);
    setLoadingPdf(false);
    
    // Cleanup file URL if it exists
    if (pdfUrl) {
      fileManager.cleanupFileUrl(pdfUrl);
    }
  };

  const handleDeletePaper = (paper: any, e: React.MouseEvent) => {
    e.stopPropagation();
    setPaperToDelete(paper);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (paperToDelete) {
      try {
        await deletePaper(paperToDelete.id);
        showNotification(`"${paperToDelete.title}" has been deleted`, 'success');
        setShowDeleteModal(false);
        setPaperToDelete(null);
      } catch (error) {
        console.error('Error deleting paper:', error);
        showNotification('Failed to delete paper', 'error');
      }
    }
  };

  const cancelDelete = () => {
    setShowDeleteModal(false);
    setPaperToDelete(null);
  };

  const downloadAllPapers = async () => {
    if (papers.length === 0) {
      showNotification('No papers available for download.', 'info');
      return;
    }
    
    showNotification(`Starting download of ${papers.length} papers...`, 'info');
    
    for (let i = 0; i < papers.length; i++) {
      const paper = papers[i];
      try {
        const fileUrl = await fileManager.getFileDataUrl(paper.storedFile.id);
        if (fileUrl) {
          await new Promise(resolve => setTimeout(resolve, i * 500)); // Delay between downloads
          const link = document.createElement('a');
          link.href = fileUrl;
          link.download = paper.originalName;
          link.style.display = 'none';
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        }
      } catch (error) {
        console.error(`Error downloading paper ${paper.originalName}:`, error);
      }
    }
    
    showNotification('All papers downloaded successfully!', 'success');
  };

  return (
    <main>
      <div className="container">
        {viewingPaper ? (
          // PDF Viewer Mode
          <div>
            <div className="page-header" style={{ marginBottom: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                <button 
                  onClick={handleClosePdfViewer}
                  className="btn btn-secondary"
                  style={{ padding: '10px 15px' }}
                >
                  <ArrowLeft size={16} />
                  Back to Archive
                </button>
                <div>
                  <h1 className="page-title" style={{ margin: '0', fontSize: '1.8rem' }}>
                    {viewingPaper.title}
                  </h1>
                  <p style={{ margin: '5px 0 0 0', color: 'var(--text-secondary)' }}>
                    {new Date(viewingPaper.date).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })} • {viewingPaper.originalName} • {(viewingPaper.size / (1024 * 1024)).toFixed(2)} MB
                  </p>
                </div>
              </div>
            </div>
            
            <div style={{ 
              background: 'var(--bg-secondary)', 
              borderRadius: '16px', 
              padding: '20px',
              minHeight: '600px'
            }}>
              {loadingPdf ? (
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'center', 
                  alignItems: 'center', 
                  minHeight: '500px',
                  flexDirection: 'column',
                  gap: '15px'
                }}>
                  <div className="loading"></div>
                  <p style={{ color: 'var(--text-secondary)' }}>Loading PDF...</p>
                </div>
              ) : pdfError ? (
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'center', 
                  alignItems: 'center', 
                  minHeight: '500px',
                  flexDirection: 'column',
                  gap: '15px'
                }}>
                  <p style={{ color: '#ef4444', fontSize: '1.1rem' }}>⚠️ Failed to load PDF</p>
                  <p style={{ color: 'var(--text-secondary)' }}>Please try again or contact support</p>
                  <button 
                    onClick={() => handleViewPaper(viewingPaper, { stopPropagation: () => {} } as React.MouseEvent)}
                    className="btn btn-primary"
                  >
                    Retry Loading
                  </button>
                </div>
              ) : pdfUrl ? (
                <PDFViewer 
                  url={pdfUrl}
                  style={{ 
                    width: '100%',
                    borderRadius: '12px',
                    overflow: 'hidden'
                  }}
                />
              ) : null}
            </div>
          </div>
        ) : (
          // Archive List Mode
          <>
            <div className="page-header">
              <h1 className="page-title">Archive</h1>
              <p>Browse through our collection of past editions</p>
            </div>

            <div className="archive-search-section">
              <form onSubmit={handleSearch} className="archive-search-form">
                <div className="search-box">
                  <input
                    type="text"
                    className="search-input"
                    placeholder="Search archives by title or filename..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                  <button type="submit" className="search-btn">
                    <Search size={18} />
                  </button>
                </div>
              </form>
              
              {papers.length > 0 && (
                <button className="btn btn-accent download-all-btn" onClick={downloadAllPapers}>
                  <Download size={18} />
                  Download All ({papers.length})
                </button>
              )}
            </div>

            <div className="archive-results">
              {searchQuery && (
                <p className="search-results-text">
                  {filteredPapers.length > 0 
                    ? `Found ${filteredPapers.length} result${filteredPapers.length !== 1 ? 's' : ''} for "${searchQuery}"`
                    : `No results found for "${searchQuery}"`
                  }
                </p>
              )}
            </div>

            <div className="archive-grid">
              {filteredPapers.length > 0 ? (
                filteredPapers.map((paper, index) => (
                  <div
                    key={paper.id}
                    className="archive-item"
                    style={{
                      opacity: 0,
                      animation: `fadeInUp 0.6s ease ${index * 0.1}s forwards`
                    }}
                  >
                    <div className="archive-thumbnail">
                      <FileText size={48} style={{ color: '#ef4444' }} />
                    </div>
                    <div className="archive-info">
                      <div className="archive-date">
                        {new Date(paper.date).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </div>
                      <div className="archive-title">{paper.title}</div>
                      <div className="archive-excerpt">
                        File: {paper.originalName} • Size: {(paper.size / (1024 * 1024)).toFixed(2)} MB
                      </div>
                      <div className="archive-tags">
                        <span className="tag">PDF</span>
                        <span className="tag">Edition</span>
                        <span className="tag">Archive</span>
                      </div>
                    </div>
                    <div className="archive-actions">
                      <button 
                        className="btn btn-primary btn-sm"
                        onClick={(e) => handleViewPaper(paper, e)}
                        disabled={loadingPdf}
                      >
                        <Eye size={16} />
                        View
                      </button>
                      <button 
                        className="btn btn-danger btn-sm"
                        onClick={(e) => handleDeletePaper(paper, e)}
                      >
                        <Trash2 size={16} />
                        Delete
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="archive-empty">
                  {searchQuery ? (
                    <div>
                      <h3>No Results Found</h3>
                      <p>No papers found matching "{searchQuery}"</p>
                      <button 
                        className="btn btn-secondary"
                        onClick={() => setSearchQuery('')}
                      >
                        Clear Search
                      </button>
                    </div>
                  ) : (
                    <div>
                      <h3>No Papers in Archive</h3>
                      <p>Upload some papers in the Admin panel to see them here!</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </>
        )}

        {showDeleteModal && paperToDelete && (
          <div className="delete-modal">
            <div className="delete-modal-content">
              <h3>Confirm Deletion</h3>
              <p>Are you sure you want to delete "{paperToDelete.title}"?</p>
              <div className="delete-modal-actions">
                <button className="btn btn-danger" onClick={confirmDelete}>
                  Delete
                </button>
                <button className="btn btn-secondary" onClick={cancelDelete}>
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
};

export default Archive;