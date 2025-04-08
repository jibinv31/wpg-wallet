import {
    auth,
    provider,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signInWithPopup
} from "./firebase-config.js";

// 🚀 Handle Login
const loginForm = document.getElementById("loginForm");
const loginSpinner = document.getElementById("loginSpinner");

if (loginForm) {
    loginForm.addEventListener("submit", async (e) => {
        e.preventDefault();

        const email = document.getElementById("email")?.value.trim();
        const password = document.getElementById("password")?.value;

        if (!email || !password) {
            alert("Email and password are required.");
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
                alert(data.error || "Login failed. Please try again.");
            }
        } catch (err) {
            console.error("Login Error:", err.message);
            alert("Invalid login credentials");
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
            alert("Please enter your full name.");
            return;
        }

        const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        const passwordPattern = /^(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/;

        if (!emailPattern.test(email)) {
            alert("Please enter a valid email address.");
            return;
        }

        if (!passwordPattern.test(password)) {
            alert("Password must be at least 8 characters, include uppercase, number, and special char.");
            return;
        }

        if (!kycDocument || kycDocument.size === 0) {
            alert("Please upload a valid KYC document.");
            return;
        }

        try {
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const idToken = await userCredential.user.getIdToken();

            // Append token + name to formData
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
                alert("Email already exists. Redirecting to login...");
                setTimeout(() => {
                    window.location.href = "/login";
                }, 2000);
            } else {
                alert("Signup failed. Try again.");
            }
        }
    });
}

// 🚀 Google Sign-In
const googleBtn = document.getElementById("googleLogin");
if (googleBtn) {
    googleBtn.addEventListener("click", async () => {
        try {
            const result = await signInWithPopup(auth, provider);
            const idToken = await result.user.getIdToken();
            const name = result.user.displayName || "Google User";

            const res = await fetch("/sessionLogin", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ idToken, name })
            });

            const data = await res.json();

            if (res.ok) {
                window.location.href = data.redirect || "/dashboard";
            } else {
                alert(data.error || "Google login failed. Try again.");
            }
        } catch (err) {
            console.error("Google Login Error:", err.message);
            alert("Google login failed. Try again.");
        }
    });
}
