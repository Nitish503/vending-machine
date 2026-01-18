function toggleMenu() {
  const menu = document.getElementById("menu");
  menu.style.display = menu.style.display === "block" ? "none" : "block";
}

// Close menu when clicking outside
document.addEventListener("click", function (event) {
  const menu = document.getElementById("menu");
  const button = document.querySelector(".menu-btn");

  if (!menu.contains(event.target) && !button.contains(event.target)) {
    menu.style.display = "none";
  }
});