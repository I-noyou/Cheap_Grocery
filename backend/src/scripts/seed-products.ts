import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { ObjectId } from "mongodb";
import vm from "node:vm";

import { closeMongoClient, getDatabase } from "../db/mongo.js";
import { ensureProductIndexes } from "../db/product-indexes.js";
import { ensureProductVariantIndexes } from "../db/product-variant-indexes.js";
import { normalizeProductSeed } from "../services/product.service.js";
import { normalizeVariantSeed, upsertProductVariant } from "../services/product-variant.service.js";

interface SeedSummary {
  inserted: number;
  updated: number;
  skipped: number;
  failed: number;
  variantsInserted: number;
  variantsUpdated: number;
  variantsSkipped: number;
  variantsFailed: number;
}

function findMatchingBrace(source: string, startIndex: number): number {
  let depth = 0;
  let quote: string | null = null;
  let escaped = false;

  for (let index = startIndex; index < source.length; index += 1) {
    const character = source[index];

    if (quote) {
      if (escaped) {
        escaped = false;
      } else if (character === "\\") {
        escaped = true;
      } else if (character === quote) {
        quote = null;
      }
      continue;
    }

    if (character === "'" || character === '"' || character === "`") {
      quote = character;
      continue;
    }

    if (character === "{") {
      depth += 1;
    } else if (character === "}") {
      depth -= 1;
      if (depth === 0) {
        return index;
      }
    }
  }

  return -1;
}

async function parseLegacyCatalog(): Promise<Record<string, Record<string, unknown>>> {
  const scriptPath = resolve(process.cwd(), "..", "script.js");
  const source = await readFile(scriptPath, "utf8");
  const marker = "const PRODUCT_CATALOG =";
  const startIndex = source.indexOf(marker);

  if (startIndex === -1) {
    throw new Error("PRODUCT_CATALOG was not found in script.js.");
  }

  const catalogSource = source.slice(startIndex + marker.length);
  const endIndex = findMatchingBrace(catalogSource, 0);
  if (endIndex === -1) {
    throw new Error("Unable to locate the end of PRODUCT_CATALOG.");
  }

  const catalogLiteral = catalogSource.slice(0, endIndex + 1);
  const fullScript = `${source.slice(0, startIndex)}const PRODUCT_CATALOG =${catalogLiteral};\n globalThis.__CHEAP_GROCERY_PRODUCT_CATALOG__ = PRODUCT_CATALOG;\n});\n`;
  const storage = {
    getItem: () => null,
    setItem: () => undefined,
    removeItem: () => undefined,
    clear: () => undefined
  };

  const context: Record<string, unknown> = {
    console,
    window: { CHEAP_GROCERY_API_URL: "", localStorage: storage },
    document: {
      addEventListener: (_eventName: string, callback: () => void) => callback(),
      getElementById: () => null,
      querySelector: () => null,
      querySelectorAll: () => [],
      createElement: () => ({
        querySelector: () => null,
        classList: { add: () => undefined, remove: () => undefined, toggle: () => undefined },
        appendChild: () => undefined,
        setAttribute: () => undefined,
        addEventListener: () => undefined
      })
    },
    navigator: { geolocation: undefined, permissions: undefined },
    localStorage: storage,
    sessionStorage: storage
  };

  context.globalThis = context;
  vm.runInNewContext(fullScript, context, { filename: scriptPath });

  const catalog = context.__CHEAP_GROCERY_PRODUCT_CATALOG__;
  if (!catalog || typeof catalog !== "object" || Array.isArray(catalog)) {
    throw new Error("No valid PRODUCT_CATALOG object was found.");
  }

  return catalog as Record<string, Record<string, unknown>>;
}

async function runSeed(dryRun: boolean): Promise<SeedSummary> {
  const catalog = await parseLegacyCatalog();
  const summary: SeedSummary = {
    inserted: 0, updated: 0, skipped: 0, failed: 0,
    variantsInserted: 0, variantsUpdated: 0, variantsSkipped: 0, variantsFailed: 0
  };

  if (dryRun) {
    for (const [legacyKey, value] of Object.entries(catalog)) {
      if (!value || typeof value !== "object") {
        summary.skipped += 1;
        continue;
      }

      const normalized = normalizeProductSeed(value as Record<string, unknown>, legacyKey);
      if (!normalized) {
        summary.skipped += 1;
        continue;
      }

      summary.inserted += 1;
      const varieties: unknown[] = Array.isArray(value.varieties) ? value.varieties : [];
      for (const variety of varieties) {
        if (!variety || typeof variety !== "object") continue;
        const varietyRecord = variety as Record<string, unknown>;
        const brands: unknown[] = Array.isArray(varietyRecord.brands) ? varietyRecord.brands : [];
        for (const brand of brands) {
          if (!brand || typeof brand !== "object") continue;
          const brandRecord = brand as Record<string, unknown>;
          const weights: unknown[] = Array.isArray(brandRecord.weights) ? brandRecord.weights : [];
          for (const weight of weights) {
            const weightRecord = weight && typeof weight === "object" ? weight as Record<string, unknown> : {};
            const packageLabel = typeof weightRecord.label === "string" ? weightRecord.label : "";
            if (normalizeVariantSeed(normalized.productId, varietyRecord.name, brandRecord.name, packageLabel)) {
              summary.variantsInserted += 1;
            } else {
              summary.variantsFailed += 1;
            }
          }
        }
      }
    }
    return summary;
  }

  const database = await getDatabase();
  const collection = database.collection("products");

  for (const [legacyKey, value] of Object.entries(catalog)) {
    if (!value || typeof value !== "object") {
      summary.skipped += 1;
      continue;
    }

    const normalized = normalizeProductSeed(value as Record<string, unknown>, legacyKey);
    if (!normalized) {
      summary.skipped += 1;
      continue;
    }

    try {
      const existing = await collection.findOne({ productId: normalized.productId }, { projection: { _id: 1, productId: 1 } });
      const now = new Date();
      const result = await collection.updateOne(
        { productId: normalized.productId },
        {
          $setOnInsert: {
            _id: new ObjectId(),
            productId: normalized.productId,
            createdAt: now
          },
          $set: {
            name: normalized.name,
            slug: normalized.slug,
            category: normalized.category,
            description: normalized.description,
            aliases: normalized.aliases,
            imageUrl: normalized.imageUrl,
            isActive: normalized.isActive,
            legacyCatalogKey: normalized.legacyCatalogKey,
            legacyCatalog: normalized.legacyCatalog,
            updatedAt: now
          }
        },
        { upsert: true }
      );

      if (!existing && result.upsertedCount > 0) {
        summary.inserted += 1;
      } else if (existing && result.modifiedCount > 0) {
        summary.updated += 1;
      } else if (existing) {
        summary.skipped += 1;
      } else {
        summary.inserted += 1;
      }

      const varieties: unknown[] = Array.isArray(value.varieties) ? value.varieties : [];
      for (const variety of varieties) {
        if (!variety || typeof variety !== "object") continue;
        const varietyRecord = variety as Record<string, unknown>;
        const brands: unknown[] = Array.isArray(varietyRecord.brands) ? varietyRecord.brands : [];
        for (const brand of brands) {
          if (!brand || typeof brand !== "object") continue;
          const brandRecord = brand as Record<string, unknown>;
          const weights: unknown[] = Array.isArray(brandRecord.weights) ? brandRecord.weights : [];
          for (const weight of weights) {
            const weightRecord = weight && typeof weight === "object" ? weight as Record<string, unknown> : {};
            const packageLabel = typeof weightRecord.label === "string" ? weightRecord.label : "";
            const variant = normalizeVariantSeed(normalized.productId, varietyRecord.name, brandRecord.name, packageLabel);
            if (!variant) {
              summary.variantsFailed += 1;
              console.error(`Failed to normalize variant ${legacyKey}/${String(varietyRecord.name)}/${String(brandRecord.name)}/${packageLabel}`);
              continue;
            }
            try {
              const result = await upsertProductVariant(variant);
              if (result === "inserted") summary.variantsInserted += 1;
              else if (result === "updated") summary.variantsUpdated += 1;
              else summary.variantsSkipped += 1;
            } catch (error) {
              summary.variantsFailed += 1;
              console.error(`Failed to seed variant ${variant.variantId}:`, error instanceof Error ? error.message : error);
            }
          }
        }
      }
    } catch (error) {
      summary.failed += 1;
      console.error(`Failed to seed ${legacyKey}:`, error instanceof Error ? error.message : error);
    }
  }

  return summary;
}

async function main(): Promise<void> {
  const dryRun = process.argv.includes("--dry-run");

  try {
    if (!dryRun) {
      await Promise.all([ensureProductIndexes(), ensureProductVariantIndexes()]);
    }
    const summary = await runSeed(dryRun);
    console.log(JSON.stringify({ dryRun, summary }, null, 2));
    process.exitCode = summary.failed > 0 ? 1 : 0;
  } catch (error) {
    console.error("Product import failed.", error instanceof Error ? error.message : error);
    process.exitCode = 1;
  } finally {
    await closeMongoClient();
  }
}

void main();
