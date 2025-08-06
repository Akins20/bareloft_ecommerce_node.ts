import bcrypt from "bcryptjs";
import crypto from "crypto";

/**
 * Password hashing utilities using bcrypt
 */
export class PasswordHasher {
  private static readonly SALT_ROUNDS = 12;
  private static readonly MIN_PASSWORD_LENGTH = 8;
  private static readonly MAX_PASSWORD_LENGTH = 128;

  /**
   * Hash a password using bcrypt
   */
  static async hashPassword(password: string): Promise<string> {
    this.validatePassword(password);
    return await bcrypt.hash(password, this.SALT_ROUNDS);
  }

  /**
   * Verify a password against its hash
   */
  static async verifyPassword(
    password: string,
    hash: string
  ): Promise<boolean> {
    if (!password || !hash) {
      return false;
    }

    try {
      return await bcrypt.compare(password, hash);
    } catch (error) {
      console.error("Password verification error:", error);
      return false;
    }
  }

  /**
   * Validate password strength
   */
  static validatePassword(password: string): void {
    if (!password) {
      throw new Error("Password is required");
    }

    if (password.length < this.MIN_PASSWORD_LENGTH) {
      throw new Error(
        `Password must be at least ${this.MIN_PASSWORD_LENGTH} characters long`
      );
    }

    if (password.length > this.MAX_PASSWORD_LENGTH) {
      throw new Error(
        `Password must not exceed ${this.MAX_PASSWORD_LENGTH} characters`
      );
    }

    // Check for at least one uppercase, lowercase, number, and special character
    const hasUppercase = /[A-Z]/.test(password);
    const hasLowercase = /[a-z]/.test(password);
    const hasNumber = /\d/.test(password);
    const hasSpecialChar = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(
      password
    );

    if (!hasUppercase || !hasLowercase || !hasNumber || !hasSpecialChar) {
      throw new Error(
        "Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character"
      );
    }

    // Check for common weak passwords
    const commonPasswords = [
      "password",
      "password123",
      "123456",
      "123456789",
      "qwerty",
      "abc123",
      "password1",
      "admin",
      "welcome",
      "letmein",
    ];

    if (commonPasswords.includes(password.toLowerCase())) {
      throw new Error("Password is too common and not secure");
    }
  }

  /**
   * Generate a random password
   */
  static generateRandomPassword(length: number = 12): string {
    const uppercase = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    const lowercase = "abcdefghijklmnopqrstuvwxyz";
    const numbers = "0123456789";
    const specialChars = "!@#$%^&*()_+-=[]{}|;:,.<>?";

    const allChars = uppercase + lowercase + numbers + specialChars;

    let password = "";

    // Ensure at least one character from each category
    password += uppercase[Math.floor(Math.random() * uppercase.length)];
    password += lowercase[Math.floor(Math.random() * lowercase.length)];
    password += numbers[Math.floor(Math.random() * numbers.length)];
    password += specialChars[Math.floor(Math.random() * specialChars.length)];

    // Fill the rest randomly
    for (let i = 4; i < length; i++) {
      password += allChars[Math.floor(Math.random() * allChars.length)];
    }

    // Shuffle the password
    return password
      .split("")
      .sort(() => Math.random() - 0.5)
      .join("");
  }

  /**
   * Check if password has been compromised (basic implementation)
   */
  static async isPasswordCompromised(password: string): Promise<boolean> {
    // In production, you might want to check against APIs like HaveIBeenPwned
    // For now, we'll check against a basic list of common passwords
    const sha1Hash = crypto
      .createHash("sha1")
      .update(password)
      .digest("hex")
      .toUpperCase();

    // This is a simplified implementation
    // In production, integrate with HaveIBeenPwned API or similar service
    const commonHashes = new Set([
      // SHA1 hashes of common passwords
      "5E884898DA28047151D0E56F8DC6292773603D0D", // 'hello'
      "AAF4C61DDC2CF7CABDDE98B4C305E16DC67BA05E", // 'password'
      "7C4A8D09CA3762AF61E59520943DC26494F8941B", // '123456'
    ]);

    return commonHashes.has(sha1Hash);
  }

  /**
   * Generate password reset token
   */
  static generateResetToken(): string {
    return crypto.randomBytes(32).toString("hex");
  }

  /**
   * Hash sensitive data (for storage)
   */
  static hashSensitiveData(data: string): string {
    return crypto.createHash("sha256").update(data).digest("hex");
  }

  /**
   * Compare sensitive data hash
   */
  static compareSensitiveData(data: string, hash: string): boolean {
    const dataHash = this.hashSensitiveData(data);
    return crypto.timingSafeEqual(Buffer.from(dataHash), Buffer.from(hash));
  }
}

/**
 * Data encryption utilities for sensitive information
 */
export class DataEncryption {
  private static readonly ALGORITHM = "aes-256-gcm";
  private static readonly KEY_LENGTH = 32;
  private static readonly IV_LENGTH = 16;
  private static readonly TAG_LENGTH = 16;

  /**
   * Generate encryption key from password
   */
  private static deriveKey(password: string, salt: Buffer): Buffer {
    return crypto.pbkdf2Sync(password, salt, 100000, this.KEY_LENGTH, "sha512");
  }

  /**
   * Encrypt sensitive data
   */
  static encrypt(text: string, password: string): string {
    const salt = crypto.randomBytes(32);
    const key = this.deriveKey(password, salt);
    const iv = crypto.randomBytes(this.IV_LENGTH);

    const cipher = crypto.createCipher(this.ALGORITHM, key);

    let encrypted = cipher.update(text, "utf8", "hex");
    encrypted += cipher.final("hex");

    const tag = cipher.getAuthTag();

    // Combine salt, iv, tag, and encrypted data
    const result = Buffer.concat([
      salt,
      iv,
      tag,
      Buffer.from(encrypted, "hex"),
    ]);

    return result.toString("base64");
  }

  /**
   * Decrypt sensitive data
   */
  static decrypt(encryptedData: string, password: string): string {
    const data = Buffer.from(encryptedData, "base64");

    const salt = data.subarray(0, 32);
    const iv = data.subarray(32, 32 + this.IV_LENGTH);
    const tag = data.subarray(
      32 + this.IV_LENGTH,
      32 + this.IV_LENGTH + this.TAG_LENGTH
    );
    const encrypted = data.subarray(32 + this.IV_LENGTH + this.TAG_LENGTH);

    const key = this.deriveKey(password, salt);

    const decipher = crypto.createDecipher(this.ALGORITHM, key);

    let decrypted = decipher.update(encrypted, undefined, "utf8");
    decrypted += decipher.final("utf8");

    return decrypted;
  }

  /**
   * Generate secure random string
   */
  static generateSecureRandom(length: number = 32): string {
    return crypto.randomBytes(length).toString("hex");
  }
}

export default { PasswordHasher, DataEncryption };
