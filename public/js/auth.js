// import { name } from "ejs";
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

        const email = document.getElementById("email").value.trim();
        const password = document.getElementById("password").value;

        const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailPattern.test(email)) {
            alert("Please enter a valid email address.");
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

            if (res.ok) {
                loginForm.classList.add("d-none");
                loginSpinner.classList.remove("d-none");

                setTimeout(() => {
                    window.location.href = "/dashboard";
                }, 1000);
            } else {
                alert("Login failed. Please try again.");
            }
        } catch (err) {
            console.error("Login Error:", err.message);
            alert("Invalid login credentials");
        }
    });
}

// 🚀 Handle Signup with Validation + Spinner + Sign-out + Redirect to Login
const signupForm = document.getElementById("signupForm");
const redirectSpinner = document.getElementById("redirectSpinner");

if (signupForm) {
    signupForm.addEventListener("submit", async (e) => {
        e.preventDefault();

        const email = document.getElementById("email").value.trim();
        const password = document.getElementById("password").value;
    
        const firstName = document.querySelector('input[placeholder="John"]').value.trim();
        const lastName = document.querySelector('input[placeholder="Doe"]').value.trim();
        const name = `${firstName} ${lastName}`;
        console.log(name);


        const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        const passwordPattern = /^(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/;

        if (!emailPattern.test(email)) {
            alert("Please enter a valid email address.");
            return;
        }

        if (!passwordPattern.test(password)) {
            alert("Password must be at least 8 characters long, include an uppercase letter, a number, and a special character.");
            return;
        }

        try {
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;
            const idToken = await user.getIdToken();
            console.log("reached here");
      
            // ✅ Send name to backend
            await fetch("/sessionLogin", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ idToken, name })
            });
      
            await auth.signOut();
      
            signupForm.classList.add("d-none");
            redirectSpinner.classList.remove("d-none");
      
            setTimeout(() => {
              window.location.href = "/login";
            }, 1000);
        } catch (err) {
            console.error("Signup Error:", err.message);
            alert("Signup failed. Make sure your password is strong enough.");
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

            const res = await fetch("/sessionLogin", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ idToken })
            });

            if (res.ok) {
                window.location.href = "/dashboard";
            } else {
                alert("Google login failed. Try again.");
            }
        } catch (err) {
            console.error("Google Login Error:", err.message);
            alert("Google login failed. Try again.");
        }
    });
}
