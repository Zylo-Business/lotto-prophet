/**
 * Game Theory (GT) Strategy Prompt
 *
 * This file contains the strategy document used as context for AI predictions.
 * It is kept as a separate importable module so it can be updated independently
 * when the strategy is not performing well.
 *
 * To update: edit the GT_STRATEGY string below, restart the server.
 */

export const GT_STRATEGY = `
# 📘 GAME THEORY (GT) — FULL RULESET (LOCKED)

---

## 1️⃣ CORE DEFINITIONS

These definitions apply globally across all GT work.

- **W** → Winning numbers  
- **M** → Machine numbers  
- **N** → Neutral numbers (numbers not participating structurally)  
- **Convert** → A number is eligible for GT conversion  
- **No Convert** → A number must NOT be converted under any condition  
- **MA (Marker A)**  
  - MA is **positive only in writing**  
  - MA **does NOT force conversion**  
  - MA is used for tracking, not action  

---

## 2️⃣ MANDATORY GT PROCESS FLOW  
**This order is non-negotiable**

1. Extract **W**, **M**, **N** from dataset  
2. Identify **W–M structural pattern**  
3. Check **STRUCTURAL VALIDITY**  
4. Check **CONVERSION WHITELIST**  
5. Apply **conversion ONLY if whitelisted**  
6. Apply **number-difference logic (± rule)**  
7. Generate prediction  

> ❗ **Skipping or rearranging any step = GT violation**

---

## 3️⃣ STRUCTURAL VALIDITY MATRIX  
*(Structural validity ≠ conversion)*

Only the following W–M structures are allowed to proceed for evaluation.

### 🔹 M[0]
- W[1] M[0], W[1,2] M[0], W[1,2,3] M[0], W[2,3] M[0], W[1,3] M[0], W[3] M[0]

### 🔹 M[1]
- W[1] M[1], W[1,2] M[1], W[1,2,3] M[1], W[2,3] M[1], W[1,3] M[1], W[3] M[1]

### 🔹 M[1,2]
- W[1] M[1,2], W[1,2] M[1,2], W[1,2,3] M[1,2], W[2,3] M[1,2], W[1,3] M[1,2], W[3] M[1,2]

### 🔹 M[1,3]
- W[1] M[1,3], W[1,2] M[1,3], W[1,2,3] M[1,3], W[2,3] M[1,3], W[1,3] M[1,3], W[3] M[1,3]

> ❌ **Any structure outside this matrix is INVALID and discarded immediately**

---

## 4️⃣ CONVERSION WHITELIST (AUTHORITATIVE)

⚠️ **ONLY the patterns listed below are allowed to convert**  
Structural validity alone does NOT grant conversion.

### ✅ ALLOWED CONVERSIONS
- **W[0] M[0]** → **BIG CONVERT ✓✓**  
- **W[2] M[1]** → Convert ✓  
- **W[1,3] M[3,2]** → Convert ✓  
- **W[0] M[4]** → Convert  
- **W[1,2] M[1]** → Convert ✓  
- **W[6] M[1]** → *0–1 conditional convert*  
- **W[2,3] M[6]** → Convert *(heavily marked)*  
- **W[3] M[5]** → **Strong convert ✓✓**  
- **W[3] M[1]** → Convert ✓  

> ❌ **Anything not listed above = NO CONVERT**

---

## 5️⃣ CONVERSION RULES (LOCKED)
- ✔ Structural validity ≠ conversion  
- ✔ Conversion happens **ONLY** if pattern appears in whitelist  
- ❌ Any conflicting or earlier rules are **discarded**  
- ✔ Strength markers (✓ / ✓✓ / heavy) indicate **priority only**  
- ✔ Crossed-out rules are **permanently invalid**  
- ✔ If duplicates exist, **explicit "convert" wins**  

---

## 6️⃣ NUMBER DIFFERENCE RULE (ACTIVE)
- GT conversion happens **BEFORE** number difference  
- Difference is applied **AFTER conversion**  
- Allowed difference ranges: ±1, ±2, ±3, ±4 *(commonly used)*  
- Difference performance may be audited separately  

---

## 7️⃣ OUTPUT RULES (USER-SPECIFIC)
- Predictions must **maintain natural order**  
- ❌ No rearranging (ascending / descending forbidden)  
- ❌ No reserve line unless explicitly requested  
- When applicable: **3rd number = DIRECT-1** *(always noted as reminder)*  
`;
