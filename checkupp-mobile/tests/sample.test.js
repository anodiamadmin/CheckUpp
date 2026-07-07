describe("Sample Test Suite", () => {
  test("should add two numbers correctly", () => {
    const result = 2 + 3;

    expect(result).toBe(5);
  });

  test("should verify a string", () => {
    const appName = "CheckUpp";

    expect(appName).toBe("CheckUpp");
  });

  test("should verify an array contains a value", () => {
    const tests = ["Blood Test", "ECG", "X-Ray"];

    expect(tests).toContain("ECG");
  });

  test("should verify a boolean value", () => {
    const isLoggedIn = true;

    expect(isLoggedIn).toBe(true);
  });

  test("should verify an object", () => {
    const user = {
      name: "John",
      age: 30,
    };

    expect(user).toEqual({
      name: "John",
      age: 30,
    });
  });
});