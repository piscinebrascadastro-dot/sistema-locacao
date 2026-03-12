/**
 * (DEPRECADO)
 *
 * Nesta versão do projeto o painel ADM funciona em modo **token-only**,
 * sem cookie/sessão. Este arquivo fica apenas por compatibilidade com
 * referências antigas.
 */

export const ADMIN_COOKIE_NAME = "adm_session";

export function getAdminCookieName() {
  return ADMIN_COOKIE_NAME;
}
