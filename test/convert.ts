import assert from "node:assert";
import { readFile } from "node:fs/promises";
import { basename } from "node:path";
import test from "node:test";

const BASE_URL = "http://localhost:8080";

test("convert empty body", async () => {
  const response = await fetch(`${BASE_URL}/convert`, {
    method: "POST",
  });

  assert.strictEqual(response.status, 400);
  const body = (await response.json()) as { failed: string };
  assert.strictEqual(body.failed, "file path not found");
});

test("convert non file body", async () => {
  const formData = new FormData();
  formData.append("image", "some text content");

  const response = await fetch(`${BASE_URL}/convert`, {
    method: "POST",
    body: formData,
  });

  assert.strictEqual(response.status, 400);
  const body = (await response.json()) as { failed: string };
  assert.strictEqual(body.failed, "file path not found");
});

test("convert non image body", async () => {
  const formData = new FormData();
  formData.append("image", "some text content");

  const response = await fetch(`${BASE_URL}/convert`, {
    method: "POST",
    body: formData,
  });

  // Text content is not a valid image file
  assert.strictEqual(response.status, 500);
  const body = (await response.json()) as { message: string };
  assert.strictEqual(body.message, "failed to transform image");
});

test("convert image formats", (t, done) => {
  const tests = [
    // png to others
    {
      name: "convert png to jpeg",
      filePath: "fixtures/sample4.png",
      format: "jpeg",
      expectedMimeType: "image/jpeg",
    },
    {
      name: "convert png to png",
      filePath: "fixtures/sample4.png",
      format: "png",
      expectedMimeType: "image/png",
    },
    {
      name: "convert png to webp",
      filePath: "fixtures/sample4.png",
      format: "webp",
      expectedMimeType: "image/webp",
    },
    // jpeg to others
    {
      name: "convert jpeg to jpeg",
      filePath: "fixtures/sample7.jpeg",
      format: "jpeg",
      expectedMimeType: "image/jpeg",
    },
    {
      name: "convert jpeg to png",
      filePath: "fixtures/sample7.jpeg",
      format: "png",
      expectedMimeType: "image/png",
    },
    {
      name: "convert jpeg to webp",
      filePath: "fixtures/sample7.jpeg",
      format: "webp",
      expectedMimeType: "image/webp",
    },
    // webp to others
    {
      name: "convert webp to jpeg",
      filePath: "fixtures/sample6.webp",
      format: "jpeg",
      expectedMimeType: "image/jpeg",
    },
    {
      name: "convert webp to png",
      filePath: "fixtures/sample6.webp",
      format: "png",
      expectedMimeType: "image/png",
    },
    {
      name: "convert webp to webp",
      filePath: "fixtures/sample6.webp",
      format: "webp",
      expectedMimeType: "image/webp",
    },
    // heic to others
    {
      name: "convert heic to jpeg 1",
      filePath: "fixtures/sample2.heic",
      format: "jpeg",
      expectedMimeType: "image/jpeg",
    },
    {
      name: "convert heic to png 1",
      filePath: "fixtures/sample2.heic",
      format: "png",
      expectedMimeType: "image/png",
    },
    {
      name: "convert heic to webp 1",
      filePath: "fixtures/sample2.heic",
      format: "webp",
      expectedMimeType: "image/webp",
    },
    // heic to others
    {
      name: "convert heic to jpeg 2",
      filePath: "fixtures/sample3.heic",
      format: "jpeg",
      expectedMimeType: "image/jpeg",
    },
    {
      name: "convert heic to png 2",
      filePath: "fixtures/sample3.heic",
      format: "png",
      expectedMimeType: "image/png",
    },
    {
      name: "convert heic to webp 2",
      filePath: "fixtures/sample3.heic",
      format: "webp",
      expectedMimeType: "image/webp",
    },
    // heic to others
    {
      name: "convert heic to jpeg 3",
      filePath: "fixtures/sample5.heic",
      format: "jpeg",
      expectedMimeType: "image/jpeg",
    },
    {
      name: "convert heic to png 3",
      filePath: "fixtures/sample5.heic",
      format: "png",
      expectedMimeType: "image/png",
    },
    {
      name: "convert heic to webp 3",
      filePath: "fixtures/sample5.heic",
      format: "webp",
      expectedMimeType: "image/webp",
    },
    // heif to others
    {
      name: "convert heif to jpeg",
      filePath: "fixtures/sample1.heif",
      format: "jpeg",
      expectedMimeType: "image/jpeg",
    },
    {
      name: "convert heif to png",
      filePath: "fixtures/sample1.heif",
      format: "png",
      expectedMimeType: "image/png",
    },
    {
      name: "convert heif to webp",
      filePath: "fixtures/sample1.heif",
      format: "webp",
      expectedMimeType: "image/webp",
    },
  ];

  for (const tes of tests) {
    t.test(tes.name, async () => {
      const fileBuffer = await readFile(tes.filePath);
      const blob = new Blob([fileBuffer]);

      const fileName = basename(tes.filePath);
      const formData = new FormData();

      formData.append("image", blob, fileName);
      formData.append("format", tes.format);

      const response = await fetch(`${BASE_URL}/convert`, {
        method: "POST",
        body: formData,
      });

      assert.strictEqual(
        response.status,
        200,
        `Expected status 200 for ${tes.name}, got ${response.status}`,
      );

      const contentType = response.headers.get("content-type");
      assert.ok(
        contentType?.startsWith(tes.expectedMimeType),
        `Expected content-type ${tes.expectedMimeType}, got ${contentType}`,
      );

      const arrayBuffer = await response.arrayBuffer();
      assert.ok(
        arrayBuffer.byteLength > 0,
        `Expected non-empty response for ${tes.name}`,
      );

      // const outputFilePath = join(
      //   "test",
      //   "output",
      //   `${fileName}.${tes.format}`
      // );
      // await mkdir(dirname(outputFilePath), { recursive: true })
      // await writeFile(outputFilePath, Buffer.from(arrayBuffer));
    });
  }

  done();
});
