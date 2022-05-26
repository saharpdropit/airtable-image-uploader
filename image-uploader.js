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

const uploadImages = async (records) => {
  for (const record of records) {
    const processedImages = record.get("Processed Images");
    const productIdAndColorCode = `${record.get("Product ID")} ${record.get("Color Code")}`;

    if (processedImages && processedImages.length > 0) {
      console.log("skipping record, already has processed images...");
      continue;
    }

    // remove/edit the .includes("Detail") by demand
    const relatedRecordImages = images.filter((image) => {
      image.includes(productIdAndColorCode) && !image.includes("Detail");
    });

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
}

module.exports = { run };
