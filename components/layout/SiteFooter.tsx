import Link from "next/link";

const footerLinkClasses = "underline underline-offset-4 hover:text-accent";

export function SiteFooter() {
  return (
    <footer className="mt-16 border-t border-line bg-surface">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-4 px-4 py-8 text-base text-muted">
        <nav aria-label="Правовая информация" className="flex flex-wrap gap-x-6 gap-y-2">
          <Link href="/legal/terms" className={footerLinkClasses}>
            Пользовательское соглашение
          </Link>
          <Link href="/legal/privacy" className={footerLinkClasses}>
            Политика конфиденциальности
          </Link>
          <Link href="/legal/privacy#contact" className={footerLinkClasses}>
            Связаться с нами
          </Link>
        </nav>
        <p>© 2026 Тесты. Проверяйте себя в спокойном темпе.</p>
      </div>
    </footer>
  );
}
