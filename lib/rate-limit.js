// In-memory usage tracker (resets on cold start — acceptable for free tier)
const usageMap = new Map();

const FREE_LIMIT = 3; // free uses per IP hash

// Hash IP for privacy (keep last octet masked)
function hashIP(ip) {
  const masked = ip.replace(/\.\d+$/, ".0");
  let hash = 0;
  for (let i = 0; i < masked.length; i++) {
    const ch = masked.charCodeAt(i);
    hash = (hash << 5) - hash + ch;
    hash |= 0;
  }
  return "ip_" + Math.abs(hash).toString(36);
}

// Check if unlock code is valid
const VALID_CODES = (process.env.UNLOCK_CODES || "")
  .split(",")
  .map((c) => c.trim())
  .filter(Boolean);

function checkUnlockCode(code) {
  if (!code || VALID_CODES.length === 0) return false;
  return VALID_CODES.includes(code);
}

// Check and increment usage
function checkLimit(ip, deviceId, unlockCode) {
  // Unlock code bypasses all limits
  if (checkUnlockCode(unlockCode)) {
    return { allowed: true, remaining: Infinity, unlimited: true };
  }

  // Check by IP hash
  const ipHash = hashIP(ip);
  const key = deviceId ? `${ipHash}_${deviceId.slice(0, 16)}` : ipHash;
  const entry = usageMap.get(key) || { count: 0, firstSeen: Date.now() };

  if (entry.count >= FREE_LIMIT) {
    return {
      allowed: false,
      remaining: 0,
      limit: FREE_LIMIT,
      contact: "QQ邮箱: 1834109164@qq.com | 微信: mwp565",
    };
  }

  entry.count++;
  usageMap.set(key, entry);
  return {
    allowed: true,
    remaining: FREE_LIMIT - entry.count,
    limit: FREE_LIMIT,
    used: entry.count,
  };
}

module.exports = { checkLimit, checkUnlockCode };
