// Standalone marketing/landing page. Booking now lives in a separate app.
const DASHBOARD_URL = 'http://localhost:3000';
document.querySelectorAll('[data-start]').forEach(b => b.onclick = () => { window.location.href = DASHBOARD_URL; });

const homeVoice = document.createElement('button');
homeVoice.className = 'home-voice';
homeVoice.textContent = '◉ Ask Luggage Mate';
homeVoice.onclick = () => document.querySelector('#assistant').hidden = !document.querySelector('#assistant').hidden;
document.body.append(homeVoice);

document.querySelector('#closeVoice').onclick = () => document.querySelector('#assistant').hidden = true;
document.querySelector('#runVoice').onclick = () => {
  document.querySelector('#voiceReply').innerHTML = '<p>I’d suggest The Penn Lobby for this sample trip: $4 per bag for the day and an estimated 8-minute detour.</p><p class="notice">Later, the voice agent will fill the same trip, inventory, and checkout fields. This preview does not book or change your choices.</p><button id="applyVoice">Use sample suggestion</button>';
  document.querySelector('#applyVoice').onclick = () => { window.location.href = DASHBOARD_URL; };
};
