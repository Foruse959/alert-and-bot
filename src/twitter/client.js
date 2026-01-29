const Parser = require('rss-parser');
const { config } = require('../config');

const parser = new Parser({
    timeout: 10000,
    customFields: {
        item: [
            ['dc:creator', 'creator'],
            ['pubDate', 'pubDate'],
        ],
    },
});

// List of Nitter/Twitter alternative instances (updated 2026)
// xcancel.com is currently the most reliable
const NITTER_INSTANCES = [
    'https://xcancel.com',
    'https://nitter.privacydev.net',
    'https://nitter.poast.org',
    'https://nitter.net',
];

let currentInstanceIndex = 0;

/**
 * Get current Nitter instance URL
 */
function getNitterInstance() {
    return NITTER_INSTANCES[currentInstanceIndex];
}

/**
 * Rotate to next Nitter instance (fallback)
 */
function rotateInstance() {
    currentInstanceIndex = (currentInstanceIndex + 1) % NITTER_INSTANCES.length;
    console.log(`🔄 Switched to instance: ${getNitterInstance()}`);
}

/**
 * Initialize Twitter client (no-op for Nitter, just log)
 */
function initTwitterClient() {
    console.log('✅ Twitter client initialized (using Nitter RSS alternatives)');
    console.log(`   📡 Primary instance: ${getNitterInstance()}`);
    return true;
}

/**
 * Get Nitter client (compatibility layer)
 */
function getTwitterClient() {
    return { nitter: true };
}

/**
 * Get user info from username (simulated for Nitter)
 */
async function getUserByUsername(username) {
    const cleanUsername = username.replace('@', '').toLowerCase();

    // For Nitter, we just return a basic user object
    // The RSS feed will confirm if the user exists when we fetch tweets
    return {
        id: cleanUsername, // Use username as ID for Nitter
        username: cleanUsername,
        name: cleanUsername,
        verified: false, // Nitter doesn't expose this easily
    };
}

/**
 * Fetch tweets from user via Nitter RSS
 */
async function getUserTweets(username, sinceId = null, maxResults = 10) {
    const cleanUsername = typeof username === 'string' ? username.replace('@', '') : username;

    for (let attempt = 0; attempt < NITTER_INSTANCES.length; attempt++) {
        try {
            const instance = getNitterInstance();
            const rssUrl = `${instance}/${cleanUsername}/rss`;

            console.log(`   📥 Fetching: ${rssUrl}`);

            const feed = await parser.parseURL(rssUrl);

            if (!feed.items || feed.items.length === 0) {
                return { data: [], includes: {} };
            }

            // Convert RSS items to tweet-like objects
            const tweets = feed.items.slice(0, maxResults).map((item) => {
                // Extract tweet ID from link (e.g., https://xcancel.com/user/status/123456)
                const tweetId = item.link?.split('/status/')?.pop()?.split('#')[0] || item.guid;

                // Clean up the content (remove HTML tags)
                let text = item.contentSnippet || item.content || item.title || '';
                text = text.replace(/<[^>]*>/g, '').trim();

                // Detect tweet type from content
                let tweetType = 'original';
                if (text.startsWith('RT @') || text.includes('RT by @')) {
                    tweetType = 'retweet';
                } else if (text.startsWith('R to @')) {
                    tweetType = 'reply';
                } else if (item.title?.includes('quoted')) {
                    tweetType = 'quote';
                }

                return {
                    id: tweetId,
                    text: text,
                    created_at: item.pubDate || item.isoDate,
                    author_id: cleanUsername,
                    author_username: cleanUsername,
                    tweet_type: tweetType,
                    link: item.link?.replace(instance, 'https://twitter.com') || `https://twitter.com/${cleanUsername}/status/${tweetId}`,
                    // For filtering
                    referenced_tweets: tweetType !== 'original' ? [{ type: tweetType === 'retweet' ? 'retweeted' : tweetType === 'reply' ? 'replied_to' : 'quoted' }] : null,
                    entities: {
                        mentions: extractMentions(text),
                    },
                };
            });

            // Filter by sinceId if provided
            let filteredTweets = tweets;
            if (sinceId) {
                const sinceIdNum = BigInt(sinceId);
                filteredTweets = tweets.filter((t) => {
                    try {
                        return BigInt(t.id) > sinceIdNum;
                    } catch {
                        return true; // If ID comparison fails, include the tweet
                    }
                });
            }

            return {
                data: filteredTweets,
                includes: {
                    users: [{ id: cleanUsername, username: cleanUsername, name: feed.title?.replace("'s posts", '') || cleanUsername }],
                },
            };
        } catch (error) {
            console.warn(`⚠️  Instance ${getNitterInstance()} failed: ${error.message}`);
            rotateInstance();
        }
    }

    console.error('❌ All instances failed - Twitter alternatives may be down');
    console.error('   Check https://status.d420.de for working instances');
    return { data: [], includes: {} };
}

/**
 * Extract @mentions from text
 */
function extractMentions(text) {
    const mentions = [];
    const regex = /@(\w+)/g;
    let match;
    while ((match = regex.exec(text)) !== null) {
        mentions.push({ username: match[1] });
    }
    return mentions;
}

/**
 * Search tweets (limited with Nitter - uses user timeline instead)
 */
async function searchTweets(query, sinceId = null, maxResults = 10) {
    // Nitter doesn't support search, return empty
    console.warn('⚠️  Tweet search not available (use user monitoring instead)');
    return { data: [] };
}

/**
 * Get tweet type from tweet object
 */
function getTweetType(tweet) {
    // If tweet_type is already set (from Nitter), use it
    if (tweet.tweet_type) {
        return tweet.tweet_type;
    }

    if (!tweet.referenced_tweets || tweet.referenced_tweets.length === 0) {
        return 'original';
    }

    const refType = tweet.referenced_tweets[0].type;
    switch (refType) {
        case 'retweeted':
            return 'retweet';
        case 'quoted':
            return 'quote';
        case 'replied_to':
            return 'reply';
        default:
            return 'original';
    }
}

/**
 * Check if tweet has mentions
 */
function hasMentions(tweet) {
    return tweet.entities?.mentions?.length > 0;
}

/**
 * Get mentions from tweet
 */
function getMentions(tweet) {
    return tweet.entities?.mentions?.map((m) => m.username) || [];
}

module.exports = {
    initTwitterClient,
    getTwitterClient,
    getUserByUsername,
    getUserTweets,
    searchTweets,
    getTweetType,
    hasMentions,
    getMentions,
};
