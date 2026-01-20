function register() {
  const name = document.getElementById("name").value.trim();
  const mobile = document.getElementById("mobile").value.trim();
  const password = document.getElementById("password").value.trim();

  if (!name || !mobile || !password) {
    alert("All fields are required");
    return;
  }

  fetch("/api/register", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ name, mobile, password })
  })
    .then(res => res.json())
    .then(data => {
      if (data.error) {
        alert(data.error);
      } else {
        alert("Registration successful");
        window.location.href = "/customer-login";
      }
    })
    .catch(err => {
      console.error(err);
      alert("Server error");
    });
}