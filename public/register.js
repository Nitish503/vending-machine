document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("registerForm");

  if (!form) {
    console.error("❌ registerForm not found in HTML");
    return;
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const name = document.getElementById("name").value.trim();
    const mobile = document.getElementById("mobile").value.trim();
    const password = document.getElementById("password").value.trim();

    if (!name || !mobile || !password) {
      alert("All fields required");
      return;
    }

    try {
      const res = await fetch("/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, mobile, password })
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.error || "Registration failed");
        return;
      }

      alert("Registration successful");
      window.location.href = "/customer-login.html";

    } catch (err) {
      console.error(err);
      alert("Server error");
    }
  });
});