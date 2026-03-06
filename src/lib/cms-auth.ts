/**
 * In-memory store for the CMS password.
 * Set after successful CMS unlock; used to authenticate admin edge
 * function calls without storing the password anywhere persistent.
 */

let _cmsPassword = "";

export function setCmsPassword(pw: string) {
  _cmsPassword = pw;
}

export function getCmsPassword(): string {
  return _cmsPassword;
}

export function clearCmsPassword() {
  _cmsPassword = "";
}
