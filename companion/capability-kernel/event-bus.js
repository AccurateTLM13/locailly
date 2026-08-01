const crypto = require("crypto");
const { assertContract } = require("./contracts");

function topicMatches(pattern, topic) {
  if (pattern === topic || pattern === "#") return true;

  const patternParts = pattern.split(".");
  const topicParts = topic.split(".");

  let pIdx = 0;
  let tIdx = 0;

  while (pIdx < patternParts.length && tIdx < topicParts.length) {
    const p = patternParts[pIdx];
    const t = topicParts[tIdx];

    if (p === "#") {
      if (pIdx === patternParts.length - 1) return true;
      const nextP = patternParts[pIdx + 1];
      while (tIdx < topicParts.length && topicParts[tIdx] !== nextP) {
        tIdx++;
      }
      pIdx++;
      continue;
    }

    if (p !== "*" && p !== t) {
      return false;
    }

    pIdx++;
    tIdx++;
  }

  if (pIdx < patternParts.length && patternParts[pIdx] === "#" && pIdx === patternParts.length - 1) {
    return true;
  }

  return pIdx === patternParts.length && tIdx === topicParts.length;
}

function createEventBus() {
  const subscriptions = new Map();

  function subscribe(topicPattern, handler, subscriberMeta = {}) {
    if (!topicPattern || typeof topicPattern !== "string") {
      throw new Error("subscribe requires a non-empty string topic pattern.");
    }
    if (typeof handler !== "function") {
      throw new Error("subscribe requires a function handler.");
    }

    const subId = `sub_${crypto.randomBytes(6).toString("hex")}`;
    const subscription = {
      subId,
      topicPattern,
      handler,
      subscriberMeta,
      createdAt: new Date().toISOString()
    };

    subscriptions.set(subId, subscription);

    return {
      subId,
      topicPattern,
      unsubscribe: () => subscriptions.delete(subId)
    };
  }

  function listSubscriptions() {
    const list = [];
    for (const sub of subscriptions.values()) {
      list.push({
        subId: sub.subId,
        topicPattern: sub.topicPattern,
        subscriberMeta: sub.subscriberMeta,
        createdAt: sub.createdAt
      });
    }
    return list;
  }

  async function publish(eventEnvelope, options = {}) {
    assertContract(eventEnvelope, "event-envelope.v1", "INVALID_EVENT_ENVELOPE");

    const topic = eventEnvelope.event_type;
    const startTime = Date.now();
    const deliveredTo = [];
    const errors = [];

    const matchedSubs = [];
    for (const sub of subscriptions.values()) {
      if (topicMatches(sub.topicPattern, topic)) {
        matchedSubs.push(sub);
      }
    }

    for (const sub of matchedSubs) {
      const targetName = sub.subscriberMeta.node_id || sub.subscriberMeta.name || sub.subId;
      try {
        await Promise.resolve(sub.handler(eventEnvelope));
        deliveredTo.push({
          subId: sub.subId,
          target: targetName,
          status: "delivered"
        });
      } catch (err) {
        errors.push({
          subId: sub.subId,
          target: targetName,
          error: err.message
        });
        deliveredTo.push({
          subId: sub.subId,
          target: targetName,
          status: "failed",
          error: err.message
        });
      }
    }

    const latencyMs = Date.now() - startTime;
    const provenance = {
      event_id: eventEnvelope.event_id,
      event_type: topic,
      published_at: new Date().toISOString(),
      latency_ms: latencyMs,
      delivered_count: deliveredTo.filter(d => d.status === "delivered").length,
      failed_count: errors.length,
      deliveries: deliveredTo
    };

    return {
      ok: errors.length === 0,
      provenance,
      errors
    };
  }

  return {
    subscribe,
    publish,
    listSubscriptions,
    topicMatches
  };
}

module.exports = {
  topicMatches,
  createEventBus
};
