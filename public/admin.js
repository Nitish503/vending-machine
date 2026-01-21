fetch("/api/customers")
  .then(res => res.json())
  .then(data => {
    const list = document.getElementById("customers");

    data.forEach(c => {
      const li = document.createElement("div");
      li.className = "list-item";

      const status = c.password === null
        ? '<span class="status-reset">RESET</span>'
        : '<span class="status-active">ACTIVE</span>';

      const btn = c.password === null
        ? ''
        : `<button class="small-btn" onclick="reset(${c.id})">Reset</button>`;

      li.innerHTML = `
        ${c.name} - ${c.mobile} ${status}
        ${btn}
      `;
      list.appendChild(li);
    });
  });

function reset(id) {
  fetch(`/api/admin/reset-password/${id}`, { method: "POST" })
    .then(() => location.reload());
}