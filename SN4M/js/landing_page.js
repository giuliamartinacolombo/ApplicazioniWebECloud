(function () {
  "use strict";

  const qs = (sel, el = document) => el.querySelector(sel);
  const qsa = (sel, el = document) => Array.from(el.querySelectorAll(sel));

  const sections = [
    { id: "top", selector: "#top" },
    { id: "features", selector: "#features" },
    { id: "about", selector: "#about" },
  ].map(s => ({ ...s, el: qs(s.selector) }))
   .filter(s => s.el);

  const navLinks = qsa('a.navlink[href^="#"]');

  function setActive(id) {
    navLinks.forEach(a => {
      a.classList.toggle("is-active", a.getAttribute("href") === `#${id}`);
    });
  }

  function getCurrentSectionId() {
    const y = window.scrollY;
    const offset = 120;
    let current = "top";

    for (const s of sections) {
      const top = s.el.getBoundingClientRect().top + y;
      if (y + offset >= top) current = s.id;
    }
    return current;
  }

  let ticking = false;
  window.addEventListener("scroll", () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      setActive(getCurrentSectionId());
      ticking = false;
    });
  });

  setActive(getCurrentSectionId());
})();