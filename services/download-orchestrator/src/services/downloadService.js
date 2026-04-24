const DownloadEvent = require("../models/DownloadEvent");
const { publishEvent } = require("../config/kafka");
const env = require("../config/env");

const planCache = new Map();

const getChunkCatalog = (fileId) => {
    return {
        fileId,
        chunks: ["chunk-1", "chunk-2", "chunk-3", "chunk-4"]
    };
};

const getChunkLocation = (chunkId) => {
    return {
        chunkId,
        node: "node-a",
        zone: "eu-central"
    };
};

const buildDownloadPlan = (fileId) => {
    const catalog = getChunkCatalog(fileId);
    const chunkLocations = catalog.chunks.map(getChunkLocation);

    return {
        fileId,
        chunkCount: chunkLocations.length,
        estimatedSeconds: 14,
        serverHint: "cdn-edge-2",
        chunkCatalog: catalog,
        chunkLocations
    };
};

const createDownloadPlan = async ({ fileId, userId }) => {
    const cachedPlan = planCache.get(fileId);
    const plan = cachedPlan || buildDownloadPlan(fileId);

    if (!cachedPlan) {
        planCache.set(fileId, plan);
    }

    if (process.env.NODE_ENV !== "test") {
        await DownloadEvent.create({
            fileId,
            userId,
            plan
        });
    }

    await publishEvent(env.downloadedTopic, {
        eventType: "FILE_DOWNLOADED",
        fileId,
        userId,
        billable: true,
        tracked: true,
        plan,
        occurredAt: new Date().toISOString()
    });

    return plan;
};

module.exports = {
    createDownloadPlan
};
