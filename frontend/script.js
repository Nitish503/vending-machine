const API_BASE = ""; 
// empty = same domain (Render compatible)

async function buy(item, amount) {
  try {
    const res = await fetch(${API_BASE}/api/pay, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ item, amount })
    });

    const data = await res.json();

    if (data.success) {
      alert("Payment successful ✅");
      loadPayments();
    } else {
      alert("Payment failed ❌");
    }
  } catch (err) {
    alert("Server error ❌");
  }
}

async function loadPayments() {
  try {
    const res = await fetch(`${API_BASE}/api/payments`);
    const data = await res.json();

    const log = document.getElementById("log");
    if (data.length === 0) {
      log.textContent = "No payments yet";
      return;
    }

    log.textContent = data
      .map(p => `${p.item} - ₹${p.amount} (${p.time})`)
      .join("\n");
  } catch {
    document.getElementById("log").textContent = "Error loading payments";
  }
}

// auto load
loadPayments();