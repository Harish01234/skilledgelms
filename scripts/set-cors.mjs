import dotenv from "dotenv";

dotenv.config({
  path: "../.env.local",
});

const KEY_ID = process.env.B2_KEY_ID;
const APPLICATION_KEY = process.env.B2_APPLICATION_KEY;
const BUCKET_NAME = process.env.B2_BUCKET_NAME || "lms-scorm-2026";

if (!KEY_ID) {
  console.error("❌ Missing B2_KEY_ID");
  process.exit(1);
}

if (!APPLICATION_KEY) {
  console.error("❌ Missing B2_APPLICATION_KEY");
  process.exit(1);
}

async function main() {
  try {
    // --------------------------------------------------
    // 1. Authorize with Backblaze
    // --------------------------------------------------

    console.log("⏳ Authorizing with Backblaze B2...");

    const credentials = Buffer.from(
      `${KEY_ID}:${APPLICATION_KEY}`
    ).toString("base64");

    const authResponse = await fetch(
      "https://api.backblazeb2.com/b2api/v4/b2_authorize_account",
      {
        method: "GET",
        headers: {
          Authorization: `Basic ${credentials}`,
        },
      }
    );

    const authData = await authResponse.json();

    if (!authResponse.ok) {
      throw new Error(
        `Authorization failed (${authResponse.status}):\n${JSON.stringify(
          authData,
          null,
          2
        )}`
      );
    }

    console.log("✅ B2 authorization successful.");

    // --------------------------------------------------
    // 2. Get Storage API information
    // --------------------------------------------------

    const storageApi = authData?.apiInfo?.storageApi;

    if (!storageApi) {
      throw new Error(
        "Could not find apiInfo.storageApi in B2 authorization response."
      );
    }

    const apiUrl = storageApi.apiUrl;

    const allowed = storageApi.allowed;

    if (!allowed) {
      throw new Error(
        "Could not find storageApi.allowed in B2 authorization response."
      );
    }

    console.log(`API URL: ${apiUrl}`);

    // --------------------------------------------------
    // 3. Find our bucket
    // --------------------------------------------------

    const buckets = allowed.buckets || [];

    console.log(`Accessible buckets: ${buckets.length}`);

    const bucket = buckets.find(
      (item) => item.name === BUCKET_NAME
    );

    if (!bucket) {
      console.error("\n❌ Bucket not found.");

      console.error(
        "Buckets available to this application key:"
      );

      for (const item of buckets) {
        console.error(
          `  - ${item.name || "(unnamed)"} (${item.id})`
        );
      }

      throw new Error(
        `Bucket "${BUCKET_NAME}" is not accessible with this application key.`
      );
    }

    console.log(`✅ Found bucket: ${bucket.name}`);
    console.log(`   Bucket ID: ${bucket.id}`);

    // --------------------------------------------------
    // 4. Check permissions
    // --------------------------------------------------

    const capabilities = allowed.capabilities || [];

    console.log(
      `Capabilities: ${capabilities.join(", ")}`
    );

    if (!capabilities.includes("writeBuckets")) {
      throw new Error(
        'This application key does not have the "writeBuckets" capability.'
      );
    }

    // --------------------------------------------------
    // 5. CORS configuration
    // --------------------------------------------------

    const corsRules = [
      {
        corsRuleName: "lms-scorm",

        allowedOrigins: [
          "https://skilledgelms.vercel.app",
          "http://localhost:3000",
        ],

        allowedHeaders: [
          "*",
        ],

        allowedOperations: [
          "s3_get",
          "s3_put",
          "s3_head",
        ],

        exposeHeaders: [
          "ETag",
        ],

        maxAgeSeconds: 3600,
      },
    ];

    console.log("\n⏳ Updating B2 Native CORS rules...");

    // --------------------------------------------------
    // 6. Update bucket
    // --------------------------------------------------

    const updateResponse = await fetch(
      `${apiUrl}/b2api/v4/b2_update_bucket`,
      {
        method: "POST",

        headers: {
          Authorization: authData.authorizationToken,
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          accountId: authData.accountId,

          bucketId: bucket.id,

          corsRules,
        }),
      }
    );

    const updateData = await updateResponse.json();

    if (!updateResponse.ok) {
      throw new Error(
        `B2 bucket update failed (${updateResponse.status}):\n${JSON.stringify(
          updateData,
          null,
          2
        )}`
      );
    }

    // --------------------------------------------------
    // 7. Success
    // --------------------------------------------------

    console.log("\n✅ CORS rules updated successfully!");

    console.log("\nCurrent CORS configuration:");

    console.log(
      JSON.stringify(updateData.corsRules, null, 2)
    );
  } catch (error) {
    console.error("\n❌ Failed to update B2 CORS.");

    console.error(
      error?.message || error
    );

    process.exit(1);
  }
}

main();