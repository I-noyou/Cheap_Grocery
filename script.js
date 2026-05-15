// Wait until page loads
document.addEventListener("DOMContentLoaded", () => {
    const buttons = document.querySelectorAll(".add-cart");
    const modal = document.getElementById("cart-modal");
    const closeModalButton = document.getElementById("close-modal");
    const addToListButton = document.getElementById("add-to-list-btn");

    const modalProductImage = document.getElementById("modal-product-image");
    const modalProductName = document.getElementById("modal-product-name");
    const modalProductPrice = document.getElementById("modal-product-price");
    const modalQuantity = document.getElementById("modal-quantity");

    const selectedProductsList = document.getElementById("selected-products-list");
    const emptyCartMessage = document.getElementById("empty-cart-msg");
    const cartPanel = document.querySelector(".cart-panel");

    let currentProduct = null;

     function updateTotalAmount() {
        const items = document.querySelectorAll(".selected-item");
        let total = 0;

        items.forEach((item) => {
            const priceText = item.querySelector(".selected-item-text small");
            if (priceText) {
                const priceStr = priceText.innerText.trim();
                const priceMatch = priceStr.match(/₹([\d.]+)/);
                if (priceMatch) {
                    const price = parseFloat(priceMatch[1]);
                    const quantityText = item.querySelector(".selected-item-text").innerText;
                    const quantityMatch = quantityText.match(/x\s(\d+)/);
                    const quantity = quantityMatch ? parseInt(quantityMatch[1]) : 1;
                    total += price * quantity;
                }
            }
        });

        const totalAmountEl = document.getElementById("total-amount");
        const totalSectionEl = document.getElementById("cart-total-section");
        if (totalAmountEl) {
            totalAmountEl.innerText = "₹" + total.toFixed(2);
        }
        if (totalSectionEl) {
            totalSectionEl.style.display = items.length > 0 ? "block" : "none";
        }
    }
    // Update total on initial load in case there are pre-filled items
    updateTotalAmount();
    
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

    function openModal() {
        if (!modal) {
            return;
        }
        modal.classList.add("open");
        modal.setAttribute("aria-hidden", "false");
    }

    function closeModal() {
        if (!modal) {
            return;
        }
        modal.classList.remove("open");
        modal.setAttribute("aria-hidden", "true");
    }

    buttons.forEach((btn) => {
        btn.addEventListener("click", () => {
            const productCard = btn.closest(".product");
            if (!productCard) {
                return;
            }

            const image = productCard.querySelector("img");
            const name = productCard.querySelector("h3");
            const price = productCard.querySelector("p");

            currentProduct = {
                imageSrc: image ? image.getAttribute("src") : "",
                imageAlt: image ? image.getAttribute("alt") : "Product",
                name: name ? name.innerText : "Product",
                price: price ? price.innerText : ""
            };

            if (modalProductImage) {
                modalProductImage.src = currentProduct.imageSrc;
                modalProductImage.alt = currentProduct.imageAlt;
            }

            if (modalProductName) {
                modalProductName.innerText = currentProduct.name;
            }

            if (modalProductPrice) {
                modalProductPrice.innerText = currentProduct.price;
            }

            if (modalQuantity) {
                modalQuantity.value = "1";
            }

            openModal();
        });
    });

    if (addToListButton) {
        addToListButton.addEventListener("click", () => {
            if (!currentProduct || !selectedProductsList || !modalQuantity) {
                return;
            }

            const quantity = Math.max(1, parseInt(modalQuantity.value, 10) || 1);
            const listItem = document.createElement("li");
            listItem.className = "selected-item";

            listItem.innerHTML = `
                <img src="${currentProduct.imageSrc}" alt="${currentProduct.imageAlt}">
                <p class="selected-item-text">${currentProduct.name} x ${quantity}<br><small>${currentProduct.price}</small></p>
                <button class="remove-item-btn" aria-label="Remove item">X</button>
            `;

            selectedProductsList.appendChild(listItem);
            if (emptyCartMessage) {
                emptyCartMessage.style.display = "none";
            }
            if (cartPanel) {
                cartPanel.classList.remove("is-hidden");
            }

            // Recalculate total after adding
            updateTotalAmount();

            closeModal();
        });
    }

    if (closeModalButton) {
        closeModalButton.addEventListener("click", closeModal);
    }

    if (modal) {
        modal.addEventListener("click", (event) => {
            if (event.target === modal) {
                closeModal();
            }
        });
    }

    if (selectedProductsList) {
        selectedProductsList.addEventListener("click", (event) => {
            const target = event.target;
            if (!(target instanceof HTMLElement)) {
                return;
            }

            const removeButton = target.closest(".remove-item-btn");
            if (!removeButton) {
                return;
            }

            const item = removeButton.closest(".selected-item");
            if (item) {
                item.remove();
                // Recalculate total after removal
                updateTotalAmount();
            }

            if (emptyCartMessage && selectedProductsList.children.length === 0) {
                emptyCartMessage.style.display = "block";
                if (cartPanel) {
                    cartPanel.classList.add("is-hidden");
                }
            }
        });
    }

});
