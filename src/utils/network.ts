export const checkNetwork = () => {
  if (!navigator.onLine) {
    throw new Error("You're offline. Please check your internet connection.");
  }
}; 