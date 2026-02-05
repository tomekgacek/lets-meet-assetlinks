// --- Firebase config (TEN SAM co w appce)
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

// --- MeetingId z URL
function getMeetingId() {
  // przypadek 1: hash routing (#/meeting/XYZ)
  if (window.location.hash) {
    return window.location.hash.replace("#/", "");
  }

  // przypadek 2: normalny path (/meeting/XYZ)
  const parts = window.location.pathname.split("/");
  return parts[parts.length - 1];
}

const meetingId = getMeetingId();

if (!meetingId) {
  alert("Brak ID spotkania w linku");
  throw new Error("No meetingId");
}



// --- Nickname
let nickname = localStorage.getItem(`nickname_${meetingId}`);
if (!nickname) {
  nickname = prompt("Podaj swój nick (min 2 znaki):");
  if (!nickname || nickname.trim().length < 2) {
    alert("Nick jest wymagany");
    location.reload();
  }
  localStorage.setItem(`nickname_${meetingId}`, nickname.trim());
}

// --- DOM
const proposalsEl = document.getElementById("proposals");
const titleEl = document.getElementById("title");
const descEl = document.getElementById("desc");

// --- Load meeting
db.collection("meetings").doc(meetingId).onSnapshot(doc => {
  if (!doc.exists) {
    titleEl.innerText = "❌ Spotkanie nie istnieje";
    return;
  }
  const m = doc.data();
  titleEl.innerText = m.title;
  descEl.innerText = m.description || "";
});

// --- Load proposals
db.collection(`meetings/${meetingId}/proposals`)
  .orderBy("createdAt", "asc")
  .onSnapshot(snapshot => {
    proposalsEl.innerHTML = "";
    snapshot.forEach(doc => renderProposal(doc.id, doc.data()));
  });

function renderProposal(id, p) {
  const voters = {
  yes: Array.isArray(p.voters?.yes) ? p.voters.yes : (p.yes || []),
  maybe: Array.isArray(p.voters?.maybe) ? p.voters.maybe : (p.maybe || []),
  no: Array.isArray(p.voters?.no) ? p.voters.no : (p.no || []),
};


  const el = document.createElement("div");
  el.className = "card";
  el.innerHTML = `
    <h3>📅 ${p.date} ${p.time || ""}</h3>
    <p>
      ✅ ${voters.yes.length}
      🤔 ${voters.maybe.length}
      ❌ ${voters.no.length}
    </p>
    <div class="buttons">
      <button onclick="vote('${id}','yes')">✅ Tak</button>
      <button onclick="vote('${id}','maybe')">🤔 Może</button>
      <button onclick="vote('${id}','no')">❌ Nie</button>
    </div>
  `;
  proposalsEl.appendChild(el);
}

// --- Voting (1:1 z appki)
window.vote = async (proposalId, type) => {
  const ref = db.doc(`meetings/${meetingId}/proposals/${proposalId}`);

  const snap = await ref.get();
  if (!snap.exists) return;

  const voters = snap.data().voters || { yes: [], maybe: [], no: [] };

  const updates = {};

  ["yes","maybe","no"].forEach(k => {
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

