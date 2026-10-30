/* EventNest - shared logic for all pages: storage, login, events, registrations, dashboard.
   There is no server, so everything is saved in the browser (localStorage). */

// ---------- helpers ----------
const $ = id => document.getElementById(id);
const read  = (key, fallback) => JSON.parse(localStorage.getItem(key)) || fallback;   // text -> JS
const write = (key, value) => localStorage.setItem(key, JSON.stringify(value));       // JS -> text
const esc = s => String(s).replace(/[&<>"']/g, c => `&#${c.charCodeAt(0)};`);          // stops HTML injection

const events = () => read("eventnest-events", []);
const regs   = () => read("eventnest-regs", []);
const me     = () => read("eventnest-session", null);                                   // logged-in user or null
const taken  = id => regs().filter(r => r.eventId == id && r.status != "Rejected").length;
const when   = e => new Date(e.date + "T" + e.time).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
const byDate = (a, b) => (a.date + a.time).localeCompare(b.date + b.time);

// show a green (ok) or red message inside the element with this id
function say(id, text, ok) {
  if (!$(id)) return alert(text);
  $(id).textContent = text;
  $(id).style.color = ok ? "#15803d" : "#b91c1c";
}

// ---------- sample data, saved the first time the site opens ----------
if (!localStorage.getItem("eventnest-events")) {
  write("eventnest-events", [
    { id: 1, title: "Web Design Contest", category: "Tech", date: "2026-11-20", time: "11:00", venue: "Computer Lab 1", seats: 40, desc: "Build a small website in two hours." },
    { id: 2, title: "Open Mic Night", category: "Music", date: "2026-11-22", time: "18:00", venue: "Open Air Theatre", seats: 100, desc: "Sing, play or perform your own piece." },
    { id: 3, title: "Startup Pitch Day", category: "Business", date: "2026-11-25", time: "10:30", venue: "Main Auditorium", seats: 60, desc: "Pitch your idea to a panel of mentors." },
    { id: 4, title: "Football Fest", category: "Sports", date: "2026-11-28", time: "16:00", venue: "Main Ground", seats: 80, desc: "Five-a-side knockout tournament." },
    { id: 5, title: "Photography Walk", category: "Arts", date: "2026-12-02", time: "07:00", venue: "Campus Gate 2", seats: 30, desc: "Early morning campus photo walk." }
  ]);
  write("eventnest-users", [
    { email: "admin@eventnest.com", password: "admin123", name: "Admin", role: "admin" },
    { email: "student@eventnest.com", password: "student123", name: "Student", role: "user" }
  ]);
  write("eventnest-regs", []);
}

// ---------- menu link: Login or Logout ----------
if (me()) {
  $("authLink").textContent = "Logout (" + me().name + ")";
  $("authLink").href = "#";
  $("authLink").onclick = () => { localStorage.removeItem("eventnest-session"); location.href = "index.html"; };
}

// ---------- events: draw cards, search, filter, register ----------
function card(e) {
  const left = e.seats - taken(e.id);
  const mine = me() && regs().some(r => r.eventId == e.id && r.email == me().email);
  return `<div class="event"><span class="badge">${esc(e.category)}</span>
    <h3>${esc(e.title)}</h3><p>${when(e)}<br>${esc(e.venue)}</p><p>${esc(e.desc)}</p>
    <p><b>${left > 0 ? left + " seats left" : "Full"}</b></p>
    <button data-reg="${e.id}" ${mine || left <= 0 ? "disabled" : ""}>${mine ? "Registered" : left <= 0 ? "Full" : "Register"}</button></div>`;
}

function renderEvents() {
  const q = $("search").value.toLowerCase(), c = $("category").value;
  const list = events().filter(e => (c == "All" || e.category == c) && (e.title + e.venue).toLowerCase().includes(q)).sort(byDate);
  $("eventList").innerHTML = list.length ? list.map(card).join("") : "<p>No events match your search.</p>";
}

function refresh() {
  if ($("featured")) $("featured").innerHTML = events().filter(e => new Date(e.date + "T" + e.time) > new Date()).sort(byDate).slice(0, 3).map(card).join("");
  if ($("eventList")) renderEvents();
}

function register(id) {
  if (!me()) { location.href = "login.html"; return; }                      // must log in first
  write("eventnest-regs", [...regs(), { id: Date.now(), eventId: +id, email: me().email, status: "Pending" }]);
  say("msg", "Registered. Status: Pending admin approval.", true);
  refresh();
}

// ---------- login and sign up ----------
if ($("loginForm")) {
  $("loginForm").onsubmit = e => {
    e.preventDefault();
    const user = read("eventnest-users", []).find(u => u.email == $("lemail").value.trim().toLowerCase() && u.password == $("lpass").value);
    if (!user) return say("lmsg", "Wrong email or password.", false);
    write("eventnest-session", { email: user.email, name: user.name, role: user.role });
    location.href = "dashboard.html";
  };
  $("signupForm").onsubmit = e => {
    e.preventDefault();
    const email = $("semail").value.trim().toLowerCase(), users = read("eventnest-users", []);
    if ($("spass").value.length < 6) return say("smsg", "Password must have at least 6 characters.", false);
    if ($("spass").value != $("spass2").value) return say("smsg", "Passwords do not match.", false);
    if (users.some(u => u.email == email)) return say("smsg", "This email is already registered.", false);
    users.push({ email, password: $("spass").value, name: $("sname").value.trim(), role: "user" });
    write("eventnest-users", users);
    e.target.reset();
    say("smsg", "Account created. You can log in now.", true);
  };
}

// ---------- dashboard ----------
function renderDash() {
  const u = me(), all = regs(), R = u.role == "admin" ? all : all.filter(r => r.email == u.email);
  const count = s => R.filter(r => r.status == s).length;
  $("hello").textContent = "Welcome, " + u.name + " (" + u.role + ")";
  $("stats").innerHTML = [["Events", events().length], ["Registrations", R.length], ["Pending", count("Pending")], ["Confirmed", count("Confirmed")]]
    .map(([k, v]) => `<div class="card">${k}<b>${v}</b></div>`).join("");
  const title = id => (events().find(e => e.id == id) || { title: "(deleted event)" }).title;
  $("regRows").innerHTML = R.length ? R.map(r => `<tr><td>${esc(title(r.eventId))}</td><td>${esc(r.email)}</td>
    <td><span class="badge ${r.status}">${r.status}</span></td><td>${u.role == "admin"
      ? `<button data-st="Confirmed" data-id="${r.id}">Approve</button> <button data-st="Rejected" data-id="${r.id}">Reject</button>`
      : `<button data-cancel="${r.id}">Cancel</button>`}</td></tr>`).join("")
    : `<tr><td colspan="4">No registrations yet.</td></tr>`;
  if (u.role == "admin") {
    $("admin").hidden = false;
    $("eventRows").innerHTML = events().sort(byDate).map(e => `<tr><td>${esc(e.title)}</td><td>${e.date}</td><td>${taken(e.id)}/${e.seats}</td>
      <td><button data-edit="${e.id}">Edit</button> <button data-del="${e.id}">Delete</button></td></tr>`).join("");
  }
}

// admin: add a new event or update an existing one
if ($("eform")) $("eform").onsubmit = ev => {
  ev.preventDefault();
  const o = { title: $("etitle").value.trim(), category: $("ecategory").value, date: $("edate").value, time: $("etime").value,
              venue: $("evenue").value.trim(), seats: +$("eseats").value, desc: $("edesc").value.trim() };
  if (!o.title || o.seats < 1) return say("emsg", "Enter a title and at least 1 seat.", false);
  const list = events(), id = $("eid").value;
  if (id) list.splice(list.findIndex(x => x.id == id), 1, { ...o, id: +id });   // edit
  else list.push({ ...o, id: Date.now() });                                       // add
  write("eventnest-events", list);
  ev.target.reset(); $("eid").value = "";
  say("emsg", id ? "Event updated." : "Event added.", true);
  renderDash();
};

// ---------- one click listener for every button (event delegation) ----------
document.addEventListener("click", e => {
  const d = e.target.dataset;
  if (d.reg) register(d.reg);
  if (d.st) { write("eventnest-regs", regs().map(r => r.id == d.id ? { ...r, status: d.st } : r)); renderDash(); }   // approve / reject
  if (d.cancel) { write("eventnest-regs", regs().filter(r => r.id != d.cancel)); renderDash(); }
  if (d.del && confirm("Delete this event and its registrations?")) {
    write("eventnest-events", events().filter(x => x.id != d.del));
    write("eventnest-regs", regs().filter(r => r.eventId != d.del));
    renderDash();
  }
  if (d.edit) {                                                                   // fill the form with this event
    const ev = events().find(x => x.id == d.edit);
    ["title", "category", "date", "time", "venue", "seats", "desc"].forEach(k => $("e" + k).value = ev[k]);
    $("eid").value = ev.id;
    $("eform").scrollIntoView();
  }
});

// ---------- start ----------
if ($("eventList")) $("search").oninput = $("category").onchange = renderEvents;
refresh();
if ($("hello")) { if (me()) renderDash(); else location.href = "login.html"; }
