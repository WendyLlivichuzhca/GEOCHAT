export function getAuthHeaders() {
  try {
    const savedUser = JSON.parse(localStorage.getItem('geochat_user') || '{}');
    const token = savedUser?.token || localStorage.getItem('geochat_token');
    if (token) {
      return { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };
    }
  } catch (e) {
    // ignore
  }
  return { 'Content-Type': 'application/json' };
} 