(() => {
  "use strict";

  const header = document.querySelector(".site-header");
  const year = document.getElementById("year");
  const form = document.getElementById("leadForm");
  const submitButton = form?.querySelector("button[type='submit']");
  const status = document.getElementById("formStatus");
  const serviceSelect = document.getElementById("service");

  if (year) year.textContent = new Date().getFullYear();

  const setHeaderState = () => header?.classList.toggle("scrolled", window.scrollY > 24);
  setHeaderState();
  window.addEventListener("scroll", setHeaderState, { passive: true });

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("visible");
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12 });
  document.querySelectorAll(".reveal").forEach((element) => observer.observe(element));

  document.querySelectorAll(".service-card").forEach((card) => {
    const selectService = () => {
      if (serviceSelect) serviceSelect.value = card.dataset.service || "";
      document.getElementById("consultation")?.scrollIntoView({ behavior: "smooth", block: "start" });
      setTimeout(() => document.getElementById("name")?.focus({ preventScroll: true }), 650);
    };
    card.querySelector(".service-cta")?.addEventListener("click", selectService);
  });

  const params = new URLSearchParams(window.location.search);
  ["utm_source", "utm_medium", "utm_campaign"].forEach((key) => {
    const field = document.getElementById(key);
    if (field) field.value = params.get(key) || "";
  });
  const pageUrl = document.getElementById("page_url");
  if (pageUrl) pageUrl.value = window.location.href;

  const normalizeMobile = (value) => value.replace(/[\s\-()]/g, "").replace(/^\+966/, "0").replace(/^966/, "0");
  const isValidSaudiMobile = (value) => /^05\d{8}$/.test(normalizeMobile(value));

  const setFieldError = (fieldName, message) => {
    const field = document.getElementById(fieldName);
    const error = document.querySelector(`[data-error-for="${fieldName}"]`);
    field?.classList.toggle("invalid", Boolean(message));
    if (error) error.textContent = message || "";
  };

  form?.addEventListener("submit", async (event) => {
    event.preventDefault();
    status.className = "form-status";
    status.textContent = "";

    const name = document.getElementById("name").value.trim();
    const mobileInput = document.getElementById("mobile").value.trim();
    const mobile = normalizeMobile(mobileInput);
    const consent = document.getElementById("consent").checked;

    setFieldError("name", name.length < 2 ? "فضلاً اكتب الاسم بشكل صحيح." : "");
    setFieldError("mobile", !isValidSaudiMobile(mobileInput) ? "اكتب رقمًا سعوديًا صحيحًا يبدأ بـ 05." : "");

    if (name.length < 2 || !isValidSaudiMobile(mobileInput) || !consent) {
      if (!consent) {
        status.className = "form-status error";
        status.textContent = "يلزم الموافقة على التواصل لإرسال الطلب.";
      }
      return;
    }

    const data = {
      name,
      mobile,
      service: serviceSelect?.value || "استشارة عامة",
      utm_source: document.getElementById("utm_source")?.value || "",
      utm_medium: document.getElementById("utm_medium")?.value || "",
      utm_campaign: document.getElementById("utm_campaign")?.value || "",
      page_url: window.location.href,
      submitted_at: new Date().toISOString()
    };

    const endpoint = window.PROF_CLINIC_CONFIG?.SHEETS_WEB_APP_URL?.trim();
    submitButton.disabled = true;
    submitButton.classList.add("loading");

    try {
      if (!endpoint) throw new Error("CONFIG_MISSING");

      await fetch(endpoint, {
        method: "POST",
        mode: "no-cors",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify(data)
      });

      status.className = "form-status success";
      status.textContent = "تم استلام طلبك بنجاح. سيتواصل معك فريق بروف كلينك قريبًا.";
      form.reset();
      if (pageUrl) pageUrl.value = window.location.href;
    } catch (error) {
      if (error.message === "CONFIG_MISSING") {
        status.className = "form-status error";
        status.innerHTML = "الصفحة جاهزة، ويلزم فقط إضافة رابط Google Sheets داخل ملف <b>config.js</b>. يمكنك الحجز الآن عبر واتساب.";
      } else {
        status.className = "form-status error";
        status.textContent = "تعذر إرسال الطلب حاليًا. فضلاً تواصل عبر واتساب أو حاول مرة أخرى.";
      }
    } finally {
      submitButton.disabled = false;
      submitButton.classList.remove("loading");
    }
  });
})();
