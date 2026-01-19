async function pay(item, amount) {
  const r = await fetch("/api/pay", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ item, amount })
  });
  document.getElementById("msg").innerText =
    r.ok ? "Payment successful" : "Login required";
}