/**
 * Identity of the operator for the privacy policy and terms.
 * Leave a field null until you have the real value. Do not invent one.
 * GDPR requires the controller's name and a contact address before this
 * notice is complete.
 */
export const legal = {
  productName: "RoleMirror",
  lastUpdated: "27 October 2026",
  controllerName: "Cristea Raul",
  postalAddress: "Str. Atanasie Demostene nr 30, sector 5, Bucharest, Romania",
  privacyEmail: "cristea.rauldorian@gmail.com",
  legalEmail: "cristea.rauldorian@gmail.com",
  /** Country or state whose law governs the terms, for example "England and Wales". */
  governingLaw: "Romania",
}

export function legalContactReady() {
  return Boolean(
    legal.controllerName &&
      legal.postalAddress &&
      legal.privacyEmail &&
      legal.legalEmail &&
      legal.governingLaw,
  )
}
