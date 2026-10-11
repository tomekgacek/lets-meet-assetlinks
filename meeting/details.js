console.log("✅ details.js loaded");

document.addEventListener("DOMContentLoaded", () => {

if (!window.i18n) {
console.error("❌ i18n not loaded");
return;
}

let currentSort="date";
let cachedProposals=[];
let meetingData=null;

const firebaseConfig={
apiKey:"AIzaSyA...",
authDomain:"lets-meet.firebaseapp.com",
projectId:"lets-meet-app-47969",
storageBucket:"lets-meet.appspot.com",
messagingSenderId:"1234567890",
appId:"1:1234567890:web:abcdef123456"
};

if(!firebase.apps.length){
firebase.initializeApp(firebaseConfig);
}
const db=firebase.firestore();

function getMeetingId(){
if(window.location.hash.includes("/meeting/")){
return window.location.hash.split("/meeting/")[1];
}
return null;
}

function getVoters(p){
return{
yes:Array.isArray(p?.voters?.yes)?p.voters.yes:[],
maybe:Array.isArray(p?.voters?.maybe)?p.voters.maybe:[],
no:Array.isArray(p?.voters?.no)?p.voters.no:[]
};
}

function getVoteStats(p){
const v=getVoters(p);
return{
yes:v.yes.length,
maybe:v.maybe.length,
no:v.no.length,
weight:v.yes.length+v.maybe.length*0.5
};
}

  

function getMostPopularLocation(locations=[]){
if(!Array.isArray(locations)||!locations.length)return null;

return[...locations].sort((a,b)=>{
const av=Array.isArray(a.voters)?a.voters.length:0;
const bv=Array.isArray(b.voters)?b.voters.length:0;
return bv-av;
})[0];
}

function renderVotersList(label,list){
if(!list.length){
return `<div class="voters-group"><strong>${label}:</strong> —</div>`;
}

return `
<div class="voters-group">
<strong>${label}:</strong>
${list.map(n=>`<span class="voter">${n}</span>`).join(", ")}
</div>
`;
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

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
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

const titleEl=document.getElementById("title");
const statusEl=document.getElementById("status");
const proposalsEl=document.getElementById("proposals");
const organizerEl=document.getElementById("organizer");
const locationEl=document.getElementById("location");
const voteLocationBtn = document.getElementById("voteLocationBtn");
const confirmedBannerEl = document.getElementById("confirmedBanner");
const bestDateBannerEl = document.getElementById("bestDateBanner");


const meetingId=getMeetingId();

if(!meetingId){
if(statusEl){
statusEl.textContent=i18n.t("noMeetingId");
}
return;
}

let nickname = localStorage.getItem(`nickname_${meetingId}`) || "";


if(!nickname){
nickname=prompt(i18n.t("nickPrompt"));
if(!nickname||nickname.trim().length<2){
alert(i18n.t("nickRequired"));
location.reload();
return;
}
localStorage.setItem(`nickname_${meetingId}`,nickname.trim());
}

function renderStatic(){

if(!meetingData)return;

titleEl.textContent = meetingData.title || "";

const descEl = document.getElementById("desc");
if (descEl) {
  descEl.textContent = meetingData.description || "";
}


organizerEl.innerHTML=meetingData.organizerName
?`${i18n.t("organizer")}: <strong>${meetingData.organizerName}</strong>`
:"";

let activeLocation=null;

if(Array.isArray(meetingData.locations)&&meetingData.locations.length){
activeLocation=
meetingData.locationMode==="multiple"
?getMostPopularLocation(meetingData.locations)
:meetingData.locations[0];
}

if(activeLocation?.name){
const query=encodeURIComponent(activeLocation.name);
const mapUrl=`https://www.google.com/maps/search/?api=1&query=${query}`;

const locationsCount = Array.isArray(meetingData.locations)
  ? meetingData.locations.length
  : 0;

locationEl.innerHTML = `
<span class="location-label">${i18n.t("location")}:</span>
<a
  href="${mapUrl}"
  target="_blank"
  rel="noopener"
  class="location-link"
>
  ${activeLocation.name}
</a>

${
  locationsCount > 1
    ? `
    <div class="location-meta">
      ${i18n.t("multipleLocations", { count: locationsCount })} ·
      <a href="./vote-locations.html?meetingId=${meetingId}&nickname=${nickname}">
        ${i18n.t("showAllLocations")}
      </a>
    </div>
    `
    : ""
}
`;

}else{
locationEl.innerHTML="";
}

// Confirmed date banner
if (confirmedBannerEl) {
  if (meetingData.confirmedDate) {
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

}

db.collection("meetings").doc(meetingId).onSnapshot(
doc=>{
if(!doc.exists){
statusEl.textContent=i18n.t("meetingNotFound");
return;
}
meetingData=doc.data();
renderStatic();
if (voteLocationBtn) {
  const locationsCount = Array.isArray(meetingData.locations)
    ? meetingData.locations.length
    : 0;

  if (locationsCount > 1) {
    voteLocationBtn.classList.remove("hidden");
    voteLocationBtn.href =
      `./vote-locations.html?meetingId=${meetingId}&nickname=${nickname}`;
  } else {
    voteLocationBtn.classList.add("hidden");
  }
}
  },
  err => {
    console.error(err);
    statusEl.textContent = i18n.t("meetingLoadError");
  }
);

db.collection(`meetings/${meetingId}/proposals`)
.orderBy("createdAt","asc")
.onSnapshot(snapshot=>{

cachedProposals=[];

snapshot.forEach(doc=>{
cachedProposals.push({id:doc.id,...doc.data()});
});

renderProposals();

},err=>{
console.error(err);
proposalsEl.innerHTML=`<p>${i18n.t("proposalsLoadError")}</p>`;
});

function renderProposals(){

proposalsEl.innerHTML="";

if(!cachedProposals.length){
proposalsEl.innerHTML=`<p>${i18n.t("noProposals")}</p>`;
if (bestDateBannerEl) bestDateBannerEl.innerHTML = "";
return;
}

let maxWeight=Math.max(...cachedProposals.map(p=>getVoteStats(p).weight));
const THRESHOLD=maxWeight*0.8;

// Best date banner
if (bestDateBannerEl) {
  const best = [...cachedProposals].sort((a, b) =>
    getVoteStats(b).weight - getVoteStats(a).weight
  )[0];
  const bestStats = getVoteStats(best);
  if (bestStats.weight > 0 && !meetingData?.confirmedDate) {
    bestDateBannerEl.innerHTML = `
      <div class="best-date-banner">
        <span class="icon">🏆</span>
        <span>${i18n.t("bestDate")}: ${best.date || ""}${best.time ? " " + best.time : ""} — 👍 ${bestStats.yes}</span>
      </div>
    `;
  } else {
    bestDateBannerEl.innerHTML = "";
  }
}

const sorted=[...cachedProposals].sort((a,b)=>
currentSort==="popular"
?getVoteStats(b).weight-getVoteStats(a).weight
:new Date(a.date)-new Date(b.date)
);

sorted.forEach(p=>{

const stats=getVoteStats(p);
const voters=getVoters(p);
const isPopular=stats.weight>=THRESHOLD&&stats.weight>0;
const total = stats.yes + stats.maybe + stats.no;

const el=document.createElement("div");
el.className=`proposal-row ${isPopular?"popular":""}`;

el.innerHTML=`
<div class="proposal-summary">
<div class="proposal-date">📅 ${p.date||""} ${p.time||""}
${isPopular?"<span class='badge-hot'>🔥</span>":""}
</div>
<div class="proposal-votes">
<span>✅ ${stats.yes}</span>
<span>🤔 ${stats.maybe}</span>
<span>❌ ${stats.no}</span>
</div>
</div>

${renderProgressBar(stats.yes, stats.maybe, stats.no)}

<div class="proposal-details" style="display:none">
${renderVotersList(i18n.t("yes"),voters.yes)}
${renderVotersList(i18n.t("maybe"),voters.maybe)}
${renderVotersList(i18n.t("no"),voters.no)}
</div>

${renderCommentsSection(p)}
`;

el.querySelector(".proposal-summary").addEventListener("click",()=>{
const d=el.querySelector(".proposal-details");
d.style.display=d.style.display==="block"?"none":"block";
});

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
      const actionAt = new Date().toISOString();
      await ref.update({
        comments: firebase.firestore.FieldValue.arrayUnion({
          author: nickname,
          text: text,
          createdAt: actionAt
        }),
        lastActionType: "comment",
        lastActionByUserId: null,
        lastActionByName: nickname,
        lastActionAt: actionAt
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

document.querySelectorAll(".sort-btn").forEach(btn=>{
btn.addEventListener("click",()=>{
currentSort=btn.dataset.sort;
document.querySelectorAll(".sort-btn").forEach(b=>b.classList.remove("active"));
btn.classList.add("active");
renderProposals();
});
});

/* CTA BUTTONS */

const voteBtn = document.getElementById("voteDateBtn");
// const openAppBtn = document.getElementById("openAppBtnFooter");

if (voteBtn) {
  voteBtn.addEventListener("click", e => {
    e.preventDefault();
    window.location.href = `/meeting/vote.html#/${meetingId}`;
  });
}

// if (openAppBtn) {
//   openAppBtn.addEventListener("click", e => {
//     e.preventDefault();

//     const deepLink = `letsmeet://meeting/${meetingId}`;
//     const playStore =
//       "https://play.google.com/store/apps/details?id=com.tomekgacek.letsmeet";

//     // próbujemy otworzyć appkę
//     window.location.href = deepLink;

//     // fallback do Play Store
//     setTimeout(() => {
//       window.location.href = playStore;
//     }, 800);
//   });
// }


/* MENU */
const menuToggle=document.getElementById("menuToggle");
const menuPanel=document.getElementById("menuPanel");

if(menuToggle&&menuPanel){
menuToggle.addEventListener("click",()=>{
menuPanel.classList.toggle("hidden");
});
}


const originalSetLanguage=i18n.setLanguage.bind(i18n);

i18n.setLanguage=lang=>{
originalSetLanguage(lang);
renderStatic();
renderProposals();
};

});
