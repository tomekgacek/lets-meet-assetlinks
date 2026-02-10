console.log("✅ vote-locations.js loaded");

const params = new URLSearchParams(window.location.search);
const meetingId = params.get("meetingId");
const nickname = params.get("nickname");

if (!meetingId) {
  alert(i18n.t("noMeetingId"));
  throw new Error("No meetingId");
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


const locationsEl = document.getElementById("locations");

function loadLocations() {
  const ref = db.collection("meetings").doc(meetingId);

  ref.onSnapshot(snap => {
    if (!snap.exists) return;

    const data = snap.data();

    document.getElementById("meeting-name").textContent = data.name || "";
    document.getElementById("meeting-description").textContent = data.description || "";

    renderLocations(data.locations || []);
  });
}




function renderLocations(locations) {
  locationsEl.innerHTML = "";

  locations.forEach(loc => {
    if (!loc.name) return;

    const voters = loc.voters || [];
    const voted = nickname && voters.includes(nickname);

    const div = document.createElement("div");
    div.className = `card ${voted ? "voted" : ""}`;

    div.innerHTML = `
      <h3>📍 ${loc.name}</h3>
      <a href="https://www.google.com/maps/search/?api=1&query=${loc.lat},${loc.lng}" target="_blank">
        🗺️ ${i18n.t("openInMaps")}
      </a>
      <p>${i18n.t("votesCount", { count: voters.length })}</p>
      <button class="btn ${voted ? "disabled" : ""}">
        ${voted ? i18n.t("voted") : i18n.t("vote")}
      </button>
    `;

    div.querySelector("button").onclick = () => vote(loc.id, locations);
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

loadLocations();

if (window.i18n && i18n.render) {
  i18n.render();
}
