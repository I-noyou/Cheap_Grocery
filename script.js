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
    const modalContent = modal ? modal.querySelector(".cart-modal-content") : null;
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

    const MILK_PACKAGE_SIZES = [
        { id: "500ml", label: "500 ml", unitPrice: 32 },
        { id: "1l", label: "1 L", unitPrice: 64 },
        { id: "2l", label: "2 L", unitPrice: 126 },
        { id: "5l", label: "5 L", unitPrice: 310 }
    ];

    const MILK_BRAND_NAMES = {
        amul: "Amul",
        "mother-dairy": "Mother Dairy",
        nandini: "Nandini",
        verka: "Verka",
        heritage: "Heritage",
        akshayakalpa: "Akshayakalpa",
        "country-delight": "Country Delight",
        "organic-india": "Organic India"
    };

    function createCatalogBrand(brandId, brandNames, packageSizes) {
        return {
            id: brandId,
            name: brandNames[brandId],
            weights: packageSizes.map((size) => ({ ...size }))
        };
    }

    function createCatalogType(typeId, typeName, brandIds, brandNames, packageSizes) {
        return {
            id: typeId,
            name: typeName,
            brands: brandIds.map((brandId) => createCatalogBrand(brandId, brandNames, packageSizes))
        };
    }

    function createMilkType(typeId, typeName, brandIds) {
        return createCatalogType(typeId, typeName, brandIds, MILK_BRAND_NAMES, MILK_PACKAGE_SIZES);
    }

    const MUSHROOM_PACKAGE_SIZES = [
        { id: "100g", label: "100 g", unitPrice: 45 },
        { id: "200g", label: "200 g", unitPrice: 85 },
        { id: "500g", label: "500 g", unitPrice: 200 },
        { id: "1kg", label: "1 kg", unitPrice: 380 }
    ];

    const MUSHROOM_BRAND_NAMES = {
        "fresh-farm": "FreshFarm",
        "nature-fresh": "Nature Fresh",
        "green-basket": "Green Basket",
        "organic-india": "Organic India",
        "mushroom-valley": "Mushroom Valley",
        "eco-fresh": "Eco Fresh",
        "urban-platter": "Urban Platter",
        "natures-basket": "Nature's Basket"
    };

    const COOKING_OIL_BRAND_NAMES = {
        fortune: "Fortune",
        saffola: "Saffola",
        dhara: "Dhara",
        gemini: "Gemini",
        patanjali: "Patanjali",
        engine: "Engine",
        gulab: "Gulab",
        nutrela: "Nutrela",
        ricela: "Ricela",
        parachute: "Parachute",
        "max-care": "Max Care",
        klf: "KLF",
        borges: "Borges",
        figaro: "Figaro",
        "del-monte": "Del Monte"
    };

    function createCookingOilType(typeId, typeName, brandIds, packageSizes) {
        return createCatalogType(typeId, typeName, brandIds, COOKING_OIL_BRAND_NAMES, packageSizes);
    }

    const ATTA_PACKAGE_SIZES = [
        { id: "1kg", label: "1 kg" },
        { id: "2kg", label: "2 kg" },
        { id: "5kg", label: "5 kg" },
        { id: "10kg", label: "10 kg" },
        { id: "20kg", label: "20 kg" }
    ];

    const ATTA_BRAND_NAMES = {
        aashirvaad: "Aashirvaad",
        pillsbury: "Pillsbury",
        patanjali: "Patanjali",
        fortune: "Fortune",
        annapurna: "Annapurna",
        "local-mill": "Local Mill",
        "organic-india": "Organic India",
        "24-mantra": "24 Mantra",
        natureland: "Natureland",
        "urban-platter": "Urban Platter"
    };

    const ATTA_TYPE_PRICES = {
        "whole-wheat": [52, 102, 248, 485, 950],
        multigrain: [64, 125, 305, 595, 1165],
        sharbati: [59, 118, 288, 560, 1095],
        "chakki-fresh": [49, 110, 265, 518, 1015],
        "organic-wheat": [78, 154, 378, 740, 1450],
        "gluten-free": [91, 182, 448, 875, 1715],
        "high-fibre": [68, 134, 328, 640, 1255]
    };

    const ATTA_BRAND_PRICE_ADJUSTMENTS = {
        aashirvaad: 0,
        pillsbury: 3,
        patanjali: -2,
        fortune: 2,
        annapurna: 1,
        "local-mill": -4,
        "organic-india": 5,
        "24-mantra": 7,
        natureland: 4,
        "urban-platter": 8
    };

    function createAttaType(typeId, typeName, brandIds) {
        const packagePrices = ATTA_TYPE_PRICES[typeId];

        return {
            id: typeId,
            name: typeName,
            brands: brandIds.map((brandId) => ({
                id: brandId,
                name: ATTA_BRAND_NAMES[brandId],
                weights: ATTA_PACKAGE_SIZES.map((size, index) => ({
                    ...size,
                    unitPrice: packagePrices[index] + ATTA_BRAND_PRICE_ADJUSTMENTS[brandId]
                }))
            }))
        };
    }

    function createBreadBrand(brandId, brandName, packageSizes) {
        return {
            id: brandId,
            name: brandName,
            weights: packageSizes.map(([id, label, unitPrice]) => ({ id, label, unitPrice }))
        };
    }

    function getCatalogLabels(catalog) {
        return Object.assign({
            varietyTitle: "Variety",
            brandTitle: "Brand",
            weightTitle: "Weight",
            varietyDetail: "Variety",
            brandDetail: "Brand",
            weightDetail: "Weight"
        }, catalog && catalog.labels ? catalog.labels : {});
    }

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
        },
        dal: {
            productName: "Dal",
            imageSrc: "images/Dal.jpg",
            imageAlt: "Dal",
            labels: {
                varietyTitle: "Select Dal Type",
                brandTitle: "Select Brand",
                weightTitle: "Select Package Size",
                varietyDetail: "Dal Type",
                brandDetail: "Brand",
                weightDetail: "Package Size"
            },
            varieties: [
                {
                    id: "toor-dal",
                    name: "Toor Dal / Arhar Dal",
                    brands: [
                        { id: "tata-sampann", name: "Tata Sampann", weights: [{ id: "500g", label: "500 g", unitPrice: 92 }, { id: "1kg", label: "1 kg", unitPrice: 180 }, { id: "2kg", label: "2 kg", unitPrice: 355 }, { id: "5kg", label: "5 kg", unitPrice: 870 }] },
                        { id: "fortune", name: "Fortune", weights: [{ id: "500g", label: "500 g", unitPrice: 86 }, { id: "1kg", label: "1 kg", unitPrice: 169 }, { id: "2kg", label: "2 kg", unitPrice: 334 }, { id: "5kg", label: "5 kg", unitPrice: 815 }] },
                        { id: "tata-simply-better", name: "Tata Simply Better", weights: [{ id: "500g", label: "500 g", unitPrice: 96 }, { id: "1kg", label: "1 kg", unitPrice: 188 }, { id: "2kg", label: "2 kg", unitPrice: 370 }] },
                        { id: "patanjali", name: "Patanjali", weights: [{ id: "500g", label: "500 g", unitPrice: 82 }, { id: "1kg", label: "1 kg", unitPrice: 161 }, { id: "5kg", label: "5 kg", unitPrice: 780 }] }
                    ]
                },
                {
                    id: "moong-dal",
                    name: "Moong Dal",
                    brands: [
                        { id: "tata-sampann", name: "Tata Sampann", weights: [{ id: "500g", label: "500 g", unitPrice: 78 }, { id: "1kg", label: "1 kg", unitPrice: 152 }, { id: "2kg", label: "2 kg", unitPrice: 300 }, { id: "5kg", label: "5 kg", unitPrice: 735 }] },
                        { id: "fortune", name: "Fortune", weights: [{ id: "500g", label: "500 g", unitPrice: 72 }, { id: "1kg", label: "1 kg", unitPrice: 142 }, { id: "2kg", label: "2 kg", unitPrice: 280 }, { id: "5kg", label: "5 kg", unitPrice: 685 }] },
                        { id: "patanjali", name: "Patanjali", weights: [{ id: "500g", label: "500 g", unitPrice: 75 }, { id: "1kg", label: "1 kg", unitPrice: 147 }, { id: "2kg", label: "2 kg", unitPrice: 290 }] },
                        { id: "organic-tattva", name: "Organic Tattva", weights: [{ id: "500g", label: "500 g", unitPrice: 90 }, { id: "1kg", label: "1 kg", unitPrice: 176 }, { id: "2kg", label: "2 kg", unitPrice: 345 }] }
                    ]
                },
                {
                    id: "chana-dal",
                    name: "Chana Dal",
                    brands: [
                        { id: "tata-sampann", name: "Tata Sampann", weights: [{ id: "500g", label: "500 g", unitPrice: 54 }, { id: "1kg", label: "1 kg", unitPrice: 105 }, { id: "2kg", label: "2 kg", unitPrice: 206 }, { id: "5kg", label: "5 kg", unitPrice: 500 }] },
                        { id: "fortune", name: "Fortune", weights: [{ id: "500g", label: "500 g", unitPrice: 50 }, { id: "1kg", label: "1 kg", unitPrice: 98 }, { id: "2kg", label: "2 kg", unitPrice: 192 }] },
                        { id: "patanjali", name: "Patanjali", weights: [{ id: "500g", label: "500 g", unitPrice: 48 }, { id: "1kg", label: "1 kg", unitPrice: 94 }, { id: "5kg", label: "5 kg", unitPrice: 455 }] },
                        { id: "organic-tattva", name: "Organic Tattva", weights: [{ id: "500g", label: "500 g", unitPrice: 67 }, { id: "1kg", label: "1 kg", unitPrice: 130 }, { id: "2kg", label: "2 kg", unitPrice: 255 }] }
                    ]
                },
                {
                    id: "masoor-dal",
                    name: "Masoor Dal",
                    brands: [
                        { id: "tata-sampann", name: "Tata Sampann", weights: [{ id: "500g", label: "500 g", unitPrice: 63 }, { id: "1kg", label: "1 kg", unitPrice: 122 }, { id: "2kg", label: "2 kg", unitPrice: 240 }, { id: "5kg", label: "5 kg", unitPrice: 585 }] },
                        { id: "fortune", name: "Fortune", weights: [{ id: "500g", label: "500 g", unitPrice: 58 }, { id: "1kg", label: "1 kg", unitPrice: 113 }, { id: "2kg", label: "2 kg", unitPrice: 222 }] },
                        { id: "patanjali", name: "Patanjali", weights: [{ id: "500g", label: "500 g", unitPrice: 56 }, { id: "1kg", label: "1 kg", unitPrice: 110 }, { id: "5kg", label: "5 kg", unitPrice: 530 }] },
                        { id: "organic-tattva", name: "Organic Tattva", weights: [{ id: "500g", label: "500 g", unitPrice: 76 }, { id: "1kg", label: "1 kg", unitPrice: 148 }, { id: "2kg", label: "2 kg", unitPrice: 290 }] }
                    ]
                },
                {
                    id: "urad-dal",
                    name: "Urad Dal",
                    brands: [
                        { id: "tata-sampann", name: "Tata Sampann", weights: [{ id: "500g", label: "500 g", unitPrice: 88 }, { id: "1kg", label: "1 kg", unitPrice: 172 }, { id: "2kg", label: "2 kg", unitPrice: 338 }] },
                        { id: "fortune", name: "Fortune", weights: [{ id: "500g", label: "500 g", unitPrice: 82 }, { id: "1kg", label: "1 kg", unitPrice: 160 }, { id: "5kg", label: "5 kg", unitPrice: 775 }] },
                        { id: "patanjali", name: "Patanjali", weights: [{ id: "500g", label: "500 g", unitPrice: 80 }, { id: "1kg", label: "1 kg", unitPrice: 156 }, { id: "2kg", label: "2 kg", unitPrice: 306 }] },
                        { id: "organic-tattva", name: "Organic Tattva", weights: [{ id: "500g", label: "500 g", unitPrice: 102 }, { id: "1kg", label: "1 kg", unitPrice: 198 }, { id: "2kg", label: "2 kg", unitPrice: 390 }] }
                    ]
                },
                {
                    id: "moong-dal-chilka",
                    name: "Moong Dal Chilka",
                    brands: [
                        { id: "tata-sampann", name: "Tata Sampann", weights: [{ id: "500g", label: "500 g", unitPrice: 74 }, { id: "1kg", label: "1 kg", unitPrice: 144 }, { id: "2kg", label: "2 kg", unitPrice: 284 }] },
                        { id: "fortune", name: "Fortune", weights: [{ id: "500g", label: "500 g", unitPrice: 69 }, { id: "1kg", label: "1 kg", unitPrice: 135 }, { id: "5kg", label: "5 kg", unitPrice: 650 }] },
                        { id: "patanjali", name: "Patanjali", weights: [{ id: "500g", label: "500 g", unitPrice: 71 }, { id: "1kg", label: "1 kg", unitPrice: 139 }, { id: "2kg", label: "2 kg", unitPrice: 274 }] }
                    ]
                },
                {
                    id: "urad-dal-chilka",
                    name: "Urad Dal Chilka",
                    brands: [
                        { id: "tata-sampann", name: "Tata Sampann", weights: [{ id: "500g", label: "500 g", unitPrice: 84 }, { id: "1kg", label: "1 kg", unitPrice: 164 }, { id: "2kg", label: "2 kg", unitPrice: 322 }] },
                        { id: "fortune", name: "Fortune", weights: [{ id: "500g", label: "500 g", unitPrice: 79 }, { id: "1kg", label: "1 kg", unitPrice: 154 }, { id: "5kg", label: "5 kg", unitPrice: 745 }] },
                        { id: "patanjali", name: "Patanjali", weights: [{ id: "500g", label: "500 g", unitPrice: 77 }, { id: "1kg", label: "1 kg", unitPrice: 150 }, { id: "2kg", label: "2 kg", unitPrice: 295 }] }
                    ]
                }
            ]
        },
        butter: {
            productName: "Butter",
            imageSrc: "images/Butter.jpg",
            imageAlt: "Butter",
            labels: {
                varietyTitle: "Select Butter Type",
                brandTitle: "Select Brand",
                weightTitle: "Select Package Size",
                varietyDetail: "Butter Type",
                brandDetail: "Brand",
                weightDetail: "Package Size"
            },
            varieties: [
                {
                    id: "salted-butter",
                    name: "Salted Butter",
                    brands: [
                        createBreadBrand("amul", "Amul", [["50g", "50 g", 30], ["100g", "100 g", 60], ["200g", "200 g", 118], ["500g", "500 g", 285]]),
                        createBreadBrand("britannia", "Britannia", [["50g", "50 g", 32], ["100g", "100 g", 62], ["200g", "200 g", 120], ["500g", "500 g", 290]]),
                        createBreadBrand("mother-dairy", "Mother Dairy", [["100g", "100 g", 58], ["200g", "200 g", 115], ["500g", "500 g", 280]]),
                        createBreadBrand("nandini", "Nandini", [["100g", "100 g", 55], ["200g", "200 g", 108], ["500g", "500 g", 265]])
                    ]
                },
                {
                    id: "unsalted-butter",
                    name: "Unsalted Butter",
                    brands: [
                        createBreadBrand("amul", "Amul", [["100g", "100 g", 65], ["200g", "200 g", 125], ["500g", "500 g", 305]]),
                        createBreadBrand("britannia", "Britannia", [["100g", "100 g", 67], ["200g", "200 g", 130], ["500g", "500 g", 315]]),
                        createBreadBrand("president", "President", [["100g", "100 g", 92], ["200g", "200 g", 178], ["500g", "500 g", 430]])
                    ]
                },
                {
                    id: "table-butter",
                    name: "Table Butter",
                    brands: [
                        createBreadBrand("amul", "Amul", [["50g", "50 g", 28], ["100g", "100 g", 55], ["200g", "200 g", 108], ["500g", "500 g", 260]]),
                        createBreadBrand("britannia", "Britannia", [["100g", "100 g", 57], ["200g", "200 g", 112], ["500g", "500 g", 270]]),
                        createBreadBrand("mother-dairy", "Mother Dairy", [["100g", "100 g", 53], ["200g", "200 g", 105], ["500g", "500 g", 255]])
                    ]
                },
                {
                    id: "white-butter",
                    name: "White Butter",
                    brands: [
                        createBreadBrand("amul", "Amul", [["100g", "100 g", 70], ["200g", "200 g", 135], ["500g", "500 g", 325]]),
                        createBreadBrand("mother-dairy", "Mother Dairy", [["100g", "100 g", 66], ["200g", "200 g", 128], ["500g", "500 g", 310]]),
                        createBreadBrand("nandini", "Nandini", [["100g", "100 g", 62], ["200g", "200 g", 120], ["500g", "500 g", 295]])
                    ]
                },
                {
                    id: "garlic-butter",
                    name: "Garlic Butter",
                    brands: [
                        createBreadBrand("amul", "Amul", [["100g", "100 g", 78], ["200g", "200 g", 150]]),
                        createBreadBrand("britannia", "Britannia", [["100g", "100 g", 80], ["200g", "200 g", 155]]),
                        createBreadBrand("dlecta", "D'lecta", [["100g", "100 g", 88], ["200g", "200 g", 170], ["500g", "500 g", 405]])
                    ]
                },
                {
                    id: "low-fat-butter",
                    name: "Low-Fat Butter",
                    brands: [
                        createBreadBrand("amul", "Amul", [["100g", "100 g", 68], ["200g", "200 g", 132], ["500g", "500 g", 320]]),
                        createBreadBrand("britannia", "Britannia", [["100g", "100 g", 70], ["200g", "200 g", 138], ["500g", "500 g", 330]])
                    ]
                }
            ]
        },
        salt: {
            productName: "Salt",
            imageSrc: "images/Salt.jpg",
            imageAlt: "Salt",
            labels: {
                varietyTitle: "Select Salt Type",
                brandTitle: "Select Brand",
                weightTitle: "Select Package Size",
                varietyDetail: "Salt Type",
                brandDetail: "Brand",
                weightDetail: "Package Size"
            },
            varieties: [
                {
                    id: "iodized-salt",
                    name: "Iodized Salt",
                    brands: [
                        createBreadBrand("tata-salt", "Tata Salt", [["500g", "500 g", 15], ["1kg", "1 kg", 28], ["2kg", "2 kg", 55], ["5kg", "5 kg", 135]]),
                        createBreadBrand("aashirvaad", "Aashirvaad", [["500g", "500 g", 13], ["1kg", "1 kg", 25], ["2kg", "2 kg", 49], ["5kg", "5 kg", 120]]),
                        createBreadBrand("patanjali", "Patanjali", [["500g", "500 g", 12], ["1kg", "1 kg", 23], ["2kg", "2 kg", 45]]),
                        createBreadBrand("annapurna", "Annapurna", [["500g", "500 g", 14], ["1kg", "1 kg", 26], ["2kg", "2 kg", 51], ["5kg", "5 kg", 125]])
                    ]
                },
                {
                    id: "rock-salt",
                    name: "Rock Salt / Sendha Namak",
                    brands: [
                        createBreadBrand("tata-salt", "Tata Salt", [["500g", "500 g", 30], ["1kg", "1 kg", 58], ["2kg", "2 kg", 112]]),
                        createBreadBrand("aashirvaad", "Aashirvaad", [["500g", "500 g", 28], ["1kg", "1 kg", 54], ["2kg", "2 kg", 105]]),
                        createBreadBrand("patanjali", "Patanjali", [["500g", "500 g", 26], ["1kg", "1 kg", 50], ["2kg", "2 kg", 98]]),
                        createBreadBrand("catch", "Catch", [["200g", "200 g", 22], ["500g", "500 g", 48], ["1kg", "1 kg", 92]])
                    ]
                },
                {
                    id: "black-salt",
                    name: "Black Salt / Kala Namak",
                    brands: [
                        createBreadBrand("tata-salt", "Tata Salt", [["200g", "200 g", 18], ["500g", "500 g", 40], ["1kg", "1 kg", 76]]),
                        createBreadBrand("catch", "Catch", [["200g", "200 g", 24], ["500g", "500 g", 52], ["1kg", "1 kg", 98]]),
                        createBreadBrand("patanjali", "Patanjali", [["200g", "200 g", 16], ["500g", "500 g", 36], ["1kg", "1 kg", 68]]),
                        createBreadBrand("everest", "Everest", [["200g", "200 g", 21], ["500g", "500 g", 46], ["1kg", "1 kg", 88]])
                    ]
                },
                {
                    id: "sea-salt",
                    name: "Sea Salt",
                    brands: [
                        createBreadBrand("tata-salt", "Tata Salt", [["500g", "500 g", 42], ["1kg", "1 kg", 80]]),
                        createBreadBrand("urban-platter", "Urban Platter", [["200g", "200 g", 70], ["500g", "500 g", 155], ["1kg", "1 kg", 290]]),
                        createBreadBrand("keya", "Keya", [["200g", "200 g", 60], ["500g", "500 g", 135]])
                    ]
                },
                {
                    id: "pink-himalayan-salt",
                    name: "Pink Himalayan Salt",
                    brands: [
                        createBreadBrand("tata-salt", "Tata Salt", [["200g", "200 g", 55], ["500g", "500 g", 125], ["1kg", "1 kg", 235]]),
                        createBreadBrand("urban-platter", "Urban Platter", [["200g", "200 g", 95], ["500g", "500 g", 210], ["1kg", "1 kg", 390]]),
                        createBreadBrand("himalayan-natives", "Himalayan Natives", [["200g", "200 g", 75], ["500g", "500 g", 170], ["1kg", "1 kg", 320]]),
                        createBreadBrand("keya", "Keya", [["200g", "200 g", 68], ["500g", "500 g", 150]])
                    ]
                },
                {
                    id: "low-sodium-salt",
                    name: "Low Sodium Salt",
                    brands: [
                        createBreadBrand("tata-salt-lite", "Tata Salt Lite", [["500g", "500 g", 58], ["1kg", "1 kg", 110]]),
                        createBreadBrand("saffola", "Saffola", [["500g", "500 g", 65], ["1kg", "1 kg", 125]]),
                        createBreadBrand("lo-foods", "Lo! Foods", [["200g", "200 g", 48], ["500g", "500 g", 105]])
                    ]
                }
            ]
        },
        "body-lotion": {
            productName: "Body Lotion",
            imageSrc: "images/Body Lotion.jpg",
            imageAlt: "Body Lotion",
            labels: {
                varietyTitle: "Select Lotion Type",
                brandTitle: "Select Brand",
                weightTitle: "Select Package Size",
                varietyDetail: "Lotion Type",
                brandDetail: "Brand",
                weightDetail: "Package Size"
            },
            varieties: [
                {
                    id: "daily-moisturizing",
                    name: "Daily Moisturizing Lotion",
                    brands: [
                        createBreadBrand("nivea", "Nivea", [["100ml", "100 ml", 120], ["200ml", "200 ml", 220], ["400ml", "400 ml", 395], ["600ml", "600 ml", 560]]),
                        createBreadBrand("vaseline", "Vaseline", [["100ml", "100 ml", 110], ["200ml", "200 ml", 205], ["400ml", "400 ml", 375], ["600ml", "600 ml", 535]]),
                        createBreadBrand("dove", "Dove", [["200ml", "200 ml", 240], ["400ml", "400 ml", 430], ["600ml", "600 ml", 610]]),
                        createBreadBrand("himalaya", "Himalaya", [["100ml", "100 ml", 95], ["200ml", "200 ml", 175], ["400ml", "400 ml", 325]])
                    ]
                },
                {
                    id: "deep-moisturizing",
                    name: "Deep Moisturizing Lotion",
                    brands: [
                        createBreadBrand("nivea", "Nivea", [["100ml", "100 ml", 135], ["200ml", "200 ml", 245], ["400ml", "400 ml", 440], ["600ml", "600 ml", 625]]),
                        createBreadBrand("vaseline", "Vaseline", [["100ml", "100 ml", 125], ["200ml", "200 ml", 230], ["400ml", "400 ml", 415]]),
                        createBreadBrand("cetaphil", "Cetaphil", [["100ml", "100 ml", 240], ["200ml", "200 ml", 430], ["400ml", "400 ml", 790]]),
                        createBreadBrand("dove", "Dove", [["200ml", "200 ml", 255], ["400ml", "400 ml", 460], ["600ml", "600 ml", 650]])
                    ]
                },
                {
                    id: "dry-skin",
                    name: "Dry Skin Lotion",
                    brands: [
                        createBreadBrand("nivea", "Nivea", [["100ml", "100 ml", 140], ["200ml", "200 ml", 255], ["400ml", "400 ml", 455]]),
                        createBreadBrand("vaseline", "Vaseline", [["100ml", "100 ml", 130], ["200ml", "200 ml", 240], ["400ml", "400 ml", 430], ["600ml", "600 ml", 610]]),
                        createBreadBrand("cetaphil", "Cetaphil", [["100ml", "100 ml", 250], ["200ml", "200 ml", 450], ["400ml", "400 ml", 820]]),
                        createBreadBrand("himalaya", "Himalaya", [["100ml", "100 ml", 105], ["200ml", "200 ml", 190], ["400ml", "400 ml", 350]])
                    ]
                },
                {
                    id: "aloe-vera",
                    name: "Aloe Vera Lotion",
                    brands: [
                        createBreadBrand("vaseline", "Vaseline", [["100ml", "100 ml", 115], ["200ml", "200 ml", 215], ["400ml", "400 ml", 390]]),
                        createBreadBrand("himalaya", "Himalaya", [["100ml", "100 ml", 100], ["200ml", "200 ml", 185], ["400ml", "400 ml", 340]]),
                        createBreadBrand("mamaearth", "Mamaearth", [["200ml", "200 ml", 299], ["400ml", "400 ml", 525]])
                    ]
                },
                {
                    id: "cocoa-butter",
                    name: "Cocoa Butter Lotion",
                    brands: [
                        createBreadBrand("vaseline", "Vaseline", [["100ml", "100 ml", 125], ["200ml", "200 ml", 235], ["400ml", "400 ml", 420], ["600ml", "600 ml", 595]]),
                        createBreadBrand("nivea", "Nivea", [["200ml", "200 ml", 265], ["400ml", "400 ml", 475], ["600ml", "600 ml", 670]]),
                        createBreadBrand("palmers", "Palmer's", [["100ml", "100 ml", 275], ["200ml", "200 ml", 495], ["400ml", "400 ml", 890]])
                    ]
                },
                {
                    id: "body-milk",
                    name: "Body Milk Lotion",
                    brands: [
                        createBreadBrand("nivea", "Nivea", [["100ml", "100 ml", 125], ["200ml", "200 ml", 225], ["400ml", "400 ml", 405], ["600ml", "600 ml", 575]]),
                        createBreadBrand("dove", "Dove", [["200ml", "200 ml", 245], ["400ml", "400 ml", 440], ["600ml", "600 ml", 625]]),
                        createBreadBrand("himalaya", "Himalaya", [["100ml", "100 ml", 98], ["200ml", "200 ml", 180], ["400ml", "400 ml", 330]])
                    ]
                },
                {
                    id: "spf-body",
                    name: "SPF Body Lotion",
                    brands: [
                        createBreadBrand("vaseline", "Vaseline", [["100ml", "100 ml", 160], ["200ml", "200 ml", 295], ["400ml", "400 ml", 535]]),
                        createBreadBrand("nivea", "Nivea", [["100ml", "100 ml", 175], ["200ml", "200 ml", 320], ["400ml", "400 ml", 575]]),
                        createBreadBrand("mamaearth", "Mamaearth", [["100ml", "100 ml", 225], ["200ml", "200 ml", 399], ["400ml", "400 ml", 710]])
                    ]
                }
            ]
        },
        bread: {
            productName: "Bread",
            imageSrc: "images/Bread.jpg",
            imageAlt: "Bread",
            labels: {
                varietyTitle: "Select Bread Type",
                brandTitle: "Select Brand",
                weightTitle: "Select Package Size",
                varietyDetail: "Bread Type",
                brandDetail: "Brand",
                weightDetail: "Package Size"
            },
            varieties: [
                {
                    id: "white-bread",
                    name: "White Bread",
                    brands: [
                        createBreadBrand("britannia", "Britannia", [["200g", "200 g", 25], ["400g", "400 g", 45], ["600g", "600 g", 65]]),
                        createBreadBrand("harvest-gold", "Harvest Gold", [["200g", "200 g", 28], ["400g", "400 g", 50], ["600g", "600 g", 72], ["800g", "800 g", 94]]),
                        createBreadBrand("modern", "Modern", [["200g", "200 g", 23], ["400g", "400 g", 42], ["600g", "600 g", 62]]),
                        createBreadBrand("english-oven", "English Oven", [["400g", "400 g", 48], ["600g", "600 g", 68], ["800g", "800 g", 90]])
                    ]
                },
                {
                    id: "brown-bread",
                    name: "Brown Bread",
                    brands: [
                        createBreadBrand("britannia", "Britannia", [["200g", "200 g", 28], ["400g", "400 g", 50], ["600g", "600 g", 72]]),
                        createBreadBrand("harvest-gold", "Harvest Gold", [["400g", "400 g", 54], ["600g", "600 g", 77], ["800g", "800 g", 101]]),
                        createBreadBrand("english-oven", "English Oven", [["200g", "200 g", 30], ["400g", "400 g", 53], ["600g", "600 g", 76]]),
                        createBreadBrand("modern", "Modern", [["200g", "200 g", 26], ["400g", "400 g", 47], ["800g", "800 g", 91]])
                    ]
                },
                {
                    id: "whole-wheat-bread",
                    name: "Whole Wheat Bread",
                    brands: [
                        createBreadBrand("britannia", "Britannia", [["400g", "400 g", 55], ["600g", "600 g", 78], ["800g", "800 g", 102]]),
                        createBreadBrand("harvest-gold", "Harvest Gold", [["200g", "200 g", 32], ["400g", "400 g", 58], ["600g", "600 g", 83]]),
                        createBreadBrand("english-oven", "English Oven", [["400g", "400 g", 60], ["600g", "600 g", 85], ["800g", "800 g", 111]])
                    ]
                },
                {
                    id: "multigrain-bread",
                    name: "Multigrain Bread",
                    brands: [
                        createBreadBrand("britannia", "Britannia", [["400g", "400 g", 62], ["600g", "600 g", 88], ["800g", "800 g", 115]]),
                        createBreadBrand("harvest-gold", "Harvest Gold", [["200g", "200 g", 36], ["400g", "400 g", 66], ["600g", "600 g", 93]]),
                        createBreadBrand("english-oven", "English Oven", [["400g", "400 g", 68], ["600g", "600 g", 96], ["800g", "800 g", 125]])
                    ]
                },
                {
                    id: "milk-bread",
                    name: "Milk Bread",
                    brands: [
                        createBreadBrand("britannia", "Britannia", [["200g", "200 g", 27], ["400g", "400 g", 48], ["600g", "600 g", 69]]),
                        createBreadBrand("modern", "Modern", [["200g", "200 g", 25], ["400g", "400 g", 45], ["800g", "800 g", 88]])
                    ]
                },
                {
                    id: "sandwich-bread",
                    name: "Sandwich Bread",
                    brands: [
                        createBreadBrand("britannia", "Britannia", [["400g", "400 g", 58], ["600g", "600 g", 82], ["800g", "800 g", 108]]),
                        createBreadBrand("harvest-gold", "Harvest Gold", [["400g", "400 g", 63], ["600g", "600 g", 89]]),
                        createBreadBrand("english-oven", "English Oven", [["200g", "200 g", 34], ["400g", "400 g", 65], ["600g", "600 g", 92]])
                    ]
                },
                {
                    id: "garlic-bread",
                    name: "Garlic Bread",
                    brands: [
                        createBreadBrand("britannia", "Britannia", [["200g", "200 g", 42], ["400g", "400 g", 76], ["600g", "600 g", 108]]),
                        createBreadBrand("english-oven", "English Oven", [["200g", "200 g", 46], ["400g", "400 g", 82], ["800g", "800 g", 155]])
                    ]
                }
            ]
        },
        milk: {
            productName: "Milk",
            imageSrc: "images/Milk.jpg",
            imageAlt: "Milk",
            labels: {
                varietyTitle: "Milk Type",
                brandTitle: "Brand",
                weightTitle: "Package Size",
                varietyDetail: "Type",
                brandDetail: "Brand",
                weightDetail: "Package Size"
            },
            varieties: [
                createMilkType("full-cream", "Full Cream Milk", ["amul", "mother-dairy", "nandini", "verka"]),
                createMilkType("toned", "Toned Milk", ["amul", "mother-dairy", "nandini", "heritage"]),
                createMilkType("double-toned", "Double Toned Milk", ["amul", "mother-dairy", "nandini", "heritage"]),
                createMilkType("skimmed", "Skimmed Milk", ["amul", "mother-dairy", "nandini"]),
                createMilkType("cow", "Cow Milk", ["amul", "akshayakalpa", "country-delight"]),
                createMilkType("buffalo", "Buffalo Milk", ["amul", "mother-dairy", "country-delight"]),
                createMilkType("organic", "Organic Milk", ["akshayakalpa", "country-delight", "organic-india"])
            ]
        },
        "wheat-atta": {
            productName: "Wheat Atta",
            imageSrc: "images/Whole-Wheat-Atta.jpg",
            imageAlt: "Wheat Atta",
            labels: {
                varietyTitle: "Select Atta Type",
                brandTitle: "Select Brand",
                weightTitle: "Select Package Size",
                varietyDetail: "Atta Type",
                brandDetail: "Brand",
                weightDetail: "Package Size"
            },
            varieties: [
                createAttaType("whole-wheat", "Whole Wheat Atta", ["aashirvaad", "pillsbury", "patanjali", "fortune", "annapurna"]),
                createAttaType("multigrain", "Multigrain Atta", ["aashirvaad", "pillsbury", "patanjali"]),
                createAttaType("sharbati", "Sharbati Atta", ["aashirvaad", "fortune", "annapurna"]),
                createAttaType("chakki-fresh", "Chakki Fresh Atta", ["fortune", "patanjali", "local-mill"]),
                createAttaType("organic-wheat", "Organic Wheat Atta", ["organic-india", "24-mantra", "natureland"]),
                createAttaType("gluten-free", "Gluten-Free Atta", ["urban-platter", "natureland", "organic-india"]),
                createAttaType("high-fibre", "High Fibre Atta", ["aashirvaad", "fortune", "pillsbury"])
            ]
        },
        mushroom: {
            productName: "Mushroom",
            imageSrc: "images/Mushroom.jpg",
            imageAlt: "Mushroom",
            modalProductName: "Mushroom",
            labels: {
                varietyTitle: "Select Mushroom Type",
                brandTitle: "Select Brand",
                weightTitle: "Select Package Size",
                varietyDetail: "Mushroom Type",
                brandDetail: "Brand",
                weightDetail: "Package Size"
            },
            varieties: [
                createCatalogType("button", "Button Mushroom", ["fresh-farm", "nature-fresh", "green-basket", "organic-india"], MUSHROOM_BRAND_NAMES, MUSHROOM_PACKAGE_SIZES),
                createCatalogType("oyster", "Oyster Mushroom", ["fresh-farm", "mushroom-valley", "eco-fresh"], MUSHROOM_BRAND_NAMES, MUSHROOM_PACKAGE_SIZES),
                createCatalogType("shiitake", "Shiitake Mushroom", ["urban-platter", "natures-basket", "organic-india"], MUSHROOM_BRAND_NAMES, MUSHROOM_PACKAGE_SIZES),
                createCatalogType("portobello", "Portobello Mushroom", ["fresh-farm", "green-basket"], MUSHROOM_BRAND_NAMES, MUSHROOM_PACKAGE_SIZES),
                createCatalogType("enoki", "Enoki Mushroom", ["urban-platter", "nature-fresh"], MUSHROOM_BRAND_NAMES, MUSHROOM_PACKAGE_SIZES),
                createCatalogType("milky", "Milky Mushroom", ["fresh-farm", "organic-india"], MUSHROOM_BRAND_NAMES, MUSHROOM_PACKAGE_SIZES),
                createCatalogType("dried", "Dried Mushroom", ["urban-platter", "natures-basket", "green-basket"], MUSHROOM_BRAND_NAMES, MUSHROOM_PACKAGE_SIZES)
            ]
        },
        tea: {
            productName: "Chai Paati",
            imageSrc: "images/Chai-patti.jpg",
            imageAlt: "Chai Paati",
            labels: {
                varietyTitle: "Select Tea Type",
                brandTitle: "Select Brand",
                weightTitle: "Select Package Size",
                varietyDetail: "Tea Type",
                brandDetail: "Brand",
                weightDetail: "Package Size"
            },
            varieties: [
                {
                    id: "regular-tea",
                    name: "Regular Tea",
                    brands: [
                        { id: "tata-tea", name: "Tata Tea", weights: [{ id: "100g", label: "100 g", unitPrice: 55 }, { id: "250g", label: "250 g", unitPrice: 130 }, { id: "500g", label: "500 g", unitPrice: 250 }, { id: "1kg", label: "1 kg", unitPrice: 485 }] },
                        { id: "brooke-bond", name: "Brooke Bond", weights: [{ id: "100g", label: "100 g", unitPrice: 50 }, { id: "250g", label: "250 g", unitPrice: 118 }, { id: "500g", label: "500 g", unitPrice: 225 }, { id: "1kg", label: "1 kg", unitPrice: 440 }] },
                        { id: "wagh-bakri", name: "Wagh Bakri", weights: [{ id: "100g", label: "100 g", unitPrice: 58 }, { id: "250g", label: "250 g", unitPrice: 140 }, { id: "500g", label: "500 g", unitPrice: 270 }, { id: "1kg", label: "1 kg", unitPrice: 520 }] },
                        { id: "red-label", name: "Red Label", weights: [{ id: "100g", label: "100 g", unitPrice: 54 }, { id: "250g", label: "250 g", unitPrice: 128 }, { id: "500g", label: "500 g", unitPrice: 245 }] }
                    ]
                },
                {
                    id: "premium-tea",
                    name: "Premium Tea",
                    brands: [
                        { id: "tata-tea-gold", name: "Tata Tea Gold", weights: [{ id: "100g", label: "100 g", unitPrice: 72 }, { id: "250g", label: "250 g", unitPrice: 175 }, { id: "500g", label: "500 g", unitPrice: 340 }, { id: "1kg", label: "1 kg", unitPrice: 660 }] },
                        { id: "wagh-bakri", name: "Wagh Bakri", weights: [{ id: "100g", label: "100 g", unitPrice: 68 }, { id: "250g", label: "250 g", unitPrice: 165 }, { id: "500g", label: "500 g", unitPrice: 320 }] },
                        { id: "society-tea", name: "Society Tea", weights: [{ id: "100g", label: "100 g", unitPrice: 75 }, { id: "250g", label: "250 g", unitPrice: 180 }, { id: "500g", label: "500 g", unitPrice: 350 }, { id: "1kg", label: "1 kg", unitPrice: 680 }] },
                        { id: "taj-mahal", name: "Taj Mahal", weights: [{ id: "100g", label: "100 g", unitPrice: 82 }, { id: "250g", label: "250 g", unitPrice: 200 }, { id: "500g", label: "500 g", unitPrice: 390 }] }
                    ]
                },
                {
                    id: "strong-tea",
                    name: "Strong Tea",
                    brands: [
                        { id: "brooke-bond", name: "Brooke Bond", weights: [{ id: "100g", label: "100 g", unitPrice: 56 }, { id: "250g", label: "250 g", unitPrice: 135 }, { id: "500g", label: "500 g", unitPrice: 260 }, { id: "1kg", label: "1 kg", unitPrice: 505 }] },
                        { id: "red-label", name: "Red Label", weights: [{ id: "100g", label: "100 g", unitPrice: 60 }, { id: "250g", label: "250 g", unitPrice: 145 }, { id: "500g", label: "500 g", unitPrice: 280 }, { id: "1kg", label: "1 kg", unitPrice: 545 }] },
                        { id: "tata-tea", name: "Tata Tea", weights: [{ id: "100g", label: "100 g", unitPrice: 58 }, { id: "250g", label: "250 g", unitPrice: 140 }, { id: "500g", label: "500 g", unitPrice: 270 }] },
                        { id: "wagh-bakri", name: "Wagh Bakri", weights: [{ id: "100g", label: "100 g", unitPrice: 63 }, { id: "250g", label: "250 g", unitPrice: 152 }, { id: "500g", label: "500 g", unitPrice: 295 }] }
                    ]
                },
                {
                    id: "masala-chai",
                    name: "Masala Chai",
                    brands: [
                        { id: "tata-tea", name: "Tata Tea", weights: [{ id: "100g", label: "100 g", unitPrice: 65 }, { id: "250g", label: "250 g", unitPrice: 155 }, { id: "500g", label: "500 g", unitPrice: 300 }] },
                        { id: "brooke-bond", name: "Brooke Bond", weights: [{ id: "100g", label: "100 g", unitPrice: 62 }, { id: "250g", label: "250 g", unitPrice: 150 }, { id: "500g", label: "500 g", unitPrice: 290 }] },
                        { id: "wagh-bakri", name: "Wagh Bakri", weights: [{ id: "100g", label: "100 g", unitPrice: 70 }, { id: "250g", label: "250 g", unitPrice: 170 }, { id: "500g", label: "500 g", unitPrice: 330 }] },
                        { id: "society-tea", name: "Society Tea", weights: [{ id: "100g", label: "100 g", unitPrice: 68 }, { id: "250g", label: "250 g", unitPrice: 165 }, { id: "500g", label: "500 g", unitPrice: 320 }] }
                    ]
                },
                {
                    id: "green-tea",
                    name: "Green Tea",
                    brands: [
                        { id: "tata-tea", name: "Tata Tea", weights: [{ id: "50g", label: "50 g", unitPrice: 85 }, { id: "100g", label: "100 g", unitPrice: 160 }, { id: "250g", label: "250 g", unitPrice: 370 }] },
                        { id: "lipton", name: "Lipton", weights: [{ id: "50g", label: "50 g", unitPrice: 90 }, { id: "100g", label: "100 g", unitPrice: 170 }, { id: "250g", label: "250 g", unitPrice: 390 }] },
                        { id: "organic-india", name: "Organic India", weights: [{ id: "50g", label: "50 g", unitPrice: 110 }, { id: "100g", label: "100 g", unitPrice: 210 }, { id: "250g", label: "250 g", unitPrice: 490 }] },
                        { id: "tetley", name: "Tetley", weights: [{ id: "50g", label: "50 g", unitPrice: 95 }, { id: "100g", label: "100 g", unitPrice: 180 }] }
                    ]
                },
                {
                    id: "ginger-tea",
                    name: "Ginger Tea",
                    brands: [
                        { id: "tata-tea", name: "Tata Tea", weights: [{ id: "100g", label: "100 g", unitPrice: 68 }, { id: "250g", label: "250 g", unitPrice: 165 }, { id: "500g", label: "500 g", unitPrice: 320 }] },
                        { id: "brooke-bond", name: "Brooke Bond", weights: [{ id: "100g", label: "100 g", unitPrice: 65 }, { id: "250g", label: "250 g", unitPrice: 158 }, { id: "500g", label: "500 g", unitPrice: 305 }] },
                        { id: "wagh-bakri", name: "Wagh Bakri", weights: [{ id: "100g", label: "100 g", unitPrice: 72 }, { id: "250g", label: "250 g", unitPrice: 175 }, { id: "500g", label: "500 g", unitPrice: 340 }] }
                    ]
                },
                {
                    id: "cardamom-tea",
                    name: "Cardamom Tea",
                    brands: [
                        { id: "tata-tea", name: "Tata Tea", weights: [{ id: "100g", label: "100 g", unitPrice: 70 }, { id: "250g", label: "250 g", unitPrice: 170 }, { id: "500g", label: "500 g", unitPrice: 330 }] },
                        { id: "brooke-bond", name: "Brooke Bond", weights: [{ id: "100g", label: "100 g", unitPrice: 67 }, { id: "250g", label: "250 g", unitPrice: 162 }, { id: "500g", label: "500 g", unitPrice: 315 }] },
                        { id: "wagh-bakri", name: "Wagh Bakri", weights: [{ id: "100g", label: "100 g", unitPrice: 75 }, { id: "250g", label: "250 g", unitPrice: 182 }, { id: "500g", label: "500 g", unitPrice: 355 }] }
                    ]
                },
                {
                    id: "black-tea",
                    name: "Black Tea",
                    brands: [
                        { id: "tata-tea", name: "Tata Tea", weights: [{ id: "100g", label: "100 g", unitPrice: 52 }, { id: "250g", label: "250 g", unitPrice: 125 }, { id: "500g", label: "500 g", unitPrice: 240 }, { id: "1kg", label: "1 kg", unitPrice: 465 }] },
                        { id: "lipton", name: "Lipton", weights: [{ id: "50g", label: "50 g", unitPrice: 48 }, { id: "100g", label: "100 g", unitPrice: 92 }, { id: "250g", label: "250 g", unitPrice: 220 }] },
                        { id: "tetley", name: "Tetley", weights: [{ id: "50g", label: "50 g", unitPrice: 55 }, { id: "100g", label: "100 g", unitPrice: 105 }, { id: "250g", label: "250 g", unitPrice: 250 }] },
                        { id: "wagh-bakri", name: "Wagh Bakri", weights: [{ id: "100g", label: "100 g", unitPrice: 57 }, { id: "250g", label: "250 g", unitPrice: 138 }, { id: "500g", label: "500 g", unitPrice: 265 }] }
                    ]
                }
            ]
        },
        toothpaste: {
            productName: "Toothpaste",
            imageSrc: "images/Toothpaste.jpg",
            imageAlt: "Toothpaste",
            labels: {
                varietyTitle: "Select Toothpaste Type",
                brandTitle: "Select Brand",
                weightTitle: "Select Package Size",
                varietyDetail: "Toothpaste Type",
                brandDetail: "Brand",
                weightDetail: "Package Size"
            },
            varieties: [
                {
                    id: "cavity-protection",
                    name: "Cavity Protection",
                    brands: [
                        { id: "colgate", name: "Colgate", imageSrc: "images/Toothpaste.jpg", imageAlt: "Colgate Toothpaste", weights: [{ id: "50g", label: "50 g", unitPrice: 35 }, { id: "100g", label: "100 g", unitPrice: 70 }, { id: "150g", label: "150 g", unitPrice: 100 }, { id: "200g", label: "200 g", unitPrice: 125 }] },
                        { id: "pepsodent", name: "Pepsodent", imageSrc: "images/Toothpaste.jpg", imageAlt: "Pepsodent Toothpaste", weights: [{ id: "50g", label: "50 g", unitPrice: 32 }, { id: "100g", label: "100 g", unitPrice: 62 }, { id: "150g", label: "150 g", unitPrice: 90 }, { id: "200g", label: "200 g", unitPrice: 115 }] },
                        { id: "closeup", name: "Closeup", imageSrc: "images/Toothpaste.jpg", imageAlt: "Closeup Toothpaste", weights: [{ id: "50g", label: "50 g", unitPrice: 34 }, { id: "100g", label: "100 g", unitPrice: 66 }, { id: "150g", label: "150 g", unitPrice: 96 }] }
                    ]
                },
                {
                    id: "whitening",
                    name: "Whitening",
                    brands: [
                        { id: "colgate", name: "Colgate", imageSrc: "images/Toothpaste.jpg", imageAlt: "Colgate Toothpaste", weights: [{ id: "50g", label: "50 g", unitPrice: 40 }, { id: "100g", label: "100 g", unitPrice: 76 }, { id: "150g", label: "150 g", unitPrice: 110 }] },
                        { id: "closeup", name: "Closeup", imageSrc: "images/Toothpaste.jpg", imageAlt: "Closeup Toothpaste", weights: [{ id: "50g", label: "50 g", unitPrice: 38 }, { id: "100g", label: "100 g", unitPrice: 72 }, { id: "150g", label: "150 g", unitPrice: 105 }, { id: "200g", label: "200 g", unitPrice: 135 }] },
                        { id: "sensodyne", name: "Sensodyne", imageSrc: "images/Toothpaste.jpg", imageAlt: "Sensodyne Toothpaste", weights: [{ id: "50g", label: "50 g", unitPrice: 95 }, { id: "100g", label: "100 g", unitPrice: 180 }, { id: "150g", label: "150 g", unitPrice: 250 }] }
                    ]
                },
                {
                    id: "sensitive-teeth",
                    name: "Sensitive Teeth",
                    brands: [
                        { id: "sensodyne", name: "Sensodyne", imageSrc: "images/Toothpaste.jpg", imageAlt: "Sensodyne Toothpaste", weights: [{ id: "50g", label: "50 g", unitPrice: 85 }, { id: "100g", label: "100 g", unitPrice: 160 }, { id: "150g", label: "150 g", unitPrice: 225 }] },
                        { id: "colgate", name: "Colgate", imageSrc: "images/Toothpaste.jpg", imageAlt: "Colgate Toothpaste", weights: [{ id: "50g", label: "50 g", unitPrice: 72 }, { id: "100g", label: "100 g", unitPrice: 138 }, { id: "150g", label: "150 g", unitPrice: 198 }, { id: "200g", label: "200 g", unitPrice: 258 }] },
                        { id: "oral-b", name: "Oral-B", imageSrc: "images/Toothpaste.jpg", imageAlt: "Oral-B Toothpaste", weights: [{ id: "50g", label: "50 g", unitPrice: 78 }, { id: "100g", label: "100 g", unitPrice: 148 }, { id: "150g", label: "150 g", unitPrice: 212 }] }
                    ]
                },
                {
                    id: "gum-care",
                    name: "Gum Care",
                    brands: [
                        { id: "colgate", name: "Colgate", imageSrc: "images/Toothpaste.jpg", imageAlt: "Colgate Toothpaste", weights: [{ id: "50g", label: "50 g", unitPrice: 62 }, { id: "100g", label: "100 g", unitPrice: 118 }, { id: "150g", label: "150 g", unitPrice: 168 }, { id: "200g", label: "200 g", unitPrice: 220 }] },
                        { id: "parodontax", name: "Parodontax", imageSrc: "images/Toothpaste.jpg", imageAlt: "Parodontax Toothpaste", weights: [{ id: "50g", label: "50 g", unitPrice: 110 }, { id: "100g", label: "100 g", unitPrice: 210 }, { id: "150g", label: "150 g", unitPrice: 300 }] },
                        { id: "oral-b", name: "Oral-B", imageSrc: "images/Toothpaste.jpg", imageAlt: "Oral-B Toothpaste", weights: [{ id: "50g", label: "50 g", unitPrice: 70 }, { id: "100g", label: "100 g", unitPrice: 134 }, { id: "200g", label: "200 g", unitPrice: 248 }] }
                    ]
                },
                {
                    id: "herbal-toothpaste",
                    name: "Herbal Toothpaste",
                    brands: [
                        { id: "patanjali", name: "Patanjali", imageSrc: "images/Toothpaste.jpg", imageAlt: "Patanjali Toothpaste", weights: [{ id: "50g", label: "50 g", unitPrice: 30 }, { id: "100g", label: "100 g", unitPrice: 56 }, { id: "150g", label: "150 g", unitPrice: 80 }, { id: "200g", label: "200 g", unitPrice: 104 }] },
                        { id: "himalaya", name: "Himalaya", imageSrc: "images/Toothpaste.jpg", imageAlt: "Himalaya Toothpaste", weights: [{ id: "50g", label: "50 g", unitPrice: 36 }, { id: "100g", label: "100 g", unitPrice: 68 }, { id: "150g", label: "150 g", unitPrice: 98 }] },
                        { id: "dabur", name: "Dabur", imageSrc: "images/Toothpaste.jpg", imageAlt: "Dabur Toothpaste", weights: [{ id: "100g", label: "100 g", unitPrice: 60 }, { id: "150g", label: "150 g", unitPrice: 86 }, { id: "200g", label: "200 g", unitPrice: 112 }] }
                    ]
                },
                {
                    id: "complete-care",
                    name: "Complete Care",
                    brands: [
                        { id: "colgate", name: "Colgate", imageSrc: "images/Toothpaste.jpg", imageAlt: "Colgate Toothpaste", weights: [{ id: "50g", label: "50 g", unitPrice: 48 }, { id: "100g", label: "100 g", unitPrice: 92 }, { id: "150g", label: "150 g", unitPrice: 132 }, { id: "200g", label: "200 g", unitPrice: 170 }] },
                        { id: "pepsodent", name: "Pepsodent", imageSrc: "images/Toothpaste.jpg", imageAlt: "Pepsodent Toothpaste", weights: [{ id: "50g", label: "50 g", unitPrice: 44 }, { id: "100g", label: "100 g", unitPrice: 84 }, { id: "150g", label: "150 g", unitPrice: 120 }] },
                        { id: "oral-b", name: "Oral-B", imageSrc: "images/Toothpaste.jpg", imageAlt: "Oral-B Toothpaste", weights: [{ id: "50g", label: "50 g", unitPrice: 55 }, { id: "100g", label: "100 g", unitPrice: 104 }, { id: "200g", label: "200 g", unitPrice: 192 }] }
                    ]
                },
                {
                    id: "kids-toothpaste",
                    name: "Kids Toothpaste",
                    brands: [
                        { id: "colgate", name: "Colgate", imageSrc: "images/Toothpaste.jpg", imageAlt: "Colgate Toothpaste", weights: [{ id: "50g", label: "50 g", unitPrice: 45 }, { id: "100g", label: "100 g", unitPrice: 84 }, { id: "150g", label: "150 g", unitPrice: 120 }] },
                        { id: "himalaya", name: "Himalaya", imageSrc: "images/Toothpaste.jpg", imageAlt: "Himalaya Toothpaste", weights: [{ id: "50g", label: "50 g", unitPrice: 42 }, { id: "100g", label: "100 g", unitPrice: 78 }, { id: "200g", label: "200 g", unitPrice: 146 }] },
                        { id: "chicco", name: "Chicco", imageSrc: "images/Toothpaste.jpg", imageAlt: "Chicco Toothpaste", weights: [{ id: "50g", label: "50 g", unitPrice: 125 }, { id: "100g", label: "100 g", unitPrice: 235 }] }
                    ]
                },
                {
                    id: "fresh-breath",
                    name: "Fresh Breath",
                    brands: [
                        { id: "closeup", name: "Closeup", imageSrc: "images/Toothpaste.jpg", imageAlt: "Closeup Toothpaste", weights: [{ id: "50g", label: "50 g", unitPrice: 34 }, { id: "100g", label: "100 g", unitPrice: 64 }, { id: "150g", label: "150 g", unitPrice: 92 }, { id: "200g", label: "200 g", unitPrice: 118 }] },
                        { id: "colgate", name: "Colgate", imageSrc: "images/Toothpaste.jpg", imageAlt: "Colgate Toothpaste", weights: [{ id: "50g", label: "50 g", unitPrice: 38 }, { id: "100g", label: "100 g", unitPrice: 72 }, { id: "150g", label: "150 g", unitPrice: 104 }] },
                        { id: "pepsodent", name: "Pepsodent", imageSrc: "images/Toothpaste.jpg", imageAlt: "Pepsodent Toothpaste", weights: [{ id: "50g", label: "50 g", unitPrice: 33 }, { id: "100g", label: "100 g", unitPrice: 63 }, { id: "200g", label: "200 g", unitPrice: 116 }] }
                    ]
                }
            ]
        },
        haldi: {
            productName: "Haldi",
            label: "Haldi",
            imageSrc: "images/Haldi.webp",
            imageAlt: "Haldi",
            labels: {
                varietyTitle: "Select Haldi Type",
                brandTitle: "Select Brand",
                weightTitle: "Select Package Size",
                varietyDetail: "Haldi Type",
                brandDetail: "Brand",
                weightDetail: "Package Size"
            },
            varieties: [
                {
                    id: "turmeric-powder",
                    name: "Turmeric Powder",
                    brands: [
                        { id: "everest", name: "Everest", imageSrc: "images/Haldi.webp", imageAlt: "Everest Haldi", weights: [{ id: "50g", label: "50 g", unitPrice: 28 }, { id: "100g", label: "100 g", unitPrice: 48 }, { id: "200g", label: "200 g", unitPrice: 88 }, { id: "500g", label: "500 g", unitPrice: 205 }, { id: "1kg", label: "1 kg", unitPrice: 390 }] },
                        { id: "mdh", name: "MDH", imageSrc: "images/Haldi.webp", imageAlt: "MDH Haldi", weights: [{ id: "50g", label: "50 g", unitPrice: 27 }, { id: "100g", label: "100 g", unitPrice: 46 }, { id: "200g", label: "200 g", unitPrice: 86 }, { id: "500g", label: "500 g", unitPrice: 200 }] },
                        { id: "tata-sampann", name: "Tata Sampann", imageSrc: "images/Haldi.webp", imageAlt: "Tata Sampann Haldi", weights: [{ id: "100g", label: "100 g", unitPrice: 55 }, { id: "200g", label: "200 g", unitPrice: 105 }, { id: "500g", label: "500 g", unitPrice: 245 }, { id: "1kg", label: "1 kg", unitPrice: 470 }] },
                        { id: "catch", name: "Catch", imageSrc: "images/Haldi.webp", imageAlt: "Catch Haldi", weights: [{ id: "50g", label: "50 g", unitPrice: 30 }, { id: "100g", label: "100 g", unitPrice: 52 }, { id: "200g", label: "200 g", unitPrice: 95 }, { id: "500g", label: "500 g", unitPrice: 220 }, { id: "1kg", label: "1 kg", unitPrice: 420 }] },
                        { id: "aashirvaad", name: "Aashirvaad", imageSrc: "images/Haldi.webp", imageAlt: "Aashirvaad Haldi", weights: [{ id: "100g", label: "100 g", unitPrice: 50 }, { id: "200g", label: "200 g", unitPrice: 96 }, { id: "500g", label: "500 g", unitPrice: 225 }, { id: "1kg", label: "1 kg", unitPrice: 430 }] }
                    ]
                },
                {
                    id: "organic-turmeric-powder",
                    name: "Organic Turmeric Powder",
                    brands: [
                        { id: "organic-india", name: "Organic India", imageSrc: "images/Haldi.webp", imageAlt: "Organic India Haldi", weights: [{ id: "100g", label: "100 g", unitPrice: 75 }, { id: "200g", label: "200 g", unitPrice: 140 }, { id: "500g", label: "500 g", unitPrice: 325 }, { id: "1kg", label: "1 kg", unitPrice: 620 }] },
                        { id: "24-mantra", name: "24 Mantra", imageSrc: "images/Haldi.webp", imageAlt: "24 Mantra Haldi", weights: [{ id: "100g", label: "100 g", unitPrice: 70 }, { id: "200g", label: "200 g", unitPrice: 132 }, { id: "500g", label: "500 g", unitPrice: 310 }] },
                        { id: "natureland", name: "Natureland", imageSrc: "images/Haldi.webp", imageAlt: "Natureland Haldi", weights: [{ id: "100g", label: "100 g", unitPrice: 68 }, { id: "200g", label: "200 g", unitPrice: 128 }, { id: "500g", label: "500 g", unitPrice: 300 }, { id: "1kg", label: "1 kg", unitPrice: 575 }] },
                        { id: "tata-sampann", name: "Tata Sampann", imageSrc: "images/Haldi.webp", imageAlt: "Tata Sampann Organic Haldi", weights: [{ id: "100g", label: "100 g", unitPrice: 65 }, { id: "200g", label: "200 g", unitPrice: 122 }, { id: "500g", label: "500 g", unitPrice: 285 }] }
                    ]
                },
                {
                    id: "lakadong-turmeric-powder",
                    name: "Lakadong Turmeric Powder",
                    brands: [
                        { id: "organic-india", name: "Organic India", imageSrc: "images/Haldi.webp", imageAlt: "Organic India Lakadong Haldi", weights: [{ id: "100g", label: "100 g", unitPrice: 135 }, { id: "200g", label: "200 g", unitPrice: 255 }, { id: "500g", label: "500 g", unitPrice: 610 }] },
                        { id: "natureland", name: "Natureland", imageSrc: "images/Haldi.webp", imageAlt: "Natureland Lakadong Haldi", weights: [{ id: "100g", label: "100 g", unitPrice: 125 }, { id: "200g", label: "200 g", unitPrice: 238 }, { id: "500g", label: "500 g", unitPrice: 570 }, { id: "1kg", label: "1 kg", unitPrice: 1100 }] },
                        { id: "urban-platter", name: "Urban Platter", imageSrc: "images/Haldi.webp", imageAlt: "Urban Platter Lakadong Haldi", weights: [{ id: "100g", label: "100 g", unitPrice: 145 }, { id: "200g", label: "200 g", unitPrice: 275 }, { id: "500g", label: "500 g", unitPrice: 655 }] }
                    ]
                },
                {
                    id: "high-curcumin-turmeric-powder",
                    name: "Turmeric Powder with High Curcumin",
                    brands: [
                        { id: "tata-sampann", name: "Tata Sampann", imageSrc: "images/Haldi.webp", imageAlt: "Tata Sampann High Curcumin Haldi", weights: [{ id: "100g", label: "100 g", unitPrice: 90 }, { id: "200g", label: "200 g", unitPrice: 170 }, { id: "500g", label: "500 g", unitPrice: 405 }] },
                        { id: "organic-india", name: "Organic India", imageSrc: "images/Haldi.webp", imageAlt: "Organic India High Curcumin Haldi", weights: [{ id: "100g", label: "100 g", unitPrice: 105 }, { id: "200g", label: "200 g", unitPrice: 198 }, { id: "500g", label: "500 g", unitPrice: 475 }] },
                        { id: "urban-platter", name: "Urban Platter", imageSrc: "images/Haldi.webp", imageAlt: "Urban Platter High Curcumin Haldi", weights: [{ id: "100g", label: "100 g", unitPrice: 110 }, { id: "200g", label: "200 g", unitPrice: 210 }, { id: "500g", label: "500 g", unitPrice: 500 }, { id: "1kg", label: "1 kg", unitPrice: 960 }] }
                    ]
                },
                {
                    id: "raw-turmeric",
                    name: "Raw Turmeric",
                    brands: [
                        { id: "local-fresh", name: "Local / Fresh", imageSrc: "images/Haldi.webp", imageAlt: "Fresh Raw Haldi", weights: [{ id: "100g", label: "100 g", unitPrice: 16 }, { id: "250g", label: "250 g", unitPrice: 35 }, { id: "500g", label: "500 g", unitPrice: 65 }, { id: "1kg", label: "1 kg", unitPrice: 120 }] },
                        { id: "organic-india", name: "Organic India", imageSrc: "images/Haldi.webp", imageAlt: "Organic India Raw Haldi", weights: [{ id: "250g", label: "250 g", unitPrice: 55 }, { id: "500g", label: "500 g", unitPrice: 105 }, { id: "1kg", label: "1 kg", unitPrice: 200 }] },
                        { id: "natureland", name: "Natureland", imageSrc: "images/Haldi.webp", imageAlt: "Natureland Raw Haldi", weights: [{ id: "100g", label: "100 g", unitPrice: 22 }, { id: "250g", label: "250 g", unitPrice: 48 }, { id: "500g", label: "500 g", unitPrice: 92 }] }
                    ]
                },
                {
                    id: "whole-dried-turmeric",
                    name: "Turmeric Whole / Dried Turmeric",
                    brands: [
                        { id: "everest", name: "Everest", imageSrc: "images/Haldi.webp", imageAlt: "Everest Whole Haldi", weights: [{ id: "100g", label: "100 g", unitPrice: 42 }, { id: "250g", label: "250 g", unitPrice: 95 }, { id: "500g", label: "500 g", unitPrice: 180 }, { id: "1kg", label: "1 kg", unitPrice: 345 }] },
                        { id: "catch", name: "Catch", imageSrc: "images/Haldi.webp", imageAlt: "Catch Whole Haldi", weights: [{ id: "100g", label: "100 g", unitPrice: 46 }, { id: "250g", label: "250 g", unitPrice: 105 }, { id: "500g", label: "500 g", unitPrice: 198 }] },
                        { id: "urban-platter", name: "Urban Platter", imageSrc: "images/Haldi.webp", imageAlt: "Urban Platter Whole Haldi", weights: [{ id: "100g", label: "100 g", unitPrice: 58 }, { id: "250g", label: "250 g", unitPrice: 132 }, { id: "500g", label: "500 g", unitPrice: 250 }, { id: "1kg", label: "1 kg", unitPrice: 480 }] }
                    ]
                }
            ]
        },
        mirchi: {
            productName: "Mirchi Powder",
            label: "Mirchi Powder",
            imageSrc: "images/Mirchi powder.jpg",
            imageAlt: "Mirchi Powder",
            labels: {
                varietyTitle: "Select Mirchi Type",
                brandTitle: "Select Brand",
                weightTitle: "Select Package Size",
                varietyDetail: "Mirchi Type",
                brandDetail: "Brand",
                weightDetail: "Package Size"
            },
            varieties: [
                {
                    id: "regular-red-chilli",
                    name: "Regular Red Chilli Powder",
                    brands: [
                        { id: "everest", name: "Everest", imageSrc: "images/Mirchi powder.jpg", imageAlt: "Everest Mirchi Powder", weights: [{ id: "50g", label: "50 g", unitPrice: 25 }, { id: "100g", label: "100 g", unitPrice: 45 }, { id: "200g", label: "200 g", unitPrice: 85 }, { id: "500g", label: "500 g", unitPrice: 200 }, { id: "1kg", label: "1 kg", unitPrice: 380 }] },
                        { id: "mdh", name: "MDH", imageSrc: "images/Mirchi powder.jpg", imageAlt: "MDH Mirchi Powder", weights: [{ id: "50g", label: "50 g", unitPrice: 28 }, { id: "100g", label: "100 g", unitPrice: 50 }, { id: "200g", label: "200 g", unitPrice: 95 }, { id: "500g", label: "500 g", unitPrice: 225 }, { id: "1kg", label: "1 kg", unitPrice: 430 }] },
                        { id: "catch", name: "Catch", imageSrc: "images/Mirchi powder.jpg", imageAlt: "Catch Mirchi Powder", weights: [{ id: "50g", label: "50 g", unitPrice: 27 }, { id: "100g", label: "100 g", unitPrice: 48 }, { id: "200g", label: "200 g", unitPrice: 92 }, { id: "500g", label: "500 g", unitPrice: 215 }, { id: "1kg", label: "1 kg", unitPrice: 410 }] },
                        { id: "tata-sampann", name: "Tata Sampann", imageSrc: "images/Mirchi powder.jpg", imageAlt: "Tata Sampann Mirchi Powder", weights: [{ id: "50g", label: "50 g", unitPrice: 29 }, { id: "100g", label: "100 g", unitPrice: 52 }, { id: "200g", label: "200 g", unitPrice: 98 }, { id: "500g", label: "500 g", unitPrice: 230 }, { id: "1kg", label: "1 kg", unitPrice: 440 }] },
                        { id: "aashirvaad", name: "Aashirvaad", imageSrc: "images/Mirchi powder.jpg", imageAlt: "Aashirvaad Mirchi Powder", weights: [{ id: "50g", label: "50 g", unitPrice: 31 }, { id: "100g", label: "100 g", unitPrice: 54 }, { id: "200g", label: "200 g", unitPrice: 101 }, { id: "500g", label: "500 g", unitPrice: 240 }, { id: "1kg", label: "1 kg", unitPrice: 460 }] }
                    ]
                },
                {
                    id: "kashmiri-chilli",
                    name: "Kashmiri Chilli Powder",
                    brands: [
                        { id: "everest", name: "Everest", imageSrc: "images/Mirchi powder.jpg", imageAlt: "Everest Kashmiri Mirchi Powder", weights: [{ id: "50g", label: "50 g", unitPrice: 30 }, { id: "100g", label: "100 g", unitPrice: 55 }, { id: "200g", label: "200 g", unitPrice: 105 }, { id: "500g", label: "500 g", unitPrice: 250 }, { id: "1kg", label: "1 kg", unitPrice: 480 }] },
                        { id: "catch", name: "Catch", imageSrc: "images/Mirchi powder.jpg", imageAlt: "Catch Kashmiri Mirchi Powder", weights: [{ id: "50g", label: "50 g", unitPrice: 32 }, { id: "100g", label: "100 g", unitPrice: 60 }, { id: "200g", label: "200 g", unitPrice: 112 }, { id: "500g", label: "500 g", unitPrice: 265 }, { id: "1kg", label: "1 kg", unitPrice: 500 }] },
                        { id: "tata-sampann", name: "Tata Sampann", imageSrc: "images/Mirchi powder.jpg", imageAlt: "Tata Sampann Kashmiri Mirchi Powder", weights: [{ id: "50g", label: "50 g", unitPrice: 34 }, { id: "100g", label: "100 g", unitPrice: 62 }, { id: "200g", label: "200 g", unitPrice: 118 }, { id: "500g", label: "500 g", unitPrice: 275 }, { id: "1kg", label: "1 kg", unitPrice: 520 }] },
                        { id: "organic-india", name: "Organic India", imageSrc: "images/Mirchi powder.jpg", imageAlt: "Organic India Kashmiri Mirchi Powder", weights: [{ id: "100g", label: "100 g", unitPrice: 72 }, { id: "200g", label: "200 g", unitPrice: 138 }, { id: "500g", label: "500 g", unitPrice: 320 }, { id: "1kg", label: "1 kg", unitPrice: 610 }] }
                    ]
                },
                {
                    id: "extra-hot-chilli",
                    name: "Extra Hot Chilli Powder",
                    brands: [
                        { id: "everest", name: "Everest", imageSrc: "images/Mirchi powder.jpg", imageAlt: "Everest Extra Hot Mirchi Powder", weights: [{ id: "50g", label: "50 g", unitPrice: 35 }, { id: "100g", label: "100 g", unitPrice: 68 }, { id: "200g", label: "200 g", unitPrice: 128 }, { id: "500g", label: "500 g", unitPrice: 290 }, { id: "1kg", label: "1 kg", unitPrice: 560 }] },
                        { id: "mdh", name: "MDH", imageSrc: "images/Mirchi powder.jpg", imageAlt: "MDH Extra Hot Mirchi Powder", weights: [{ id: "50g", label: "50 g", unitPrice: 28 }, { id: "100g", label: "100 g", unitPrice: 52 }, { id: "200g", label: "200 g", unitPrice: 98 }, { id: "500g", label: "500 g", unitPrice: 235 }, { id: "1kg", label: "1 kg", unitPrice: 450 }] },
                        { id: "catch", name: "Catch", imageSrc: "images/Mirchi powder.jpg", imageAlt: "Catch Extra Hot Mirchi Powder", weights: [{ id: "50g", label: "50 g", unitPrice: 33 }, { id: "100g", label: "100 g", unitPrice: 62 }, { id: "200g", label: "200 g", unitPrice: 118 }, { id: "500g", label: "500 g", unitPrice: 280 }, { id: "1kg", label: "1 kg", unitPrice: 535 }] },
                        { id: "tata-sampann", name: "Tata Sampann", imageSrc: "images/Mirchi powder.jpg", imageAlt: "Tata Sampann Extra Hot Mirchi Powder", weights: [{ id: "50g", label: "50 g", unitPrice: 36 }, { id: "100g", label: "100 g", unitPrice: 66 }, { id: "200g", label: "200 g", unitPrice: 124 }, { id: "500g", label: "500 g", unitPrice: 295 }, { id: "1kg", label: "1 kg", unitPrice: 570 }] }
                    ]
                },
                {
                    id: "byadgi-chilli",
                    name: "Byadgi Chilli Powder",
                    brands: [
                        { id: "everest", name: "Everest", imageSrc: "images/Mirchi powder.jpg", imageAlt: "Everest Byadgi Mirchi Powder", weights: [{ id: "50g", label: "50 g", unitPrice: 32 }, { id: "100g", label: "100 g", unitPrice: 60 }, { id: "200g", label: "200 g", unitPrice: 112 }, { id: "500g", label: "500 g", unitPrice: 270 }, { id: "1kg", label: "1 kg", unitPrice: 520 }] },
                        { id: "catch", name: "Catch", imageSrc: "images/Mirchi powder.jpg", imageAlt: "Catch Byadgi Mirchi Powder", weights: [{ id: "50g", label: "50 g", unitPrice: 34 }, { id: "100g", label: "100 g", unitPrice: 64 }, { id: "200g", label: "200 g", unitPrice: 120 }, { id: "500g", label: "500 g", unitPrice: 285 }, { id: "1kg", label: "1 kg", unitPrice: 545 }] },
                        { id: "organic-tattva", name: "Organic Tattva", imageSrc: "images/Mirchi powder.jpg", imageAlt: "Organic Tattva Byadgi Mirchi Powder", weights: [{ id: "100g", label: "100 g", unitPrice: 78 }, { id: "200g", label: "200 g", unitPrice: 148 }, { id: "500g", label: "500 g", unitPrice: 340 }, { id: "1kg", label: "1 kg", unitPrice: 650 }] },
                        { id: "urban-platter", name: "Urban Platter", imageSrc: "images/Mirchi powder.jpg", imageAlt: "Urban Platter Byadgi Mirchi Powder", weights: [{ id: "100g", label: "100 g", unitPrice: 85 }, { id: "200g", label: "200 g", unitPrice: 160 }, { id: "500g", label: "500 g", unitPrice: 360 }, { id: "1kg", label: "1 kg", unitPrice: 690 }] }
                    ]
                },
                {
                    id: "organic-chilli",
                    name: "Organic Chilli Powder",
                    brands: [
                        { id: "organic-india", name: "Organic India", imageSrc: "images/Mirchi powder.jpg", imageAlt: "Organic India Mirchi Powder", weights: [{ id: "100g", label: "100 g", unitPrice: 75 }, { id: "200g", label: "200 g", unitPrice: 140 }, { id: "500g", label: "500 g", unitPrice: 325 }, { id: "1kg", label: "1 kg", unitPrice: 620 }] },
                        { id: "24-mantra", name: "24 Mantra", imageSrc: "images/Mirchi powder.jpg", imageAlt: "24 Mantra Mirchi Powder", weights: [{ id: "100g", label: "100 g", unitPrice: 72 }, { id: "200g", label: "200 g", unitPrice: 135 }, { id: "500g", label: "500 g", unitPrice: 315 }, { id: "1kg", label: "1 kg", unitPrice: 600 }] },
                        { id: "natureland", name: "Natureland", imageSrc: "images/Mirchi powder.jpg", imageAlt: "Natureland Mirchi Powder", weights: [{ id: "100g", label: "100 g", unitPrice: 70 }, { id: "200g", label: "200 g", unitPrice: 132 }, { id: "500g", label: "500 g", unitPrice: 310 }, { id: "1kg", label: "1 kg", unitPrice: 590 }] },
                        { id: "organic-tattva", name: "Organic Tattva", imageSrc: "images/Mirchi powder.jpg", imageAlt: "Organic Tattva Mirchi Powder", weights: [{ id: "100g", label: "100 g", unitPrice: 74 }, { id: "200g", label: "200 g", unitPrice: 138 }, { id: "500g", label: "500 g", unitPrice: 320 }, { id: "1kg", label: "1 kg", unitPrice: 610 }] }
                    ]
                },
                {
                    id: "high-colour-chilli",
                    name: "Chilli Powder with High Colour",
                    brands: [
                        { id: "everest", name: "Everest", imageSrc: "images/Mirchi powder.jpg", imageAlt: "Everest High Colour Mirchi Powder", weights: [{ id: "50g", label: "50 g", unitPrice: 33 }, { id: "100g", label: "100 g", unitPrice: 62 }, { id: "200g", label: "200 g", unitPrice: 118 }, { id: "500g", label: "500 g", unitPrice: 280 }, { id: "1kg", label: "1 kg", unitPrice: 540 }] },
                        { id: "catch", name: "Catch", imageSrc: "images/Mirchi powder.jpg", imageAlt: "Catch High Colour Mirchi Powder", weights: [{ id: "50g", label: "50 g", unitPrice: 35 }, { id: "100g", label: "100 g", unitPrice: 66 }, { id: "200g", label: "200 g", unitPrice: 124 }, { id: "500g", label: "500 g", unitPrice: 295 }, { id: "1kg", label: "1 kg", unitPrice: 565 }] },
                        { id: "urban-platter", name: "Urban Platter", imageSrc: "images/Mirchi powder.jpg", imageAlt: "Urban Platter High Colour Mirchi Powder", weights: [{ id: "100g", label: "100 g", unitPrice: 88 }, { id: "200g", label: "200 g", unitPrice: 168 }, { id: "500g", label: "500 g", unitPrice: 390 }, { id: "1kg", label: "1 kg", unitPrice: 740 }] }
                    ]
                }
            ]
        },
        jira: {
            productName: "Jira",
            imageSrc: "images/Jira.jpg",
            imageAlt: "Jira",
            labels: {
                varietyTitle: "Select Jira Type",
                brandTitle: "Select Brand",
                weightTitle: "Select Package Size",
                varietyDetail: "Jira Type",
                brandDetail: "Brand",
                weightDetail: "Package Size"
            },
            varieties: [
                {
                    id: "jira-whole",
                    name: "Jira Whole",
                    brands: [
                        { id: "catch", name: "Catch", imageSrc: "images/Jira.jpg", imageAlt: "Catch Jira Whole", weights: [{ id: "50g", label: "50 g", unitPrice: 28 }, { id: "100g", label: "100 g", unitPrice: 52 }, { id: "200g", label: "200 g", unitPrice: 98 }, { id: "500g", label: "500 g", unitPrice: 230 }, { id: "1kg", label: "1 kg", unitPrice: 440 }] },
                        { id: "tata-sampann", name: "Tata Sampann", imageSrc: "images/Jira.jpg", imageAlt: "Tata Sampann Jira Whole", weights: [{ id: "50g", label: "50 g", unitPrice: 30 }, { id: "100g", label: "100 g", unitPrice: 56 }, { id: "200g", label: "200 g", unitPrice: 105 }, { id: "500g", label: "500 g", unitPrice: 245 }, { id: "1kg", label: "1 kg", unitPrice: 470 }] },
                        { id: "everest", name: "Everest", imageSrc: "images/Jira.jpg", imageAlt: "Everest Jira Whole", weights: [{ id: "50g", label: "50 g", unitPrice: 27 }, { id: "100g", label: "100 g", unitPrice: 50 }, { id: "200g", label: "200 g", unitPrice: 94 }, { id: "500g", label: "500 g", unitPrice: 220 }] },
                        { id: "mdh", name: "MDH", imageSrc: "images/Jira.jpg", imageAlt: "MDH Jira Whole", weights: [{ id: "50g", label: "50 g", unitPrice: 26 }, { id: "100g", label: "100 g", unitPrice: 49 }, { id: "200g", label: "200 g", unitPrice: 92 }, { id: "500g", label: "500 g", unitPrice: 215 }] },
                        { id: "aashirvaad", name: "Aashirvaad", imageSrc: "images/Jira.jpg", imageAlt: "Aashirvaad Jira Whole", weights: [{ id: "100g", label: "100 g", unitPrice: 54 }, { id: "200g", label: "200 g", unitPrice: 102 }, { id: "500g", label: "500 g", unitPrice: 238 }, { id: "1kg", label: "1 kg", unitPrice: 455 }] }
                    ]
                },
                {
                    id: "jira-powder",
                    name: "Jira Powder",
                    brands: [
                        { id: "everest", name: "Everest", imageSrc: "images/Jira.jpg", imageAlt: "Everest Jira Powder", weights: [{ id: "50g", label: "50 g", unitPrice: 25 }, { id: "100g", label: "100 g", unitPrice: 48 }, { id: "200g", label: "200 g", unitPrice: 90 }, { id: "500g", label: "500 g", unitPrice: 210 }, { id: "1kg", label: "1 kg", unitPrice: 400 }] },
                        { id: "catch", name: "Catch", imageSrc: "images/Jira.jpg", imageAlt: "Catch Jira Powder", weights: [{ id: "50g", label: "50 g", unitPrice: 27 }, { id: "100g", label: "100 g", unitPrice: 51 }, { id: "200g", label: "200 g", unitPrice: 96 }, { id: "500g", label: "500 g", unitPrice: 225 }] },
                        { id: "mdh", name: "MDH", imageSrc: "images/Jira.jpg", imageAlt: "MDH Jira Powder", weights: [{ id: "50g", label: "50 g", unitPrice: 24 }, { id: "100g", label: "100 g", unitPrice: 46 }, { id: "200g", label: "200 g", unitPrice: 87 }, { id: "500g", label: "500 g", unitPrice: 205 }] },
                        { id: "tata-sampann", name: "Tata Sampann", imageSrc: "images/Jira.jpg", imageAlt: "Tata Sampann Jira Powder", weights: [{ id: "100g", label: "100 g", unitPrice: 53 }, { id: "200g", label: "200 g", unitPrice: 100 }, { id: "500g", label: "500 g", unitPrice: 235 }, { id: "1kg", label: "1 kg", unitPrice: 450 }] }
                    ]
                },
                {
                    id: "roasted-jira",
                    name: "Roasted Jira",
                    brands: [
                        { id: "catch", name: "Catch", imageSrc: "images/Jira.jpg", imageAlt: "Catch Roasted Jira", weights: [{ id: "50g", label: "50 g", unitPrice: 35 }, { id: "100g", label: "100 g", unitPrice: 66 }, { id: "200g", label: "200 g", unitPrice: 125 }] },
                        { id: "tata-sampann", name: "Tata Sampann", imageSrc: "images/Jira.jpg", imageAlt: "Tata Sampann Roasted Jira", weights: [{ id: "100g", label: "100 g", unitPrice: 70 }, { id: "200g", label: "200 g", unitPrice: 132 }, { id: "500g", label: "500 g", unitPrice: 310 }] },
                        { id: "urban-platter", name: "Urban Platter", imageSrc: "images/Jira.jpg", imageAlt: "Urban Platter Roasted Jira", weights: [{ id: "50g", label: "50 g", unitPrice: 48 }, { id: "100g", label: "100 g", unitPrice: 90 }, { id: "200g", label: "200 g", unitPrice: 170 }, { id: "500g", label: "500 g", unitPrice: 395 }] }
                    ]
                },
                {
                    id: "organic-jira",
                    name: "Organic Jira",
                    brands: [
                        { id: "organic-india", name: "Organic India", imageSrc: "images/Jira.jpg", imageAlt: "Organic India Jira", weights: [{ id: "100g", label: "100 g", unitPrice: 75 }, { id: "200g", label: "200 g", unitPrice: 140 }, { id: "500g", label: "500 g", unitPrice: 325 }, { id: "1kg", label: "1 kg", unitPrice: 620 }] },
                        { id: "24-mantra", name: "24 Mantra", imageSrc: "images/Jira.jpg", imageAlt: "24 Mantra Jira", weights: [{ id: "100g", label: "100 g", unitPrice: 72 }, { id: "200g", label: "200 g", unitPrice: 135 }, { id: "500g", label: "500 g", unitPrice: 315 }] },
                        { id: "natureland", name: "Natureland", imageSrc: "images/Jira.jpg", imageAlt: "Natureland Jira", weights: [{ id: "100g", label: "100 g", unitPrice: 70 }, { id: "200g", label: "200 g", unitPrice: 130 }, { id: "500g", label: "500 g", unitPrice: 305 }, { id: "1kg", label: "1 kg", unitPrice: 585 }] },
                        { id: "organic-tattva", name: "Organic Tattva", imageSrc: "images/Jira.jpg", imageAlt: "Organic Tattva Jira", weights: [{ id: "100g", label: "100 g", unitPrice: 74 }, { id: "200g", label: "200 g", unitPrice: 138 }, { id: "500g", label: "500 g", unitPrice: 320 }] }
                    ]
                },
                {
                    id: "black-jira",
                    name: "Black Jira",
                    brands: [
                        { id: "catch", name: "Catch", imageSrc: "images/Jira.jpg", imageAlt: "Catch Black Jira", weights: [{ id: "50g", label: "50 g", unitPrice: 42 }, { id: "100g", label: "100 g", unitPrice: 80 }, { id: "200g", label: "200 g", unitPrice: 152 }] },
                        { id: "urban-platter", name: "Urban Platter", imageSrc: "images/Jira.jpg", imageAlt: "Urban Platter Black Jira", weights: [{ id: "50g", label: "50 g", unitPrice: 58 }, { id: "100g", label: "100 g", unitPrice: 108 }, { id: "200g", label: "200 g", unitPrice: 205 }, { id: "500g", label: "500 g", unitPrice: 480 }] },
                        { id: "natureland", name: "Natureland", imageSrc: "images/Jira.jpg", imageAlt: "Natureland Black Jira", weights: [{ id: "50g", label: "50 g", unitPrice: 52 }, { id: "100g", label: "100 g", unitPrice: 98 }, { id: "200g", label: "200 g", unitPrice: 185 }, { id: "500g", label: "500 g", unitPrice: 435 }] }
                    ]
                }
            ]
        },
        "cooking-oil": {
            productName: "Cooking Oil",
            imageSrc: "images/download (4).jpg",
            imageAlt: "Cooking Oil",
            modalProductName: "Cooking Oil",
            labels: {
                varietyTitle: "Oil Type",
                brandTitle: "Brand",
                weightTitle: "Package Size",
                varietyDetail: "Oil Type",
                brandDetail: "Brand",
                weightDetail: "Package Size"
            },
            varieties: [
                createCookingOilType("sunflower", "Sunflower Oil", ["fortune", "saffola", "dhara", "gemini"], [
                    { id: "500ml", label: "500 ml", unitPrice: 85 },
                    { id: "1l", label: "1 L", unitPrice: 165 },
                    { id: "2l", label: "2 L", unitPrice: 320 },
                    { id: "5l", label: "5 L", unitPrice: 785 }
                ]),
                createCookingOilType("mustard", "Mustard Oil", ["fortune", "patanjali", "dhara", "engine"], [
                    { id: "500ml", label: "500 ml", unitPrice: 90 },
                    { id: "1l", label: "1 L", unitPrice: 175 },
                    { id: "2l", label: "2 L", unitPrice: 340 },
                    { id: "5l", label: "5 L", unitPrice: 835 }
                ]),
                createCookingOilType("groundnut", "Groundnut Oil", ["fortune", "gulab", "saffola"], [
                    { id: "500ml", label: "500 ml", unitPrice: 145 },
                    { id: "1l", label: "1 L", unitPrice: 280 },
                    { id: "2l", label: "2 L", unitPrice: 550 },
                    { id: "5l", label: "5 L", unitPrice: 1350 }
                ]),
                createCookingOilType("soybean", "Soybean Oil", ["nutrela", "fortune", "dhara"], [
                    { id: "500ml", label: "500 ml", unitPrice: 75 },
                    { id: "1l", label: "1 L", unitPrice: 145 },
                    { id: "2l", label: "2 L", unitPrice: 280 },
                    { id: "5l", label: "5 L", unitPrice: 685 }
                ]),
                createCookingOilType("rice-bran", "Rice Bran Oil", ["ricela", "fortune", "saffola"], [
                    { id: "500ml", label: "500 ml", unitPrice: 90 },
                    { id: "1l", label: "1 L", unitPrice: 175 },
                    { id: "2l", label: "2 L", unitPrice: 340 },
                    { id: "5l", label: "5 L", unitPrice: 835 }
                ]),
                createCookingOilType("coconut", "Coconut Oil", ["parachute", "max-care", "klf"], [
                    { id: "500ml", label: "500 ml", unitPrice: 170 },
                    { id: "1l", label: "1 L", unitPrice: 330 },
                    { id: "2l", label: "2 L", unitPrice: 640 },
                    { id: "5l", label: "5 L", unitPrice: 1550 }
                ]),
                createCookingOilType("olive", "Olive Oil", ["borges", "figaro", "del-monte"], [
                    { id: "500ml", label: "500 ml", unitPrice: 350 },
                    { id: "1l", label: "1 L", unitPrice: 680 },
                    { id: "2l", label: "2 L", unitPrice: 1320 },
                    { id: "5l", label: "5 L", unitPrice: 3200 }
                ])
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
        if (selection.catalog.modalProductName) return selection.catalog.modalProductName;
        if (!selection.variety) return selection.catalog.productName;
        return selection.variety.name;
    }

    function getCatalogProductImage(selection) {
        const imageSource = selection.weight || selection.brand || selection.variety || selection.catalog;
        return {
            src: imageSource.imageSrc || selection.catalog.imageSrc,
            alt: imageSource.imageAlt || selection.catalog.imageAlt
        };
    }

    function syncCatalogModalDisplay() {
        if (!currentCatalogSelection) return;

        const selection = currentCatalogSelection;
        const unitPrice = selection.weight ? selection.weight.unitPrice : 0;
        const labels = getCatalogLabels(selection.catalog);
        const image = getCatalogProductImage(selection);

        if (modalProductImage) {
            modalProductImage.src = image.src;
            modalProductImage.alt = image.alt;
        }

        if (modalProductName) {
            modalProductName.innerText = formatCatalogProductName(selection);
        }

        if (modalProductPrice) {
            modalProductPrice.innerText = unitPrice > 0 ? `₹${unitPrice.toFixed(2)}` : "";
        }

        if (modalSelectedVariety) {
            modalSelectedVariety.innerText = selection.variety ? `${labels.varietyDetail}: ${selection.variety.name}` : "";
        }

        if (modalSelectedBrand) {
            modalSelectedBrand.innerText = selection.brand ? `${labels.brandDetail}: ${selection.brand.name}` : "";
        }

        if (modalSelectedWeight) {
            modalSelectedWeight.innerText = selection.weight ? `${labels.weightDetail}: ${selection.weight.label}` : "";
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
        const labels = getCatalogLabels(catalog);

        const stepTitles = catalogVariantSteps.querySelectorAll(".variant-step h4");
        if (stepTitles[0]) stepTitles[0].innerText = labels.varietyTitle;
        if (stepTitles[1]) stepTitles[1].innerText = labels.brandTitle;
        if (stepTitles[2]) stepTitles[2].innerText = labels.weightTitle;

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
            const typeLabel = p.type || p.variety || "";
            const sizeLabel = p.size || p.weight || "";
            const li = document.createElement('li');
            li.className = 'selected-item';
            li.innerHTML = `
                <img src="${p.imageSrc}" alt="${p.imageAlt}">
                <p class="selected-item-text">
                    <span>${p.product || p.name}</span><br>
                    ${typeLabel ? `<span>${typeLabel}</span><br>` : ''}
                    ${p.brand ? `<span>${p.brand}</span><br>` : ''}
                    ${sizeLabel ? `<span>${sizeLabel}</span><br>` : ''}
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
        document.documentElement.classList.add("modal-open");
        document.body.classList.add("modal-open");
        if (modalContent) {
            modalContent.focus({ preventScroll: true });
        }
    }

    function closeModal() {
        if (!modal) {
            return;
        }
        modal.classList.remove("open");
        modal.setAttribute("aria-hidden", "true");
        document.documentElement.classList.remove("modal-open");
        document.body.classList.remove("modal-open");
    }

    function extractUnitPrice(priceText) {
        const priceMatch = (priceText || "").match(/₹\s*([\d.]+)/);
        return priceMatch ? parseFloat(priceMatch[1]) : 0;
    }

    function addProductToSelection(product, quantity) {
        const safeQuantity = Math.max(1, parseInt(quantity, 10) || 1);
        const productType = product.type || product.variety || "";
        const packageSize = product.size || product.weight || "";
        const existing = selectedProducts.find((item) => (
            item.product === product.product &&
            (item.type || item.variety || "") === productType &&
            item.brand === product.brand &&
            (item.size || item.weight || "") === packageSize &&
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
                type: product.type || product.variety || "",
                brand: product.brand,
                weight: product.weight,
                size: product.size || product.weight || "",
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
                const image = getCatalogProductImage(selection);
                addProductToSelection({
                    imageSrc: image.src,
                    imageAlt: image.alt,
                    product: selection.catalog.productName,
                    variety: selection.variety ? selection.variety.name : "",
                    type: selection.variety ? selection.variety.name : "",
                    brand: selection.brand ? selection.brand.name : "",
                    weight: selection.weight ? selection.weight.label : "",
                    size: selection.weight ? selection.weight.label : "",
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
        const header = ['Product', 'Type', 'Brand', 'Size', 'Quantity', 'Unit Price', 'Total'];
        const rows = selectedProducts.map(p => [
            p.product || p.name || '',
            p.type || p.variety || '',
            p.brand || '',
            p.size || p.weight || '',
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
