console.log("✅ details.js loaded");

if (!window.i18n) {
  throw new Error("i18n not loaded — check script order");
}


let currentSort = "date";
let cachedProposals = [];

// ---------- Firebase ----------
const firebaseConfig = {
  apiKey: "AIzaSyA...",
  authDomain: "lets-meet.firebaseapp.com",
  projectId: "lets-meet-app-47969",
  storageBucket: "lets-meet.appspot.com",
  messagingSenderId: "1234567890",
  appId: "1:1234567890:web:abcdef123456"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// ---------- Helpers ----------
function getMeetingId() {
  if (window.location.hash.includes("/meeting/")) {
    return window.location.hash.split("/meeting/")[1];
  }
  return null;
}

function getVoters(p) {
  return {
    yes: Array.isArray(p?.voters?.yes) ? p.voters.yes : [],
    maybe: Array.isArray(p?.voters?.maybe) ? p.voters.maybe : [],
    no: Array.isArray(p?.voters?.no) ? p.voters.no : [],
  };
}

function getVoteStats(p) {
  const v = getVoters(p);
  return {
    yes: v.yes.length,
    maybe: v.maybe.length,
    no: v.no.length,
    weight: v.yes.length + v.maybe.length * 0.5
  };
}

function getMostPopularLocation(locations = []) {
  if (!Array.isArray(locations) || locations.length === 0) return null;

  return [...locations].sort((a, b) => {
    const av = Array.isArray(a.voters) ? a.voters.length : 0;
    const bv = Array.isArray(b.voters) ? b.voters.length : 0;
    return bv - av;
  })[0];
}

function renderVotersList(label, list) {
  if (!list.length) {
    return `<div class="voters-group"><strong>${label}:</strong> —</div>`;
  }

  return `
    <div class="voters-group">
      <strong>${label}:</strong>
      ${list.map(n => `<span class="voter">${n}</span>`).join(", ")}
    </div>
  `;
}

// ---------- DOM ----------
const titleEl = document.getElementById("title");
const descEl = document.getElementById("desc");
const statusEl = document.getElementById("status");
const proposalsEl = document.getElementById("proposals");
const organizerEl = document.getElementById("organizer");
const locationEl = document.getElementById("location");

// ---------- Guards ----------
const meetingId = getMeetingId();
if (!meetingId) {
  statusEl.textContent = i18n.t("noMeetingId");
  throw new Error("No meetingId");
}

// ---------- Nickname ----------
let nickname = localStorage.getItem(`nickname_${meetingId}`);
if (!nickname) {
  nickname = prompt(i18n.t("nickPrompt"));
  if (!nickname || nickname.trim().length < 2) {
    alert(i18n.t("nickRequired"));
    location.reload();
  }
  localStorage.setItem(`nickname_${meetingId}`, nickname.trim());
}

// ---------- Load meeting ----------
db.collection("meetings").doc(meetingId).onSnapshot(
  doc => {
    if (!doc.exists) {
      statusEl.textContent = i18n.t("meetingNotFound");
      return;
    }

    const m = doc.data();

  titleEl.textContent = m.title || "";
  statusEl.textContent = i18n.t("meetingLoaded");

    // Organizer
  organizerEl.innerHTML = m.organizerName
    ? `${i18n.t("organizer")}: <strong>${m.organizerName}</strong>`
    : "";

    // Lokalizacja
    let activeLocation = null;

    if (Array.isArray(m.locations) && m.locations.length > 0) {
      activeLocation =
        m.locationMode === "multiple"
          ? getMostPopularLocation(m.locations)
          : m.locations[0];
    }

    if (activeLocation?.name) {
      const query = encodeURIComponent(activeLocation.name);
      const mapUrl = `https://www.google.com/maps/search/?api=1&query=${query}`;

      locationEl.innerHTML = `
         ${i18n.t("location")}:
        <a href="${mapUrl}" target="_blank" rel="noopener">
          <strong>${activeLocation.name}</strong>
        </a>
        ${
          m.locationMode === "multiple"
            ? ` <span class="badge-hot">🔥</span>`
            : ""
        }
      `;
    } else {
      locationEl.innerHTML = "";
    }

    //statusEl.textContent = "✅ Spotkanie załadowane";
  },
  err => {
    console.error(err);
//    statusEl.textContent = "❌ Błąd ładowania spotkania";
    statusEl.textContent = i18n.t("meetingLoadError");
  }
);

// ---------- Load proposals ----------
db.collection(`meetings/${meetingId}/proposals`)
  .orderBy("createdAt", "asc")
  .onSnapshot(
    snapshot => {
      cachedProposals = [];

      snapshot.forEach(doc => {
        cachedProposals.push({ id: doc.id, ...doc.data() });
      });

      renderProposals();
    },
    err => {
      console.error(err);
      proposalsEl.innerHTML = `<p>${i18n.t("proposalsLoadError")}</p>`;
    }
  );

// ---------- Sorting + render ----------
function renderProposals() {
  proposalsEl.innerHTML = "";

  if (cachedProposals.length === 0) {
    proposalsEl.innerHTML = `<p>${i18n.t("noProposals")}</p>`;
    return;
  }

  let maxWeight = 0;
  cachedProposals.forEach(p => {
    maxWeight = Math.max(maxWeight, getVoteStats(p).weight);
  });

  const THRESHOLD = maxWeight * 0.8;

  const sorted = [...cachedProposals].sort((a, b) => {
    if (currentSort === "popular") {
      return getVoteStats(b).weight - getVoteStats(a).weight;
    }
    return new Date(a.date) - new Date(b.date);
  });

  sorted.forEach(p => renderProposal(p, THRESHOLD));
  i18n.apply();

}

// ---------- Sort buttons ----------
document.querySelectorAll(".sort-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    currentSort = btn.dataset.sort;

    document
      .querySelectorAll(".sort-btn")
      .forEach(b => b.classList.remove("active"));

    btn.classList.add("active");
    renderProposals();
  });
});

// ---------- Render proposal ----------
function renderProposal(p, THRESHOLD) {
  const stats = getVoteStats(p);
  const voters = getVoters(p);
  const isPopular = stats.weight > 0 && stats.weight >= THRESHOLD;

  const wrapper = document.createElement("div");
  wrapper.className = `proposal-row ${isPopular ? "popular" : ""}`;

  wrapper.innerHTML = `
    <div class="proposal-summary">
      <div class="proposal-date">
        📅 ${p.date || ""} ${p.time || ""}
        ${isPopular ? `<span class="badge-hot">🔥</span>` : ""}
      </div>

      <div class="proposal-votes">
        <span>✅ ${stats.yes}</span>
        <span>🤔 ${stats.maybe}</span>
        <span>❌ ${stats.no}</span>
      </div>
    </div>

<div class="proposal-details" style="display:none">
  ${renderVotersList(i18n.t("yes"), voters.yes)}
  ${renderVotersList(i18n.t("maybe"), voters.maybe)}
  ${renderVotersList(i18n.t("no"), voters.no)}
</div>

  `;

  const summary = wrapper.querySelector(".proposal-summary");
  const details = wrapper.querySelector(".proposal-details");

  summary.addEventListener("click", () => {
    const open = details.style.display === "block";
    details.style.display = open ? "none" : "block";
    wrapper.classList.toggle("expanded", !open);
  });

  proposalsEl.appendChild(wrapper);
}

// ---------- Buttons ----------
const voteBtn = document.getElementById("voteBtn");
const openAppBtn = document.getElementById("openAppBtn");
const openAppBtnFooter = document.getElementById("openAppBtnFooter");

if (voteBtn) {
  voteBtn.addEventListener("click", e => {
    e.preventDefault();
    window.location.href = `/meeting/vote.html#/${meetingId}`;
  });
}

function openApp() {
  alert("📲 Otwieranie aplikacji (TODO: deep link)");
}

openAppBtn?.addEventListener("click", openApp);
openAppBtnFooter?.addEventListener("click", openApp);
