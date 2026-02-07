// --- Firebase config (TEN SAM co w appce)
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
  nickname = prompt(i18n.t("nickPrompt"));
  if (!nickname || nickname.trim().length < 2) {
    alert(i18n.t("nickRequired"));
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
    titleEl.innerText = i18n.t("meetingNotFound");
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

const myVote =
  voters.yes.includes(nickname)
    ? "yes"
    : voters.maybe.includes(nickname)
    ? "maybe"
    : voters.no.includes(nickname)
    ? "no"
    : null;


  const el = document.createElement("div");
  el.className = "proposal-row";

  el.innerHTML = `
    <div class="proposal-summary">
      <div class="proposal-date">
        📅 ${p.date} ${p.time || ""}
      </div>

      <div class="proposal-votes">
        <span>✅ ${voters.yes.length}</span>
        <span>🤔 ${voters.maybe.length}</span>
        <span>❌ ${voters.no.length}</span>
      </div>
    </div>

    <div class="vote-buttons">
${renderVoteButton(id, "yes", `✅ ${i18n.t("yes")}`, myVote)}
${renderVoteButton(id, "maybe", `🤔 ${i18n.t("maybe")}`, myVote)}
${renderVoteButton(id, "no", `❌ ${i18n.t("no")}`, myVote)}

    </div>
  `;

  proposalsEl.appendChild(el);
}
function renderVoteButton(id, type, label, myVote) {
  const isActive = myVote === type;
  const disabled = myVote && myVote !== type;

  return `
    <button
      class="vote-btn ${isActive ? "active" : ""}"
      ${disabled ? "disabled" : ""}
      onclick="vote('${id}','${type}')"
    >
      ${label}
    </button>
  `;
}


// --- Voting (1:1 z appki)
window.vote = async (proposalId, type) => {
  const ref = db.doc(`meetings/${meetingId}/proposals/${proposalId}`);

  const snap = await ref.get();
  if (!snap.exists) return;

  const data = snap.data();

const voters = data.voters && typeof data.voters === "object"
  ? {
      yes: Array.isArray(data.voters.yes) ? data.voters.yes : [],
      maybe: Array.isArray(data.voters.maybe) ? data.voters.maybe : [],
      no: Array.isArray(data.voters.no) ? data.voters.no : []
    }
  : {
      yes: Array.isArray(data.yes) ? data.yes : [],
      maybe: Array.isArray(data.maybe) ? data.maybe : [],
      no: Array.isArray(data.no) ? data.no : []
    };


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

const backBtn = document.getElementById("backBtn");

if (backBtn) {
  backBtn.addEventListener("click", () => {
    window.location.href = `/meeting/details.html#/meeting/${meetingId}`;
  });
}

