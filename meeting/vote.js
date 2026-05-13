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
  const confirmedBannerEl = document.getElementById("confirmedBanner");
  const bestDateBannerEl = document.getElementById("bestDateBanner");

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
    renderBanners();
  });

  function renderStatic() {
    if (!meetingData) return;
    titleEl.textContent = meetingData.title || "";
    descEl.textContent = meetingData.description || "";
  }

  function renderBanners() {
    // Confirmed date banner
    if (confirmedBannerEl) {
      if (meetingData && meetingData.confirmedDate) {
        confirmedBannerEl.innerHTML = `
          <div class="confirmed-banner">
            <span class="icon">✅</span>
            <span>${i18n.t("confirmedDate")}: ${meetingData.confirmedDate}</span>
          </div>
        `;
      } else {
        confirmedBannerEl.innerHTML = "";
      }
    }

    // Best date banner
    if (bestDateBannerEl && cachedProposals.length > 0) {
      const best = [...cachedProposals].sort((a, b) => {
        const aV = getVoters(a);
        const bV = getVoters(b);
        return (bV.yes.length + bV.maybe.length * 0.5) - (aV.yes.length + aV.maybe.length * 0.5);
      })[0];
      const bestVoters = getVoters(best);
      const bestWeight = bestVoters.yes.length + bestVoters.maybe.length * 0.5;
      if (bestWeight > 0 && !(meetingData && meetingData.confirmedDate)) {
        bestDateBannerEl.innerHTML = `
          <div class="best-date-banner">
            <span class="icon">🏆</span>
            <span>${i18n.t("bestDate")}: ${best.date || ""}${best.time ? " " + best.time : ""} — 👍 ${bestVoters.yes.length}</span>
          </div>
        `;
      } else {
        bestDateBannerEl.innerHTML = "";
      }
    } else if (bestDateBannerEl) {
      bestDateBannerEl.innerHTML = "";
    }
  }

  function getVoters(p) {
    return {
      yes: Array.isArray(p.voters?.yes) ? p.voters.yes : [],
      maybe: Array.isArray(p.voters?.maybe) ? p.voters.maybe : [],
      no: Array.isArray(p.voters?.no) ? p.voters.no : []
    };
  }

  function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }

  function renderProgressBar(yes, maybe, no) {
    const total = yes + maybe + no;
    if (total === 0) {
      return `<div class="vote-progress"><div class="no-votes-text">${i18n.t("noVotesYet")}</div></div>`;
    }
    const yP = (yes / total) * 100;
    const mP = (maybe / total) * 100;
    const nP = (no / total) * 100;
    return `
      <div class="vote-progress">
        <div class="progress-bar">
          ${yP > 0 ? `<div class="segment seg-yes" style="flex:${yP}"></div>` : ""}
          ${mP > 0 ? `<div class="segment seg-maybe" style="flex:${mP}"></div>` : ""}
          ${nP > 0 ? `<div class="segment seg-no" style="flex:${nP}"></div>` : ""}
        </div>
        <div class="progress-legend">
          <span><span class="legend-dot yes"></span> ${Math.round(yP)}%</span>
          <span><span class="legend-dot maybe"></span> ${Math.round(mP)}%</span>
          <span><span class="legend-dot no"></span> ${Math.round(nP)}%</span>
        </div>
      </div>
    `;
  }

  function renderCommentsSection(proposal) {
    const comments = Array.isArray(proposal.comments) ? proposal.comments : [];
    const count = comments.length;
    const commentsList = comments
      .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
      .map(c => {
        const time = c.createdAt ? new Date(c.createdAt).toLocaleString() : "";
        return `
          <div class="comment-item">
            <span class="comment-author">${escapeHtml(c.author || "")}</span>
            <span>${escapeHtml(c.text || "")}</span>
            <span class="comment-time">${time}</span>
          </div>
        `;
      }).join("");

    return `
      <div class="comments-section">
        <button class="comments-toggle" data-proposal-id="${proposal.id}">
          ${i18n.t("showComments", { count })}
        </button>
        <div class="comments-body" style="display:none" data-comments-for="${proposal.id}">
          <div class="comments-list">
            ${count > 0 ? commentsList : `<div class="no-votes-text">${i18n.t("noComments")}</div>`}
          </div>
          <div class="comment-form">
            <input type="text" class="comment-input" maxlength="200"
                   placeholder="${i18n.t("addComment")}"
                   data-comment-input="${proposal.id}" />
            <button class="comment-submit" data-comment-submit="${proposal.id}">
              ${i18n.t("send")}
            </button>
          </div>
        </div>
      </div>
    `;
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
      renderBanners();
    });

  function renderProposals() {
    proposalsEl.innerHTML = "";

    cachedProposals.forEach(p => {
      const voters = getVoters(p);

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

        ${renderProgressBar(voters.yes.length, voters.maybe.length, voters.no.length)}

        <div class="vote-buttons">
          ${renderVoteBtn(p.id, "yes", myVote)}
          ${renderVoteBtn(p.id, "maybe", myVote)}
          ${renderVoteBtn(p.id, "no", myVote)}
        </div>

        ${renderCommentsSection(p)}
      `;

      // Comments toggle
      const commToggle = el.querySelector(".comments-toggle");
      if (commToggle) {
        commToggle.addEventListener("click", () => {
          const body = el.querySelector(`.comments-body[data-comments-for="${p.id}"]`);
          if (body) {
            const visible = body.style.display === "block";
            body.style.display = visible ? "none" : "block";
            commToggle.textContent = visible
              ? i18n.t("showComments", { count: (Array.isArray(p.comments) ? p.comments.length : 0) })
              : i18n.t("hideComments");
          }
        });
      }

      // Comment submit
      const commSubmit = el.querySelector(`[data-comment-submit="${p.id}"]`);
      const commInput = el.querySelector(`[data-comment-input="${p.id}"]`);
      if (commSubmit && commInput) {
        commSubmit.addEventListener("click", async () => {
          const text = commInput.value.trim();
          if (!text || text.length < 1) return;
          commSubmit.disabled = true;
          try {
            const ref = db.doc(`meetings/${meetingId}/proposals/${p.id}`);
            await ref.update({
              comments: firebase.firestore.FieldValue.arrayUnion({
                author: nickname,
                text: text,
                createdAt: new Date().toISOString()
              })
            });
            commInput.value = "";
          } catch (e) {
            console.error("Comment error:", e);
          }
          commSubmit.disabled = false;
        });

        commInput.addEventListener("keydown", (e) => {
          if (e.key === "Enter") commSubmit.click();
        });
      }

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
    renderBanners();
  };
});
