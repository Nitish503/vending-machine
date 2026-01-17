async function pay(item, amount) {
  const status = document.getElementById("status");
  status.innerText = "Processing payment...";

  try {
    const res = await fetch("/api/pay", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ item, amount })
    });

    const data = await res.json();

    if (data.success) {
      status.innerText = "✅ Payment successful!";
      status.style.color = "green";
    } else {
      status.innerText = "❌ Payment failed!";
      status.style.color = "red";
    }
  } catch (err) {
    status.innerText = "❌ Server error!";
    status.style.color = "red";
  }
}