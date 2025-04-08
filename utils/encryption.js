import crypto from "crypto";
import dotenv from "dotenv";
dotenv.config();

const algorithm = "aes-256-cbc";
const secretKey = Buffer.from(process.env.ENCRYPTION_SECRET, "hex"); // Must be 32 bytes (64 hex)

export const encrypt = (text) => {
    const iv = crypto.randomBytes(16); // 16-byte IV
    const cipher = crypto.createCipheriv(algorithm, secretKey, iv);
    const encrypted = Buffer.concat([cipher.update(text, "utf8"), cipher.final()]);
    return iv.toString("hex") + ":" + encrypted.toString("hex");
};

export const decrypt = (hash) => {
    try {
        if (!hash || typeof hash !== "string" || !hash.includes(":")) {
            console.warn("⚠️ Skipping decryption – invalid or missing hash.");
            return null;
        }

        const [ivHex, encryptedHex] = hash.split(":");
        const iv = Buffer.from(ivHex, "hex");
        const encryptedText = Buffer.from(encryptedHex, "hex");

        const decipher = crypto.createDecipheriv(algorithm, secretKey, iv);
        const decrypted = Buffer.concat([decipher.update(encryptedText), decipher.final()]);

        return decrypted.toString("utf8");
    } catch (err) {
        console.error("❌ Decryption failed:", err.message);
        return null;
    }
};
