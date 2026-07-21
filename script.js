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
    const togglePasswordBtn = document.getElementById("toggle-password");
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

    function setPasswordVisibility(visible) {
        if (!authPassword || !togglePasswordBtn) return;

        authPassword.type = visible ? "text" : "password";
        togglePasswordBtn.innerText = visible ? "Hide" : "Show";
        togglePasswordBtn.setAttribute("aria-label", visible ? "Hide password" : "Show password");
        togglePasswordBtn.setAttribute("aria-pressed", visible ? "true" : "false");
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
    if (togglePasswordBtn) {
        togglePasswordBtn.addEventListener("click", () => {
            const shouldShow = authPassword ? authPassword.type === "password" : false;
            setPasswordVisibility(shouldShow);
        });
    }
    if (authForm) authForm.addEventListener("submit", handleAuthSubmit);
    if (logoutBtn) {
        logoutBtn.addEventListener("click", () => {
            localStorage.setItem(SESSION_KEY, "false");
            if (authForm) authForm.reset();
            setPasswordVisibility(false);
            showAuth();
            applyAuthMode("login");
            const storedUser = getStoredUser();
            if (storedUser && authEmail) authEmail.value = storedUser.email;
            setAuthMessage("Logged out successfully.", false);
        });
    }

    setPasswordVisibility(false);
    initializeAuth();

    const buttons = document.querySelectorAll(".add-cart");
    const modal = document.getElementById("cart-modal");
    const closeModalButton = document.getElementById("close-modal");
    const addToListButton = document.getElementById("add-to-list-btn");

    const modalProductImage = document.getElementById("modal-product-image");
    const modalProductName = document.getElementById("modal-product-name");
    const modalProductPrice = document.getElementById("modal-product-price");
    const catalogVariantSteps = document.getElementById("catalog-variant-steps");
    const modalVarietyList = document.getElementById("modal-variety-list");
    const modalBrandList = document.getElementById("modal-brand-list");
    const modalWeightList = document.getElementById("modal-weight-list");
    const modalSelectedVariety = document.getElementById("modal-selected-variety");
    const modalSelectedBrand = document.getElementById("modal-selected-brand");
    const modalSelectedWeight = document.getElementById("modal-selected-weight");
    const modalQuantity = document.getElementById("modal-quantity");

    const selectedProductsList = document.getElementById("selected-products-list");
    const emptyCartMessage = document.getElementById("empty-cart-msg");
    const cartPanel = document.querySelector(".cart-panel");
    const makeListBtn = document.getElementById("make-list-btn");
    const clearSelectionBtn = document.getElementById("clear-selection-btn");

    let currentProduct = null;
    let currentCatalogSelection = null;
    let selectedProducts = [];

    const PRODUCT_CATALOG = {
        rice: {
            productName: "Rice",
            imageSrc: "images/Rice.jpg",
            imageAlt: "Rice",
            varieties: [
                {
                    id: "basmati",
                    name: "Basmati Rice",
                    brands: [
                        {
                            id: "india-gate",
                            name: "India Gate",
                            weights: [
                                { id: "5kg", label: "5kg", unitPrice: 396 },
                                { id: "10kg", label: "10kg", unitPrice: 760 }
                            ]
                        },
                        {
                            id: "daawat",
                            name: "Daawat",
                            weights: [
                                { id: "5kg", label: "5kg", unitPrice: 365 }
                            ]
                        }
                    ]
                },
                {
                    id: "sona-masoori",
                    name: "Sona Masoori Rice",
                    brands: [
                        {
                            id: "fortune",
                            name: "Fortune",
                            weights: [
                                { id: "5kg", label: "5kg", unitPrice: 249 }
                            ]
                        }
                    ]
                }
            ]
        }
    };

    function createCatalogSelectionState(catalogKey) {
        const catalog = PRODUCT_CATALOG[catalogKey];
        if (!catalog) return null;

        const variety = catalog.varieties[0] || null;
        const brand = variety && variety.brands ? variety.brands[0] : null;
        const weight = brand && brand.weights ? brand.weights[0] : null;

        return {
            catalogKey,
            catalog,
            variety,
            brand,
            weight
        };
    }

    function getProductIdentity(product) {
        return {
            imageSrc: product.imageSrc,
            imageAlt: product.imageAlt,
            product: product.product,
            variety: product.variety,
            brand: product.brand,
            weight: product.weight,
            unitPrice: product.unitPrice
        };
    }

    function formatCatalogProductName(selection) {
        if (!selection) return "Product";
        if (!selection.variety) return selection.catalog.productName;
        return selection.variety.name;
    }

    function syncCatalogModalDisplay() {
        if (!currentCatalogSelection) return;

        const selection = currentCatalogSelection;
        const productName = `${selection.catalog.productName}`;
        const variantName = selection.variety ? selection.variety.name : productName;
        const brandName = selection.brand ? selection.brand.name : "";
        const weightLabel = selection.weight ? selection.weight.label : "";
        const unitPrice = selection.weight ? selection.weight.unitPrice : 0;

        if (modalProductImage) {
            modalProductImage.src = selection.catalog.imageSrc;
            modalProductImage.alt = selection.catalog.imageAlt;
        }

        if (modalProductName) {
            modalProductName.innerText = variantName;
        }

        if (modalProductPrice) {
            modalProductPrice.innerText = unitPrice > 0 ? `₹${unitPrice.toFixed(2)}` : "";
        }

        if (modalSelectedVariety) {
            modalSelectedVariety.innerText = selection.variety ? `Variety: ${selection.variety.name}` : "";
        }

        if (modalSelectedBrand) {
            modalSelectedBrand.innerText = selection.brand ? `Brand: ${selection.brand.name}` : "";
        }

        if (modalSelectedWeight) {
            modalSelectedWeight.innerText = selection.weight ? `Weight: ${selection.weight.label}` : "";
        }

        if (modalQuantity) {
            modalQuantity.value = "1";
        }

        if (addToListButton) {
            addToListButton.innerText = "Add to List";
        }
    }

    function renderVariantOptions(container, options, selectedId, onSelect) {
        if (!container) return;

        container.innerHTML = "";
        options.forEach((option) => {
            const button = document.createElement("button");
            button.type = "button";
            button.className = "variant-option";
            button.innerText = option.name || option.label;
            button.dataset.variantId = option.id;
            button.classList.toggle("is-selected", option.id === selectedId);
            button.addEventListener("click", () => onSelect(option));
            container.appendChild(button);
        });
    }

    function renderCatalogVariantSteps() {
        if (!currentCatalogSelection || !catalogVariantSteps) return;

        const selection = currentCatalogSelection;
        const catalog = selection.catalog;

        renderVariantOptions(modalVarietyList, catalog.varieties, selection.variety ? selection.variety.id : null, (variety) => {
            currentCatalogSelection.variety = variety;
            currentCatalogSelection.brand = variety.brands[0] || null;
            currentCatalogSelection.weight = currentCatalogSelection.brand && currentCatalogSelection.brand.weights ? currentCatalogSelection.brand.weights[0] : null;
            renderCatalogVariantSteps();
            syncCatalogModalDisplay();
        });

        const brands = selection.variety ? selection.variety.brands : [];
        renderVariantOptions(modalBrandList, brands, selection.brand ? selection.brand.id : null, (brand) => {
            currentCatalogSelection.brand = brand;
            currentCatalogSelection.weight = brand.weights[0] || null;
            renderCatalogVariantSteps();
            syncCatalogModalDisplay();
        });

        const weights = selection.brand ? selection.brand.weights : [];
        renderVariantOptions(modalWeightList, weights, selection.weight ? selection.weight.id : null, (weight) => {
            currentCatalogSelection.weight = weight;
            renderCatalogVariantSteps();
            syncCatalogModalDisplay();
        });
    }

    function setCatalogModalState(catalogKey) {
        currentCatalogSelection = createCatalogSelectionState(catalogKey);

        if (!currentCatalogSelection) {
            if (catalogVariantSteps) {
                catalogVariantSteps.classList.add("is-hidden");
            }
            return;
        }

        if (catalogVariantSteps) {
            catalogVariantSteps.classList.remove("is-hidden");
        }

        renderCatalogVariantSteps();
        syncCatalogModalDisplay();
    }

    function setSimpleModalState(productCard) {
        currentCatalogSelection = null;

        if (catalogVariantSteps) {
            catalogVariantSteps.classList.add("is-hidden");
        }

        const image = productCard.querySelector("img");
        const name = productCard.querySelector("h3");
        const price = productCard.querySelector("p");

        currentProduct = {
            imageSrc: image ? image.getAttribute("src") : "",
            imageAlt: image ? image.getAttribute("alt") : "Product",
            product: name ? name.innerText : "Product",
            variety: "",
            brand: "",
            weight: "",
            unitPrice: extractUnitPrice(price ? price.innerText : "")
        };

        if (modalProductImage) {
            modalProductImage.src = currentProduct.imageSrc;
            modalProductImage.alt = currentProduct.imageAlt;
        }

        if (modalProductName) {
            modalProductName.innerText = currentProduct.product;
        }

        if (modalProductPrice) {
            modalProductPrice.innerText = price ? price.innerText : "";
        }

        if (modalSelectedVariety) modalSelectedVariety.innerText = "";
        if (modalSelectedBrand) modalSelectedBrand.innerText = "";
        if (modalSelectedWeight) modalSelectedWeight.innerText = "";

        if (modalQuantity) {
            modalQuantity.value = "1";
        }
    }

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
            const priceEl = item.querySelector("[data-role='unit-price']");
            const quantityEl = item.querySelector("[data-role='quantity']");
            const price = priceEl ? parseFloat(priceEl.getAttribute("data-price") || "0") : 0;
            const quantity = quantityEl ? parseInt(quantityEl.getAttribute("data-quantity") || "1", 10) : 1;
            total += price * quantity;
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
                <p class="selected-item-text">
                    <span>${p.product || p.name}</span><br>
                    ${p.variety ? `<span>${p.variety}</span><br>` : ''}
                    ${p.brand ? `<span>${p.brand}</span><br>` : ''}
                    ${p.weight ? `<span>${p.weight}</span><br>` : ''}
                    <span data-role="quantity" data-quantity="${p.quantity}">Qty: ${p.quantity}</span><br>
                    <small data-role="unit-price" data-price="${p.unitPrice}">₹${p.unitPrice.toFixed(2)}</small>
                </p>
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
            item.product === product.product &&
            item.variety === product.variety &&
            item.brand === product.brand &&
            item.weight === product.weight &&
            item.unitPrice === product.unitPrice
        ));

        if (existing) {
            existing.quantity += safeQuantity;
        } else {
            selectedProducts.push({
                imageSrc: product.imageSrc,
                imageAlt: product.imageAlt,
                name: product.product,
                product: product.product,
                variety: product.variety,
                brand: product.brand,
                weight: product.weight,
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

            const catalogKey = productCard.getAttribute("data-catalog-key");
            if (catalogKey && PRODUCT_CATALOG[catalogKey]) {
                currentProduct = null;
                setCatalogModalState(catalogKey);
            } else {
                setSimpleModalState(productCard);
            }

            openModal();
        });
    });

    if (addToListButton) {
        addToListButton.addEventListener("click", () => {
            if (!modalQuantity) {
                return;
            }

            const quantity = Math.max(1, parseInt(modalQuantity.value, 10) || 1);

            if (currentCatalogSelection && currentCatalogSelection.weight) {
                const selection = currentCatalogSelection;
                addProductToSelection({
                    imageSrc: selection.catalog.imageSrc,
                    imageAlt: selection.catalog.imageAlt,
                    product: selection.catalog.productName,
                    variety: selection.variety ? selection.variety.name : "",
                    brand: selection.brand ? selection.brand.name : "",
                    weight: selection.weight ? selection.weight.label : "",
                    unitPrice: selection.weight.unitPrice
                }, quantity);
            } else if (currentProduct) {
                addProductToSelection({
                    imageSrc: currentProduct.imageSrc,
                    imageAlt: currentProduct.imageAlt,
                    product: currentProduct.product,
                    variety: currentProduct.variety,
                    brand: currentProduct.brand,
                    weight: currentProduct.weight,
                    unitPrice: currentProduct.unitPrice
                }, quantity);
            } else {
                return;
            }

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
        const header = ['Product', 'Variety', 'Brand', 'Weight', 'Quantity', 'Unit Price', 'Total'];
        const rows = selectedProducts.map(p => [
            p.product || p.name || '',
            p.variety || '',
            p.brand || '',
            p.weight || '',
            p.quantity,
            p.unitPrice.toFixed(2),
            (p.unitPrice * p.quantity).toFixed(2)
        ]);
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
