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

const titleEl=document.getElementById("title");
const statusEl=document.getElementById("status");
const proposalsEl=document.getElementById("proposals");
const organizerEl=document.getElementById("organizer");
const locationEl=document.getElementById("location");

const meetingId=getMeetingId();

if(!meetingId){
if(statusEl){
statusEl.textContent=i18n.t("noMeetingId");
}
return;
}

let nickname=localStorage.getItem(`nickname_${meetingId}`);

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

locationEl.innerHTML=`
${i18n.t("location")}:
<a href="${mapUrl}" target="_blank" rel="noopener">
<strong>${activeLocation.name}</strong>
</a>
${meetingData.locationMode==="multiple"?" <span class='badge-hot'>🔥</span>":""}
`;
}else{
locationEl.innerHTML="";
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
},
err=>{
console.error(err);
statusEl.textContent=i18n.t("meetingLoadError");
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
return;
}

let maxWeight=Math.max(...cachedProposals.map(p=>getVoteStats(p).weight));
const THRESHOLD=maxWeight*0.8;

const sorted=[...cachedProposals].sort((a,b)=>
currentSort==="popular"
?getVoteStats(b).weight-getVoteStats(a).weight
:new Date(a.date)-new Date(b.date)
);

sorted.forEach(p=>{

const stats=getVoteStats(p);
const voters=getVoters(p);
const isPopular=stats.weight>=THRESHOLD&&stats.weight>0;

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

<div class="proposal-details" style="display:none">
${renderVotersList(i18n.t("yes"),voters.yes)}
${renderVotersList(i18n.t("maybe"),voters.maybe)}
${renderVotersList(i18n.t("no"),voters.no)}
</div>
`;

el.querySelector(".proposal-summary").addEventListener("click",()=>{
const d=el.querySelector(".proposal-details");
d.style.display=d.style.display==="block"?"none":"block";
});

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

const voteBtn = document.getElementById("voteBtn");
const openAppBtn = document.getElementById("openAppBtnFooter");

if (voteBtn) {
  voteBtn.addEventListener("click", e => {
    e.preventDefault();
    window.location.href = `/meeting/vote.html#/${meetingId}`;
  });
}

if (openAppBtn) {
  openAppBtn.addEventListener("click", e => {
    e.preventDefault();

    const deepLink = `letsmeet://meeting/${meetingId}`;
    const playStore =
      "https://play.google.com/store/apps/details?id=com.tomekgacek.letsmeet";

    // próbujemy otworzyć appkę
    window.location.href = deepLink;

    // fallback do Play Store
    setTimeout(() => {
      window.location.href = playStore;
    }, 800);
  });
}


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
