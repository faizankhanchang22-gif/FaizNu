const { Telegraf } = require('telegraf');
const axios = require('axios'); // 'axios' is needed for making HTTP requests (API calls)

// ⚠️ IMPORTANT: Aapko 'axios' ko 'package.json' mein add karna hoga (Neeche diya gaya hai).

// ⚙️ CONFIGURATION
const BOT_TOKEN = process.env.BOT_TOKEN || '8389699701:AAHneKVv07bhQAHHHLmtT8veAXzEu70Ckag';

// Group chat UID where the bot is allowed to work.
const TARGET_GROUP_ID = -1003089918721;

// List of mandatory channel UIDs
const REQUIRED_CHANNELS = [
    { id: -1003089918721, username: '@freefirelkies' },
    { id: -1002018904140, username: '@owner_of_this_all' }
];

const bot = new Telegraf(BOT_TOKEN);

/**
 * Checks if a user is a member of all required channels.
 */
async function isUserMemberOfAllChannels(userId) {
    for (const channel of REQUIRED_CHANNELS) {
        try {
            const member = await bot.telegram.getChatMember(channel.id, userId);
            if (!['member', 'creator', 'administrator'].includes(member.status)) {
                return false;
            }
        } catch (error) {
            console.error(`Error checking channel membership for ${channel.username}:`, error.message);
            return false;
        }
    }
    return true;
}

/**
 * Function to call the external API with the user's UID.
 */
async function callExternalApi(userId) {
    // Base URL ko alag rakha gaya hai taaki parameters easily add ho sakein.
    const BASE_URL = 'http://69.62.118.156:19126/like';
    const params = {
        uid: userId, // User's Telegram ID will be used as the 'uid'
        server_name: 'ind',
        key: 'freeapi'
    };
    
    try {
        const response = await axios.get(BASE_URL, { params });
        console.log(`API Call Successful for UID ${userId}. Response:`, response.data);
        return response.data; // Return the response data from the API
    } catch (error) {
        console.error(`Error calling external API for UID ${userId}:`, error.message);
        return null;
    }
}

/**
 * Middleware to check if the message is from the target group.
 */
bot.use(async (ctx, next) => {
    if (ctx.chat && ctx.chat.id === TARGET_GROUP_ID) {
        return next();
    } else if (ctx.chat && ctx.chat.id !== TARGET_GROUP_ID) {
        if (ctx.message && ctx.message.text && ctx.message.text.startsWith('/')) {
            await ctx.reply(`❌ **Yeh Bot Sirf Group Chat Main Work Karega.**`);
        }
    }
});


/**
 * Handler for the /start command.
 */
bot.command('start', async (ctx) => {
    const userId = ctx.from.id;
    const isMember = await isUserMemberOfAllChannels(userId);

    if (isMember) {
        // ✅ STEP 1: Channels Verified
        await ctx.replyWithMarkdown(`**✅ Channels Verified.**\n\nAb Aapke Liye External API Call Kar Raha Hoon...`);

        // 🔥 STEP 2: Call the External API
        const apiResponse = await callExternalApi(userId);

        if (apiResponse && apiResponse.status === true) {
            // API response check (assuming the API returns JSON with status: true)
            const successMessage = `**🎉 Success!**\n\n**Aapka Kaam Ho Gaya.**\n\nAPI Status: ${apiResponse.msg || 'Done'}`;
            await ctx.replyWithMarkdown(successMessage);
        } else if (apiResponse && apiResponse.msg) {
             // Handle specific message from the external API (e.g., already done)
             await ctx.replyWithMarkdown(`**⚠️ API Message:** ${apiResponse.msg}`);
        }
        else {
            // API call failed or returned an unexpected response
            await ctx.replyWithMarkdown(`**❌ Error:** External API Call Mein Koi Masla Hua. Please Check Server Logs.`);
        }

    } else {
        // ❌ Failure: User has not joined all channels
        const requiredLinks = REQUIRED_CHANNELS.map(c => `• **${c.username}**`).join('\n');
        
        const joinMessage = `**⚠️ Pehle Zaroori Channels Join Karein!**\n\n**Aap Ne Darj Zeel Channels Join Nahi Kiye:**\n${requiredLinks}\n\n**Channels Join Karne Ke Baad Dobara /start Command Bhejein.**`;
        
        const buttons = REQUIRED_CHANNELS.map(c => ([{ text: `🔗 Join ${c.username}`, url: `https://t.me/${c.username.substring(1)}` }]));
        
        await ctx.replyWithMarkdown(joinMessage, {
            reply_markup: {
                inline_keyboard: buttons
            }
        });
    }
});

// Vercel Export Setup
module.exports = async (req, res) => {
    try {
        await bot.handleUpdate(req.body, res);
    } catch (error) {
        console.error('Error handling update:', error.message);
        res.statusCode = 500;
        res.end();
    }
};