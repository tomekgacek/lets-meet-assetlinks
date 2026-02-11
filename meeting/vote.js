console.log("✅ vote.js loaded");


document.addEventListener("DOMContentLoaded", () => {
  if (!window.i18n) {
    console.error("❌ i18n not loaded");
    return;
  }

  // ---------- Firebase ----------
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

  // ---------- Helpers ----------
function getMeetingId() {
  const hash = window.location.hash;
  if (!hash) return null;
  return hash.replace("#/", "");
}



  const meetingId = getMeetingId();
  if (!meetingId) {
    alert(i18n.t("noMeetingId"));
    return;
  }

  // ---------- Nickname ----------
  let nickname = localStorage.getItem(`nickname_${meetingId}`);
  if (!nickname) {
    nickname = prompt(i18n.t("nickPrompt"));
    if (!nickname || nickname.trim().length < 2) {
      alert(i18n.t("nickRequired"));
      location.reload();
      return;
    }
    localStorage.setItem(`nickname_${meetingId}`, nickname.trim());
  }

  // ---------- DOM ----------
  const proposalsEl = document.getElementById("proposals");
  const titleEl = document.getElementById("title");
  const descEl = document.getElementById("desc");
  const backBtn = document.getElementById("backBtn");

  let cachedProposals = [];
  let meetingData = null;

  // ---------- Meeting ----------
  db.collection("meetings").doc(meetingId).onSnapshot(doc => {
    if (!doc.exists) {
      titleEl.textContent = i18n.t("meetingNotFound");
      return;
    }
    meetingData = doc.data();
    renderStatic();
  });

  function renderStatic() {
    if (!meetingData) return;
    titleEl.textContent = meetingData.title || "";
    descEl.textContent = meetingData.description || "";
  }

  // ---------- Proposals ----------
  db.collection(`meetings/${meetingId}/proposals`)
    .orderBy("createdAt", "asc")
    .onSnapshot(snapshot => {
      cachedProposals = [];
      snapshot.forEach(doc => {
        cachedProposals.push({ id: doc.id, ...doc.data() });
      });
      renderProposals();
    });

  function renderProposals() {
    proposalsEl.innerHTML = "";

    cachedProposals.forEach(p => {
      const voters = {
        yes: Array.isArray(p.voters?.yes) ? p.voters.yes : [],
        maybe: Array.isArray(p.voters?.maybe) ? p.voters.maybe : [],
        no: Array.isArray(p.voters?.no) ? p.voters.no : []
      };

      const myVote =
        voters.yes.includes(nickname) ? "yes" :
        voters.maybe.includes(nickname) ? "maybe" :
        voters.no.includes(nickname) ? "no" : null;

      const el = document.createElement("div");
      el.className = "proposal-row";

      el.innerHTML = `
        <div class="proposal-summary">
          <div class="proposal-date">📅 ${p.date} ${p.time || ""}</div>
          <div class="proposal-votes">
            <span>✅ ${voters.yes.length}</span>
            <span>🤔 ${voters.maybe.length}</span>
            <span>❌ ${voters.no.length}</span>
          </div>
        </div>

        <div class="vote-buttons">
          ${renderVoteBtn(p.id, "yes", myVote)}
          ${renderVoteBtn(p.id, "maybe", myVote)}
          ${renderVoteBtn(p.id, "no", myVote)}
        </div>
      `;

      proposalsEl.appendChild(el);
    });
  }

  function renderVoteBtn(id, type, myVote) {
    const active = myVote === type;
    const disabled = myVote && myVote !== type;

    return `
      <button
        class="vote-btn ${active ? "active" : ""}"
        ${disabled ? "disabled" : ""}
        onclick="vote('${id}','${type}')"
      >
        ${i18n.t(type)}
      </button>
    `;
  }

  // ---------- Voting ----------
  window.vote = async (proposalId, type) => {
    const ref = db.doc(`meetings/${meetingId}/proposals/${proposalId}`);
    const snap = await ref.get();
    if (!snap.exists) return;

    const data = snap.data();
    const voters = {
      yes: Array.isArray(data.voters?.yes) ? data.voters.yes : [],
      maybe: Array.isArray(data.voters?.maybe) ? data.voters.maybe : [],
      no: Array.isArray(data.voters?.no) ? data.voters.no : []
    };

    const updates = {};

    ["yes", "maybe", "no"].forEach(k => {
      if (k === type) {
        updates[`voters.${k}`] = voters[k].includes(nickname)
          ? firebase.firestore.FieldValue.arrayRemove(nickname)
          : firebase.firestore.FieldValue.arrayUnion(nickname);
      } else if (voters[k].includes(nickname)) {
        updates[`voters.${k}`] = firebase.firestore.FieldValue.arrayRemove(nickname);
      }
    });

    await ref.update(updates);
  };

  // ---------- Back ----------
backBtn.addEventListener("click", () => {
  const params = new URLSearchParams(window.location.search);
  const lang = params.get("lang") || "pl";

  window.location.href = `/meeting/?lang=${lang}#/meeting/${meetingId}`;
});


  // ---------- React to language change ----------
  const originalSetLanguage = i18n.setLanguage.bind(i18n);
  i18n.setLanguage = lang => {
    originalSetLanguage(lang);
    renderStatic();
    renderProposals();
  };
});
