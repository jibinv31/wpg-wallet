import {
    auth,
    provider,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signInWithPopup
} from "./firebase-config.js";

// ✅ Toast utility
function showToast(message, isSuccess = false) {
    const toastContainer = document.createElement("div");
    toastContainer.className = "toast-container position-fixed top-0 end-0 p-3";
    toastContainer.style.zIndex = "1050";

    const toast = document.createElement("div");
    toast.className = `toast align-items-center text-white ${isSuccess ? "bg-success" : "bg-danger"} show`;
    toast.role = "alert";

    toast.innerHTML = `
      <div class="d-flex">
        <div class="toast-body">${message}</div>
        <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
      </div>
    `;

    toastContainer.appendChild(toast);
    document.body.appendChild(toastContainer);

    setTimeout(() => toastContainer.remove(), 5000);
}

// 🚀 Handle Login
const loginForm = document.getElementById("loginForm");
const loginSpinner = document.getElementById("loginSpinner");

if (loginForm) {
    loginForm.addEventListener("submit", async (e) => {
        e.preventDefault();

        const email = document.getElementById("email")?.value.trim();
        const password = document.getElementById("password")?.value;

        if (!email || !password) {
            showToast("Email and password are required.");
            return;
        }

        try {
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            const idToken = await userCredential.user.getIdToken();

            const res = await fetch("/sessionLogin", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ idToken })
            });

            const data = await res.json();

            if (res.ok) {
                loginForm.classList.add("d-none");
                loginSpinner.classList.remove("d-none");
                setTimeout(() => {
                    window.location.href = data.redirect || "/dashboard";
                }, 1000);
            } else {
                showToast(data.error || "Login failed. Please try again.");
            }
        } catch (err) {
            console.error("Login Error:", err.message);
            showToast("Invalid login credentials");
        }
    });
}

// 🚀 Handle Signup + KYC Upload
const signupForm = document.getElementById("signupForm");
const redirectSpinner = document.getElementById("redirectSpinner");

if (signupForm) {
    signupForm.addEventListener("submit", async (e) => {
        e.preventDefault();

        const formData = new FormData(signupForm);
        const firstName = formData.get("firstName")?.trim();
        const lastName = formData.get("lastName")?.trim();
        const name = `${firstName} ${lastName}`.trim();
        const email = formData.get("email")?.trim();
        const password = formData.get("password");
        const kycDocument = formData.get("kycDocument");

        if (!firstName || !lastName || !name) {
            showToast("Please enter your full name.");
            return;
        }

        const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        const passwordPattern = /^(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/;

        if (!emailPattern.test(email)) {
            showToast("Please enter a valid email address.");
            return;
        }

        if (!passwordPattern.test(password)) {
            showToast("Password must be at least 8 characters, include uppercase, number, and special char.");
            return;
        }

        if (!kycDocument || kycDocument.size === 0) {
            showToast("Please upload a valid KYC document.");
            return;
        }

        try {
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const idToken = await userCredential.user.getIdToken();

            formData.append("idToken", idToken);
            formData.append("name", name);

            const res = await fetch("/signup", {
                method: "POST",
                body: formData
            });

            if (!res.ok) throw new Error("Signup failed on server");

            await auth.signOut();

            signupForm.classList.add("d-none");
            redirectSpinner.classList.remove("d-none");

            setTimeout(() => {
                window.location.href = "/login";
            }, 1500);
        } catch (err) {
            console.error("Signup Error:", err);
            if (err.code === "auth/email-already-in-use") {
                showToast("Email already exists. Please login or use another email.");
            } else {
                showToast("Signup failed. Please try again.");
            }
        }
    });
}

// 🚀 Google Sign-In (Smart Route Handling)
const googleBtn = document.getElementById("googleLogin");

if (googleBtn) {
    googleBtn.addEventListener("click", async () => {
        try {
            const result = await signInWithPopup(auth, provider);
            const idToken = await result.user.getIdToken();
            const name = result.user.displayName || "Google User";

            const isSignupPage = window.location.pathname === "/signup";

            if (isSignupPage) {
                const res = await fetch("/google-complete-profile", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ idToken, name })
                });

                const data = await res.json();

                if (res.ok) {
                    window.location.href = data.redirect || "/complete-profile";
                } else {
                    showToast(data.error || "Could not begin Google signup.");
                }
            } else {
                const res = await fetch("/sessionLogin", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ idToken, name })
                });

                const data = await res.json();

                if (res.ok) {
                    window.location.href = data.redirect || "/dashboard";
                } else {
                    showToast(data.error || "Google login failed. Try again.");
                }
            }
        } catch (err) {
            console.error("Google Login Error:", err.message);
            showToast("Google login failed. Try again.");
        }
    });
}
