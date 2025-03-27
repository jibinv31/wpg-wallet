import crypto from "crypto";
import dotenv from "dotenv";
dotenv.config();

const algorithm = "aes-256-cbc";
const secretKey = process.env.ENCRYPTION_SECRET; // Should be 32 bytes
const iv = crypto.randomBytes(16); // Initialization Vector

export const encrypt = (text) => {
    const cipher = crypto.createCipheriv(algorithm, Buffer.from(secretKey, "hex"), iv);
    const encrypted = Buffer.concat([cipher.update(text, "utf8"), cipher.final()]);
    return iv.toString("hex") + ":" + encrypted.toString("hex");
};

export const decrypt = (hash) => {
    const [ivHex, encryptedData] = hash.split(":");
    const ivBuffer = Buffer.from(ivHex, "hex");
    const encryptedBuffer = Buffer.from(encryptedData, "hex");

    const decipher = crypto.createDecipheriv(algorithm, Buffer.from(secretKey, "hex"), ivBuffer);
    const decrypted = Buffer.concat([decipher.update(encryptedBuffer), decipher.final()]);
    return decrypted.toString("utf8");
};
