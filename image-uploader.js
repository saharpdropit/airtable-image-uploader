const airtable = require("airtable");

const fs = require("fs");
const path = require("path");

const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;
const NGROK_URL = process.env.NGROK_URL;

airtable.configure({
  endpointUrl: "https://api.airtable.com",
  apiKey: AIRTABLE_API_KEY,
});

const base = airtable.base(AIRTABLE_BASE_ID);

const sourceDir = path.join(__dirname, "public", "images");
const images = [...fs.readdirSync(sourceDir)];

let recordKeys = new Set();

const getFeaturesRecords = async () => {
  return await base.table("Features").select({ view: "Grid view" }).all();
};

const uploadImages = async (records) => {
  const featuresRecords = await getFeaturesRecords();

  for (const record of records) {
    const processedImages = record.get("Processed Images");
    const productId = record.get("Product ID");
    const colorCode = String(record.get("Color Code")).padStart(4, 0);

    const relatedFeaturesRecords = featuresRecords.filter(
      (featuresRecord) =>
        (featuresRecord.get("Style Number") == productId &&
          featuresRecord.get("Feature Name") == "Description") ||
        featuresRecord.get("Feature Name" == "Features")
    );
    
    if (relatedFeaturesRecords.length > 0) {
      const description = relatedFeaturesRecords[0].get("Feature Value");
      if(description) {
        base("Products").update(record.id, { 
          "Description (HTML) *": description
        });    
      }
    }

    const productIdAndColorCode = `${productId} ${colorCode}`;

    if (recordKeys.has(productIdAndColorCode)) continue;

    recordKeys.add(productIdAndColorCode);

    if (processedImages && processedImages.length > 0) {
      console.log("skipping record, already has processed images...");
      continue;
    }

    // remove/edit the .includes("Detail") by demand
    const relatedRecordImages = images.filter(
      (image) =>
        image.includes(productIdAndColorCode) && !image.includes("Detail")
    );

    const imagesUrl = [];

    for (const relatedRecordImage of relatedRecordImages) {
      const urlPath = encodeURI(`${NGROK_URL}/images/${relatedRecordImage}`);
      imagesUrl.push(urlPath);
    }

    base("Products").update(record.id, {
      "Processed Images": imagesUrl.map((imageUrl) => {
        return { url: imageUrl };
      }),
    });
  }
};

const run = () => {
  return base
    .table("Products")
    .select({ view: "All Products" })
    .eachPage(async function page(records, fetchNextPage) {
      await uploadImages(records);
      fetchNextPage();
    });
};

module.exports = { run };
