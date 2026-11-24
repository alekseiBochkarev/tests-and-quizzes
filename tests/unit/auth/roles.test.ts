import { describe, expect, it } from "vitest";

import { ADMIN_NAV_ITEMS, visibleAdminNav } from "@/lib/admin/nav";
import { isAdminRole, isStaffRole, isUserRole, roleLabel } from "@/lib/auth/roles";

describe("isStaffRole", () => {
  it("пускает редактора и администратора", () => {
    expect(isStaffRole("EDITOR")).toBe(true);
    expect(isStaffRole("ADMIN")).toBe(true);
  });

  it("не пускает обычного пользователя и пустые значения", () => {
    for (const role of ["USER", "guest", "editor", "admin", "", null, undefined]) {
      expect(isStaffRole(role)).toBe(false);
    }
  });
});

describe("isAdminRole", () => {
  it("администратор — только ADMIN", () => {
    expect(isAdminRole("ADMIN")).toBe(true);
    expect(isAdminRole("EDITOR")).toBe(false);
    expect(isAdminRole("USER")).toBe(false);
    expect(isAdminRole(null)).toBe(false);
  });
});

describe("isUserRole", () => {
  it("распознаёт роли из схемы", () => {
    for (const role of ["USER", "EDITOR", "ADMIN"]) {
      expect(isUserRole(role)).toBe(true);
    }
    expect(isUserRole("OWNER")).toBe(false);
    expect(isUserRole(null)).toBe(false);
  });
});

describe("roleLabel", () => {
  it("возвращает понятные подписи без технических терминов", () => {
    expect(roleLabel("ADMIN")).toBe("Администратор");
    expect(roleLabel("EDITOR")).toBe("Редактор");
    expect(roleLabel("USER")).toBe("Пользователь");
    expect(roleLabel(null)).toBe("Пользователь");
  });
});

describe("visibleAdminNav", () => {
  it("редактор видит контентные разделы, но не пользователей и аналитику", () => {
    const hrefs = visibleAdminNav("EDITOR").map((item) => item.href);

    expect(hrefs).toContain("/admin/topics");
    expect(hrefs).toContain("/admin/quizzes");
    expect(hrefs).toContain("/admin/import");
    expect(hrefs).not.toContain("/admin/users");
    expect(hrefs).not.toContain("/admin/analytics");
  });

  it("администратор видит все разделы", () => {
    const hrefs = visibleAdminNav("ADMIN").map((item) => item.href);

    expect(hrefs).toEqual(ADMIN_NAV_ITEMS.map((item) => item.href));
  });

  it("обычный пользователь и гость не получают ни одного раздела", () => {
    expect(visibleAdminNav("USER")).toEqual([]);
    expect(visibleAdminNav(null)).toEqual([]);
  });
});
