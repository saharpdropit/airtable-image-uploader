const axios = require("axios").default;

const fs = require("fs");
const path = require("path");

const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;
const NGROK_URL = process.env.NGROK_URL;

const baseUrl = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}`

const sourceDir = path.join(__dirname, "public", "images");
const images = [...fs.readdirSync(sourceDir)];

let recordKeys = new Set();

const uploadImages = async(records) => {
    const featuresRecords = await fetchRecords("Features");

    for (const record of records) {
        const productId = record.fields["Product ID"];
        const colorCode = String(record.fields["Color Code"]).padStart(4, 0);

        const processedImages = record.fields["Processed Images"];

        const currentRecordsDescription = getRelatedDescription(featuresRecords, productId);
        if (currentRecordsDescription) {

            const description = {
                fields: {
                    ["Description (HTML) *"]: currentRecordsDescription
                }
            }

            await updateRecord("Products", record.id, description)
        }

        const productIdAndColorCode = `${productId} ${colorCode}`;

        if (recordKeys.has(productIdAndColorCode)) continue;

        recordKeys.add(productIdAndColorCode);

        if (processedImages && processedImages.length > 0) {
            console.log("skipping record, already has processed images...");
            continue;
        }

        // remove / edit the.includes("Detail") by demand
        const relatedRecordImages = images.filter((image) =>
            image.includes(productIdAndColorCode) && !image.includes("Detail")
        );

        const imagesUrl = [];

        for (const relatedRecordImage of relatedRecordImages) {
            const urlPath = encodeURI(`${NGROK_URL}/images/${relatedRecordImage}`);
            imagesUrl.push(urlPath);
        }

        const relatedImages = {
            fields: {
                ["Processed Images"]: imagesUrl.map(imageUrl => { return { url: imageUrl } })
            }
        }

        await updateRecord("Products", record.id, relatedImages)
    }
};

const updateRecord = async(tableName, recordId, fields) => {
    const encodedUrl = encodeURI(`${baseUrl}/${tableName}/${recordId}`);
    return await axios.patch(encodedUrl, fields, { headers: { Authorization: `Bearer ${AIRTABLE_API_KEY}` } });
};

const fetchRecords = async(tableName) => {
    const encodedBaseUrl = encodeURI(`${baseUrl}/${tableName}`);

    const records = [];

    let offset = "";

    while (offset != null) {
        const res = await getRecords(`${encodedBaseUrl}${offset}`);

        if (res.status == 200) {
            records.push(...res.data.records);
            offset = tryGetOffset(res.data)
        }
    }

    return records;
}

const tryGetOffset = (res) => res.offset ? `?offset=${res.offset}` : null;

const getRecords = async(url) => await axios.get(url, { headers: { Authorization: `Bearer ${AIRTABLE_API_KEY}` } });

const run = async() => {
    const records = await fetchRecords("Products", "All Products");
    return await uploadImages(records);
};

const getRelatedDescription = (featuresRecords, productId) => {
    const relatedRecords = featuresRecords.filter((featuresRecord) =>
        (featuresRecord.fields["Style Number"] == productId) &&
        (featuresRecord.fields["Feature Name"] == "Description" || featuresRecord.fields["Feature Name"] == "Features")
    );

    if (relatedRecords.length > 0)
        return relatedRecords[0].fields["Feature Value"];

}

module.exports = { run };