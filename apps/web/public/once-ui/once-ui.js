(() => {
  const revealAttr = 'data-once-reveal';
  const visibleClass = 'is-visible';

  function markVisible(element) {
    element.classList.add(visibleClass);
  }

  function setupObserver(elements) {
    if (elements.length === 0) {
      return;
    }

    const prefersReducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion || !('IntersectionObserver' in window)) {
      elements.forEach(markVisible);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting || entry.intersectionRatio > 0) {
            markVisible(entry.target);
            observer.unobserve(entry.target);
          }
        }
      },
      { threshold: 0.25, rootMargin: '0px 0px -10%' }
    );

    elements.forEach((element) => observer.observe(element));
  }

  function ready(fn) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', fn, { once: true });
    } else {
      fn();
    }
  }

  ready(() => {
    const elements = Array.from(document.querySelectorAll(`[${revealAttr}]`));
    elements.forEach((element) => {
      // Trigger layout so transitions fire even if elements render above the fold.
      void element.getBoundingClientRect();
    });
    setupObserver(elements);
  });
})();
