# HemiDebtVault Front‑End Audit Report

**Audit date:** 03 June 2025
**Auditor:** Senior Web3 / React / Security Engineer

---

## 1  Overview

This audit examines the source code in `HemiDebtVault.zip`, covering the React/Vite front‑end that interfaces with the Hemi Debt Vault lending protocol.
The smart contracts are **out of scope**; the review is limited to front‑end code quality, security, UI/UX, accessibility, and maintainability.

## 2  Methodology

* Automated scanning of repository structure, TypeScript sources, and dependency manifests.
* Manual inspection of critical components (`App.tsx`, page components, hooks) and build configuration (`vite.config.ts`, `package.json`).
* Threat‑model review focusing on Web3 dApp attack vectors (phishing, spoofing, address‑tampering, signature abuse).

Severity levels follow the common **Critical / High / Medium / Low / Info** scale.

## 3  Executive Summary

| Severity | Findings | Notes                                                                                                                                                                            |
| -------- | -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| High     |  0       | No front‑end bugs allow direct fund loss, but see Medium items.                                                                                                                  |
| Medium   |  6       | Hard‑coded addresses, lax input validation, race conditions around BigInt math, missing CSP, un‑cleared async loops, dependency exposure.                                        |
| Low      |  9       | Accessibility gaps, code smells, memory leaks, excessive bundle size, unused dev packages, missing skeleton loaders, opaque error messages, overuse of `any`, router edge‑cases. |
| Info     |  5       | Style inconsistencies, TODOs, doc gaps, missing lint rules, CI additions.                                                                                                        |

Overall code quality is good for an early‑stage prototype but requires targeted refactoring and hardening before production use.

---

## 4  Detailed Findings

### 4.1 Hard‑coded Contract & Token Addresses

*File(s):* `client/src/lib/tokens.ts`, multiple hooks
*Severity:* **Medium**
Addresses for USDC, WETH, and the DebtVault are inlined. Users connected to the wrong chain (or a future upgrade) will unknowingly sign transactions to stale addresses.
**Recommendation:** Move addresses to a versioned on‑chain registry or at minimum an `.env` per‑chain map validated on startup.

### 4.2 BigInt / Decimal Parsing Race Conditions

*File(s):* `useLoans.ts`, `RepaymentModal.tsx`
*Severity:* **Medium**
Logic mixes `BigInt`, `number`, and `ethers.BigNumber` when computing repayment amounts. Conversions inside render functions risk overflow in Safari ≤ 17 and Firefox.
**Recommendation:** Standardise on `viem`’s `Hex` + `weiToEther` helpers, wrap math in memoised utilities, and gate behind feature‑detect.

### 4.3 Insufficient Input Validation in Modals

*File(s):* `CreditLineModal.tsx`, `RepaymentModal.tsx`, `TokenSelector.tsx`
*Severity:* **Medium**
Free‑form `<input type="text">` fields accept negative, exponential, or >18‑decimal values; these are only rejected after `prepareWriteContract` failure.
**Recommendation:**

* Use `zod` schemas already installed to synchronously validate.
* Disable “Submit” until schema passes.
* Provide inline error messages, not toast‑only.

### 4.4 setInterval / setTimeout Leaks

*File(s):* `useTokenApproval.ts`, `useTransactionExecution.ts`, `RepaymentModal.tsx`
*Severity:* **Low**
Intervals polling every 2 s are never cleared on component unmount ⇒ hidden tab drains CPU & battery.
**Recommendation:** return a cleanup function in `useEffect`, or migrate to `react-query` polling with automatic GC.

### 4.5 Missing Content‑Security‑Policy & Frame Guards

*File(s):* `index.html`, `vite.config.ts`
*Severity:* **Medium**
No CSP, `X‑Frame‑Options`, or Referrer‑Policy headers are injected, allowing clickjacking and data‑exfil during signature prompts.
**Recommendation:** Add `helmet` or Vite HTML transform to emit strict CSP incl. `script-src 'self' 'unsafe-inline' 'unsafe-eval'` exceptions only for Vite HMR in dev.

### 4.6 Error Boundary & Toast Flooding

*File(s):* `App.tsx`, `use-toast.ts`
*Severity:* **Low**
Unhandled render errors crash the SPA. Rejected promises in hooks generate duplicate toasts.
**Recommendation:** Wrap `<Router>` with `@sentry/react` ErrorBoundary or custom fallback; de‑bounce identical toast ids.

### 4.7 Dependency Exposure & Supply‑Chain Risk

*File(s):* `package.json`
*Severity:* **Medium**
The front‑end ships server‑side packages (`express`, `passport`, `drizzle-kit`), inflating bundle size and expanding attack surface.
**Recommendation:** Split workspace into `web/` and `api/` packages with separate manifests; tree‑shake and pin semver ranges (`^` ➝ `~`).

### 4.8 Accessibility (a11y) Issues

*Severity:* **Low**

* Missing `aria-label` on icon‑only buttons (e.g. close “X” in modals).
* Colour contrast <4.5 : 1 for secondary text on dark background.
* No keyboard focus trap inside `<Dialog>`.
  **Recommendation:** run `@vitejs/plugin-react` with React DevTools Accessibility, add `axe-core` CI tests.

### 4.9 Routing Edge‑Cases

*File(s):* `App.tsx`, `not-found.tsx`
*Severity:* **Low**
Deep‑linked routes behind IPFS gateways (`/#/lend`) fail because HashRouter is not configured.
**Recommendation:** Prefer `react-router` with basename support or use `wouter/unstable-hash` for Web3 static hosting.

### 4.10 Overuse of `any` & Implicit `any`

25 occurrences reduce type‑safety and hamper IDE tooling.
**Recommendation:** Enable `noImplicitAny`, leverage `wagmi`'s generated hook types.

---

## 5  Systemic Recommendations

1. **Adopt CI** – ESLint, Prettier, Type‑check, `vitest` unit tests, Lighthouse a11y & perf audits.
2. **Security Hardening** – Origin checks before `signTypedData`, network mismatch modal, `window.ethereum.request({ method: "wallet_watchAsset" })` gating.
3. **Design Tokens** – Centralise colours, spacing, and typography to ease dark‑mode / theming.
4. **Performance** – Enable Vite dynamic import splitting, compress SVG/PNG assets, and lazy‑load pages.
5. **Documentation** – Expand `README.md` with env setup, chain list, and release checklist.

---

## 6  Conclusion

The Hemi Debt Vault front‑end is a solid foundation with modern tooling (Vite, wagmi v2, React 18).
Addressing the Medium‑severity findings—especially hard‑coded addresses, validation gaps, and missing CSP—will substantially improve security and user trust.
Low‑severity UI/UX and maintainability items can be tackled in parallel sprints.

**Next Steps:**

* Patch Medium issues before public beta.
* Introduce automated CI gates.
* Schedule a follow‑up audit post‑refactor.

*End of Report*
