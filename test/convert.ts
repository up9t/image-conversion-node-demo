import assert from "node:assert";
import test from "node:test";
import { readFile } from "node:fs/promises";

const BASE_URL = "http://localhost:8080";

test("convert empty body", async function() {
  const response = await fetch(`${BASE_URL}/convert`, {
    method: "POST",
  });

  assert.strictEqual(response.status, 400);
  const body = await response.json() as { failed: string };
  assert.strictEqual(body.failed, "file path not found");
});

test("convert non file body", async function() {
  const formData = new FormData();
  formData.append("notImage", "some text content");

  const response = await fetch(`${BASE_URL}/convert`, {
    method: "POST",
    body: formData,
  });

  assert.strictEqual(response.status, 400);
  const body = await response.json() as { failed: string };
  assert.strictEqual(body.failed, "file path not found");
});

test("convert non image body", async function() {
  const formData = new FormData();
  formData.append("image", "some text content");

  const response = await fetch(`${BASE_URL}/convert`, {
    method: "POST",
    body: formData,
  });

  // Text content is not a valid image file
  assert.strictEqual(response.status, 500);
  const body = await response.json() as { message: string };
  assert.strictEqual(body.message, "failed to transform image");
});

test("convert image formats", (t, done) => {
  const tests = [
    // png to others
    { name: "convert png to jpeg", filePath: "fixtures/test.png", expectedMimeType: "image/jpeg" },
    { name: "convert png to png", filePath: "fixtures/test.png", expectedMimeType: "image/png" },
    { name: "convert png to webp", filePath: "fixtures/test.png", expectedMimeType: "image/webp" },
    // jpeg to others
    { name: "convert jpeg to jpeg", filePath: "fixtures/test.jpeg", expectedMimeType: "image/jpeg" },
    { name: "convert jpeg to png", filePath: "fixtures/test.jpeg", expectedMimeType: "image/png" },
    { name: "convert jpeg to webp", filePath: "fixtures/test.jpeg", expectedMimeType: "image/webp" },
    // webp to others
    { name: "convert webp to jpeg", filePath: "fixtures/test.webp", expectedMimeType: "image/jpeg" },
    { name: "convert webp to png", filePath: "fixtures/test.webp", expectedMimeType: "image/png" },
    { name: "convert webp to webp", filePath: "fixtures/test.webp", expectedMimeType: "image/webp" },
    // heic to others
    { name: "convert heic to jpeg", filePath: "fixtures/test.heic", expectedMimeType: "image/jpeg" },
    { name: "convert heic to png", filePath: "fixtures/test.heic", expectedMimeType: "image/png" },
    { name: "convert heic to webp", filePath: "fixtures/test.heic", expectedMimeType: "image/webp" },
  ];

  for (const tes of tests) {
    t.test(tes.name, async () => {
      const fileBuffer = await readFile(tes.filePath);
      const blob = new Blob([fileBuffer]);

      const formData = new FormData();
      const fileName = tes.filePath.split("/").pop() || "test-image";
      formData.append("image", blob, fileName);

      const response = await fetch(`${BASE_URL}/convert`, {
        method: "POST",
        body: formData,
      });

      assert.strictEqual(
        response.status,
        200,
        `Expected status 200 for ${tes.name}, got ${response.status}`
      );

      const contentType = response.headers.get("content-type");
      assert.ok(
        contentType?.startsWith(tes.expectedMimeType),
        `Expected content-type ${tes.expectedMimeType}, got ${contentType}`
      );

      const arrayBuffer = await response.arrayBuffer();
      assert.ok(
        arrayBuffer.byteLength > 0,
        `Expected non-empty response for ${tes.name}`
      );
    });
  }

  done();
});
