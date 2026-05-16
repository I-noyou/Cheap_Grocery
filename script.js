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
    let selectedProducts = [];

    function saveToStorage() {
        try {
            localStorage.setItem('cheap_grocery_selected_products', JSON.stringify(selectedProducts));
        } catch (e) {
            console.warn('Could not save to localStorage', e);
        }
    }

    function loadFromStorage() {
        try {
            const raw = localStorage.getItem('cheap_grocery_selected_products');
            selectedProducts = raw ? JSON.parse(raw) : [];
        } catch (e) {
            selectedProducts = [];
        }
    }

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

    // Load persisted list from storage and render
    loadFromStorage();
    function renderSelectedProducts() {
        if (!selectedProductsList) return;
        selectedProductsList.innerHTML = '';
        if (selectedProducts.length === 0) {
            if (emptyCartMessage) emptyCartMessage.style.display = 'block';
            if (cartPanel) cartPanel.classList.add('is-hidden');
        } else {
            if (emptyCartMessage) emptyCartMessage.style.display = 'none';
            if (cartPanel) cartPanel.classList.remove('is-hidden');
        }

        selectedProducts.forEach((p, idx) => {
            const li = document.createElement('li');
            li.className = 'selected-item';
            li.innerHTML = `
                <img src="${p.imageSrc}" alt="${p.imageAlt}">
                <p class="selected-item-text">${p.name} x ${p.quantity}<br><small>₹${p.unitPrice.toFixed(2)}</small></p>
                <button class="remove-item-btn" data-index="${idx}" aria-label="Remove item">X</button>
            `;
            selectedProductsList.appendChild(li);
        });

        updateTotalAmount();
    }

    renderSelectedProducts();
    
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
            if (!currentProduct || !modalQuantity) {
                return;
            }

            const quantity = Math.max(1, parseInt(modalQuantity.value, 10) || 1);

            // parse numeric unit price from currentProduct.price (e.g. "₹50 / kg")
            const priceMatch = (currentProduct.price || '').match(/₹\s*([\d.]+)/);
            const unitPrice = priceMatch ? parseFloat(priceMatch[1]) : 0;

            selectedProducts.push({
                imageSrc: currentProduct.imageSrc,
                imageAlt: currentProduct.imageAlt,
                name: currentProduct.name,
                unitPrice: unitPrice,
                quantity: quantity
            });

            saveToStorage();
            renderSelectedProducts();
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
        selectedProductsList.addEventListener('click', (event) => {
            const target = event.target;
            if (!(target instanceof HTMLElement)) return;

            const removeButton = target.closest('.remove-item-btn');
            if (!removeButton) return;

            const idx = parseInt(removeButton.getAttribute('data-index'), 10);
            if (!Number.isNaN(idx)) {
                selectedProducts.splice(idx, 1);
                saveToStorage();
                renderSelectedProducts();
            }
        });
    }

    // Cart action buttons: save, download, clear
    const saveListBtn = document.getElementById('save-list-btn');
    const downloadCsvBtn = document.getElementById('download-csv-btn');
    const clearListBtn = document.getElementById('clear-list-btn');

    function downloadCSV() {
        if (selectedProducts.length === 0) return;
        const header = ['Name', 'Quantity', 'Unit Price', 'Total'];
        const rows = selectedProducts.map(p => [p.name, p.quantity, p.unitPrice.toFixed(2), (p.unitPrice * p.quantity).toFixed(2)]);
        const csvContent = [header].concat(rows).map(r => r.join(',')).join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'cheap_grocery_list.csv';
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
    }

    function clearList() {
        selectedProducts = [];
        saveToStorage();
        renderSelectedProducts();
    }

    if (downloadCsvBtn) {
        downloadCsvBtn.addEventListener('click', downloadCSV);
    }

    if (clearListBtn) {
        clearListBtn.addEventListener('click', () => {
            if (confirm('Clear all selected products from the list?')) {
                clearList();
            }
        });
    }

    if (saveListBtn) {
        saveListBtn.addEventListener('click', () => {
            const name = prompt('Enter a name for this list (optional):', 'My grocery list');
            try {
                const savedRaw = localStorage.getItem('cheap_grocery_saved_lists');
                const saved = savedRaw ? JSON.parse(savedRaw) : {};
                const key = name ? name : ('List ' + new Date().toISOString());
                saved[key] = selectedProducts;
                localStorage.setItem('cheap_grocery_saved_lists', JSON.stringify(saved));
                alert('List saved locally under "' + key + '"');
            } catch (e) {
                alert('Could not save list: ' + e.message);
            }
        });
    }

});
