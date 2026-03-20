const navToggle = document.getElementById("nav-toggle");
const navMenu = document.getElementById("nav-menu");
const navLinks = [...document.querySelectorAll(".nav__link")];
const sections = [...document.querySelectorAll("section[id]")];
const header = document.getElementById("header");
const revealElements = [...document.querySelectorAll("[data-reveal]")];
const currentYear = document.getElementById("current-year");

if (navToggle && navMenu) {
  navToggle.addEventListener("click", () => {
    const open = navMenu.classList.toggle("show");
    navToggle.setAttribute("aria-expanded", String(open));
  });
}

navLinks.forEach((link) => {
  link.addEventListener("click", () => {
    navMenu?.classList.remove("show");
    navToggle?.setAttribute("aria-expanded", "false");
  });
});

const updateHeaderState = () => {
  header?.classList.toggle("scroll-header", window.scrollY > 20);
};

const updateActiveLink = () => {
  const marker = window.scrollY + 180;

  sections.forEach((section) => {
    const top = section.offsetTop;
    const height = section.offsetHeight;
    const id = section.getAttribute("id");
    const link = document.querySelector(`.nav__link[href="#${id}"]`);

    if (!link) return;

    if (marker >= top && marker < top + height) {
      link.classList.add("active-link");
    } else {
      link.classList.remove("active-link");
    }
  });
};

if ("IntersectionObserver" in window) {
  const observer = new IntersectionObserver(
    (entries, instance) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-visible");
        instance.unobserve(entry.target);
      });
    },
    { threshold: 0.14 }
  );

  revealElements.forEach((element) => observer.observe(element));
} else {
  revealElements.forEach((element) => element.classList.add("is-visible"));
}

window.addEventListener(
  "scroll",
  () => {
    updateHeaderState();
    updateActiveLink();
  },
  { passive: true }
);

window.addEventListener("resize", updateActiveLink);

if (currentYear) {
  currentYear.textContent = String(new Date().getFullYear());
}

updateHeaderState();
updateActiveLink();
