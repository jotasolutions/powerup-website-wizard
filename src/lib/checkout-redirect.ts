/**
 * Redirige a Stripe Checkout. En iframes embebidos `location.assign` en el frame
 * hijo no lleva al usuario a Stripe; hay que usar top o nueva pestaña.
 */
export function redirectToCheckout(checkoutUrl: string): "top" | "popup" | "same" {
  if (window.self !== window.top) {
    try {
      window.top!.location.assign(checkoutUrl);
      return "top";
    } catch {
      const popup = window.open(checkoutUrl, "_blank", "noopener,noreferrer");
      if (popup) return "popup";
    }
  }

  window.location.assign(checkoutUrl);
  return "same";
}
