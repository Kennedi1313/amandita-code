const CONSENT_KEY = "kizi_analytics_consent_v2";
const GOOGLE_ANALYTICS_ID = import.meta.env.VITE_GOOGLE_ANALYTICS_ID?.trim();
const POSTHOG_PROJECT_KEY = import.meta.env.VITE_POSTHOG_PROJECT_KEY?.trim();
const POSTHOG_HOST = (
  import.meta.env.VITE_POSTHOG_HOST || "https://us.i.posthog.com"
).replace(/\/+$/, "");

let consentGranted = false;
let googleInitialized = false;
let posthogClient;
let posthogImport;
let posthogWasOptedOut = false;
let pageviewCaptured = false;
const queuedEvents = [];

const isLocalEnvironment = () =>
  ["localhost", "127.0.0.1", "::1"].includes(window.location.hostname);

const getEnvironment = () =>
  isLocalEnvironment() ? "local" : "production";

const initializeGoogleAnalytics = () => {
  if (!GOOGLE_ANALYTICS_ID) return;

  window.dataLayer = window.dataLayer || [];
  window.gtag = window.gtag || function gtag() {
    window.dataLayer.push(arguments);
  };

  if (googleInitialized) {
    window.gtag("consent", "update", { analytics_storage: "granted" });
    return;
  }

  window.gtag("consent", "default", {
    analytics_storage: "granted",
    ad_storage: "denied",
    ad_user_data: "denied",
    ad_personalization: "denied",
  });
  window.gtag("js", new Date());
  window.gtag("config", GOOGLE_ANALYTICS_ID, {
    allow_google_signals: false,
    allow_ad_personalization_signals: false,
    debug_mode: isLocalEnvironment(),
  });

  const scriptId = "kizi-google-analytics";
  if (!document.getElementById(scriptId)) {
    const script = document.createElement("script");
    script.id = scriptId;
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${GOOGLE_ANALYTICS_ID}`;
    document.head.appendChild(script);
  }

  googleInitialized = true;
};

const captureQueuedEvents = () => {
  if (!posthogClient || !consentGranted) return;

  while (queuedEvents.length > 0) {
    const [eventName, properties] = queuedEvents.shift();
    posthogClient.capture(eventName, properties);
  }
};

const initializePostHog = async () => {
  if (!POSTHOG_PROJECT_KEY || !consentGranted) return;

  if (!posthogImport) {
    posthogImport = import("posthog-js").then(({ default: posthog }) => {
      posthogClient = posthog.init(POSTHOG_PROJECT_KEY, {
        api_host: POSTHOG_HOST,
        defaults: "2026-08-30",
        autocapture: false,
        capture_pageview: false,
        capture_pageleave: false,
        capture_exceptions: false,
        capture_performance: false,
        disable_session_recording: true,
      });
      return posthogClient;
    }).catch(() => {
      posthogImport = undefined;
      queuedEvents.length = 0;
      return null;
    });
  }

  const client = await posthogImport;
  if (!client) return;

  if (!consentGranted) {
    client.opt_out_capturing();
    posthogWasOptedOut = true;
    return;
  }

  if (posthogWasOptedOut || client.has_opted_out_capturing()) {
    client.opt_in_capturing();
    posthogWasOptedOut = false;
  }

  client.register({ analytics_environment: getEnvironment() });

  if (!pageviewCaptured) {
    client.capture("$pageview");
    pageviewCaptured = true;
  }

  captureQueuedEvents();
};

export const enableAnalytics = () => {
  consentGranted = true;
  initializeGoogleAnalytics();
  void initializePostHog();
};

export const hasAnalyticsConfigured = () =>
  Boolean(GOOGLE_ANALYTICS_ID || POSTHOG_PROJECT_KEY);

export const disableAnalytics = () => {
  consentGranted = false;
  queuedEvents.length = 0;

  if (googleInitialized && window.gtag) {
    window.gtag("consent", "update", { analytics_storage: "denied" });
  }

  if (posthogClient) {
    posthogClient.opt_out_capturing();
    posthogWasOptedOut = true;
  }
};

export const trackAnalytics = (eventName, properties = {}) => {
  if (!consentGranted) return;

  const eventProperties = {
    ...properties,
    environment: getEnvironment(),
  };

  if (GOOGLE_ANALYTICS_ID && window.gtag) {
    window.gtag("event", eventName, eventProperties);
  }

  if (POSTHOG_PROJECT_KEY) {
    if (posthogClient) {
      posthogClient.capture(eventName, eventProperties);
    } else {
      queuedEvents.push([eventName, eventProperties]);
      void initializePostHog();
    }
  }
};

export const getAnalyticsConsent = () => {
  try {
    return window.localStorage.getItem(CONSENT_KEY);
  } catch {
    return null;
  }
};

export const saveAnalyticsConsent = (consent) => {
  try {
    window.localStorage.setItem(CONSENT_KEY, consent);
  } catch {
    // The in-memory choice still applies for this page even if storage is unavailable.
  }

  if (consent === "accepted") {
    enableAnalytics();
  } else {
    disableAnalytics();
  }
};
