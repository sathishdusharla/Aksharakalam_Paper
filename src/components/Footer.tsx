import React from 'react';
import { Facebook, Twitter, Instagram, Youtube } from 'lucide-react';

const Footer: React.FC = () => {
  return (
    <footer>
      <div className="container">
        <div className="footer-content">
          <div className="footer-left">
            <div className="footer-logo">Aksharakalam</div>
            <div className="footer-tagline">Your trusted source for daily news</div>
          </div>
          <div className="footer-social">
            <a href="#" aria-label="Facebook">
              <Facebook size={24} />
            </a>
            <a href="#" aria-label="Twitter">
              <Twitter size={24} />
            </a>
            <a href="#" aria-label="Instagram">
              <Instagram size={24} />
            </a>
            <a href="#" aria-label="YouTube">
              <Youtube size={24} />
            </a>
          </div>
        </div>
        <div className="footer-bottom">
          <p>&copy; 2025 Aksharakalam. All rights reserved. | Designed with excellence for digital journalism.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;