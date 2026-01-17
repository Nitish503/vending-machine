const token = localStorage.getItem("token");

if (!token) {
  window.location.href = "/admin-login";
}

fetch("/api/admin/payments", {
  headers: {
    Authorization: "Bearer " + token
  }
})
  .then(res => {
    if (res.status === 401 || res.status === 403) {
      localStorage.removeItem("token");
      window.location.href = "/admin-login";
    }
    return res.json();
  })
  .then(data => {
    const rows = document.getElementById("rows");
    data.forEach(p => {
      rows.innerHTML += `
        <tr>
          <td>${p.id}</td>
          <td>${p.item}</td>
          <td>₹${p.amount}</td>
          <td>${p.created_at}</td>
        </tr>
      `;
    });
  });

function logout() {
  localStorage.removeItem("token");
  window.location.href = "/admin-login";
}