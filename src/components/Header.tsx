import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';

const Header: React.FC = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const location = useLocation();
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Close menu when route changes
    setIsMenuOpen(false);
  }, [location.pathname]);

  // Close menu when clicking outside
  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };

    if (isMenuOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
      document.body.classList.add('menu-open');
    } else {
      document.body.classList.remove('menu-open');
    }

    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.body.classList.remove('menu-open');
    };
  }, [isMenuOpen]);

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const closeMenu = () => {
    setIsMenuOpen(false);
  };

  const isActive = (path: string) => location.pathname === path;

  return (
    <header>
      <div className="container">
        <nav className="navbar">
          <div className="logo-section">
            <Link to="/" className="logo" onClick={closeMenu}>Aksharakalam</Link>
            <div className="tagline">Your Daily Digital Edition</div>
          </div>

          <div className="nav-right" ref={menuRef}>
            <ul className={`nav-links ${isMenuOpen ? 'nav-active' : ''}`}>
              <li>
                <Link 
                  to="/" 
                  className={`nav-link ${isActive('/') ? 'active' : ''}`}
                  onClick={closeMenu}
                >
                  Home
                </Link>
              </li>
              <li>
                <Link 
                  to="/archive" 
                  className={`nav-link ${isActive('/archive') ? 'active' : ''}`}
                  onClick={closeMenu}
                >
                  Archive
                </Link>
              </li>
              <li>
                <Link 
                  to="/admin" 
                  className={`nav-link ${isActive('/admin') ? 'active' : ''}`}
                  onClick={closeMenu}
                >
                  Admin
                </Link>
              </li>
            </ul>

            <button 
              className={`menu-toggle ${isMenuOpen ? 'menu-open' : ''}`}
              onClick={toggleMenu}
              aria-label="Toggle menu"
              aria-expanded={isMenuOpen}
            >
              <span className="hamburger-line"></span>
              <span className="hamburger-line"></span>
              <span className="hamburger-line"></span>
            </button>
          </div>
        </nav>
      </div>
    </header>
  );
};

export default Header;