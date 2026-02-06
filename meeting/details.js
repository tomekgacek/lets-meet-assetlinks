console.log("✅ details.js loaded");

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
  if (p.voters && typeof p.voters === "object") {
    return {
      yes: Array.isArray(p.voters.yes) ? p.voters.yes : [],
      maybe: Array.isArray(p.voters.maybe) ? p.voters.maybe : [],
      no: Array.isArray(p.voters.no) ? p.voters.no : [],
    };
  }

  return {
    yes: Array.isArray(p.yes) ? p.yes : [],
    maybe: Array.isArray(p.maybe) ? p.maybe : [],
    no: Array.isArray(p.no) ? p.no : [],
  };
}

function getVoteStats(p) {
  const v = getVoters(p);
  const yes = v.yes.length;
  const maybe = v.maybe.length;
  const no = v.no.length;
  const weight = yes + maybe * 0.5;
  return { yes, maybe, no, weight };
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
  if (!list || list.length === 0) {
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

// organizer + location (dynamicznie, żeby nie grzebać w HTML)
const organizerEl = document.createElement("div");
organizerEl.className = "organizer-row";

const locationEl = document.createElement("div");
locationEl.className = "location-row";

titleEl.after(organizerEl);
organizerEl.after(locationEl);

// ---------- Guards ----------
const meetingId = getMeetingId();
if (!meetingId) {
  statusEl.textContent = "❌ Brak ID spotkania w linku";
  throw new Error("No meetingId");
}

// ---------- Nickname ----------
let nickname = localStorage.getItem(`nickname_${meetingId}`);
if (!nickname) {
  nickname = prompt("Podaj swój nick (min 2 znaki):");
  if (!nickname || nickname.trim().length < 2) {
    alert("Nick jest wymagany");
    location.reload();
  }
  localStorage.setItem(`nickname_${meetingId}`, nickname.trim());
}

// ---------- Load meeting ----------
db.collection("meetings").doc(meetingId).onSnapshot(
  doc => {
    if (!doc.exists) {
      statusEl.textContent = "❌ Spotkanie nie istnieje";
      return;
    }

    const m = doc.data();

    titleEl.textContent = m.title || "Spotkanie";
    descEl.textContent = m.description || "";

    // 👤 Organizer
    organizerEl.innerHTML = m.organizerName
      ? `👤 Organizator: <strong>${m.organizerName}</strong>`
      : "";

    // 📍 Lokalizacja
    let activeLocation = null;

    if (Array.isArray(m.locations) && m.locations.length > 0) {
      if (m.locationMode === "multiple") {
        activeLocation = getMostPopularLocation(m.locations);
      } else {
        activeLocation = m.locations[0];
      }
    }

    locationEl.innerHTML = activeLocation
      ? `📍 <strong>${activeLocation.name}</strong>${
          m.locationMode === "multiple"
            ? ` <span class="badge-hot">🔥 najpopularniejsza</span>`
            : ""
        }`
      : "";

    statusEl.textContent = "✅ Spotkanie załadowane";
  },
  err => {
    console.error(err);
    statusEl.textContent = "❌ Błąd ładowania spotkania";
  }
);

// ---------- Load proposals ----------
db.collection(`meetings/${meetingId}/proposals`)
  .orderBy("createdAt", "asc")
  .onSnapshot(
    snapshot => {
      proposalsEl.innerHTML = "";

      if (snapshot.empty) {
        proposalsEl.innerHTML = "<p>Brak zaproponowanych terminów</p>";
        return;
      }

      let maxWeight = 0;
      const proposals = [];

      snapshot.forEach(doc => {
        const p = { id: doc.id, ...doc.data() };
        const stats = getVoteStats(p);
        maxWeight = Math.max(maxWeight, stats.weight);
        proposals.push(p);
      });

      const THRESHOLD = maxWeight * 0.8;

      proposals.forEach(p =>
        renderProposal(p, THRESHOLD)
      );
    },
    err => {
      console.error(err);
      proposalsEl.innerHTML = "<p>❌ Błąd ładowania terminów</p>";
    }
  );

// ---------- Render ----------
function renderProposal(p, THRESHOLD) {
  const stats = getVoteStats(p);
  const voters = getVoters(p);
  const isPopular =
    stats.weight > 0 && stats.weight >= THRESHOLD;

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
      ${renderVotersList("✅ Tak", voters.yes)}
      ${renderVotersList("🤔 Może", voters.maybe)}
      ${renderVotersList("❌ Nie", voters.no)}
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

if (openAppBtn) openAppBtn.addEventListener("click", openApp);
if (openAppBtnFooter) openAppBtnFooter.addEventListener("click", openApp);
