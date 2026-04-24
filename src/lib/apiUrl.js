// In dev, empty string → relative URLs → Vite proxy forwards to localhost:8000
// In production, set VITE_API_URL to the deployed backend URL (e.g. https://xyz.railway.app)
const API_BASE = import.meta.env.VITE_API_URL ?? '';
export default API_BASE;
