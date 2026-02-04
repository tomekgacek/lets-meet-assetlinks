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

const meetingId = getMeetingId();
console.log("MEETING ID:", meetingId);

// ---------- DOM ----------
const titleEl = document.getElementById("title");
const descEl = document.getElementById("desc");
const proposalsEl = document.getElementById("proposals");
const statusEl = document.getElementById("status");

// ---------- Guards ----------
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
db.collection("meetings").doc(meetingId)
  .onSnapshot(
    doc => {
      console.log("MEETING SNAP:", doc.exists);

      if (!doc.exists) {
        statusEl.textContent = "❌ Spotkanie nie istnieje";
        return;
      }

      const m = doc.data();
      titleEl.textContent = m.title || "Spotkanie";
      descEl.textContent = m.description || "";
      statusEl.textContent = "✅ Spotkanie załadowane";
    },
    err => {
      console.error("MEETING ERROR:", err);
      statusEl.textContent = "❌ Błąd ładowania spotkania";
    }
  );

// ---------- Load proposals ----------
db.collection(`meetings/${meetingId}/proposals`)
  .orderBy("createdAt", "asc")
  .onSnapshot(
    snapshot => {
      console.log("PROPOSALS:", snapshot.size);
      proposalsEl.innerHTML = "";

      if (snapshot.empty) {
        proposalsEl.innerHTML = "<p>Brak zaproponowanych terminów</p>";
        return;
      }

      snapshot.forEach(doc =>
  renderProposal({ id: doc.id, ...doc.data() })
);
    },
    err => {
      console.error("PROPOSALS ERROR:", err);
      proposalsEl.innerHTML = "<p>❌ Błąd ładowania terminów</p>";
    }
  );

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

function renderProposal(p) {
  const voters = getVoters(p);

  const wrapper = document.createElement("div");
  wrapper.className = "proposal-row";

  wrapper.innerHTML = `
    <div class="proposal-summary">
      <div class="proposal-date">
        📅 ${p.date || ""} ${p.time || ""}
      </div>

      <div class="proposal-votes">
        <span>✅ ${voters.yes.length}</span>
        <span>🤔 ${voters.maybe.length}</span>
        <span>❌ ${voters.no.length}</span>
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

// ---------- Render ----------
function renderProposal(p) {
  const voters = getVoters(p);

  const wrapper = document.createElement("div");
  wrapper.className = "proposal-row";

  wrapper.innerHTML = `
    <div class="proposal-summary">
      <div class="proposal-date">
        📅 ${p.date || ""} ${p.time || ""}
      </div>

      <div class="proposal-votes">
        <span>✅ ${voters.yes.length}</span>
        <span>🤔 ${voters.maybe.length}</span>
        <span>❌ ${voters.no.length}</span>
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




// ---------- Voting ----------
window.vote = async (proposalId, type) => {
  const ref = db.doc(`meetings/${meetingId}/proposals/${proposalId}`);

  const snap = await ref.get();
  if (!snap.exists) return;

  const voters = snap.data().voters || { yes: [], maybe: [], no: [] };
  const updates = {};

  ["yes", "maybe", "no"].forEach(k => {
    if (k === type) {
      if (voters[k].includes(nickname)) {
        updates[`voters.${k}`] = firebase.firestore.FieldValue.arrayRemove(nickname);
      } else {
        updates[`voters.${k}`] = firebase.firestore.FieldValue.arrayUnion(nickname);
      }
    } else {
      if (voters[k].includes(nickname)) {
        updates[`voters.${k}`] = firebase.firestore.FieldValue.arrayRemove(nickname);
      }
    }
  });

  await ref.update(updates);
};

// ---------- Buttons ----------
const voteBtn = document.getElementById("voteBtn");
const openAppBtn = document.getElementById("openAppBtn");
const openAppBtnFooter = document.getElementById("openAppBtnFooter");

if (voteBtn) {
  voteBtn.addEventListener("click", (e) => {
    e.preventDefault();
    window.location.href = `/meeting/vote.html#/${meetingId}`;
  });
}


function openApp() {
  // TODO: deep link do appki
  alert("📲 Otwieranie aplikacji (TODO)");
}

if (openAppBtn) openAppBtn.addEventListener("click", openApp);
if (openAppBtnFooter) openAppBtnFooter.addEventListener("click", openApp);
