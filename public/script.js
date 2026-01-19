async function pay(item, amount) {
  const res = await fetch("/api/pay", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ item, amount }),
  });

  document.getElementById("msg").innerText =
    res.ok ? "✅ Payment successful!" : "❌ Login required";
}