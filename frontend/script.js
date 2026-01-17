const API_URL = "http://localhost:3000";

// Make payment
async function pay(item, price) {
  try {
    const res = await fetch(${API_URL}/api/pay, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ item, price })
    });

    const data = await res.json();
    alert("Payment successful");
    loadPayments();

  } catch (err) {
    alert("Payment failed");
  }
}

// Load payments
async function loadPayments() {
  const output = document.getElementById("output");
  output.textContent = "Loading...";

  try {
    const res = await fetch(${API_URL}/api/payments);
    const data = await res.json();
    output.textContent = JSON.stringify(data, null, 2);
  } catch (err) {
    output.textContent = "Error loading payments";
  }
}