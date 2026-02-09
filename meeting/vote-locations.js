const params = new URLSearchParams(window.location.search);
const meetingId = params.get("meetingId");
const nickname = params.get("nickname");

const locationsEl = document.getElementById("locations");

async function loadLocations() {
  const ref = firebase.firestore().collection("meetings").doc(meetingId);
  const snap = await ref.get();

  if (!snap.exists) return;

  const locations = snap.data().locations || [];
  renderLocations(locations);
}

function renderLocations(locations) {
  locationsEl.innerHTML = "";

  locations.forEach(loc => {
    if (!loc.name) return;

    const voters = loc.voters || [];
    const voted = nickname && voters.includes(nickname);

    const div = document.createElement("div");
    div.className = "card";

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

  await firebase.firestore().collection("meetings").doc(meetingId).update({
    locations: updated,
  });

  renderLocations(updated);
}

loadLocations();
