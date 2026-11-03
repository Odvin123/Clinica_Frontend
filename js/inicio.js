(function () {
  'use strict';

  const CLINIC_WHATSAPP = '50558764830';

  document.documentElement.classList.add('js-enabled');

  document.addEventListener('DOMContentLoaded', () => {
    initCurrentYear();
    initNavbar();
    initRevealOnScroll();
    initCarousel();
    initServicePreselection();
  });

  function initCurrentYear() {
    const yearEl = document.getElementById('current-year');
    if (yearEl) {
      yearEl.textContent = new Date().getFullYear();
    }
  }

  function initNavbar() {
    const header = document.getElementById('header');
    const navToggle = document.getElementById('nav-toggle');
    const navMenu = document.getElementById('nav-menu');
    const navLinks = document.querySelectorAll('.nav__link');
    const sections = document.querySelectorAll('main section[id], footer[id]');

    function closeMobileMenu() {
      if (!navToggle || !navMenu) return;
      navToggle.setAttribute('aria-expanded', 'false');
      navToggle.setAttribute('aria-label', 'Abrir menú de navegación');
      navMenu.classList.remove('is-open');
    }

    function toggleMobileMenu() {
      if (!navToggle || !navMenu) return;
      const isExpanded = navToggle.getAttribute('aria-expanded') === 'true';
      navToggle.setAttribute('aria-expanded', String(!isExpanded));
      navToggle.setAttribute(
        'aria-label',
        !isExpanded ? 'Cerrar menú de navegación' : 'Abrir menú de navegación'
      );
      navMenu.classList.toggle('is-open', !isExpanded);
    }

    if (navToggle) {
      navToggle.addEventListener('click', toggleMobileMenu);
    }

    navLinks.forEach((link) => {
      link.addEventListener('click', () => {
        closeMobileMenu();
      });
    });

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        closeMobileMenu();
      }
    });

    document.addEventListener('click', (event) => {
      if (
        navMenu &&
        navMenu.classList.contains('is-open') &&
        !navMenu.contains(event.target) &&
        navToggle &&
        !navToggle.contains(event.target)
      ) {
        closeMobileMenu();
      }
    });

    function onScroll() {
      if (header) {
        header.classList.toggle('is-scrolled', window.scrollY > 16);
      }

      const scrollPosition = window.scrollY + 160;
      let currentSectionId = 'inicio';

      sections.forEach((section) => {
        const top = section.offsetTop;
        const height = section.offsetHeight;
        if (scrollPosition >= top && scrollPosition < top + height) {
          currentSectionId = section.getAttribute('id') || currentSectionId;
        }
      });

      navLinks.forEach((link) => {
        const href = link.getAttribute('href');
        link.classList.toggle('is-active', href === `#${currentSectionId}`);
      });
    }

    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  function initRevealOnScroll() {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const revealItems = document.querySelectorAll('.reveal-item');

    if (prefersReducedMotion || !('IntersectionObserver' in window)) {
      revealItems.forEach((el) => el.classList.add('is-visible'));
      return;
    }

    document.querySelectorAll('.reveal-group, .services__grid').forEach((group) => {
      const children = group.querySelectorAll('.reveal-item');
      children.forEach((child, index) => {
        child.style.transitionDelay = `${index * 65}ms`;
      });
    });

    const observer = new IntersectionObserver(
      (entries, obs) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            obs.unobserve(entry.target);
          }
        });
      },
      {
        threshold: 0.12,
        rootMargin: '0px 0px -40px 0px',
      }
    );

    revealItems.forEach((item) => observer.observe(item));
  }

  function initCarousel() {
    const carousel = document.getElementById('clinic-carousel');
    const mediaViewport = document.getElementById('carousel-media-viewport');
    const track = document.getElementById('carousel-track');
    const captionsContainer = document.getElementById('carousel-captions');
    const prevBtn = document.getElementById('carousel-prev');
    const nextBtn = document.getElementById('carousel-next');
    const dotsContainer = document.getElementById('carousel-dots');
    const counterEl = document.getElementById('carousel-counter');

    if (!carousel || !track) return;

    const originalMediaItems = Array.from(track.children);
    const slides = captionsContainer
      ? Array.from(captionsContainer.querySelectorAll('.carousel__slide'))
      : [];
    const dots = dotsContainer ? Array.from(dotsContainer.querySelectorAll('.carousel__dot')) : [];
    const totalSlides = originalMediaItems.length;
    if (totalSlides === 0) return;

    originalMediaItems.forEach((item) => {
      const clone = item.cloneNode(true);
      clone.setAttribute('aria-hidden', 'true');
      track.appendChild(clone);
    });

    let currentIndex = -1;
    let offsetPx = 0;
    let targetOffsetPx = null;
    let lastTimestamp = null;
    const SPEED_PX_PER_SEC = 65;

    function getSlideWidth() {
      return (mediaViewport ? mediaViewport.clientWidth : track.clientWidth) || 1;
    }

    function updateActiveIndicators(index) {
      const normalized = ((index % totalSlides) + totalSlides) % totalSlides;
      if (normalized === currentIndex) return;
      currentIndex = normalized;

      slides.forEach((slide, idx) => {
        const isActive = idx === currentIndex;
        slide.classList.toggle('is-active', isActive);
        slide.setAttribute('aria-hidden', String(!isActive));
      });

      dots.forEach((dot, idx) => {
        const isActive = idx === currentIndex;
        dot.classList.toggle('is-active', isActive);
        dot.setAttribute('aria-selected', String(isActive));
      });

      if (counterEl) {
        counterEl.textContent = `${currentIndex + 1} / ${totalSlides}`;
      }
    }

    function stepContinuous(timestamp) {
      if (lastTimestamp === null) lastTimestamp = timestamp;
      const dt = Math.min((timestamp - lastTimestamp) / 1000, 0.1);
      lastTimestamp = timestamp;

      const slideWidth = getSlideWidth();
      const singleSetWidth = slideWidth * totalSlides;

      if (targetOffsetPx !== null) {
        const diff = targetOffsetPx - offsetPx;
        if (Math.abs(diff) <= 1.5) {
          offsetPx = targetOffsetPx;
          targetOffsetPx = null;
        } else {
          offsetPx += diff * Math.min(dt * 8, 0.35);
        }
      } else {
        offsetPx += SPEED_PX_PER_SEC * dt;
      }

      if (singleSetWidth > 0) {
        offsetPx = ((offsetPx % singleSetWidth) + singleSetWidth) % singleSetWidth;
        if (targetOffsetPx !== null) {
          targetOffsetPx = ((targetOffsetPx % singleSetWidth) + singleSetWidth) % singleSetWidth;
        }
      }

      track.style.transform = `translate3d(${-offsetPx}px, 0, 0)`;

      const activeIdx = Math.floor((offsetPx + slideWidth * 0.5) / slideWidth) % totalSlides;
      updateActiveIndicators(activeIdx);

      window.requestAnimationFrame(stepContinuous);
    }

    function jumpToSlide(targetIdx) {
      const slideWidth = getSlideWidth();
      const normalized = ((targetIdx % totalSlides) + totalSlides) % totalSlides;
      targetOffsetPx = normalized * slideWidth;
      updateActiveIndicators(normalized);
    }

    if (nextBtn) {
      nextBtn.addEventListener('click', () => {
        jumpToSlide((currentIndex < 0 ? 0 : currentIndex) + 1);
      });
    }

    if (prevBtn) {
      prevBtn.addEventListener('click', () => {
        jumpToSlide((currentIndex < 0 ? 0 : currentIndex) - 1);
      });
    }

    dots.forEach((dot, idx) => {
      dot.addEventListener('click', () => {
        jumpToSlide(idx);
      });
    });

    updateActiveIndicators(0);
    window.requestAnimationFrame(stepContinuous);
  }

  function initServicePreselection() {
    const serviceButtons = document.querySelectorAll('[data-select-service]');

    serviceButtons.forEach((btn) => {
      btn.addEventListener('click', () => {
        const serviceName = btn.getAttribute('data-select-service') || '';

        window.open(`agendar.html?servicio=${encodeURIComponent(serviceName)}`, '_blank');
      });
    });
  }
})();
