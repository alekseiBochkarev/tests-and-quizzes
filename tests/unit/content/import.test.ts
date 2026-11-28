import { describe, expect, it } from "vitest";

import {
  areTextsSimilar,
  buildContentHash,
  hasErrors,
  normalizeForHash,
  parseFormsWriterFile,
  parseTopicMap,
  planImport,
  type ImportIssue,
  type TopicMap,
} from "@/lib/content/import";

function loadMap(): TopicMap {
  const parsed = parseTopicMap({
    topics: {
      История: { category: "nauka", topic: "history" },
      География: { category: "priroda", topic: "geography" },
      Физика: { category: "nauka", topic: "exact-sciences" },
      Химия: { category: "nauka", topic: "exact-sciences" },
    },
  });

  expect(parsed.issues).toHaveLength(0);
  return parsed.map;
}

function question(overrides: Record<string, unknown> = {}) {
  return {
    topic: "История",
    question: "В каком году пала Западная Римская империя?",
    options: ["395", "410", "476", "1453"],
    correct_index: 2,
    context: "Последнего императора звали Ромул Августул.",
    explanation: "В 476 году Одоакр низложил Ромула Августула.",
    ...overrides,
  };
}

function codes(issues: ImportIssue[]): string[] {
  return issues.map((item) => item.code);
}

const map = loadMap();

describe("normalizeForHash", () => {
  it("приводит регистр, ё, кавычки, тире и пробелы к одному виду", () => {
    expect(normalizeForHash("  Ёлка — это «дерево»!  ")).toBe('елка - это "дерево"');
  });

  it("не зависит от завершающей пунктуации", () => {
    expect(normalizeForHash("Кто написал Мону Лизу?")).toBe(
      normalizeForHash("Кто написал Мону Лизу"),
    );
  });

  it("не зависит от внешних кавычек вокруг всего текста", () => {
    expect(normalizeForHash("«Война и мир»")).toBe(normalizeForHash("Война и мир"));
  });

  it("сохраняет кавычки внутри текста", () => {
    expect(normalizeForHash("Фильм «Москва слезам не верит»")).toContain('"москва');
  });
});

describe("areTextsSimilar", () => {
  it("видит переформулированный вопрос", () => {
    expect(
      areTextsSimilar(
        "В каком году пала Западная Римская империя?",
        "В каком году прекратила существование Западная Римская империя?",
      ),
    ).toBe(true);
  });

  it("не путает разные вопросы одной темы", () => {
    expect(
      areTextsSimilar(
        "В каком году пала Западная Римская империя?",
        "Кто был первым президентом Соединённых Штатов Америки?",
      ),
    ).toBe(false);
  });

  it("не сравнивает короткие тексты, где совпадение случайно", () => {
    expect(areTextsSimilar("Кто это?", "Кто там?")).toBe(false);
  });
});

describe("buildContentHash", () => {
  const base = {
    topic: "history",
    text: "Сколько струн у классической гитары?",
    options: ["4", "6", "7", "12"],
    correctIndex: 1,
  };

  it("возвращает sha256 в hex", () => {
    expect(buildContentHash(base)).toMatch(/^[0-9a-f]{64}$/);
  });

  it("не меняется при перемешивании вариантов и сдвиге correct_index", () => {
    const shuffled = {
      ...base,
      options: ["12", "6", "4", "7"],
      correctIndex: 1,
    };

    expect(buildContentHash(shuffled)).toBe(buildContentHash(base));
  });

  it("меняется, если правильный ответ другой", () => {
    const wrongAnswer = { ...base, correctIndex: 0 };
    expect(buildContentHash(wrongAnswer)).not.toBe(buildContentHash(base));
  });

  it("меняется, если вопрос из другой темы", () => {
    expect(buildContentHash({ ...base, topic: "music" })).not.toBe(buildContentHash(base));
  });
});

describe("parseFormsWriterFile", () => {
  it("принимает объект { questions } и голый массив", () => {
    expect(parseFormsWriterFile({ questions: [question()] }).questions).toHaveLength(1);
    expect(parseFormsWriterFile([question()]).questions).toHaveLength(1);
  });

  it("отклоняет файл другого формата", () => {
    const parsed = parseFormsWriterFile({ items: [] });
    expect(codes(parsed.issues)).toEqual(["invalid_file"]);
  });
});

describe("parseTopicMap", () => {
  it("отклоняет не-slug значения", () => {
    const parsed = parseTopicMap({
      topics: { История: { category: "Наука", topic: "history" } },
    });

    expect(parsed.map.size).toBe(0);
    expect(codes(parsed.issues)).toEqual(["invalid_map"]);
  });

  it("отклоняет пустой маппинг", () => {
    const parsed = parseTopicMap({ topics: {} });
    expect(codes(parsed.issues)).toEqual(["invalid_map"]);
  });

  it("отклоняет неизвестную версию маппинга", () => {
    const parsed = parseTopicMap({
      version: 2,
      topics: { История: { category: "nauka", topic: "history" } },
    });

    expect(parsed.map.size).toBe(0);
    expect(codes(parsed.issues)).toEqual(["invalid_map"]);
  });
});

describe("planImport", () => {
  it("готовит вопрос с хешем и статусом PUBLISHED", () => {
    const plan = planImport({ questions: [question()] }, map);

    expect(plan.issues).toHaveLength(0);
    expect(plan.items).toHaveLength(1);

    const item = plan.items[0]!;
    expect(item.topicSlug).toBe("history");
    expect(item.categorySlug).toBe("nauka");
    expect(item.status).toBe("PUBLISHED");
    expect(item.contentHash).toMatch(/^[0-9a-f]{64}$/);
    expect(item.correctIndex).toBe(2);
  });

  it("видит дубль с перемешанными вариантами и оставляет один вопрос", () => {
    const plan = planImport(
      {
        questions: [
          question(),
          question({ options: ["476", "395", "1453", "410"], correct_index: 0 }),
        ],
      },
      map,
    );

    expect(plan.items).toHaveLength(1);
    expect(codes(plan.issues)).toEqual(["duplicate_in_file"]);
    expect(hasErrors(plan.issues)).toBe(false);
  });

  it("сообщает о дубликате внутри файла и оставляет первый вопрос", () => {
    const plan = planImport(
      {
        questions: [
          question(),
          question({ question: "В каком году пала Западная Римская империя" }),
        ],
      },
      map,
    );

    expect(plan.items).toHaveLength(1);
    expect(codes(plan.issues)).toEqual(["duplicate_in_file"]);
    expect(plan.issues[0]?.severity).toBe("warning");
    expect(plan.issues[0]?.message).toContain("#2");
  });

  it("предпочитает дубль с объяснением, а не пустой черновик", () => {
    const plan = planImport(
      {
        questions: [question({ explanation: "" }), question({ explanation: "Полное объяснение." })],
      },
      map,
    );

    expect(plan.items).toHaveLength(1);
    expect(plan.items[0]?.status).toBe("PUBLISHED");
    expect(plan.items[0]?.explanation).toBe("Полное объяснение.");
    // Предупреждение о черновике относится к вопросу #1, которого нет в плане.
    expect(codes(plan.issues)).toEqual(["duplicate_in_file"]);
  });

  it("не публикует два вопроса с одним текстом и разными ответами", () => {
    const plan = planImport(
      {
        questions: [
          question({ options: ["395", "410", "476", "1453"], correct_index: 2 }),
          question({ options: ["395", "410", "476", "1453"], correct_index: 0 }),
        ],
      },
      map,
    );

    expect(plan.items).toHaveLength(1);
    expect(codes(plan.issues)).toEqual(["conflicting_duplicate"]);
    expect(plan.issues[0]?.message).toContain("что у вопроса #1");
    expect(hasErrors(plan.issues)).toBe(false);
  });

  it("считает дублем вопрос из двух исходных тем одной темы каталога", () => {
    const plan = planImport(
      {
        questions: [
          question({ topic: "Физика", question: "Чему равна скорость света в вакууме?" }),
          question({ topic: "Химия", question: "Чему равна скорость света в вакууме?" }),
        ],
      },
      map,
    );

    expect(plan.items).toHaveLength(1);
    expect(plan.items[0]?.topicSlug).toBe("exact-sciences");
    expect(codes(plan.issues)).toEqual(["duplicate_in_file"]);
  });

  it("отправляет вопрос без объяснения в черновики", () => {
    const plan = planImport({ questions: [question({ explanation: "" })] }, map);

    expect(plan.issues).toHaveLength(1);
    expect(plan.issues[0]?.code).toBe("missing_explanation");
    expect(plan.issues[0]?.severity).toBe("warning");
    expect(plan.items[0]?.status).toBe("DRAFT");
  });

  it("не падает, если context пустой", () => {
    const plan = planImport({ questions: [question({ context: "" })] }, map);
    expect(plan.items[0]?.context).toBeNull();
    expect(plan.issues).toHaveLength(0);
  });

  it("отклоняет вопрос с неизвестной темой и указывает номер и тему", () => {
    const plan = planImport({ questions: [question({ topic: "Астрономия" })] }, map);

    expect(plan.items).toHaveLength(0);
    expect(plan.issues[0]?.code).toBe("unknown_topic");
    expect(plan.issues[0]?.index).toBe(1);
    expect(plan.issues[0]?.sourceTopic).toBe("Астрономия");
    expect(plan.issues[0]?.message).toContain("topic-map.json");
  });

  it("отклоняет пустую тему", () => {
    const plan = planImport({ questions: [question({ topic: "  " })] }, map);
    expect(codes(plan.issues)).toEqual(["empty_topic"]);
  });

  it("отклоняет пустой текст вопроса", () => {
    const plan = planImport({ questions: [question({ question: "" })] }, map);
    expect(codes(plan.issues)).toEqual(["empty_question"]);
  });

  it("требует ровно 4 варианта", () => {
    const plan = planImport({ questions: [question({ options: ["1", "2", "3"] })] }, map);
    expect(codes(plan.issues)).toEqual(["options_count"]);
  });

  it("отклоняет пустой вариант", () => {
    const plan = planImport({ questions: [question({ options: ["1", "2", " ", "4"] })] }, map);
    expect(codes(plan.issues)).toEqual(["empty_option"]);
  });

  it("отклоняет повторяющиеся варианты с учётом нормализации", () => {
    const plan = planImport(
      { questions: [question({ options: ["Да", "да", "Нет", "Не знаю"] })] },
      map,
    );
    expect(codes(plan.issues)).toEqual(["duplicate_option"]);
  });

  it("отклоняет correct_index вне диапазона", () => {
    const plan = planImport({ questions: [question({ correct_index: 4 })] }, map);
    expect(codes(plan.issues)).toEqual(["invalid_correct_index"]);
  });

  it("собирает ошибки по всем вопросам, а валидные оставляет", () => {
    const plan = planImport(
      {
        questions: [
          question(),
          question({ question: "Битый вопрос", options: ["а", "б"] }),
          question({ question: "Без темы", topic: "" }),
        ],
      },
      map,
    );

    expect(plan.items).toHaveLength(1);
    expect(codes(plan.issues)).toEqual(["options_count", "empty_topic"]);
    expect(hasErrors(plan.issues)).toBe(true);
  });

  it("отклоняет пустой файл", () => {
    const plan = planImport({ questions: [] }, map);
    expect(codes(plan.issues)).toEqual(["empty_file"]);
    expect(hasErrors(plan.issues)).toBe(true);
  });
});

describe("иллюстрации в импорте", () => {
  const image = {
    image_url: "https://upload.wikimedia.org/wikipedia/commons/example.jpg",
    image_license: "CC BY-SA 4.0",
    image_source: "https://commons.wikimedia.org/wiki/File:Example.jpg",
    image_alt: "Фотография здания Большого театра",
  };

  it("переносит поля изображения в элемент импорта", () => {
    const plan = planImport({ questions: [question(image)] }, map);

    expect(plan.issues).toHaveLength(0);
    const item = plan.items[0]!;
    expect(item.imageUrl).toBe(image.image_url);
    expect(item.imageLicense).toBe(image.image_license);
    expect(item.imageSource).toBe(image.image_source);
    expect(item.imageAlt).toBe(image.image_alt);
  });

  it("оставляет поля пустыми, если изображения нет", () => {
    const plan = planImport({ questions: [question()] }, map);
    const item = plan.items[0]!;
    expect(item.imageUrl).toBeNull();
    expect(item.imageLicense).toBeNull();
    expect(item.imageSource).toBeNull();
    expect(item.imageAlt).toBeNull();
  });

  it("требует https-ссылку", () => {
    const plan = planImport(
      { questions: [question({ ...image, image_url: "http://example.com/photo.jpg" })] },
      map,
    );
    expect(codes(plan.issues)).toEqual(["invalid_image_url"]);
    expect(plan.items).toHaveLength(0);
  });

  it("требует лицензию", () => {
    const plan = planImport({ questions: [question({ ...image, image_license: "" })] }, map);
    expect(codes(plan.issues)).toEqual(["missing_image_license"]);
  });

  it("не принимает лицензию, которая не разрешает свободное использование", () => {
    const plan = planImport(
      { questions: [question({ ...image, image_license: "All rights reserved" })] },
      map,
    );
    expect(codes(plan.issues)).toEqual(["image_license_not_allowed"]);
  });

  it("требует описание для незрячих", () => {
    const plan = planImport({ questions: [question({ ...image, image_alt: "" })] }, map);
    expect(codes(plan.issues)).toEqual(["missing_image_alt"]);
  });

  it("предупреждает о полях изображения без ссылки", () => {
    const plan = planImport(
      { questions: [question({ image_license: "CC0", image_alt: "Что-то" })] },
      map,
    );
    expect(codes(plan.issues)).toEqual(["image_fields_ignored"]);
    expect(plan.issues[0]?.severity).toBe("warning");
    expect(plan.items[0]?.imageUrl).toBeNull();
  });
});
