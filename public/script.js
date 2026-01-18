async function pay(item, amount) {
  const res = await fetch("/api/pay", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ item, amount })
  });

  if (res.ok) {
    document.getElementById("msg").innerText =
      "✅ Payment Successful!";
  }
}