Auth screens (Login / Register)

Quick notes to get started with the example auth screens added in this project:

- Screens: `app/login.tsx` and `app/register.tsx` (file-based routes: `/login` and `/register`).
- The example makes network requests to a placeholder base URL at `app/lib/auth.ts` (replace `https://example.com/api` with your backend URL).
- The example now stores the returned token securely using `expo-secure-store`, and the app includes a simple `AuthProvider` + `useAuth` hook in `app/context/AuthContext.tsx` to manage auth state.

How to test:

1. Install secure store: `expo install expo-secure-store`.
2. Run the app: `npm install && npx expo start`.
3. Open the app and use the home screen buttons to navigate to **Login** or **Register**.
4. Replace the URLs in `app/lib/auth.ts` with your real backend if needed.

Example backend endpoints expected (JSON):

- POST /auth/login { email, password } -> 200 { token, user }
- POST /auth/register { name, email, password } -> 200 { token, user }

---

Local backend (example server included)

A minimal Express + SQLite server is included in `server/` for testing locally:

1. cd server && npm install
2. copy `.env.example` to `.env` and set `JWT_SECRET`
3. npm start

Then update `app/lib/auth.ts`:

- Replace `http://<YOUR_SERVER_IP>:4000` with your machine's IP (e.g. `http://192.168.1.100:4000`) or use `http://10.0.2.2:4000` for Android emulator.

If you want, I can add secure storage and a global auth context next. Let me know!