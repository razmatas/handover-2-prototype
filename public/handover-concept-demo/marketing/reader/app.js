(function () {
  "use strict";

  var REFERENCE_NOW = "2026-11-11T09:30:00.000Z";
  var STORAGE_NAMESPACE = "handover.concept-reference.v1.reader.";

  // ─── Utilities ───────────────────────────────────────────────────────────────

  function escapeHtml(str) {
    if (str == null) return "";
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function formatDate(isoString) {
    if (!isoString) return "";
    try {
      return new Date(isoString).toLocaleDateString("en-GB", {
        timeZone: "UTC",
        month: "long", day: "numeric", year: "numeric",
      });
    } catch (_) { return ""; }
  }

  function slugify(text) {
    if (!text || typeof text !== "string") return "section";
    return text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "section";
  }

  function localStorageGet(key) {
    try { return window.localStorage ? window.localStorage.getItem(STORAGE_NAMESPACE + key) : null; }
    catch (_) { return null; }
  }

  function localStorageSet(key, value) {
    try { if (window.localStorage) window.localStorage.setItem(STORAGE_NAMESPACE + key, value); }
    catch (_) { }
  }

  function trackEvent(eventType, metadata, publicId) {
    // Concept-reference fixtures are intentionally private and never emit telemetry.
    void eventType; void metadata; void publicId;
  }

  var readerScriptBase = document.currentScript && document.currentScript.src;
  function getReaderBase() {
    var base = readerScriptBase;
    if (base) {
      var idx = base.lastIndexOf("/");
      return idx >= 0 ? base.slice(0, idx) : "/reader";
    }
    return ".";
  }

  // ─── Link card badge (snapshot.badges + badgeKey) ─────────────────────────────

  /** Lucide link icon — two subpaths (stroke) */
  var GENERIC_LINK_PATH_A =
    "M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71";
  var GENERIC_LINK_PATH_B =
    "M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71";

  var STATIC_SVG_BADGES = {
    airtable: { type: "svg", slug: "airtable", svgPath: "M11.992 1.966c-.434 0-.87.086-1.28.257L1.779 5.917c-.503.208-.49.908.012 1.116l8.982 3.558a3.266 3.266 0 0 0 2.454 0l8.982-3.558c.503-.196.503-.908.012-1.116l-8.957-3.694a3.255 3.255 0 0 0-1.272-.257zM23.4 8.056a.589.589 0 0 0-.222.045l-10.012 3.877a.612.612 0 0 0-.38.564v8.896a.6.6 0 0 0 .821.552L23.62 18.1a.583.583 0 0 0 .38-.551V8.653a.6.6 0 0 0-.6-.596zM.676 8.095a.644.644 0 0 0-.48.19C.086 8.396 0 8.53 0 8.69v8.355c0 .442.515.737.908.54l6.27-3.006.307-.147 2.969-1.436c.466-.22.43-.908-.061-1.092L.883 8.138a.57.57 0 0 0-.207-.044z", brandHex: "18BFFF", iconColor: "ffffff", title: "Airtable" },
    dropbox: { type: "svg", slug: "dropbox", svgPath: "M6 1.807L0 5.629l6 3.822 6.001-3.822L6 1.807zM18 1.807l-6 3.822 6 3.822 6-3.822-6-3.822zM0 13.274l6 3.822 6.001-3.822L6 9.452l-6 3.822zM18 9.452l-6 3.822 6 3.822 6-3.822-6-3.822zM6 18.371l6.001 3.822 6-3.822-6-3.822L6 18.371z", brandHex: "0061FF", iconColor: "ffffff", title: "Dropbox" },
    etsy: { type: "svg", slug: "etsy", svgPath: "M8.559 2.445c0-.325.033-.52.59-.52h7.465c1.3 0 2.02 1.11 2.54 3.193l.42 1.666h1.27c.23-4.728.43-6.784.43-6.784s-3.196.36-5.09.36H6.635L1.521.196v1.37l1.725.326c1.21.24 1.5.496 1.6 1.606 0 0 .11 3.27.11 8.64 0 5.385-.09 8.61-.09 8.61 0 .973-.39 1.333-1.59 1.573l-1.722.33V24l5.13-.165h8.55c1.935 0 6.39.165 6.39.165.105-1.17.75-6.48.855-7.064h-1.2l-1.284 2.91c-1.005 2.28-2.476 2.445-4.11 2.445h-4.906c-1.63 0-2.415-.64-2.415-2.05V12.8s3.62 0 4.79.096c.912.064 1.463.325 1.76 1.598l.39 1.695h1.41l-.09-4.278.192-4.305h-1.391l-.45 1.89c-.283 1.244-.48 1.47-1.754 1.6-1.666.17-4.815.14-4.815.14V2.45h-.05z", brandHex: "F16521", iconColor: "ffffff", title: "Etsy" },
    figma: { type: "svg", slug: "figma", svgPath: "M15.852 8.981h-4.588V0h4.588c2.476 0 4.49 2.014 4.49 4.49s-2.014 4.491-4.49 4.491zM12.735 7.51h3.117c1.665 0 3.019-1.355 3.019-3.019s-1.355-3.019-3.019-3.019h-3.117V7.51zm0 1.471H8.148c-2.476 0-4.49-2.014-4.49-4.49S5.672 0 8.148 0h4.588v8.981zm-4.587-7.51c-1.665 0-3.019 1.355-3.019 3.019s1.354 3.02 3.019 3.02h3.117V1.471H8.148zm4.587 15.019H8.148c-2.476 0-4.49-2.014-4.49-4.49s2.014-4.49 4.49-4.49h4.588v8.98zM8.148 8.981c-1.665 0-3.019 1.355-3.019 3.019s1.355 3.019 3.019 3.019h3.117V8.981H8.148zM8.172 24c-2.489 0-4.515-2.014-4.515-4.49s2.014-4.49 4.49-4.49h4.588v4.441c0 2.503-2.047 4.539-4.563 4.539zm-.024-7.51a3.023 3.023 0 0 0-3.019 3.019c0 1.665 1.365 3.019 3.044 3.019 1.705 0 3.093-1.376 3.093-3.068v-2.97H8.148zm7.704 0h-.098c-2.476 0-4.49-2.014-4.49-4.49s2.014-4.49 4.49-4.49h.098c2.476 0 4.49 2.014 4.49 4.49s-2.014 4.49-4.49 4.49zm-.097-7.509c-1.665 0-3.019 1.355-3.019 3.019s1.355 3.019 3.019 3.019h.098c1.665 0 3.019-1.355 3.019-3.019s-1.355-3.019-3.019-3.019h-.098z", brandHex: "F24E1E", iconColor: "ffffff", title: "Figma" },
    github: { type: "svg", slug: "github", svgPath: "M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12", brandHex: "181717", iconColor: "ffffff", title: "GitHub" },
    googledocs: { type: "svg", slug: "googledocs", svgPath: "M14.727 6.727H14V0H4.91c-.905 0-1.637.732-1.637 1.636v20.728c0 .904.732 1.636 1.636 1.636h14.182c.904 0 1.636-.732 1.636-1.636V6.727h-6zm-.545 10.455H7.09v-1.364h7.09v1.364zm2.727-3.273H7.091v-1.364h9.818v1.364zm0-3.273H7.091V9.273h9.818v1.363zM14.727 6h6l-6-6v6z", brandHex: "4285F4", iconColor: "ffffff", title: "Google Docs" },
    googledrive: { type: "svg", slug: "googledrive", svgPath: "M12.01 1.485c-2.082 0-3.754.02-3.743.047.01.02 1.708 3.001 3.774 6.62l3.76 6.574h3.76c2.081 0 3.753-.02 3.742-.047-.005-.02-1.708-3.001-3.775-6.62l-3.76-6.574zm-4.76 1.73a789.828 789.861 0 0 0-3.63 6.319L0 15.868l1.89 3.298 1.885 3.297 3.62-6.335 3.618-6.33-1.88-3.287C8.1 4.704 7.255 3.22 7.25 3.214zm2.259 12.653-.203.348c-.114.198-.96 1.672-1.88 3.287a423.93 423.948 0 0 1-1.698 2.97c-.01.026 3.24.042 7.222.042h7.244l1.796-3.157c.992-1.734 1.85-3.23 1.906-3.323l.104-.167h-7.249z", brandHex: "4285F4", iconColor: "ffffff", title: "Google Drive" },
    googlesheets: { type: "svg", slug: "googlesheets", svgPath: "M11.318 12.545H7.91v-1.909h3.41v1.91zM14.728 0v6h6l-6-6zm1.363 10.636h-3.41v1.91h3.41v-1.91zm0 3.273h-3.41v1.91h3.41v-1.91zM20.727 6.5v15.864c0 .904-.732 1.636-1.636 1.636H4.909a1.636 1.636 0 0 1-1.636-1.636V1.636C3.273.732 4.005 0 4.909 0h9.318v6.5h6.5zm-3.273 2.773H6.545v7.909h10.91v-7.91zm-6.136 4.636H7.91v1.91h3.41v-1.91z", brandHex: "34A853", iconColor: "ffffff", title: "Google Sheets" },
    googleslides: { type: "svg", slug: "googleslides", svgPath: "M16.09 15.273H7.91v-4.637h8.18v4.637zm1.728-8.523h2.91v15.614c0 .904-.733 1.636-1.637 1.636H4.909a1.636 1.636 0 0 1-1.636-1.636V1.636C3.273.732 4.005 0 4.909 0h9.068v6.75h3.841zm-.363 2.523H6.545v7.363h10.91V9.273zm-2.728-5.979V6h6.001l-6-6v3.294z", brandHex: "F4B400", iconColor: "ffffff", title: "Google Slides" },
    instagram: { type: "svg", slug: "instagram", svgPath: "M7.0301.084c-1.2768.0602-2.1487.264-2.911.5634-.7888.3075-1.4575.72-2.1228 1.3877-.6652.6677-1.075 1.3368-1.3802 2.127-.2954.7638-.4956 1.6365-.552 2.914-.0564 1.2775-.0689 1.6882-.0626 4.947.0062 3.2586.0206 3.6671.0825 4.9473.061 1.2765.264 2.1482.5635 2.9107.308.7889.72 1.4573 1.388 2.1228.6679.6655 1.3365 1.0743 2.1285 1.38.7632.295 1.6361.4961 2.9134.552 1.2773.056 1.6884.069 4.9462.0627 3.2578-.0062 3.668-.0207 4.9478-.0814 1.28-.0607 2.147-.2652 2.9098-.5633.7889-.3086 1.4578-.72 2.1228-1.3881.665-.6682 1.0745-1.3378 1.3795-2.1284.2957-.7632.4966-1.636.552-2.9124.056-1.2809.0692-1.6898.063-4.948-.0063-3.2583-.021-3.6668-.0817-4.9465-.0607-1.2797-.264-2.1487-.5633-2.9117-.3084-.7889-.72-1.4568-1.3876-2.1228C21.2982 1.33 20.628.9208 19.8378.6165 19.074.321 18.2017.1197 16.9244.0645 15.6471.0093 15.236-.005 11.977.0014 8.718.0076 8.31.0215 7.0301.0839m.1402 21.6932c-1.17-.0509-1.8053-.2453-2.2287-.408-.5606-.216-.96-.4771-1.3819-.895-.422-.4178-.6811-.8186-.9-1.378-.1644-.4234-.3624-1.058-.4171-2.228-.0595-1.2645-.072-1.6442-.079-4.848-.007-3.2037.0053-3.583.0607-4.848.05-1.169.2456-1.805.408-2.2282.216-.5613.4762-.96.895-1.3816.4188-.4217.8184-.6814 1.3783-.9003.423-.1651 1.0575-.3614 2.227-.4171 1.2655-.06 1.6447-.072 4.848-.079 3.2033-.007 3.5835.005 4.8495.0608 1.169.0508 1.8053.2445 2.228.408.5608.216.96.4754 1.3816.895.4217.4194.6816.8176.9005 1.3787.1653.4217.3617 1.056.4169 2.2263.0602 1.2655.0739 1.645.0796 4.848.0058 3.203-.0055 3.5834-.061 4.848-.051 1.17-.245 1.8055-.408 2.2294-.216.5604-.4763.96-.8954 1.3814-.419.4215-.8181.6811-1.3783.9-.4224.1649-1.0577.3617-2.2262.4174-1.2656.0595-1.6448.072-4.8493.079-3.2045.007-3.5825-.006-4.848-.0608M16.953 5.5864A1.44 1.44 0 1 0 18.39 4.144a1.44 1.44 0 0 0-1.437 1.4424M5.8385 12.012c.0067 3.4032 2.7706 6.1557 6.173 6.1493 3.4026-.0065 6.157-2.7701 6.1506-6.1733-.0065-3.4032-2.771-6.1565-6.174-6.1498-3.403.0067-6.156 2.771-6.1496 6.1738M8 12.0077a4 4 0 1 1 4.008 3.9921A3.9996 3.9996 0 0 1 8 12.0077", brandHex: "FF0069", iconColor: "ffffff", title: "Instagram" },
    loom: { type: "svg", slug: "loom", svgPath: "M24 10.665h-7.018l6.078-3.509-1.335-2.312-6.078 3.509 3.508-6.077L16.843.94l-3.508 6.077V0h-2.67v7.018L7.156.94 4.844 2.275l3.509 6.077-6.078-3.508L.94 7.156l6.078 3.509H0v2.67h7.017L.94 16.844l1.335 2.313 6.077-3.508-3.509 6.077 2.312 1.335 3.509-6.078V24h2.67v-7.017l3.508 6.077 2.312-1.335-3.509-6.078 6.078 3.509 1.335-2.313-6.077-3.508h7.017v-2.67H24zm-12 4.966a3.645 3.645 0 1 1 0-7.29 3.645 3.645 0 0 1 0 7.29z", brandHex: "625DF5", iconColor: "ffffff", title: "Loom" },
    mailchimp: { type: "svg", slug: "mailchimp", svgPath: "M11.267 0C6.791-.015-1.82 10.246 1.397 12.964l.79.669a3.88 3.88 0 0 0-.22 1.792c.084.84.518 1.644 1.22 2.266.666.59 1.542.964 2.392.964 1.406 3.24 4.62 5.228 8.386 5.34 4.04.12 7.433-1.776 8.854-5.182.093-.24.488-1.316.488-2.267 0-.956-.54-1.352-.885-1.352-.01-.037-.078-.286-.172-.586-.093-.3-.19-.51-.19-.51.375-.563.382-1.065.332-1.35-.053-.353-.2-.653-.496-.964-.296-.311-.902-.63-1.753-.868l-.446-.124c-.002-.019-.024-1.053-.043-1.497-.014-.32-.042-.822-.197-1.315-.186-.668-.508-1.253-.911-1.627 1.112-1.152 1.806-2.422 1.804-3.511-.003-2.095-2.576-2.729-5.746-1.416l-.672.285A678.22 678.22 0 0 0 12.7.504C12.304.159 11.817.002 11.267 0zm.073.873c.166 0 .322.019.465.058.297.084 1.28 1.224 1.28 1.224s-1.826 1.013-3.52 2.426c-2.28 1.757-4.005 4.311-5.037 7.082-.811.158-1.526.618-1.963 1.253-.261-.218-.748-.64-.834-.804-.698-1.326.761-3.902 1.781-5.357C5.834 3.44 9.37.867 11.34.873z", brandHex: "FFE01B", iconColor: "000000", title: "MailChimp" },
    notion: { type: "svg", slug: "notion", svgPath: "M4.459 4.208c.746.606 1.026.56 2.428.466l13.215-.793c.28 0 .047-.28-.046-.326L17.86 1.968c-.42-.326-.981-.7-2.055-.607L3.01 2.295c-.466.046-.56.28-.374.466zm.793 3.08v13.904c0 .747.373 1.027 1.214.98l14.523-.84c.841-.046.935-.56.935-1.167V6.354c0-.606-.233-.933-.748-.887l-15.177.887c-.56.047-.747.327-.747.933zm14.337.745c.093.42 0 .84-.42.888l-.7.14v10.264c-.608.327-1.168.514-1.635.514-.748 0-.935-.234-1.495-.933l-4.577-7.186v6.952L12.21 19s0 .84-1.168.84l-3.222.186c-.093-.186 0-.653.327-.746l.84-.233V9.854L7.822 9.76c-.094-.42.14-1.026.793-1.073l3.456-.233 4.764 7.279v-6.44l-1.215-.139c-.093-.514.28-.887.747-.933zM1.936 1.035l13.31-.98c1.634-.14 2.055-.047 3.082.7l4.249 2.986c.7.513.934.653.934 1.213v16.378c0 1.026-.373 1.634-1.68 1.726l-15.458.934c-.98.047-1.448-.093-1.962-.747l-3.129-4.06c-.56-.747-.793-1.306-.793-1.96V2.667c0-.839.374-1.54 1.447-1.632z", brandHex: "000000", iconColor: "ffffff", title: "Notion" },
    pinterest: { type: "svg", slug: "pinterest", svgPath: "M12.017 0C5.396 0 .029 5.367.029 11.987c0 5.079 3.158 9.417 7.618 11.162-.105-.949-.199-2.403.041-3.439.219-.937 1.406-5.957 1.406-5.957s-.359-.72-.359-1.781c0-1.663.967-2.911 2.168-2.911 1.024 0 1.518.769 1.518 1.688 0 1.029-.653 2.567-.992 3.992-.285 1.193.6 2.165 1.775 2.165 2.128 0 3.768-2.245 3.768-5.487 0-2.861-2.063-4.869-5.008-4.869-3.41 0-5.409 2.562-5.409 5.199 0 1.033.394 2.143.889 2.741.099.12.112.225.085.345-.09.375-.293 1.199-.334 1.363-.053.225-.172.271-.401.165-1.495-.69-2.433-2.878-2.433-4.646 0-3.776 2.748-7.252 7.92-7.252 4.158 0 7.392 2.967 7.392 6.923 0 4.135-2.607 7.462-6.233 7.462-1.214 0-2.354-.629-2.758-1.379l-.749 2.848c-.269 1.045-1.004 2.352-1.498 3.146 1.123.345 2.306.535 3.55.535 6.607 0 11.985-5.365 11.985-11.987C23.97 5.39 18.592.026 11.985.026L12.017 0z", brandHex: "BD081C", iconColor: "ffffff", title: "Pinterest" },
    shopify: { type: "svg", slug: "shopify", svgPath: "M15.337 23.979l7.216-1.561s-2.604-17.613-2.625-17.73c-.018-.116-.114-.192-.211-.192s-1.929-.136-1.929-.136-1.275-1.274-1.439-1.411c-.045-.037-.075-.057-.121-.074l-.914 21.104h.023zM11.71 11.305s-.81-.424-1.774-.424c-1.447 0-1.504.906-1.504 1.141 0 1.232 3.24 1.715 3.24 4.629 0 2.295-1.44 3.76-3.406 3.76-2.354 0-3.54-1.465-3.54-1.465l.646-2.086s1.245 1.066 2.28 1.066c.675 0 .975-.545.975-.932 0-1.619-2.654-1.694-2.654-4.359-.034-2.237 1.571-4.416 4.827-4.416 1.257 0 1.875.361 1.875.361l-.945 2.715-.02.01zM11.17.83c.136 0 .271.038.405.135-.984.465-2.064 1.639-2.508 3.992-.656.213-1.293.405-1.889.578C7.697 3.75 8.951.84 11.17.84V.83zm1.235 2.949v.135c-.754.232-1.583.484-2.394.736.466-1.777 1.333-2.645 2.085-2.971.193.501.309 1.176.309 2.1zm.539-2.234c.694.074 1.141.867 1.429 1.755-.349.114-.735.231-1.158.366v-.252c0-.752-.096-1.371-.271-1.871v.002zm2.992 1.289c-.02 0-.06.021-.078.021s-.289.075-.714.21c-.423-1.233-1.176-2.37-2.508-2.37h-.115C12.135.209 11.669 0 11.265 0 8.159 0 6.675 3.877 6.21 5.846c-1.194.365-2.063.636-2.16.674-.675.213-.694.232-.772.87-.075.462-1.83 14.063-1.83 14.063L15.009 24l.927-21.166z", brandHex: "7AB55C", iconColor: "ffffff", title: "Shopify" },
    tiktok: { type: "svg", slug: "tiktok", svgPath: "M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z", brandHex: "000000", iconColor: "ffffff", title: "TikTok" },
    vimeo: { type: "svg", slug: "vimeo", svgPath: "M23.9765 6.4168c-.105 2.338-1.739 5.5429-4.894 9.6088-3.2679 4.247-6.0258 6.3699-8.2898 6.3699-1.409 0-2.578-1.294-3.553-3.881l-1.9179-7.1138c-.719-2.584-1.488-3.878-2.312-3.878-.179 0-.806.378-1.8809 1.132l-1.129-1.457a315.06 315.06 0 003.501-3.1279c1.579-1.368 2.765-2.085 3.5539-2.159 1.867-.18 3.016 1.1 3.447 3.838.465 2.953.789 4.789.971 5.5069.5389 2.45 1.1309 3.674 1.7759 3.674.502 0 1.256-.796 2.265-2.385 1.004-1.589 1.54-2.797 1.612-3.628.144-1.371-.395-2.061-1.614-2.061-.574 0-1.167.121-1.777.391 1.186-3.8679 3.434-5.7568 6.7619-5.6368 2.4729.06 3.6279 1.664 3.4929 4.7969z", brandHex: "1AB7EA", iconColor: "ffffff", title: "Vimeo" },
    youtube: { type: "svg", slug: "youtube", svgPath: "M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z", brandHex: "FF0000", iconColor: "ffffff", title: "YouTube" }
  };

  function badgeEntryFromSnapshot(snapshot, card) {
    if (!card || !card.badgeKey) return null;
    if (snapshot && snapshot.badges && snapshot.badges[card.badgeKey]) {
      return snapshot.badges[card.badgeKey];
    }
    return STATIC_SVG_BADGES[card.badgeKey] || null;
  }

  function linkCardLabel(snapshot, card) {
    var entry = badgeEntryFromSnapshot(snapshot, card);
    if (entry && entry.type === "svg") return entry.title;
    if (entry && entry.type === "raster") return entry.hostname || "Link";
    return "Link";
  }

  function renderLinkThumbHtml(snapshot, card) {
    var entry = badgeEntryFromSnapshot(snapshot, card);
    if (entry && entry.type === "svg") {
      var bg = "#" + entry.brandHex;
      var fill = "#" + entry.iconColor;
      return (
        '<div class="link-card-thumb-fill" style="background:' +
        bg +
        '">' +
        '<svg class="link-card-thumb-svg" viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">' +
        '<path d="' +
        escapeHtml(entry.svgPath) +
        '" fill="' +
        fill +
        '"/>' +
        "</svg></div>"
      );
    }
    if (entry && entry.type === "raster") {
      return (
        '<div class="link-card-thumb-fill link-card-thumb-fill--raster">' +
        '<img src="' +
        escapeHtml(entry.dataUri) +
        '" width="28" height="28" alt="" />' +
        "</div>"
      );
    }
    return (
      '<div class="link-card-thumb-fill link-card-thumb-fill--generic">' +
      '<svg class="link-card-thumb-svg" viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
      '<path d="' +
      GENERIC_LINK_PATH_A +
      '"/>' +
      '<path d="' +
      GENERIC_LINK_PATH_B +
      '"/>' +
      "</svg></div>"
    );
  }

  /** Skip empty or literal "untitled" (case-insensitive). */
  function skipIfUntitled(str) {
    if (str == null) return null;
    var t = String(str).trim();
    if (!t) return null;
    if (t.toLowerCase() === "untitled") return null;
    return t;
  }

  /**
   * Main column header above link sections: client (optional), title (optional),
   * then one metadata line — layout rhythm from pen reference (not colors/fonts).
   */
  function projectClientName(project) {
    if (!project) return null;
    return project.clientName != null && project.clientName !== ""
      ? project.clientName
      : project.client_name != null && project.client_name !== ""
        ? project.client_name
        : null;
  }

  /** "Total links N · Last updated …" — shared by action bar and (until header refresh) main meta */
  function readerMetaLine(snapshot, cards) {
    var linkCount = cards.filter(function (c) {
      return c.type === "link";
    }).length;
    var updatedDate = formatDate(snapshot.publishedAt);
    var metaBits = ["Total links " + linkCount];
    if (updatedDate) metaBits.push("Last updated " + updatedDate);
    return metaBits.join(" · ");
  }

  function renderMainColumnHeader(project, cards, snapshot) {
    var client = skipIfUntitled(projectClientName(project));
    var title = skipIfUntitled(project.title);
    var parts = ['<header class="reader-main-header">'];
    // Title text and logo sit in a horizontal row — logo floats to the right
    parts.push('<div class="reader-main-header-row">');
    parts.push('<div class="reader-main-header-text">');
    if (client) {
      parts.push('<p class="reader-main-client">' + escapeHtml(client) + "</p>");
    }
    if (title) {
      parts.push('<h1 class="reader-main-title">' + escapeHtml(title) + "</h1>");
    }
    parts.push("</div>");
    if (project.clientLogoPath) {
      parts.push(
        '<div class="reader-client-logo-wrap">' +
        '<img class="reader-client-logo" src="' + escapeHtml(project.clientLogoPath) + '" alt="" loading="lazy" />' +
        "</div>"
      );
    }
    parts.push("</div>");
    var rawDesc = project.description && String(project.description).trim();
    if (rawDesc) {
      parts.push(
        '<p class="project-description">' +
          escapeHtml(rawDesc) +
          "</p>"
      );
    }
    parts.push("</header>");
    return parts.join("");
  }

  // ─── Render helpers ───────────────────────────────────────────────────────────

  function trimStr(v) {
    if (v == null) return "";
    return String(v).trim();
  }

  /** Non-empty strings joined with " • " for aside card meta lines. */
  function joinAsideMeta(parts) {
    var bits = [];
    for (var i = 0; i < parts.length; i++) {
      var t = trimStr(parts[i]);
      if (t) bits.push(t);
    }
    return bits.join(" • ");
  }

  /** Two-letter initials for avatar circle (name, email local-part, or "?"). */
  function initialsFromLabel(s) {
    var t = trimStr(String(s || "").replace(/\s*\([^)]*\)/g, ""));
    if (!t) return "?";
    var words = t.split(/\s+/).filter(Boolean);
    if (words.length >= 2) {
      return (words[0][0] + words[1][0]).toUpperCase();
    }
    return t.slice(0, 2).toUpperCase();
  }

  function personalAsideInitials(cleanName, email) {
    if (cleanName) return initialsFromLabel(cleanName);
    if (email) {
      var local = trimStr(email.split("@")[0] || email);
      return initialsFromLabel(local.replace(/[.+_-]+/g, " "));
    }
    return "?";
  }

  function authorShowsBusiness(author) {
    if (!author) return false;
    var m = author.authorDisplay;
    return m !== "personal";
  }

  function authorShowsPersonal(author) {
    if (!author) return false;
    var m = author.authorDisplay;
    return m !== "business";
  }

  function isEmail(value) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimStr(value));
  }

  function isPhone(value) {
    var t = trimStr(value);
    if (!t || t.indexOf("@") >= 0) return false;
    return t.replace(/\D/g, "").length >= 6;
  }

  function wrapContactValue(value) {
    var text = trimStr(value);
    if (!text) return "";
    if (isEmail(text)) {
      return (
        '<a class="reader-contact-link" href="mailto:' +
        escapeHtml(text) +
        '">' +
        escapeHtml(text) +
        "</a>"
      );
    }
    if (isPhone(text)) {
      return (
        '<a class="reader-contact-link" href="tel:' +
        escapeHtml(text.replace(/[^\d+]/g, "")) +
        '">' +
        escapeHtml(text) +
        "</a>"
      );
    }
    return escapeHtml(text);
  }

  function contactSecondaryLineHtml(parts) {
    var bits = [];
    for (var i = 0; i < parts.length; i++) {
      var html = wrapContactValue(parts[i]);
      if (html) bits.push(html);
    }
    return bits.join(" • ");
  }

  /** Vertical divider between inline contact segments (Figma 352:989). */
  function contactInlineHtml(primary, secondaryParts) {
    var primaryText = trimStr(primary);
    var secondaryHtml = contactSecondaryLineHtml(secondaryParts || []);
    if (!primaryText && !secondaryHtml) return "";
    var parts = ['<span class="reader-contact-inline">'];
    if (primaryText) {
      parts.push(
        '<span class="reader-contact-inline-primary">' +
          escapeHtml(primaryText) +
          "</span>"
      );
    }
    if (primaryText && secondaryHtml) {
      parts.push('<span class="reader-contact-divider" aria-hidden="true"></span>');
      parts.push(
        '<span class="reader-contact-inline-secondary">' +
          secondaryHtml +
          "</span>"
      );
    } else if (secondaryHtml) {
      parts.push(
        '<span class="reader-contact-inline-secondary">' +
          secondaryHtml +
          "</span>"
      );
    }
    parts.push("</span>");
    return parts.join("");
  }

  /** Contact block inside <main> — personal left, business right (Figma 352:981). */
  function renderContactDetailsBlock(author) {
    if (!author) return "";

    var personalHtml = "";
    var businessHtml = "";

    if (authorShowsPersonal(author)) {
      var cleanName = trimStr(
        String(author.displayName || "").replace(/\s*\([^)]*\)/g, "")
      );
      var title = trimStr(author.title);
      var email = trimStr(author.email);
      var nameTitleMeta = joinAsideMeta([cleanName, title]);
      if (cleanName || title || email) {
        var initials = personalAsideInitials(cleanName, email);
        personalHtml =
          '<div class="reader-contact-personal">' +
          '<div class="aside-avatar" aria-hidden="true">' +
          escapeHtml(initials) +
          "</div>" +
          contactInlineHtml(nameTitleMeta, email ? [email] : []) +
          "</div>";
      }
    }

    if (authorShowsBusiness(author)) {
      var bizName = trimStr(author.businessName);
      var bizSecondary = [author.businessPhone, author.businessEmail];
      if (bizName || contactSecondaryLineHtml(bizSecondary)) {
        businessHtml =
          '<div class="reader-contact-business">' +
          contactInlineHtml(bizName, bizSecondary) +
          "</div>";
      }
    }

    if (!personalHtml && !businessHtml) return "";

    return (
      '<section class="reader-contact-details">' +
      '<p class="reader-contact-details-label">Contact details</p>' +
      '<div class="reader-contact-details-row">' +
      personalHtml +
      businessHtml +
      "</div></section>"
    );
  }

  /** Light wordmark on dark reader; default wordmark on light reader. */
  function readerWordmarkSrc(readerBase) {
    if (document.documentElement.classList.contains("theme-dark")) {
      return readerBase + "/logo-wordmark-reversed.svg";
    }
    return readerBase + "/logo-wordmark.svg";
  }

  /** "Powered by" line + wordmark SVG (served from reader CDN, same base as app.js). */
  function poweredByFooterHtml(readerBase) {
    var src = readerWordmarkSrc(readerBase);
    return (
      '<a class="reader-powered-by" href="' + escapeHtml(getReaderBase().replace(/\/reader$/, "") + "/") + '" target="_blank" rel="noopener">' +
      '<span class="reader-powered-by-line">Powered by</span>' +
      '<img class="reader-powered-by-wordmark" src="' +
      escapeHtml(src) +
      '" alt="Handover" />' +
      "</a>"
    );
  }

  /** Footer brand + legal below main column. */
  function renderAsideColumn(readerBase) {
    return (
      '<div class="reader-footer-row">' +
      '<p class="reader-legal">All content and materials remain the property of their respective owners.</p>' +
      poweredByFooterHtml(readerBase) +
      "</div>"
    );
  }

  function renderSection(card, cards, index, readerBase, lastVisit, visitedIds, snapshot) {
    var linkCards = [];
    for (var i = index + 1; i < cards.length; i++) {
      if (cards[i].type === "section") break;
      if (cards[i].type === "link") linkCards.push(cards[i]);
    }
    var sectionId = "section-" + slugify(card.title);
    var parts = [
      '<div class="section" id="' + escapeHtml(sectionId) + '">',
      '<div class="section-header">',
      '<h2 class="section-heading">' + escapeHtml(card.title || "Untitled") + '</h2>',
      '</div>',
      '<div class="card-grid">',
    ];
    linkCards.forEach(function (link) {
      parts.push(renderCard(link, readerBase, lastVisit, visitedIds, snapshot));
    });
    parts.push("</div>");
    parts.push("</div>");
    return parts.join("");
  }

  function renderCard(card, readerBase, lastVisit, visitedIds, snapshot) {
    var url = card.url || "#";
    var label = linkCardLabel(snapshot, card);
    var isNew = lastVisit != null && card.publishedAt
      ? new Date(card.publishedAt).getTime() > lastVisit
      : false;
    var visited = visitedIds && visitedIds[card.id];

    var entry = badgeEntryFromSnapshot(snapshot, card);
    var tagClass = "tag-pill link-card-tag";
    var pillStyle = "";
    if (entry && entry.type === "svg") {
      tagClass += " tag-pill--brand";
      pillStyle =
        ' style="background:#' +
        entry.brandHex +
        ";color:#" +
        entry.iconColor +
        '"';
    } else {
      tagClass += " tag-generic";
    }

    return [
      '<a class="link-card' + (visited ? " visited" : "") + '" href="' + escapeHtml(readerBase + "/unavailable.html") + '" target="_blank" rel="noopener noreferrer" data-card-id="' + escapeHtml(card.id) + '">',
      '<div class="link-card-top">',
      '<span class="' + tagClass + '"' + pillStyle + ">" + escapeHtml(label) + "</span>",
      '<div class="link-card-top-actions">',
      isNew ? '<span class="badge-new">New</span>' : "",
      '<span class="link-card-goto" aria-hidden="true">↗</span>',
      "</div>",
      '</div>',
      '<div class="link-card-body">',
      '<div class="link-card-thumb">',
      renderLinkThumbHtml(snapshot, card),
      '</div>',
      '<div class="link-card-info">',
      '<p class="link-card-title">' + escapeHtml(card.title || "Untitled") + '</p>',
      card.note && card.note.trim()
        ? '<p class="link-card-desc">' + escapeHtml(card.note) + '</p>'
        : '<p class="link-card-desc">' + escapeHtml(url.replace(/^https?:\/\/(www\.)?/, "").split("/")[0]) + '</p>',
      '</div>',
      '</div>',
      '</a>',
    ].join("");
  }

  // ─── Main render ─────────────────────────────────────────────────────────────

  function render(snapshot) {
    var readerBase = getReaderBase();
    var container = document.getElementById("app");
    if (!container) return;

    var project = snapshot.project || {};
    var author = snapshot.author || null;
    var cards = snapshot.cards || [];
    var publicId = project.publicId || null;
    var hasLinks = cards.some(function (c) {
      return c.type === "link";
    });

    // Compute visit state
    var lastVisit = null;
    var visitedIds = {};
    if (publicId) {
      var stored = localStorageGet("reader_last_visit_" + publicId);
      if (stored) lastVisit = new Date(stored).getTime();
      var visitedJson = localStorageGet("reader_visited_" + publicId);
      if (visitedJson) {
        try {
          var arr = JSON.parse(visitedJson);
          if (Array.isArray(arr)) arr.forEach(function (id) { visitedIds[id] = true; });
        } catch (_) { }
      }
    }

    var html = [];

    if (hasLinks) {
      html.push('<div class="action-bar">');
      html.push('<div class="action-bar-inner">');
      html.push(
        '<span class="action-bar-meta">' +
          escapeHtml(readerMetaLine(snapshot, cards)) +
          "</span>"
      );
      html.push('<div class="action-bar-actions">');
      html.push(
        '<button type="button" class="action-bar-btn" data-action="share">Share</button>',
        '<button type="button" class="action-bar-btn" data-action="copy-all">Copy All Links</button>'
      );
      html.push("</div>");
      html.push("</div>");
      html.push("</div>");
    }

    // Two-column body (main left, aside right)
    html.push('<div class="page-body">');

    // Main column — link cards (first in row)
    html.push("<main>");
    html.push(renderMainColumnHeader(project, cards, snapshot));

    if (cards.length > 0) {
      html.push('<div class="sections">');

      // Orphan links (before first section heading)
      var orphans = [];
      var firstSectionIdx = -1;
      for (var i = 0; i < cards.length; i++) {
        if (cards[i].type === "section") { firstSectionIdx = i; break; }
      }
      var limit = firstSectionIdx === -1 ? cards.length : firstSectionIdx;
      for (var j = 0; j < limit; j++) {
        if (cards[j].type === "link") orphans.push(cards[j]);
      }

      if (orphans.length > 0) {
        html.push('<div class="section">');
        html.push('<div class="card-grid">');
        orphans.forEach(function (c) {
          html.push(renderCard(c, readerBase, lastVisit, visitedIds, snapshot));
        });
        html.push("</div></div>");
      }

      cards.forEach(function (card, idx) {
        if (card.type === "section") {
          html.push(renderSection(card, cards, idx, readerBase, lastVisit, visitedIds, snapshot));
        }
      });

      html.push("</div>"); // .sections
    } else {
      html.push('<div class="empty-state"><p>Nothing here yet.</p></div>');
    }

    html.push(renderContactDetailsBlock(author));

    html.push("</main>");

    // Footer — powered by + legal (below main column)
    html.push("<footer>");
    html.push(renderAsideColumn(readerBase));

    html.push("</footer>");

    html.push("</div>"); // .page-body

    container.innerHTML = html.join("");


    if (publicId) {
      localStorageSet("reader_last_visit_" + publicId, REFERENCE_NOW);
    }

    attachHandlers(container, cards, publicId);
    if (publicId) {
      trackEvent(
        "client_page_viewed",
        {
          referrer: typeof document !== "undefined" && document.referrer
            ? document.referrer
            : "",
          viewport_width:
            typeof window !== "undefined" && typeof window.innerWidth === "number"
              ? window.innerWidth
              : null,
        },
        publicId
      );
    }
  }

  // ─── Event handlers ───────────────────────────────────────────────────────────

  function attachHandlers(container, cards, publicId) {
    container.addEventListener("click", function (e) {
      var cardEl = e.target.closest("a.link-card");
      if (cardEl) {
        var cardId = cardEl.getAttribute("data-card-id");
        if (publicId && cardId) {
          trackEvent("client_link_opened", { card_id: cardId }, publicId);
          markVisited(publicId, cardId);
          cardEl.classList.add("visited");
        }
        return;
      }

      var btn = e.target.closest(".action-bar-btn");
      if (!btn) return;
      var action = btn.getAttribute("data-action");
      if (action === "share") {
        if (publicId) trackEvent("client_page_shared", {}, publicId);
        copyToClipboard(window.location.href, "Page link copied");
      } else if (action === "copy-all") {
        var parts = [];
        var currentSection = null;
        cards.forEach(function (c) {
          if (c.type === "section") { currentSection = c.title; }
          else if (c.type === "link" && c.url) {
            if (currentSection) { parts.push(currentSection); currentSection = null; }
            parts.push((c.title || "Link") + ": " + getReaderBase() + "/unavailable.html");
          }
        });
        var linkCount = cards.filter(function (c) { return c.type === "link"; }).length;
        if (publicId) trackEvent("client_all_links_copied", { card_count: linkCount }, publicId);
        copyToClipboard(parts.join("\n"), "All links copied");
      }
    });
  }

  function markVisited(publicId, cardId) {
    try {
      var key = "reader_visited_" + publicId;
      var stored = localStorageGet(key);
      var ids = stored ? JSON.parse(stored) : [];
      if (!Array.isArray(ids)) ids = [];
      if (ids.indexOf(cardId) < 0) { ids.push(cardId); localStorageSet(key, JSON.stringify(ids)); }
    } catch (_) { }
  }

  function copyToClipboard(text, successMsg) {
    if (text && navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(
        function () { showToast(successMsg); },
        function () { showToast("Could not copy"); }
      );
    }
  }

  function showToast(message) {
    var existing = document.querySelector(".toast");
    if (existing) existing.remove();
    var el = document.createElement("div");
    el.className = "toast";
    el.textContent = message;
    el.setAttribute("role", "status");
    el.setAttribute("aria-live", "polite");
    document.body.appendChild(el);
    setTimeout(function () {
      el.classList.add("toast-out");
      setTimeout(function () { el.remove(); }, 200);
    }, 2000);
  }

  // ─── Loading / error ──────────────────────────────────────────────────────────

  function showLoading() {
    var container = document.getElementById("app");
    if (!container) return;
    container.innerHTML = '<div class="loading-state"><div class="loading-spinner"></div></div>';
  }

  function showUnavailable() {
    var readerBase = getReaderBase();
    var container = document.getElementById("app");
    if (!container) return;
    container.innerHTML = [
      '<div class="unavailable-state">',
      '<main class="unavailable-panel">',
      '<img class="unavailable-wordmark" src="' + escapeHtml(readerBase + "/logo-wordmark.svg") + '" alt="Handover" />',
      '<h1>Handover unavailable</h1>',
      '<p>This handover is not available. Check the link or contact the person who shared it.</p>',
      "</main>",
      "</div>",
    ].join("");
  }

  // ─── PIN access ───────────────────────────────────────────────────────────────

  var pinPromptTracked = false;

  function publicIdFromAccessUrl(url) {
    if (!url) return null;
    var match = String(url).match(/\/api\/public-access\/([^/]+)\//);
    return match ? match[1] : null;
  }

  function fetchProtectedSnapshot(snapshotUrl, unlockUrl, onUnlockRequired) {
    return fetch(snapshotUrl, { credentials: "same-origin" })
      .then(function (res) {
        if (res.status === 401) {
          onUnlockRequired();
          return null;
        }
        if (!res.ok) throw new Error("Failed to load");
        return res.json();
      });
  }

  function renderProtectedSnapshot(snapshot) {
    render(snapshot);
    var publicId =
      (snapshot.project && snapshot.project.publicId) ||
      publicIdFromAccessUrl(window.__SNAPSHOT_URL__);
    if (publicId) {
      trackEvent("protected_snapshot_loaded", {}, publicId);
    }
  }

  function showPinForm(unlockUrl, snapshotUrl, publicId) {
    var readerBase = getReaderBase();
    var container = document.getElementById("app");
    if (!container) return;

    var wordmarkSrc = readerWordmarkSrc(readerBase);
    container.innerHTML = [
      '<div class="unavailable-state pin-state">',
      '<main class="unavailable-panel pin-panel">',
      '<img class="unavailable-wordmark" src="' + escapeHtml(wordmarkSrc) + '" alt="Handover" />',
      '<h1>This handover is protected</h1>',
      '<p class="pin-subtext">Enter your PIN</p>',
      '<form class="pin-form" autocomplete="off" novalidate>',
      '<div class="pin-inputs" role="group" aria-label="4-digit PIN">',
      '<div class="pin-digit-cell" data-index="0"><span class="pin-digit-dot" aria-hidden="true"></span><input class="pin-digit" type="text" inputmode="numeric" maxlength="1" pattern="[0-9]" autocomplete="one-time-code" aria-label="Digit 1 of 4" data-index="0" /></div>',
      '<div class="pin-digit-cell" data-index="1"><span class="pin-digit-dot" aria-hidden="true"></span><input class="pin-digit" type="text" inputmode="numeric" maxlength="1" pattern="[0-9]" autocomplete="off" aria-label="Digit 2 of 4" data-index="1" /></div>',
      '<div class="pin-digit-cell" data-index="2"><span class="pin-digit-dot" aria-hidden="true"></span><input class="pin-digit" type="text" inputmode="numeric" maxlength="1" pattern="[0-9]" autocomplete="off" aria-label="Digit 3 of 4" data-index="2" /></div>',
      '<div class="pin-digit-cell" data-index="3"><span class="pin-digit-dot" aria-hidden="true"></span><input class="pin-digit" type="text" inputmode="numeric" maxlength="1" pattern="[0-9]" autocomplete="off" aria-label="Digit 4 of 4" data-index="3" /></div>',
      "</div>",
      '<p class="pin-error" role="alert" aria-live="polite"></p>',
      "</form>",
      "</main>",
      "</div>",
    ].join("");

    if (!pinPromptTracked) {
      pinPromptTracked = true;
      trackEvent("pin_prompt_shown", {}, publicId);
    }

    var form = container.querySelector(".pin-form");
    var inputs = container.querySelectorAll(".pin-digit");
    var errorEl = container.querySelector(".pin-error");
    var verifying = false;

    function setError(message) {
      if (errorEl) errorEl.textContent = message || "";
    }

    function syncDigitCell(input) {
      var cell = input.closest(".pin-digit-cell");
      if (!cell) return;
      if (input.value) cell.classList.add("is-filled");
      else cell.classList.remove("is-filled");
    }

    function clearInputs() {
      for (var i = 0; i < inputs.length; i++) {
        inputs[i].value = "";
        inputs[i].disabled = false;
        syncDigitCell(inputs[i]);
      }
      if (inputs[0]) inputs[0].focus();
    }

    function setVerifying(active) {
      verifying = active;
      for (var i = 0; i < inputs.length; i++) {
        inputs[i].disabled = active;
      }
      if (form) {
        if (active) form.classList.add("pin-form--verifying");
        else form.classList.remove("pin-form--verifying");
      }
    }

    function collectPin() {
      var digits = "";
      for (var i = 0; i < inputs.length; i++) {
        digits += inputs[i].value;
      }
      return digits;
    }

    function submitPin() {
      if (verifying) return;
      var pin = collectPin();
      if (pin.length !== 4 || !/^\d{4}$/.test(pin)) return;

      setVerifying(true);
      setError("");

      fetch(unlockUrl, {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin: pin }),
      })
        .then(function (res) {
          if (res.status === 204) {
            showLoading();
            return fetchProtectedSnapshot(snapshotUrl, unlockUrl, function () {
              showPinForm(unlockUrl, snapshotUrl, publicId);
            })
              .then(function (data) {
                if (data) renderProtectedSnapshot(data);
              })
              .catch(function () {
                showUnavailable();
              });
          }
          if (res.status === 401) {
            setVerifying(false);
            setError("Incorrect PIN — try again.");
            clearInputs();
            return;
          }
          if (res.status === 429) {
            setVerifying(false);
            setError("Too many attempts — try again in a few minutes.");
            clearInputs();
            return;
          }
          throw new Error("Unlock failed");
        })
        .catch(function (err) {
          if (err && err.message === "Unlock failed") {
            setVerifying(false);
            setError("Something went wrong — please try again.");
            clearInputs();
            return;
          }
          if (!verifying) return;
          setVerifying(false);
          setError("Something went wrong — please try again.");
          clearInputs();
        });
    }

    function setDigitValue(input, value) {
      input.value = value;
      syncDigitCell(input);
    }

    function fillFromPaste(text, startIndex) {
      var digits = String(text || "").replace(/\D/g, "").slice(0, 4);
      if (!digits) return false;
      for (var i = 0; i < digits.length && startIndex + i < inputs.length; i++) {
        setDigitValue(inputs[startIndex + i], digits[i]);
      }
      var nextIdx = Math.min(startIndex + digits.length, inputs.length - 1);
      if (inputs[nextIdx]) inputs[nextIdx].focus();
      if (collectPin().length === 4) submitPin();
      return true;
    }

    for (var idx = 0; idx < inputs.length; idx++) {
      (function (input, index) {
        syncDigitCell(input);

        input.addEventListener("focus", function () {
          input.select();
        });

        input.addEventListener("input", function () {
          var val = input.value.replace(/\D/g, "").slice(-1);
          setDigitValue(input, val);
          setError("");
          if (val && index < inputs.length - 1) {
            inputs[index + 1].focus();
          }
          if (collectPin().length === 4) submitPin();
        });

        input.addEventListener("keydown", function (e) {
          if (/^\d$/.test(e.key)) {
            setDigitValue(input, e.key);
            setError("");
            if (index < inputs.length - 1) {
              inputs[index + 1].focus();
            }
            if (collectPin().length === 4) submitPin();
            e.preventDefault();
            return;
          }
          if (e.key === "Backspace") {
            if (input.value) {
              setDigitValue(input, "");
              e.preventDefault();
            } else if (index > 0) {
              setDigitValue(inputs[index - 1], "");
              inputs[index - 1].focus();
              e.preventDefault();
            }
            return;
          }
          if (e.key === "Enter") {
            e.preventDefault();
            submitPin();
          }
        });

        input.addEventListener("paste", function (e) {
          e.preventDefault();
          var text = (e.clipboardData && e.clipboardData.getData("text")) || "";
          fillFromPaste(text, index);
        });
      })(inputs[idx], idx);
    }

    if (form) {
      form.addEventListener("submit", function (e) {
        e.preventDefault();
        submitPin();
      });
    }

    if (inputs[0]) inputs[0].focus();
  }

  function initPinProtected() {
    var snapshotUrl = window.__SNAPSHOT_URL__;
    var unlockUrl = window.__UNLOCK_URL__;
    if (!snapshotUrl || !unlockUrl) {
      showUnavailable();
      return;
    }

    var publicId = publicIdFromAccessUrl(snapshotUrl) || publicIdFromAccessUrl(unlockUrl);
    showLoading();

    fetchProtectedSnapshot(snapshotUrl, unlockUrl, function () {
      showPinForm(unlockUrl, snapshotUrl, publicId);
    })
      .then(function (data) {
        if (data) renderProtectedSnapshot(data);
      })
      .catch(function () {
        showUnavailable();
      });
  }

  // ─── Init ─────────────────────────────────────────────────────────────────────

  function init() {
    // Resolve system theme before any render
    var html = document.documentElement;
    if (html.classList.contains("theme-system")) {
      var prefersDark =
        window.matchMedia &&
        window.matchMedia("(prefers-color-scheme: dark)").matches;
      html.classList.remove("theme-system");
      html.classList.add(prefersDark ? "theme-dark" : "theme-light");
    }

    // Legacy fallback: if no theme class is present, default to light
    if (
      !html.classList.contains("theme-dark") &&
      !html.classList.contains("theme-light")
    ) {
      html.classList.add("theme-light");
    }

    var noscript = document.querySelector("#app noscript");
    if (noscript) noscript.remove();

    if (window.__ACCESS_MODE__ === "pin") {
      initPinProtected();
      return;
    }

    var url = window.__SNAPSHOT_URL__ || "snapshot.json";
    showLoading();

    fetch(url)
      .then(function (res) {
        if (!res.ok) throw new Error("Failed to load");
        return res.json();
      })
      .then(function (data) { render(data); })
      .catch(function () { showUnavailable(); });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
