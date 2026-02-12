document.addEventListener("DOMContentLoaded", () => {

console.log("✅ vote-locations.js loaded");

function getMeetingId() {
  const hash = window.location.hash;
  if (!hash) return null;
  const parts = hash.replace("#/", "").split("/");
  return parts[1] || null;
}

const meetingId = getMeetingId();

if (!meetingId) {
  alert("No meeting ID");
  throw new Error("No meetingId");
}

let nickname = localStorage.getItem(`nickname_${meetingId}`);

if (!nickname) {
  nickname = prompt(i18n.t("nickPrompt"));
  if (!nickname || nickname.trim().length < 2) {
    alert(i18n.t("nickRequired"));
    location.reload();
    return;
  }
  nickname = nickname.trim();
  localStorage.setItem(`nickname_${meetingId}`, nickname);
}



/* FIREBASE INIT */

const firebaseConfig = {
  apiKey: "AIzaSyA...",
  authDomain: "lets-meet.firebaseapp.com",
  projectId: "lets-meet-app-47969",
  storageBucket: "lets-meet.appspot.com",
  messagingSenderId: "1234567890",
  appId: "1:1234567890:web:abcdef123456"
};

if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

const db = firebase.firestore();

let unsubscribeLocations = null;
const locationsEl = document.getElementById("locations");

function loadLocations() {
  if (unsubscribeLocations) unsubscribeLocations();

  const ref = db.collection("meetings").doc(meetingId);

  unsubscribeLocations = ref.onSnapshot(snap => {
    if (!snap.exists) return;

    const data = snap.data();

    document.getElementById("meeting-name").textContent = data.title || "";
    document.getElementById("meeting-description").textContent = data.description || "";

    renderLocations(data.locations || []);
  });
}


const originalSetLanguage = i18n.setLanguage.bind(i18n);

i18n.setLanguage = (lang, updateUrl = true) => {
  originalSetLanguage(lang, updateUrl);
  loadLocations(); 
};



function renderLocations(locations) {
  locationsEl.innerHTML = "";

  if (!locations.length) return;

  // 🔥 1. Obliczamy max głosów
  const maxVotes = Math.max(
    ...locations.map(loc =>
      Array.isArray(loc.voters) ? loc.voters.length : 0
    )
  );

  const THRESHOLD = maxVotes * 0.8;

  locations.forEach(loc => {
    if (!loc.name) return;

    const voters = Array.isArray(loc.voters) ? loc.voters : [];
    const voted = nickname && voters.includes(nickname);
    const isPopular =
      voters.length >= THRESHOLD && voters.length > 0;

    const div = document.createElement("div");
    div.className = `card ${voted ? "voted" : ""} ${isPopular ? "popular" : ""}`;

    div.innerHTML = `
      <div class="location-summary">
        <h3>
          📍 ${loc.name}
          ${isPopular ? "<span class='badge-hot'>🔥</span>" : ""}
        </h3>
        <p>${i18n.t("votesCount", { count: voters.length })}</p>
      </div>

      <div class="location-details" style="display:none">
        ${
          voters.length
            ? voters.map(v => `<span class="voter">${v}</span>`).join(", ")
            : `<span>—</span>`
        }
      </div>

      <a href="https://www.google.com/maps/search/?api=1&query=${loc.lat},${loc.lng}" target="_blank">
        🗺️ ${i18n.t("openInMaps")}
      </a>

      <button class="btn" ${voted ? "disabled" : ""}>
        ${voted ? i18n.t("voted") : i18n.t("vote")}
      </button>
    `;

    // toggle lista głosujących
    div.querySelector(".location-summary").addEventListener("click", () => {
      const details = div.querySelector(".location-details");
      details.style.display =
        details.style.display === "block" ? "none" : "block";
    });

    div.querySelector("button").onclick = () =>
      vote(loc.id, locations);

    locationsEl.appendChild(div);
  });
}


async function vote(locationId, locations) {
  if (!nickname) return;

  const updated = locations.map(loc => {
    if (loc.id !== locationId) return loc;

    const voters = loc.voters || [];
    const hasVoted = voters.includes(nickname);

    return {
      ...loc,
      voters: hasVoted
        ? voters.filter(v => v !== nickname)
        : [...voters, nickname],
    };
  });

await db.collection("meetings").doc(meetingId).update({
  locations: updated,
});

}

// ---------- Back ----------
const backBtn = document.getElementById("backBtn");

backBtn.addEventListener("click", () => {
  const params = new URLSearchParams(window.location.search);
  const lang = params.get("lang") || "pl";

  window.location.href = `/meeting/?lang=${lang}#/meeting/${meetingId}`;
});


loadLocations();

});

