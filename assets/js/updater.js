(function () {
  "use strict";

  var config = window.SequenceKeeperUpdateConfig || {};
  var versionLabel = document.getElementById("sequence-keeper-version");
  var creatorLink = document.getElementById("sequence-keeper-creator-link");
  var notice = document.getElementById("sequence-keeper-update-notice");
  var noticeMessage = document.getElementById("sequence-keeper-update-message");
  var releaseLink = document.getElementById("sequence-keeper-manual-update-link");
  var openReleaseButton = document.getElementById("sequence-keeper-open-release");
  var continueButton = document.getElementById("sequence-keeper-continue");
  var whatsNew = document.getElementById("sequence-keeper-whats-new");
  var whatsNewCopy = document.getElementById("sequence-keeper-whats-new-copy");
  var whatsNewClose = document.getElementById("sequence-keeper-whats-new-close");
  var repository = String(config.repository || "morleyae/SequenceKeeper")
    .replace(/^https?:\/\/github\.com\//i, "")
    .replace(/\/+$/, "");
  var currentVersion = String(config.currentVersion || "").replace(/^v/i, "");
  var releasesUrl = "https://github.com/" + repository + "/releases/latest";
  var apiBase = "https://api.github.com/repos/" + repository + "/releases";
  var installedVersionKey = "sequencekeeper.installedVersion";

  function openUrl(url) {
    var cep = window.cep || window.__adobe_cep__;
    if (cep && cep.util && typeof cep.util.openURLInDefaultBrowser === "function") {
      cep.util.openURLInDefaultBrowser(url);
      return;
    }
    window.open(url, "_blank", "noopener");
  }

  function compareVersions(first, second) {
    var a = String(first || "").replace(/^v/i, "").split(".").map(Number);
    var b = String(second || "").replace(/^v/i, "").split(".").map(Number);
    for (var index = 0; index < 3; index += 1) {
      if ((a[index] || 0) > (b[index] || 0)) return 1;
      if ((a[index] || 0) < (b[index] || 0)) return -1;
    }
    return 0;
  }

  function versionFromTag(tag) {
    var match = String(tag || "").match(/(?:^|-)v?(\d+\.\d+\.\d+)$/i);
    return match ? match[1] : "";
  }

  function requestRelease(url, callback) {
    var request = new XMLHttpRequest();
    request.open("GET", url, true);
    request.setRequestHeader("Accept", "application/vnd.github+json");
    request.setRequestHeader("X-GitHub-Api-Version", "2022-11-28");
    request.timeout = 12000;
    request.onload = function () {
      if (request.status < 200 || request.status >= 300) return callback(new Error("GitHub returned HTTP " + request.status));
      try { callback(null, JSON.parse(request.responseText)); }
      catch (error) { callback(error); }
    };
    request.onerror = function () { callback(new Error("Could not reach GitHub.")); };
    request.ontimeout = function () { callback(new Error("The GitHub request timed out.")); };
    request.send();
  }

  function closeNotice() {
    notice.hidden = true;
  }

  function closeWhatsNew() {
    whatsNew.hidden = true;
    try { window.localStorage.setItem(installedVersionKey, currentVersion); } catch (error) {}
  }

  function showWhatsNew(release) {
    if (!whatsNew || !whatsNewCopy) return;
    whatsNewCopy.textContent = String(release && release.body || "See the release page for the full change summary.").trim();
    whatsNew.hidden = false;
  }

  function openWhatsNewForCurrentVersion() {
    var previousVersion = "";
    try { previousVersion = window.localStorage.getItem(installedVersionKey) || ""; } catch (error) {}
    if (!previousVersion) {
      try { window.localStorage.setItem(installedVersionKey, currentVersion); } catch (error) {}
      return;
    }
    if (compareVersions(currentVersion, previousVersion) <= 0) return;

    var tag = "sequencekeeper-v" + currentVersion;
    requestRelease(apiBase + "/tags/" + encodeURIComponent(tag), function (error, release) {
      if (error || !release) return;
      showWhatsNew(release);
    });
  }

  if (versionLabel) {
    versionLabel.textContent = config.development
      ? "SequenceKeeper Dev"
      : (currentVersion ? "SequenceKeeper v" + currentVersion : "SequenceKeeper");
    if (config.development) versionLabel.removeAttribute("href");
    else versionLabel.href = releasesUrl;
  }
  if (releaseLink) releaseLink.href = releasesUrl;
  if (creatorLink) creatorLink.href = "https://www.tiktok.com/@morley.ae";
  [versionLabel, creatorLink].forEach(function (link) {
    if (!link || (config.development && link === versionLabel)) return;
    link.addEventListener("click", function (event) {
      event.preventDefault();
      openUrl(link.href);
    });
  });
  if (openReleaseButton) openReleaseButton.addEventListener("click", function () { openUrl(releasesUrl); });
  if (continueButton) continueButton.addEventListener("click", closeNotice);
  if (whatsNewClose) whatsNewClose.addEventListener("click", closeWhatsNew);

  if (config.development) return;
  requestRelease(apiBase + "/latest", function (error, release) {
    if (error || !release) {
      openWhatsNewForCurrentVersion();
      return;
    }
    var latestVersion = versionFromTag(release.tag_name);
    if (!latestVersion || compareVersions(latestVersion, currentVersion) <= 0) {
      openWhatsNewForCurrentVersion();
      return;
    }
    if (!notice || !noticeMessage) return;
    noticeMessage.textContent = "Version " + latestVersion + " is available. You are using version " + currentVersion + ".";
    notice.hidden = false;
  });
})();