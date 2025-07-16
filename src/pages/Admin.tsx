import React, { useState, useContext, useRef } from 'react';
import { Upload, LogOut, Eye, EyeOff } from 'lucide-react';
import { PaperContext } from '../context/PaperContext';
import { NotificationContext } from '../context/NotificationContext';
import { FileStorageManager } from '../utils/fileStorage';

const ADMIN_EMAIL = 'aksharakalam@gmail.com';
const ADMIN_PASSWORD = 'aksharakalam@123';

const Admin: React.FC = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [paperTitle, setPaperTitle] = useState('');
  const [paperDate, setPaperDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { addPaper } = useContext(PaperContext);
  const { showNotification } = useContext(NotificationContext);
  const fileManager = FileStorageManager.getInstance();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (email === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
      setIsLoggedIn(true);
      showNotification('Login successful! Welcome to admin panel.', 'success');
    } else {
      showNotification('Invalid credentials. Please try again.', 'error');
    }
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setEmail('');
    setPassword('');
    setPaperTitle('');
    setPaperDate(new Date().toISOString().split('T')[0]);
    setSelectedFile(null);
    showNotification('Logged out successfully.', 'info');
  };

  const handleFileSelect = (file: File) => {
    console.log('Admin: File selected:', file.name, 'Type:', file.type, 'Size:', file.size);
    
    if (file.type !== 'application/pdf') {
      showNotification('Only PDF files are allowed.', 'error');
      return;
    }
    
    // Additional validation for file size (optional)
    if (file.size === 0) {
      showNotification('Selected file is empty. Please choose a valid PDF file.', 'error');
      return;
    }
    
    setSelectedFile(file);
    showNotification(`PDF file selected: ${file.name} (${(file.size / (1024 * 1024)).toFixed(2)} MB)`, 'success');
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => {
    setDragOver(false);
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedFile) {
      showNotification('Please select a PDF file to upload.', 'error');
      return;
    }

    if (!paperTitle.trim()) {
      showNotification('Please enter a paper title.', 'error');
      return;
    }

    setIsUploading(true);
    showNotification(`Uploading PDF: ${selectedFile.name} (${(selectedFile.size / (1024 * 1024)).toFixed(2)}MB)`, 'info');

    try {
      console.log('Admin: Starting upload process for file:', selectedFile.name);
      
      // Store file using FileStorageManager
      const storedFile = await fileManager.storeFile(selectedFile);
      console.log('Admin: File stored successfully:', storedFile);
      
      // Verify the file was stored permanently
      await fileManager.ensurePermanentStorage(storedFile.id);
      console.log('Admin: Permanent storage ensured');
      
      // Double-check with storage verification
      const isStoredPermanently = await fileManager.verifyPermanentStorage(storedFile.id);
      console.log('Admin: Storage verification result:', isStoredPermanently);
      
      if (!isStoredPermanently) {
        throw new Error('Failed to achieve permanent storage');
      }
      
      // Test file retrieval immediately
      const testUrl = await fileManager.getFileUrl(storedFile.id);
      console.log('Admin: Test URL generated:', testUrl ? 'Success' : 'Failed');
      if (testUrl) {
        fileManager.cleanupFileUrl(testUrl);
      }
      
      // Create paper data
      const paperData = {
        id: storedFile.id,
        title: paperTitle.trim(),
        date: paperDate,
        originalName: selectedFile.name,
        size: selectedFile.size,
        fileUrl: storedFile.publicPath,
        uploadDate: new Date().toISOString(),
        storedFile: storedFile
      };

      console.log('Admin: Paper data created:', paperData);

      // Add to context
      addPaper(paperData);
      console.log('Admin: Paper added to context');
      
      showNotification(`PDF uploaded and saved permanently! File is stored securely in both localStorage and IndexedDB.`, 'success', 4000);
      
      // Reset form
      setPaperTitle('');
      setPaperDate(new Date().toISOString().split('T')[0]);
      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      
    } catch (error) {
      console.error('Upload error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Upload failed. Please try again.';
      showNotification(errorMessage, 'error');
    } finally {
      setIsUploading(false);
    }
  };

  if (!isLoggedIn) {
    return (
      <main>
        <div className="container">
          <div className="page-header">
            <h1 className="page-title">Admin Portal</h1>
            <p className="date-display">Enter your credentials to access the admin dashboard</p>
          </div>
          
          <div style={{ 
            maxWidth: '500px', 
            margin: '0 auto'
          }}>
            <div className="paper-viewer" style={{ padding: '60px 50px' }}>
              <div style={{ textAlign: 'center', marginBottom: '40px' }}>
                <h3 style={{ 
                  fontFamily: 'Playfair Display, serif',
                  fontSize: '2.2rem', 
                  marginBottom: '12px', 
                  color: 'var(--text-primary)',
                  fontWeight: '600'
                }}>
                  Welcome Back
                </h3>
                <p style={{ 
                  color: 'var(--text-secondary)', 
                  fontSize: '1.1rem',
                  fontWeight: '500'
                }}>
                  Sign in to continue to your admin dashboard
                </p>
              </div>
              
              <form onSubmit={handleLogin}>
                <div style={{ marginBottom: '25px' }}>
                  <label htmlFor="email" style={{ 
                    display: 'block', 
                    marginBottom: '12px', 
                    fontWeight: '600',
                    color: 'var(--text-primary)',
                    fontSize: '0.95rem'
                  }}>
                    Email Address
                  </label>
                  <input
                    type="email"
                    id="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    placeholder="aksharakalam@gmail.com"
                    style={{
                      width: '100%',
                      padding: '16px 20px',
                      border: '2px solid var(--border-color)',
                      borderRadius: '16px',
                      fontSize: '1rem',
                      background: 'var(--bg-secondary)',
                      transition: 'all 0.3s ease',
                      fontFamily: 'Inter, sans-serif'
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = 'var(--secondary-color)';
                      e.target.style.boxShadow = '0 0 0 3px rgba(44, 90, 160, 0.1)';
                      e.target.style.background = 'var(--bg-primary)';
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = 'var(--border-color)';
                      e.target.style.boxShadow = 'none';
                      e.target.style.background = 'var(--bg-secondary)';
                    }}
                  />
                </div>
                
                <div style={{ marginBottom: '30px' }}>
                  <label htmlFor="password" style={{ 
                    display: 'block', 
                    marginBottom: '12px', 
                    fontWeight: '600',
                    color: 'var(--text-primary)',
                    fontSize: '0.95rem'
                  }}>
                    Password
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      id="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      placeholder="Enter your password"
                      style={{
                        width: '100%',
                        padding: '16px 20px',
                        paddingRight: '55px',
                        border: '2px solid var(--border-color)',
                        borderRadius: '16px',
                        fontSize: '1rem',
                        background: 'var(--bg-secondary)',
                        transition: 'all 0.3s ease',
                        fontFamily: 'Inter, sans-serif'
                      }}
                      onFocus={(e) => {
                        e.target.style.borderColor = 'var(--secondary-color)';
                        e.target.style.boxShadow = '0 0 0 3px rgba(44, 90, 160, 0.1)';
                        e.target.style.background = 'var(--bg-primary)';
                      }}
                      onBlur={(e) => {
                        e.target.style.borderColor = 'var(--border-color)';
                        e.target.style.boxShadow = 'none';
                        e.target.style.background = 'var(--bg-secondary)';
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      style={{
                        position: 'absolute',
                        right: '16px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        color: 'var(--text-secondary)',
                        padding: '4px',
                        borderRadius: '8px',
                        transition: 'all 0.3s ease'
                      }}
                      onMouseOver={(e) => {
                        (e.target as HTMLElement).style.background = 'var(--bg-tertiary)';
                        (e.target as HTMLElement).style.color = 'var(--text-primary)';
                      }}
                      onMouseOut={(e) => {
                        (e.target as HTMLElement).style.background = 'none';
                        (e.target as HTMLElement).style.color = 'var(--text-secondary)';
                      }}
                    >
                      {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                  </div>
                </div>
                
                <button 
                  type="submit" 
                  className="btn btn-primary"
                  style={{
                    width: '100%',
                    padding: '16px 30px',
                    fontSize: '1.1rem',
                    fontWeight: '600',
                    marginTop: '10px'
                  }}
                >
                  Sign In to Dashboard
                </button>
              </form>
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main>
      <div className="container">
        <div className="page-header">
          <h1 className="page-title">Admin Dashboard</h1>
          <p className="date-display">Upload and manage your digital newspaper editions</p>
        </div>
        
        <div style={{ maxWidth: '700px', margin: '0 auto' }}>
          <div className="paper-viewer" style={{ position: 'relative', padding: '50px' }}>
            <button 
              onClick={handleLogout}
              className="btn btn-secondary"
              style={{
                position: 'absolute',
                top: '25px',
                right: '25px',
                padding: '10px 20px',
                fontSize: '0.9rem'
              }}
            >
              <LogOut size={16} />
              Logout
            </button>
            
            <div style={{ textAlign: 'center', marginBottom: '40px', paddingRight: '120px' }}>
              <h3 style={{ 
                fontFamily: 'Playfair Display, serif',
                fontSize: '2.2rem', 
                marginBottom: '12px', 
                color: 'var(--text-primary)',
                fontWeight: '600'
              }}>
                Upload New Edition
              </h3>
              <p style={{ 
                color: 'var(--text-secondary)', 
                fontSize: '1.1rem',
                fontWeight: '500'
              }}>
                Add a new PDF edition to your newspaper collection
              </p>
            </div>
            
            <form onSubmit={handleUpload}>
              <div style={{ marginBottom: '25px' }}>
                <label htmlFor="paperTitle" style={{ 
                  display: 'block', 
                  marginBottom: '12px', 
                  fontWeight: '600',
                  color: 'var(--text-primary)',
                  fontSize: '0.95rem'
                }}>
                  Paper Title
                </label>
                <input
                  type="text"
                  id="paperTitle"
                  value={paperTitle}
                  onChange={(e) => setPaperTitle(e.target.value)}
                  required
                  placeholder="Enter paper title"
                  style={{
                    width: '100%',
                    padding: '16px 20px',
                    border: '2px solid var(--border-color)',
                    borderRadius: '16px',
                    fontSize: '1rem',
                    background: 'var(--bg-secondary)',
                    transition: 'all 0.3s ease',
                    fontFamily: 'Inter, sans-serif'
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = 'var(--secondary-color)';
                    e.target.style.boxShadow = '0 0 0 3px rgba(44, 90, 160, 0.1)';
                    e.target.style.background = 'var(--bg-primary)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = 'var(--border-color)';
                    e.target.style.boxShadow = 'none';
                    e.target.style.background = 'var(--bg-secondary)';
                  }}
                />
              </div>
              
              <div style={{ marginBottom: '30px' }}>
                <label htmlFor="paperDate" style={{ 
                  display: 'block', 
                  marginBottom: '12px', 
                  fontWeight: '600',
                  color: 'var(--text-primary)',
                  fontSize: '0.95rem'
                }}>
                  Publication Date
                </label>
                <input
                  type="date"
                  id="paperDate"
                  value={paperDate}
                  onChange={(e) => setPaperDate(e.target.value)}
                  required
                  style={{
                    width: '100%',
                    padding: '16px 20px',
                    border: '2px solid var(--border-color)',
                    borderRadius: '16px',
                    fontSize: '1rem',
                    background: 'var(--bg-secondary)',
                    transition: 'all 0.3s ease',
                    fontFamily: 'Inter, sans-serif'
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = 'var(--secondary-color)';
                    e.target.style.boxShadow = '0 0 0 3px rgba(44, 90, 160, 0.1)';
                    e.target.style.background = 'var(--bg-primary)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = 'var(--border-color)';
                    e.target.style.boxShadow = 'none';
                    e.target.style.background = 'var(--bg-secondary)';
                  }}
                />
              </div>
              
              <div style={{ marginBottom: '30px' }}>
                <label style={{ 
                  display: 'block', 
                  marginBottom: '12px', 
                  fontWeight: '600',
                  color: 'var(--text-primary)',
                  fontSize: '0.95rem'
                }}>
                  PDF File (No size limit)
                </label>
                <div
                  style={{
                    border: `3px dashed ${dragOver ? 'var(--secondary-color)' : 'var(--border-color)'}`,
                    borderRadius: '20px',
                    padding: '50px 30px',
                    textAlign: 'center',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                    background: dragOver ? 'var(--bg-tertiary)' : 'var(--bg-secondary)',
                    position: 'relative',
                    overflow: 'hidden'
                  }}
                  onClick={() => fileInputRef.current?.click()}
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                >
                  <div style={{
                    position: 'absolute',
                    top: '0',
                    left: '0',
                    right: '0',
                    height: '6px',
                    background: selectedFile ? 'var(--gradient-accent)' : 'transparent',
                    transition: 'all 0.3s ease'
                  }}></div>
                  
                  <Upload size={48} style={{ 
                    color: selectedFile ? 'var(--accent-color)' : 'var(--text-secondary)', 
                    marginBottom: '15px',
                    transition: 'all 0.3s ease'
                  }} />
                  
                  {selectedFile ? (
                    <div>
                      <p style={{ 
                        color: 'var(--secondary-color)', 
                        fontWeight: '600', 
                        marginBottom: '8px',
                        fontSize: '1.1rem'
                      }}>
                        📄 {selectedFile.name}
                      </p>
                      <p style={{ 
                        color: 'var(--text-secondary)', 
                        fontSize: '0.95rem',
                        fontWeight: '500'
                      }}>
                        {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB • Ready to upload
                      </p>
                    </div>
                  ) : (
                    <div>
                      <p style={{ 
                        color: 'var(--text-primary)', 
                        fontWeight: '600', 
                        marginBottom: '8px',
                        fontSize: '1.1rem'
                      }}>
                        📁 Click to upload or drag and drop
                      </p>
                      <p style={{ 
                        color: 'var(--text-secondary)', 
                        fontSize: '0.95rem',
                        fontWeight: '500'
                      }}>
                        PDF files only • No size restrictions
                      </p>
                    </div>
                  )}
                </div>
                
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFileSelect(file);
                  }}
                  accept=".pdf"
                  style={{ display: 'none' }}
                />
              </div>
              
              <button 
                type="submit" 
                disabled={isUploading}
                className="btn btn-primary"
                style={{
                  width: '100%',
                  padding: '16px 30px',
                  fontSize: '1.1rem',
                  fontWeight: '600',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '12px'
                }}
              >
                {isUploading ? (
                  <>
                    <div className="loading"></div>
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload size={20} />
                    Upload PDF
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    </main>
  );
};

export default Admin;