// File storage utility for handling PDF files
export interface StoredFile {
  id: string;
  fileName: string;
  originalName: string;
  size: number;
  type: string;
  uploadDate: string;
  publicPath: string;
}

export class FileStorageManager {
  private static instance: FileStorageManager;
  private files: Map<string, StoredFile> = new Map();

  private constructor() {
    this.loadStoredFiles();
    this.initializeDatabase();
  }

  public static getInstance(): FileStorageManager {
    if (!FileStorageManager.instance) {
      FileStorageManager.instance = new FileStorageManager();
    }
    return FileStorageManager.instance;
  }

  private loadStoredFiles(): void {
    try {
      const storedFiles = localStorage.getItem('stored_files');
      if (storedFiles) {
        const filesArray: StoredFile[] = JSON.parse(storedFiles);
        filesArray.forEach(file => {
          this.files.set(file.id, file);
        });
        console.log(`Loaded ${filesArray.length} file records from localStorage`);
      }
      
      // Also try to load from IndexedDB
      this.loadFromIndexedDB();
    } catch (error) {
      console.error('Error loading stored files:', error);
    }
  }

  private async loadFromIndexedDB(): Promise<void> {
    try {
      const request = indexedDB.open('AksharkalamDB', 1);
      
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains('files')) {
          db.createObjectStore('files', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('metadata')) {
          db.createObjectStore('metadata', { keyPath: 'id' });
        }
      };
      
      request.onsuccess = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        const transaction = db.transaction(['metadata'], 'readonly');
        const store = transaction.objectStore('metadata');
        const getAllRequest = store.getAll();
        
        getAllRequest.onsuccess = () => {
          const results = getAllRequest.result;
          if (results && results.length > 0) {
            results.forEach((record: any) => {
              if (record.fileMetadata) {
                this.files.set(record.id, record.fileMetadata);
              }
            });
            console.log(`Loaded ${results.length} file records from IndexedDB`);
          }
          db.close();
        };
      };
    } catch (error) {
      console.error('Error loading from IndexedDB:', error);
    }
  }

  private saveStoredFiles(): void {
    try {
      const filesArray = Array.from(this.files.values());
      localStorage.setItem('stored_files', JSON.stringify(filesArray));
      
      // Also save to IndexedDB for permanence
      this.saveMetadataToIndexedDB(filesArray);
    } catch (error) {
      console.error('Error saving stored files:', error);
    }
  }

  private async saveMetadataToIndexedDB(filesArray: StoredFile[]): Promise<void> {
    try {
      const request = indexedDB.open('AksharkalamDB', 1);
      
      request.onsuccess = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        const transaction = db.transaction(['metadata'], 'readwrite');
        const store = transaction.objectStore('metadata');
        
        // Clear existing metadata and save new
        store.clear();
        filesArray.forEach(file => {
          store.put({ id: file.id, fileMetadata: file });
        });
        
        transaction.oncomplete = () => {
          db.close();
          console.log('Metadata saved to IndexedDB');
        };
      };
    } catch (error) {
      console.error('Error saving metadata to IndexedDB:', error);
    }
  }

  public async storeFile(file: File): Promise<StoredFile> {
    const id = Date.now().toString();
    const fileName = `${id}_${file.name}`;
    const publicPath = `/uploads/${fileName}`;

    console.log(`Storing file: ${file.name} (${(file.size / (1024 * 1024)).toFixed(2)}MB)`);

    try {
      // Convert file to base64 for storage
      const base64Data = await this.fileToBase64(file);
      
      // Store file data in localStorage
      const fileData = {
        fileName,
        originalName: file.name,
        size: file.size,
        type: file.type,
        data: base64Data
      };
      
      // Always try to store in both localStorage and IndexedDB for redundancy
      let localStorageSuccess = false;
      let indexedDBSuccess = false;
      
      try {
        localStorage.setItem(`file_${id}`, JSON.stringify(fileData));
        localStorageSuccess = true;
        console.log(`File stored successfully in localStorage with ID: ${id}`);
      } catch (localStorageError) {
        console.log('localStorage storage failed:', localStorageError);
      }
      
      try {
        await this.storeInIndexedDB(id, fileData);
        indexedDBSuccess = true;
        console.log(`File stored successfully in IndexedDB with ID: ${id}`);
      } catch (indexedDBError) {
        console.log('IndexedDB storage failed:', indexedDBError);
      }
      
      if (!localStorageSuccess && !indexedDBSuccess) {
        throw new Error('Failed to store file in both localStorage and IndexedDB');
      }
      
    } catch (error) {
      console.error('Error storing file:', error);
      throw new Error('Failed to store file. Please try again.');
    }

    const storedFile: StoredFile = {
      id,
      fileName,
      originalName: file.name,
      size: file.size,
      type: file.type,
      uploadDate: new Date().toISOString(),
      publicPath
    };

    this.files.set(id, storedFile);
    this.saveStoredFiles();

    return storedFile;
  }

  public async getFileUrl(fileId: string): Promise<string | null> {
    try {
      console.log(`FileStorage: Getting file URL for ID: ${fileId}`);
      
      // Try localStorage first
      let fileData = localStorage.getItem(`file_${fileId}`);
      let parsed;
      
      if (fileData) {
        parsed = JSON.parse(fileData);
        console.log(`FileStorage: File found in localStorage, size: ${parsed.size || 'unknown'} bytes`);
      } else {
        // Try IndexedDB fallback
        console.log(`FileStorage: File not in localStorage, checking IndexedDB`);
        try {
          const indexedData = await this.getFromIndexedDB(fileId);
          if (indexedData) {
            parsed = indexedData;
            console.log(`FileStorage: File found in IndexedDB, size: ${parsed.size || 'unknown'} bytes`);
          }
        } catch (error) {
          console.log('FileStorage: File not found in IndexedDB either:', error);
        }
      }
      
      if (parsed && parsed.data) {
        console.log(`FileStorage: File data found, converting to blob URL...`);
        
        // Validate the data format
        if (!parsed.data.startsWith('data:application/pdf;base64,')) {
          console.error('FileStorage: Invalid PDF data format:', parsed.data.substring(0, 50));
          throw new Error('Invalid PDF data format');
        }
        
        try {
          // Create blob URL for better PDF display
          const base64Data = parsed.data.split(',')[1];
          const byteCharacters = atob(base64Data);
          const byteNumbers = new Array(byteCharacters.length);
          for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i);
          }
          const byteArray = new Uint8Array(byteNumbers);
          const blob = new Blob([byteArray], { type: 'application/pdf' });
          const url = URL.createObjectURL(blob);
          console.log(`FileStorage: Blob URL created successfully: ${url}`);
          console.log(`FileStorage: Blob size: ${blob.size} bytes, type: ${blob.type}`);
          return url;
        } catch (conversionError) {
          console.error('FileStorage: Error converting base64 to blob:', conversionError);
          throw new Error('Failed to convert PDF data to viewable format');
        }
      } else {
        console.warn(`FileStorage: No file data found for ID: ${fileId}`);
        console.log('FileStorage: Available files:', Array.from(this.files.keys()));
      }
    } catch (error) {
      console.error('FileStorage: Error getting file URL:', error);
    }
    return null;
  }

  public async getFileDataUrl(fileId: string): Promise<string | null> {
    try {
      // Try localStorage first
      let fileData = localStorage.getItem(`file_${fileId}`);
      let parsed;
      
      if (fileData) {
        parsed = JSON.parse(fileData);
      } else {
        // Try IndexedDB fallback
        try {
          const indexedData = await this.getFromIndexedDB(fileId);
          if (indexedData) {
            parsed = indexedData;
          }
        } catch (error) {
          console.log('File not found in IndexedDB');
        }
      }
      
      if (parsed && parsed.data) {
        return parsed.data; // Return base64 data URL for downloads
      }
    } catch (error) {
      console.error('Error getting file data URL:', error);
    }
    return null;
  }

  public cleanupFileUrl(url: string): void {
    if (url.startsWith('blob:')) {
      URL.revokeObjectURL(url);
    }
  }

  public async deleteFile(fileId: string): Promise<void> {
    try {
      console.log(`Deleting file with ID: ${fileId}`);
      
      // Remove from localStorage
      localStorage.removeItem(`file_${fileId}`);
      
      // Remove from IndexedDB
      const request = indexedDB.open('AksharkalamDB', 1);
      
      request.onsuccess = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        const transaction = db.transaction(['files'], 'readwrite');
        const store = transaction.objectStore('files');
        
        store.delete(fileId);
        
        transaction.oncomplete = () => {
          db.close();
          console.log(`File ${fileId} deleted from IndexedDB`);
        };
        
        transaction.onerror = () => {
          db.close();
          console.error(`Failed to delete file ${fileId} from IndexedDB`);
        };
      };
      
      // Remove from files metadata
      this.files.delete(fileId);
      this.saveStoredFiles();
      
      console.log(`File ${fileId} successfully deleted from all storage`);
    } catch (error) {
      console.error('Error deleting file:', error);
      throw error;
    }
  }

  // Debug and utility methods
  public clearAllStorage(): void {
    // Clear localStorage files
    const keys = Object.keys(localStorage);
    keys.forEach(key => {
      if (key.startsWith('file_')) {
        localStorage.removeItem(key);
      }
    });
    
    // Clear stored files metadata
    localStorage.removeItem('stored_files');
    this.files.clear();
    
    // Clear IndexedDB
    const deleteRequest = indexedDB.deleteDatabase('AksharkalamDB');
    deleteRequest.onsuccess = () => {
      console.log('IndexedDB cleared successfully');
    };
    
    console.log('All file storage cleared');
  }

  public async deleteAllPapersData(): Promise<void> {
    // Clear all paper files and metadata
    this.clearAllStorage();
    
    // Also clear papers database
    const deletePapersRequest = indexedDB.deleteDatabase('AksharkalamPapersDB');
    deletePapersRequest.onsuccess = () => {
      console.log('Papers database cleared successfully');
    };
    
    // Clear paper data from localStorage
    localStorage.removeItem('aksharakalam_papers');
    localStorage.removeItem('selectedPaper');
    
    console.log('All papers data cleared');
  }

  public getStorageInfo(): { localStorage: number; indexedDB: boolean; totalFiles: number } {
    const localStorageFiles = Object.keys(localStorage).filter(key => key.startsWith('file_')).length;
    
    return {
      localStorage: localStorageFiles,
      indexedDB: false, // Will implement detection if needed
      totalFiles: this.files.size
    };
  }

  public getAllFiles(): StoredFile[] {
    return Array.from(this.files.values()).sort((a, b) => 
      new Date(b.uploadDate).getTime() - new Date(a.uploadDate).getTime()
    );
  }

  public getFileById(id: string): StoredFile | null {
    return this.files.get(id) || null;
  }

  private fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  // IndexedDB fallback methods
  private async storeInIndexedDB(id: string, fileData: any): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('AksharkalamDB', 1);
      
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains('files')) {
          db.createObjectStore('files', { keyPath: 'id' });
        }
      };
      
      request.onsuccess = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        const transaction = db.transaction(['files'], 'readwrite');
        const store = transaction.objectStore('files');
        
        store.put({ id, ...fileData });
        
        transaction.oncomplete = () => {
          db.close();
          resolve();
        };
        
        transaction.onerror = () => {
          db.close();
          reject(new Error('Failed to store in IndexedDB'));
        };
      };
      
      request.onerror = () => {
        reject(new Error('Failed to open IndexedDB'));
      };
    });
  }

  private async getFromIndexedDB(id: string): Promise<any> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('AksharkalamDB', 1);
      
      request.onsuccess = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        const transaction = db.transaction(['files'], 'readonly');
        const store = transaction.objectStore('files');
        const getRequest = store.get(id);
        
        getRequest.onsuccess = () => {
          db.close();
          resolve(getRequest.result);
        };
        
        getRequest.onerror = () => {
          db.close();
          reject(new Error('Failed to retrieve from IndexedDB'));
        };
      };
      
      request.onerror = () => {
        reject(new Error('Failed to open IndexedDB'));
      };
    });
  }

  public async recoverData(): Promise<{ papers: any[], files: any[] }> {
    const recovery: { papers: any[], files: any[] } = { papers: [], files: [] };
    
    try {
      // Try to recover papers from IndexedDB
      const request = indexedDB.open('AksharkalamPapersDB', 1);
      
      request.onsuccess = async (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (db.objectStoreNames.contains('papers')) {
          const transaction = db.transaction(['papers'], 'readonly');
          const store = transaction.objectStore('papers');
          const getAllRequest = store.getAll();
          
          getAllRequest.onsuccess = () => {
            recovery.papers = getAllRequest.result || [];
            console.log(`Recovered ${recovery.papers.length} papers`);
          };
        }
        db.close();
      };
      
      // Try to recover file metadata
      const fileRequest = indexedDB.open('AksharkalamDB', 1);
      
      fileRequest.onsuccess = async (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (db.objectStoreNames.contains('metadata')) {
          const transaction = db.transaction(['metadata'], 'readonly');
          const store = transaction.objectStore('metadata');
          const getAllRequest = store.getAll();
          
          getAllRequest.onsuccess = () => {
            recovery.files = getAllRequest.result || [];
            console.log(`Recovered ${recovery.files.length} file records`);
          };
        }
        db.close();
      };
      
    } catch (error) {
      console.error('Error during data recovery:', error);
    }
    
    return recovery;
  }

  private async initializeDatabase(): Promise<void> {
    try {
      // Initialize file storage database
      const fileRequest = indexedDB.open('AksharkalamDB', 1);
      
      fileRequest.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains('files')) {
          db.createObjectStore('files', { keyPath: 'id' });
          console.log('Created files object store');
        }
        if (!db.objectStoreNames.contains('metadata')) {
          db.createObjectStore('metadata', { keyPath: 'id' });
          console.log('Created metadata object store');
        }
      };
      
      fileRequest.onsuccess = () => {
        console.log('File storage database initialized');
        fileRequest.result.close();
      };
      
      // Initialize papers database
      const papersRequest = indexedDB.open('AksharkalamPapersDB', 1);
      
      papersRequest.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains('papers')) {
          db.createObjectStore('papers', { keyPath: 'id' });
          console.log('Created papers object store');
        }
      };
      
      papersRequest.onsuccess = () => {
        console.log('Papers database initialized');
        papersRequest.result.close();
      };
      
    } catch (error) {
      console.error('Error initializing databases:', error);
    }
  }

  public async verifyPermanentStorage(fileId: string): Promise<boolean> {
    try {
      console.log(`Verifying permanent storage for file: ${fileId}`);
      
      // Check localStorage
      const localStorageData = localStorage.getItem(`file_${fileId}`);
      const localStorageExists = !!localStorageData;
      
      // Check IndexedDB
      let indexedDBExists = false;
      try {
        const indexedData = await this.getFromIndexedDB(fileId);
        indexedDBExists = !!indexedData;
      } catch (error) {
        console.log('IndexedDB check failed:', error);
      }
      
      // Check metadata
      const metadataExists = this.files.has(fileId);
      
      console.log(`Storage verification for ${fileId}:`, {
        localStorage: localStorageExists,
        indexedDB: indexedDBExists,
        metadata: metadataExists
      });
      
      // File is considered permanently stored if it exists in at least one storage
      return localStorageExists || indexedDBExists;
    } catch (error) {
      console.error('Error verifying permanent storage:', error);
      return false;
    }
  }

  public async ensurePermanentStorage(fileId: string): Promise<void> {
    const isStored = await this.verifyPermanentStorage(fileId);
    
    if (!isStored) {
      throw new Error('File not found in permanent storage. Upload may have failed.');
    }
    
    // Additional verification: try to create a blob URL to ensure data integrity
    const url = await this.getFileUrl(fileId);
    if (!url) {
      throw new Error('File data corrupted or inaccessible.');
    }
    
    // Clean up the verification URL
    this.cleanupFileUrl(url);
    console.log(`File ${fileId} verified and stored permanently`);
  }
}