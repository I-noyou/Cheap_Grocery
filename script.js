// Wait until page loads
document.addEventListener("DOMContentLoaded", () => {
    const authScreen = document.getElementById("auth-screen");
    const appShell = document.getElementById("app-shell");
    const authForm = document.getElementById("auth-form");
    const signupToggle = document.getElementById("signup-toggle");
    const loginToggle = document.getElementById("login-toggle");
    const authSubtitle = document.getElementById("auth-subtitle");
    const authSubmitBtn = document.getElementById("auth-submit-btn");
    const authMessage = document.getElementById("auth-message");
    const authName = document.getElementById("auth-name");
    const authEmail = document.getElementById("auth-email");
    const authPassword = document.getElementById("auth-password");
    const welcomeText = document.getElementById("welcome-text");
    const logoutBtn = document.getElementById("logout-btn");

    const USER_DATA_KEY = "cheap_grocery_user_data";
    const SESSION_KEY = "cheap_grocery_is_logged_in";

    let authMode = "signup";

    function getStoredUser() {
        try {
            const raw = localStorage.getItem(USER_DATA_KEY);
            return raw ? JSON.parse(raw) : null;
        } catch (error) {
            return null;
        }
    }

    function setAuthMessage(message, isError = true) {
        if (!authMessage) return;
        authMessage.innerText = message || "";
        authMessage.style.color = isError ? "#d35400" : "#1f8b4c";
    }

    function showApp(user) {
        if (authScreen) authScreen.classList.add("is-hidden");
        if (appShell) appShell.classList.remove("is-hidden");
        if (welcomeText) {
            const safeName = user && user.userName ? user.userName : "User";
            welcomeText.innerText = `Welcome, ${safeName}!`;
        }
    }

    function showAuth() {
        if (authScreen) authScreen.classList.remove("is-hidden");
        if (appShell) appShell.classList.add("is-hidden");
    }

    function applyAuthMode(mode) {
        authMode = mode;
        const isSignup = mode === "signup";

        if (signupToggle) {
            signupToggle.classList.toggle("active", isSignup);
            signupToggle.setAttribute("aria-selected", isSignup ? "true" : "false");
        }
        if (loginToggle) {
            loginToggle.classList.toggle("active", !isSignup);
            loginToggle.setAttribute("aria-selected", !isSignup ? "true" : "false");
        }

        if (authName) {
            authName.required = isSignup;
            authName.style.display = isSignup ? "block" : "none";
            const nameLabel = authName.previousElementSibling;
            if (nameLabel && nameLabel.tagName === "LABEL") {
                nameLabel.style.display = isSignup ? "block" : "none";
            }
        }

        if (authSubmitBtn) {
            authSubmitBtn.innerText = isSignup ? "Create Account" : "Login";
        }
        if (authSubtitle) {
            authSubtitle.innerText = isSignup
                ? "Create your account to compare grocery prices."
                : "Welcome back. Login to continue comparing grocery prices.";
        }

        setAuthMessage("");
    }

    function isValidEmail(email) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    }

    function handleAuthSubmit(event) {
        event.preventDefault();

        const userName = authName ? authName.value.trim() : "";
        const email = authEmail ? authEmail.value.trim().toLowerCase() : "";
        const password = authPassword ? authPassword.value.trim() : "";

        if (!email || !password || (authMode === "signup" && !userName)) {
            setAuthMessage("Please fill in all required fields.");
            return;
        }

        if (!isValidEmail(email)) {
            setAuthMessage("Please enter a valid email address.");
            return;
        }

        const savedUser = getStoredUser();

        if (authMode === "signup") {
            if (savedUser && savedUser.email === email) {
                setAuthMessage("This email is already registered. Please login.");
                applyAuthMode("login");
                if (authEmail) authEmail.value = email;
                return;
            }

            const newUser = { userName, email, password };
            localStorage.setItem(USER_DATA_KEY, JSON.stringify(newUser));
            localStorage.setItem(SESSION_KEY, "true");
            setAuthMessage("Account created successfully!", false);
            showApp(newUser);
            return;
        }

        if (!savedUser) {
            setAuthMessage("No account found. Please sign up first.");
            applyAuthMode("signup");
            return;
        }

        if (savedUser.email !== email || savedUser.password !== password) {
            setAuthMessage("Invalid email or password.");
            return;
        }

        localStorage.setItem(SESSION_KEY, "true");
        setAuthMessage("Login successful!", false);
        showApp(savedUser);
    }

    function initializeAuth() {
        const storedUser = getStoredUser();
        const isLoggedIn = localStorage.getItem(SESSION_KEY) === "true";

        if (storedUser && isLoggedIn) {
            showApp(storedUser);
            return;
        }

        showAuth();
        applyAuthMode(storedUser ? "login" : "signup");
        if (storedUser && authEmail) {
            authEmail.value = storedUser.email;
        }
    }

    if (signupToggle) signupToggle.addEventListener("click", () => applyAuthMode("signup"));
    if (loginToggle) loginToggle.addEventListener("click", () => applyAuthMode("login"));
    if (authForm) authForm.addEventListener("submit", handleAuthSubmit);
    if (logoutBtn) {
        logoutBtn.addEventListener("click", () => {
            localStorage.setItem(SESSION_KEY, "false");
            if (authForm) authForm.reset();
            showAuth();
            applyAuthMode("login");
            const storedUser = getStoredUser();
            if (storedUser && authEmail) authEmail.value = storedUser.email;
            setAuthMessage("Logged out successfully.", false);
        });
    }

    initializeAuth();

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
    const makeListBtn = document.getElementById("make-list-btn");
    const clearSelectionBtn = document.getElementById("clear-selection-btn");

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

    function extractUnitPrice(priceText) {
        const priceMatch = (priceText || "").match(/₹\s*([\d.]+)/);
        return priceMatch ? parseFloat(priceMatch[1]) : 0;
    }

    function addProductToSelection(product, quantity) {
        const safeQuantity = Math.max(1, parseInt(quantity, 10) || 1);
        const existing = selectedProducts.find((item) => (
            item.name === product.name && item.unitPrice === product.unitPrice
        ));

        if (existing) {
            existing.quantity += safeQuantity;
        } else {
            selectedProducts.push({
                imageSrc: product.imageSrc,
                imageAlt: product.imageAlt,
                name: product.name,
                unitPrice: product.unitPrice,
                quantity: safeQuantity
            });
        }
    }

    function addBulkSelectionCheckboxes() {
        const productCards = document.querySelectorAll(".product");
        productCards.forEach((card) => {
            if (card.querySelector(".bulk-select-label")) return;

            const label = document.createElement("label");
            label.className = "bulk-select-label";

            const checkbox = document.createElement("input");
            checkbox.type = "checkbox";
            checkbox.className = "bulk-select-checkbox";
            checkbox.setAttribute("aria-label", "Select product for list");

            const text = document.createElement("span");
            text.innerText = "Select";

            label.appendChild(checkbox);
            label.appendChild(text);
            card.appendChild(label);
        });
    }

    function clearBulkSelection() {
        const checkboxes = document.querySelectorAll(".bulk-select-checkbox");
        checkboxes.forEach((checkbox) => {
            checkbox.checked = false;
        });
    }

    addBulkSelectionCheckboxes();

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

            addProductToSelection({
                imageSrc: currentProduct.imageSrc,
                imageAlt: currentProduct.imageAlt,
                name: currentProduct.name,
                unitPrice: extractUnitPrice(currentProduct.price)
            }, quantity);

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

    if (makeListBtn) {
        makeListBtn.addEventListener("click", () => {
            const selectedCards = document.querySelectorAll(".product .bulk-select-checkbox:checked");
            if (selectedCards.length === 0) {
                alert("Please select at least one product first.");
                return;
            }

            selectedCards.forEach((checkbox) => {
                const productCard = checkbox.closest(".product");
                if (!productCard) return;

                const image = productCard.querySelector("img");
                const name = productCard.querySelector("h3");
                const price = productCard.querySelector("p");

                addProductToSelection({
                    imageSrc: image ? image.getAttribute("src") : "",
                    imageAlt: image ? image.getAttribute("alt") : "Product",
                    name: name ? name.innerText : "Product",
                    unitPrice: extractUnitPrice(price ? price.innerText : "")
                }, 1);
            });

            saveToStorage();
            renderSelectedProducts();
            clearBulkSelection();
        });
    }

    if (clearSelectionBtn) {
        clearSelectionBtn.addEventListener("click", clearBulkSelection);
    }

});
