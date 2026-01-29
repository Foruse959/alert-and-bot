const { TwitterApi } = require('twitter-api-v2');
const { config } = require('../config');

let client = null;

/**
 * Initialize Twitter API client
 */
function initTwitterClient() {
    client = new TwitterApi(config.twitter.bearerToken);
    console.log('✅ Twitter API client initialized');
    return client;
}

/**
 * Get Twitter client instance
 */
function getTwitterClient() {
    if (!client) {
        throw new Error('Twitter client not initialized. Call initTwitterClient() first.');
    }
    return client.readOnly;
}

/**
 * Get user by username
 */
async function getUserByUsername(username) {
    try {
        const cleanUsername = username.replace('@', '');
        const user = await getTwitterClient().v2.userByUsername(cleanUsername, {
            'user.fields': ['id', 'name', 'username', 'profile_image_url', 'verified'],
        });

        if (!user.data) {
            console.warn(`⚠️  User @${cleanUsername} not found`);
            return null;
        }

        return user.data;
    } catch (error) {
        console.error(`❌ Error fetching user @${username}:`, error.message);
        return null;
    }
}

/**
 * Get recent tweets from a user
 */
async function getUserTweets(userId, sinceId = null, maxResults = 10) {
    try {
        const params = {
            max_results: Math.min(maxResults, 100),
            'tweet.fields': ['id', 'text', 'created_at', 'author_id', 'referenced_tweets', 'entities'],
            'user.fields': ['username', 'name'],
            'expansions': ['author_id', 'referenced_tweets.id'],
            exclude: ['replies'], // Exclude replies by default
        };

        if (sinceId) {
            params.since_id = sinceId;
        }

        const tweets = await getTwitterClient().v2.userTimeline(userId, params);

        if (!tweets.data || !tweets.data.data) {
            return { data: [], includes: tweets.data?.includes || {} };
        }

        console.log(`   ✅ Fetched ${tweets.data.data.length} tweets`);

        return {
            data: tweets.data.data,
            includes: tweets.data.includes || {},
        };
    } catch (error) {
        if (error.code === 429) {
            console.warn('⚠️  Rate limit reached, waiting...');
        } else {
            console.error(`❌ Error fetching tweets:`, error.message);
        }
        return { data: [], includes: {} };
    }
}

/**
 * Get tweet type from tweet object
 */
function getTweetType(tweet) {
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

/**
 * Search tweets (for keyword monitoring)
 */
async function searchTweets(query, sinceId = null, maxResults = 10) {
    try {
        const params = {
            max_results: Math.min(maxResults, 100),
            'tweet.fields': ['id', 'text', 'created_at', 'author_id'],
            'user.fields': ['username', 'name'],
            'expansions': ['author_id'],
        };

        if (sinceId) {
            params.since_id = sinceId;
        }

        const tweets = await getTwitterClient().v2.search(query, params);
        return tweets;
    } catch (error) {
        console.error(`❌ Error searching tweets:`, error.message);
        return { data: [] };
    }
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
