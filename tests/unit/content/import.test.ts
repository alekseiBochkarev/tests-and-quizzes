import { describe, expect, it } from "vitest";

import {
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
    expect(codes(plan.issues)).toEqual(["missing_explanation", "duplicate_in_file"]);
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
    expect(plan.issues[0]?.message).toContain("#2");
    expect(hasErrors(plan.issues)).toBe(false);
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
