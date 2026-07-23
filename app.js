(() => {
  "use strict";

  const header = document.querySelector(".site-header");
  const year = document.getElementById("year");
  const form = document.getElementById("leadForm");
  const submitButton = form?.querySelector("button[type='submit']");
  const status = document.getElementById("formStatus");
  const serviceSelect = document.getElementById("service");
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  if (year) year.textContent = new Date().getFullYear();

  const setHeaderState = () => header?.classList.toggle("scrolled", window.scrollY > 24);
  setHeaderState();
  window.addEventListener("scroll", setHeaderState, { passive: true });

  const revealElements = [...document.querySelectorAll(".reveal")];
  revealElements.forEach((element, index) => {
    element.style.setProperty("--reveal-delay", `${Math.min(index % 4, 3) * 75}ms`);
  });

  if (reduceMotion || !("IntersectionObserver" in window)) {
    revealElements.forEach((element) => element.classList.add("visible"));
  } else {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("visible");
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1, rootMargin: "0px 0px -30px" });
    revealElements.forEach((element) => observer.observe(element));
  }

  document.querySelectorAll(".service-card").forEach((card) => {
    card.querySelector(".service-cta")?.addEventListener("click", () => {
      if (serviceSelect) serviceSelect.value = card.dataset.service || "";
      document.getElementById("consultation")?.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
      window.setTimeout(() => document.getElementById("name")?.focus({ preventScroll: true }), reduceMotion ? 50 : 650);
    });
  });

  const params = new URLSearchParams(window.location.search);
  ["utm_source", "utm_medium", "utm_campaign"].forEach((key) => {
    const field = document.getElementById(key);
    if (field) field.value = params.get(key) || "";
  });

  const pageUrl = document.getElementById("page_url");
  const referrer = document.getElementById("referrer");
  const leadId = document.getElementById("lead_id");
  if (pageUrl) pageUrl.value = window.location.href;
  if (referrer) referrer.value = document.referrer || "direct";

  const makeLeadId = () => `PROF-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
  if (leadId) leadId.value = makeLeadId();

  const normalizeMobile = (value) => value.replace(/[\s\-()]/g, "").replace(/^\+966/, "0").replace(/^966/, "0");
  const isValidSaudiMobile = (value) => /^05\d{8}$/.test(normalizeMobile(value));

  const setFieldError = (fieldName, message) => {
    const field = document.getElementById(fieldName);
    const error = document.querySelector(`[data-error-for="${fieldName}"]`);
    field?.classList.toggle("invalid", Boolean(message));
    if (error) error.textContent = message || "";
  };

  const setLoading = (loading) => {
    if (!submitButton) return;
    submitButton.disabled = loading;
    submitButton.classList.toggle("loading", loading);
    submitButton.setAttribute("aria-busy", loading ? "true" : "false");
  };

  form?.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!status) return;

    status.className = "form-status";
    status.textContent = "";

    const nameField = document.getElementById("name");
    const mobileField = document.getElementById("mobile");
    const consentField = document.getElementById("consent");
    const name = nameField?.value.trim() || "";
    const mobileInput = mobileField?.value.trim() || "";
    const mobile = normalizeMobile(mobileInput);
    const consent = Boolean(consentField?.checked);

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
      lead_id: leadId?.value || makeLeadId(),
      name,
      mobile,
      service: serviceSelect?.value || "استشارة عامة",
      utm_source: document.getElementById("utm_source")?.value || "",
      utm_medium: document.getElementById("utm_medium")?.value || "",
      utm_campaign: document.getElementById("utm_campaign")?.value || "",
      page_url: window.location.href,
      referrer: document.referrer || "direct",
      user_agent: navigator.userAgent,
      submitted_at: new Date().toISOString()
    };

    const endpoint = window.PROF_CLINIC_CONFIG?.SHEETS_WEB_APP_URL?.trim();
    setLoading(true);

    try {
      if (!endpoint || !endpoint.startsWith("https://script.google.com/macros/s/")) {
        throw new Error("CONFIG_MISSING");
      }

      const payload = new URLSearchParams();
      Object.entries(data).forEach(([key, value]) => payload.set(key, String(value ?? "")));

      await fetch(endpoint, {
        method: "POST",
        mode: "no-cors",
        cache: "no-store",
        keepalive: true,
        body: payload
      });

      status.className = "form-status success";
      status.textContent = "تم إرسال طلب الاستشارة بنجاح. سيتواصل معك فريق بروف كلينك لتأكيد الموعد.";
      form.reset();
      if (pageUrl) pageUrl.value = window.location.href;
      if (referrer) referrer.value = document.referrer || "direct";
      if (leadId) leadId.value = makeLeadId();
    } catch (error) {
      status.className = "form-status error";
      status.textContent = error.message === "CONFIG_MISSING"
        ? "لم يتم تفعيل رابط Google Sheets بعد. يلزم وضع رابط Web App النهائي داخل config.js."
        : "تعذر إرسال الطلب حاليًا. حاول مرة أخرى أو تواصل عبر واتساب.";
    } finally {
      setLoading(false);
    }
  });
})();
