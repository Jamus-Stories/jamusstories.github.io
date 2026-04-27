/*
  main-script.js
  - Expanded header fills the viewport when open; dropdown content scrolls inside it.
  - Inline nav links are moved into header (left of hamburger) if not already.
  - Plus/minus icon is toggled by .is-open (vertical line collapses).
  - Handles ARIA, Escape key, and responsive recalculation.
*/

document.addEventListener('DOMContentLoaded', function () {
  // elements
  const header = document.querySelector('header.site-header') || document.querySelector('header');
  if (!header) {
    console.warn('Header element not found. Aborting header script.');
    return;
  }

  // ensure header has expected markup
  const headerInner = header.querySelector('.header-inner');
  const navToggle = document.getElementById('navToggle');
  const navMenu = document.getElementById('navMenu'); // the <nav id="navMenu"> block in your HTML
  if (!headerInner || !navToggle || !navMenu) {
    console.warn('Missing headerInner, navToggle, or navMenu. Aborting header behavior.');
    return;
  }

  // source nodes inside navMenu
  const navLinks = navMenu.querySelector('.nav-links');               // UL of inline links
  const dropdownSections = navMenu.querySelector('.dropdown-sections'); // sections panel
  const headerGradient = header.querySelector('.header-gradient');

  // create right-controls container if not present
  let rightControls = headerInner.querySelector('.right-controls');
  if (!rightControls) {
    rightControls = document.createElement('div');
    rightControls.className = 'right-controls';
    headerInner.appendChild(rightControls);
  }

  // ensure toggle is inside rightControls
  if (navToggle.parentNode !== rightControls) rightControls.appendChild(navToggle);

  // move navLinks before toggle so they appear left of it
  if (navLinks && navLinks.parentNode !== rightControls) {
    rightControls.insertBefore(navLinks, navToggle);
  } else if (!navLinks) {
    // create an empty container if missing
    const u = document.createElement('ul');
    u.className = 'nav-links';
    rightControls.insertBefore(u, navToggle);
  }

  // Keep header collapsed height equal to headerInner + gradient
  function collapsedHeight() {
    const innerH = headerInner.getBoundingClientRect().height ||
      parseInt(getComputedStyle(document.documentElement).getPropertyValue('--header-height')) || 64;
    const gH = getGradientHeight();
    return innerH + gH;
  }

  // helper to read gradient height (DOM size or CSS var fallback)
  function getGradientHeight() {
    if (headerGradient) {
      const g = headerGradient.getBoundingClientRect().height;
      if (g && !isNaN(g)) return g;
    }
    const cssVal = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--gradient-height'));
    return Number.isFinite(cssVal) ? cssVal : 60;
  }

  // when open, dropdown area should be scrollable to fit in viewport
  function computeDropdownMaxHeight() {
    const viewportH = window.innerHeight;
    const innerH = headerInner.getBoundingClientRect().height ||
      parseInt(getComputedStyle(document.documentElement).getPropertyValue('--header-height')) || 64;
    const gH = getGradientHeight();
    // maximum space available to dropdown inside header
    return Math.max(0, viewportH - innerH - gH);
  }

  // set initial collapsed state
  const initialCollapsed = collapsedHeight();
  header.style.maxHeight = initialCollapsed + 'px';
  document.body.style.paddingTop = initialCollapsed + 'px'; // push content below header

  let isOpen = false;

  function openHeader() {
    if (isOpen) return;
    isOpen = true;

    // move dropdownSections into header (if exists)
    if (dropdownSections && dropdownSections.parentNode !== header) {
      header.appendChild(dropdownSections);
    }

    const gH = getGradientHeight();

    // allow header to grow to full viewport height + gradient height
    header.style.maxHeight = (window.innerHeight + gH) + 'px';
    header.classList.add('open');
    navToggle.classList.add('is-open');
    navToggle.setAttribute('aria-expanded', 'true');

    // make dropdown scrollable by limiting its max-height
    if (dropdownSections) {
      // computeDropdownMaxHeight subtracts gH, so add it back
      const base = computeDropdownMaxHeight();
      dropdownSections.style.maxHeight = (base + gH) + 'px';
      dropdownSections.style.overflowY = 'auto';
    }
  }

  function closeHeader() {
    if (!isOpen) return;
    isOpen = false;

    // collapse header back to initial collapsed height
    header.style.maxHeight = initialCollapsed + 'px';
    header.classList.remove('open');
    navToggle.classList.remove('is-open');
    navToggle.setAttribute('aria-expanded', 'false');

    // after transition ends, move dropdownSections back into navMenu (restore DOM)
    const transitionDuration = parseFloat(getComputedStyle(header).transitionDuration) * 1000 || 350;
    setTimeout(() => {
      if (dropdownSections && dropdownSections.parentNode === header && navMenu) {
        // remove inline style used for scroll
        dropdownSections.style.maxHeight = '';
        dropdownSections.style.overflowY = '';
        navMenu.appendChild(dropdownSections);
      }
      // update body padding-top (in case heights changed)
      document.body.style.paddingTop = initialCollapsed + 'px';
    }, transitionDuration + 40);
  }

  // toggle click
  navToggle.addEventListener('click', (e) => {
    e.stopPropagation();
    if (isOpen) closeHeader();
    else openHeader();
  });

  // close on Esc
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && isOpen) closeHeader();
  });

  // -----------------------
  // REPLACED: close when any moved inline nav link is clicked
  // NEW: scroll the dropdownSections to targets inside it (Option A)
  // -----------------------
  header.querySelectorAll('.nav-links a[href^="#"]').forEach(a => {
    a.addEventListener('click', function (e) {
      const href = this.getAttribute('href');
      if (!href || !href.startsWith('#')) return;
      if (!dropdownSections) return;

      const targetInDropdown = dropdownSections.querySelector(href);
      if (!targetInDropdown) {
        // target not inside dropdown — don't handle here
        return;
      }

      // handle scroll inside dropdown
      e.preventDefault();

      // open header if closed so dropdownSections is appended and scrollable
      if (!isOpen) openHeader();

      // compute a wait time that matches header's transition so layout has settled
      const headerTransitionDuration = parseFloat(getComputedStyle(header).transitionDuration) * 1000 || 350;
      const wait = Math.max(80, headerTransitionDuration + 20);

      setTimeout(() => {
        try {
          // measure and compute scroll offset relative to dropdownSections
          const dropdownRect = dropdownSections.getBoundingClientRect();
          const targetRect = targetInDropdown.getBoundingClientRect();
          const currentScroll = dropdownSections.scrollTop || 0;

          // distance from dropdown top + current scroll, minus a small buffer
          const offset = (targetRect.top - dropdownRect.top) + currentScroll - 16;

          dropdownSections.scrollTo({ top: offset, behavior: 'smooth' });
        } catch (err) {
          // fallback: just make sure the element is focused if scrolling fails
          console.error('Error scrolling to dropdown target', err);
          try { targetInDropdown.focus(); } catch (e) { /* ignore */ }
        }
      }, wait);
    });
  });

  // handle viewport resize: recalc heights
  let rt;
  window.addEventListener('resize', () => {
    clearTimeout(rt);
    rt = setTimeout(() => {
      // update collapsed value
      const newCollapsed = collapsedHeight();
      header.style.maxHeight = isOpen ? (window.innerHeight + getGradientHeight()) + 'px' : newCollapsed + 'px';
      document.body.style.paddingTop = newCollapsed + 'px';

      // recompute dropdown max-height if open
      if (isOpen && dropdownSections) {
        const base = computeDropdownMaxHeight();
        dropdownSections.style.maxHeight = (base + getGradientHeight()) + 'px';
      }
    }, 120);
  });

});



// Carousel
const track = document.getElementById("sliderTrack");
const prevBtn = document.getElementById("prevBtn");
const nextBtn = document.getElementById("nextBtn");

let testimonials = Array.from(track.children);

// Clone first and last two times for smooth infinite loop
const firstClone1 = testimonials[0].cloneNode(true);
const firstClone2 = testimonials[1]?.cloneNode(true) || testimonials[0].cloneNode(true); 
const lastClone1 = testimonials[testimonials.length - 1].cloneNode(true);
const lastClone2 = testimonials[testimonials.length - 2]?.cloneNode(true) || testimonials[testimonials.length - 1].cloneNode(true);

track.insertBefore(lastClone2, testimonials[0]);
track.insertBefore(lastClone1, testimonials[0]);
track.appendChild(firstClone1);
track.appendChild(firstClone2);

testimonials = Array.from(track.children);

let index = 2; // Start at first real testimonial
let interval = null;

function getMoveAmount() {
  const style = getComputedStyle(testimonials[0]);
  const width = testimonials[0].offsetWidth;
  const marginRight = parseFloat(style.marginRight);
  return width + marginRight;
}

function updateSlider(animate = true) {
  const moveAmount = getMoveAmount();
  track.style.transition = animate ? 'transform 0.5s ease' : 'none';
  track.style.transform = `translateX(${-index * moveAmount}px)`;
}

// Initial position
updateSlider(false);

function moveNext() {
  index++;
  updateSlider();

  track.addEventListener('transitionend', () => {
    if (index >= testimonials.length - 2) { // reached clones at end
      index = 2; // jump to first real testimonial
      track.style.transition = 'none';
      updateSlider(false);
      track.offsetHeight; // force reflow
      track.style.transition = 'transform 0.5s ease';
    }
  }, { once: true });
}

function movePrev() {
  index--;
  updateSlider();

  track.addEventListener('transitionend', () => {
    if (index < 2) { // reached clones at start
      index = testimonials.length - 3; // jump to last real testimonial
      track.style.transition = 'none';
      updateSlider(false);
      track.offsetHeight; // force reflow
      track.style.transition = 'transform 0.5s ease';
    }
  }, { once: true });
}

nextBtn.addEventListener('click', moveNext);
prevBtn.addEventListener('click', movePrev);

// Auto-play
function startAutoPlay() {
  interval = setInterval(moveNext, 4000); // slide every 4 seconds
}

function stopAutoPlay() {
  clearInterval(interval);
}

// Start auto-play
startAutoPlay();

// Pause on hover
track.addEventListener('mouseenter', stopAutoPlay);
track.addEventListener('mouseleave', startAutoPlay);






// ---------- Hero floating (per-object behaviors, burst on click) ----------
(function () {
  document.addEventListener("DOMContentLoaded", () => {
    const MAX_FLOATING_OBJECTS = 5; // 👈 number of random (non-always-visible) objects to show
    const hero = document.querySelector(".hero");
    if (!hero) {
      console.warn("Hero element not found — cannot init floating svgs.");
      return;
    }

    // ensure container
    let container = hero.querySelector(".floating-container");
    if (!container) {
      container = document.createElement("div");
      container.className = "floating-container";
      container.style.position = "absolute";
      container.style.inset = "0";
      container.style.pointerEvents = "none"; // children will be clickable
      hero.appendChild(container);
    }

    // move .floating-svg into container
    const initialNodes = Array.from(hero.querySelectorAll(".floating-svg"));
    initialNodes.forEach(node => container.appendChild(node));

    let allSvgs = Array.from(container.querySelectorAll(".floating-svg"));

    // separate always-visible vs randomizable
    const alwaysVisibleSvgs = allSvgs.filter(el => el.classList.contains("always-visible"));
    let randomizableSvgs = allSvgs.filter(el => !el.classList.contains("always-visible"));

    // random selection logic (only for non-always-visible)
    if (randomizableSvgs.length > MAX_FLOATING_OBJECTS) {
      randomizableSvgs.sort(() => Math.random() - 0.5);
      const visibleRandom = randomizableSvgs.slice(0, MAX_FLOATING_OBJECTS);

      randomizableSvgs.forEach(el => {
        if (!visibleRandom.includes(el)) el.style.display = "none";
      });

      randomizableSvgs = visibleRandom;
    }

    // ensure always-visible are shown
    alwaysVisibleSvgs.forEach(el => {
      el.style.display = "block";
    });

    // combine both sets for animation
    let svgs = [...alwaysVisibleSvgs, ...randomizableSvgs];

    // basic style adjustments
    svgs.forEach(el => {
      el.style.position = "absolute";
      el.style.pointerEvents = "auto"; // allow clicking
      el.style.animation = "none";
      el.draggable = false;
    });

    function getHeroRect() { return hero.getBoundingClientRect(); }
    let rect = getHeroRect();
    window.addEventListener("resize", () => { rect = getHeroRect(); });

    const movers = [];

    // addMover: registers motion for an element
    function addMover(el, startX, startY) {
      const size = parseInt(el.dataset.size, 10) || 80;
      el.style.width = size + "px";
      el.style.height = "auto";

      const behavior = (el.dataset.behavior || "random").trim();
      const hasAngle = (el.dataset.angle !== undefined && el.dataset.angle !== "");
      const angleDeg = hasAngle ? parseFloat(el.dataset.angle) : (Math.random() * 360);

      const explicitSpeed = parseFloat(el.dataset.speed);
      const baseSpeed = !isNaN(explicitSpeed) ? Math.max(0.01, explicitSpeed) : (0.05 + Math.random() * 0.25);
      const explicitRotationSpeed = parseFloat(el.dataset.rotationSpeed);
      const rotationSpeed = !isNaN(explicitRotationSpeed) ? explicitRotationSpeed : (0.2 + Math.random() * 0.6);

      const mover = {
        el,
        x: (typeof startX === "number") ? startX : (Math.random() * Math.max(1, rect.width - size)),
        y: (typeof startY === "number") ? startY : (Math.random() * Math.max(1, rect.height - size)),
        baseSpeed,
        burstFactor: 1,
        burstDecay: 0.96,
        angle: (angleDeg * Math.PI) / 180,
        behavior,
        rotation: 0,
        rotationSpeed
      };

      el.addEventListener("mouseover", (ev) => {
        ev.stopPropagation();
        mover.burstFactor = 3 + Math.random() * 15;
      });

      el.style.left = mover.x + "px";
      el.style.top = mover.y + "px";

      movers.push(mover);
    }

    // initial placement: scattered but balanced, with occasional clusters
    svgs.forEach((el, i) => {
      const startX = Math.random() * rect.width;
      const startY = Math.random() * rect.height;

      const clusterChance = 0.25;
      if (i > 0 && Math.random() < clusterChance) {
        const prev = movers[Math.floor(Math.random() * movers.length)];
        const offsetX = (Math.random() - 0.5) * 80;
        const offsetY = (Math.random() - 0.5) * 80;
        addMover(el, prev.x + offsetX, prev.y + offsetY);
      } else {
        addMover(el, startX, startY);
      }
    });

    // main animation loop
    function animate() {
      rect = getHeroRect();

      movers.forEach(m => {
        const speed = m.baseSpeed * m.burstFactor;

        switch (m.behavior) {
          case "linear-left-right":
            m.x += speed;
            if (m.x > rect.width) m.x = -(m.el.offsetWidth || 60);
            break;

          case "linear-angle":
            m.x += Math.cos(m.angle) * speed;
            m.y += Math.sin(m.angle) * speed;
            break;

          case "spin":
            m.rotation += m.rotationSpeed * m.burstFactor;
            m.x += Math.cos(m.angle) * speed;
            m.y += Math.sin(m.angle) * speed;
            break;

          case "random":
          default:
            m.x += Math.cos(m.angle) * speed;
            m.y += Math.sin(m.angle) * speed;
            break;
        }

        const w = m.el.offsetWidth || 60;
        const h = m.el.offsetHeight || 60;
        if (m.x < -w) m.x = rect.width;
        if (m.x > rect.width) m.x = -w;
        if (m.y < -h) m.y = rect.height;
        if (m.y > rect.height) m.y = -h;

        m.el.style.left = m.x + "px";
        m.el.style.top = m.y + "px";
        m.el.style.transform = `rotate(${m.rotation}deg)`;

        if (m.burstFactor > 1) {
          m.burstFactor *= m.burstDecay;
          if (m.burstFactor < 1.01) m.burstFactor = 1;
        }
      });

      requestAnimationFrame(animate);
    }

    requestAnimationFrame(animate);
  });
})();






/* Bouncing peas */
document.addEventListener('DOMContentLoaded', () => {
  const container = document.querySelector('.dropdown-sections');
  const header = document.querySelector('header.site-header');
  if (!container) return;

  // config
  const CONFIG = {
    count: 15,        // number of peas (tweak down on low-perf devices)
    size: 20,         // px diameter
    speed: 1.8,       // motion multiplier (px per frame-ish)
    color: '#1c9b79'
  };

  // ensure container is positioned
  if (getComputedStyle(container).position === 'static') {
    container.style.position = 'relative';
  }

  // state
  let peas = [];         // { el, x, y, vx, vy, r }
  let rafId = null;
  let bounds = {
    width: Math.max(1, container.clientWidth),
    height: Math.max(1, container.clientHeight)
  };

  // create pea elements
  function createPeas() {
    // remove any existing peas
    container.querySelectorAll('.pea').forEach(n => n.remove());
    peas = [];

    // compute fresh bounds (use scroll sizes so peas can occupy full content)
    bounds.width = Math.max(1, container.scrollWidth || container.clientWidth);
    bounds.height = Math.max(1, container.scrollHeight || container.clientHeight);

    for (let i = 0; i < CONFIG.count; i++) {
      const el = document.createElement('div');
      el.className = 'pea';
      el.style.width = CONFIG.size + 'px';
      el.style.height = CONFIG.size + 'px';
      el.style.background = CONFIG.color;

      // random starting position inside full content area
      const x = Math.random() * Math.max(1, bounds.width - CONFIG.size);
      const y = Math.random() * Math.max(1, bounds.height - CONFIG.size);

      // velocities
      const vx = (Math.random() - 0.5) * 2 * CONFIG.speed;
      const vy = (Math.random() - 0.5) * 2 * CONFIG.speed;

      el.style.transform = `translate3d(${x}px, ${y}px, 0)`;
      container.appendChild(el);

      peas.push({ el, x, y, vx, vy, r: CONFIG.size / 2 });
    }
  }

  // update bounds when content size changes; scale peas proportionally
  function refreshBoundsAndScalePeas() {
    const oldW = bounds.width || 1;
    const oldH = bounds.height || 1;
    const newW = Math.max(1, container.scrollWidth || container.clientWidth);
    const newH = Math.max(1, container.scrollHeight || container.clientHeight);

    // scale existing positions proportionally and clamp inside new bounds
    peas.forEach(p => {
      p.x = (p.x / oldW) * newW;
      p.y = (p.y / oldH) * newH;
      p.x = Math.max(0, Math.min(newW - CONFIG.size, p.x));
      p.y = Math.max(0, Math.min(newH - CONFIG.size, p.y));
      p.el.style.transform = `translate3d(${p.x}px, ${p.y}px, 0)`;
    });

    bounds.width = newW;
    bounds.height = newH;
  }

  // animation loop
  function loop() {
    const w = bounds.width;
    const h = bounds.height;

    for (let i = 0; i < peas.length; i++) {
      const p = peas[i];
      p.x += p.vx;
      p.y += p.vy;

      // bounce on edges (full content area)
      if (p.x < 0) { p.x = 0; p.vx *= -1; }
      if (p.x > w - CONFIG.size) { p.x = w - CONFIG.size; p.vx *= -1; }
      if (p.y < 0) { p.y = 0; p.vy *= -1; }
      if (p.y > h - CONFIG.size) { p.y = h - CONFIG.size; p.vy *= -1; }

      p.el.style.transform = `translate3d(${p.x}px, ${p.y}px, 0)`;
    }

    rafId = requestAnimationFrame(loop);
  }

  function startAnimation() {
    if (!peas.length) createPeas();
    if (!rafId) loop();
  }
  function stopAnimation() {
    if (rafId) cancelAnimationFrame(rafId);
    rafId = null;
  }

  // watch for dropdown open/close (start/stop)
  const headerObserver = new MutationObserver(() => {
    const isOpen = header.classList.contains('open');
    if (isOpen) {
      document.body.classList.add('no-scroll');  // lock page scroll
      refreshBoundsAndScalePeas();
      startAnimation();
    } else {
      document.body.classList.remove('no-scroll'); // unlock page scroll
      stopAnimation();
    }
  });
  headerObserver.observe(header, { attributes: true, attributeFilter: ['class'] });


  // watch for images inside container (resize after images load)
  const imgs = container.querySelectorAll('img');
  imgs.forEach(img => {
    if (!img.complete) {
      img.addEventListener('load', () => {
        refreshBoundsAndScalePeas();
      });
    }
  });

  // window resize -> recalc bounds
  let rt;
  window.addEventListener('resize', () => {
    clearTimeout(rt);
    rt = setTimeout(() => {
      refreshBoundsAndScalePeas();
    }, 120);
  });

  // start if the dropdown is already open on page load
  if (header.classList.contains('open')) {
    createPeas();
    refreshBoundsAndScalePeas();
    startAnimation();
  }
});











/*- Header background image gradual position change on resize -*/
(function () {
  const img = document.getElementById("wideIllustration");

  // values you defined in CSS breakpoints:
  const desktopWidth = 1920;   // adjust to your widest case
  const mobileWidth = 768;     // your smallest case

  const desktopLeft = -1045;   // desktop offset
  const mobileLeft = -2195;    // mobile offset

  function updateOffset() {
    const w = window.innerWidth;

    // clamp between mobileWidth and desktopWidth
    const clampedW = Math.max(Math.min(w, desktopWidth), mobileWidth);

    // linear interpolation
    const progress = (clampedW - mobileWidth) / (desktopWidth - mobileWidth);
    const left = mobileLeft + (desktopLeft - mobileLeft) * progress;

    img.style.left = `${left}px`;
  }

  window.addEventListener("resize", updateOffset);
  window.addEventListener("load", updateOffset);
})();
