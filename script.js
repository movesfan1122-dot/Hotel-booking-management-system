const $ = (s) => document.querySelector(s);
const esc = (s) =>
  String(s).replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
const fmt = (d) =>
  d.getFullYear() +
  "-" +
  String(d.getMonth() + 1).padStart(2, "0") +
  "-" +
  String(d.getDate()).padStart(2, "0");
const parse = (s) => new Date(s + "T00:00:00");
const add = (s, n) => {
  const d = parse(s);
  d.setDate(d.getDate() + n);
  return fmt(d);
};
const diff = (a, b) => Math.round((parse(b) - parse(a)) / 864e5);
const inr = (n) => "₹" + Number(n).toLocaleString("en-IN");
const today = fmt(new Date());
const KEY = "harbourview-v1";

let S;
function seed() {
  const b = (g, p, room, i, o, n, st) => ({
    id: crypto.randomUUID ? crypto.randomUUID() : String(Math.random()),
    guest: g,
    phone: p,
    room,
    in: add(today, i),
    out: add(today, o),
    n,
    status: st,
  });
  return {
    rooms: [
      { id: "r1", num: "101", type: "Standard", rate: 2800, cap: 2 },
      { id: "r2", num: "102", type: "Standard", rate: 2800, cap: 2 },
      { id: "r3", num: "201", type: "Deluxe", rate: 4200, cap: 3 },
      { id: "r4", num: "202", type: "Deluxe", rate: 4200, cap: 3 },
      { id: "r5", num: "301", type: "Suite", rate: 7500, cap: 4 },
      { id: "r6", num: "302", type: "Family", rate: 5600, cap: 5 },
    ],
    bookings: [
      b("Anita Sharma", "98290 11223", "r1", -1, 2, 2, "checked-in"),
      b("Rohan Mehta", "99280 45510", "r1", 3, 6, 1, "confirmed"),
      b("Priya Nair", "98765 43210", "r3", 0, 4, 3, "confirmed"),
      b("Imran Qureshi", "97110 88201", "r4", -3, 0, 2, "checked-out"),
      b("Kavita Joshi", "94140 22871", "r5", 1, 5, 4, "confirmed"),
      b("David Fernandes", "98100 77412", "r6", -2, 1, 5, "checked-in"),
      b("Meera Iyer", "90010 33456", "r2", 5, 9, 2, "confirmed"),
    ],
  };
}
function load() {
  try {
    const r = localStorage.getItem(KEY);
    if (r) {
      S = JSON.parse(r);
      return;
    }
  } catch (e) {}
  S = seed();
}
function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify(S));
  } catch (e) {}
}
function toast(t) {
  const e = $("#toast");
  e.textContent = t;
  e.classList.add("on");
  clearTimeout(toast.t);
  toast.t = setTimeout(() => e.classList.remove("on"), 2200);
}

const room = (id) => S.rooms.find((r) => r.id === id);
const live = (b) => b.status !== "cancelled";
const clash = (roomId, i, o, skip) =>
  S.bookings.find(
    (b) =>
      b.id !== skip &&
      b.room === roomId &&
      live(b) &&
      b.status !== "checked-out" &&
      b.in < o &&
      i < b.out,
  );
const total = (b) => {
  const r = room(b.room);
  return r ? r.rate * Math.max(diff(b.in, b.out), 0) : 0;
};

let view = "timeline",
  start = today,
  q = "",
  filt = "all";

function stats() {
  const act = S.bookings.filter(live);
  const occ = act.filter(
    (b) => b.in <= today && today < b.out && b.status !== "checked-out",
  ).length;
  const arr = act.filter(
    (b) => b.in === today && b.status === "confirmed",
  ).length;
  const dep = act.filter(
    (b) => b.out === today && b.status === "checked-in",
  ).length;
  const rev = act.reduce((s, b) => s + total(b), 0);
  $("#stats").innerHTML = [
    [occ + " / " + S.rooms.length, "Rooms occupied"],
    [arr, "Arrivals waiting today"],
    [dep, "Departures due today"],
    [inr(rev), "Value of active bookings"],
  ]
    .map(
      (x, i) =>
        `<div class="stat"><b>${x[0]}</b><span>${x[1]}</span>${i === 0 ? `<div class="meter"><u style="width:${S.rooms.length ? (occ / S.rooms.length) * 100 : 0}%"></u></div>` : ""}</div>`,
    )
    .join("");
}

function renderTimeline() {
  const days = [...Array(14)].map((_, i) => add(start, i));
  const head = days
    .map((d) => {
      const dt = parse(d);
      return `<i class="${d === today ? "today" : ""}">${dt.toLocaleDateString("en-IN", { weekday: "short" })}<b>${dt.getDate()}</b></i>`;
    })
    .join("");
  const rows = S.rooms
    .map((r) => {
      const cells = days
        .map(
          (d, i) =>
            `<i class="${d === today ? "today" : ""}" data-new="${r.id}|${d}" style="grid-column:${i + 1}" title="Book room ${esc(r.num)} from ${d}"></i>`,
        )
        .join("");
      const bars = S.bookings
        .filter((b) => b.room === r.id && live(b))
        .map((b) => {
          const s = Math.max(diff(start, b.in), 0),
            e = Math.min(diff(start, b.out), 14);
          if (e <= s) return "";
          return `<button class="tl-bar ${b.status}" data-edit="${b.id}" style="grid-column:${s + 1}/${e + 1}" title="${esc(b.guest)}, ${b.in} to ${b.out}"><span>${esc(b.guest)}</span><em>${diff(b.in, b.out)}n</em></button>`;
        })
        .join("");
      return `<div class="tl-row"><div class="tl-room"><span class="key">${esc(r.num)}</span><small>${esc(r.type)}</small></div><div class="tl-days">${cells}${bars}</div></div>`;
    })
    .join("");
  const e = parse(add(start, 13)).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
  });
  $("#view").innerHTML =
    `<div class="bar"><h2>${parse(start).toLocaleDateString("en-IN", { day: "numeric", month: "short" })} – ${e}</h2>
    <button class="btn" data-shift="-7">Back a week</button><button class="btn" data-shift="0">Today</button><button class="btn" data-shift="7">Forward a week</button>
    <button class="btn primary" data-new="|${today}">New booking</button></div>
    <div class="panel"><div class="tl"><div class="tl-row tl-head"><div class="tl-room"></div><div class="tl-days">${head}</div></div>${rows || '<div class="empty">Add a room to start taking bookings.</div>'}</div></div>
    <div class="legend"><span style="color:var(--conf)">Confirmed</span><span style="color:var(--in)">Checked in</span><span style="color:var(--out)">Checked out</span></div>`;
}

function renderBookings() {
  const list = S.bookings
    .filter(
      (b) =>
        (filt === "all" || b.status === filt) &&
        (b.guest + b.phone + (room(b.room) || { num: "" }).num)
          .toLowerCase()
          .includes(q.toLowerCase()),
    )
    .sort((a, b) => (a.in < b.in ? -1 : 1));
  const rows = list
    .map((b) => {
      const r = room(b.room) || { num: "?" };
      const acts =
        (b.status === "confirmed"
          ? `<button class="btn sm" data-st="${b.id}|checked-in">Check in</button> `
          : "") +
        (b.status === "checked-in"
          ? `<button class="btn sm" data-st="${b.id}|checked-out">Check out</button> `
          : "") +
        (live(b) && b.status !== "checked-out"
          ? `<button class="btn sm" data-edit="${b.id}">Edit</button> <button class="btn sm danger" data-st="${b.id}|cancelled">Cancel</button>`
          : `<button class="btn sm danger" data-del="${b.id}">Delete</button>`);
      return `<tr><td><b>${esc(b.guest)}</b><br><small style="color:var(--muted)">${esc(b.phone || "No phone")}</small></td><td>${esc(r.num)}</td><td>${b.in} to ${b.out}<br><small style="color:var(--muted)">${diff(b.in, b.out)} night(s), ${b.n} guest(s)</small></td><td>${inr(total(b))}</td><td><span class="tag ${b.status}">${b.status.replace("-", " ")}</span></td><td class="act">${acts}</td></tr>`;
    })
    .join("");
  $("#view").innerHTML =
    `<div class="bar"><h2>Bookings</h2><input id="q" type="search" placeholder="Search guest, phone or room" value="${esc(q)}" aria-label="Search bookings">
    <select id="filt" aria-label="Filter by status">${["all", "confirmed", "checked-in", "checked-out", "cancelled"].map((s) => `<option value="${s}" ${s === filt ? "selected" : ""}>${s === "all" ? "All statuses" : s.replace("-", " ")}</option>`).join("")}</select>
    <button class="btn primary" data-new="|${today}">New booking</button></div>
    <div class="panel">${list.length ? `<table class="tb bk"><thead><tr><th>Guest</th><th>Room</th><th>Stay</th><th>Total</th><th>Status</th><th></th></tr></thead><tbody>${rows}</tbody></table>` : '<div class="empty">No bookings match. Clear the search or create a new booking.</div>'}</div>`;
  const qi = $("#q");
  qi.oninput = () => {
    q = qi.value;
    const p = qi.selectionStart;
    renderBookings();
    const n = $("#q");
    n.focus();
    n.setSelectionRange(p, p);
  };
  $("#filt").onchange = (e) => {
    filt = e.target.value;
    renderBookings();
  };
}

function renderRooms() {
  const rows = S.rooms
    .map((r) => {
      const cur = S.bookings.find(
        (b) => b.room === r.id && live(b) && b.status === "checked-in",
      );
      return `<tr><td><b>${esc(r.num)}</b></td><td>${esc(r.type)}</td><td>${inr(r.rate)}</td><td>${r.cap}</td><td>${cur ? `<span class="tag checked-in">${esc(cur.guest)}</span>` : '<span class="tag checked-out">Vacant</span>'}</td><td class="act"><button class="btn sm" data-redit="${r.id}">Edit</button> <button class="btn sm danger" data-rdel="${r.id}">Delete</button></td></tr>`;
    })
    .join("");
  $("#view").innerHTML =
    `<div class="bar"><h2>Rooms</h2><button class="btn primary" data-radd="1">Add room</button></div>
    <div class="panel">${S.rooms.length ? `<table class="tb rm"><thead><tr><th>Room</th><th>Type</th><th>Rate per night</th><th>Sleeps</th><th>Now</th><th></th></tr></thead><tbody>${rows}</tbody></table>` : '<div class="empty">No rooms yet. Add your first room.</div>'}</div>`;
}

function render() {
  stats();
  ({ timeline: renderTimeline, bookings: renderBookings, rooms: renderRooms })[
    view
  ]();
  document
    .querySelectorAll("nav button")
    .forEach((b) => b.setAttribute("aria-selected", b.dataset.v === view));
}

/* booking dialog */
let editId = null;
function openBooking(id, roomId, date) {
  editId = id;
  const b = id ? S.bookings.find((x) => x.id === id) : null;
  $("#bk-title").textContent = b ? "Edit booking" : "New booking";
  $("#b-room").innerHTML = S.rooms
    .map(
      (r) =>
        `<option value="${r.id}">Room ${esc(r.num)} · ${esc(r.type)} · ${inr(r.rate)}/night</option>`,
    )
    .join("");
  $("#b-guest").value = b ? b.guest : "";
  $("#b-phone").value = b ? b.phone : "";
  $("#b-n").value = b ? b.n : 1;
  $("#b-room").value = b ? b.room : roomId || (S.rooms[0] || {}).id || "";
  $("#b-in").value = b ? b.in : date;
  $("#b-out").value = b ? b.out : add(date, 1);
  $("#b-msg").textContent = "";
  sum();
  $("#bk").showModal();
  $("#b-guest").focus();
}
function sum() {
  const r = room($("#b-room").value),
    n = diff($("#b-in").value, $("#b-out").value);
  $("#b-sum").innerHTML =
    r && n > 0
      ? `<b>${n} night${n > 1 ? "s" : ""}</b> × ${inr(r.rate)} = <b>${inr(n * r.rate)}</b>`
      : "";
}
["b-room", "b-in", "b-out"].forEach((i) =>
  $("#" + i).addEventListener("input", sum),
);
$("#b-cancel").onclick = () => $("#bk").close();
$("#b-save").onclick = () => {
  const g = $("#b-guest").value.trim(),
    rid = $("#b-room").value,
    i = $("#b-in").value,
    o = $("#b-out").value,
    n = +$("#b-n").value || 1,
    r = room(rid),
    m = $("#b-msg");
  if (!g) return (m.textContent = "Enter the guest’s name.");
  if (!r) return (m.textContent = "Add a room before creating a booking.");
  if (!i || !o || o <= i)
    return (m.textContent = "Check-out must be after check-in.");
  if (n > r.cap)
    return (m.textContent = `Room ${r.num} sleeps ${r.cap}. Reduce guests or pick another room.`);
  const c = clash(rid, i, o, editId);
  if (c)
    return (m.textContent = `Room ${r.num} is already booked by ${c.guest} (${c.in} to ${c.out}). Pick other dates or a different room.`);
  const d = {
    guest: g,
    phone: $("#b-phone").value.trim(),
    room: rid,
    in: i,
    out: o,
    n,
  };
  if (editId)
    Object.assign(
      S.bookings.find((x) => x.id === editId),
      d,
    );
  else
    S.bookings.push({
      id: crypto.randomUUID ? crypto.randomUUID() : String(Math.random()),
      status: "confirmed",
      ...d,
    });
  save();
  $("#bk").close();
  render();
  toast(editId ? "Booking updated" : "Booking saved");
};

/* room dialog */
let redit = null;
function openRoom(id) {
  redit = id;
  const r = id ? room(id) : null;
  $("#rm-title").textContent = r ? "Edit room" : "Add room";
  $("#r-num").value = r ? r.num : "";
  $("#r-type").value = r ? r.type : "Standard";
  $("#r-rate").value = r ? r.rate : "";
  $("#r-cap").value = r ? r.cap : 2;
  $("#r-msg").textContent = "";
  $("#rm").showModal();
  $("#r-num").focus();
}
$("#r-cancel").onclick = () => $("#rm").close();
$("#r-save").onclick = () => {
  const num = $("#r-num").value.trim(),
    rate = +$("#r-rate").value,
    cap = +$("#r-cap").value,
    m = $("#r-msg");
  if (!num) return (m.textContent = "Enter a room number.");
  if (S.rooms.some((r) => r.num === num && r.id !== redit))
    return (m.textContent = `Room ${num} already exists.`);
  if (!(rate > 0)) return (m.textContent = "Enter a nightly rate above 0.");
  if (!(cap > 0))
    return (m.textContent = "Enter how many guests the room sleeps.");
  const d = { num, type: $("#r-type").value, rate, cap };
  if (redit) Object.assign(room(redit), d);
  else S.rooms.push({ id: "r" + Date.now(), ...d });
  save();
  $("#rm").close();
  render();
  toast("Room saved");
};

/* clicks */
document.addEventListener("click", (e) => {
  const t = e.target.closest("button,i[data-new]");
  if (!t) return;
  const D = t.dataset;
  if (D.v) {
    view = D.v;
    render();
  } else if (D.shift !== undefined) {
    start = D.shift === "0" ? today : add(start, +D.shift);
    render();
  } else if (D.new !== undefined) {
    const [r, d] = D.new.split("|");
    openBooking(null, r, d);
  } else if (D.edit) openBooking(D.edit);
  else if (D.st) {
    const [id, st] = D.st.split("|");
    if (st === "cancelled" && !confirm("Cancel this booking?")) return;
    S.bookings.find((b) => b.id === id).status = st;
    save();
    render();
    toast(
      st === "cancelled"
        ? "Booking cancelled"
        : st === "checked-in"
          ? "Guest checked in"
          : "Guest checked out",
    );
  } else if (D.del) {
    if (confirm("Delete this booking record permanently?")) {
      S.bookings = S.bookings.filter((b) => b.id !== D.del);
      save();
      render();
      toast("Booking deleted");
    }
  } else if (D.radd) openRoom();
  else if (D.redit) openRoom(D.redit);
  else if (D.rdel) {
    const r = room(D.rdel);
    if (
      S.bookings.some(
        (b) => b.room === r.id && live(b) && b.status !== "checked-out",
      )
    )
      return toast(`Room ${r.num} has active bookings. Cancel them first.`);
    if (confirm(`Delete room ${r.num}?`)) {
      S.rooms = S.rooms.filter((x) => x.id !== r.id);
      S.bookings = S.bookings.filter((b) => b.room !== r.id);
      save();
      render();
      toast("Room deleted");
    }
  }
});
load();
render();
$("#today").textContent =
  new Date().toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }) + " · Front desk";
