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

  const docEl = document.documentElement;
  const revealSelector = '[data-once-reveal]';
  const preparedElements = new WeakSet();
  const globalOnceUI = (window.OnceUI = window.OnceUI || {});

  const supportsIntersectionObserver = 'IntersectionObserver' in window;
  const reduceMotionQuery = typeof window.matchMedia === 'function'
    ? window.matchMedia('(prefers-reduced-motion: reduce)')
    : null;

  const shouldReduceMotion = () => !!(reduceMotionQuery && reduceMotionQuery.matches);

  let observer = supportsIntersectionObserver
    ? new IntersectionObserver(
        function(entries) {
          entries.forEach(function(entry) {
            const element = entry.target;
            const repeat = element.hasAttribute('data-once-reveal-repeat');
            if (entry.isIntersecting) {
              markVisible(element);
              if (!repeat && observer) {
                observer.unobserve(element);
              }
            } else if (repeat) {
              element.classList.remove('once-visible');
            }
          });
        },
        {
          threshold: 0.18,
          rootMargin: '0px 0px -10% 0px'
        }
      )
    : null;

  function markVisible(element) {
    if (!element.classList.contains('once-visible')) {
      element.classList.add('once-visible');
      try {
        element.dispatchEvent(new CustomEvent('once:reveal'));
      } catch (_error) {
        // Older browsers without CustomEvent constructor can skip dispatch
      }
    }
  }

  function prepareElement(element) {
    if (preparedElements.has(element)) return;
    preparedElements.add(element);
    element.classList.add('once-ready');
  }

  function hydrate(root) {
    const scope = root && root.nodeType === 1 && root.querySelectorAll ? root : document;
    const targets = scope.querySelectorAll(revealSelector);

    targets.forEach(function(element) {
      prepareElement(element);
      if (shouldReduceMotion() || !observer) {
        markVisible(element);
      } else {
        observer.observe(element);
      }
    });
  }

  function handlePreferenceChange() {
    if (shouldReduceMotion()) {
      if (observer) {
        observer.disconnect();
      }
      hydrate();
    } else {
      hydrate();
    }
  }

  if (reduceMotionQuery) {
    if (typeof reduceMotionQuery.addEventListener === 'function') {
      reduceMotionQuery.addEventListener('change', handlePreferenceChange);
    } else if (typeof reduceMotionQuery.addListener === 'function') {
      reduceMotionQuery.addListener(handlePreferenceChange);
    }
  }

  globalOnceUI.observeReveals = hydrate;
  globalOnceUI.refreshReveals = hydrate;

  function onReady() {
    docEl.classList.add('once-js');
    document.body.classList.add('once-loaded');
    hydrate();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', onReady, { once: true });
  } else {
    onReady();
  }
})();
