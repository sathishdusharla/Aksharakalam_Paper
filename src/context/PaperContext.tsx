import React, { createContext, useState, useEffect, ReactNode } from 'react';
import { StoredFile } from '../utils/fileStorage';

interface Paper {
  id: string;
  title: string;
  date: string;
  originalName: string;
  size: number;
  fileUrl: string;
  uploadDate: string;
  storedFile: StoredFile;
}

interface PaperContextType {
  papers: Paper[];
  totalPapers: number;
  addPaper: (paper: Paper) => void;
  deletePaper: (paperId: string) => void;
  getTodaysPaper: () => Paper | null;
  getLatestPaper: () => Paper | null;
}

export const PaperContext = createContext<PaperContextType>({
  papers: [],
  totalPapers: 0,
  addPaper: () => {},
  deletePaper: () => {},
  getTodaysPaper: () => null,
  getLatestPaper: () => null
});

interface PaperProviderProps {
  children: ReactNode;
}

const STORAGE_KEY = 'aksharakalam_papers';
const PAPERS_DB_NAME = 'AksharkalamPapersDB';
const PAPERS_STORE_NAME = 'papers';

// IndexedDB functions for papers
const loadPapersFromIndexedDB = (): Promise<Paper[]> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(PAPERS_DB_NAME, 1);
    
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(PAPERS_STORE_NAME)) {
        db.createObjectStore(PAPERS_STORE_NAME, { keyPath: 'id' });
      }
    };
    
    request.onsuccess = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      const transaction = db.transaction([PAPERS_STORE_NAME], 'readonly');
      const store = transaction.objectStore(PAPERS_STORE_NAME);
      const getAllRequest = store.getAll();
      
      getAllRequest.onsuccess = () => {
        db.close();
        resolve(getAllRequest.result || []);
      };
      
      getAllRequest.onerror = () => {
        db.close();
        reject(new Error('Failed to load papers from IndexedDB'));
      };
    };
    
    request.onerror = () => {
      reject(new Error('Failed to open IndexedDB for papers'));
    };
  });
};

const savePapersToIndexedDB = (papers: Paper[]): Promise<void> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(PAPERS_DB_NAME, 1);
    
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(PAPERS_STORE_NAME)) {
        db.createObjectStore(PAPERS_STORE_NAME, { keyPath: 'id' });
      }
    };
    
    request.onsuccess = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      const transaction = db.transaction([PAPERS_STORE_NAME], 'readwrite');
      const store = transaction.objectStore(PAPERS_STORE_NAME);
      
      // Clear existing papers and save new ones
      store.clear();
      papers.forEach(paper => {
        store.put(paper);
      });
      
      transaction.oncomplete = () => {
        db.close();
        resolve();
      };
      
      transaction.onerror = () => {
        db.close();
        reject(new Error('Failed to save papers to IndexedDB'));
      };
    };
    
    request.onerror = () => {
      reject(new Error('Failed to open IndexedDB for saving papers'));
    };
  });
};

// Default sample papers for initial load
const getDefaultPapers = (): Paper[] => {
  return [
    {
      id: 'sample-1',
      title: 'Aksharakalam Today',
      date: new Date().toISOString().split('T')[0], // Today's date
      originalName: 'test-newspaper.pdf',
      size: 605,
      fileUrl: '/papers/test-newspaper.pdf',
      uploadDate: new Date().toISOString(),
      storedFile: {
        id: 'sample-1',
        fileName: 'test-newspaper.pdf',
        originalName: 'test-newspaper.pdf',
        type: 'application/pdf',
        size: 605,
        uploadDate: new Date().toISOString(),
        publicPath: '/papers/test-newspaper.pdf'
      }
    },
    {
      id: 'sample-2',
      title: 'Aksharakalam Sample Edition',
      date: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0], // Yesterday
      originalName: 'simple-test.pdf',
      size: 599,
      fileUrl: '/papers/simple-test.pdf',
      uploadDate: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      storedFile: {
        id: 'sample-2',
        fileName: 'simple-test.pdf',
        originalName: 'simple-test.pdf',
        type: 'application/pdf',
        size: 599,
        uploadDate: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        publicPath: '/papers/simple-test.pdf'
      }
    }
  ];
};

export const PaperProvider: React.FC<PaperProviderProps> = ({ children }) => {
  const [papers, setPapers] = useState<Paper[]>([]);

  // Load papers from localStorage and IndexedDB on mount
  useEffect(() => {
    console.log('PaperProvider: Loading papers from storage');
    
    const loadPapers = async () => {
      let papersLoaded = false;
      
      try {
        // Try localStorage first
        const storedPapers = localStorage.getItem(STORAGE_KEY);
        if (storedPapers) {
          const parsedPapers = JSON.parse(storedPapers);
          console.log(`PaperProvider: Found ${parsedPapers.length} papers in localStorage`);
          // Sort by date, newest first
          parsedPapers.sort((a: Paper, b: Paper) => new Date(b.date).getTime() - new Date(a.date).getTime());
          setPapers(parsedPapers);
          papersLoaded = true;
        }
        
        // Also try IndexedDB for backup
        try {
          const indexedPapers = await loadPapersFromIndexedDB();
          if (indexedPapers.length > 0 && (!papersLoaded || indexedPapers.length > 0)) {
            console.log(`PaperProvider: Found ${indexedPapers.length} papers in IndexedDB`);
            indexedPapers.sort((a: Paper, b: Paper) => new Date(b.date).getTime() - new Date(a.date).getTime());
            setPapers(indexedPapers);
            
            // Update localStorage with IndexedDB data
            localStorage.setItem(STORAGE_KEY, JSON.stringify(indexedPapers));
          }
        } catch (indexedError) {
          console.log('Could not load from IndexedDB:', indexedError);
        }
        
        if (!papersLoaded) {
          console.log('PaperProvider: No papers found in storage, loading default papers');
          const defaultPapers = getDefaultPapers();
          setPapers(defaultPapers);
          // Save default papers to storage for future use
          localStorage.setItem(STORAGE_KEY, JSON.stringify(defaultPapers));
        }
      } catch (error) {
        console.error('PaperProvider: Error loading papers from storage:', error);
        setPapers([]);
      }
    };
    
    loadPapers();
  }, []);

  // Save papers to localStorage and IndexedDB whenever papers change
  useEffect(() => {
    const savePapers = async () => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(papers));
        
        // Also save to IndexedDB for permanence
        await savePapersToIndexedDB(papers);
        console.log('Papers saved to both localStorage and IndexedDB');
      } catch (error) {
        console.error('Error saving papers to storage:', error);
      }
    };
    
    if (papers.length > 0) {
      savePapers();
    }
  }, [papers]);

  // Check for selected paper from archive on mount
  useEffect(() => {
    const selectedPaper = localStorage.getItem('selectedPaper');
    if (selectedPaper) {
      try {
        const paper = JSON.parse(selectedPaper);
        // Move selected paper to front temporarily for display
        setPapers(prev => {
          const filtered = prev.filter(p => p.id !== paper.id);
          return [paper, ...filtered];
        });
        localStorage.removeItem('selectedPaper');
      } catch (error) {
        console.error('Error loading selected paper:', error);
      }
    }
  }, []);

  const addPaper = (paper: Paper) => {
    console.log('PaperProvider: Adding new paper:', paper.title, paper.id);
    setPapers(prev => {
      const newPapers = [paper, ...prev];
      // Sort by date, newest first
      newPapers.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      console.log(`PaperProvider: Now have ${newPapers.length} total papers`);
      return newPapers;
    });
  };

  const deletePaper = async (paperId: string) => {
    console.log('PaperProvider: Deleting paper:', paperId);
    
    // Find the paper to delete
    const paperToDelete = papers.find(p => p.id === paperId);
    if (paperToDelete) {
      try {
        // Delete the file from storage using FileStorageManager
        const { FileStorageManager } = await import('../utils/fileStorage');
        const manager = FileStorageManager.getInstance();
        await manager.deleteFile(paperToDelete.storedFile.id);
        
        console.log('File data deleted from storage');
      } catch (error) {
        console.error('Error deleting file data:', error);
      }
    }
    
    // Remove paper from context
    setPapers(prev => {
      const filtered = prev.filter(p => p.id !== paperId);
      console.log(`PaperProvider: Deleted paper, now have ${filtered.length} total papers`);
      return filtered;
    });
  };

  const getTodaysPaper = (): Paper | null => {
    const today = new Date().toISOString().split('T')[0];
    const todaysPaper = papers.find(paper => paper.date === today);
    return todaysPaper || null;
  };

  const getLatestPaper = (): Paper | null => {
    return papers.length > 0 ? papers[0] : null;
  };

  const value: PaperContextType = {
    papers,
    totalPapers: papers.length,
    addPaper,
    deletePaper,
    getTodaysPaper,
    getLatestPaper
  };

  return (
    <PaperContext.Provider value={value}>
      {children}
    </PaperContext.Provider>
  );
};