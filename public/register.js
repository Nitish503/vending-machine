document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("registerForm");

  form.addEventListener("submit", async (e) => {
    e.preventDefault(); // stop page refresh

    const name = document.getElementById("name").value;
    const mobile = document.getElementById("mobile").value;
    const password = document.getElementById("password").value;

    if (!name || !mobile || !password) {
      alert("All fields are required");
      return;
    }

    try {
      const res = await fetch("/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ name, mobile, password })
      });

      const data = await res.json();

      if (res.ok) {
        alert("Registration successful");
        window.location.href = "/customer-login.html";
      } else {
        alert(data.error || "Registration failed");
      }
    } catch (err) {
      console.error(err);
      alert("Server error");
    }
  });
});