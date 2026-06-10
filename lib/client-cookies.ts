export function getClientCookies() {
  if (typeof document === 'undefined') {
    return { userRole: '', userId: '', userEmail: '', userName: '', isLoggedIn: false }
  }
  const cookies = document.cookie.split(';').reduce((acc, cookie) => {
    const [key, value] = cookie.trim().split('=')
    acc[key] = value
    return acc
  }, {} as Record<string, string>)
  return {
    userRole: cookies.userRole || '',
    userId: cookies.userId || '',
    userEmail: cookies.userEmail || '',
    userName: cookies.userName || '',
    isLoggedIn: cookies.isLoggedIn === 'true',
  }
}
