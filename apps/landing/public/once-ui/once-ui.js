// Once UI Minimal JavaScript Framework

(function() {
  'use strict';
  
  // Simple smooth scrolling for anchor links
  document.addEventListener('click', function(e) {
    const target = e.target.closest('a[href^="#"]');
    if (!target) return;
    
    const href = target.getAttribute('href');
    if (href === '#') return;
    
    const element = document.querySelector(href);
    if (element) {
      e.preventDefault();
      element.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
      });
    }
  });
  
  // Add loaded class to body when DOM is ready
  document.addEventListener('DOMContentLoaded', function() {
    document.body.classList.add('once-loaded');
  });
  
})();