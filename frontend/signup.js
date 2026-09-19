document.addEventListener("DOMContentLoaded", () => {
    lucide.createIcons();

    const roleCards = document.querySelectorAll('.role-card');
    
    roleCards.forEach(card => {
        card.addEventListener('click', () => {
            roleCards.forEach(c => c.classList.remove('active'));
            card.classList.add('active');
        });
    });

    const phoneInput = document.getElementById("phoneInput");
    const sendOtpBtn = document.getElementById("sendOtpBtn");
    const otpInput = document.getElementById("otpInput");
    
    const firstNameInput = document.getElementById("firstNameInput");
    const lastNameInput = document.getElementById("lastNameInput");
    const passwordInput = document.getElementById("passwordInput");
    const aadharInput = document.getElementById("aadharInput");
    const nextBtn = document.getElementById("nextBtn");
    const togglePasswordBtn = document.getElementById("togglePasswordBtn");
    const signupForm = document.getElementById("signupForm");

    const emailInput = document.getElementById("emailInput");
    const emailError = document.getElementById("emailError");

    phoneInput.addEventListener("input", (e) => {
        e.target.value = e.target.value.replace(/[^0-9]/g, '').slice(0, 10);
        checkStep1Validity();
    });

    sendOtpBtn.addEventListener("click", () => {
        if (phoneInput.value.length === 10) {
            sendOtpBtn.textContent = "Resend OTP";
            otpInput.disabled = false;
            otpInput.focus();
        } else {
            alert("Please enter a valid 10-digit phone number.");
            phoneInput.focus();
        }
    });

    otpInput.addEventListener("input", (e) => {
        e.target.value = e.target.value.replace(/[^0-9]/g, '').slice(0, 6);
        checkStep1Validity();
    });
    
    aadharInput.addEventListener("input", (e) => {
        e.target.value = e.target.value.replace(/[^0-9]/g, '').slice(0, 12);
        checkStep1Validity();
    });

    function isValidEmail(email) {
        if (email.length === 0) return true;
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    }

    emailInput.addEventListener("input", () => {
        if (emailInput.value.trim() !== "" && !isValidEmail(emailInput.value)) {
            emailError.style.display = "block";
            emailInput.style.borderColor = "#dc3545";
        } else {
            emailError.style.display = "none";
            emailInput.style.borderColor = "";
        }
        checkStep1Validity();
    });

    // toggle password
    togglePasswordBtn.addEventListener("click", () => {
        const type = passwordInput.getAttribute("type") === "password" ? "text" : "password";
        passwordInput.setAttribute("type", type);
        togglePasswordBtn.innerHTML = type === "password" ? '<i data-lucide="eye"></i>' : '<i data-lucide="eye-off"></i>';
        lucide.createIcons();
    });

    const passwordError = document.getElementById("passwordError");
    
    function isValidPassword(password) {
        if (password.length === 0) return false;
        const regex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/;
        return regex.test(password);
    }

    passwordInput.addEventListener("input", () => {
        checkStep1Validity();
    });

    const inputs = [firstNameInput, lastNameInput, passwordInput, aadharInput];
    inputs.forEach(input => {
        input.addEventListener("input", checkStep1Validity);
    });

    let isStep1Valid = false;
    let isStep1Submitted = false;

    function checkStep1Validity() {
        const isEmailValid = emailInput.value.trim() === "" || isValidEmail(emailInput.value);
        const isPasswordValid = isValidPassword(passwordInput.value);
        const hasRole = document.querySelector('.role-card.active') !== null;
        
        isStep1Valid = (
            firstNameInput.value.trim() !== "" &&
            lastNameInput.value.trim() !== "" &&
            phoneInput.value.length === 10 &&
            otpInput.value.length === 6 &&
            isEmailValid &&
            isPasswordValid &&
            aadharInput.value.length === 12 &&
            hasRole
        );
        
        if (isStep1Submitted) {
            showStep1Errors();
        }
    }

    // Step transitions
    const step1Content = document.getElementById("step1Content");
    const step2Content = document.getElementById("step2Content");
    const stepCircles = document.querySelectorAll(".step");
    const stepLines = document.querySelectorAll(".step-line");
    const prevBtnStep2 = document.getElementById("prevBtnStep2");
    const signupHeader = document.querySelector(".signup-header");

    signupForm.addEventListener("submit", (e) => {
        e.preventDefault();
        isStep1Submitted = true;
        
        if (!isStep1Valid) {
            try {
                showStep1Errors();
            } catch (err) {
                alert("Error in showStep1Errors: " + err.message);
            }
            return;
        }
        
        // Hide Step 1, Show Step 2
        step1Content.style.display = "none";
        step2Content.style.display = "grid";
        
        // Toggle role-specific fields
        const selectedRole = document.querySelector('.role-card.active').dataset.role;
        const buyerRightFields = document.getElementById("buyerRightFields");
        const sellerRightFields = document.getElementById("sellerRightFields");
        const transporterRightFields = document.getElementById("transporterRightFields");
        const landmarkLabel = document.querySelector("label[for='landmarkInput']") || document.getElementById("landmarkInput").previousElementSibling.querySelector("label");
        
        if (selectedRole === "buyer") {
            if (buyerRightFields) buyerRightFields.style.display = "flex";
            if (sellerRightFields) sellerRightFields.style.display = "none";
            if (transporterRightFields) transporterRightFields.style.display = "none";
            if (landmarkLabel) landmarkLabel.textContent = "Landmark";
        } else if (selectedRole === "farmer" || selectedRole === "seller") {
            if (buyerRightFields) buyerRightFields.style.display = "none";
            if (sellerRightFields) sellerRightFields.style.display = "flex";
            if (transporterRightFields) transporterRightFields.style.display = "none";
            if (landmarkLabel) landmarkLabel.textContent = "Landmark";
        } else if (selectedRole === "transporter") {
            if (buyerRightFields) buyerRightFields.style.display = "none";
            if (sellerRightFields) sellerRightFields.style.display = "none";
            if (transporterRightFields) transporterRightFields.style.display = "flex";
            if (landmarkLabel) landmarkLabel.textContent = "Landmark*";
        }

        // Update Stepper graphic
        stepCircles[1].classList.add("active");
        stepLines[0].classList.add("active");
        
        // Re-init lucide icons for newly visible elements
        lucide.createIcons();
        
        // Initialize Step 2 logic to gray out conditionally disabled fields
        checkStep2Validity();
    });

    prevBtnStep2.addEventListener("click", () => {
        // Hide Step 2, Show Step 1
        step2Content.style.display = "none";
        step1Content.style.display = "grid";
        
        // Update Stepper graphic
        stepCircles[1].classList.remove("active");
        stepLines[0].classList.remove("active");
    });

    // Step 2 Validation
    const step2Form = document.getElementById("step2Form");
    const addressInput = document.getElementById("addressInput");
    const stateInput = document.getElementById("stateInput");
    const cityInput = document.getElementById("cityInput");
    const pincodeInput = document.getElementById("pincodeInput");
    const bulkInput = document.getElementById("bulkInput");
    const foodInput = document.getElementById("foodInput");
    const orgNameInput = document.getElementById("orgNameInput");
    const orgEmailInput = document.getElementById("orgEmailInput");
    const gstinInput = document.getElementById("gstinInput");
    const fssaiInput = document.getElementById("fssaiInput");
    const storageInput = document.getElementById("storageInput");
    const fpoInput = document.getElementById("fpoInput");
    const fpoEmailInput = document.getElementById("fpoEmailInput");
    const orgEmailError = document.getElementById("orgEmailError");
    const continueBtn = document.getElementById("continueBtn");
    
    const landRecordInput = document.getElementById("landRecordInput");
    const landDimensionInput = document.getElementById("landDimensionInput");
    const fpoNameInput = document.getElementById("fpoNameInput");
    const fpoRegInput = document.getElementById("fpoRegInput");

    const vehicleNameInput = document.getElementById("vehicleNameInput");
    const vehicleNoInput = document.getElementById("vehicleNoInput");
    const vehicleCapacityInput = document.getElementById("vehicleCapacityInput");
    const vehicleDocsInput = document.getElementById("vehicleDocsInput");
    const dlInput = document.getElementById("dlInput");
    const landmarkInput = document.getElementById("landmarkInput");

    const buyerRightFields = document.getElementById("buyerRightFields");
    const sellerRightFields = document.getElementById("sellerRightFields");
    const transporterRightFields = document.getElementById("transporterRightFields");

    const step2Inputs = [
        addressInput, landmarkInput, stateInput, cityInput, pincodeInput, bulkInput, foodInput, orgNameInput, 
        orgEmailInput, gstinInput, fssaiInput, storageInput, fpoInput, fpoEmailInput,
        landRecordInput, landDimensionInput, fpoNameInput, fpoRegInput,
        vehicleNameInput, vehicleNoInput, vehicleCapacityInput, vehicleDocsInput, dlInput
    ];
    step2Inputs.forEach(input => {
        if (input) input.addEventListener("input", checkStep2Validity);
    });

    orgEmailInput.addEventListener("input", () => {
        if (orgEmailInput.value.trim() !== "" && !isValidEmail(orgEmailInput.value)) {
            if (orgEmailError) orgEmailError.style.display = "block";
            orgEmailInput.style.borderColor = "#dc3545";
        } else {
            if (orgEmailError) orgEmailError.style.display = "none";
            orgEmailInput.style.borderColor = "";
        }
    });

    if (fpoEmailInput) {
        fpoEmailInput.addEventListener("input", () => {
            if (fpoEmailInput.value.trim() !== "" && !isValidEmail(fpoEmailInput.value)) {
                fpoEmailInput.style.borderColor = "#dc3545";
            } else {
                fpoEmailInput.style.borderColor = "";
            }
        });
    }

    pincodeInput.addEventListener("input", (e) => {
        e.target.value = e.target.value.replace(/[^0-9]/g, '').slice(0, 6);
        checkStep2Validity();
    });

    let isStep2Valid = false;
    let isStep2Submitted = false;
    let buyerSubfieldsSubmitted = false;
    let sellerSubfieldsSubmitted = false;

    function checkStep2Validity() {
        const selectedRole = document.querySelector('.role-card.active').dataset.role;
        const isOrgEmailValid = orgEmailInput.value.trim() === "" || isValidEmail(orgEmailInput.value);
        let isValid = 
            addressInput.value.trim() !== "" &&
            stateInput.value.trim() !== "" &&
            cityInput.value.trim() !== "" &&
            pincodeInput.value.length === 6;

        if (selectedRole === "buyer") {
            const isBulkYes = bulkInput.value === "Yes";
            const foodDropdownText = document.getElementById("foodSelectedText");
            
            // Enable/disable based on bulk
            orgNameInput.disabled = !isBulkYes;
            orgEmailInput.disabled = !isBulkYes;
            gstinInput.disabled = !isBulkYes;
            fssaiInput.disabled = !isBulkYes;
            
            if (!isBulkYes) {
                if (foodDropdownText) foodDropdownText.classList.add("disabled-dropdown");
            } else {
                if (foodDropdownText) foodDropdownText.classList.remove("disabled-dropdown");
            }
            
            // Validate required fields
            isValid = isValid && bulkInput.value.trim() !== "";
            
            if (isBulkYes) {
                isValid = isValid &&
                    foodInput.value.trim() !== "" &&
                    orgNameInput.value.trim() !== "" &&
                    orgEmailInput.value.trim() !== "" && isOrgEmailValid &&
                    gstinInput.value.trim() !== "" &&
                    fssaiInput.value.trim() !== "";
            }
        } else if (selectedRole === "farmer" || selectedRole === "seller") {
            const isFpoYes = fpoInput.value === "Yes";
            const fpoNameInput = document.getElementById("fpoNameInput");
            const fpoRegInput = document.getElementById("fpoRegInput");
            
            // Enable/disable based on FPO Yes/No
            if (fpoNameInput) fpoNameInput.disabled = !isFpoYes;
            if (fpoRegInput) fpoRegInput.disabled = !isFpoYes;
            if (fpoEmailInput) fpoEmailInput.disabled = !isFpoYes;

            if (!isFpoYes) {
                if (fpoNameInput) fpoNameInput.value = "";
                if (fpoRegInput) fpoRegInput.value = "";
                if (fpoEmailInput) fpoEmailInput.value = "";
            }

            isValid = isValid && storageInput.value.trim() !== "" && fpoInput.value.trim() !== "";
            
            if (isFpoYes) {
                const isFpoEmailValid = fpoEmailInput && fpoEmailInput.value.trim() !== "" && isValidEmail(fpoEmailInput.value);
                isValid = isValid &&
                    fpoNameInput && fpoNameInput.value.trim() !== "" &&
                    fpoRegInput && fpoRegInput.value.trim() !== "" &&
                    isFpoEmailValid;
            }
        } else if (selectedRole === "transporter") {
            isValid = isValid &&
                landmarkInput.value.trim() !== "" &&
                vehicleNameInput.value.trim() !== "" &&
                vehicleNoInput.value.trim() !== "" &&
                vehicleCapacityInput.value.trim() !== "" &&
                vehicleDocsInput.value.trim() !== "" &&
                dlInput.value.trim() !== "";
        }

        isStep2Valid = isValid;
        
        if (isStep2Submitted) {
            showStep2Errors();
        }
    }

    step2Form.addEventListener("submit", (e) => {
        e.preventDefault();
        isStep2Submitted = true;
        buyerSubfieldsSubmitted = bulkInput.value === "Yes";
        sellerSubfieldsSubmitted = fpoInput.value === "Yes";
        if (!isStep2Valid) {
            showStep2Errors();
            return;
        }
        
        // Hide Step 2, Show Step 3
        const step2Content = document.getElementById("step2Content");
        const step3Content = document.getElementById("step3Content");
        step2Content.style.display = "none";
        step3Content.style.display = "grid";

        // Update Stepper graphic
        const stepCircles = document.querySelectorAll(".step");
        const stepLines = document.querySelectorAll(".step-line");
        stepCircles[2].classList.add("active");
        stepLines[1].classList.add("active");
        
        lucide.createIcons();
    });
    // Custom Dropdown Helper
    function setupCustomDropdown(selectedTextId, listId, hiddenInputId, onChange = null) {
        const selectedText = document.getElementById(selectedTextId);
        const dropdownList = document.getElementById(listId);
        const hiddenInput = document.getElementById(hiddenInputId);
        if (!selectedText || !dropdownList || !hiddenInput) return;

        selectedText.addEventListener("click", function(e) {
            e.stopPropagation();
            // Close all other dropdowns
            document.querySelectorAll(".state-items").forEach(list => {
                if (list.id !== listId) list.classList.add("state-hide");
            });
            dropdownList.classList.toggle("state-hide");
        });

        const items = dropdownList.querySelectorAll("div");
        items.forEach(item => {
            item.addEventListener("click", function(e) {
                selectedText.textContent = this.textContent;
                selectedText.classList.add("has-value");
                hiddenInput.value = this.textContent;
                dropdownList.classList.add("state-hide");
                if (onChange) onChange();
                checkStep2Validity();
            });
        });
    }

    setupCustomDropdown("stateSelectedText", "stateDropdownList", "stateInput");
    setupCustomDropdown("bulkSelectedText", "bulkDropdownList", "bulkInput", () => {
        buyerSubfieldsSubmitted = false;
        showError("foodInput", "foodProcessingError", true, true, "foodSelectedText");
        showError("orgNameInput", "orgNameError", true);
        showError("gstinInput", "gSTINError", true);
        showError("fssaiInput", "fSSAILicenseError", true);
        showError("orgEmailInput", "orgEmailError", true);
    });
    setupCustomDropdown("foodSelectedText", "foodDropdownList", "foodInput");
    setupCustomDropdown("storageSelectedText", "storageDropdownList", "storageInput");
    setupCustomDropdown("fpoSelectedText", "fpoDropdownList", "fpoInput", () => {
        sellerSubfieldsSubmitted = false;
        showError("fpoNameInput", "fPONameError", true);
        showError("fpoRegInput", "fPORegNoError", true);
        showError("fpoEmailInput", "fPOEmailError", true);
    });

    function handleFileUpload(inputId, labelId) {
        const input = document.getElementById(inputId);
        const label = document.getElementById(labelId);
        if (!input || !label) return;
        
        input.addEventListener("change", function(e) {
            const fileNameSpan = label.querySelector("span");
            if (this.files && this.files.length > 0) {
                fileNameSpan.textContent = this.files[0].name;
            } else {
                fileNameSpan.textContent = "Upload Document";
            }
            checkStep2Validity();
        });
    }

    handleFileUpload("vehicleDocsInput", "vehicleDocsLabel");
    handleFileUpload("dlInput", "dlLabel");

    // Close all dropdowns if clicked outside
    document.addEventListener("click", function(e) {
        if (!e.target.closest(".custom-state-dropdown")) {
            document.querySelectorAll(".state-items").forEach(list => {
                list.classList.add("state-hide");
            });
        }
    });

    function showError(inputId, errorId, condition, isDropdown = false, selectedTextId = null) {
        const input = document.getElementById(inputId);
        const error = document.getElementById(errorId);
        let targetUI = input;
        if (isDropdown) targetUI = document.getElementById(selectedTextId);
        if (!targetUI) return;
        
        if (condition) {
            if (error) error.style.display = "none";
            targetUI.style.border = "1px solid rgba(0,0,0,0.1)";
        } else {
            if (error) error.style.display = "inline-block";
            targetUI.style.border = "1px solid #dc3545";
        }
    }

    function showStep1Errors() {
        showError("firstNameInput", "firstNameError", firstNameInput.value.trim() !== "");
        showError("lastNameInput", "lastNameError", lastNameInput.value.trim() !== "");
        showError("phoneInput", "phoneNoError", phoneInput.value.length === 10);
        showError("otpInput", "oTPError", otpInput.value.length === 6);
        showError("passwordInput", "passwordError", isValidPassword(passwordInput.value));
        showError("aadharInput", "aadharError", aadharInput.value.length === 12);
        const isEmailValid = emailInput.value.trim() === "" || isValidEmail(emailInput.value);
        showError("emailInput", "emailError", isEmailValid);
    }

    function showStep2Errors() {
        showError("addressInput", "fullAddressError", addressInput.value.trim() !== "");
        showError("cityInput", "cityVillageError", cityInput.value.trim() !== "");
        showError("pincodeInput", "pincodeError", pincodeInput.value.length === 6);
        showError("stateInput", "stateError", stateInput.value.trim() !== "", true, "stateSelectedText");

        const selectedRole = document.querySelector('.role-card.active').dataset.role;
        
        // Hide landmark error for non-transporters
        if (selectedRole !== "transporter") {
            showError("landmarkInput", "landmarkError", true);
        }

        if (selectedRole === "buyer") {
            const isBulkYes = bulkInput.value === "Yes";
            showError("bulkInput", "bulkError", bulkInput.value.trim() !== "", true, "bulkSelectedText");
            
            if (isBulkYes && buyerSubfieldsSubmitted) {
                showError("foodInput", "foodProcessingError", foodInput.value.trim() !== "", true, "foodSelectedText");
                showError("orgNameInput", "orgNameError", orgNameInput.value.trim() !== "");
                showError("gstinInput", "gSTINError", gstinInput.value.trim() !== "");
                showError("fssaiInput", "fSSAILicenseError", fssaiInput.value.trim() !== "");
                const orgEmailValidCompulsory = orgEmailInput.value.trim() !== "" && isValidEmail(orgEmailInput.value);
                showError("orgEmailInput", "orgEmailError", orgEmailValidCompulsory);
            }
        } else if (selectedRole === "farmer" || selectedRole === "seller") {
            showError("storageInput", "storageError", storageInput.value.trim() !== "", true, "storageSelectedText");
            showError("fpoInput", "fPOYNError", fpoInput.value.trim() !== "", true, "fpoSelectedText");
            const landRecordInput = document.getElementById("landRecordInput");
            if (landRecordInput) showError("landRecordInput", "landRecordNoError", landRecordInput.value.trim() !== "");
            const landDimensionInput = document.getElementById("landDimensionInput");
            if (landDimensionInput) showError("landDimensionInput", "landDimensionError", landDimensionInput.value.trim() !== "");
            
            const isFpoYes = fpoInput.value === "Yes";
            const fpoNameInput = document.getElementById("fpoNameInput");
            const fpoRegInput = document.getElementById("fpoRegInput");
            const fpoEmailInput = document.getElementById("fpoEmailInput");

            if (isFpoYes && sellerSubfieldsSubmitted) {
                if (fpoNameInput) showError("fpoNameInput", "fPONameError", fpoNameInput.value.trim() !== "");
                if (fpoRegInput) showError("fpoRegInput", "fPORegNoError", fpoRegInput.value.trim() !== "");
                if (fpoEmailInput) {
                    const fpoEmailValidCompulsory = fpoEmailInput.value.trim() !== "" && isValidEmail(fpoEmailInput.value);
                    showError("fpoEmailInput", "fPOEmailError", fpoEmailValidCompulsory);
                }
            } else if (!isFpoYes) {
                if (fpoNameInput) showError("fpoNameInput", "fPONameError", true);
                if (fpoRegInput) showError("fpoRegInput", "fPORegNoError", true);
                if (fpoEmailInput) showError("fpoEmailInput", "fPOEmailError", true);
            }
        } else if (selectedRole === "transporter") {
            showError("landmarkInput", "landmarkError", landmarkInput.value.trim() !== "");
            showError("vehicleNameInput", "vehicleNameError", vehicleNameInput.value.trim() !== "");
            showError("vehicleNoInput", "vehicleNoError", vehicleNoInput.value.trim() !== "");
            showError("vehicleCapacityInput", "vehicleCapacityError", vehicleCapacityInput.value.trim() !== "");
            showError("vehicleDocsInput", "vehicleDocsError", vehicleDocsInput.value.trim() !== "", true, "vehicleDocsLabel");
            showError("dlInput", "dlError", dlInput.value.trim() !== "", true, "dlLabel");
        }
    }


    // --- Step 3 Logic ---
    const step3Form = document.getElementById("step3Form");
    const prevBtnStep3 = document.getElementById("prevBtnStep3");
    
    const upiFields = document.getElementById("upiFields");
    const netbankingFields = document.getElementById("netbankingFields");
    
    const upiIdInput = document.getElementById("upiIdInput");
    const ownerNamePayInput = document.getElementById("ownerNamePayInput");
    const bankNamePayInput = document.getElementById("bankNamePayInput");
    const branchCodePayInput = document.getElementById("branchCodePayInput");
    const ifscPayInput = document.getElementById("ifscPayInput");
    const accNumberPayInput = document.getElementById("accNumberPayInput");

    const paymentCards = document.querySelectorAll('.payment-card');
    
    // Toggle Payment Method
    paymentCards.forEach(card => {
        card.addEventListener('click', () => {
            paymentCards.forEach(c => c.classList.remove('active'));
            card.classList.add('active');
            
            const method = card.dataset.method;
            if (method === "upi") {
                upiFields.style.display = "flex";
                netbankingFields.style.display = "none";
            } else {
                upiFields.style.display = "none";
                netbankingFields.style.display = "flex";
            }
            checkStep3Validity();
        });
    });

    const step3Inputs = [
        upiIdInput, ownerNamePayInput, bankNamePayInput, branchCodePayInput, ifscPayInput, accNumberPayInput
    ];
    step3Inputs.forEach(input => {
        if (input) input.addEventListener("input", checkStep3Validity);
    });

    let isStep3Valid = false;
    let isStep3Submitted = false;

    function checkStep3Validity() {
        const selectedMethod = document.querySelector('.payment-card.active').dataset.method;
        let isValid = true;
        
        if (selectedMethod === "upi") {
            isValid = upiIdInput.value.trim() !== "";
        } else {
            isValid = ownerNamePayInput.value.trim() !== "" &&
                      bankNamePayInput.value.trim() !== "" &&
                      branchCodePayInput.value.trim() !== "" &&
                      ifscPayInput.value.trim() !== "" &&
                      accNumberPayInput.value.trim() !== "";
        }
        
        isStep3Valid = isValid;
        
        if (isStep3Submitted) {
            showStep3Errors();
        }
    }

    function showStep3Errors() {
        const selectedMethod = document.querySelector('.payment-card.active').dataset.method;
        
        if (selectedMethod === "upi") {
            showError("upiIdInput", "upiIdError", upiIdInput.value.trim() !== "");
            
            showError("ownerNamePayInput", "ownerNamePayError", true);
            showError("bankNamePayInput", "bankNamePayError", true);
            showError("branchCodePayInput", "branchCodePayError", true);
            showError("ifscPayInput", "ifscPayError", true);
            showError("accNumberPayInput", "accNumberPayError", true);
        } else {
            showError("ownerNamePayInput", "ownerNamePayError", ownerNamePayInput.value.trim() !== "");
            showError("bankNamePayInput", "bankNamePayError", bankNamePayInput.value.trim() !== "");
            showError("branchCodePayInput", "branchCodePayError", branchCodePayInput.value.trim() !== "");
            showError("ifscPayInput", "ifscPayError", ifscPayInput.value.trim() !== "");
            showError("accNumberPayInput", "accNumberPayError", accNumberPayInput.value.trim() !== "");
            
            showError("upiIdInput", "upiIdError", true);
        }
    }

    prevBtnStep3.addEventListener("click", () => {
        const step3Content = document.getElementById("step3Content");
        const step2Content = document.getElementById("step2Content");
        
        step3Content.style.display = "none";
        step2Content.style.display = "grid";
        
        const stepCircles = document.querySelectorAll(".step");
        const stepLines = document.querySelectorAll(".step-line");
        stepCircles[2].classList.remove("active");
        stepLines[1].classList.remove("active");
    });

    step3Form.addEventListener("submit", (e) => {
        e.preventDefault();
        isStep3Submitted = true;
        
        if (!isStep3Valid) {
            showStep3Errors();
            return;
        }

        const activeRoleCard = document.querySelector('.role-card.active');
        const selectedRole = activeRoleCard ? activeRoleCard.dataset.role : '';
        
        const step3Content = document.getElementById("step3Content");
        const successContent = document.getElementById("successContent");
        const signupCardHeader = document.querySelector(".signup-card-header");
        const signupCard = document.querySelector(".signup-card");
        
        let exactHeight = "";
        if (signupCard) {
            exactHeight = signupCard.offsetHeight + "px";
        }
        
        if (signupCardHeader) signupCardHeader.style.display = "none";
        step3Content.style.display = "none";
        
        if (signupCard) {
            signupCard.style.minHeight = exactHeight;
            
            signupCard.style.display = "flex"; 
            signupCard.style.alignItems = "center";
            signupCard.style.justifyContent = "center";
            signupCard.style.backgroundColor = "var(--color-green)";
            signupCard.style.border = "none"; // Remove card border since background is solid
        }
        
        successContent.style.display = "flex";
        lucide.createIcons();

        // Redirect after showing Account Created success message
        setTimeout(() => {
            if (selectedRole === "farmer" || selectedRole === "seller") {
                window.location.href = "farmerMkt.html";
            } else {
                window.location.href = "index.html";
            }
        }, 1500);
    });
});
