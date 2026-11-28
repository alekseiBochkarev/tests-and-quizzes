/**
 * Минимальный разбор CSS-файла для тестов палитр VIS-01.
 *
 * Задача — прочитать `app/globals.css` как данные: блоки
 * `[data-topic-theme="…"]`, их токены, стопы градиентов, прозрачности.
 * Готовые CSS-парсеры в проект не добавляем: нужного объёма хватает
 * собственного разбора, а тест не должен тянуть зависимости.
 *
 * Ограничения (осознанные): не поддерживаются вложенные правила внутри
 * селекторов, комментарии вырезаются заранее, `var()` не вычисляется.
 * Для `globals.css` этого достаточно, и при неожиданной форме тест
 * падает с внятной ошибкой, а не молча пропускает проверку.
 */

/** Вырезает `/* … *\/`, чтобы закомментированный CSS не попадал в проверки. */
export function stripCssComments(css: string): string {
  return css.replace(/\/\*[\s\S]*?\*\//g, "");
}

function blockBodyAt(css: string, openIndex: number): string {
  let depth = 0;

  for (let index = openIndex; index < css.length; index += 1) {
    const char = css[index];

    if (char === "{") {
      depth += 1;
    } else if (char === "}") {
      depth -= 1;
      if (depth === 0) return css.slice(openIndex + 1, index);
    }
  }

  throw new Error(`Не найден конец CSS-блока, открытого на позиции ${openIndex}`);
}

/**
 * Тела всех правил для селектора в порядке файла — так видно каскад целиком
 * (включая `@media print`, где то же правило может что-то отключать).
 *
 * Селектор сравнивается целиком, поэтому `[data-topic-theme="animals"]`
 * не путается с `[data-topic-theme="animals"] .topic-hero::before`.
 */
export function ruleBodies(css: string, selector: string): string[] {
  const headerPattern = /([^{}]+)\{/g;
  const bodies: string[] = [];
  let match: RegExpExecArray | null = headerPattern.exec(css);

  while (match !== null) {
    // Прелюдия правила начинается после предыдущего «;» или «}»: отбрасываем
    // хвост объявлений, иначе `@theme` склеится с `@import "…";`.
    const prelude = (match[1] ?? "").split(/[;}]/).pop() ?? "";
    const selectors = prelude.split(",").map((item) => item.trim());

    if (selectors.includes(selector)) {
      const openIndex = match.index + match[0].length - 1;
      bodies.push(blockBodyAt(css, openIndex));
    }

    match = headerPattern.exec(css);
  }

  return bodies;
}

/** Тело последнего правила для селектора: побеждает то, что ниже в файле. */
export function ruleBody(css: string, selector: string): string | null {
  const bodies = ruleBodies(css, selector);
  return bodies.length > 0 ? (bodies[bodies.length - 1] ?? null) : null;
}

/** Разбирает объявления блока: `--token: value` и обычные свойства. */
export function declarations(body: string): ReadonlyMap<string, string> {
  const result = new Map<string, string>();
  let current = "";
  let depth = 0;
  let quote: string | null = null;

  const flush = (): void => {
    const separator = current.indexOf(":");
    if (separator > 0) {
      const name = current.slice(0, separator).trim();
      const value = current.slice(separator + 1).trim();
      if (name) result.set(name, value.replace(/\s+/g, " ").trim());
    }
    current = "";
  };

  for (const char of body) {
    if (quote !== null) {
      if (char === quote) quote = null;
    } else if (char === '"' || char === "'") {
      quote = char;
    } else if (char === "(") {
      depth += 1;
    } else if (char === ")") {
      depth -= 1;
    } else if (char === ";" && depth === 0) {
      flush();
      continue;
    }

    current += char;
  }

  flush();

  return result;
}

/** HEX-цвета значения по порядку: стопы градиента заданы именно так. */
export function hexStops(value: string): string[] {
  return value.match(/#[0-9a-f]{6}\b|#[0-9a-f]{3}\b/gi) ?? [];
}

/** Альфы всех `rgba(…)` значения. `rgb(…)` без альфы не считается: он непрозрачен. */
export function rgbaAlphas(value: string): number[] {
  const pattern = /rgba\(\s*[\d.]+\s*,\s*[\d.]+\s*,\s*[\d.]+\s*,\s*([\d.]+)\s*\)/gi;
  const alphas: number[] = [];

  for (const match of value.matchAll(pattern)) {
    const alpha = Number.parseFloat(match[1] ?? "");
    if (Number.isFinite(alpha)) alphas.push(alpha);
  }

  return alphas;
}

/** Тайл — это `url("data:image/svg+xml,…")`, а не градиент. */
export function isSvgTile(value: string): boolean {
  return /^url\(\s*["']data:image\/svg\+xml/i.test(value.trim());
}

/**
 * Прозрачности, зашитые в сам SVG-тайл: `stroke-opacity`, `fill-opacity`,
 * `opacity`. Возвращаются все, чтобы тест видел максимум, а не первое совпадение.
 */
export function svgTileOpacities(value: string): number[] {
  let decoded: string;

  try {
    decoded = decodeURIComponent(value);
  } catch {
    throw new Error("SVG-тайл в CSS не декодируется как URL-encoded data URI");
  }

  const pattern = /\b(stroke-opacity|fill-opacity|opacity)\s*=\s*["']?([\d.]+)/gi;
  const opacities = new Set<number>();

  for (const match of decoded.matchAll(pattern)) {
    const opacity = Number.parseFloat(match[2] ?? "");
    if (Number.isFinite(opacity)) opacities.add(opacity);
  }

  return [...opacities];
}
