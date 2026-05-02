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

    // Add click event to each button
    buttons.forEach((btn) => {
        btn.addEventListener("click", () => {
            cartCount++;
            cartDisplay.innerText = "🛒 Cart Items: " + cartCount;
            alert("Item added to cart!");
        });
    });

});