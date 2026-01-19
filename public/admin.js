function load() {
    fetch("/api/customers")
        .then(r => r.json())
        .then(data => {
            document.getElementById("customers").innerHTML =
                data.map(c =>
                    `<div>${c.mobile}
                     <button onclick="reset('${c.mobile}')">
                     Force Reset</button></div>`
                ).join("");
        });

    fetch("/api/payments")
        .then(r => r.json())
        .then(data => {
            document.getElementById("payments").innerHTML =
                "<tr><th>ID</th><th>Item</th><th>₹</th><th>Time</th></tr>" +
                data.map(p =>
                    `<tr><td>${p.id}</td>
                     <td>${p.item}</td>
                     <td>${p.amount}</td>
                     <td>${p.time}</td></tr>`
                ).join("");
        });
}

function reset(mobile) {
    fetch("/admin/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mobile })
    }).then(() => alert("Password reset"));
}

setInterval(load, 5000);
load();