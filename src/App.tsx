import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Header from './components/Header';
import Footer from './components/Footer';
import Home from './pages/Home';
import Archive from './pages/Archive';
import Admin from './pages/Admin';
import { PaperProvider } from './context/PaperContext';
import { NotificationProvider } from './context/NotificationContext';
import './styles/global.css';

function App() {
  return (
    <NotificationProvider>
      <PaperProvider>
        <Router>
          <div className="App">
            <Header />
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/archive" element={<Archive />} />
              <Route path="/admin" element={<Admin />} />
            </Routes>
            <Footer />
          </div>
        </Router>
      </PaperProvider>
    </NotificationProvider>
  );
}

export default App;