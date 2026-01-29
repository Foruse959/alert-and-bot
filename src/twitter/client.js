const { Scraper } = require('@the-convocation/twitter-scraper');
const { config } = require('../config');

let scraper = null;
let isLoggedIn = false;

/**
 * Initialize the Twitter scraper
 */
async function initTwitterClient() {
    try {
        scraper = new Scraper();

        // Try cookie-based auth first (most reliable)
        if (config.twitter.authToken && config.twitter.ct0) {
            console.log('   🍪 Setting up cookie authentication...');
            try {
                // Format cookies as strings
                const cookies = [
                    `auth_token=${config.twitter.authToken}; Domain=.twitter.com; Path=/; Secure; HttpOnly`,
                    `ct0=${config.twitter.ct0}; Domain=.twitter.com; Path=/; Secure`,
                ];

                await scraper.setCookies(cookies);

                // Verify login worked
                const isValid = await scraper.isLoggedIn();
                if (isValid) {
                    isLoggedIn = true;
                    console.log('   ✅ Cookie authentication successful');
                } else {
                    console.warn('   ⚠️  Cookies may be expired, trying guest mode...');
                }
            } catch (cookieError) {
                console.warn('   ⚠️  Cookie auth failed:', cookieError.message);
            }
        }
        // Try username/password auth as fallback
        else if (config.twitter.username && config.twitter.password) {
            console.log('   🔑 Trying password login...');
            try {
                await scraper.login(
                    config.twitter.username,
                    config.twitter.password,
                    config.twitter.email
                );
                isLoggedIn = true;
                console.log('   ✅ Logged in as @' + config.twitter.username);
            } catch (loginError) {
                console.warn('   ⚠️  Password login failed:', loginError.message);
                console.log('   💡 Tip: Use cookie auth instead (see .env.example)');
            }
        }

        if (!isLoggedIn) {
            console.log('   📡 Running in guest mode (limited access)');
        }

        console.log('✅ Twitter scraper initialized');
        return true;
    } catch (error) {
        console.error('⚠️  Twitter scraper init error:', error.message);
        scraper = new Scraper();
        return true;
    }
}

/**
 * Get scraper instance
 */
function getTwitterClient() {
    if (!scraper) {
        throw new Error('Scraper not initialized. Call initTwitterClient() first.');
    }
    return scraper;
}

/**
 * Get user by username
 */
async function getUserByUsername(username) {
    try {
        const cleanUsername = username.replace('@', '');
        const profile = await scraper.getProfile(cleanUsername);

        if (!profile) {
            console.warn(`⚠️  User @${cleanUsername} not found`);
            return null;
        }

        return {
            id: profile.userId || cleanUsername,
            username: profile.username || cleanUsername,
            name: profile.name || cleanUsername,
            verified: profile.isVerified || false,
        };
    } catch (error) {
        if (error.message?.includes('34') || error.message?.includes('not found')) {
            console.warn(`⚠️  User @${username} not found or private`);
        } else {
            console.error(`❌ Error fetching @${username}:`, error.message);
        }
        return null;
    }
}

/**
 * Get recent tweets from a user
 */
async function getUserTweets(username, sinceId = null, maxResults = 10) {
    try {
        const cleanUsername = typeof username === 'string' ? username.replace('@', '') : username;

        console.log(`   📥 Fetching tweets from @${cleanUsername}...`);

        const tweetsIterator = scraper.getTweets(cleanUsername, maxResults);
        const tweets = [];

        for await (const tweet of tweetsIterator) {
            if (tweets.length >= maxResults) break;

            if (sinceId && tweet.id && tweet.id <= sinceId) continue;

            tweets.push({
                id: tweet.id || Date.now().toString(),
                text: tweet.text || '',
                created_at: tweet.timeParsed || new Date().toISOString(),
                author_id: cleanUsername,
                author_username: cleanUsername,
                link: `https://twitter.com/${cleanUsername}/status/${tweet.id}`,
                tweet_type: detectTweetType(tweet),
                referenced_tweets: tweet.isRetweet ? [{ type: 'retweeted' }] :
                    tweet.isQuoted ? [{ type: 'quoted' }] :
                        tweet.isReply ? [{ type: 'replied_to' }] : null,
                entities: { mentions: extractMentions(tweet.text || '') },
            });
        }

        console.log(`   ✅ Got ${tweets.length} tweets from @${cleanUsername}`);
        return { data: tweets, includes: { users: [{ id: cleanUsername, username: cleanUsername }] } };
    } catch (error) {
        console.error(`❌ Error fetching tweets from @${username}:`, error.message);
        return { data: [], includes: {} };
    }
}

function detectTweetType(tweet) {
    if (tweet.isRetweet) return 'retweet';
    if (tweet.isQuoted) return 'quote';
    if (tweet.isReply) return 'reply';
    return 'original';
}

function extractMentions(text) {
    const mentions = [];
    const regex = /@(\w+)/g;
    let match;
    while ((match = regex.exec(text)) !== null) {
        mentions.push({ username: match[1] });
    }
    return mentions;
}

function getTweetType(tweet) {
    if (tweet.tweet_type) return tweet.tweet_type;
    if (!tweet.referenced_tweets || tweet.referenced_tweets.length === 0) return 'original';
    const refType = tweet.referenced_tweets[0].type;
    switch (refType) {
        case 'retweeted': return 'retweet';
        case 'quoted': return 'quote';
        case 'replied_to': return 'reply';
        default: return 'original';
    }
}

function hasMentions(tweet) {
    return tweet.entities?.mentions?.length > 0;
}

function getMentions(tweet) {
    return tweet.entities?.mentions?.map((m) => m.username) || [];
}

async function searchTweets(query, sinceId = null, maxResults = 10) {
    if (!isLoggedIn) {
        console.warn('⚠️  Tweet search requires login');
        return { data: [] };
    }
    try {
        const tweets = [];
        const searchIterator = scraper.searchTweets(query, maxResults);
        for await (const tweet of searchIterator) {
            if (tweets.length >= maxResults) break;
            tweets.push(tweet);
        }
        return { data: tweets };
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
