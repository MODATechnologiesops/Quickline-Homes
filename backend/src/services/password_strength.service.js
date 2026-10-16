/**
 * Password strength checker (JavaScript twin of automation/app/password_strength.py).
 * No dependencies. Same rules, word list and scoring as the Python version, so
 * both sides give the same answer.
 *
 *   import { checkPasswordStrength, requireStrongPassword } from "./password-strength.service.js";
 *
 *   const result = checkPasswordStrength("Summer2024!", ["Xolet", "xolet@mail.com"]);
 *   result.score        // 0 (very weak) .. 4 (very strong)
 *   result.label        // "Very weak" .. "Very strong"
 *   result.acceptable   // true when score >= 3 and nothing blocks it
 *   result.issues       // plain-language problems, safe to show a user
 *   result.suggestions  // how to fix them
 *
 * A rules-based estimate, not a guarantee: it catches the usual problems (too
 * short, common passwords and their l33t variants, names and emails, repeats,
 * keyboard and number runs) but cannot know every leaked password. It sits in
 * front of bcrypt, it does not replace it.
 *
 * bcrypt only uses the first 72 BYTES of a password, so anything longer is
 * rejected here instead of being silently cut off.
 *
 * The result never contains the password, so it is safe to log.
 */

export const MIN_LENGTH = 10;
export const RECOMMENDED_LENGTH = 12;
export const MAX_BYTES = 72;

const LABELS = ["Very weak", "Weak", "Fair", "Strong", "Very strong"];

// Compared after lower-casing, undoing l33t substitutions and trimming digits
// and symbols from the ends, so "P@ssw0rd123!" is caught as "password".
const COMMON_PASSWORDS = new Set(
    `
    000000 111111 112233 121212 123123 123456 1234567 12345678 123456789 1234567890 1q2w3e4r
    1qaz2wsx 654321 987654321 abc123 abcd1234 abcdef abcdefgh admin administrator april arsenal
    asdfgh asdfghjkl ashley august autumn barcelona baseball batman changeme charlie chelsea daniel
    december default donald dragon eldoret february football freedom guest harambee hello homes
    iloveyou jambo january jessica jordan july june kenya kisumu landlord letmein liverpool login
    manutd march master may michael michelle mombasa monkey mpesa nairobi nakuru november october
    pass passw0rd passwd password pesa princess qazwsx quickline quicklinehomes qwerty qwertyui
    qwertyuiop rent root safaricom secret september shadow simba soccer spring summer sunshine
    superman tenant test trustno1 user welcome whatever winter zaq12wsx zxcvbn zxcvbnm
    `.split(/\s+/).filter(Boolean)
);

const LEET = { "0": "o", "1": "i", "3": "e", "4": "a", "5": "s", "7": "t", "@": "a", "$": "s", "!": "i" };
const LEET_L = { "0": "o", "1": "l", "3": "e", "4": "a", "5": "s", "7": "t", "@": "a", "$": "s", "!": "l" };

const TRIM_CHARS = "0-9!@#$%^&*()\\-_=+\\[\\]{};:'\",.<>/?\\\\|`~ ";
const TRIM_START = new RegExp(`^[${TRIM_CHARS}]+`);
const TRIM_END = new RegExp(`[${TRIM_CHARS}]+$`);

const KEYBOARD_ROWS = ["qwertyuiop", "asdfghjkl", "zxcvbnm"]; // digit runs are caught as sequences

// Codes that make a password unacceptable no matter how long it is.
const BLOCKING = new Set([
    "too_short", "too_long", "common_password", "personal_info", "single_character", "only_digits_short"
]);

export class WeakPasswordError extends Error {
    constructor(check) {
        super(`Password is too weak: ${check.issues.join(" ")}`);
        this.name = "WeakPasswordError";
        this.check = check;
    }
}

// ---------------------------------------------------------------------------
// helpers (character counts are in Unicode code points, like the Python version)
// ---------------------------------------------------------------------------

const chars = (text) => Array.from(text);
const cpLength = (text) => chars(text).length;
const translate = (text, map) => chars(text).map((ch) => map[ch] ?? ch).join("");
const isAlnum = (ch) => /[\p{L}\p{N}]/u.test(ch);
const cpIndex = (text, utf16Index) => cpLength(text.slice(0, utf16Index));

function isCommon(password) {
    const lowered = password.toLowerCase();
    const candidates = new Set([lowered, translate(lowered, LEET), translate(lowered, LEET_L)]);

    for (const candidate of candidates) {
        const forms = [
            candidate,
            candidate.replace(TRIM_END, ""),
            candidate.replace(TRIM_START, "").replace(TRIM_END, "")
        ];

        if (forms.some((form) => form && COMMON_PASSWORDS.has(form))) {
            return true;
        }
    }

    return false;
}

function personalTokens(userInputs) {
    const tokens = new Set();

    for (const value of userInputs || []) {
        let text = String(value ?? "").toLowerCase().trim();

        if (!text) {
            continue;
        }

        if (text.includes("@")) {
            text = text.split("@")[0]; // the domain ("gmail", "com") is not personal
        }

        for (const part of text.split(/[^a-z0-9]+/)) {
            if (/^[0-9]+$/.test(part)) {
                if (part.length >= 4) tokens.add(part);
            } else if (part.length >= 3) {
                tokens.add(part);
            }
        }
    }

    return tokens;
}

function containsPersonalInfo(password, tokens) {
    const lowered = password.toLowerCase();
    const variants = [lowered, translate(lowered, LEET), translate(lowered, LEET_L)];

    return [...tokens].some((token) => variants.some((variant) => variant.includes(token)));
}

/**
 * Returns { redundant, found }. `redundant` counts characters that add almost
 * no strength because they sit in a repeat (aaa), a straight run (abcd, 4321)
 * or a keyboard row (qwer, rewq). Each character is counted once.
 */
function findRuns(password) {
    const text = password.toLowerCase();
    const letters = chars(text);
    const covered = new Set();
    const found = new Set();
    let redundant = 0;

    const claim = (start, length, kind) => {
        const indexes = Array.from({ length }, (_, k) => start + k);

        if (indexes.some((index) => covered.has(index))) {
            return;
        }

        indexes.forEach((index) => covered.add(index));
        redundant += length - 1;
        found.add(kind);
    };

    // repeated characters: 3 or more in a row
    for (const match of text.matchAll(/(.)\1{2,}/gu)) {
        claim(cpIndex(text, match.index), cpLength(match[0]), "repeats");
    }

    // straight runs by character code, ascending or descending, 4 or more long
    let i = 0;
    while (i < letters.length - 1) {
        const step = letters[i + 1].codePointAt(0) - letters[i].codePointAt(0);

        if ((step === 1 || step === -1) && isAlnum(letters[i]) && isAlnum(letters[i + 1])) {
            let j = i + 1;

            while (
                j < letters.length - 1 &&
                isAlnum(letters[j + 1]) &&
                letters[j + 1].codePointAt(0) - letters[j].codePointAt(0) === step
            ) {
                j += 1;
            }

            if (j - i + 1 >= 4) {
                claim(i, j - i + 1, "sequence");
            }

            i = j;
        } else {
            i += 1;
        }
    }

    // keyboard rows, 4 or more in a row, forwards or backwards (longest first)
    const rows = KEYBOARD_ROWS.flatMap((row) => [row, [...row].reverse().join("")]);

    for (let length = 10; length >= 4; length -= 1) {
        for (const row of rows) {
            for (let offset = 0; offset + length <= row.length; offset += 1) {
                const chunk = row.slice(offset, offset + length);
                let position = text.indexOf(chunk);

                while (position !== -1) {
                    claim(cpIndex(text, position), length, "keyboard");
                    position = text.indexOf(chunk, position + 1);
                }
            }
        }
    }

    return { redundant, found };
}

/** 'abcabcabc' or 'Aa1!Aa1!' -> length of the repeating block, else null. */
function repeatedBlock(password) {
    const match = /^(.{1,6}?)\1+$/u.exec(password);
    return match ? cpLength(match[1]) : null;
}

function characterClasses(password) {
    const list = chars(password);

    return {
        lower: list.some((c) => c >= "a" && c <= "z"),
        upper: list.some((c) => c >= "A" && c <= "Z"),
        digit: list.some((c) => c >= "0" && c <= "9"),
        symbol: list.some((c) => !/^[A-Za-z0-9]$/.test(c))
    };
}

function estimateBits(password, classes, redundant) {
    const pool =
        26 * classes.lower + 26 * classes.upper + 10 * classes.digit + 33 * classes.symbol;

    let effective = Math.max(cpLength(password) - redundant, 0);

    const block = repeatedBlock(password);
    if (block !== null) {
        effective = Math.min(effective, block);
    }

    let bits = pool ? effective * Math.log2(pool) : 0;

    // Single-kind passwords are usually words or numbers, which are far easier to guess.
    if (Object.values(classes).filter(Boolean).length === 1) {
        bits *= 0.75;
    }

    // A word followed by a few digits or symbols ("Sunshine2024!") is the most common shape of all.
    const match = /^([A-Za-z]+)([^A-Za-z]{1,6})$/.exec(password);
    if (match && match[1].length < 16) {
        bits = Math.min(bits, match[1].length * 2.5 + match[2].length * 3.3);
    }

    return bits;
}

// ---------------------------------------------------------------------------
// public API
// ---------------------------------------------------------------------------

export function checkPasswordStrength(password, userInputs = []) {
    if (typeof password !== "string") {
        throw new TypeError("password must be a string");
    }

    const codes = [];
    const issues = [];
    const suggestions = [];

    const flag = (code, issue, suggestion) => {
        if (!codes.includes(code)) {
            codes.push(code);
            issues.push(issue);
            if (suggestion && !suggestions.includes(suggestion)) {
                suggestions.push(suggestion);
            }
        }
    };

    const length = cpLength(password);
    const classes = characterClasses(password);
    const kinds = Object.values(classes).filter(Boolean).length;
    const { redundant, found } = findRuns(password);

    if (length < MIN_LENGTH) {
        flag("too_short", `Use at least ${MIN_LENGTH} characters.`, `Aim for ${RECOMMENDED_LENGTH} or more.`);
    } else if (length < RECOMMENDED_LENGTH) {
        flag("short", `${RECOMMENDED_LENGTH} or more characters is safer.`,
            `Add a few more characters (aim for ${RECOMMENDED_LENGTH}+).`);
    }

    if (Buffer.byteLength(password, "utf8") > MAX_BYTES) {
        flag("too_long", `Use at most ${MAX_BYTES} bytes (about ${MAX_BYTES} characters; fewer with accents or emoji).`);
    }

    if (length > 0 && new Set(chars(password)).size === 1) {
        flag("single_character", "The password is one character repeated.");
    }

    if (/^[0-9]+$/.test(password) && length < 16) {
        flag("only_digits_short", "A password made only of digits is easy to guess.", "Mix in letters and symbols.");
    }

    if (isCommon(password)) {
        flag("common_password", "This is a very common password, or a small variation of one.",
            "Pick something unique, such as four unrelated words.");
    }

    const tokens = personalTokens(userInputs);
    if (tokens.size > 0 && containsPersonalInfo(password, tokens)) {
        flag("personal_info", "The password contains your name, email or other personal details.",
            "Do not build the password from personal information.");
    }

    if (found.has("repeats")) {
        flag("repeats", "It repeats the same character several times in a row.", "Avoid runs like 'aaa' or '111'.");
    }

    if (found.has("sequence")) {
        flag("sequence", "It contains a straight run such as 'abcd' or '1234'.", "Avoid alphabet and number runs.");
    }

    if (found.has("keyboard")) {
        flag("keyboard", "It contains a keyboard pattern such as 'qwer'.", "Avoid keys that sit next to each other.");
    }

    if (repeatedBlock(password) !== null && length >= 4) {
        flag("repeated_block", "It is a short piece repeated over and over.", "Use a password that does not repeat itself.");
    }

    if (kinds < 3 && length < 16) {
        flag("few_character_types", "Mix uppercase, lowercase, numbers and symbols, or make it longer.",
            "Use a passphrase of four or more unrelated words (16+ characters).");
    }

    // ---- score -------------------------------------------------------------
    const bits = estimateBits(password, classes, redundant);

    let score;
    if (bits < 28) score = 0;
    else if (bits < 36) score = 1;
    else if (bits < 50) score = 2;
    else if (bits < 64) score = 3;
    else score = 4;

    if (length < RECOMMENDED_LENGTH) score = Math.min(score, 3);
    if (codes.includes("personal_info")) score = Math.min(score, 1);
    if (codes.includes("too_short")) score = Math.min(score, 1);
    if (["common_password", "single_character", "only_digits_short"].some((c) => codes.includes(c))) score = 0;

    const acceptable = score >= 3 && !codes.some((code) => BLOCKING.has(code));

    return {
        score,
        label: LABELS[score],
        entropyBits: Math.round(bits * 10) / 10,
        acceptable,
        issues,
        suggestions: acceptable && issues.length === 0 ? [] : suggestions,
        codes
    };
}

/** Returns the result when acceptable, otherwise throws WeakPasswordError. */
export function requireStrongPassword(password, userInputs = []) {
    const check = checkPasswordStrength(password, userInputs);

    if (!check.acceptable) {
        throw new WeakPasswordError(check);
    }

    return check;
}