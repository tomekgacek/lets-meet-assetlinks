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
  // obsługa: #/meeting/XYZ
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

// ---------- Load meeting ----------
db.collection("meetings")
  .doc(meetingId)
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
        proposalsEl.innerHTML =
          "<p>Brak zaproponowanych terminów</p>";
        return;
      }

      snapshot.forEach(doc => renderProposal(doc.data()));
    },
    err => {
      console.error("PROPOSALS ERROR:", err);
      proposalsEl.innerHTML =
        "<p>❌ Błąd ładowania terminów</p>";
    }
  );

// ---------- Render ----------
function renderProposal(p) {
  const el = document.createElement("div");
  el.className = "card";

  el.innerHTML = `
    <h3>📅 ${p.date || ""} ${p.time || ""}</h3>
    <p>
      ✅ ${(p.voters?.yes || []).length}
      🤔 ${(p.voters?.maybe || []).length}
      ❌ ${(p.voters?.no || []).length}
    </p>
  `;

  proposalsEl.appendChild(el);
}
