async function load() {
  const r = await fetch("/api/payments");
  const d = await r.json();
  const t = document.getElementById("payments-body");
  t.innerHTML = "";
  d.forEach(p => {
    t.innerHTML += `<tr>
      <td>${p.id}</td>
      <td>${p.item}</td>
      <td>${p.amount}</td>
      <td>${new Date(p.created_at).toLocaleString()}</td>
    </tr>`;
  });
}
load();
setInterval(load, 5000);