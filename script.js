// Wait until page loads
document.addEventListener("DOMContentLoaded", () => {

    // Select all Add to Cart buttons
    const buttons = document.querySelectorAll(".add-cart");

    let cartCount = 0;

    // Create cart display at top
    const cartDisplay = document.createElement("h3");
    cartDisplay.innerText = "🛒 Cart Items: 0";
    cartDisplay.style.textAlign = "center";
    cartDisplay.style.background = "#fff";
    cartDisplay.style.padding = "10px";

    document.body.insertBefore(cartDisplay, document.body.firstChild);

    // Search bar filtering
    const searchInput = document.getElementById("search");
    if (searchInput) {
        searchInput.addEventListener("input", (e) => {
            const query = e.target.value.trim().toLowerCase();
            const products = document.querySelectorAll(".product");
            products.forEach((p) => {
                const titleEl = p.querySelector("h3");
                const title = titleEl ? titleEl.innerText.toLowerCase() : "";
                if (title.indexOf(query) !== -1) {
                    p.style.display = "inline-block";
                } else {
                    p.style.display = "none";
                }
            });
        });
    }

    // Add click event to each button
    buttons.forEach((btn) => {
        btn.addEventListener("click", () => {
            cartCount++;
            cartDisplay.innerText = "🛒 Cart Items: " + cartCount;
            alert("Item added to cart!");
        });
    });

});
