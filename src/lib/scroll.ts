import type Lenis from "lenis";

// Синглтон-держатель инстанса Lenis: секции просят плавный скролл к якорю
export const lenisHolder: { current: Lenis | null } = { current: null };
